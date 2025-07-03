import React, { useRef, useState } from 'react';
import useIntersectionObserver from '../hooks/useIntersectionObserver';
import { Code, Database, Cpu, Globe, Shield, Lock, LineChart } from 'lucide-react';

interface SkillsProps {
  darkMode: boolean;
}

// Updated interface to properly handle both skill types
interface SkillItem {
  name: string;
  icon?: string;
  proficiency?: number; // Keep this for potential future use
}

// Interface for skill category
interface SkillCategory {
  category: string;
  icon: React.ReactNode;
  bgColor: string;
  iconColor: string;
  skills: SkillItem[];
}

// Define color types
type ColorType = 'blue' | 'purple' | 'teal' | 'amber' | 'red' | 'green' | 'indigo';

const Skills: React.FC<SkillsProps> = ({ darkMode }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const isVisible = useIntersectionObserver(sectionRef, { threshold: 0.1 });
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const skillCategories: SkillCategory[] = [
    {
      category: "Programming Languages",
      icon: <Code className="h-8 w-8" />,
      bgColor: darkMode ? "bg-blue-900/20" : "bg-blue-100",
      iconColor: darkMode ? "text-blue-400" : "text-blue-600",
      skills: [
        { name: "Python", icon: "/assets/icons/python.svg", proficiency: 90 },
        { name: "Java", icon: "/assets/icons/java.svg", proficiency: 85 },
        { name: "JavaScript", icon: "/assets/icons/javascript.svg", proficiency: 95 },
        { name: "C++", icon: "/assets/icons/cpp.svg", proficiency: 75 },
        { name: "TypeScript", icon: "/assets/icons/typescript.svg", proficiency: 88 }
      ] as SkillItem[]
    },
    {
      category: "Web Technologies",
      icon: <Globe className="h-8 w-8" />,
      bgColor: darkMode ? "bg-purple-900/20" : "bg-purple-100",
      iconColor: darkMode ? "text-purple-400" : "text-purple-600",
      skills: [
        { name: "React", icon: "/assets/icons/react.svg", proficiency: 92 },
        { name: "HTML5", icon: "/assets/icons/html5.svg", proficiency: 98 },
        { name: "CSS3", icon: "/assets/icons/css3.svg", proficiency: 90 },
        { name: "NodeJS", icon: "/assets/icons/nodejs.svg", proficiency: 85 },
        { name: "Express", icon: "/assets/icons/express.svg", proficiency: 80 }
      ] as SkillItem[]
    },
    {
      category: "Databases",
      icon: <Database className="h-8 w-8" />,
      bgColor: darkMode ? "bg-teal-900/20" : "bg-teal-100",
      iconColor: darkMode ? "text-teal-400" : "text-teal-600",
      skills: [
        { name: "MongoDB", icon: "/assets/icons/mongodb.svg", proficiency: 88 },
        { name: "MySQL", icon: "/assets/icons/mysql.svg", proficiency: 85 },
        { name: "PostgreSQL", icon: "/assets/icons/postgresql.svg", proficiency: 82 }
      ] as SkillItem[]
    },
    {
      category: "Tools & Platforms",
      icon: <Cpu className="h-8 w-8" />,
      bgColor: darkMode ? "bg-amber-900/20" : "bg-amber-100",
      iconColor: darkMode ? "text-amber-400" : "text-amber-600",
      skills: [
        { name: "Git", icon: "/assets/icons/git.svg", proficiency: 95 },
        { name: "Docker", icon: "/assets/icons/docker.svg", proficiency: 85 },
        { name: "VSCode", icon: "/assets/icons/vscode.svg", proficiency: 90 },
        { name: "Linux", icon: "/assets/icons/linux.svg", proficiency: 80 },
        { name: "AWS", icon: "/assets/icons/aws.svg", proficiency: 78 }
      ] as SkillItem[]
    },
    { 
      category: "Cybersecurity", 
      icon: <Shield className="h-8 w-8" />,
      bgColor: darkMode ? "bg-red-900/20" : "bg-red-100",
      iconColor: darkMode ? "text-red-400" : "text-red-600",
      skills: [
        { name: "Penetration Testing", proficiency: 88 },
        { name: "Vulnerability Assessment", proficiency: 90 },
        { name: "Incident Response", proficiency: 90 },
        { name: "Threat Analysis", proficiency: 92 },
        { name: "Security Frameworks", proficiency: 85 }
      ] as SkillItem[]
    },
    { 
      category: "Security Tools", 
      icon: <Lock className="h-8 w-8" />,
      bgColor: darkMode ? "bg-green-900/20" : "bg-green-100",
      iconColor: darkMode ? "text-green-400" : "text-green-600",
      skills: [
        { name: "Wireshark", proficiency: 92 },
        { name: "Metasploit", proficiency: 85 },
        { name: "Nessus", proficiency: 80 },
        { name: "Burp Suite", proficiency: 88 },
        { name: "Vulnerability Scanners", proficiency: 90 }
      ] as SkillItem[]
    },
    {
      category: "Technical Security",
      icon: <LineChart className="h-8 w-8" />,
      bgColor: darkMode ? "bg-indigo-900/20" : "bg-indigo-100",
      iconColor: darkMode ? "text-indigo-400" : "text-indigo-600",
      skills: [
        { name: "Network Security", proficiency: 90 },
        { name: "Cloud Security", proficiency: 85 },
        { name: "Ethical Hacking", proficiency: 88 },
        { name: "Risk Assessment", proficiency: 90 },
        { name: "Security Auditing", proficiency: 85 }
      ] as SkillItem[]
    }
  ];

  // Get all unique categories for filtering
  const categories = [...new Set(skillCategories.map(category => category.category))];

  // Filter skills based on active filter
  const filteredCategories = activeFilter 
    ? skillCategories.filter(category => category.category === activeFilter)
    : skillCategories;

  // Get all skills for the hexagon grid
  const allSkills = filteredCategories.flatMap(category => 
    category.skills.map(skill => ({
      ...skill,
      category: category.category,
      colorClass: category.category === "Programming Languages" ? "blue" :
                  category.category === "Web Technologies" ? "purple" :
                  category.category === "Databases" ? "teal" :
                  category.category === "Tools & Platforms" ? "amber" :
                  category.category === "Cybersecurity" ? "red" :
                  category.category === "Security Tools" ? "green" : "indigo"
    }))
  );

  return (
    <section 
      ref={sectionRef}
      id="skills" 
      className={`py-24 ${darkMode 
        ? 'bg-gradient-to-b from-gray-900 to-gray-800 relative overflow-hidden' 
        : 'bg-gradient-to-b from-gray-50 to-white relative overflow-hidden'}`}
    >
      {/* Background decoration - abstract shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/3 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl"></div>
        
        {/* Grid pattern background */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className={`text-center mb-12 transition-all duration-1000 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gradient">
            My Skills
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-teal-400 mx-auto mb-8"></div>
          <p className="text-lg max-w-3xl mx-auto dark:text-gray-300 mb-8">
            I've developed a diverse skill set across programming, web technologies, databases, tools & platforms, and cybersecurity domains.
          </p>

          {/* Category filters */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <button 
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                activeFilter === null 
                  ? 'bg-gradient-to-r from-blue-500 to-teal-400 text-white shadow-md' 
                  : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => setActiveFilter(null)}
            >
              All
            </button>
            {categories.map(category => (
              <button
                key={category}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeFilter === category 
                    ? 'bg-gradient-to-r from-blue-500 to-teal-400 text-white shadow-md' 
                    : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                onClick={() => setActiveFilter(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
        
        {/* Category cards with big icons */}
        <div className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredCategories.map((category) => (
              <div 
                key={category.category}
                className={`relative bg-white/10 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden transition-all duration-500 transform ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
                } hover:scale-105 group`}
              >
                {/* Background gradient */}
                <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-transparent to-blue-500 dark:to-blue-700 group-hover:opacity-30 transition-opacity duration-300"></div>
                
                <div className="p-6 z-10 relative">
                  <div className="flex items-center justify-center mb-5">
                    <div className={`w-20 h-20 ${category.bgColor} rounded-xl flex items-center justify-center ${category.iconColor} shadow-lg transform transition-transform duration-500 group-hover:rotate-6`}>
                      {React.cloneElement(category.icon as React.ReactElement, { className: 'h-10 w-10' })}
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-center mb-4 dark:text-white">{category.category}</h3>
                  
                  <div className="flex flex-wrap justify-center gap-2">
                    {category.skills.map((skill) => (
                      <span 
                        key={`${category.category}-${skill.name}`}
                        className="px-3 py-1 rounded-full text-sm bg-white/20 dark:bg-gray-700/50 backdrop-blur-sm
                          text-gray-800 dark:text-gray-200 border border-gray-200/50 dark:border-gray-700/50"
                      >
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Hexagon grid of skills */}
        <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          <h3 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gradient">
            My Technology Stack
          </h3>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-teal-400 mx-auto mb-8"></div>
          
          <div className="flex flex-wrap justify-center gap-6 md:gap-8">
            {allSkills.map((skill, index) => {
              // Define colors based on skill category
              const colorClasses = {
                blue: darkMode ? "from-blue-900/80 to-blue-700/60" : "from-blue-100 to-blue-300",
                purple: darkMode ? "from-purple-900/80 to-purple-700/60" : "from-purple-100 to-purple-300",
                teal: darkMode ? "from-teal-900/80 to-teal-700/60" : "from-teal-100 to-teal-300",
                amber: darkMode ? "from-amber-900/80 to-amber-700/60" : "from-amber-100 to-amber-300",
                red: darkMode ? "from-red-900/80 to-red-700/60" : "from-red-100 to-red-300",
                green: darkMode ? "from-green-900/80 to-green-700/60" : "from-green-100 to-green-300",
                indigo: darkMode ? "from-indigo-900/80 to-indigo-700/60" : "from-indigo-100 to-indigo-300"
              };
              
              const textColors = {
                blue: darkMode ? "text-blue-300" : "text-blue-800",
                purple: darkMode ? "text-purple-300" : "text-purple-800",
                teal: darkMode ? "text-teal-300" : "text-teal-800",
                amber: darkMode ? "text-amber-300" : "text-amber-800",
                red: darkMode ? "text-red-300" : "text-red-800",
                green: darkMode ? "text-green-300" : "text-green-800",
                indigo: darkMode ? "text-indigo-300" : "text-indigo-800"
              };
              
              const borderColors = {
                blue: darkMode ? "border-blue-500/50" : "border-blue-500/30",
                purple: darkMode ? "border-purple-500/50" : "border-purple-500/30",
                teal: darkMode ? "border-teal-500/50" : "border-teal-500/30",
                amber: darkMode ? "border-amber-500/50" : "border-amber-500/30",
                red: darkMode ? "border-red-500/50" : "border-red-500/30",
                green: darkMode ? "border-green-500/50" : "border-green-500/30",
                indigo: darkMode ? "border-indigo-500/50" : "border-indigo-500/30"
              };
              
              return (
                <div 
                  key={`${skill.category}-${skill.name}-${index}`}
                  className={`skill-icon-container relative w-20 h-28 md:w-24 md:h-32 flex items-center justify-center transition-all duration-500 
                    hover:scale-110 hover:z-10 rounded-xl border-2 ${borderColors[skill.colorClass as ColorType]}`}
                  style={{ 
                    animationDelay: `${index * 100}ms`,
                    animation: 'float 3s ease-in-out infinite alternate'
                  }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[skill.colorClass as ColorType]} rounded-xl shadow-lg`}></div>
                  
                  <div className="absolute inset-0 opacity-10 bg-skill-pattern"></div>
                  
                  <div className="flex flex-col items-center justify-center p-2 z-10 relative">
                    {skill.icon && [
                      "/assets/icons/cpp.svg",
                      "/assets/icons/typescript.svg",
                      "/assets/icons/react.svg",
                      "/assets/icons/nodejs.svg",
                      "/assets/icons/express.svg",
                      "/assets/icons/mongodb.svg",
                      "/assets/icons/mysql.svg",
                      "/assets/icons/postgresql.svg",
                      "/assets/icons/docker.svg",
                      "/assets/icons/vscode.svg",
                      "/assets/icons/linux.svg",
                      "/assets/icons/aws.svg"
                    ].includes(skill.icon) ? (
                      <>
                        <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-transparent rounded-lg shadow-none overflow-visible p-0">
                          <img
                            src={skill.icon}
                            alt={skill.name}
                            className="w-10 h-10 md:w-12 md:h-12 object-contain"
                            style={{
                              background: "none",
                              boxShadow: "none",
                              maxWidth: "100%",
                              maxHeight: "100%"
                            }}
                          />
                        </div>
                        <span className="mt-2 text-xs font-medium text-center max-w-full truncate bg-white/70 dark:bg-gray-900/70 px-2 py-0.5 rounded-md backdrop-blur-sm shadow-sm w-full">
                          {skill.name}
                        </span>
                      </>
                    ) : skill.icon ? (
                      <>
                        <div 
                          className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center ${
                            skill.name === "React" ? "bg-blue-50 dark:bg-blue-900/50" :
                            skill.name === "TypeScript" ? "bg-blue-100 dark:bg-blue-900/70" :
                            skill.name === "MongoDB" ? "bg-green-50 dark:bg-green-900/50" :
                            skill.name === "Docker" ? "bg-blue-50 dark:bg-blue-900/50" :
                            "bg-white dark:bg-gray-800"
                          } rounded-lg shadow-md overflow-hidden p-1`}
                          style={{
                            boxShadow: skill.name === "Docker" || skill.name === "React" ? 
                              "0 4px 6px -1px rgba(14, 165, 233, 0.1), 0 2px 4px -1px rgba(14, 165, 233, 0.06)" :
                              skill.name === "MongoDB" ?
                              "0 4px 6px -1px rgba(16, 185, 129, 0.1), 0 2px 4px -1px rgba(16, 185, 129, 0.06)" :
                              ""
                          }}
                        >
                          <img 
                            src={skill.icon} 
                            alt={skill.name} 
                            className={`w-8 h-8 md:w-9 md:h-9 object-contain ${
                              skill.name === "React" ? "animate-slow-spin" : ""
                            }`}
                            style={{ 
                              filter: "drop-shadow(0px 1px 2px rgba(0,0,0,0.1))",
                              maxWidth: "100%",
                              maxHeight: "100%"
                            }}
                          />
                        </div>
                        <span className="mt-2 text-xs font-medium text-center max-w-full truncate bg-white/70 dark:bg-gray-900/70 px-2 py-0.5 rounded-md backdrop-blur-sm shadow-sm w-full">
                          {skill.name}
                        </span>
                      </>
                    ) : (
                      <>
                        <div className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center ${textColors[skill.colorClass as ColorType]} bg-white/70 dark:bg-gray-800/90 rounded-lg shadow-md`}>
                          {skill.colorClass === "blue" ? <Code className="w-6 h-6" /> :
                           skill.colorClass === "purple" ? <Globe className="w-6 h-6" /> :
                           skill.colorClass === "teal" ? <Database className="w-6 h-6" /> :
                           skill.colorClass === "amber" ? <Cpu className="w-6 h-6" /> :
                           skill.colorClass === "red" ? <Shield className="w-6 h-6" /> :
                           skill.colorClass === "green" ? <Lock className="w-6 h-6" /> :
                           <LineChart className="w-6 h-6" />}
                        </div>
                        <span className="mt-2 text-xs font-medium text-center max-w-full truncate
                          bg-white/70 dark:bg-gray-900/70 px-2 py-0.5 rounded-md backdrop-blur-sm shadow-sm w-full">
                          {skill.name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes float {
            0% {
              transform: translateY(0px);
            }
            100% {
              transform: translateY(-10px);
            }
          }
          
          @keyframes pulse {
            0%, 100% {
              box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4);
            }
            50% {
              box-shadow: 0 0 0 8px rgba(99, 102, 241, 0);
            }
          }

          @keyframes glow {
            0%, 100% {
              box-shadow: 0 0 5px rgba(79, 70, 229, 0.6);
            }
            50% {
              box-shadow: 0 0 20px rgba(79, 70, 229, 0.8);
            }
          }
          
          .bg-grid-pattern {
            background-image: linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px);
            background-size: 20px 20px;
          }
          
          .bg-skill-pattern {
            background-image: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
            background-size: 10px 10px;
          }
          
          .text-gradient {
            background-clip: text;
            -webkit-background-clip: text;
            color: transparent;
            background-image: linear-gradient(to right, #3b82f6, #0ea5e9);
          }
          
          .skill-icon-container {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .skill-icon-container:hover {
            transform: translateY(-8px) scale(1.05);
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            animation: glow 1.5s infinite alternate;
          }
          
          .skill-icon-container:hover img,
          .skill-icon-container:hover svg {
            transform: scale(1.15);
            transition: transform 0.3s ease;
          }
          
          .skill-icon-container img,
          .skill-icon-container svg {
            transition: transform 0.3s ease;
          }
          
          .skill-icon-container:nth-child(odd) {
            animation-duration: 4s;
          }
          
          .skill-icon-container:nth-child(3n+1) {
            animation-delay: 0.5s;
          }
          
          .skill-icon-container:nth-child(3n+2) {
            animation-delay: 1s;
          }
          
          .skill-icon-container:nth-child(3n+3) {
            animation-delay: 1.5s;
          }
        `}
      </style>
    </section>
  );
};

export default Skills;