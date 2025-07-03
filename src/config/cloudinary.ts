import { Cloudinary } from '@cloudinary/url-gen';

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

if (!cloudName) {
  console.error('Missing Cloudinary cloud name. Please add VITE_CLOUDINARY_CLOUD_NAME to your .env file');
}

if (!uploadPreset) {
  console.error('Missing Cloudinary upload preset. Please add VITE_CLOUDINARY_UPLOAD_PRESET to your .env file');
}

const cld = new Cloudinary({
  cloud: {
    cloudName
  }
});

export const getOptimizedImageUrl = (url: string): string => {
  if (!url) return '/assets/404 Error.gif'; // Return fallback for empty URLs
  
  try {
    // If it's already a complete Cloudinary URL, return it as is
    if (url.includes('cloudinary.com')) {
      return url;
    }

    // If it's a public ID, generate a Cloudinary URL
    if (!url.startsWith('http')) {
      try {
        // Check if this is a valid public ID
        if (url === 'null' || url === 'undefined' || !url.trim()) {
          console.warn('Invalid Cloudinary public ID detected:', url);
          return '/assets/404 Error.gif';
        }
        
        // Use explicit version to force refresh the resource
        const timestamp = new Date().getTime();
        return `https://res.cloudinary.com/${cloudName}/image/upload/v${timestamp}/${url}`;
      } catch (error) {
        console.warn('Error generating Cloudinary image URL:', error);
        return '/assets/404 Error.gif';
      }
    }
    
    // Check if the URL is example.com or other test domains
    if (url.includes('example.com') || url.includes('test.jpg') || url.includes('placeholder')) {
      return '/assets/404 Error.gif';
    }

    // For external URLs, return as is
    return url;
  } catch (error) {
    console.warn('Error in getOptimizedImageUrl:', error);
    return '/assets/404 Error.gif';
  }
};

export const getOptimizedVideoUrl = (url: string): string => {
  if (!url) return ''; // Return empty string for empty URLs
  
  try {
    // If it's already a complete Cloudinary URL with full path, return it as is
    if (url.includes('cloudinary.com') && (url.includes('/video/upload/') || url.includes('/image/upload/'))) {
      return url;
    }

    // If it's a public ID or a partial Cloudinary URL, generate a proper Cloudinary URL
    if (!url.startsWith('http') || url.includes('cloudinary.com')) {
      try {
        // Extract public_id if it's a partial Cloudinary URL
        let publicId = url;
        let resourceType = 'video'; // Default to video
        
        if (url.includes('cloudinary.com')) {
          const parts = url.split('/');
          // Check if URL contains resource type information
          if (url.includes('/image/upload/')) {
            resourceType = 'image';
          }
          
          // Get the full path after upload/
          if (url.includes('/upload/')) {
            const uploadIndex = url.indexOf('/upload/');
            if (uploadIndex !== -1) {
              publicId = url.substring(uploadIndex + 8).split('.')[0];
            }
          } else {
            // Get the filename part (last segment)
            const filenamePart = parts[parts.length - 1];
            // Remove extension if present
            publicId = filenamePart.split('.')[0];
          }
        }
        
        // Check for invalid or empty publicId
        if (!publicId || publicId === 'null' || publicId === 'undefined') {
          console.warn('Invalid public_id detected:', publicId);
          return '';
        }
        
        // Create explicit media URL with version to prevent caching issues
        // Use v1750000000 as a version to force refresh for newer uploads
        return `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/v1750000000/${publicId}.${resourceType === 'video' ? 'mp4' : 'jpg'}`;
      } catch (error) {
        console.error('Error generating Cloudinary URL:', error, 'for URL:', url);
        return '';
      }
    }
    
    // For external URLs, return as is
    return url;
  } catch (error) {
    console.error('Error in getOptimizedVideoUrl:', error);
    return '';
  }
};

export default cld;