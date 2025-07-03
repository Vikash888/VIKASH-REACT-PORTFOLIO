import { ref, set, get, remove } from 'firebase/database';
import { database } from '../config/firebase';
import logger from '../utils/logger';

export interface ResumeData {
  id: string;
  fileName: string;
  fileUrl: string;
  publicId: string;
  uploadedAt: string;
  fileSize: number;
  version: number;
  storageType?: 'firebase' | 'cloudinary'; // Optional for backward compatibility
}

export const cloudinaryResumeService = {
  /**
   * Upload a new resume file to Cloudinary only (no Firebase Storage)
   */
  async uploadResume(file: File): Promise<ResumeData> {
    try {
      if (!database) {
        throw new Error('Firebase database is not initialized');
      }

      logger.log('resume', 'Starting resume upload to Cloudinary:', { fileName: file.name, size: file.size });

      // Check if we have the required Cloudinary configuration
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        throw new Error('Cloudinary configuration is missing. Please check your environment variables.');
      }

      // Create a unique public ID for the resume
      const timestamp = Date.now();
      const publicId = `portfolio/resume/resume_${timestamp}`;

      // Validate file type before upload
      if (file.type !== 'application/pdf') {
        throw new Error(`Invalid file type: ${file.type}. Only PDF files are allowed.`);
      }

      // Upload to Cloudinary using raw upload for PDF files
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append('public_id', publicId);
      formData.append('resource_type', 'raw'); // Explicitly set resource type to raw for PDFs

      logger.log('resume', 'Attempting raw upload to Cloudinary:', {
        cloudName,
        uploadPreset,
        publicId,
        fileType: file.type,
        fileName: file.name
      });

      // Always use the raw endpoint for PDF files
      let response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      // If raw upload fails due to preset restrictions, try auto endpoint as fallback
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('resume', 'Raw upload failed:', errorData);
        
        if (errorData.error?.code === 'show_original_customer_untrusted' ||
            errorData.error?.message?.includes('untrusted')) {
          logger.log('resume', 'Account marked as untrusted, attempting signed upload...');
          return await this.uploadResumeWithSignature(file);
        }
        
        // Check for upload preset issues
        if (errorData.error?.message?.includes('Upload preset') ||
            errorData.error?.message?.includes('Invalid upload preset') ||
            errorData.error?.message?.includes('access control')) {
          throw new Error(
            `Upload preset '${uploadPreset}' doesn't support raw file uploads. ` +
            `Please configure your Cloudinary upload preset to allow 'Raw' resource type or set it to 'Auto'.`
          );
        }
        
        // Try auto endpoint as fallback for misconfigured preset
        logger.warn('resume', 'Raw upload failed, trying auto endpoint as fallback...');
        
        // Create new formData for auto upload (without resource_type)
        const autoFormData = new FormData();
        autoFormData.append('file', file);
        autoFormData.append('upload_preset', uploadPreset);
        autoFormData.append('public_id', publicId);
        
        response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
          {
            method: 'POST',
            body: autoFormData,
          }
        );
        
        if (!response.ok) {
          const fallbackError = await response.json().catch(() => ({}));
          logger.error('resume', 'Auto upload also failed:', fallbackError);
          throw new Error(
            `Both raw and auto uploads failed. Error: ${fallbackError.error?.message || 'Unknown error'}. ` +
            `Please check your Cloudinary upload preset configuration.`
          );
        }
        
        logger.log('resume', 'Auto upload succeeded as fallback');
      } else {
        logger.log('resume', 'Raw upload succeeded');
      }

      const uploadResult = await response.json();
      
      logger.log('resume', 'Upload response received:', {
        secure_url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        resource_type: uploadResult.resource_type,
        format: uploadResult.format,
        bytes: uploadResult.bytes
      });

      // Validate that the upload result is a PDF
      if (uploadResult.resource_type !== 'raw' && uploadResult.format !== 'pdf') {
        logger.warn('resume', 'Warning: File was not uploaded as raw PDF:', {
          resource_type: uploadResult.resource_type,
          format: uploadResult.format
        });
      }

      // Get current resume version
      const currentResume = await this.getCurrentResume();
      const version = currentResume ? currentResume.version + 1 : 1;

      // Create resume metadata
      const resumeData: ResumeData = {
        id: `resume_${timestamp}`,
        fileName: file.name,
        fileUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        uploadedAt: new Date().toISOString(),
        fileSize: file.size,
        version,
        storageType: 'cloudinary'
      };

      // Save to Firebase Database
      const resumeRef = ref(database, 'settings/resume');
      await set(resumeRef, resumeData);

      logger.log('resume', 'Resume uploaded successfully to Cloudinary:', resumeData);
      return resumeData;
    } catch (error) {
      logger.error('resume', 'Error uploading resume:', error);
      throw error;
    }
  },

  /**
   * Get the current resume data
   */
  async getCurrentResume(): Promise<ResumeData | null> {
    try {
      if (!database) {
        throw new Error('Firebase database is not initialized');
      }

      const resumeRef = ref(database, 'settings/resume');
      const snapshot = await get(resumeRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val() as ResumeData;
        
        // Skip URL validation as it can cause 401 errors with Cloudinary
        // The download attempt will handle any accessibility issues
        logger.log('resume', 'Retrieved resume data from Firebase:', { 
          fileName: data.fileName, 
          version: data.version, 
          uploadedAt: data.uploadedAt 
        });
        
        return data;
      }
      
      return null;
    } catch (error) {
      logger.error('resume', 'Error getting current resume:', error);
      throw error;
    }
  },

  /**
   * Delete the current resume
   */
  async deleteResume(): Promise<void> {
    try {
      if (!database) {
        throw new Error('Firebase database is not initialized');
      }

      const currentResume = await this.getCurrentResume();
      
      if (!currentResume) {
        throw new Error('No resume found to delete');
      }

      // Note: We're not deleting from Cloudinary due to security constraints
      // In a production app, you'd handle this via a secure backend endpoint
      logger.log('resume', 'Marking resume as deleted from database:', currentResume.publicId);

      // Remove from Firebase Database
      const resumeRef = ref(database, 'settings/resume');
      await remove(resumeRef);

      logger.log('resume', 'Resume deleted successfully from database');
    } catch (error) {
      logger.error('resume', 'Error deleting resume:', error);
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
   * Generate a direct download URL that forces download instead of preview
   */
  getDirectDownloadUrl(fileUrl: string, fileName: string): string {
    try {
      logger.log('resume', 'Generating direct download URL for:', { fileUrl, fileName });
      
      // For Cloudinary URLs, we can add transformation parameters to force download
      if (fileUrl.includes('cloudinary.com')) {
        // Prevent double-adding the attachment transform
        if (fileUrl.includes('fl_attachment')) {
          logger.log('resume', 'URL already has fl_attachment, returning as-is');
          return fileUrl;
        }
        
        try {
          const url = new URL(fileUrl);
          const pathSegments = url.pathname.split('/').filter(segment => segment.length > 0);
          
          logger.log('resume', 'URL path segments:', pathSegments);
          
          // Find the upload segment
          const uploadIndex = pathSegments.indexOf('upload');
          
          if (uploadIndex !== -1) {
            // Create the transformation for forced download
            // Sanitize filename to remove special characters that might break URLs
            let sanitizedFileName = fileName
              .replace(/[^a-zA-Z0-9.-]/g, '_')
              .replace(/_{2,}/g, '_') // Replace multiple underscores with single
              .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
              
            // Ensure .pdf extension
            if (!sanitizedFileName.toLowerCase().endsWith('.pdf')) {
              sanitizedFileName += '.pdf';
            }
            
            // Use a simpler approach - just add fl_attachment after upload
            const beforeUpload = pathSegments.slice(0, uploadIndex + 1); // [..., 'upload']
            const afterUpload = pathSegments.slice(uploadIndex + 1); // [rest of path]
            
            const newPathSegments = [
              ...beforeUpload,
              `fl_attachment:${sanitizedFileName}`,
              ...afterUpload
            ];
            
            // Reconstruct the URL
            url.pathname = '/' + newPathSegments.join('/');
            
            const finalUrl = url.toString();
            logger.log('resume', 'Generated direct download URL:', finalUrl);
            return finalUrl;
          } else {
            logger.warn('resume', 'Could not find upload segment in Cloudinary URL:', fileUrl);
            // Try a different approach - add download parameter as query string
            const url = new URL(fileUrl);
            url.searchParams.set('download', '1');
            url.searchParams.set('filename', fileName);
            return url.toString();
          }
        } catch (urlError) {
          logger.error('resume', 'Error parsing URL:', urlError);
          // Fallback: try to add download parameters as query string
          const separator = fileUrl.includes('?') ? '&' : '?';
          return `${fileUrl}${separator}download=1&filename=${encodeURIComponent(fileName)}`;
        }
      }
      
      // For non-Cloudinary URLs, add download parameters
      const separator = fileUrl.includes('?') ? '&' : '?';
      const downloadUrl = `${fileUrl}${separator}download=1&filename=${encodeURIComponent(fileName)}`;
      logger.log('resume', 'Non-Cloudinary URL, added download parameters:', downloadUrl);
      return downloadUrl;
      
    } catch (error) {
      logger.error('resume', 'Error generating direct download URL:', error);
      return fileUrl;
    }
  },

  /**
   * Test if a download URL is accessible and working
   */
  async testDownloadUrl(url: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(url, { 
        method: 'GET',
        // Don't follow redirects to test the actual URL
        redirect: 'manual'
      });
      
      // For download URLs, we expect either success (200) or redirect (3xx)
      if (response.ok || (response.status >= 300 && response.status < 400)) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: `HTTP ${response.status}: ${response.statusText}` 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
    }
  },

  /**
   * Generate signature for secure upload (requires backend support)
   * This is an alternative for accounts marked as untrusted
   */
  async uploadResumeWithSignature(file: File): Promise<ResumeData> {
    try {
      if (!database) {
        throw new Error('Firebase database is not initialized');
      }

      logger.log('resume', 'Attempting signed upload for untrusted account:', { fileName: file.name, size: file.size });

      // Check if we have the required Cloudinary configuration
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;
      const apiSecret = import.meta.env.VITE_CLOUDINARY_API_SECRET;

      if (!cloudName) {
        throw new Error('Cloudinary cloud name is missing. Please check your environment variables.');
      }

      // For security reasons, API secret should not be in frontend code
      // This is a demonstration - in production, signature should be generated by backend
      if (!apiKey || !apiSecret) {
        throw new Error('Signed upload requires backend support. Please implement a signature generation endpoint or contact your administrator to enable unsigned uploads.');
      }

      // For security reasons, signed uploads should be handled by backend
      // This prevents exposing API secrets in frontend code
      throw new Error('Signed upload requires backend implementation. Please either:\n1. Enable unsigned uploads in your Cloudinary account settings\n2. Configure a backend endpoint for signature generation\n3. Contact your Cloudinary administrator');

    } catch (error) {
      logger.error('resume', 'Error in signed upload:', error);
      throw error;
    }
  },
};
