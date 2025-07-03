import React, { useEffect, useRef, useState } from 'react';
import { Shield, Lock, Database, AlertCircle, Code, Globe, Server, BookOpen } from 'lucide-react';

interface AboutProps {
  darkMode: boolean;
}

const About: React.FC<AboutProps> = ({ darkMode }) => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.2,
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  return (
    <section 
      ref={sectionRef}
      id="about" 
      className="py-24 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 relative isolate overflow-hidden z-10"
    >
      <div className="absolute inset-0 -z-10"></div>
      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className={`transition-all transform duration-1000 ease-out
          ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gradient">
            About Me
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-teal-400 mx-auto mb-6"></div>
          <h3 className="text-xl md:text-2xl font-medium text-center mb-12 dark:text-gray-300">
            Full-Stack Developer | Cybersecurity Analyst
          </h3>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div className={`space-y-6 text-lg leading-relaxed transition-all duration-1000 delay-300
            ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}
          >
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-3 text-blue-600 dark:text-blue-400 flex items-center">
                <BookOpen className="mr-2 h-5 w-5" /> Professional Journey
              </h3>
              <p className="dark:text-gray-300 text-justify">
                As a recent graduate from Bharathiar University with a Bachelor's in Computer Science, I'm a passionate technologist driven by innovation and continuous learning. My expertise spans full-stack development and cybersecurity, with a keen interest in creating robust, efficient applications.
              </p>
            </div>
            
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-3 text-blue-600 dark:text-blue-400 flex items-center">
                <Code className="mr-2 h-5 w-5" /> Technical Expertise
              </h3>
              <p className="dark:text-gray-300 text-justify">
                My programming arsenal includes C, Python, HTML, Java, JavaScript, CSS, PHP, and MySQL. I'm not just coding; I'm crafting solutions that push technological boundaries and solve real-world challenges.
              </p>
            </div>
            
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-3 text-blue-600 dark:text-blue-400 flex items-center">
                <Globe className="mr-2 h-5 w-5" /> Personal Passions
              </h3>
              <p className="dark:text-gray-300 text-justify">
                Beyond code, I'm a multifaceted individual. When I'm not developing applications, you'll find me sketching creative designs, maintaining fitness at the gym, or exploring the depths of technical literature.
              </p>
            </div>
            
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-3 text-blue-600 dark:text-blue-400 flex items-center">
                <Server className="mr-2 h-5 w-5" /> Current Objective
              </h3>
              <p className="dark:text-gray-300 text-justify">
                Seeking a challenging position as a Full-Stack Developer or Cybersecurity Analyst where I can leverage my technical skills, creativity, and passion for innovative technology solutions.
              </p>
            </div>
          </div>
          
          <div className={`transition-all duration-1000 delay-500
            ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md transition-transform duration-300 hover:scale-105">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4">
                  <Shield className="text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold mb-2 dark:text-white">Network Security</h3>
                <p className="text-gray-600 dark:text-gray-400">Protecting network infrastructure from unauthorized access</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md transition-transform duration-300 hover:scale-105">
                <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4">
                  <Lock className="text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-bold mb-2 dark:text-white">Penetration Testing</h3>
                <p className="text-gray-600 dark:text-gray-400">Identifying vulnerabilities through simulated attacks</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md transition-transform duration-300 hover:scale-105">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4">
                  <Code className="text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-bold mb-2 dark:text-white">Full-Stack Development</h3>
                <p className="text-gray-600 dark:text-gray-400">Building end-to-end web applications with modern technologies</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md transition-transform duration-300 hover:scale-105">
                <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4">
                  <AlertCircle className="text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-xl font-bold mb-2 dark:text-white">Incident Response</h3>
                <p className="text-gray-600 dark:text-gray-400">Rapid detection and mitigation of security breaches</p>
              </div>
            </div>
            
            <div className="mt-8 bg-gradient-to-r from-blue-500/10 to-teal-500/10 dark:from-blue-500/20 dark:to-teal-500/20 p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold mb-4 dark:text-white">Skills Highlight</h3>
              <div className="flex flex-wrap gap-2">
                {["Python", "Java", "JavaScript", "TypeScript", "React", "Node.js", "HTML5", "CSS3", "PHP", "MySQL", "MongoDB", "Git", "Docker", "Security Frameworks", "Penetration Testing", "Threat Analysis", "Vulnerability Assessment"].map(skill => (
                  <span key={skill} className="px-3 py-1 bg-white/50 dark:bg-gray-700/50 rounded-full text-sm font-medium dark:text-gray-300">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;