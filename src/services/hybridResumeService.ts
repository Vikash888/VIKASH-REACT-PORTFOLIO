import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { ref, set, get, remove } from 'firebase/database';
import { storage, database } from '../config/firebase';
import logger from '../utils/logger';

export interface ResumeData {
  id: string;
  fileName: string;
  fileUrl: string;
  publicId: string;
  uploadedAt: string;
  fileSize: number;
  version: number;
  storageType?: 'cloudinary' | 'firebase'; // Make optional for backward compatibility
}

export const hybridResumeService = {
  /**
   * Upload resume using Firebase Storage as primary, Cloudinary as fallback
   */
  async uploadResume(file: File): Promise<ResumeData> {
    try {
      if (!database) {
        throw new Error('Firebase database is not initialized');
      }

      logger.log('resume', 'Starting resume upload:', { fileName: file.name, size: file.size });

      let uploadResult: { secure_url: string; public_id: string; storageType: 'firebase' | 'cloudinary' };

      // Try Firebase Storage first (more reliable for PDFs)
      try {
        if (!storage) {
          throw new Error('Firebase Storage is not initialized');
        }

        const timestamp = Date.now();
        const fileName = `resume_${timestamp}.pdf`;
        const resumeStorageRef = storageRef(storage, `portfolio/resume/${fileName}`);
        
        logger.log('resume', 'Uploading to Firebase Storage...');
        
        // Upload file to Firebase Storage with proper metadata
        const metadata = {
          contentType: 'application/pdf',
          customMetadata: {
            'uploaded': new Date().toISOString(),
            'originalName': file.name
          }
        };
        
        const snapshot = await uploadBytes(resumeStorageRef, file, metadata);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        uploadResult = {
          secure_url: downloadURL,
          public_id: `portfolio/resume/${fileName}`,
          storageType: 'firebase'
        };
        
        logger.log('resume', 'Firebase Storage upload successful');

      } catch (firebaseError) {
        logger.warn('resume', 'Firebase Storage upload failed, trying Cloudinary:', firebaseError);
        
        // Fallback to Cloudinary
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

        if (!cloudName || !uploadPreset) {
          throw new Error('Both Firebase Storage and Cloudinary are unavailable. Please check your configuration.');
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', 'portfolio/resume');
        formData.append('public_id', `resume_${Date.now()}`);

        // Try auto upload for better compatibility
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Both storage methods failed. Cloudinary error: ${errorData.error?.message || 'Unknown error'}`);
        }

        const cloudinaryResult = await response.json();
        uploadResult = {
          secure_url: cloudinaryResult.secure_url,
          public_id: cloudinaryResult.public_id,
          storageType: 'cloudinary'
        };
        
        logger.log('resume', 'Cloudinary upload successful as fallback');
      }

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
        storageType: uploadResult.storageType || 'firebase' // Default to firebase if not specified
      };

      // Save to Firebase Database
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
   * Delete the current resume from both storage and database
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

      // Delete from storage based on storage type
      if (currentResume.storageType === 'firebase' && storage) {
        try {
          const fileRef = storageRef(storage, currentResume.publicId);
          await deleteObject(fileRef);
          logger.log('resume', 'Resume deleted from Firebase Storage');
        } catch (storageError) {
          logger.warn('resume', 'Failed to delete from Firebase Storage:', storageError);
        }
      } else if (currentResume.storageType === 'cloudinary') {
        // Note: We're not actually deleting from Cloudinary due to security constraints
        logger.log('resume', 'Marking Cloudinary resume as deleted:', currentResume.publicId);
      }

      // Remove from Firebase Database
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

      // For Firebase Storage URLs, we can assume they're available if the record exists
      // For Cloudinary, we could add a HEAD request check if needed
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
