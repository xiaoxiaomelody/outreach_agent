/**
 * Chunking Service
 * Smart text chunking for RAG (Retrieval-Augmented Generation)
 * Uses LangChain RecursiveCharacterTextSplitter for resume-optimized chunking
 */

const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { Document } = require('langchain/document');

// ============================================
// CONSTANTS
// ============================================

/**
 * Chunking configuration optimized for resumes
 * Resumes are dense, structured documents
 */
const CHUNKING_CONFIG = {
  // Chunk size in characters (~500-1000 tokens, ~4 chars per token)
  CHUNK_SIZE: 2000,        // ~500 tokens
  CHUNK_OVERLAP: 400,      // ~100 tokens overlap for context preservation
  
  // Resume-specific separators (ordered by priority)
  SEPARATORS: [
    '\n\n\n',              // Major section breaks
    '\n\n',                // Paragraph breaks
    '\n',                  // Line breaks
    '。',                  // Chinese period
    '.',                   // English period
    '；',                  // Chinese semicolon
    ';',                   // English semicolon
    '，',                  // Chinese comma
    ',',                   // English comma
    ' ',                   // Space
    ''                     // Character by character (last resort)
  ]
};

/**
 * Resume section markers for intelligent splitting
 */
const SECTION_MARKERS = {
  english: [
    'EDUCATION', 'EXPERIENCE', 'WORK EXPERIENCE', 'PROFESSIONAL EXPERIENCE',
    'SKILLS', 'TECHNICAL SKILLS', 'PROJECTS', 'CERTIFICATIONS',
    'SUMMARY', 'OBJECTIVE', 'PROFILE', 'ACHIEVEMENTS', 'AWARDS',
    'PUBLICATIONS', 'LANGUAGES', 'INTERESTS', 'REFERENCES'
  ],
  chinese: [
    '教育背景', '教育经历', '学历', '工作经历', '工作经验', '职业经历',
    '项目经验', '项目经历', '技能', '专业技能', '技术栈',
    '个人简介', '自我评价', '获奖经历', '证书', '语言能力'
  ]
};

// ============================================
// CHUNKING SERVICE CLASS
// ============================================

class ChunkingService {
  constructor(config = {}) {
    this.config = { ...CHUNKING_CONFIG, ...config };
    
    // Initialize LangChain text splitter
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: this.config.CHUNK_SIZE,
      chunkOverlap: this.config.CHUNK_OVERLAP,
      separators: this.config.SEPARATORS
    });
  }

  /**
   * Split text into chunks with metadata
   * @param {string} text - Raw text to chunk
   * @param {Object} metadata - Base metadata to attach to all chunks
   * @returns {Promise<Array<Document>>} Array of Document objects with metadata
   */
  async chunkText(text, metadata = {}) {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text input for chunking');
    }

    // Pre-process: Normalize text
    const normalizedText = this._normalizeText(text);

    // Detect sections for better chunking
    const sections = this._detectSections(normalizedText);
    
    let documents = [];

    if (sections.length > 1) {
      // Section-aware chunking: Process each section separately
      console.log(`📑 Detected ${sections.length} resume sections`);
      
      for (const section of sections) {
        const sectionDocs = await this._chunkSection(section, metadata);
        documents.push(...sectionDocs);
      }
    } else {
      // Fallback: Standard chunking
      const chunks = await this.splitter.splitText(normalizedText);
      
      documents = chunks.map((chunk, index) => {
        return new Document({
          pageContent: chunk,
          metadata: {
            ...metadata,
            chunkIndex: index,
            chunkTotal: chunks.length,
            section: 'unknown',
            charCount: chunk.length
          }
        });
      });
    }

    console.log(`✂️ Split into ${documents.length} chunks`);
    return documents;
  }

  /**
   * Chunk a specific section
   * @private
   */
  async _chunkSection(section, baseMetadata) {
    const { name, content, startIndex } = section;
    
    // For small sections, keep as single chunk
    if (content.length <= this.config.CHUNK_SIZE) {
      return [new Document({
        pageContent: content,
        metadata: {
          ...baseMetadata,
          chunkIndex: 0,
          chunkTotal: 1,
          section: name,
          sectionStart: startIndex,
          charCount: content.length
        }
      })];
    }

    // Split larger sections
    const chunks = await this.splitter.splitText(content);
    
    return chunks.map((chunk, index) => {
      return new Document({
        pageContent: chunk,
        metadata: {
          ...baseMetadata,
          chunkIndex: index,
          chunkTotal: chunks.length,
          section: name,
          sectionStart: startIndex,
          charCount: chunk.length
        }
      });
    });
  }

  /**
   * Detect resume sections in text
   * @private
   */
  _detectSections(text) {
    const allMarkers = [
      ...SECTION_MARKERS.english.map(m => ({ marker: m, lang: 'en' })),
      ...SECTION_MARKERS.chinese.map(m => ({ marker: m, lang: 'zh' }))
    ];

    const foundSections = [];
    const upperText = text.toUpperCase();

    // Find all section markers and their positions
    for (const { marker, lang } of allMarkers) {
      const searchText = lang === 'en' ? upperText : text;
      const searchMarker = lang === 'en' ? marker : marker;
      
      let pos = 0;
      while ((pos = searchText.indexOf(searchMarker, pos)) !== -1) {
        // Check if it's at the start of a line (likely a header)
        const lineStart = text.lastIndexOf('\n', pos);
        const textBeforeOnLine = text.substring(lineStart + 1, pos).trim();
        
        if (textBeforeOnLine.length === 0 || textBeforeOnLine.length < 5) {
          foundSections.push({
            marker,
            position: pos,
            lang
          });
        }
        pos += marker.length;
      }
    }

    if (foundSections.length === 0) {
      return [{ name: 'full_resume', content: text, startIndex: 0 }];
    }

    // Sort by position
    foundSections.sort((a, b) => a.position - b.position);

    // Remove duplicates (overlapping sections)
    const uniqueSections = [];
    for (const section of foundSections) {
      if (uniqueSections.length === 0 || 
          section.position - uniqueSections[uniqueSections.length - 1].position > 20) {
        uniqueSections.push(section);
      }
    }

    // Create section objects with content
    const sections = [];
    
    // Add content before first section if any
    if (uniqueSections[0].position > 50) {
      sections.push({
        name: 'header',
        content: text.substring(0, uniqueSections[0].position).trim(),
        startIndex: 0
      });
    }

    // Add each detected section
    for (let i = 0; i < uniqueSections.length; i++) {
      const start = uniqueSections[i].position;
      const end = i < uniqueSections.length - 1 
        ? uniqueSections[i + 1].position 
        : text.length;
      
      const content = text.substring(start, end).trim();
      
      if (content.length > 10) {
        sections.push({
          name: this._normalizeSectionName(uniqueSections[i].marker),
          content,
          startIndex: start
        });
      }
    }

    return sections.length > 0 ? sections : [{ name: 'full_resume', content: text, startIndex: 0 }];
  }

  /**
   * Normalize section name for metadata
   * @private
   */
  _normalizeSectionName(marker) {
    const mapping = {
      // English
      'EDUCATION': 'education',
      'EXPERIENCE': 'experience',
      'WORK EXPERIENCE': 'experience',
      'PROFESSIONAL EXPERIENCE': 'experience',
      'SKILLS': 'skills',
      'TECHNICAL SKILLS': 'skills',
      'PROJECTS': 'projects',
      'CERTIFICATIONS': 'certifications',
      'SUMMARY': 'summary',
      'OBJECTIVE': 'summary',
      'PROFILE': 'summary',
      // Chinese
      '教育背景': 'education',
      '教育经历': 'education',
      '学历': 'education',
      '工作经历': 'experience',
      '工作经验': 'experience',
      '职业经历': 'experience',
      '项目经验': 'projects',
      '项目经历': 'projects',
      '技能': 'skills',
      '专业技能': 'skills',
      '技术栈': 'skills',
      '个人简介': 'summary',
      '自我评价': 'summary'
    };

    return mapping[marker.toUpperCase()] || mapping[marker] || marker.toLowerCase().replace(/\s+/g, '_');
  }

  /**
   * Normalize text for better chunking
   * @private
   */
  _normalizeText(text) {
    return text
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove excessive whitespace but preserve structure
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{4,}/g, '\n\n\n')
      // Trim
      .trim();
  }

  /**
   * Get chunk statistics
   */
  getChunkStats(documents) {
    if (!documents || documents.length === 0) {
      return { count: 0 };
    }

    const lengths = documents.map(d => d.pageContent.length);
    const sections = [...new Set(documents.map(d => d.metadata.section))];

    return {
      count: documents.length,
      avgLength: Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length),
      minLength: Math.min(...lengths),
      maxLength: Math.max(...lengths),
      sections: sections,
      sectionCount: sections.length
    };
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  ChunkingService,
  CHUNKING_CONFIG,
  SECTION_MARKERS
};

