/**
 * Project Service Test
 * 
 * Simple test to verify project creation with RTDB metadata and Cloudinary media
 */

import { createProject, getProjects, ProjectUploadData } from '../services/projectService';
import { validateProjectData } from '../services/projectService';

// Mock project data for testing
const mockProjectData: ProjectUploadData = {
  title: 'Test Project',
  description: 'A test project to verify RTDB and Cloudinary integration',
  category: 'Testing',
  technologies: ['React', 'TypeScript', 'Firebase'],
  tools: ['VS Code', 'Git'],
  githubLink: 'https://github.com/test/project',
  demoLink: 'https://test-project.com',
  featured: false,
  visible: true
};

/**
 * Test project data validation
 */
export const testProjectValidation = () => {
  console.log('🧪 Testing project validation...');
  
  // Test valid data
  const validErrors = validateProjectData(mockProjectData);
  console.log('Valid data errors:', validErrors);
  
  // Test invalid data
  const invalidData = { ...mockProjectData, title: '', description: '' };
  const invalidErrors = validateProjectData(invalidData);
  console.log('Invalid data errors:', invalidErrors);
  
  return {
    validDataPassed: validErrors.length === 0,
    invalidDataCaught: invalidErrors.length > 0
  };
};

/**
 * Test project creation (metadata only, no files)
 */
export const testProjectCreation = async () => {
  console.log('🧪 Testing project creation...');
  
  try {
    const project = await createProject(mockProjectData);
    console.log('✅ Project created successfully:', project.id);
    console.log('📊 Metadata stored in Firebase RTDB');
    return { success: true, projectId: project.id };
  } catch (error) {
    console.error('❌ Project creation failed:', error);
    return { success: false, error };
  }
};

/**
 * Test project retrieval
 */
export const testProjectRetrieval = async () => {
  console.log('🧪 Testing project retrieval...');
  
  try {
    const projects = await getProjects();
    console.log(`✅ Retrieved ${projects.length} projects from RTDB`);
    
    // Log project structure
    if (projects.length > 0) {
      const sampleProject = projects[0];
      console.log('📋 Sample project structure:', {
        id: sampleProject.id,
        title: sampleProject.title,
        hasMainImage: !!sampleProject.mainImage,
        mediaCount: sampleProject.media?.length || 0,
        technologies: sampleProject.technologies?.length || 0,
        tools: sampleProject.tools?.length || 0
      });
    }
    
    return { success: true, count: projects.length };
  } catch (error) {
    console.error('❌ Project retrieval failed:', error);
    return { success: false, error };
  }
};

/**
 * Run all tests
 */
export const runProjectTests = async () => {
  console.log('🚀 Starting project service tests...');
  console.log('📍 Data Storage: Firebase RTDB (metadata) + Cloudinary (media)');
  console.log('🔐 Permissions: Any authenticated admin user can create projects');
  
  const results = {
    validation: testProjectValidation(),
    creation: await testProjectCreation(),
    retrieval: await testProjectRetrieval()
  };
  
  console.log('📊 Test Results:', results);
  return results;
};

// Export for use in admin panel
export default {
  testProjectValidation,
  testProjectCreation,
  testProjectRetrieval,
  runProjectTests
};
