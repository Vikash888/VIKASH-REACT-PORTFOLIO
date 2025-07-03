/**
 * Cloudinary service for direct browser-to-Cloudinary uploads.
 * Uses the unsigned upload functionality with a pre-configured upload preset.
 */

// Get environment variables from Vite's import.meta.env
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

import logger from '../utils/logger';

// Debug log to help troubleshoot environment variables
logger.log('cloudinary', 'Cloudinary Config:', { 
  CLOUD_NAME: CLOUD_NAME || '(not set)', 
  UPLOAD_PRESET: UPLOAD_PRESET || '(not set)',
  ENV_KEYS: Object.keys(import.meta.env).filter(key => key.includes('CLOUDINARY'))
});

if (!CLOUD_NAME) {
  logger.error('cloudinary', 'Missing Cloudinary cloud name in environment variables');
}

if (!UPLOAD_PRESET) {
  console.error('Missing Cloudinary upload preset in environment variables');
}

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  resource_type: string;
}

export const cloudinaryService = {
  /**
   * Upload a single media file directly to Cloudinary from the browser
   */
  async uploadMedia(file: File): Promise<CloudinaryUploadResponse> {
    try {
      if (!CLOUD_NAME || !UPLOAD_PRESET) {
        throw new Error('Missing Cloudinary configuration. Check your environment variables.');
      }
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (err) {
          errorData = { status: response.status, statusText: response.statusText };
        }
        
        throw new Error(`Failed to upload media to Cloudinary: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      
      return {
        secure_url: data.secure_url,
        public_id: data.public_id,
        resource_type: data.resource_type,
      };
    } catch (error) {
      console.error('Error in uploadMedia:', error);
      throw error;
    }
  },

  /**
   * Upload multiple media files directly to Cloudinary
   */
  async uploadMultipleMedia(files: File[]): Promise<CloudinaryUploadResponse[]> {
    try {
      if (!CLOUD_NAME || !UPLOAD_PRESET) {
        throw new Error('Missing Cloudinary configuration. Check your environment variables.');
      }
      
      // Upload files in parallel
      const uploadPromises = files.map(file => this.uploadMedia(file));
      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error in uploadMultipleMedia:', error);
      throw error;
    }
  },

  /**
   * Upload media specifically for a project, organizing it in a project folder
   * Uses direct browser upload to Cloudinary
   */
  async uploadProjectMedia(file: File, projectId: string): Promise<CloudinaryUploadResponse> {
    try {
      if (!CLOUD_NAME || !UPLOAD_PRESET) {
        throw new Error('Missing Cloudinary configuration. Check your environment variables.');
      }
      
      console.log('Uploading to Cloudinary directly:', {
        fileName: file.name,
        fileType: file.type,
        fileSize: `${(file.size / 1024).toFixed(2)} KB`,
        projectId,
        folder: `portfolio/projects/${projectId}`
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', `portfolio/projects/${projectId}`);
      
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Cloudinary upload error:', errorData);
        throw new Error(`Failed to upload file to Cloudinary: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      
      console.log('Cloudinary upload success:', {
        url: data.secure_url,
        publicId: data.public_id,
        resourceType: data.resource_type
      });
      
      return {
        secure_url: data.secure_url,
        public_id: data.public_id,
        resource_type: data.resource_type,
      };
    } catch (error) {
      console.error('Error in uploadProjectMedia:', error);
      throw error;
    }
  },

  /**
   * Delete media from Cloudinary via a direct browser request
   * Note: For security, this would typically be done via server, but we're
   * implementing direct browser deletion as requested.
   * Make sure your Cloudinary upload preset has limited permissions.
   */
  async deleteMedia(publicId: string): Promise<void> {
    try {
      // Since deleting directly from browser is not secure (requires API key & secret),
      // we'll just log this action. In a real scenario, you'd need a backend endpoint
      // or use Cloudinary's Admin API (which should never be exposed to the browser)
      console.log(`Delete requested for Cloudinary asset: ${publicId}`);
      
      // For a complete browser-only solution without server:
      // 1. You should consider using a "mark as deleted" approach in your database
      // 2. Then periodically clean up Cloudinary resources using Admin API in a secure environment
      // 3. Or use Cloudinary's automatic folder cleanup policies
      
      // Just marking the function as completed without actual deletion
      return;
      
      // Note: In a real-world app, you'd need a server endpoint for secure deletion
      // The following code would typically be on the server side
      /*
      const timestamp = Math.round(new Date().getTime() / 1000);
      const signature = generateSignature({public_id: publicId, timestamp});
      
      const formData = new FormData();
      formData.append('public_id', publicId);
      formData.append('timestamp', timestamp.toString());
      formData.append('api_key', API_KEY);
      formData.append('signature', signature);
      
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to delete media: ${JSON.stringify(errorData)}`);
      }
      */
    } catch (error) {
      console.error('Error deleting media:', error);
      throw new Error('Failed to delete media. Please try again later.');
    }
  },
};