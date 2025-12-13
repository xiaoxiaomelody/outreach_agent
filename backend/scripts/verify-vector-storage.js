/**
 * Vector Storage Verification Script
 * Demonstrates chunking, embedding, and retrieval functionality
 * 
 * Run with: node scripts/verify-vector-storage.js
 */

require('dotenv').config();

const { vectorStoreService } = require('../src/services/vectorstore.service');
const { ChunkingService } = require('../src/services/chunking.service');

// ============================================
// TEST DATA
// ============================================

const SAMPLE_RESUME = `
John Doe
Senior Software Engineer
john.doe@email.com | (555) 123-4567 | San Francisco, CA

SUMMARY
Experienced software engineer with 8 years of expertise in full-stack development,
cloud architecture, and team leadership. Passionate about building scalable systems
and mentoring junior developers.

EDUCATION
Master of Science in Computer Science
Stanford University, 2016
- GPA: 3.9/4.0
- Thesis: Distributed Systems Optimization

Bachelor of Science in Computer Engineering  
UC Berkeley, 2014
- Graduated with Honors

EXPERIENCE

Senior Software Engineer | Google | 2020 - Present
- Led development of cloud-native microservices handling 10M+ requests/day
- Architected data pipeline processing 50TB+ daily using Apache Kafka and Spark
- Mentored team of 5 junior engineers, improving code quality by 40%
- Implemented CI/CD pipelines reducing deployment time by 60%

Software Engineer | Facebook | 2017 - 2020
- Built React Native mobile app with 2M+ active users
- Developed Python backend services for real-time notification system
- Optimized database queries improving response time by 3x
- Collaborated with product team on A/B testing framework

Junior Developer | Startup Inc | 2016 - 2017
- Developed full-stack web applications using Node.js and React
- Implemented RESTful APIs for mobile applications
- Contributed to open source projects

TECHNICAL SKILLS
Programming: Python, JavaScript, TypeScript, Go, Java, SQL
Frameworks: React, Node.js, Django, Spring Boot, Express
Cloud: AWS (EC2, S3, Lambda, EKS), GCP, Docker, Kubernetes
Databases: PostgreSQL, MongoDB, Redis, Elasticsearch
Tools: Git, Jenkins, Terraform, Prometheus, Grafana

PROJECTS

Open Source Contribution - Kubernetes Dashboard
- Contributed 15+ PRs to Kubernetes dashboard project
- Improved accessibility features for screen readers
- Fixed critical security vulnerabilities

Personal Project - AI Code Review Bot
- Built GitHub bot using OpenAI API for automated code review
- 500+ GitHub stars, used by 100+ organizations
- Written in Python with FastAPI backend

CERTIFICATIONS
- AWS Solutions Architect Professional
- Google Cloud Professional Data Engineer
- Certified Kubernetes Administrator (CKA)

LANGUAGES
English (Native), Spanish (Fluent), Mandarin (Conversational)
`;

// ============================================
// VERIFICATION FUNCTIONS
// ============================================

async function testChunking() {
  console.log('\n' + '='.repeat(60));
  console.log('📑 TEST 1: Chunking Service');
  console.log('='.repeat(60));

  const chunkingService = new ChunkingService();
  
  const documents = await chunkingService.chunkText(SAMPLE_RESUME, {
    docId: 'test-resume-001',
    source: 'verification-script'
  });

  const stats = chunkingService.getChunkStats(documents);
  
  console.log('\n📊 Chunking Statistics:');
  console.log(`   - Total chunks: ${stats.count}`);
  console.log(`   - Average length: ${stats.avgLength} chars`);
  console.log(`   - Min/Max length: ${stats.minLength} / ${stats.maxLength} chars`);
  console.log(`   - Sections detected: ${stats.sections.join(', ')}`);

  console.log('\n📄 First 3 Chunks Preview:');
  documents.slice(0, 3).forEach((doc, i) => {
    console.log(`\n   [Chunk ${i + 1}] Section: ${doc.metadata.section}`);
    console.log(`   ${doc.pageContent.substring(0, 150).replace(/\n/g, ' ')}...`);
  });

  return documents;
}

async function testVectorIndexing() {
  console.log('\n' + '='.repeat(60));
  console.log('📥 TEST 2: Vector Store Indexing');
  console.log('='.repeat(60));

  const result = await vectorStoreService.indexDocument(SAMPLE_RESUME, {
    docId: 'test-resume-001',
    source: 'verification-script',
    uploadTimestamp: new Date().toISOString(),
    userId: 'test-user'
  });

  if (result.success) {
    console.log('\n✅ Indexing successful!');
    console.log(`   - Document ID: ${result.docId}`);
    console.log(`   - Chunks indexed: ${result.chunksIndexed}`);
    console.log(`   - DEV_MODE: ${result.devMode}`);
    if (result.stats) {
      console.log(`   - Sections: ${result.stats.sections?.join(', ') || 'N/A'}`);
    }
  } else {
    console.log('\n❌ Indexing failed:', result.error);
  }

  return result;
}

async function testVectorQuery() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 TEST 3: Vector Store Query');
  console.log('='.repeat(60));

  const queries = [
    'Python experience',
    'cloud architecture and AWS',
    'team leadership and mentoring',
    'education background Stanford'
  ];

  for (const query of queries) {
    console.log(`\n🔎 Query: "${query}"`);
    console.log('-'.repeat(40));

    const results = await vectorStoreService.query(query, { topK: 3 });

    if (results.length === 0) {
      console.log('   No results found');
      continue;
    }

    results.forEach((result, i) => {
      console.log(`\n   [Result ${i + 1}] Score: ${result.score?.toFixed(4) || 'N/A'}`);
      console.log(`   Section: ${result.metadata?.section || 'unknown'}`);
      console.log(`   Text: ${result.text?.substring(0, 200).replace(/\n/g, ' ')}...`);
    });
  }
}

async function testVectorStats() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST 4: Vector Store Statistics');
  console.log('='.repeat(60));

  const stats = await vectorStoreService.getStats();
  
  console.log('\n📈 Store Statistics:');
  console.log(`   - DEV_MODE: ${stats.devMode}`);
  
  if (stats.devMode) {
    console.log(`   - Vectors in memory: ${stats.vectorCount}`);
    console.log(`   - Documents tracked: ${stats.documentCount}`);
  } else {
    console.log(`   - Index stats:`, JSON.stringify(stats, null, 2));
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('\n🚀 Vector Storage Verification Script');
  console.log('=====================================\n');

  try {
    // Check environment
    console.log('🔧 Environment Check:');
    console.log(`   - OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - PINECONE_API_KEY: ${process.env.PINECONE_API_KEY ? '✅ Set' : '⚠️ Missing (will use DEV_MODE)'}`);
    console.log(`   - DEV_MODE: ${process.env.DEV_MODE || 'false'}`);

    if (!process.env.OPENAI_API_KEY) {
      console.error('\n❌ OPENAI_API_KEY is required. Please set it in .env file.');
      process.exit(1);
    }

    // Run tests
    await testChunking();
    await testVectorIndexing();
    await testVectorQuery();
    await testVectorStats();

    console.log('\n' + '='.repeat(60));
    console.log('✅ All verification tests completed!');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };

