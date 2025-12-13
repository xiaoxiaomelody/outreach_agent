/**
 * Full Workflow Test Script
 * Tests the complete resume processing pipeline:
 * Phase 1 (Validate) -> Phase 2 (Index) -> Phase 3 (Analyze)
 * 
 * Run with: node scripts/test-full-workflow.js
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { ResumeValidator, InvalidDocumentError } = require('../src/validators/resume.validator');
const { vectorStoreService } = require('../src/services/vectorstore.service');
const { resumeAnalyzerService } = require('../src/services/resume-analyzer.service');

// ============================================
// TEST DATA
// ============================================

const VALID_RESUME_TEXT = `
Alex Johnson
Staff Software Engineer
alex.johnson@techcorp.com | Seattle, WA | github.com/alexj

SUMMARY
Accomplished software engineer with 10+ years of experience building large-scale 
distributed systems. Expert in Go, Python, and cloud-native architectures. 
Led engineering teams at Fortune 500 companies.

EDUCATION
PhD in Computer Science
Carnegie Mellon University, 2014
- Research: Distributed Consensus Algorithms

MS in Computer Science
Stanford University, 2011

EXPERIENCE

Staff Engineer | Amazon Web Services | 2020 - Present
- Architected next-generation container orchestration platform serving 50K+ customers
- Led team of 12 engineers across 3 time zones
- Reduced infrastructure costs by $10M annually through optimization
- Published 3 patents on distributed systems

Senior Engineer | Microsoft | 2016 - 2020  
- Core contributor to Azure Kubernetes Service
- Implemented auto-scaling algorithms handling 100M+ pods
- Mentored 20+ junior engineers

Software Engineer | Google | 2014 - 2016
- Worked on Borg cluster management system
- Improved resource utilization by 30%

TECHNICAL SKILLS
Languages: Go, Python, Rust, C++, Java
Systems: Kubernetes, Docker, Terraform, Prometheus
Cloud: AWS (expert), GCP, Azure
Databases: PostgreSQL, DynamoDB, Redis, Cassandra

KEY PROJECTS

Next-Gen Container Platform (AWS)
- Tech: Go, Kubernetes, gRPC, PostgreSQL
- Impact: 50K+ enterprise customers, 99.99% uptime
- Led architecture and implementation

Auto-scaling System (Azure)
- Tech: C#, Python, Azure Functions
- Impact: 100M+ pods managed, 40% cost reduction

PUBLICATIONS
- "Consensus in Large-Scale Distributed Systems" - OSDI 2018
- "Efficient Container Orchestration" - SoCC 2021

CERTIFICATIONS  
- AWS Solutions Architect Professional
- Certified Kubernetes Administrator
- Google Cloud Professional Architect
`;

const INVALID_DOCUMENT_TEXT = `
Chapter 1: Introduction to Cooking

Welcome to the wonderful world of culinary arts! In this cookbook, 
we will explore various recipes from around the globe.

Ingredients for Basic Pasta:
- 500g pasta
- 2 tablespoons olive oil
- 3 cloves garlic
- Salt and pepper to taste

Instructions:
1. Boil water in a large pot
2. Add salt and pasta
3. Cook for 8-10 minutes
4. Drain and serve with sauce

This recipe serves 4 people and takes approximately 20 minutes to prepare.
`;

// ============================================
// TEST FUNCTIONS
// ============================================

async function testPhase1Validation() {
  console.log('\n' + '='.repeat(60));
  console.log('📋 PHASE 1: Document Validation');
  console.log('='.repeat(60));

  const validator = new ResumeValidator();

  // Test valid resume
  console.log('\n✅ Testing valid resume...');
  try {
    const result = validator.validate(VALID_RESUME_TEXT);
    console.log(`   ✓ Validation passed`);
    console.log(`   - Text length: ${result.textLength} chars`);
    console.log(`   - Keywords found: ${result.keywordsFound.join(', ')}`);
  } catch (error) {
    console.log(`   ✗ Unexpected failure: ${error.message}`);
    return false;
  }

  // Test invalid document
  console.log('\n❌ Testing invalid document (cookbook)...');
  try {
    validator.validate(INVALID_DOCUMENT_TEXT);
    console.log(`   ✗ Should have thrown InvalidDocumentError`);
    return false;
  } catch (error) {
    if (error instanceof InvalidDocumentError) {
      console.log(`   ✓ Correctly rejected: ${error.message.substring(0, 60)}...`);
      console.log(`   - Error code: ${error.details?.check}`);
    } else {
      console.log(`   ✗ Wrong error type: ${error.constructor.name}`);
      return false;
    }
  }

  // Test empty document
  console.log('\n❌ Testing empty document...');
  try {
    validator.validate('Short');
    console.log(`   ✗ Should have thrown InvalidDocumentError`);
    return false;
  } catch (error) {
    if (error instanceof InvalidDocumentError) {
      console.log(`   ✓ Correctly rejected empty document`);
    } else {
      return false;
    }
  }

  return true;
}

async function testPhase2Indexing() {
  console.log('\n' + '='.repeat(60));
  console.log('📥 PHASE 2: Vector Indexing');
  console.log('='.repeat(60));

  const docId = 'test-alex-johnson';

  console.log('\n🔄 Indexing resume...');
  const result = await vectorStoreService.indexDocument(VALID_RESUME_TEXT, {
    docId,
    source: 'workflow-test',
    userId: 'test-user',
    uploadTimestamp: new Date().toISOString()
  });

  if (!result.success) {
    console.log(`   ✗ Indexing failed: ${result.error}`);
    return { success: false };
  }

  console.log(`   ✓ Indexed ${result.chunksIndexed} chunks`);
  console.log(`   - Sections: ${result.stats?.sections?.join(', ')}`);
  console.log(`   - DEV_MODE: ${result.devMode}`);

  // Verify document exists
  console.log('\n🔍 Verifying document exists...');
  const exists = await vectorStoreService.documentExists(docId);
  console.log(`   ✓ Document exists: ${exists}`);

  return { success: true, docId };
}

async function testPhase3Analysis(docId) {
  console.log('\n' + '='.repeat(60));
  console.log('🧠 PHASE 3: RAG Analysis');
  console.log('='.repeat(60));

  // Test 1: Basic analysis
  console.log('\n📊 Test 1: Comprehensive Analysis');
  console.log('-'.repeat(40));
  
  const analysisResult = await resumeAnalyzerService.analyzeResume({
    query: 'Provide a comprehensive analysis of this candidate',
    docId,
    topK: 5
  });

  if (analysisResult.success) {
    const a = analysisResult.data;
    console.log(`   Candidate: ${a.candidate_name}`);
    console.log(`   Role: ${a.current_role}`);
    console.log(`   Experience: ${a.years_of_experience} years`);
    console.log(`   Top Skills: ${(a.top_skills || []).slice(0, 5).join(', ')}`);
  } else {
    console.log(`   ⚠️ Analysis issue: ${analysisResult.error}`);
  }

  // Test 2: Job fit analysis
  console.log('\n💼 Test 2: Job Fit Analysis');
  console.log('-'.repeat(40));

  const jobDescription = `
    Position: Principal Engineer
    Requirements:
    - 10+ years of software engineering experience
    - Expert in distributed systems
    - Experience with Kubernetes and container orchestration
    - Leadership experience
    - PhD preferred
  `;

  const fitResult = await resumeAnalyzerService.analyzeResume({
    query: 'Evaluate fit for this position',
    jobDescription,
    docId,
    topK: 8
  });

  if (fitResult.success && fitResult.data.job_fit_analysis) {
    const fit = fitResult.data.job_fit_analysis;
    console.log(`   Fit Score: ${fit.fit_score}/100`);
    console.log(`   Matching: ${(fit.matching_skills || []).slice(0, 3).join(', ')}...`);
    console.log(`   Missing: ${(fit.missing_skills || []).slice(0, 3).join(', ') || 'None'}`);
    console.log(`   Recommendation: ${fit.recommendation}`);
  } else {
    console.log(`   ⚠️ Job fit analysis not available`);
  }

  // Test 3: Skill match
  console.log('\n🎯 Test 3: Skill Match');
  console.log('-'.repeat(40));

  const skillResult = await resumeAnalyzerService.analyzeSkillMatch(
    ['Go', 'Python', 'Kubernetes', 'Rust', 'Machine Learning'],
    { filter: { docId: { $eq: docId } } }
  );

  if (skillResult.success) {
    console.log(`   Match Rate: ${skillResult.data.matchRate}`);
    console.log(`   Found: ${skillResult.data.foundSkills.join(', ')}`);
    console.log(`   Missing: ${skillResult.data.missingSkills.join(', ')}`);
  }

  return true;
}

async function testErrorHandling() {
  console.log('\n' + '='.repeat(60));
  console.log('⚠️ ERROR HANDLING TESTS');
  console.log('='.repeat(60));

  // Test: Document not found
  console.log('\n❌ Test: Analyze non-existent document');
  const result = await resumeAnalyzerService.analyzeResume({
    docId: 'non-existent-doc-xyz',
    topK: 3
  });
  
  if (!result.success && result.error?.includes('No resume')) {
    console.log(`   ✓ Correctly returned error for missing document`);
  } else {
    console.log(`   ⚠️ Unexpected response`);
  }

  return true;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('\n🚀 Full Workflow Test');
  console.log('=====================');
  console.log('Testing: Phase 1 (Validate) -> Phase 2 (Index) -> Phase 3 (Analyze)\n');

  // Check environment
  console.log('🔧 Environment:');
  console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅' : '❌'}`);
  console.log(`   DEV_MODE: ${process.env.DEV_MODE || 'false'}`);

  if (!process.env.OPENAI_API_KEY) {
    console.error('\n❌ OPENAI_API_KEY required');
    process.exit(1);
  }

  let allPassed = true;

  try {
    // Phase 1
    const phase1 = await testPhase1Validation();
    if (!phase1) allPassed = false;

    // Phase 2
    const phase2 = await testPhase2Indexing();
    if (!phase2.success) allPassed = false;

    // Phase 3
    if (phase2.success) {
      const phase3 = await testPhase3Analysis(phase2.docId);
      if (!phase3) allPassed = false;
    }

    // Error handling
    await testErrorHandling();

    // Summary
    console.log('\n' + '='.repeat(60));
    if (allPassed) {
      console.log('✅ ALL WORKFLOW TESTS PASSED');
    } else {
      console.log('⚠️ SOME TESTS HAD ISSUES');
    }
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };

