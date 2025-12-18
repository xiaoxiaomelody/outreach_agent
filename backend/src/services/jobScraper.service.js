/**
 * Job Scraper Service
 * Fetches and parses job listings from GitHub README
 * Supports both Internship and Full-time (New Grad) positions
 * Uses in-memory storage for simplicity and speed
 */

// ============================================
// IN-MEMORY STORAGE (No Firebase needed)
// ============================================

// Separate caches for different job types
const jobsCaches = {
  internship: [],
  fulltime: []
};

const cacheTimestamps = {
  internship: null,
  fulltime: null
};

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// Job limits by time range
const JOB_LIMITS = {
  '1d': 6,
  '7d': 12
};

// Source URLs for job listings
const SOURCE_URLS = {
  internship: 'https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md',
  fulltime: 'https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/README.md'
};

// Category mappings: internal name -> patterns to match in README headers
const CATEGORY_MAPPINGS = {
  'Software Engineering': ['Software Engineering'],
  'Product Management': ['Product Management'],
  'Data Science': ['Data Science', 'AI', 'Machine Learning'],
  'Quantitative Finance': ['Quantitative Finance'],
  'Hardware Engineering': ['Hardware Engineering']
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Decode HTML entities in a string
 * e.g., &amp; -> &, &lt; -> <, etc.
 */
function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Remove query parameters from URL to get clean base URL
 * e.g., https://example.com/job?utm_source=X&ref=Y -> https://example.com/job
 */
function removeQueryParams(url) {
  if (!url) return '';
  
  try {
    const urlObj = new URL(url);
    urlObj.search = '';
    return urlObj.toString();
  } catch {
    const questionMarkIndex = url.indexOf('?');
    if (questionMarkIndex !== -1) {
      return url.substring(0, questionMarkIndex);
    }
    return url;
  }
}

/**
 * Extract company name from HTML table cell
 * Handles formats like: 🔥 <strong><a href="...">NVIDIA</a></strong>
 */
function extractCompanyFromCell(cell) {
  if (!cell) return '';
  
  // Remove emoji flags and special markers
  let cleaned = cell.replace(/[🔥🛂🇺🇸🔒🎓↳]/g, '').trim();
  
  // Extract text from nested tags: <strong><a href="...">Company</a></strong>
  const linkMatch = cleaned.match(/<a[^>]*>([^<]+)<\/a>/i);
  if (linkMatch) {
    return linkMatch[1].trim();
  }
  
  // Extract from <strong>Company</strong>
  const strongMatch = cleaned.match(/<strong>([^<]+)<\/strong>/i);
  if (strongMatch) {
    return strongMatch[1].trim();
  }
  
  // Remove any remaining HTML tags
  return cleaned.replace(/<[^>]*>/g, '').trim();
}

/**
 * Extract application link from HTML table cell
 * Returns clean URL without tracking parameters
 */
function extractApplicationLink(cell) {
  if (!cell) return '';
  
  // Find the first href that's not a Simplify link (get the actual job link)
  const hrefMatches = cell.matchAll(/href="([^"]+)"/g);
  for (const match of hrefMatches) {
    // First decode HTML entities (e.g., &amp; -> &)
    const decodedUrl = decodeHtmlEntities(match[1]);
    
    // Skip Simplify helper links (simplify.jobs/p/...), get the actual application link
    if (decodedUrl && decodedUrl.includes('http') && !decodedUrl.includes('simplify.jobs/p/')) {
      // Remove query parameters to get clean URL
      return removeQueryParams(decodedUrl);
    }
  }
  
  // Fallback: get any href (also decode and clean it)
  const firstHref = cell.match(/href="([^"]+)"/);
  if (firstHref) {
    const decodedUrl = decodeHtmlEntities(firstHref[1]);
    return removeQueryParams(decodedUrl);
  }
  
  return '';
}

/**
 * Normalize date string to Date object
 * Handles: "0d", "1d", "7d", "today", "yesterday", "Dec 17", "3mo"
 */
function normalizeDate(dateStr) {
  if (!dateStr) return null;
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let date = null;

  dateStr = dateStr.toLowerCase().trim();

  if (dateStr === 'today' || dateStr === '0d') {
    date = today;
  } else if (dateStr === 'yesterday' || dateStr === '1d') {
    date = new Date(today);
    date.setDate(today.getDate() - 1);
  } else if (dateStr.endsWith('d')) {
    const daysAgo = parseInt(dateStr.slice(0, -1));
    if (!isNaN(daysAgo)) {
      date = new Date(today);
      date.setDate(today.getDate() - daysAgo);
    }
  } else if (dateStr.endsWith('mo')) {
    // Handle "3mo" format (months ago)
    const monthsAgo = parseInt(dateStr.slice(0, -2));
    if (!isNaN(monthsAgo)) {
      date = new Date(today);
      date.setMonth(today.getMonth() - monthsAgo);
    }
  } else {
    // Handle "Dec 17" format
    const year = now.getFullYear();
    const parsedDate = new Date(`${dateStr}, ${year}`);
    if (!isNaN(parsedDate.getTime())) {
      date = parsedDate;
      // If the parsed date is in the future, assume it's for the previous year
      if (date > now) {
        date.setFullYear(year - 1);
      }
    }
  }
  return date;
}

// ============================================
// PARSING FUNCTIONS
// ============================================

/**
 * Parse HTML table rows into job objects
 */
function parseHtmlTable(tableContent, category, jobType) {
  const jobs = [];
  
  // Extract all <tr> rows
  const rowMatches = tableContent.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
  
  let isHeader = true;
  
  for (const rowMatch of rowMatches) {
    const rowContent = rowMatch[1];
    
    // Check if this is header row (contains <th>)
    if (rowContent.includes('<th>') || rowContent.includes('<th ')) {
      isHeader = true;
      continue;
    }
    
    // Skip header row
    if (isHeader) {
      isHeader = false;
      if (!rowContent.includes('<td>') && !rowContent.includes('<td ')) {
        continue;
      }
    }
    
    // Extract <td> cells
    const cellMatches = rowContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi);
    const cells = [];
    for (const cellMatch of cellMatches) {
      cells.push(cellMatch[1].trim());
    }
    
    // Expected columns: Company, Role, Location, Application, Age
    if (cells.length >= 4) {
      const company = extractCompanyFromCell(cells[0]);
      
      // Skip continuation rows (↳ symbol)
      if (!company || company === '↳' || company === '') {
        continue;
      }
      
      const datePosted = cells[4] ? cells[4].replace(/<[^>]*>/g, '').trim() : '';
      const normalizedDate = normalizeDate(datePosted);
      
      const job = {
        id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        company: company,
        role: cells[1] ? cells[1].replace(/<[^>]*>/g, '').trim() : '',
        location: cells[2] ? cells[2].replace(/<[^>]*>/g, '').trim() : '',
        application_link: extractApplicationLink(cells[3]),
        date_posted: datePosted,
        date_normalized: normalizedDate,
        category: category,
        jobType: jobType, // 'internship' or 'fulltime'
        createdAt: new Date()
      };
      
      if (job.company && job.role) {
        jobs.push(job);
      }
    }
  }
  
  return jobs;
}

/**
 * Split markdown content by category sections
 */
function splitByCategories(markdown) {
  const sections = {};
  
  // Split by ## headers
  const parts = markdown.split(/(?=^## )/gm);
  
  for (const part of parts) {
    const headerLine = part.split('\n')[0] || '';
    
    for (const [categoryName, patterns] of Object.entries(CATEGORY_MAPPINGS)) {
      const matchesCategory = patterns.some(pattern => 
        headerLine.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (matchesCategory) {
        sections[categoryName] = part;
        console.log(`  Found category: ${categoryName} (header: "${headerLine.substring(0, 60)}...")`);
        break;
      }
    }
  }
  
  return sections;
}

// ============================================
// MAIN SERVICE FUNCTIONS
// ============================================

/**
 * Fetch and parse jobs from GitHub README
 * @param {string} jobType - 'internship' or 'fulltime'
 */
async function fetchAndParseJobs(jobType = 'internship') {
  const typeLabel = jobType === 'fulltime' ? 'Full-time/New Grad' : 'Internship';
  const sourceUrl = SOURCE_URLS[jobType] || SOURCE_URLS.internship;
  
  console.log(`🔄 Fetching ${typeLabel} listings from GitHub...`);
  console.log(`📡 Source: ${sourceUrl}`);
  
  try {
    const response = await fetch(sourceUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }
    
    const markdown = await response.text();
    console.log(`📄 Fetched ${markdown.length} characters of markdown`);
    
    // Split by categories
    const categorySections = splitByCategories(markdown);
    console.log(`📂 Found ${Object.keys(categorySections).length} category sections`);
    
    // Parse each category
    const allJobs = [];
    
    for (const [category, content] of Object.entries(categorySections)) {
      const jobs = parseHtmlTable(content, category, jobType);
      console.log(`  ✅ ${category}: ${jobs.length} jobs`);
      allJobs.push(...jobs);
    }
    
    console.log(`📊 Total ${typeLabel} jobs parsed: ${allJobs.length}`);
    
    // Store in memory
    storeJobsInMemory(allJobs, jobType);
    
    return allJobs;
    
  } catch (error) {
    console.error(`❌ Error fetching/parsing ${typeLabel} jobs:`, error.message);
    return [];
  }
}

/**
 * Store jobs in memory cache
 * @param {Array} jobs - Jobs array
 * @param {string} jobType - 'internship' or 'fulltime'
 */
function storeJobsInMemory(jobs, jobType = 'internship') {
  jobsCaches[jobType] = jobs;
  cacheTimestamps[jobType] = Date.now();
  console.log(`💾 Stored ${jobs.length} ${jobType} jobs in memory cache`);
}

/**
 * Check if cache is empty or expired
 * @param {string} jobType - 'internship' or 'fulltime'
 */
function isCacheEmpty(jobType = 'internship') {
  const cache = jobsCaches[jobType] || [];
  const timestamp = cacheTimestamps[jobType];
  
  if (cache.length === 0) {
    return true;
  }
  
  // Check if cache is expired
  if (timestamp && (Date.now() - timestamp) > CACHE_TTL_MS) {
    console.log(`⏰ ${jobType} cache expired, will refresh`);
    return true;
  }
  
  return false;
}

/**
 * Get jobs by category with time range filter
 * @param {string} category - Category to filter by
 * @param {string} timeRange - '1d' or '7d'
 * @param {number} limit - Optional limit override
 * @param {string} jobType - 'internship' or 'fulltime'
 */
async function getJobsByCategory(category, timeRange = '7d', limit = null, jobType = 'internship') {
  // Ensure cache is populated for this job type
  if (isCacheEmpty(jobType)) {
    await fetchAndParseJobs(jobType);
  }
  
  let jobs = [...(jobsCaches[jobType] || [])];
  
  // Filter by category
  if (category && category !== 'All') {
    jobs = jobs.filter(job => job.category === category);
  }
  
  // Filter by time range
  const now = new Date();
  if (timeRange === '1d') {
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    jobs = jobs.filter(job => {
      if (!job.date_normalized) return false;
      return job.date_normalized >= twentyFourHoursAgo;
    });
  } else if (timeRange === '7d') {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    jobs = jobs.filter(job => {
      if (!job.date_normalized) return false;
      return job.date_normalized >= sevenDaysAgo;
    });
  }
  
  // Sort by date (most recent first)
  jobs.sort((a, b) => {
    if (!a.date_normalized) return 1;
    if (!b.date_normalized) return -1;
    return b.date_normalized - a.date_normalized;
  });
  
  // Apply limit
  const effectiveLimit = limit || JOB_LIMITS[timeRange] || null;
  if (effectiveLimit) {
    jobs = jobs.slice(0, effectiveLimit);
  }
  
  return jobs;
}

/**
 * Get all available categories
 */
function getCategories() {
  return Object.keys(CATEGORY_MAPPINGS);
}

/**
 * Initialize job data on server startup
 * Only initializes internship data by default
 */
async function initializeJobData() {
  console.log('🚀 Initializing job data (in-memory storage)...');
  
  // Initialize internship data
  if (isCacheEmpty('internship')) {
    console.log('📭 Internship cache is empty, fetching data...');
    await fetchAndParseJobs('internship');
  } else {
    console.log(`✅ Internship cache has ${jobsCaches.internship.length} jobs`);
  }
  
  // Note: Full-time data will be fetched on-demand when user switches to it
}

/**
 * Get cache statistics
 * @param {string} jobType - 'internship' or 'fulltime'
 */
function getCacheStats(jobType = 'internship') {
  const cache = jobsCaches[jobType] || [];
  const timestamp = cacheTimestamps[jobType];
  
  return {
    jobType,
    totalJobs: cache.length,
    cacheTimestamp: timestamp ? new Date(timestamp).toISOString() : null,
    cacheAge: timestamp ? Math.round((Date.now() - timestamp) / 1000 / 60) + ' minutes' : 'N/A',
    byCategory: Object.keys(CATEGORY_MAPPINGS).reduce((acc, cat) => {
      acc[cat] = cache.filter(j => j.category === cat).length;
      return acc;
    }, {})
  };
}

module.exports = {
  fetchAndParseJobs,
  getJobsByCategory,
  getCategories,
  isCacheEmpty,
  initializeJobData,
  getCacheStats,
  JOB_LIMITS,
  SOURCE_URLS
};
