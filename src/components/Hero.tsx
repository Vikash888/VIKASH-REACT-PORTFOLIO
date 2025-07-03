import React, { useEffect, useState } from 'react';
import { Github, Twitter, Linkedin, ChevronDown, Download } from 'lucide-react';
import { resumeService } from '../services/unifiedResumeService';
import logger from '../utils/logger';

interface HeroProps {
  darkMode: boolean;
}

const Hero: React.FC<HeroProps> = ({ darkMode }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [resumeAvailable, setResumeAvailable] = useState(false);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeLoading, setResumeLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  useEffect(() => {
    // Trigger animation after component mounts
    setIsVisible(true);
    
    // Fetch resume URL from Firebase RTDB and prepare direct download link
    const fetchResume = async () => {
      try {
        setResumeLoading(true);
        const url = await resumeService.getResumeDownloadUrl();
        const available = !!url;
        setResumeAvailable(available);
        if (available && url) {
          // Generate Cloudinary attachment URL to force download
          const resumeData = await resumeService.getCurrentResume();
          const fileName = resumeData?.fileName || 'resume';
          
          // Try multiple download URL strategies
          let directUrl;
          try {
            directUrl = resumeService.getBestDownloadUrl(url, fileName);
          } catch (error) {
            logger.warn('hero', 'Failed to generate best download URL, using simple method:', error);
            try {
              directUrl = resumeService.getSimpleDownloadUrl(url);
            } catch (simpleError) {
              logger.warn('hero', 'Simple download URL also failed, using original:', simpleError);
              directUrl = url;
            }
          }
          
          // Debug logging to help troubleshoot download issues
          logger.log('hero', 'Resume download setup:', {
            originalUrl: url,
            fileName: fileName,
            directUrl: directUrl,
            resumeData: resumeData ? {
              id: resumeData.id,
              fileName: resumeData.fileName,
              storageType: resumeData.storageType,
              version: resumeData.version
            } : null
          });
          
          setResumeUrl(directUrl);
        }
      } catch (error) {
        logger.error('hero', 'Error fetching resume URL:', error);
        setResumeAvailable(false);
      } finally {
        setResumeLoading(false);
      }
    };
    fetchResume();
  }, []);

  const gradientBg = darkMode 
    ? 'bg-gradient-to-r from-purple-900 via-blue-900 to-teal-900'
    : 'bg-gradient-to-r from-purple-100 via-blue-100 to-teal-100';

  return (
    <section className={`relative h-screen flex items-center ${gradientBg}`}>
      <div 
        className={`max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between transition-all duration-1000 ease-out
          ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <div className="md:w-1/2 text-center md:text-left">
          <h1 
            className={`text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 transition-all duration-1000 delay-300
              ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}
              ${darkMode ? 'text-white' : 'text-gray-800'}`}
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-teal-400">
              Hi, I'm Vikash
            </span>
          </h1>
          
          <p 
            className={`text-xl md:text-2xl mb-8 transition-all duration-1000 delay-500
              ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}
              ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
          >
            Cybersecurity Analyst & Security Expert
          </p>
          
          <div 
            className={`flex justify-center md:justify-start gap-6 transition-all duration-1000 delay-700
              ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          >
            <a 
              href="https://linkedin.com/in/vikashmca" 
              target="_blank" 
              rel="noopener noreferrer"
              className={`transform hover:scale-125 transition-all duration-300 p-3 rounded-full
                ${darkMode ? 'hover:bg-blue-900/30' : 'hover:bg-blue-100'}`}
              aria-label="LinkedIn Profile"
            >
              <Linkedin className={`w-6 h-6 ${darkMode ? 'text-blue-300 hover:text-blue-100' : 'text-blue-600 hover:text-blue-800'}`} />
            </a>
            
            <a 
              href="https://github.com/Vikash888" 
              target="_blank" 
              rel="noopener noreferrer"
              className={`transform hover:scale-125 transition-all duration-300 p-3 rounded-full
                ${darkMode ? 'hover:bg-purple-900/30' : 'hover:bg-purple-100'}`}
              aria-label="GitHub Profile"
            >
              <Github className={`w-6 h-6 ${darkMode ? 'text-purple-300 hover:text-purple-100' : 'text-purple-600 hover:text-purple-800'}`} />
            </a>
            
            <a 
              href="https://x.com/VIKASHJ61079581" 
              target="_blank" 
              rel="noopener noreferrer"
              className={`transform hover:scale-125 transition-all duration-300 p-3 rounded-full
                ${darkMode ? 'hover:bg-blue-900/30' : 'hover:bg-blue-100'}`}
              aria-label="Twitter Profile"
            >
              <Twitter className={`w-6 h-6 ${darkMode ? 'text-blue-300 hover:text-blue-100' : 'text-blue-500 hover:text-blue-700'}`} />
            </a>
          </div>
          
          <div className={`mt-10 transition-all duration-1000 delay-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex flex-wrap gap-4">
              <a href="#contact">
                <button
                  className={`px-6 py-3 rounded-full font-semibold shadow-lg transform hover:translate-y-1 transition-all duration-300
                    ${darkMode 
                      ? 'bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white' 
                      : 'bg-gradient-to-r from-blue-500 to-teal-400 hover:from-blue-600 hover:to-teal-500 text-white'}`}
                >
                  Contact Me
                </button>
              </a>
              {resumeLoading ? (
                <button
                  disabled
                  className={`px-6 py-3 rounded-full font-semibold shadow-lg transition-all duration-300 flex items-center gap-2
                    ${darkMode 
                      ? 'bg-gray-600 text-gray-300 cursor-not-allowed' 
                      : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
                >
                  <Download size={18} className="animate-spin" />
                  Loading...
                </button>
              ) : resumeAvailable && resumeUrl ? (
                <a
                  href={resumeUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    // Log download attempt for debugging
                    logger.log('hero', 'Resume download initiated:', { url: resumeUrl });
                    
                    // Test if the URL is accessible (optional)
                    if (!resumeUrl.includes('cloudinary.com') && !resumeUrl.includes('firebasestorage.googleapis.com')) {
                      logger.warn('hero', 'Download URL does not appear to be from a known CDN:', resumeUrl);
                    }
                    
                    // Add error handling for failed downloads
                    setTimeout(() => {
                      // Check if download started by testing if the link is still focused
                      // This is a simple heuristic to detect download issues
                      const testUrl = async () => {
                        try {
                          const response = await fetch(resumeUrl, { method: 'HEAD' });
                          if (!response.ok) {
                            logger.error('hero', 'Download URL returned error:', response.status);
                            // Try to get the raw URL instead
                            const resumeData = await resumeService.getCurrentResume();
                            if (resumeData) {
                              logger.log('hero', 'Attempting fallback download with raw URL');
                              window.open(resumeData.fileUrl, '_blank');
                            }
                          }
                        } catch (error) {
                          logger.error('hero', 'Failed to test download URL:', error);
                        }
                      };
                      testUrl();
                    }, 1000);
                  }}
                  className={`px-6 py-3 rounded-full font-semibold shadow-lg transform hover:translate-y-1 transition-all duration-300 flex items-center gap-2
                    ${darkMode
                      ? 'bg-white text-blue-600 hover:bg-gray-100'
                      : 'bg-gray-800 text-white hover:bg-gray-900'}`}
                >
                  <Download size={18} />
                  Download Resume
                </a>
              ) : (
                <button
                  onClick={() => alert('Resume is currently being updated. Please check back later!')}
                  className={`px-6 py-3 rounded-full font-semibold shadow-lg transition-all duration-300 flex items-center gap-2
                    ${darkMode 
                      ? 'bg-gray-400 text-gray-800 cursor-not-allowed' 
                      : 'bg-gray-400 text-white cursor-not-allowed'}`}
                >
                  <Download size={18} />
                  Resume Updating
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div 
          className={`mt-12 md:mt-0 relative transition-all duration-1000 delay-700
            ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}
        >
          <div 
            className={`w-64 h-64 md:w-80 md:h-80 rounded-full overflow-hidden 
              ${darkMode ? 'ring-4 ring-blue-500/50' : 'ring-4 ring-blue-400'}
              shadow-2xl transform transition-all duration-500 hover:scale-105`}
          >
            {imageError ? (
              <img
                src="/assets/images/Vikash.svg"
                alt="Vikash Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src="/assets/images/Vikash.png"
                alt="Vikash Profile"
                className={`w-full h-full object-cover ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  console.log('Image failed to load, using SVG fallback');
                  setImageError(true);
                }}
              />
            )}
          </div>
          
          {/* Decorative circles */}
          <div className="absolute -z-10 w-full h-full top-0 left-0">
            <div className={`absolute w-20 h-20 rounded-full -top-6 -left-6 animate-pulse-slow ${darkMode ? 'bg-blue-500/20' : 'bg-blue-300/40'}`}></div>
            <div className={`absolute w-12 h-12 rounded-full bottom-10 -right-6 animate-pulse-slow animation-delay-1000 ${darkMode ? 'bg-teal-500/20' : 'bg-teal-300/40'}`}></div>
          </div>
        </div>
      </div>
      
      {/* Scroll down indicator */}
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce-slow">
        <a href="#about" className={`flex flex-col items-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          <span className="text-sm mb-1">Scroll Down</span>
          <ChevronDown className="w-6 h-6" />
        </a>
      </div>
    </section>
  );
};

export default Hero;