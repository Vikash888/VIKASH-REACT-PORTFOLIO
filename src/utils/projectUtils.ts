/**
 * Project Management Utilities
 * 
 * Helper functions for project management operations
 * Ensures consistent behavior across the admin panel
 */

import { Project, ProjectMedia } from '../services/projectService';

/**
 * Clean up orphaned media files from Cloudinary
 * Removes media files that are no longer referenced in any project
 */
export const cleanupOrphanedMedia = async (projects: Project[]): Promise<void> => {
  try {
    // Get all media public_ids currently in use
    const usedPublicIds = new Set<string>();
    
    projects.forEach(project => {
      // Add main image public_id
      if (project.mainImagePublicId) {
        usedPublicIds.add(project.mainImagePublicId);
      }
      
      // Add all media public_ids
      project.media?.forEach(media => {
        if (media.public_id) {
          usedPublicIds.add(media.public_id);
        }
      });
    });
    
    console.log(`📊 Found ${usedPublicIds.size} media files in use across ${projects.length} projects`);
    
    // Note: Cloudinary cleanup would require server-side implementation
    // to list all resources and compare with used ones
    
  } catch (error) {
    console.error('Error during media cleanup:', error);
  }
};

/**
 * Validate media file before upload
 */
export const validateMediaFile = (file: File): { valid: boolean; error?: string } => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/ogg'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} not supported. Supported types: ${allowedTypes.join(', ')}`
    };
  }
  
  return { valid: true };
};

/**
 * Generate optimized project thumbnails
 */
export const generateProjectThumbnail = (project: Project): string => {
  // Use main image if available
  if (project.mainImage) {
    return project.mainImage;
  }
  
  // Use first image from media array
  const firstImage = project.media?.find(media => media.type === 'image');
  if (firstImage) {
    return firstImage.url;
  }
  
  // Fallback to placeholder
  return '/assets/404 Error.gif';
};

/**
 * Sort projects by display priority
 * Matches the sorting logic used in main Projects component and admin panel
 */
export const sortProjectsByPriority = (projects: Project[]): Project[] => {
  return [...projects].sort((a, b) => {
    // Sort by order only
    const orderA = a.order !== undefined ? a.order : 999;
    const orderB = b.order !== undefined ? b.order : 999;
    return orderA - orderB;
  });
};

/**
 * Get project statistics
 */
export const getProjectStats = (projects: Project[]) => {
  const stats = {
    total: projects.length,
    visible: projects.filter(p => p.visible).length,
    hidden: projects.filter(p => !p.visible).length,
    featured: projects.filter(p => p.featured).length,
    totalViews: projects.reduce((sum, p) => sum + (p.views || 0), 0),
    categories: {} as Record<string, number>,
    technologies: {} as Record<string, number>
  };
  
  // Count by category
  projects.forEach(project => {
    if (project.category) {
      stats.categories[project.category] = (stats.categories[project.category] || 0) + 1;
    }
    
    // Count technologies
    project.technologies?.forEach(tech => {
      stats.technologies[tech] = (stats.technologies[tech] || 0) + 1;
    });
  });
  
  return stats;
};

/**
 * Validate project media array
 */
export const validateProjectMedia = (media: ProjectMedia[]): string[] => {
  const errors: string[] = [];
  
  media.forEach((item, index) => {
    if (!item.url) {
      errors.push(`Media item ${index + 1}: URL is required`);
    }
    
    if (!item.public_id) {
      errors.push(`Media item ${index + 1}: public_id is required`);
    }
    
    if (!['image', 'video'].includes(item.type)) {
      errors.push(`Media item ${index + 1}: type must be 'image' or 'video'`);
    }
  });
  
  return errors;
};

/**
 * Create project backup data
 */
export const createProjectBackup = (projects: Project[]) => {
  return {
    version: '1.0',
    timestamp: new Date().toISOString(),
    projectCount: projects.length,
    projects: projects.map(project => ({
      ...project,
      // Include metadata about media storage
      _metadata: {
        mediaCount: project.media?.length || 0,
        hasMainImage: !!project.mainImage,
        totalViews: project.views || 0
      }
    }))
  };
};

export default {
  cleanupOrphanedMedia,
  validateMediaFile,
  generateProjectThumbnail,
  sortProjectsByPriority,
  getProjectStats,
  validateProjectMedia,
  createProjectBackup
};
