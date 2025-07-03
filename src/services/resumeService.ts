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

export const resumeService = {
  /**
   * Upload a new resume file to Cloudinary and save metadata to Firebase
   */
  async uploadResume(file: File): Promise<ResumeData> {
    try {
      if (!database) {
        throw new Error('Firebase database is not initialized');
      }

      logger.log('resume', 'Starting resume upload:', { fileName: file.name, size: file.size });

      // Check if we have the required Cloudinary configuration
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        throw new Error('Cloudinary configuration is missing. Please check your environment variables.');
      }

      // Upload to Cloudinary with specific folder for resumes
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', 'portfolio/resume');
      formData.append('public_id', `resume_${Date.now()}`); // Set a specific public ID
      formData.append('resource_type', 'raw'); // For non-image files like PDFs

      // Try the raw upload endpoint first
      let response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      // If raw upload fails due to upload preset restrictions, try auto upload
      if (!response.ok) {
        logger.log('resume', 'Raw upload failed, trying auto upload...');
        
        // Remove resource_type for auto upload
        formData.delete('resource_type');
        
        response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
          {
            method: 'POST',
            body: formData,
          }
        );
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle specific Cloudinary errors
        if (errorData.error?.message?.includes('access control') || 
            errorData.error?.message?.includes('Upload preset')) {
          throw new Error(`Upload preset '${uploadPreset}' doesn't allow PDF uploads. Please configure your Cloudinary upload preset to allow raw file uploads.`);
        }
        
        throw new Error(`Failed to upload resume: ${errorData.error?.message || JSON.stringify(errorData)}`);
      }

      const uploadResult = await response.json();
      
      // Get current resume version
      const currentResume = await this.getCurrentResume();
      const version = currentResume ? currentResume.version + 1 : 1;

      // Create resume metadata
      const resumeData: ResumeData = {
        id: `resume_${Date.now()}`,
        fileName: file.name,
        fileUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        uploadedAt: new Date().toISOString(),
        fileSize: file.size,
        version,
        storageType: 'cloudinary'
      };

      // Save to Firebase
      const resumeRef = ref(database, 'settings/resume');
      await set(resumeRef, resumeData);

      logger.log('resume', 'Resume uploaded successfully:', resumeData);
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
        return snapshot.val() as ResumeData;
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

      // Note: We're not actually deleting from Cloudinary due to security constraints
      // In a production app, you'd handle this via a secure backend endpoint
      logger.log('resume', 'Marking resume as deleted:', currentResume.publicId);

      // Remove from Firebase
      const resumeRef = ref(database, 'settings/resume');
      await remove(resumeRef);

      logger.log('resume', 'Resume deleted successfully');
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
      
      if (!resume) {
        return false;
      }

      // Optionally, you could add a health check here to verify the URL is still accessible
      return true;
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
  }
};
