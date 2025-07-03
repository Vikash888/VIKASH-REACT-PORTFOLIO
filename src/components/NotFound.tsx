import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ref, set, get } from 'firebase/database';
import { database } from '../config/firebase';
import './NotFound.css';

const NotFound: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSitemap, setShowSitemap] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    show: boolean;
    title: string;
    content: string;
    type: 'info' | 'warning' | 'success';
  } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchQuery.trim()) return;

    const query = searchQuery.toLowerCase().trim();

    // Check for Code0 to activate maintenance mode
    if (query === 'code0') {
      try {
        // Check if database is available
        if (!database) {
          throw new Error("Database not available");
        }

        // Set maintenance mode to true
        const maintenanceRef = ref(database, 'maintenance');
        const snapshot = await get(maintenanceRef);

        if (snapshot.exists()) {
          const data = snapshot.val();
          // Set end time to 2 hours from now
          const endTime = new Date();
          endTime.setHours(endTime.getHours() + 2);

          await set(maintenanceRef, {
            ...data,
            enabled: true,
            message: "Maintenance mode activated from 404 page. Code0 protocol initiated.",
            endTime: endTime.toISOString(),
            updatedAt: Date.now()
          });

          setSearchResult({
            show: true,
            title: "Maintenance Mode Activated",
            content: "Code0 protocol initiated. The site will enter maintenance mode.",
            type: 'warning'
          });

          // Redirect to maintenance page after 3 seconds
          setTimeout(() => {
            navigate('/maintenance');
            // Update URL to reflect the maintenance page
            window.history.pushState({}, '', '/maintenance');
          }, 3000);
        }
      } catch (error) {
        console.error("Error activating maintenance mode:", error);
        setSearchResult({
          show: true,
          title: "Error",
          content: "Failed to activate maintenance mode. Please try again.",
          type: 'warning'
        });
      }
    }
    // Check for vikash to show information
    else if (query.includes('vikash')) {
      setSearchResult({
        show: true,
        title: "About Vikash",
        content: "Vikash is a cybersecurity expert and full-stack developer with expertise in React, Node.js, and cloud technologies. He specializes in building secure, scalable web applications.",
        type: 'info'
      });
    }
    // Default behavior
    else {
      // Clear any previous search results
      setSearchResult(null);
      // Navigate to home page
      navigate('/');
      // Update URL to reflect the home page
      window.history.pushState({}, '', '/');
    }
  };

  const handleSitemapClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowSitemap(true);
  };

  // Effect to update URL when component mounts
  useEffect(() => {
    // Only update the URL if we're on the catch-all route (*) and not an explicit 404 navigation
    // This prevents overriding valid URLs with the 404 page
    if (location.pathname !== '/404' && !location.pathname.startsWith('/404') && location.state?.from === 'catch-all') {
      // Update URL to reflect the 404 page
      window.history.pushState({}, '', '/404');
    }
  }, [location.pathname, location.state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Star properties
    const stars: Array<{ x: number; y: number; size: number; speed: number }> = [];
    const numStars = 200;

    // Initialize stars
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2,
        speed: Math.random() * 0.5 + 0.1
      });
    }

    // Animation function
    const animate = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      stars.forEach(star => {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        star.y += star.speed;
        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Sitemap component
  const Sitemap = () => {
    const handleLinkClick = (path: string) => {
      setShowSitemap(false);
      // Navigate to the path and update the URL
      navigate(path, { replace: false });
      // Update browser history to reflect the current page
      window.history.pushState({}, '', path);
    };

    return (
      <div className="sitemap-container">
        <div className="sitemap-header">
          <h2>Site Map</h2>
          <button
            onClick={() => setShowSitemap(false)}
            className="close-button"
          >
            ×
          </button>
        </div>
        <div className="sitemap-content">
          <div className="sitemap-section">
            <h3>Main Pages</h3>
            <ul>
              <li><button onClick={() => handleLinkClick('/')} className="sitemap-link">Home</button></li>
              <li><button onClick={() => handleLinkClick('/about')} className="sitemap-link">About</button></li>
              <li><button onClick={() => handleLinkClick('/skills')} className="sitemap-link">Skills</button></li>
              <li><button onClick={() => handleLinkClick('/projects')} className="sitemap-link">Projects</button></li>
              <li><button onClick={() => handleLinkClick('/education')} className="sitemap-link">Education</button></li>
              <li><button onClick={() => handleLinkClick('/contact')} className="sitemap-link">Contact</button></li>
            </ul>
          </div>
          <div className="sitemap-section">
            <h3>Other Pages</h3>
            <ul>
              <li><button onClick={() => handleLinkClick('/404')} className="sitemap-link">404 Page</button></li>
              <li><button onClick={() => handleLinkClick('/maintenance')} className="sitemap-link">Maintenance</button></li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="not-found-page">
      <canvas
        ref={canvasRef}
        className="stars-canvas"
      />
      <div className="container">
        {showSitemap && <Sitemap />}

        <div className="error-content">
          <div className="error-left">
            <div className="error-code-left">
              <div className="digit">4</div>
            </div>
            <div className="gif-container">
              <img src="/assets/404%20Error.gif" alt="404 Error" className="error-gif" />
            </div>
            <div className="error-code-right">
              <div className="digit">4</div>
            </div>
          </div>
          <div className="error-right">
            <h1>You've Reached Uncharted Space</h1>
            <p>
              {location.pathname !== '/404' ? (
                <>The page <code className="not-found-url">{location.pathname}</code> could not be found. It has either floated away into the cosmic void or doesn't exist in this universe.</>
              ) : (
                <>The page you're looking for has either floated away into the cosmic void or doesn't exist in this universe.</>
              )}
              {' '}Let's navigate back to familiar territory!
            </p>

            {/* Search Result Display */}
            {searchResult && searchResult.show && (
              <div className={`search-result ${searchResult.type}`}>
                <h3>{searchResult.title}</h3>
                <p>{searchResult.content}</p>
              </div>
            )}

            <div className="action-area">
              <div className="buttons">
                <Link
                  className="btn btn-primary"
                  to="/"
                  data-discover="true"
                  onClick={() => {
                    // Update URL to reflect the home page
                    window.history.pushState({}, '', '/');
                  }}
                >
                  <span className="btn-icon">🏠</span>
                  Return to Base
                </Link>
                <button
                  className="btn btn-secondary"
                  onClick={handleSitemapClick}
                  data-discover="true"
                >
                  <span className="btn-icon">🗺️</span>
                  View Sitemap
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    navigate('/contact');
                    // Update URL to reflect the contact page
                    window.history.pushState({}, '', '/contact');
                  }}
                  data-discover="true"
                >
                  <span className="btn-icon">📡</span>
                  Report Issue
                </button>
              </div>
              <div className="search-container">
                <form onSubmit={handleSearch} className="search-box">
                  <input
                    type="text"
                    placeholder="Search"
                    className="search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button type="submit" className="search-button">Search</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;