/**
 * Admin Configuration
 * 
 * Centralizes admin settings and permissions for the portfolio application
 */

export interface AdminConfig {
  // User permissions
  allowedEmails: string[];
  
  // Project management permissions
  projectPermissions: {
    create: boolean;
    edit: boolean;
    delete: boolean;
    manageVisibility: boolean;
    manageOrder: boolean;
  };
  
  // Security settings
  sessionTimeout: number; // in hours
  requireEmailVerification: boolean;
  enableSecurityLogging: boolean;
  
  // Feature flags
  features: {
    maintenance: boolean;
    analytics: boolean;
    notifications: boolean;
  };
}

// Default admin configuration
export const defaultAdminConfig: AdminConfig = {
  allowedEmails: ['vikash.jmbox@gmail.com'],
  
  projectPermissions: {
    create: true,        // Anyone in admin panel can create projects
    edit: true,          // Anyone in admin panel can edit projects
    delete: true,        // Anyone in admin panel can delete projects
    manageVisibility: true,  // Anyone in admin panel can show/hide projects
    manageOrder: true    // Anyone in admin panel can reorder projects
  },
  
  sessionTimeout: 24,
  requireEmailVerification: true,
  enableSecurityLogging: true,
  
  features: {
    maintenance: true,
    analytics: true,
    notifications: true
  }
};

/**
 * Check if user has permission for a specific action
 */
export const hasPermission = (
  userEmail: string | null | undefined,
  action: keyof AdminConfig['projectPermissions']
): boolean => {
  if (!userEmail) return false;
  
  // Check if user is in allowed emails list
  const isAllowedUser = defaultAdminConfig.allowedEmails.includes(userEmail);
  
  // For project permissions, any authenticated admin user can perform actions
  if (isAllowedUser && action in defaultAdminConfig.projectPermissions) {
    return defaultAdminConfig.projectPermissions[action];
  }
  
  return false;
};

/**
 * Check if user is an admin
 */
export const isAdmin = (userEmail: string | null | undefined): boolean => {
  if (!userEmail) return false;
  return defaultAdminConfig.allowedEmails.includes(userEmail);
};

/**
 * Get user-specific permissions
 */
export const getUserPermissions = (userEmail: string | null | undefined) => {
  if (!isAdmin(userEmail)) {
    return {
      create: false,
      edit: false,
      delete: false,
      manageVisibility: false,
      manageOrder: false
    };
  }
  
  return defaultAdminConfig.projectPermissions;
};

export default defaultAdminConfig;
