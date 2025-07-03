import { cloudinaryResumeService, ResumeData } from './cloudinaryResumeService';
import { fallbackResumeService } from './fallbackResumeService';
import logger from '../utils/logger';

export const unifiedResumeService = {
  /**
   * Upload resume with automatic fallback from Cloudinary to Firebase Storage
   */
  async uploadResume(file: File): Promise<ResumeData> {
    try {
      // First, try Cloudinary upload
      logger.log('resume', 'Attempting Cloudinary upload first...');
      return await cloudinaryResumeService.uploadResume(file);
    } catch (cloudinaryError) {
      logger.warn('resume', 'Cloudinary upload failed, trying Firebase Storage fallback:', cloudinaryError);
      
      // Check if the error is due to untrusted account or other Cloudinary restrictions
      const errorMessage = cloudinaryError instanceof Error ? cloudinaryError.message : String(cloudinaryError);
      
      if (errorMessage.includes('untrusted') || 
          errorMessage.includes('Upload preset') ||
          errorMessage.includes('access control') ||
          errorMessage.includes('configuration')) {
        
        logger.log('resume', 'Using Firebase Storage as fallback due to Cloudinary restrictions');
        
        try {
          return await fallbackResumeService.uploadResume(file);
        } catch (fallbackError) {
          logger.error('resume', 'Both Cloudinary and Firebase Storage uploads failed');
          
          // Throw a comprehensive error message
          throw new Error(
            `Resume upload failed with both services:\n` +
            `Cloudinary: ${errorMessage}\n` +
            `Firebase Storage: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}\n\n` +
            `Please contact support for assistance.`
          );
        }
      } else {
        // For other types of errors, don't use fallback
        throw cloudinaryError;
      }
    }
  },

  /**
   * Get the current resume data (works with both storage types)
   */
  async getCurrentResume(): Promise<ResumeData | null> {
    try {
      // Try Cloudinary service first (it checks the same Firebase Database location)
      return await cloudinaryResumeService.getCurrentResume();
    } catch (error) {
      // Fallback to the fallback service
      logger.warn('resume', 'Using fallback service for getCurrentResume');
      return await fallbackResumeService.getCurrentResume();
    }
  },

  /**
   * Delete the current resume (handles both storage types)
   */
  async deleteResume(): Promise<void> {
    try {
      const currentResume = await this.getCurrentResume();
      
      if (!currentResume) {
        throw new Error('No resume found to delete');
      }

      // Use the appropriate service based on storage type
      if (currentResume.storageType === 'firebase') {
        return await fallbackResumeService.deleteResume();
      } else {
        // Default to Cloudinary service for legacy data or Cloudinary storage
        return await cloudinaryResumeService.deleteResume();
      }
    } catch (error) {
      logger.error('resume', 'Error in unified delete resume:', error);
      throw error;
    }
  },

  /**
   * Check if resume exists and is accessible
   */
  async isResumeAvailable(): Promise<boolean> {
    try {
      const resume = await this.getCurrentResume();
      return !!resume;
    } catch (error) {
      logger.error('resume', 'Error checking resume availability:', error);
      return false;
    }
  },

  /**
   * Get resume download URL for public access
   */
  async getResumeDownloadUrl(): Promise<string | null> {
    try {
      const resume = await this.getCurrentResume();
      return resume ? resume.fileUrl : null;
    } catch (error) {
      logger.error('resume', 'Error getting resume download URL:', error);
      return null;
    }
  },

  /**
   * Generate a direct download URL (works with both storage types)
   */
  getDirectDownloadUrl(fileUrl: string, fileName: string): string {
    // For Firebase Storage URLs, they're already direct download URLs
    if (fileUrl.includes('firebasestorage.googleapis.com')) {
      return fileUrl;
    }
    
    // For Cloudinary URLs, try the service method but with fallback
    if (fileUrl.includes('cloudinary.com')) {
      try {
        return cloudinaryResumeService.getDirectDownloadUrl(fileUrl, fileName);
      } catch (error) {
        logger.warn('resume', 'Failed to generate download URL, using original:', error);
        // If transformation fails, just return the original URL
        return fileUrl;
      }
    }
    
    // Fallback: return original URL
    return fileUrl;
  },

  /**
   * Get a simple download URL that works reliably
   */
  getSimpleDownloadUrl(fileUrl: string): string {
    // For Cloudinary, we can try a different approach
    if (fileUrl.includes('cloudinary.com')) {
      try {
        // First, try to just return the original URL if it's already a raw URL
        if (fileUrl.includes('/raw/upload/')) {
          logger.log('resume', 'URL is already raw format, returning as-is');
          return fileUrl;
        }
        
        // Convert from image/auto upload to raw upload
        const rawUrl = fileUrl.replace(/\/(image|auto|video)\/upload\//, '/raw/upload/');
        
        // If the conversion was successful, return the raw URL
        if (rawUrl !== fileUrl) {
          logger.log('resume', 'Converted to raw URL:', rawUrl);
          return rawUrl;
        }
        
        // Fallback: add download parameter
        const url = new URL(fileUrl);
        url.searchParams.set('fl_attachment', '1');
        return url.toString();
      } catch (error) {
        logger.warn('resume', 'Failed to create simple download URL:', error);
        return fileUrl;
      }
    }
    
    return fileUrl;
  },

  /**
   * Get the best available download URL with multiple fallbacks
   */
  getBestDownloadUrl(fileUrl: string, fileName: string): string {
    try {
      // Priority 1: If it's already a raw URL, use it
      if (fileUrl.includes('/raw/upload/')) {
        return fileUrl;
      }
      
      // Priority 2: Try to convert to raw URL
      if (fileUrl.includes('cloudinary.com')) {
        const rawUrl = fileUrl.replace(/\/(image|auto|video)\/upload\//, '/raw/upload/');
        if (rawUrl !== fileUrl) {
          return rawUrl;
        }
      }
      
      // Priority 3: Try the direct download transformation
      const directUrl = this.getDirectDownloadUrl(fileUrl, fileName);
      if (directUrl !== fileUrl) {
        return directUrl;
      }
      
      // Priority 4: Original URL with download parameter
      const url = new URL(fileUrl);
      url.searchParams.set('download', '1');
      return url.toString();
      
    } catch (error) {
      logger.error('resume', 'Failed to generate best download URL:', error);
      return fileUrl;
    }
  },

  /**
   * Test if a download URL is accessible and working
   */
  async testDownloadUrl(url: string): Promise<{ success: boolean; error?: string }> {
    return await cloudinaryResumeService.testDownloadUrl(url);
  }
};

// Export the unified service as the default resume service
export { unifiedResumeService as resumeService };
export type { ResumeData };
