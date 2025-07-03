import { useEffect, useState } from 'react';
import { trackActiveUser } from './utils/analytics';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ref, onValue, set, onDisconnect } from 'firebase/database';
import { database, auth } from './config/firebase';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Skills from './components/Skills';
import Projects from './components/Projects';
import Education from './components/Education';
import Contact from './components/Contact';
import Footer from './components/Footer';
import NotFound from './components/NotFound';
import MaintenancePage from './components/MaintenancePage';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminWelcome from './components/admin/AdminWelcome';
import AccessRestricted from './components/AccessRestricted';
import LoadingScreen from './components/common/LoadingScreen';
import { ThemeProvider } from './contexts/ThemeContext';
import { useTheme } from './hooks/useTheme';
import { DashboardProvider, useDashboard } from './contexts/DashboardContext';
import { DevToolsProvider } from './contexts/DevToolsContext';
import SecurityTest from './components/SecurityTest';
import AdminRouteGuard from './components/AdminRouteGuard';
import { initDevToolsProtection } from './services/devToolsManager';
import AdminSecurityMiddleware from './middleware/adminSecurityMiddleware';
import ActiveUsersLive from './components/common/ActiveUsersLive';
import RealTimeAnalyticsPage from './pages/RealTimeAnalyticsPage';

const AppContent = () => {
  const location = useLocation();
  const { darkMode, toggleDarkMode } = useTheme();
  const { maintenanceEndTime } = useDashboard();
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isDevToolsBlocked, setIsDevToolsBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const securityMiddleware = AdminSecurityMiddleware.getInstance();

  // Initial loading effect
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Start loading
        setIsLoading(true);
        
        // Set a fixed 2-second loading time
        const loadingTimer = new Promise(resolve => setTimeout(resolve, 2000));
        
        // Initialize Firebase and other services in parallel (but don't wait for them)
        const initPromises = [];
        
        // Track active users
        if (trackActiveUser) {
          initPromises.push(trackActiveUser().catch(err => console.error('Error setting up user tracking:', err)));
        }
        
        // Initialize enhanced tracking service
        initPromises.push(
          import('./services/activeUsersService').then(module => {
            module.startAutoCleanup();
            return module.trackActiveUser();
          }).catch(err => console.error('Error importing tracking service:', err))
        );
        
        // Run initialization in background but only wait for the 2-second timer
        Promise.allSettled(initPromises); // Don't await this
        
        // Wait exactly 2 seconds
        await loadingTimer;
        
      } catch (error) {
        console.error('App initialization error:', error);
        // Even if there's an error, we should still load the app after 2 seconds
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Track active users - moved to initialization
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let enhancedCleanup: (() => void) | undefined;
    
    // Only set up tracking after initial loading is complete
    if (!isLoading) {
      // Track active users with existing utility
      trackActiveUser().then(cleanupFn => {
        cleanup = cleanupFn;
      }).catch(err => console.error('Error setting up user tracking:', err));
      
      // Also use our enhanced real-time tracking service
      import('./services/activeUsersService').then(module => {
        module.trackActiveUser().then(cleanupFn => {
          enhancedCleanup = cleanupFn;
        }).catch(err => console.error('Error setting up enhanced tracking:', err));
      }).catch(err => console.error('Error importing tracking service:', err));
    }

    return () => {
      if (cleanup) cleanup();
      if (enhancedCleanup) enhancedCleanup();
    };
  }, [isLoading]);

  useEffect(() => {
    if (!database) return;

    const maintenanceRef = ref(database, 'maintenance');
    const unsubMaintenance = onValue(maintenanceRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setIsMaintenance(data.enabled);
      }
    });

    const devToolsRef = ref(database, 'settings/devTools');
    const unsubDevTools = onValue(devToolsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setIsDevToolsBlocked(data.blocked || false);
        if (data.blocked) {
          initDevToolsProtection();
        }
      }
    });

    const isAdminRoute = location.pathname.startsWith('/admin');
    if (isDevToolsBlocked && !isAdminRoute) {
      initDevToolsProtection();
    }

    return () => {
      unsubMaintenance();
      unsubDevTools();
    };
  }, [location, isDevToolsBlocked]);

  useEffect(() => {
    if (!database || !auth?.currentUser) return;

    // Create a presence reference for the current user
    const presenceRef = ref(database, `activeUsers/${auth.currentUser.uid}`);

    // When user connects, update their status
    set(presenceRef, {
      userId: auth.currentUser.uid,
      email: auth.currentUser.email,
      lastSeen: new Date().toISOString(),
      status: 'online'
    });

    // When user disconnects, remove them from active users
    onDisconnect(presenceRef).remove();

    return () => {
      // Cleanup: remove user from active users when component unmounts
      set(presenceRef, null);
    };
  }, []); // Remove auth.currentUser from dependencies since we check it inside

  // Initialize global security monitoring
  useEffect(() => {
    securityMiddleware.monitorSuspiciousActivity();
  }, [securityMiddleware]);

  // Global route interceptor for admin paths
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/admin') || path === '/admin-welcome' || path === '/dashboard') {
      // This will log the attempt and handle security checks
      securityMiddleware.checkAccess(path, null).then(hasAccess => {
        if (!hasAccess) {
          console.warn('Unauthorized direct access attempt to:', path);
        }
      });
    }
  }, [location.pathname, securityMiddleware]);

  // Show loading screen during initial app load
  if (isLoading) {
    return <LoadingScreen isLoading={isLoading} />;
  }

  if (isMaintenance &&
      !location.pathname.startsWith('/admin') &&
      !location.pathname.startsWith('/admin-welcome') &&
      !location.pathname.startsWith('/dashboard') &&
      location.pathname !== '/access-restricted') {
    return <MaintenancePage message="We're currently updating our site to bring you a better experience. Please check back soon!" darkMode={darkMode} toggleDarkMode={toggleDarkMode} endTime={maintenanceEndTime} />;
  }

  return (
    <div className="relative min-h-screen">
      <Navbar darkMode={darkMode} setDarkMode={toggleDarkMode} />
      <Routes>
        {/* Admin and special routes - all protected with strict authentication */}
        <Route path="/admin" element={
          <AdminRouteGuard>
            <AdminDashboard />
          </AdminRouteGuard>
        } />
        <Route path="/admin/*" element={
          <AdminRouteGuard>
            <AdminDashboard />
          </AdminRouteGuard>
        } />
        <Route path="/admin-welcome" element={<AdminRouteGuard><AdminWelcome /></AdminRouteGuard>} />
        <Route path="/dashboard" element={<Navigate to="/access-restricted" replace />} />
        <Route path="/maintenance" element={<MaintenancePage message="We're currently updating our site to bring you a better experience. Please check back soon!" darkMode={darkMode} toggleDarkMode={toggleDarkMode} endTime={maintenanceEndTime} />} />
        <Route path="/access-restricted" element={<AccessRestricted />} />
        <Route path="/security-test" element={<SecurityTest darkMode={darkMode} />} />
        <Route path="/live-analytics" element={<AdminRouteGuard><ActiveUsersLive /></AdminRouteGuard>} />
        <Route path="/real-time-analytics" element={<AdminRouteGuard><RealTimeAnalyticsPage /></AdminRouteGuard>} />

        {/* Main routes with all sections */}
        <Route path="/" element={
          <div className="flex flex-col">
            <Hero darkMode={darkMode} />
            <About darkMode={darkMode} />
            <Skills darkMode={darkMode} />
            <Projects darkMode={darkMode} />
            <Education darkMode={darkMode} />
            <Contact darkMode={darkMode} />
          </div>
        } />

        {/* Section routes - also render all sections for continuous page experience */}
        <Route path="/about" element={
          <div className="flex flex-col">
            <Hero darkMode={darkMode} />
            <About darkMode={darkMode} />
            <Skills darkMode={darkMode} />
            <Projects darkMode={darkMode} />
            <Education darkMode={darkMode} />
            <Contact darkMode={darkMode} />
          </div>
        } />
        <Route path="/skills" element={
          <div className="flex flex-col">
            <Hero darkMode={darkMode} />
            <About darkMode={darkMode} />
            <Skills darkMode={darkMode} />
            <Projects darkMode={darkMode} />
            <Education darkMode={darkMode} />
            <Contact darkMode={darkMode} />
          </div>
        } />
        <Route path="/projects" element={
          <div className="flex flex-col">
            <Hero darkMode={darkMode} />
            <About darkMode={darkMode} />
            <Skills darkMode={darkMode} />
            <Projects darkMode={darkMode} />
            <Education darkMode={darkMode} />
            <Contact darkMode={darkMode} />
          </div>
        } />
        <Route path="/education" element={
          <div className="flex flex-col">
            <Hero darkMode={darkMode} />
            <About darkMode={darkMode} />
            <Skills darkMode={darkMode} />
            <Projects darkMode={darkMode} />
            <Education darkMode={darkMode} />
            <Contact darkMode={darkMode} />
          </div>
        } />
        <Route path="/contact" element={
          <div className="flex flex-col">
            <Hero darkMode={darkMode} />
            <About darkMode={darkMode} />
            <Skills darkMode={darkMode} />
            <Projects darkMode={darkMode} />
            <Education darkMode={darkMode} />
            <Contact darkMode={darkMode} />
          </div>
        } />

        {/* Keep /404 route for explicit navigation to 404 page */}
        <Route path="/404" element={<NotFound />} />
        {/* Render NotFound component directly for any unmatched route with state to indicate it's from catch-all */}
        <Route path="*" element={<Navigate to="/404" state={{ from: 'catch-all' }} replace />} />
      </Routes>
      <Footer darkMode={darkMode} />
    </div>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <DashboardProvider>
        <DevToolsProvider>
          <Router>
            <AppContent />
          </Router>
        </DevToolsProvider>
      </DashboardProvider>
    </ThemeProvider>
  );
};

export default App;