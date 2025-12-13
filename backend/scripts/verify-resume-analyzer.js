/**
 * Resume Analyzer Verification Script
 * Demonstrates RAG-based resume analysis functionality
 * 
 * Run with: node scripts/verify-resume-analyzer.js
 */

require('dotenv').config();

const { vectorStoreService } = require('../src/services/vectorstore.service');
const { resumeAnalyzerService } = require('../src/services/resume-analyzer.service');

// ============================================
// TEST DATA
// ============================================

const SAMPLE_RESUME = `
Sarah Chen
Senior Software Engineer
sarah.chen@email.com | San Francisco, CA | linkedin.com/in/sarachen

SUMMARY
Innovative software engineer with 7 years of experience specializing in distributed systems 
and machine learning infrastructure. Led teams at top-tier companies, delivering high-impact 
projects that improved system performance by 10x.

EDUCATION
Master of Science in Computer Science
MIT, 2017
- Focus: Machine Learning and Distributed Systems
- Thesis: "Optimizing Neural Network Training on Distributed Clusters"

Bachelor of Science in Computer Engineering
UC San Diego, 2015
- Magna Cum Laude

EXPERIENCE

Tech Lead | Airbnb | 2021 - Present
- Led a team of 8 engineers building the real-time pricing recommendation engine
- Architected ML pipeline processing 100M+ events/day using Kafka and Spark
- Reduced inference latency by 60% through model optimization and caching
- Mentored 5 junior engineers, 3 promoted within 18 months

Senior Software Engineer | Uber | 2019 - 2021
- Built rider-driver matching service handling 10M+ requests/minute
- Implemented A/B testing framework used across 50+ teams
- Developed Python SDK for internal ML platform, adopted by 200+ engineers
- On-call rotation lead, reduced incident response time by 40%

Software Engineer | Google | 2017 - 2019
- Worked on TensorFlow distributed training infrastructure
- Contributed to open-source TensorFlow codebase (20+ merged PRs)
- Built monitoring dashboard for ML training jobs

TECHNICAL SKILLS
Languages: Python, Go, Java, Scala, SQL
ML/Data: TensorFlow, PyTorch, Spark, Kafka, Airflow
Infrastructure: Kubernetes, Docker, AWS, GCP, Terraform
Databases: PostgreSQL, Redis, Cassandra, BigQuery

KEY PROJECTS

Real-time Pricing Engine (Airbnb)
- Technologies: Python, TensorFlow, Kafka, Kubernetes
- Impact: $50M annual revenue increase from optimized dynamic pricing
- Scale: 100M events/day, <50ms p99 latency

Rider-Driver Matching v2 (Uber)
- Technologies: Go, gRPC, Redis, PostgreSQL
- Impact: 15% improvement in match quality, reduced wait times
- Scale: 10M requests/minute globally

CERTIFICATIONS
- Google Cloud Professional ML Engineer
- AWS Solutions Architect Professional
- Kubernetes Administrator (CKA)

PUBLICATIONS
- "Scaling Neural Networks Across Datacenters" - NIPS 2018
- "Efficient Caching for ML Inference" - KDD 2020
`;

const SAMPLE_JOB_DESCRIPTION = `
Position: Staff Machine Learning Engineer
Company: OpenAI

We are looking for a Staff ML Engineer to join our infrastructure team.

Responsibilities:
- Design and build ML training infrastructure at scale
- Optimize model serving for low-latency inference
- Lead technical initiatives across multiple teams
- Mentor junior engineers

Required Qualifications:
- 8+ years of software engineering experience
- 5+ years with machine learning systems
- Experience with distributed systems (Kubernetes, Spark)
- Strong Python and Go skills
- Experience leading engineering teams

Preferred:
- PhD in Computer Science or related field
- Publications in top ML conferences
- Experience with large language models
- Contributions to open source ML frameworks
`;

// ============================================
// TEST FUNCTIONS
// ============================================

async function indexSampleResume() {
  console.log('\n' + '='.repeat(60));
  console.log('📥 STEP 1: Indexing Sample Resume');
  console.log('='.repeat(60));

  const result = await vectorStoreService.indexDocument(SAMPLE_RESUME, {
    docId: 'test-sarah-chen',
    source: 'verification-script',
    uploadTimestamp: new Date().toISOString(),
    userId: 'test-user'
  });

  if (result.success) {
    console.log(`✅ Indexed ${result.chunksIndexed} chunks`);
    console.log(`   Sections: ${result.stats?.sections?.join(', ') || 'N/A'}`);
  } else {
    console.log(`❌ Indexing failed: ${result.error}`);
  }

  return result.success;
}

async function testComprehensiveAnalysis() {
  console.log('\n' + '='.repeat(60));
  console.log('🧠 TEST 1: Comprehensive Resume Analysis');
  console.log('='.repeat(60));

  const result = await resumeAnalyzerService.analyzeResume({
    query: 'Provide a comprehensive analysis of this candidate',
    topK: 5
  });

  if (result.success) {
    const analysis = result.data;
    
    console.log('\n📋 Analysis Results:');
    console.log('-'.repeat(40));
    console.log(`   Candidate: ${analysis.candidate_name}`);
    console.log(`   Current Role: ${analysis.current_role}`);
    console.log(`   Years of Experience: ${analysis.years_of_experience}`);
    
    console.log('\n   🎯 Top Skills:');
    (analysis.top_skills || []).slice(0, 5).forEach(skill => {
      console.log(`      - ${skill}`);
    });

    console.log('\n   💼 Key Projects:');
    (analysis.key_projects || []).slice(0, 2).forEach(project => {
      console.log(`      - ${project.name}`);
      console.log(`        Tech: ${project.tech_stack?.join(', ')}`);
      console.log(`        Impact: ${project.impact?.substring(0, 80)}...`);
    });

    console.log('\n   ⚠️ Red Flags:');
    if (analysis.red_flags?.length > 0) {
      analysis.red_flags.forEach(flag => {
        console.log(`      - [${flag.severity?.toUpperCase()}] ${flag.flag}`);
      });
    } else {
      console.log('      None identified');
    }

    console.log('\n   📚 Sources Used:');
    (result.data.sources || []).forEach(src => {
      console.log(`      - ${src.section} (${src.relevance})`);
    });

  } else {
    console.log(`❌ Analysis failed: ${result.error}`);
  }
}

async function testJobFitAnalysis() {
  console.log('\n' + '='.repeat(60));
  console.log('💼 TEST 2: Job Fit Analysis');
  console.log('='.repeat(60));

  const result = await resumeAnalyzerService.analyzeResume({
    query: 'Evaluate this candidate\'s fit for the following position',
    jobDescription: SAMPLE_JOB_DESCRIPTION,
    topK: 8
  });

  if (result.success) {
    const fit = result.data.job_fit_analysis;
    
    console.log('\n📊 Job Fit Results:');
    console.log('-'.repeat(40));
    
    if (fit) {
      console.log(`   Fit Score: ${fit.fit_score}/100`);
      
      console.log('\n   ✅ Matching Skills:');
      (fit.matching_skills || []).forEach(skill => {
        console.log(`      - ${skill}`);
      });

      console.log('\n   ❌ Missing Skills:');
      (fit.missing_skills || []).forEach(skill => {
        console.log(`      - ${skill}`);
      });

      console.log(`\n   📝 Recommendation: ${fit.recommendation}`);
    } else {
      console.log('   No job fit analysis generated');
    }

  } else {
    console.log(`❌ Job fit analysis failed: ${result.error}`);
  }
}

async function testSkillMatch() {
  console.log('\n' + '='.repeat(60));
  console.log('🎯 TEST 3: Skill Match Analysis');
  console.log('='.repeat(60));

  const requiredSkills = [
    'Python', 'Go', 'Kubernetes', 'TensorFlow', 
    'Rust', 'Spark', 'Leadership'
  ];

  console.log(`\n   Checking for skills: ${requiredSkills.join(', ')}`);

  const result = await resumeAnalyzerService.analyzeSkillMatch(requiredSkills);

  if (result.success) {
    const data = result.data;
    
    console.log('\n📊 Skill Match Results:');
    console.log('-'.repeat(40));
    console.log(`   Match Rate: ${data.matchRate}`);
    console.log(`   Found: ${data.foundSkills.join(', ')}`);
    console.log(`   Missing: ${data.missingSkills.join(', ')}`);

    console.log('\n   📍 Evidence:');
    Object.entries(data.details).forEach(([skill, info]) => {
      if (info.found) {
        console.log(`      ✅ ${skill}:`);
        info.evidence.slice(0, 1).forEach(e => {
          console.log(`         Section: ${e.section}`);
          console.log(`         "${e.snippet}"`);
        });
      }
    });

  } else {
    console.log(`❌ Skill match failed: ${result.error}`);
  }
}

async function testCustomQuery() {
  console.log('\n' + '='.repeat(60));
  console.log('❓ TEST 4: Custom Query');
  console.log('='.repeat(60));

  const queries = [
    'Does this candidate have leadership experience?',
    'What machine learning frameworks has this candidate used?',
    'Summarize the candidate\'s experience at FAANG companies'
  ];

  for (const query of queries) {
    console.log(`\n🔍 Query: "${query}"`);
    console.log('-'.repeat(40));

    const result = await resumeAnalyzerService.analyzeResume({
      query,
      topK: 3
    });

    if (result.success) {
      // Extract relevant part of response
      let summary = result.data.summary || '';
      if (!summary && result.data.strengths?.length > 0) {
        summary = result.data.strengths[0];
      }
      if (!summary) {
        summary = JSON.stringify(result.data).substring(0, 200);
      }
      const displayText = typeof summary === 'string' ? summary.substring(0, 200) : JSON.stringify(summary).substring(0, 200);
      console.log(`   Answer: ${displayText}...`);
    } else {
      console.log(`   Error: ${result.error}`);
    }
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('\n🚀 Resume Analyzer Verification Script');
  console.log('=====================================\n');

  try {
    // Check environment
    console.log('🔧 Environment Check:');
    console.log(`   - OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`);

    if (!process.env.OPENAI_API_KEY) {
      console.error('\n❌ OPENAI_API_KEY is required. Please set it in .env file.');
      process.exit(1);
    }

    // Run tests
    const indexed = await indexSampleResume();
    
    if (!indexed) {
      console.error('\n❌ Cannot proceed without indexed resume');
      process.exit(1);
    }

    await testComprehensiveAnalysis();
    await testJobFitAnalysis();
    await testSkillMatch();
    await testCustomQuery();

    console.log('\n' + '='.repeat(60));
    console.log('✅ All RAG analysis tests completed!');
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

