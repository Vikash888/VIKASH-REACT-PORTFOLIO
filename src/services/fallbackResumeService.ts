import { ref, set, get, remove } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
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
  storageType: 'firebase' | 'cloudinary';
}

export const fallbackResumeService = {
  /**
   * Upload resume to Firebase Storage as a fallback when Cloudinary fails
   */
  async uploadResume(file: File): Promise<ResumeData> {
    try {
      if (!database) {
        throw new Error('Firebase database is not initialized');
      }

      logger.log('resume', 'Starting fallback upload to Firebase Storage:', { fileName: file.name, size: file.size });

      // Get Firebase Storage instance
      const storage = getStorage();
      const timestamp = Date.now();
      const fileName = `resume_${timestamp}_${file.name}`;
      
      // Create storage reference
      const resumeStorageRef = storageRef(storage, `portfolio/resume/${fileName}`);
      
      // Upload file to Firebase Storage
      const uploadResult = await uploadBytes(resumeStorageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(uploadResult.ref);
      
      // Get current resume version
      const currentResume = await this.getCurrentResume();
      const version = currentResume ? currentResume.version + 1 : 1;

      // Create resume metadata
      const resumeData: ResumeData = {
        id: `resume_${timestamp}`,
        fileName: file.name,
        fileUrl: downloadURL,
        publicId: fileName, // Use filename as public ID for Firebase Storage
        uploadedAt: new Date().toISOString(),
        fileSize: file.size,
        version,
        storageType: 'firebase'
      };

      // Save metadata to Firebase Database
      const resumeRef = ref(database, 'settings/resume');
      await set(resumeRef, resumeData);

      logger.log('resume', 'Resume uploaded successfully to Firebase Storage:', resumeData);
      return resumeData;
    } catch (error) {
      logger.error('resume', 'Error uploading resume to Firebase Storage:', error);
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
        logger.log('resume', 'Retrieved resume data from Firebase:', { 
          fileName: data.fileName, 
          version: data.version, 
          storageType: data.storageType || 'unknown'
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

      // Delete from Firebase Storage if it's stored there
      if (currentResume.storageType === 'firebase') {
        try {
          const storage = getStorage();
          const fileRef = storageRef(storage, `portfolio/resume/${currentResume.publicId}`);
          await deleteObject(fileRef);
          logger.log('resume', 'Resume file deleted from Firebase Storage');
        } catch (storageError) {
          logger.warn('resume', 'Could not delete file from Firebase Storage:', storageError);
          // Continue with database deletion even if storage deletion fails
        }
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
  }
};
