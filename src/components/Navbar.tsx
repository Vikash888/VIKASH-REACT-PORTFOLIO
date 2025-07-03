import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sun, Moon, Home } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../config/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import SignInModal from './auth/SignInModal';

interface NavbarProps {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

const Navbar: React.FC<NavbarProps> = ({ darkMode, setDarkMode }) => {
  const [scrolled, setScrolled] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const logoClickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const urlUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Debounce function to prevent too many URL updates when scrolling
  const debounceUrlUpdate = useCallback((section: string) => {
    if (urlUpdateTimeoutRef.current) {
      clearTimeout(urlUpdateTimeoutRef.current);
    }

    urlUpdateTimeoutRef.current = setTimeout(() => {
      // Only update if the URL doesn't already match the current section
      const targetPath = section === 'home' ? '/' : `/${section}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState({}, '', targetPath);
      }
    }, 300); // 300ms debounce time
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);

      // Calculate scroll progress for the progress bar
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height);
      setScrollProgress(scrolled);

      // Determine which section is in view
      const sections = ['home', 'about', 'skills', 'projects', 'education', 'contact'];

      // Always update active section based on scroll position, regardless of current URL
      // This ensures consistent behavior across all pages since we now show all sections

      // Default to home if at the top
      if (window.scrollY < 200) {
        setActiveSection('home');
        // Update URL to reflect home section using debounce
        debounceUrlUpdate('home');
        return;
      }

      // Find the current section based on scroll position
      for (const section of sections) {
        if (section === 'home') continue; // Skip home section check

        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          // Check if the section is visible in the viewport
          if (rect.top <= 150 && rect.bottom >= 150) {
            setActiveSection(section);

            // Update URL to reflect current section without triggering a page reload
            // Use debounce to prevent too many history updates
            debounceUrlUpdate(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      // Clean up any pending URL update timeouts
      if (urlUpdateTimeoutRef.current) {
        clearTimeout(urlUpdateTimeoutRef.current);
      }
    };
  }, [location.pathname, debounceUrlUpdate]);

  // Handle logo click for admin access - count clicks and open modal on triple-click
  const handleLogoClick = () => {
    // Increment click count
    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);

    // Reset click count after 1 second of inactivity
    if (logoClickTimerRef.current) {
      clearTimeout(logoClickTimerRef.current);
    }

    logoClickTimerRef.current = setTimeout(() => {
      setLogoClickCount(0);
    }, 1000);

    // If this is the third click, open the sign-in modal
    if (newCount === 3) {
      setShowSignInModal(true);
      setLogoClickCount(0);
      if (logoClickTimerRef.current) {
        clearTimeout(logoClickTimerRef.current);
      }
    }
  };

  // Direct Google auth method - kept for backup
  const handleDirectAuth = async () => {
    try {
      setAuthenticating(true);

      if (!auth) {
        console.error('Authentication system not initialized');
        return;
      }

      const provider = new GoogleAuthProvider();
      provider.addScope('email');

      const result = await signInWithPopup(auth, provider);

      if (!result || !result.user) {
        throw new Error('Authentication failed. No user data received.');
      }

      // Check for admin email
      if (result.user.email === 'vikash.jmbox@gmail.com') {
        console.log("Admin authentication successful!");

        try {
          // Store auth info in localStorage
          localStorage.setItem('adminAuthenticated', 'true');

          // Navigate to admin page
          navigate('/admin');
        } catch (error) {
          console.error("Error during admin navigation:", error);
        }
      } else {
        console.log("Not an admin email:", result.user.email);
        // Show some notification here if needed
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      // Only log the error, don't show UI for it
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error('Admin authentication failed:', error.message);
      }
    } finally {
      setAuthenticating(false);
    }
  };

  // Handle home button click
  const handleHomeClick = (e: React.MouseEvent) => {
    e.preventDefault();

    // Always update URL to reflect the home page
    navigate('/');
    debounceUrlUpdate('home');
    setActiveSection('home');

    // Always scroll to top with smooth behavior
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Handle section link click
  const handleSectionClick = (section: string, e: React.MouseEvent) => {
    e.preventDefault();

    // Update URL to reflect the current section
    navigate(`/${section}`);
    debounceUrlUpdate(section);
    setActiveSection(section);

    // Scroll to the section
    const sectionElement = document.getElementById(section);
    if (sectionElement) {
      // Add a small delay to ensure the DOM is updated
      setTimeout(() => {
        // Get the navbar height to offset the scroll position
        const navbarHeight = document.querySelector('nav')?.offsetHeight || 70;
        
        // Scroll to section with offset for navbar
        window.scrollTo({
          top: sectionElement.offsetTop - navbarHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  };

  // Check if a route is active based on pathname (kept for future use)
  // const isRouteActive = (path: string) => {
  //   if (path === '/' && location.pathname === '/') return true;
  //   if (path !== '/' && location.pathname === path) return true;
  //   return false;
  // };

  // Update active section based on current pathname and scroll to it
  useEffect(() => {
    // Map of paths to section IDs
    const pathToSection: Record<string, string> = {
      '/': 'home',
      '/about': 'about',
      '/skills': 'skills',
      '/projects': 'projects',
      '/education': 'education',
      '/contact': 'contact'
    };

    const currentSection = pathToSection[location.pathname];

    if (currentSection) {
      setActiveSection(currentSection);

      // Scroll to the section if it's not the initial page load
      if (document.readyState === 'complete') {
        const sectionElement = document.getElementById(currentSection);
        if (sectionElement && currentSection !== 'home') {
          // Add a small delay to ensure the DOM is updated
          setTimeout(() => {
            // Get the navbar height to offset the scroll position
            const navbarHeight = document.querySelector('nav')?.offsetHeight || 70;
            
            // Scroll to section with offset for navbar
            window.scrollTo({
              top: sectionElement.offsetTop - navbarHeight,
              behavior: 'smooth'
            });
          }, 100);
        } else if (currentSection === 'home') {
          // Scroll to top for home section
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [location.pathname]);

  return (
    <>
      {/* Fixed progress bar at top of page */}
      <div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 z-50"
        style={{ transform: `scaleX(${scrollProgress})` }}
      ></div>

      <nav className={`sticky top-0 z-40 transition-all duration-300 ease-in-out
        ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}
        ${scrolled ? 'shadow-lg py-2' : 'py-4'}`}>
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
          <div
            onClick={handleLogoClick}
            className={`text-2xl font-bold bg-gradient-to-r from-blue-500 to-teal-500 bg-clip-text text-transparent
              hover:from-teal-500 hover:to-blue-500 transition-all duration-500 cursor-pointer relative
              ${authenticating ? 'opacity-70' : 'opacity-100'}`}
          >
            VIKASH J
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-full transition-all duration-300 ${
                darkMode ? 'hover:bg-gray-700 text-yellow-300 hover:text-yellow-200' :
                'hover:bg-gray-100 text-gray-600 hover:text-blue-500'
              }`}
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <Sun size={24} /> : <Moon size={24} />}
            </button>

            <Link
              to="/"
              onClick={handleHomeClick}
              className={`nav-link flex items-center gap-1 relative py-2
              after:content-[''] after:absolute after:w-0 after:h-0.5 after:bottom-0 after:left-0
              hover:after:w-full after:bg-blue-500 after:transition-all after:duration-300
              ${activeSection === 'home'
                ? 'text-blue-500 after:w-full font-medium'
                : darkMode ? 'text-white hover:text-blue-300' : 'text-gray-800 hover:text-blue-600'}`}
            >
              <Home size={18} /> Home
            </Link>

            <Link
              to="/about"
              onClick={(e) => handleSectionClick('about', e)}
              className={`nav-link relative py-2
              after:content-[''] after:absolute after:w-0 after:h-0.5 after:bottom-0 after:left-0
              hover:after:w-full after:bg-blue-500 after:transition-all after:duration-300
              ${activeSection === 'about'
                ? 'text-blue-500 after:w-full font-medium'
                : darkMode ? 'text-white hover:text-blue-300' : 'text-gray-800 hover:text-blue-600'}`}
            >
              About
            </Link>

            <Link
              to="/skills"
              onClick={(e) => handleSectionClick('skills', e)}
              className={`nav-link relative py-2
              after:content-[''] after:absolute after:w-0 after:h-0.5 after:bottom-0 after:left-0
              hover:after:w-full after:bg-blue-500 after:transition-all after:duration-300
              ${activeSection === 'skills'
                ? 'text-blue-500 after:w-full font-medium'
                : darkMode ? 'text-white hover:text-blue-300' : 'text-gray-800 hover:text-blue-600'}`}
            >
              Skills
            </Link>

            <Link
              to="/projects"
              onClick={(e) => handleSectionClick('projects', e)}
              className={`nav-link relative py-2
              after:content-[''] after:absolute after:w-0 after:h-0.5 after:bottom-0 after:left-0
              hover:after:w-full after:bg-blue-500 after:transition-all after:duration-300
              ${activeSection === 'projects'
                ? 'text-blue-500 after:w-full font-medium'
                : darkMode ? 'text-white hover:text-blue-300' : 'text-gray-800 hover:text-blue-600'}`}
            >
              Projects
            </Link>

            <Link
              to="/education"
              onClick={(e) => handleSectionClick('education', e)}
              className={`nav-link relative py-2
              after:content-[''] after:absolute after:w-0 after:h-0.5 after:bottom-0 after:left-0
              hover:after:w-full after:bg-blue-500 after:transition-all after:duration-300
              ${activeSection === 'education'
                ? 'text-blue-500 after:w-full font-medium'
                : darkMode ? 'text-white hover:text-blue-300' : 'text-gray-800 hover:text-blue-600'}`}
            >
              Education
            </Link>

            <Link
              to="/contact"
              onClick={(e) => handleSectionClick('contact', e)}
              className={`nav-link relative py-2
              after:content-[''] after:absolute after:w-0 after:h-0.5 after:bottom-0 after:left-0
              hover:after:w-full after:bg-blue-500 after:transition-all after:duration-300
              ${activeSection === 'contact'
                ? 'text-blue-500 after:w-full font-medium'
                : darkMode ? 'text-white hover:text-blue-300' : 'text-gray-800 hover:text-blue-600'}`}
            >
              Contact
            </Link>
          </div>
        </div>
      </nav>

      {/* SignIn Modal */}
      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
      />
    </>
  );
};

// Helper function is kept for future use if needed
// const getActiveSectionGradient = (section: string): string => {
//   switch (section) {
//     case 'home':
//       return 'from-blue-500 to-teal-500';
//     case 'about':
//       return 'from-purple-500 to-blue-500';
//     case 'skills':
//       return 'from-teal-500 to-green-500';
//     case 'projects':
//       return 'from-blue-500 to-indigo-500';
//     case 'education':
//       return 'from-orange-500 to-red-500';
//     case 'contact':
//       return 'from-pink-500 to-purple-500';
//     default':
//       return 'from-blue-500 to-teal-500';
//   }
// };

export default Navbar;