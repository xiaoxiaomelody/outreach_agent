/**
 * ResumeUpload Component
 * 
 * A comprehensive resume upload component with:
 * - Drag-and-drop support
 * - Client-side validation (type, size, page count)
 * - Server-side validation integration
 * - Progress indication
 * - Error display
 * - Parsed data display and editing
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { auth } from '../../config/firebase';
import './ResumeUpload.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

// Validation constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PAGES = 2;
const ALLOWED_TYPES = ['application/pdf'];

/**
 * Error types for different validation stages
 */
const ERROR_TYPES = {
  FILE_TYPE: 'file_type',
  FILE_SIZE: 'file_size',
  PAGE_COUNT: 'page_count',
  SERVER_VALIDATION: 'server_validation',
  SERVER_ERROR: 'server_error',
  NETWORK: 'network',
};

const ResumeUpload = ({ onUploadSuccess, initialData }) => {
  // State
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState('idle'); // idle | validating | uploading | success | error
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [parsedData, setParsedData] = useState(initialData || null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(null);

  const fileInputRef = useRef(null);
  const pdfjsRef = useRef(null);
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);

  // Dynamically load PDF.js on mount
  useEffect(() => {
    const loadPdfJs = async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        // Try to configure worker
        try {
          pdfjs.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.min.mjs',
            import.meta.url
          ).toString();
        } catch (workerErr) {
          console.warn('PDF.js worker configuration failed:', workerErr.message);
        }
        pdfjsRef.current = pdfjs;
        setPdfjsLoaded(true);
        console.log('✅ PDF.js loaded successfully');
      } catch (err) {
        console.warn('⚠️ PDF.js not available, page count validation disabled:', err.message);
        pdfjsRef.current = null;
        setPdfjsLoaded(false);
      }
    };

    loadPdfJs();
  }, []);

  /**
   * Reset state for new upload
   */
  const resetState = useCallback(() => {
    setFile(null);
    setUploadState('idle');
    setProgress(0);
    setError(null);
  }, []);

  /**
   * Client-side validation - First line of defense
   */
  const validateClientSide = useCallback(async (selectedFile) => {
    // 1. File type validation
    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      return {
        valid: false,
        errorType: ERROR_TYPES.FILE_TYPE,
        message: `Invalid file type: ${selectedFile.type || 'unknown'}. Only PDF files are allowed.`,
      };
    }

    // 2. File size validation
    if (selectedFile.size > MAX_FILE_SIZE) {
      const sizeMB = (selectedFile.size / (1024 * 1024)).toFixed(2);
      return {
        valid: false,
        errorType: ERROR_TYPES.FILE_SIZE,
        message: `File too large (${sizeMB}MB). Maximum size is 5MB.`,
      };
    }

    // 3. Page count validation using PDF.js (if available)
    setProgress(20);
    
    const pdfjs = pdfjsRef.current;
    if (pdfjs) {
      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        
        if (pdf.numPages > MAX_PAGES) {
          return {
            valid: false,
            errorType: ERROR_TYPES.PAGE_COUNT,
            message: `Resume cannot exceed ${MAX_PAGES} pages (yours has ${pdf.numPages}). Please condense your content.`,
          };
        }

        setProgress(40);
        return { valid: true, pageCount: pdf.numPages };
      } catch (err) {
        console.error('PDF parsing error:', err);
        // If PDF.js fails, continue without page count validation
        // The server will do more thorough validation
        console.warn('Skipping page count validation due to PDF.js error');
        setProgress(40);
        return { valid: true, pageCount: null };
      }
    } else {
      // PDF.js not available, skip page count validation
      // Server will validate content
      console.log('PDF.js not available, skipping page count validation');
      setProgress(40);
      return { valid: true, pageCount: null };
    }
  }, []);

  /**
   * Server-side upload - Second line of defense
   */
  const uploadToServer = useCallback(async (selectedFile) => {
    setProgress(50);
    
    try {
      // Get auth token
      const user = auth.currentUser;
      const headers = {};
      if (user) {
        const idToken = await user.getIdToken();
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      // Create FormData
      const formData = new FormData();
      formData.append('resume', selectedFile);

      setProgress(60);

      // Make request
      const response = await fetch(`${BACKEND_URL}/api/resume/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });

      setProgress(80);

      const result = await response.json();

      if (!response.ok) {
        // Handle specific error codes
        if (response.status === 400) {
          return {
            success: false,
            errorType: ERROR_TYPES.SERVER_VALIDATION,
            message: result.error || 'Invalid document content',
            details: result.details,
          };
        } else if (response.status === 415) {
          return {
            success: false,
            errorType: ERROR_TYPES.FILE_TYPE,
            message: result.error || 'Unsupported file type',
          };
        } else if (response.status === 413) {
          return {
            success: false,
            errorType: ERROR_TYPES.FILE_SIZE,
            message: result.error || 'File too large',
          };
        } else {
          return {
            success: false,
            errorType: ERROR_TYPES.SERVER_ERROR,
            message: 'Processing failed, please try again.',
          };
        }
      }

      setProgress(100);
      return { success: true, data: result };
    } catch (err) {
      console.error('Upload error:', err);
      return {
        success: false,
        errorType: ERROR_TYPES.NETWORK,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }, []);

  /**
   * Handle file selection (from input or drop)
   */
  const handleFile = useCallback(async (selectedFile) => {
    resetState();
    setFile(selectedFile);
    setUploadState('validating');
    setError(null);

    // Client-side validation
    const clientValidation = await validateClientSide(selectedFile);
    
    if (!clientValidation.valid) {
      setError({
        type: clientValidation.errorType,
        message: clientValidation.message,
      });
      setUploadState('error');
      return;
    }

    // Server-side upload
    setUploadState('uploading');
    const serverResult = await uploadToServer(selectedFile);

    if (!serverResult.success) {
      setError({
        type: serverResult.errorType,
        message: serverResult.message,
        details: serverResult.details,
      });
      setUploadState('error');
      return;
    }

    // Success
    setUploadState('success');
    setParsedData(serverResult.data.data);
    
    if (onUploadSuccess) {
      onUploadSuccess(serverResult.data);
    }
  }, [resetState, validateClientSide, uploadToServer, onUploadSuccess]);

  /**
   * File input change handler
   */
  const handleInputChange = useCallback((e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
    // Reset input value to allow selecting same file again
    e.target.value = '';
  }, [handleFile]);

  /**
   * Drag and drop handlers
   */
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFile(droppedFile);
    }
  }, [handleFile]);

  /**
   * Click to select file
   */
  const handleClick = useCallback(() => {
    if (uploadState !== 'validating' && uploadState !== 'uploading') {
      fileInputRef.current?.click();
    }
  }, [uploadState]);

  /**
   * Remove uploaded file
   */
  const handleRemove = useCallback((e) => {
    e.stopPropagation();
    resetState();
    setParsedData(null);
    setIsEditing(false);
    setEditedData(null);
  }, [resetState]);

  /**
   * Edit mode handlers
   */
  const handleStartEdit = useCallback(() => {
    setEditedData({ ...parsedData });
    setIsEditing(true);
  }, [parsedData]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditedData(null);
  }, []);

  const handleSaveEdit = useCallback(() => {
    setParsedData(editedData);
    setIsEditing(false);
    setEditedData(null);
    // TODO: Optionally sync to backend
  }, [editedData]);

  const handleEditChange = useCallback((field, value) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  }, []);

  /**
   * Get error icon based on type
   */
  const getErrorIcon = (errorType) => {
    switch (errorType) {
      case ERROR_TYPES.FILE_TYPE:
        return '📄';
      case ERROR_TYPES.FILE_SIZE:
        return '📦';
      case ERROR_TYPES.PAGE_COUNT:
        return '📑';
      case ERROR_TYPES.SERVER_VALIDATION:
        return '🔍';
      case ERROR_TYPES.SERVER_ERROR:
        return '⚠️';
      case ERROR_TYPES.NETWORK:
        return '🌐';
      default:
        return '❌';
    }
  };

  /**
   * Render upload zone
   */
  const renderUploadZone = () => (
    <div
      className={`resume-upload-zone ${isDragging ? 'dragging' : ''} ${uploadState}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label="Upload resume"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleInputChange}
        className="resume-upload-input"
        aria-hidden="true"
      />

      {uploadState === 'idle' && !parsedData && (
        <div className="upload-content">
          <div className="upload-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M32 32L24 24M24 24L16 32M24 24V42" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M40.78 36.78C42.73 35.72 44.27 34.03 45.16 32C46.05 29.96 46.23 27.69 45.68 25.53C45.14 23.38 43.89 21.47 42.13 20.11C40.38 18.74 38.22 18 36 18H33.48C32.87 15.66 31.75 13.48 30.18 11.64C28.61 9.8 26.65 8.34 24.44 7.36C22.22 6.39 19.82 5.93 17.4 6.02C14.98 6.1 12.62 6.74 10.48 7.88C8.35 9.01 6.5 10.61 5.07 12.57C3.64 14.52 2.68 16.77 2.25 19.15C1.81 21.53 1.93 23.98 2.58 26.31C3.23 28.64 4.4 30.79 6 32.6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="upload-text">
            <span className="upload-primary">Drag & drop your resume here</span>
            <span className="upload-secondary">or click to select a file</span>
          </div>
          <div className="upload-hints">
            <span>PDF only</span>
            <span>•</span>
            <span>Max 5MB</span>
            <span>•</span>
            <span>Max 2 pages</span>
          </div>
        </div>
      )}

      {(uploadState === 'validating' || uploadState === 'uploading') && (
        <div className="upload-progress">
          <div className="progress-spinner"></div>
          <div className="progress-text">
            {uploadState === 'validating' ? 'Validating document...' : 'Uploading and parsing...'}
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="progress-percent">{progress}%</div>
        </div>
      )}
    </div>
  );

  /**
   * Render error message
   */
  const renderError = () => {
    if (!error) return null;

    return (
      <div className={`resume-error ${error.type}`}>
        <div className="error-icon">{getErrorIcon(error.type)}</div>
        <div className="error-content">
          <div className="error-message">{error.message}</div>
          {error.details && (
            <div className="error-details">
              {typeof error.details === 'object' 
                ? JSON.stringify(error.details) 
                : error.details}
            </div>
          )}
        </div>
        <button className="error-dismiss" onClick={resetState} aria-label="Dismiss error">
          ×
        </button>
      </div>
    );
  };

  /**
   * Render parsed data display
   */
  const renderParsedData = () => {
    if (!parsedData || uploadState === 'error') return null;

    const data = isEditing ? editedData : parsedData;

    return (
      <div className="resume-parsed-data">
        <div className="parsed-header">
          <div className="parsed-file-info">
            <span className="file-icon">📄</span>
            <span className="file-name">{file?.name || 'Resume'}</span>
            {uploadState === 'success' && <span className="success-badge">✓ Validated</span>}
          </div>
          <div className="parsed-actions">
            {!isEditing ? (
              <>
                <button className="btn-edit" onClick={handleStartEdit}>Edit</button>
                <button className="btn-remove" onClick={handleRemove}>Remove</button>
              </>
            ) : (
              <>
                <button className="btn-save" onClick={handleSaveEdit}>Save</button>
                <button className="btn-cancel" onClick={handleCancelEdit}>Cancel</button>
              </>
            )}
          </div>
        </div>

        <div className="parsed-content">
          <div className="parsed-field">
            <label>Name</label>
            {isEditing ? (
              <input
                type="text"
                value={data.fullName || ''}
                onChange={(e) => handleEditChange('fullName', e.target.value)}
              />
            ) : (
              <span>{data.fullName || 'Not detected'}</span>
            )}
          </div>

          <div className="parsed-field">
            <label>Current Role</label>
            {isEditing ? (
              <input
                type="text"
                value={data.currentRole || ''}
                onChange={(e) => handleEditChange('currentRole', e.target.value)}
              />
            ) : (
              <span>{data.currentRole || 'Not detected'}</span>
            )}
          </div>

          <div className="parsed-field">
            <label>Years of Experience</label>
            {isEditing ? (
              <input
                type="number"
                value={data.yearsOfExperience || 0}
                onChange={(e) => handleEditChange('yearsOfExperience', parseInt(e.target.value) || 0)}
              />
            ) : (
              <span>{data.yearsOfExperience || 0} years</span>
            )}
          </div>

          <div className="parsed-field full-width">
            <label>Key Skills ({data.skillCount || (Array.isArray(data.skills) ? data.skills.length : 0)})</label>
            {isEditing ? (
              <textarea
                value={Array.isArray(data.skills) ? data.skills.join(', ') : ''}
                onChange={(e) => handleEditChange('skills', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="React, TypeScript, Node.js..."
              />
            ) : (
              <div className="skills-list">
                {(Array.isArray(data.skills) ? data.skills : []).slice(0, 10).map((skill, i) => (
                  <span key={i} className="skill-tag">{skill}</span>
                ))}
                {Array.isArray(data.skills) && data.skills.length > 10 && (
                  <span className="skill-more">+{data.skills.length - 10} more</span>
                )}
              </div>
            )}
          </div>

          {data.summary && (
            <div className="parsed-field full-width">
              <label>Summary</label>
              {isEditing ? (
                <textarea
                  value={data.summary || ''}
                  onChange={(e) => handleEditChange('summary', e.target.value)}
                  rows={3}
                />
              ) : (
                <p className="summary-text">{data.summary}</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="resume-upload-container">
      {!parsedData && renderUploadZone()}
      {renderError()}
      {renderParsedData()}
    </div>
  );
};

export default ResumeUpload;

