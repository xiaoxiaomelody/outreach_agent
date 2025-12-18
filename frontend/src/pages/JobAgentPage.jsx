import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/layout/NavBar';
import JobCard from '../components/jobs/JobCard';
import { getCurrentUser } from '../config/authUtils';
import { api } from '../api/backend';
import './JobAgentPage.css';

// Job type options
const JOB_TYPES = [
  { id: 'internship', label: 'Internship', description: 'Summer 2026 Internships' },
  { id: 'fulltime', label: 'Full-time', description: '2026 New Grad Positions' },
];

// Category options for dropdown
const CATEGORIES = [
  { id: 'Software Engineering', label: 'Software Engineering', icon: '💻' },
  { id: 'Product Management', label: 'Product Management', icon: '🛒' },
  { id: 'Data Science', label: 'Data Science / AI', icon: '📊' },
  { id: 'Quantitative Finance', label: 'Quantitative Finance', icon: '💸' },
  { id: 'Hardware Engineering', label: 'Hardware Engineering', icon: '⚙️' },
];

// Time range options for segmented control (no "All Time" - only recent jobs)
const TIME_RANGES = [
  { id: '7d', label: 'Recent 7 Days', maxJobs: 12 },
  { id: '1d', label: 'Recent 24 Hours', maxJobs: 6 },
];

/**
 * JobAgentPage Component
 * Search-driven interface for browsing summer 2026 internship listings
 */
const JobAgentPage = () => {
  const [user, setUser] = useState(null);
  const [selectedJobType, setSelectedJobType] = useState('internship');
  const [selectedCategory, setSelectedCategory] = useState('Software Engineering');
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const navigate = useNavigate();

  // Check authentication
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    } else {
      navigate('/');
    }
  }, [navigate]);

  // Handle search button click
  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    
    try {
      const response = await api.getJobs(selectedCategory, selectedTimeRange, selectedJobType);
      if (response.success) {
        setJobs(response.jobs || []);
      } else {
        setError('Failed to load jobs');
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError(err.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  // Get selected category display info
  const getSelectedCategoryInfo = () => {
    return CATEGORIES.find(c => c.id === selectedCategory) || CATEGORIES[0];
  };

  // Get selected job type info
  const getSelectedJobTypeInfo = () => {
    return JOB_TYPES.find(t => t.id === selectedJobType) || JOB_TYPES[0];
  };

  // Get job type label for display
  const getJobTypeLabel = () => {
    return selectedJobType === 'fulltime' ? 'Position' : 'Internship';
  };

  if (!user) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="job-agent-page">
      <NavBar />
      
      <div className="job-agent-content">
        {/* Header */}
        <div className="job-agent-header">
          <div className="header-text">
            <h1>Job Search Agent</h1>
            <p className="header-subtitle">
              {getSelectedJobTypeInfo().description}
            </p>
          </div>
        </div>

        {/* Search Filter Card */}
        <div className="search-filter-card">
          {/* Job Type Toggle */}
          <div className="job-type-toggle">
            {JOB_TYPES.map((type) => (
              <button
                key={type.id}
                className={`job-type-btn ${selectedJobType === type.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedJobType(type.id);
                  setHasSearched(false); // Reset search state when switching type
                  setJobs([]);
                }}
              >
                <span className="job-type-icon">
                  {type.id === 'internship' ? '🎓' : '💼'}
                </span>
                <span className="job-type-label">{type.label}</span>
              </button>
            ))}
          </div>

          <div className="filter-section">
            {/* Category Selector */}
            <div className="filter-group">
              <label className="filter-label">
                <span className="label-icon">🏢</span>
                Category
              </label>
              <div className="select-wrapper">
                <select
                  className="category-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
                <span className="select-arrow">▼</span>
              </div>
            </div>

            {/* Time Range Selector */}
            <div className="filter-group">
              <label className="filter-label">
                <span className="label-icon">📅</span>
                Posted Within
              </label>
              <div className="time-range-selector">
                {TIME_RANGES.map((range) => (
                  <button
                    key={range.id}
                    className={`time-range-btn ${selectedTimeRange === range.id ? 'active' : ''}`}
                    onClick={() => setSelectedTimeRange(range.id)}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Search Button */}
          <button
            className={`search-btn ${loading ? 'loading' : ''}`}
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="btn-spinner"></span>
                Searching...
              </>
            ) : (
              <>
                <span className="btn-icon">🔍</span>
                Search Your Job
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        <div className="jobs-section">
          {!hasSearched ? (
            // Initial state - no search yet
            <div className="jobs-initial">
              <div className="initial-icon">{selectedJobType === 'fulltime' ? '💼' : '🎯'}</div>
              <h3>Start Your Job Search</h3>
              <p>
                {selectedJobType === 'fulltime' 
                  ? 'Find 2026 new grad positions by selecting filters and clicking "Search Your Job".'
                  : 'Select a category and time range, then click "Search Your Job" to find internships.'}
              </p>
            </div>
          ) : loading ? (
            // Loading state
            <div className="jobs-loading">
              <div className="loading-spinner"></div>
              <p>Searching for {getSelectedCategoryInfo().label} {getJobTypeLabel().toLowerCase()}s...</p>
            </div>
          ) : error ? (
            // Error state
            <div className="jobs-error">
              <div className="error-icon">⚠️</div>
              <h3>Unable to load jobs</h3>
              <p>{error}</p>
              <button className="retry-btn" onClick={handleSearch}>
                Try Again
              </button>
            </div>
          ) : jobs.length === 0 ? (
            // Empty results
            <div className="jobs-empty">
              <div className="empty-icon">{selectedTimeRange === '1d' ? '⏰' : '📭'}</div>
              <h3>
                {selectedTimeRange === '1d' 
                  ? 'No Jobs Published in Recent 24 Hours' 
                  : 'No Jobs Found'}
              </h3>
              <p>
                {selectedTimeRange === '1d' 
                  ? `There are no ${getSelectedCategoryInfo().label} ${getJobTypeLabel().toLowerCase()}s posted in the last 24 hours.`
                  : `No ${getSelectedCategoryInfo().label} ${getJobTypeLabel().toLowerCase()}s found in the last 7 days.`}
              </p>
              <p className="empty-suggestion">
                {selectedTimeRange === '1d' 
                  ? 'Try searching in "Recent 7 Days" to see more listings.'
                  : 'Try selecting a different category.'}
              </p>
            </div>
          ) : (
            // Results
            <>
              <div className="jobs-header">
                <h2>
                  <span className="result-icon">{getSelectedCategoryInfo().icon}</span>
                  {jobs.length} {getSelectedCategoryInfo().label} {getJobTypeLabel()}{jobs.length !== 1 ? 's' : ''}
                </h2>
                <span className="result-filter-info">
                  {selectedTimeRange === '1d' ? 'Last 24 Hours' : 'Last 7 Days'}
                  <span className="result-max-hint">
                    (max {selectedTimeRange === '1d' ? '6' : '12'})
                  </span>
                </span>
              </div>
              <div className="jobs-grid">
                {jobs.map((job, index) => (
                  <JobCard key={job.id || index} job={job} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobAgentPage;
