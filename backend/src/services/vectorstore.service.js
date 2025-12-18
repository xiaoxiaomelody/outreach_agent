/**
 * Vector Store Service
 * Handles document embedding and vector storage using Pinecone + OpenAI
 * Provides RAG (Retrieval-Augmented Generation) capabilities
 */

const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { v4: uuidv4 } = require('uuid');
const { ChunkingService } = require('./chunking.service');

// ============================================
// CONSTANTS
// ============================================

const VECTOR_CONFIG = {
  // Pinecone settings
  INDEX_NAME: process.env.PINECONE_INDEX_NAME || 'outreach-resumes',
  NAMESPACE: 'resumes',
  
  // Embedding settings
  EMBEDDING_MODEL: 'text-embedding-3-small',  // OpenAI's latest small model
  EMBEDDING_DIMENSIONS: 1536,                  // Dimension for text-embedding-3-small
  
  // Query settings
  DEFAULT_TOP_K: 5,
  
  // Batch settings
  UPSERT_BATCH_SIZE: 100
};

// ============================================
// VECTOR STORE SERVICE CLASS
// ============================================

class VectorStoreService {
  constructor() {
    this.pinecone = null;
    this.index = null;
    this.embeddings = null;
    this.chunkingService = new ChunkingService();
    this.isInitialized = false;
    this.devMode = process.env.DEV_MODE === 'true' || !process.env.PINECONE_API_KEY;
    
    // In-memory store for DEV_MODE
    this.memoryStore = {
      vectors: [],
      documents: new Map()
    };
  }

  /**
   * Initialize the vector store connection
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Initialize OpenAI Embeddings
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is required for embeddings');
      }

      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: VECTOR_CONFIG.EMBEDDING_MODEL
      });

      if (this.devMode) {
        console.log('🔧 [VectorStore] Running in DEV_MODE (in-memory storage)');
        this.isInitialized = true;
        return;
      }

      // Initialize Pinecone
      if (!process.env.PINECONE_API_KEY) {
        throw new Error('PINECONE_API_KEY is required for vector storage');
      }

      this.pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY
      });

      // Get or create index
      this.index = this.pinecone.index(VECTOR_CONFIG.INDEX_NAME);
      
      console.log(`✅ [VectorStore] Connected to Pinecone index: ${VECTOR_CONFIG.INDEX_NAME}`);
      this.isInitialized = true;

    } catch (error) {
      console.error('❌ [VectorStore] Initialization failed:', error.message);
      
      // Fallback to DEV_MODE
      if (!this.devMode) {
        console.log('⚠️ [VectorStore] Falling back to in-memory storage');
        this.devMode = true;
        this.isInitialized = true;
      }
    }
  }

  /**
   * Index a document (main entry point)
   * Handles chunking, embedding, and upserting
   * 
   * @param {string} text - Document text to index
   * @param {Object} metadata - Document metadata
   * @returns {Promise<Object>} Indexing result
   */
  async indexDocument(text, metadata = {}) {
    await this.initialize();

    const docId = metadata.docId || uuidv4();
    const timestamp = metadata.uploadTimestamp || new Date().toISOString();

    console.log(`📥 [VectorStore] Indexing document: ${docId}`);

    try {
      // Check if document already exists
      const exists = await this.documentExists(docId);
      if (exists) {
        console.log(`⚠️ [VectorStore] Document ${docId} already exists, deleting old vectors...`);
        await this.deleteDocument(docId);
      }

      // Step 1: Chunk the text
      const baseMetadata = {
        docId,
        source: metadata.source || 'upload',
        uploadTimestamp: timestamp,
        userId: metadata.userId || 'unknown'
      };

      const documents = await this.chunkingService.chunkText(text, baseMetadata);
      const stats = this.chunkingService.getChunkStats(documents);
      
      console.log(`📊 [VectorStore] Chunk stats:`, stats);

      // Step 2: Generate embeddings
      console.log(`🔢 [VectorStore] Generating embeddings for ${documents.length} chunks...`);
      
      const texts = documents.map(doc => doc.pageContent);
      const embeddings = await this.embeddings.embedDocuments(texts);

      // Step 3: Prepare vectors for upsert
      const vectors = documents.map((doc, i) => ({
        id: `${docId}_chunk_${i}`,
        values: embeddings[i],
        metadata: {
          ...doc.metadata,
          text: doc.pageContent.substring(0, 1000) // Store truncated text in metadata
        }
      }));

      // Step 4: Upsert to vector store
      await this._upsertVectors(vectors);

      console.log(`✅ [VectorStore] Successfully indexed ${vectors.length} vectors for document ${docId}`);

      return {
        success: true,
        docId,
        chunksIndexed: vectors.length,
        stats,
        devMode: this.devMode
      };

    } catch (error) {
      console.error(`❌ [VectorStore] Indexing failed:`, error.message);
      return {
        success: false,
        error: error.message,
        docId
      };
    }
  }

  /**
   * Query the vector store for similar documents
   * 
   * @param {string} query - Search query
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Retrieved documents
   */
  async query(query, options = {}) {
    await this.initialize();

    const {
      topK = VECTOR_CONFIG.DEFAULT_TOP_K,
      filter = {},
      includeMetadata = true
    } = options;

    try {
      console.log(`🔍 [VectorStore] Querying: "${query.substring(0, 50)}..."`);

      // Generate query embedding
      const queryEmbedding = await this.embeddings.embedQuery(query);

      if (this.devMode) {
        // In-memory similarity search
        return this._memoryQuery(queryEmbedding, topK, filter);
      }

      // Pinecone query
      const namespace = this.index.namespace(VECTOR_CONFIG.NAMESPACE);
      const results = await namespace.query({
        vector: queryEmbedding,
        topK,
        includeMetadata,
        filter: Object.keys(filter).length > 0 ? filter : undefined
      });

      const matches = results.matches || [];
      
      console.log(`📋 [VectorStore] Found ${matches.length} results`);

      return matches.map(match => ({
        id: match.id,
        score: match.score,
        text: match.metadata?.text || '',
        metadata: match.metadata
      }));

    } catch (error) {
      console.error(`❌ [VectorStore] Query failed:`, error.message);
      return [];
    }
  }

  /**
   * Check if a document already exists in the store
   */
  async documentExists(docId) {
    await this.initialize();

    if (this.devMode) {
      return this.memoryStore.documents.has(docId);
    }

    try {
      const namespace = this.index.namespace(VECTOR_CONFIG.NAMESPACE);
      const results = await namespace.query({
        vector: new Array(VECTOR_CONFIG.EMBEDDING_DIMENSIONS).fill(0),
        topK: 1,
        filter: { docId: { $eq: docId } }
      });

      return results.matches && results.matches.length > 0;
    } catch (error) {
      console.error(`❌ [VectorStore] Existence check failed:`, error.message);
      return false;
    }
  }

  /**
   * Delete all vectors for a document
   */
  async deleteDocument(docId) {
    await this.initialize();

    if (this.devMode) {
      this.memoryStore.vectors = this.memoryStore.vectors.filter(
        v => !v.id.startsWith(docId)
      );
      this.memoryStore.documents.delete(docId);
      console.log(`🗑️ [VectorStore] Deleted document ${docId} from memory`);
      return { success: true };
    }

    try {
      const namespace = this.index.namespace(VECTOR_CONFIG.NAMESPACE);
      
      // Pinecone requires listing IDs first, then deleting
      // For simplicity, we use the filter-based delete if available
      await namespace.deleteMany({
        filter: { docId: { $eq: docId } }
      });

      console.log(`🗑️ [VectorStore] Deleted document ${docId} from Pinecone`);
      return { success: true };

    } catch (error) {
      console.error(`❌ [VectorStore] Delete failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get index statistics
   */
  async getStats() {
    await this.initialize();

    if (this.devMode) {
      return {
        devMode: true,
        vectorCount: this.memoryStore.vectors.length,
        documentCount: this.memoryStore.documents.size
      };
    }

    try {
      const stats = await this.index.describeIndexStats();
      return {
        devMode: false,
        ...stats
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Upsert vectors in batches
   * @private
   */
  async _upsertVectors(vectors) {
    if (this.devMode) {
      // In-memory upsert
      for (const vector of vectors) {
        this.memoryStore.vectors.push(vector);
        const docId = vector.metadata.docId;
        if (!this.memoryStore.documents.has(docId)) {
          this.memoryStore.documents.set(docId, []);
        }
        this.memoryStore.documents.get(docId).push(vector.id);
      }
      return;
    }

    // Pinecone batch upsert
    const namespace = this.index.namespace(VECTOR_CONFIG.NAMESPACE);
    
    for (let i = 0; i < vectors.length; i += VECTOR_CONFIG.UPSERT_BATCH_SIZE) {
      const batch = vectors.slice(i, i + VECTOR_CONFIG.UPSERT_BATCH_SIZE);
      await namespace.upsert(batch);
      
      if (i + VECTOR_CONFIG.UPSERT_BATCH_SIZE < vectors.length) {
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * In-memory cosine similarity query
   * @private
   */
  _memoryQuery(queryEmbedding, topK, filter = {}) {
    if (this.memoryStore.vectors.length === 0) {
      return [];
    }

    // Calculate cosine similarity for each vector
    const scored = this.memoryStore.vectors
      .filter(v => this._matchesFilter(v.metadata, filter))
      .map(v => ({
        ...v,
        score: this._cosineSimilarity(queryEmbedding, v.values)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return scored.map(match => ({
      id: match.id,
      score: match.score,
      text: match.metadata?.text || '',
      metadata: match.metadata
    }));
  }

  /**
   * Calculate cosine similarity
   * @private
   */
  _cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Check if metadata matches filter
   * @private
   */
  _matchesFilter(metadata, filter) {
    for (const [key, value] of Object.entries(filter)) {
      if (typeof value === 'object' && value.$eq !== undefined) {
        if (metadata[key] !== value.$eq) return false;
      } else if (metadata[key] !== value) {
        return false;
      }
    }
    return true;
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

const vectorStoreService = new VectorStoreService();

// ============================================
// EXPORTS
// ============================================

module.exports = {
  vectorStoreService,
  VectorStoreService,
  VECTOR_CONFIG
};



