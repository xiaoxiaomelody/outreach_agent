/**
 * Test Hunter.io with AI-Generated Summaries
 * Run with: node test-hunter-with-summaries.js
 */

require('dotenv').config();
const hunterWithSummaries = require('./src/services/hunter-with-summaries.service');
const openaiService = require('./src/services/openai.service');

console.log('🧪 Testing Hunter.io with AI-Generated Summaries\n');
console.log('=' .repeat(70));

// Check environment variables
console.log('📋 Configuration Check:');
console.log('  HUNTER_API_KEY:', process.env.HUNTER_API_KEY ? '✅ Set' : '❌ Missing');
console.log('  OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing');
console.log('=' .repeat(70));

/**
 * Test 1: Get Stripe contacts with AI summaries
 */
async function test1_StripeWithSummaries() {
  console.log('\n📧 Test 1: Stripe Contacts with AI Summaries');
  console.log('-'.repeat(70));
  console.log('Fetching contacts and generating AI summaries...\n');
  
  try {
    const result = await hunterWithSummaries.domainSearchWithSummaries('openai.com', {
      limit: 5  // Start with just 5 to keep costs low
    });

    if (result.success) {
      console.log('✅ SUCCESS!\n');
      console.log(`🏢 Company: ${result.data.organization}`);
      console.log(`📊 Total Available: ${result.data.meta.results}`);
      console.log(`📋 Showing: ${result.data.contacts.length} contacts with summaries\n`);
      console.log('=' .repeat(70));
      
      result.data.contacts.forEach((contact, index) => {
        console.log(`\n${index + 1}. ${contact.name}`);
        console.log(`   📧 Email: ${contact.email}`);
        console.log(`   💼 Position: ${contact.position || 'N/A'}`);
        console.log(`   🏢 Department: ${contact.department || 'N/A'}`);
        console.log(`   ⭐ Seniority: ${contact.seniority || 'N/A'}`);
        console.log(`   🔗 LinkedIn: ${contact.linkedin || 'N/A'}`);
        console.log(`   ✓ Confidence: ${contact.confidence}%`);
        console.log(`   ✓ Verified: ${contact.verified ? 'Yes ✅' : 'No ❌'}`);
        
        // The AI-generated summary!
        console.log(`\n   📝 AI Summary:`);
        console.log(`   "${contact.summary}"`);
        console.log(`   (Generated: ${contact.summaryGenerated ? 'Yes ✅' : 'No ❌'})`);
        
        console.log('\n' + '-'.repeat(70));
      });
      
      console.log('\n💡 Use Case: These summaries are perfect for:');
      console.log('   • Displaying in your ContactCard component');
      console.log('   • Personalizing email templates');
      console.log('   • Quick contact evaluation');
      console.log('   • User decision support (accept/reject)');
      
    } else {
      console.log('❌ FAILED');
      console.log('Error:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Test 2: Single contact summary generation
 */
async function test2_SingleSummary() {
  console.log('\n\n📝 Test 2: Generate Summary for Single Contact');
  console.log('-'.repeat(70));
  
  const sampleContact = {
    name: 'Patrick Collison',
    position: 'CEO and Co-founder',
    company: 'Stripe',
    department: 'executive',
    seniority: 'executive',
    linkedin: 'https://www.linkedin.com/in/patrickcollison'
  };
  
  console.log('Contact:', JSON.stringify(sampleContact, null, 2));
  console.log('\nGenerating AI summary...\n');
  
  try {
    const result = await openaiService.generateContactSummary(sampleContact);
    
    if (result.success) {
      console.log('✅ SUCCESS!\n');
      console.log('📝 Generated Summary:');
      console.log(`"${result.summary}"`);
    } else {
      console.log('❌ FAILED');
      console.log('Error:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Test 3: Search by department with summaries
 */
async function test3_DepartmentWithSummaries() {
  console.log('\n\n🏢 Test 3: Engineering Department at Stripe (with Summaries)');
  console.log('-'.repeat(70));
  console.log('Searching for IT/Engineering contacts...\n');
  
  try {
    const result = await hunterWithSummaries.searchByDepartmentWithSummaries(
      'stripe.com',
      'it',
      3  // Just 3 contacts to save on API costs
    );
    
    if (result.success) {
      console.log('✅ SUCCESS!\n');
      console.log(`Found ${result.data.contacts.length} engineers:\n`);
      
      result.data.contacts.forEach((contact, index) => {
        console.log(`${index + 1}. ${contact.name}`);
        console.log(`   💼 ${contact.position || 'N/A'}`);
        console.log(`   📧 ${contact.email}`);
        console.log(`   📝 "${contact.summary}"`);
        console.log('');
      });
    } else {
      console.log('❌ FAILED');
      console.log('Error:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Test 4: Natural language search with summaries
 */
async function test4_NaturalLanguageSearch() {
  console.log('\n\n🗣️ Test 4: Natural Language Search with Summaries');
  console.log('-'.repeat(70));
  
  const query = 'find 5 executives at Stripe';
  console.log(`Query: "${query}"\n`);
  
  try {
    const result = await hunterWithSummaries.naturalLanguageSearchWithSummaries(query);
    
    if (result.success) {
      console.log('✅ SUCCESS!\n');
      console.log(`Found ${result.data.contacts.length} contacts:\n`);
      
      result.data.contacts.forEach((contact, index) => {
        console.log(`${index + 1}. ${contact.name} - ${contact.position || 'N/A'}`);
        console.log(`   📧 ${contact.email}`);
        console.log(`   📝 "${contact.summary}"`);
        console.log('');
      });
    } else {
      console.log('❌ FAILED');
      console.log('Error:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Test 5: Without summaries (comparison)
 */
async function test5_WithoutSummaries() {
  console.log('\n\n⚡ Test 5: Without AI Summaries (Faster, Cheaper)');
  console.log('-'.repeat(70));
  console.log('Fetching contacts WITHOUT generating summaries...\n');
  
  try {
    const result = await hunterWithSummaries.domainSearchWithSummaries('stripe.com', {
      limit: 3,
      includeSummaries: false  // Disable summaries
    });

    if (result.success) {
      console.log('✅ SUCCESS!\n');
      console.log('Contacts (no summaries):');
      
      result.data.contacts.forEach((contact, index) => {
        console.log(`${index + 1}. ${contact.name} - ${contact.position || 'N/A'}`);
        console.log(`   📧 ${contact.email}`);
        console.log(`   📝 Summary: ${contact.summary || 'Not generated'}`);
        console.log('');
      });
      
      console.log('💡 Use this when:');
      console.log('   • Speed is priority');
      console.log('   • Want to save on OpenAI costs');
      console.log('   • Don\'t need summaries immediately');
    } else {
      console.log('❌ FAILED');
      console.log('Error:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  try {
    console.log('\n🚀 Starting Tests...\n');
    
    // Check if API keys are set
    if (!process.env.HUNTER_API_KEY) {
      console.log('❌ ERROR: HUNTER_API_KEY not found!');
      console.log('💡 Add to backend/.env: HUNTER_API_KEY=your-key-here\n');
      return;
    }
    
    if (!process.env.OPENAI_API_KEY) {
      console.log('❌ ERROR: OPENAI_API_KEY not found!');
      console.log('💡 Add to backend/.env: OPENAI_API_KEY=your-key-here');
      console.log('💡 Get key from: https://platform.openai.com/api-keys\n');
      return;
    }
    
    // Run tests (uncomment the ones you want)
    await test1_StripeWithSummaries();      // Main test - Stripe with summaries
    // await test2_SingleSummary();          // Single summary generation
    // await test3_DepartmentWithSummaries(); // Department search
    // await test4_NaturalLanguageSearch();   // Natural language query
    // await test5_WithoutSummaries();        // Without summaries for comparison
    
    console.log('\n\n' + '='.repeat(70));
    console.log('✅ Tests completed!');
    console.log('=' .repeat(70));
    
    console.log('\n💰 Cost Note:');
    console.log('   • Hunter.io: Counts toward your monthly quota');
    console.log('   • OpenAI: ~$0.001-0.002 per summary (very affordable!)');
    console.log('   • 5 contacts with summaries: ~$0.01 total');
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Use summaries in ContactCard component');
    console.log('   2. Show summaries to help users accept/reject');
    console.log('   3. Use summaries for email personalization');
    console.log('   4. Store summaries in your Firestore database\n');
    
  } catch (error) {
    console.error('❌ Fatal Error:', error.message);
  }
}

// Run tests
if (require.main === module) {
  runAllTests();
}

module.exports = {
  test1_StripeWithSummaries,
  test2_SingleSummary,
  test3_DepartmentWithSummaries,
  test4_NaturalLanguageSearch,
  test5_WithoutSummaries
};

