import { ref, set, getDatabase } from 'firebase/database';

export const updateProjectOrder = async (projectId: string, newOrder: number) => {
  try {
    const db = getDatabase();
    const projectRef = ref(db, `projects/${projectId}`);
    await set(projectRef, { order: newOrder });
    return { success: true };
  } catch (error) {
    console.error('Error updating project order:', error);
    return { success: false, error };
  }
};

export const toggleProjectVisibility = async (projectId: string, isVisible: boolean) => {
  try {
    if (!projectId) {
      console.error('Invalid projectId provided to toggleProjectVisibility:', projectId);
      return { success: false, error: new Error('Invalid project ID') };
    }

    console.log(`Toggling visibility for project ${projectId} to ${isVisible}`);
    
    const db = getDatabase();
    // Only update the isVisible field, not the entire object
    const projectRef = ref(db, `projects/${projectId}/isVisible`);
    await set(projectRef, isVisible);
    
    console.log(`Successfully updated visibility for project ${projectId} to ${isVisible}`);
    return { success: true };
  } catch (error) {
    console.error('Error toggling project visibility:', error);
    return { success: false, error };
  }
};

export const saveProjectsOrder = async (projects: { id: string; realtimeDbId?: string; order: number }[]) => {
  try {
    const db = getDatabase();
    const updates: { [key: string]: number } = {};
    
    projects.forEach((project, index) => {
      // Use realtimeDbId if available, otherwise use id
      const dbId = project.realtimeDbId || project.id;
      if (dbId) {
        updates[`projects/${dbId}/order`] = index;
      }
    });
    
    // Use update instead of set to only update specific fields
    const dbRef = ref(db);
    await import('firebase/database').then(({ update }) => update(dbRef, updates));
    
    console.log(`Updated order for ${Object.keys(updates).length} projects`);
    return { success: true };
  } catch (error) {
    console.error('Error saving projects order:', error);
    return { success: false, error };
  }
};
