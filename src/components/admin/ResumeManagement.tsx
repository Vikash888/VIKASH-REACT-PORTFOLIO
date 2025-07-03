import React, { useState, useEffect, useRef } from 'react';
import { Upload, Download, Trash2, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { unifiedResumeService as resumeService, ResumeData } from '../../services/unifiedResumeService';
import logger from '../../utils/logger';

const ResumeManagement: React.FC = () => {
  const [currentResume, setCurrentResume] = useState<ResumeData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load current resume on component mount
  useEffect(() => {
    loadCurrentResume();
  }, []);

  const loadCurrentResume = async () => {
    try {
      setLoading(true);
      const resume = await resumeService.getCurrentResume();
      setCurrentResume(resume);
      
      // Process download URL like Hero component does
      if (resume) {
        const url = resume.fileUrl;
        const fileName = resume.fileName || 'resume';
        
        // Try multiple download URL strategies (same as Hero component)
        let processedUrl;
        try {
          processedUrl = resumeService.getBestDownloadUrl(url, fileName);
        } catch (error) {
          logger.warn('resume-management', 'Failed to generate best download URL, using simple method:', error);
          try {
            processedUrl = resumeService.getSimpleDownloadUrl(url);
          } catch (simpleError) {
            logger.warn('resume-management', 'Simple download URL also failed, using original:', simpleError);
            processedUrl = url;
          }
        }
        
        setDownloadUrl(processedUrl);
        
        // Debug logging (same as Hero component)
        logger.log('resume-management', 'Resume download setup:', {
          originalUrl: url,
          fileName: fileName,
          processedUrl: processedUrl,
          resumeData: {
            id: resume.id,
            fileName: resume.fileName,
            storageType: resume.storageType,
            version: resume.version
          }
        });
      } else {
        setDownloadUrl(null);
      }
    } catch (error) {
      logger.error('resume-management', 'Error loading resume:', error);
      showMessage('error', 'Failed to load current resume');
      setDownloadUrl(null);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleUpload = async (file: File) => {
    // Validate file type
    if (file.type !== 'application/pdf') {
      showMessage('error', 'Please select a PDF file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showMessage('error', 'File size must be less than 10MB');
      return;
    }

    try {
      setUploading(true);
      showMessage('info', 'Uploading resume...');

      const newResume = await resumeService.uploadResume(file);
      setCurrentResume(newResume);
      
      // Process download URL for the new resume (same as loadCurrentResume)
      const url = newResume.fileUrl;
      const fileName = newResume.fileName || 'resume';
      
      let processedUrl;
      try {
        processedUrl = resumeService.getBestDownloadUrl(url, fileName);
      } catch (error) {
        logger.warn('resume-management', 'Failed to generate best download URL for new resume, using simple method:', error);
        try {
          processedUrl = resumeService.getSimpleDownloadUrl(url);
        } catch (simpleError) {
          logger.warn('resume-management', 'Simple download URL also failed for new resume, using original:', simpleError);
          processedUrl = url;
        }
      }
      
      setDownloadUrl(processedUrl);
      
      showMessage('success', `Resume uploaded successfully${newResume.storageType === 'firebase' ? ' to Firebase Storage' : ' to Cloudinary'}!`);
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      logger.error('resume-management', 'Error uploading resume:', error);
      
      // Provide specific error messages
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showMessage('error', errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentResume) return;
    
    if (!confirm('Are you sure you want to delete the current resume? This action cannot be undone.')) {
      return;
    }

    try {
      await resumeService.deleteResume();
      setCurrentResume(null);
      setDownloadUrl(null);
      showMessage('success', 'Resume deleted successfully');
    } catch (error) {
      logger.error('resume-management', 'Error deleting resume:', error);
      showMessage('error', 'Failed to delete resume');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600 dark:text-gray-300">Loading resume information...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <FileText className="w-6 h-6 mr-2" />
          Resume Management
        </h2>
        <p className="text-blue-100 mt-1">Manage your resume file for portfolio downloads</p>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-4 border-l-4 ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-400 text-green-700 dark:bg-green-900/20 dark:text-green-300' 
            : message.type === 'error'
            ? 'bg-red-50 border-red-400 text-red-700 dark:bg-red-900/20 dark:text-red-300'
            : 'bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' && <CheckCircle className="w-4 h-4 mr-2" />}
            {message.type === 'error' && <AlertCircle className="w-4 h-4 mr-2" />}
            {message.type === 'info' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        </div>
      )}

      <div className="p-6">
        {/* Current Resume Display */}
        {currentResume ? (
          <div className="mb-8">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg mr-4">
                    <FileText className="w-8 h-8 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Current Resume
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Version {currentResume.version}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <a
                    href={downloadUrl || currentResume.fileUrl}
                    download={currentResume.fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      // Log download attempt for debugging (same as Hero component)
                      logger.log('resume-management', 'Resume download initiated:', { 
                        url: downloadUrl || currentResume.fileUrl,
                        fileName: currentResume.fileName,
                        storageType: currentResume.storageType
                      });
                      
                      // Test if the URL is accessible (same as Hero component)
                      const urlToTest = downloadUrl || currentResume.fileUrl;
                      if (!urlToTest.includes('cloudinary.com') && !urlToTest.includes('firebasestorage.googleapis.com')) {
                        logger.warn('resume-management', 'Download URL does not appear to be from a known CDN:', urlToTest);
                      }
                      
                      // Add error handling for failed downloads (same as Hero component)
                      setTimeout(() => {
                        const testUrl = async () => {
                          try {
                            const response = await fetch(urlToTest, { method: 'HEAD' });
                            if (!response.ok) {
                              logger.error('resume-management', 'Download URL returned error:', response.status);
                              // Try to get the raw URL instead
                              const resumeData = await resumeService.getCurrentResume();
                              if (resumeData) {
                                logger.log('resume-management', 'Attempting fallback download with raw URL');
                                window.open(resumeData.fileUrl, '_blank');
                              }
                            }
                          } catch (error) {
                            logger.error('resume-management', 'Failed to test download URL:', error);
                          }
                        };
                        testUrl();
                      }, 1000);
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center text-sm transition-colors no-underline"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </a>
                  <button
                    onClick={handleDelete}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center text-sm transition-colors"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">File Name:</span>
                  <p className="text-gray-600 dark:text-gray-400 mt-1 break-all">{currentResume.fileName}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">File Size:</span>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">{formatFileSize(currentResume.fileSize)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Uploaded:</span>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">{formatDate(currentResume.uploadedAt)}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center">
                <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
                    No Resume Uploaded
                  </h3>
                  <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
                    Upload a resume file to make it available for download on your portfolio
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="relative">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors duration-300">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            
            <div className="flex flex-col items-center">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full mb-4">
                <Upload className="w-8 h-8 text-blue-500" />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {currentResume ? 'Upload New Resume' : 'Upload Resume'}
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md">
                {currentResume 
                  ? 'Replace the current resume with a new version. The old version will be replaced.'
                  : 'Upload your resume PDF file. It will be stored securely and made available for download.'
                }
              </p>
                 <div className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              <p>• PDF files only</p>
              <p>• Maximum file size: 10MB</p>
              <p>• File will be uploaded to Cloudinary CDN</p>
              <p>• Automatic direct download for visitors</p>
            </div>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-6 py-3 rounded-lg flex items-center transition-colors font-medium disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Choose PDF File
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Upload Progress Indicator */}
          {uploading && (
            <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  Uploading resume to Cloudinary...
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  This may take a few moments
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Info Section */}
      </div>
    </div>
  );
};

export default ResumeManagement;
