import { useState, useContext, useEffect } from "react";
import { ThemeContext } from "../../contexts/ThemeContext";
import { useDashboard } from "../../contexts/DashboardContext";
import { useNavigate } from "react-router-dom";
import { auth } from "../../config/firebase";
import { signOut } from "firebase/auth";
import AdminStats from "./AdminStats";
import MaintenanceSettings from "./MaintenanceSettings";
import RealTimeAnalyticsDashboard from "./RealTimeAnalyticsDashboard";
import UsersPanel from "./UsersPanel";
import ProjectsPanel from "./ProjectsPanel";
import ResumeManagement from "./ResumeManagement.tsx";
import DevToolsProtection from "./DevToolsProtection";
import SecurityPanel from "./SecurityPanel";
import AccessRestricted from "../AccessRestricted";
import AdminProfilePhoto from "./AdminProfilePhoto";
import {
  LayoutDashboard,
  Settings,
  Users,
  FolderKanban,
  FileText,
  ChevronRight,
  Menu,
  X,
  Moon,
  Sun,
  AlertTriangle,
  ShieldAlert,
  Bell,
  LogOut,
  Shield,
  Terminal,
  Activity
} from "lucide-react";


interface Notification {
  id: string;
  type: 'security' | 'system';
  message: string;
  email?: string;
  timestamp: string;
  read: boolean;
}

const AdminDashboard = () => {
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);
  const {
    isMaintenanceMode,
    toggleMaintenanceMode,
    isLoadingMaintenance,
    maintenanceEndTime,
    error: dashboardError
  } = useDashboard();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [adminUser, setAdminUser] = useState({
    email: 'Loading...',
    photoURL: '',
    lastLogin: new Date().toLocaleString()
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [unauthorizedUser, setUnauthorizedUser] = useState({ user: '', ipAddress: '' });

  // Ensure admin is authenticated on mount
  useEffect(() => {
    const adminCheck = async () => {
      const isAdmin = localStorage.getItem('adminAuthenticated') === 'true' || auth?.currentUser?.email === 'vikash.jmbox@gmail.com';

      if (auth?.currentUser) {
        // Set admin user info
        setAdminUser({
          email: auth.currentUser.email || 'Unknown',
          photoURL: auth.currentUser.photoURL || '',
          lastLogin: new Date().toLocaleString()
        });

        // If not admin email, log the attempt and show access denied
        if (auth?.currentUser?.email !== 'vikash.jmbox@gmail.com') {
          const userEmail = auth.currentUser.email || 'unknown';
          const ipAddress = await getIpAddress();

          setUnauthorizedUser({
            user: userEmail,
            ipAddress
          });

          logUnauthorizedAccess(userEmail);
          setAccessDenied(true);
        }
      } else if (!isAdmin) {
        navigate('/');
      }
    };

    const fetchNotifications = async () => {
      // This would typically be a database call
      // For now, we'll simulate with dummy data that would be stored in Firebase
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'security',
          message: 'Unauthorized access attempt from 192.168.1.105',
          email: 'suspicious@example.com',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          read: false
        },
        {
          id: '2',
          type: 'system',
          message: 'Maintenance mode was enabled',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          read: true
        },
        {
          id: '3',
          type: 'security',
          message: 'Multiple failed login attempts detected',
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          read: true
        }
      ];

      setNotifications(mockNotifications);
    };

    adminCheck();
    fetchNotifications();
  }, [navigate]);

  const getIpAddress = async (): Promise<string> => {
    try {
      // In a real application, this would be handled server-side
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Failed to get IP address:', error);
      return 'Unknown';
    }
  };

  const logUnauthorizedAccess = async (email: string) => {
    try {
      // Get user's IP address (would be implemented server-side in a real app)
      const ipAddress = await getIpAddress();

      // Log to Firebase silently without console logging in production
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Unauthorized access attempt by ${email} from IP: ${ipAddress}`);
      }

      // Add to notifications
      const newNotification: Notification = {
        id: Date.now().toString(),
        type: 'security',
        message: `Unauthorized access attempt from ${ipAddress}`,
        email: email,
        timestamp: new Date().toISOString(),
        read: false
      };

      setNotifications(prev => [newNotification, ...prev]);

      // This would typically log to a secure database or send an email alert
      return ipAddress;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error logging unauthorized access:', error);
      }
      return 'Unknown';
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const toggleNotificationPanel = () => {
    setShowNotifications(!showNotifications);
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      localStorage.removeItem('adminAuthenticated');
      localStorage.removeItem('adminBypassedMaintenance');

      if (auth) {
        await signOut(auth);
      }

      // Force redirect to home
      window.location.href = '/';
    } catch (error) {
      console.error("Logout error:", error);
      setLoggingOut(false);
    }
  };

  // Function to render the appropriate content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <AdminStats />;
      case "maintenance":
        return (
          <MaintenanceSettings
            isMaintenanceMode={isMaintenanceMode}
            isLoading={isLoadingMaintenance}
            maintenanceEndTime={maintenanceEndTime}
            toggleMaintenanceMode={toggleMaintenanceMode}
          />
        );
      case "realtime":
        return <RealTimeAnalyticsDashboard />;
      case "users":
        return <UsersPanel />;
      case "projects":
        return <ProjectsPanel />;
      case "resume":
        return <ResumeManagement />;
      case "security":
        return <SecurityPanel />;
      case "devtools":
        return <DevToolsProtection />;
      default:
        return <AdminStats />;
    }
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { id: "maintenance", label: "Maintenance", icon: <Settings size={20} /> },
    { id: "realtime", label: "Real-Time Analytics", icon: <Activity size={20} /> },
    { id: "users", label: "Users", icon: <Users size={20} /> },
    { id: "projects", label: "Projects", icon: <FolderKanban size={20} /> },
    { id: "resume", label: "Resume", icon: <FileText size={20} /> },
    { id: "security", label: "Security", icon: <Shield size={20} /> },
    { id: "devtools", label: "DevTools Protection", icon: <Terminal size={20} /> },
  ];

  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.read).length;

  // If access is denied, show the restricted access page
  if (accessDenied) {
    return (
      <AccessRestricted
        User={unauthorizedUser.user}
        ipAddress={unauthorizedUser.ipAddress}
        darkMode={darkMode}
      />
    );
  }

  // Show loading state
  if (isLoadingMaintenance) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-800 dark:text-gray-200">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 flex">
      {/* Sidebar - collapsible on desktop, overlay on mobile */}
      <div className={`fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } ${sidebarOpen ? 'lg:w-64' : 'lg:w-20'}`}>
        <div className="h-full flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg">
          {/* Sidebar header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            <div className={`flex items-center ${!sidebarOpen && 'lg:hidden'}`}>
              <div className="flex-shrink-0 flex items-center">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-teal-400 flex items-center justify-center">
                  <LayoutDashboard className="h-6 w-6 text-white" />
                </div>
                <h1 className={`ml-3 text-xl font-bold text-gray-800 dark:text-white transition-opacity duration-300 ${
                  !sidebarOpen ? 'lg:opacity-0' : 'lg:opacity-100'
                }`}>Admin Panel</h1>
              </div>
            </div>
            <button
              onClick={toggleSidebar}
              className="hidden lg:block p-2 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              <ChevronRight className={`h-5 w-5 transform transition-transform duration-300 ${
                !sidebarOpen ? 'rotate-0' : 'rotate-180'
              }`} />
            </button>
            <button
              onClick={toggleMobileMenu}
              className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Admin profile in sidebar */}
          <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="relative flex-shrink-0">
                <AdminProfilePhoto size="md" />
              </div>
              <div className={`ml-3 transition-opacity duration-300 ${!sidebarOpen ? 'lg:opacity-0' : 'lg:opacity-100'}`}>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{adminUser.email}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Last login: {adminUser.lastLogin}</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  if (window.innerWidth < 1024) {
                    setMobileMenuOpen(false);
                  }
                }}
                className={`w-full flex items-center px-2 py-3 rounded-lg transition-all duration-200 ${
                  activeSection === item.id
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center justify-center h-8 w-8">
                  {item.icon}
                </div>
                <span className={`ml-3 font-medium transition-opacity duration-300 ${
                  !sidebarOpen ? 'lg:opacity-0 lg:hidden' : 'lg:opacity-100'
                }`}>
                  {item.label}
                </span>
                {activeSection === item.id && (
                  <span className="ml-auto h-2 w-2 bg-blue-500 rounded-full"></span>
                )}
              </button>
            ))}
          </nav>

          {/* Footer items */}
          <div className="px-2 py-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={toggleNotificationPanel}
              className="w-full flex items-center px-2 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 relative"
            >
              <div className="flex items-center justify-center h-8 w-8">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center text-white text-xs">
                    {unreadCount}
                  </span>
                )}
              </div>
              <span className={`ml-3 font-medium transition-opacity duration-300 ${
                !sidebarOpen ? 'lg:opacity-0 lg:hidden' : 'lg:opacity-100'
              }`}>
                Notifications
              </span>
            </button>

            <button
              onClick={toggleDarkMode}
              className="w-full flex items-center px-2 py-3 mt-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
            >
              <div className="flex items-center justify-center h-8 w-8">
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </div>
              <span className={`ml-3 font-medium transition-opacity duration-300 ${
                !sidebarOpen ? 'lg:opacity-0 lg:hidden' : 'lg:opacity-100'
              }`}>
                {darkMode ? 'Light Mode' : 'Dark Mode'}
              </span>
            </button>

            <button
              className="w-full flex items-center px-2 py-3 mt-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              <div className="flex items-center justify-center h-8 w-8">
                {loggingOut ? (
                  <div className="animate-spin h-5 w-5 border-t-2 border-b-2 border-gray-500 rounded-full" />
                ) : (
                  <LogOut size={20} />
                )}
              </div>
              <span className={`ml-3 font-medium transition-opacity duration-300 ${
                !sidebarOpen ? 'lg:opacity-0 lg:hidden' : 'lg:opacity-100'
              }`}>
                {loggingOut ? 'Logging out...' : 'Logout'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu button - shown only on small screens */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-white dark:bg-gray-800 lg:hidden px-4 py-3 shadow-md">
        <button
          onClick={toggleMobileMenu}
          className="p-2 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-teal-400 bg-clip-text text-transparent">
          Admin Panel
        </h1>
        <div className="flex items-center">
          <button
            onClick={toggleNotificationPanel}
            className="relative p-2 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 mr-2"
          >
            <Bell size={22} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 inline-flex items-center justify-center h-4 w-4 text-xs font-bold text-white bg-red-500 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {darkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className={`flex-1 transition-all duration-300 ${
        sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
      }`}>
        {/* Overlay for mobile */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
            onClick={toggleMobileMenu}
          ></div>
        )}

        {/* Notification panel */}
        {showNotifications && (
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white dark:bg-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-gray-200 dark:border-gray-700 overflow-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Notifications</h3>
              <div className="flex space-x-2">
                <button
                  onClick={markAllNotificationsAsRead}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Mark all as read
                </button>
                <button
                  onClick={toggleNotificationPanel}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {notifications.length > 0 ? (
                notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                      !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                    onClick={() => markNotificationAsRead(notification.id)}
                  >
                    <div className="flex items-start">
                      <div className={`rounded-full p-2 mr-3 ${
                        notification.type === 'security'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400'
                      }`}>
                        {notification.type === 'security' ? <ShieldAlert size={16} /> : <Bell size={16} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {notification.type === 'security' ? 'Security Alert' : 'System Notification'}
                          </p>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(notification.timestamp).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {notification.message}
                        </p>
                        {notification.email && (
                          <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                            Email: {notification.email}
                          </p>
                        )}
                        {!notification.read && (
                          <span className="inline-block h-2 w-2 bg-blue-500 rounded-full mt-2"></span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <Bell className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No notifications</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notification overlay */}
        {showNotifications && (
          <div
            className="fixed inset-0 bg-black bg-opacity-25 z-40"
            onClick={toggleNotificationPanel}
          ></div>
        )}

        {/* Page content */}
        <div className="w-full p-4 lg:p-6">
          {/* Mobile top spacing - only on mobile */}
          <div className="h-16 lg:hidden"></div>

          {/* Show error message if exists */}
          {dashboardError && (
            <div className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg animate-fade-in flex items-start">
              <AlertTriangle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Error</p>
                <p>{dashboardError}</p>
              </div>
            </div>
          )}

          <div className="mb-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-teal-400 bg-clip-text text-transparent">
                {navItems.find(item => item.id === activeSection)?.label || 'Dashboard'}
              </h1>
            </div>
          </div>

          {/* Main content area */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 lg:p-6 transition-all animate-fade-in">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
