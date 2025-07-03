import { NavigateFunction } from 'react-router-dom';
import { User } from 'firebase/auth';
import { ref, push } from 'firebase/database';
import { database } from '../config/firebase';
import logger from '../utils/logger';

interface SecurityEvent {
  type: 'UNAUTHORIZED_ACCESS' | 'SUSPICIOUS_ACTIVITY' | 'ACCESS_GRANTED' | 'ACCESS_DENIED';
  path: string;
  userEmail?: string;
  userAgent: string;
  timestamp: string;
  ip?: string;
  details?: string;
}

class AdminSecurityMiddleware {
  private static instance: AdminSecurityMiddleware;
  private allowedEmails = ['vikash.jmbox@gmail.com'];
  private suspiciousPatterns = [
    '/admin',
    '/dashboard',
    '/admin-welcome',
    '/.env',
    '/config',
    '/api/admin'
  ];
  
  // Project creation permissions - anyone in admin panel can create projects
  private projectPermissions = {
    create: true, // Allow all authenticated admin users to create projects
    edit: true,   // Allow all authenticated admin users to edit projects
    delete: true  // Allow all authenticated admin users to delete projects
  };

  public static getInstance(): AdminSecurityMiddleware {
    if (!AdminSecurityMiddleware.instance) {
      AdminSecurityMiddleware.instance = new AdminSecurityMiddleware();
    }
    return AdminSecurityMiddleware.instance;
  }

  private async logSecurityEvent(event: SecurityEvent): Promise<void> {
    // Only log critical events to console
    if (event.type === 'UNAUTHORIZED_ACCESS') {
      logger.warn('security', 'Security Event:', event);
    }

    // Try to get IP address for database logging only
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      event.ip = ipData.ip;
    } catch (error) {
      event.ip = 'Unknown';
    }

    // Log to Firebase if available
    if (database) {
      try {
        await push(ref(database, 'security/events'), event);
      } catch (error) {
        // Only log critical errors
        if (event.type === 'UNAUTHORIZED_ACCESS') {
          console.error('Failed to log security event to Firebase:', error);
        }
      }
    }

    // For critical events, you could also send to external monitoring
    if (event.type === 'UNAUTHORIZED_ACCESS') {
      this.handleCriticalEvent(event);
    }
  }

  private handleCriticalEvent(event: SecurityEvent): void {
    // Only log critical unauthorized access events to console
    if (event.type === 'UNAUTHORIZED_ACCESS' && process.env.NODE_ENV === 'development') {
      console.error('CRITICAL SECURITY EVENT:', {
        type: event.type,
        path: event.path,
        userEmail: event.userEmail,
        timestamp: event.timestamp,
        ip: event.ip
      });
    }

    // In production, we would:
    // - Send email alerts
    // - Log to secure database
    // - Block IP address temporarily
    // - Increase security level
  }

  public async checkAccess(
    path: string, 
    user: User | null
  ): Promise<boolean> {
    const isAdminPath = this.isAdminPath(path);
    
    if (!isAdminPath) {
      return true; // Allow non-admin paths
    }

    const securityEvent: SecurityEvent = {
      type: 'ACCESS_DENIED',
      path,
      userEmail: user?.email || 'Anonymous',
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    // Check 1: User must be authenticated
    if (!user) {
      securityEvent.type = 'UNAUTHORIZED_ACCESS';
      securityEvent.details = 'No authenticated user';
      await this.logSecurityEvent(securityEvent);
      return false;
    }

    // Check 2: Email must be in allowed list
    if (!this.allowedEmails.includes(user.email || '')) {
      securityEvent.type = 'UNAUTHORIZED_ACCESS';
      securityEvent.details = `Unauthorized email: ${user.email}`;
      await this.logSecurityEvent(securityEvent);
      return false;
    }

    // Check 3: Email must be verified
    if (user.emailVerified === false) {
      securityEvent.type = 'UNAUTHORIZED_ACCESS';
      securityEvent.details = 'Email not verified';
      await this.logSecurityEvent(securityEvent);
      return false;
    }

    // Check 4: Recent authentication check
    const authTime = user.metadata?.lastSignInTime;
    if (authTime) {
      const lastSignIn = new Date(authTime);
      const now = new Date();
      const hoursSinceSignIn = (now.getTime() - lastSignIn.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceSignIn > 24) {
        securityEvent.type = 'UNAUTHORIZED_ACCESS';
        securityEvent.details = `Stale authentication: ${hoursSinceSignIn.toFixed(2)} hours old`;
        await this.logSecurityEvent(securityEvent);
        return false;
      }
    }

    // All checks passed
    securityEvent.type = 'ACCESS_GRANTED';
    securityEvent.details = 'All security checks passed';
    await this.logSecurityEvent(securityEvent);
    return true;
  }

  private isAdminPath(path: string): boolean {
    return path.startsWith('/admin') || 
           path.startsWith('/dashboard') || 
           path === '/admin-welcome';
  }

  public async interceptNavigation(
    path: string, 
    user: User | null, 
    navigate: NavigateFunction
  ): Promise<void> {
    const hasAccess = await this.checkAccess(path, user);
    
    if (!hasAccess && this.isAdminPath(path)) {
      // Force redirect to access restricted page
      navigate('/access-restricted', { 
        replace: true,
        state: { 
          email: user?.email || 'Unauthorized',
          attemptedPath: path 
        }
      });
    }
  }

  public monitorSuspiciousActivity(): void {
    // Monitor for suspicious URL patterns
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      this.checkSuspiciousNavigation(args[2]?.toString() || '');
      return originalPushState.apply(history, args);
    };

    history.replaceState = (...args) => {
      this.checkSuspiciousNavigation(args[2]?.toString() || '');
      return originalReplaceState.apply(history, args);
    };

    // Monitor for console access attempts
    this.monitorConsoleAccess();
  }

  private checkSuspiciousNavigation(url: string): void {
    const suspicious = this.suspiciousPatterns.some(pattern => 
      url.includes(pattern)
    );

    if (suspicious) {
      this.logSecurityEvent({
        type: 'SUSPICIOUS_ACTIVITY',
        path: url,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        details: 'Suspicious URL pattern detected'
      });
    }
  }

  private monitorConsoleAccess(): void {
    // Instead of overriding console.log directly, add a listener or hook
    // that watches for sensitive information in logs
    // This is more compatible with our logger utility
    
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    // Helper function to check for sensitive patterns
    const checkSensitiveInfo = (args: any[]) => {
      // Convert args to string only if they are primitive types
      const stringArgs = args.map(arg => {
        if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean') {
          return String(arg);
        }
        return '';
      });
      
      const message = stringArgs.join(' ');
      
      // Only log security events for specific keywords related to security
      if ((message.includes('admin') && message.includes('password')) || 
          (message.includes('auth') && message.includes('token')) || 
          (message.includes('firebase') && message.includes('secret'))) {
        this.logSecurityEvent({
          type: 'SUSPICIOUS_ACTIVITY',
          path: window.location.pathname,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          details: 'Console debugging detected'
        });
      }
    };
    
    // Only monitor in production environments
    if (!import.meta.env.DEV) {
      console.log = (...args) => {
        checkSensitiveInfo(args);
        return originalConsoleLog.apply(console, args);
      };
      
      console.error = (...args) => {
        checkSensitiveInfo(args);
        return originalConsoleError.apply(console, args);
      };
      
      console.warn = (...args) => {
        checkSensitiveInfo(args);
        return originalConsoleWarn.apply(console, args);
      };
    }
  }

  /**
   * Check if user has permission to perform project operations
   * Anyone with admin access can create/edit/delete projects
   */
  public canManageProjects(user: User | null): boolean {
    // Allow any authenticated admin user to manage projects
    return this.isAuthenticated(user) && this.isAdminPath(window.location.pathname);
  }

  /**
   * Check if user can create projects
   */
  public canCreateProject(user: User | null): boolean {
    return this.canManageProjects(user) && this.projectPermissions.create;
  }

  /**
   * Check if user can edit projects
   */
  public canEditProject(user: User | null): boolean {
    return this.canManageProjects(user) && this.projectPermissions.edit;
  }

  /**
   * Check if user can delete projects
   */
  public canDeleteProject(user: User | null): boolean {
    return this.canManageProjects(user) && this.projectPermissions.delete;
  }

  /**
   * Check if user is authenticated
   */
  private isAuthenticated(user: User | null): boolean {
    return user !== null && user.emailVerified !== false;
  }
}

export default AdminSecurityMiddleware;
