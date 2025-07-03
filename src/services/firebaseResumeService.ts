import { ref as dbRef, set, get, remove } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { database, storage } from '../config/firebase';
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

export const firebaseResumeService = {
  /**
   * Upload a new resume file to Firebase Storage
   */
  async uploadResume(file: File): Promise<ResumeData> {
    try {
      if (!database || !storage) {
        throw new Error('Firebase is not initialized');
      }

      logger.log('resume', 'Starting resume upload to Firebase Storage:', { fileName: file.name, size: file.size });

      // Create a unique file path
      const timestamp = Date.now();
      const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_'); // Sanitize filename
      const filePath = `portfolio/resume/resume_${timestamp}_${fileName}`;

      // Create storage reference
      const fileRef = storageRef(storage, filePath);

      // Upload file
      const uploadResult = await uploadBytes(fileRef, file);
      
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
        publicId: filePath, // Use storage path as public ID
        uploadedAt: new Date().toISOString(),
        fileSize: file.size,
        version,
        storageType: 'firebase'
      };

      // Save metadata to Firebase Database
      const resumeRef = dbRef(database, 'settings/resume');
      await set(resumeRef, resumeData);

      logger.log('resume', 'Resume uploaded successfully to Firebase Storage:', resumeData);
      return resumeData;
    } catch (error) {
      logger.error('resume', 'Error uploading resume to Firebase:', error);
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

      const resumeRef = dbRef(database, 'settings/resume');
      const snapshot = await get(resumeRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val() as ResumeData;
        logger.log('resume', 'Retrieved resume data:', { 
          fileName: data.fileName, 
          version: data.version, 
          storageType: data.storageType
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
      if (!database || !storage) {
        throw new Error('Firebase is not initialized');
      }

      const currentResume = await this.getCurrentResume();
      
      if (!currentResume) {
        throw new Error('No resume found to delete');
      }

      // Delete from storage if it's a Firebase file
      if (currentResume.storageType === 'firebase') {
        try {
          const fileRef = storageRef(storage, currentResume.publicId);
          await deleteObject(fileRef);
          logger.log('resume', 'Resume file deleted from Firebase Storage');
        } catch (deleteError) {
          logger.warn('resume', 'Failed to delete file from storage (may not exist):', deleteError);
        }
      }

      // Remove metadata from database
      const resumeRef = dbRef(database, 'settings/resume');
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
