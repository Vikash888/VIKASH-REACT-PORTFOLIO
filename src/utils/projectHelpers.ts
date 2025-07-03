import { 
  getProjects as getProjectsFromService,
  createProject,
  updateProject as updateProjectFromService,
  deleteProject as deleteProjectFromService,
  updateProjectsOrder,
  Project,
  ProjectUploadData
} from '../services/projectService';

// Export the Project type
export type { Project };

// Export a function to fetch projects that uses our service
export const fetchProjects = async () => {
  const projects = await getProjectsFromService();
  
  // Map the projects to the expected format for the frontend component
  return projects.map(project => {
    // For images, first try mainImage, then fall back to first image in media array if available
    const firstMediaImage = project.media?.find(m => m.type === 'image');
    
    return {
      ...project,
      // Map mainImage to image for backward compatibility
      // Use mainImage, then first media image, or empty string as fallback
      image: project.mainImage || (firstMediaImage ? firstMediaImage.url : '')
    };
  });
};

// Export a function to add a project that uses our service
export const addProject = async (projectData: ProjectUploadData): Promise<{
  id: string | null;
  success: boolean;
  message: string;
}> => {
  try {
    const project = await createProject(projectData);
    return {
      id: project.id,
      success: true,
      message: 'Project created successfully'
    };
  } catch (error) {
    return {
      id: null,
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create project'
    };
  }
};

// Export a function to update a project that uses our service
export const updateProject = async (projectId: string, projectData: Partial<ProjectUploadData>): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    await updateProjectFromService(projectId, projectData);
    return {
      success: true,
      message: 'Project updated successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update project'
    };
  }
};

// Export a function to delete a project that uses our service
export const deleteProject = async (projectId: string): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    await deleteProjectFromService(projectId);
    return {
      success: true,
      message: 'Project deleted successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete project'
    };
  }
};

// Export a function to update project order that uses our service
export const updateProjectOrder = async (projectOrders: { id: string; order: number }[]): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    await updateProjectsOrder(projectOrders);
    return {
      success: true,
      message: 'Project order updated successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update project order'
    };
  }
};
