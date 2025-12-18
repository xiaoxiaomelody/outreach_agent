/**
 * Jobs Controller
 * Handles API requests for job listings
 */

const jobScraperService = require('../services/jobScraper.service');
const hunterDirect = require('../services/hunter-direct.service');

/**
 * GET /api/jobs
 * Get jobs by category with time range filter
 * Query params:
 *   - category: Job category (required for filtered results)
 *   - timeRange: '1d' | '7d' (required, default: '7d')
 *   - jobType: 'internship' | 'fulltime' (default: 'internship')
 *   - limit: Max number of results (optional, auto-determined by timeRange: 1d=6, 7d=12)
 */
async function getJobs(req, res) {
  try {
    const { category, timeRange = '7d', jobType = 'internship', limit } = req.query;
    
    // Validate timeRange
    const validTimeRanges = ['1d', '7d'];
    const effectiveTimeRange = validTimeRanges.includes(timeRange) ? timeRange : '7d';
    
    // Validate jobType
    const validJobTypes = ['internship', 'fulltime'];
    const effectiveJobType = validJobTypes.includes(jobType) ? jobType : 'internship';
    
    // Parse limit if provided, otherwise let service determine based on timeRange
    const parsedLimit = limit ? parseInt(limit, 10) : null;
    
    const typeLabel = effectiveJobType === 'fulltime' ? 'Full-time' : 'Internship';
    console.log(`📋 Fetching ${typeLabel} jobs for category: ${category || 'All'}, timeRange: ${effectiveTimeRange}`);
    
    const jobs = await jobScraperService.getJobsByCategory(category, effectiveTimeRange, parsedLimit, effectiveJobType);
    
    res.json({
      success: true,
      category: category || 'All',
      timeRange: effectiveTimeRange,
      jobType: effectiveJobType,
      maxLimit: effectiveTimeRange === '1d' ? 6 : 12,
      count: jobs.length,
      jobs
    });
    
  } catch (error) {
    console.error('❌ Error in getJobs:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch jobs',
      message: error.message
    });
  }
}

/**
 * GET /api/jobs/categories
 * Get all available categories
 */
function getCategories(req, res) {
  try {
    const categories = jobScraperService.getCategories();
    
    res.json({
      success: true,
      categories
    });
    
  } catch (error) {
    console.error('❌ Error in getCategories:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    });
  }
}

/**
 * POST /api/jobs/refresh
 * Manually refresh job listings from GitHub
 * Query params:
 *   - jobType: 'internship' | 'fulltime' (default: 'internship')
 */
async function refreshJobs(req, res) {
  try {
    const { jobType = 'internship' } = req.query;
    const effectiveJobType = ['internship', 'fulltime'].includes(jobType) ? jobType : 'internship';
    
    console.log(`🔄 Manual refresh triggered for ${effectiveJobType}`);
    
    const jobs = await jobScraperService.fetchAndParseJobs(effectiveJobType);
    
    res.json({
      success: true,
      message: `${effectiveJobType} jobs refreshed successfully`,
      jobType: effectiveJobType,
      count: jobs.length
    });
    
  } catch (error) {
    console.error('❌ Error in refreshJobs:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh jobs',
      message: error.message
    });
  }
}

/**
 * GET /api/jobs/stats
 * Get job statistics by category
 * Query params:
 *   - jobType: 'internship' | 'fulltime' (default: 'internship')
 */
async function getStats(req, res) {
  try {
    const { jobType = 'internship' } = req.query;
    const effectiveJobType = ['internship', 'fulltime'].includes(jobType) ? jobType : 'internship';
    
    const categories = jobScraperService.getCategories();
    const stats = {};
    
    for (const category of categories) {
      const jobs = await jobScraperService.getJobsByCategory(category, '7d', null, effectiveJobType);
      stats[category] = jobs.length;
    }
    
    // Get total
    const allJobs = await jobScraperService.getJobsByCategory(null, '7d', null, effectiveJobType);
    
    res.json({
      success: true,
      jobType: effectiveJobType,
      total: allJobs.length,
      byCategory: stats,
      sourceUrl: jobScraperService.SOURCE_URLS[effectiveJobType]
    });
    
  } catch (error) {
    console.error('❌ Error in getStats:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats'
    });
  }
}

/**
 * GET /api/jobs/company-contacts
 * Get contacts from a company using Hunter.io
 * Query params:
 *   - company: Company name (required)
 *   - limit: Max results (optional, default: 3)
 */
async function getCompanyContacts(req, res) {
  try {
    const { company, limit = 4 } = req.query;
    
    if (!company) {
      return res.status(400).json({
        success: false,
        error: 'Company name is required'
      });
    }

    console.log(`🔍 Finding contacts at: ${company}`);

    // Convert company name to domain
    // Common patterns: "Google" -> "google.com", "Meta" -> "meta.com"
    const domain = guessDomain(company);
    
    console.log(`🌐 Guessed domain: ${domain}`);

    // Call Hunter.io
    const result = await hunterDirect.domainSearch(domain, {
      limit: Math.min(parseInt(limit) || 3, 10) // Max 10 contacts
    });

    if (!result.success) {
      console.log(`⚠️ Hunter.io search failed: ${result.error}`);
      return res.json({
        success: true,
        company,
        domain,
        contacts: [],
        message: result.error || 'No contacts found'
      });
    }

    console.log(`✅ Found ${result.data.contacts.length} contacts at ${company}`);

    res.json({
      success: true,
      company: result.data.organization || company,
      domain: result.data.domain || domain,
      contacts: result.data.contacts,
      count: result.data.contacts.length
    });

  } catch (error) {
    console.error('❌ Error in getCompanyContacts:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch company contacts',
      message: error.message
    });
  }
}

/**
 * Guess domain from company name
 * Handles common company name patterns
 */
function guessDomain(companyName) {
  if (!companyName) return '';
  
  // Clean the company name
  let name = companyName.toLowerCase().trim();
  
  // Common company name to domain mappings
  const knownDomains = {
    'google': 'google.com',
    'meta': 'meta.com',
    'facebook': 'meta.com',
    'amazon': 'amazon.com',
    'apple': 'apple.com',
    'microsoft': 'microsoft.com',
    'netflix': 'netflix.com',
    'nvidia': 'nvidia.com',
    'intel': 'intel.com',
    'amd': 'amd.com',
    'ibm': 'ibm.com',
    'oracle': 'oracle.com',
    'salesforce': 'salesforce.com',
    'adobe': 'adobe.com',
    'stripe': 'stripe.com',
    'airbnb': 'airbnb.com',
    'uber': 'uber.com',
    'lyft': 'lyft.com',
    'doordash': 'doordash.com',
    'shopify': 'shopify.com',
    'twilio': 'twilio.com',
    'datadog': 'datadoghq.com',
    'snowflake': 'snowflake.com',
    'palantir': 'palantir.com',
    'roblox': 'roblox.com',
    'coinbase': 'coinbase.com',
    'robinhood': 'robinhood.com',
    'jane street': 'janestreet.com',
    'two sigma': 'twosigma.com',
    'citadel': 'citadel.com',
    'jp morgan': 'jpmorgan.com',
    'jpmorgan': 'jpmorgan.com',
    'goldman sachs': 'goldmansachs.com',
    'morgan stanley': 'morganstanley.com',
    'blackrock': 'blackrock.com',
    'deloitte': 'deloitte.com',
    'mckinsey': 'mckinsey.com',
    'bain': 'bain.com',
    'bcg': 'bcg.com',
    'accenture': 'accenture.com',
    'intuit': 'intuit.com',
    'tesla': 'tesla.com',
    'spacex': 'spacex.com',
    'boeing': 'boeing.com',
    'lockheed martin': 'lockheedmartin.com',
    'lockheed': 'lockheedmartin.com',
    'northrop grumman': 'northropgrumman.com',
    'raytheon': 'rtx.com',
    'general electric': 'ge.com',
    'ge': 'ge.com',
    'siemens': 'siemens.com',
    'bytedance': 'bytedance.com',
    'tiktok': 'tiktok.com',
    'alibaba': 'alibaba.com',
    'tencent': 'tencent.com',
    'baidu': 'baidu.com',
    'linkedin': 'linkedin.com',
    'twitter': 'twitter.com',
    'x': 'x.com',
    'snap': 'snap.com',
    'snapchat': 'snap.com',
    'pinterest': 'pinterest.com',
    'reddit': 'reddit.com',
    'discord': 'discord.com',
    'zoom': 'zoom.us',
    'slack': 'slack.com',
    'atlassian': 'atlassian.com',
    'dropbox': 'dropbox.com',
    'box': 'box.com',
    'github': 'github.com',
    'gitlab': 'gitlab.com',
    'hashicorp': 'hashicorp.com',
    'cloudflare': 'cloudflare.com',
    'vmware': 'vmware.com',
    'cisco': 'cisco.com',
    'qualcomm': 'qualcomm.com',
    'broadcom': 'broadcom.com',
    'texas instruments': 'ti.com',
    'ti': 'ti.com'
  };
  
  // Check if it's a known company
  if (knownDomains[name]) {
    return knownDomains[name];
  }
  
  // Remove common suffixes
  name = name
    .replace(/\s*(inc\.?|llc\.?|ltd\.?|corp\.?|corporation|company|co\.?)$/i, '')
    .replace(/\s+/g, '')
    .trim();
  
  // If it already looks like a domain, return as-is
  if (name.includes('.')) {
    return name;
  }
  
  // Default: append .com
  return `${name}.com`;
}

module.exports = {
  getJobs,
  getCategories,
  refreshJobs,
  getStats,
  getCompanyContacts
};

