import React, { useRef } from 'react';
import { GraduationCap, Award, MapPin, BookOpen, Zap, Star, Heart } from 'lucide-react';
import useIntersectionObserver from '../hooks/useIntersectionObserver';

interface EducationProps {
  darkMode: boolean;
}

interface EducationItem {
  degree: string;
  institution: string;
  location: string;
  year: string;
  grade: string;
  description: string;
  icon: string;
}

const Education: React.FC<EducationProps> = ({ darkMode }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const isVisible = useIntersectionObserver(sectionRef, { threshold: 0.1 });

  const educationData: EducationItem[] = [
    {
      degree: "Master of Computer Application",
      institution: "Rathinam Technical Campus, Anna University",
      location: "Tamil Nadu, India",
      year: "2024-2026",
      grade: "Ongoing",
      description: "Currently pursuing Master's degree in Computer Applications with focus on advanced computing concepts, software development, and information technology management.",
      icon: "graduation-cap"
    },
    {
      degree: "B.Sc. Computer Science",
      institution: "Nandha Arts & Science College, Bharathiar University",
      location: "Tamil Nadu, India",
      year: "2021-2024",
      grade: "78.92%",
      description: "Studied core computer science subjects including data structures, algorithms, database management systems, software engineering, and web development.",
      icon: "book"
    },
    {
      degree: "XII (Higher Secondary School)",
      institution: "Shri Janani Matriculation Higher Secondary School",
      location: "Tamil Nadu, India",
      year: "2021",
      grade: "83%",
      description: "Completed higher secondary education with focus on computer science, mathematics, and physics, developing a strong foundation for further technical studies.",
      icon: "book"
    },
    {
      degree: "X (Secondary School)",
      institution: "Shri Janani Matriculation Higher Secondary School",
      location: "Tamil Nadu, India",
      year: "2019",
      grade: "72%",
      description: "Completed secondary education with fundamental knowledge in science, mathematics, and language skills.",
      icon: "book"
    }
  ];

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'graduation-cap':
        return <GraduationCap className="w-6 h-6" />;
      case 'book':
        return <BookOpen className="w-6 h-6" />;
      case 'award':
        return <Award className="w-6 h-6" />;
      default:
        return <GraduationCap className="w-6 h-6" />;
    }
  };

  // Function to generate random animated particles
  const generateParticles = (count: number) => {
    const particles = [];
    for (let i = 0; i < count; i++) {
      const size = Math.random() * 5 + 2;
      const animationDuration = Math.random() * 6 + 3;
      const delay = Math.random() * 5;
      const xPos = Math.random() * 100;
      
      particles.push(
        <div 
          key={i}
          className={`absolute w-${size} h-${size} rounded-full bg-gradient-to-r 
            ${i % 3 === 0 ? 'from-blue-400 to-blue-600' : 
             i % 3 === 1 ? 'from-teal-400 to-teal-600' : 
             'from-purple-400 to-purple-600'} 
            opacity-70 animate-float`}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            left: `${xPos}%`,
            top: '-20px',
            animationDuration: `${animationDuration}s`,
            animationDelay: `${delay}s`
          }}
        />
      );
    }
    return particles;
  };

  return (
    <section 
      ref={sectionRef}
      id="education" 
      className={`py-24 relative overflow-hidden isolate z-10 ${darkMode 
        ? 'bg-gradient-to-b from-gray-800 to-gray-900' 
        : 'bg-gradient-to-b from-gray-100 to-white'}`}
    >
      {/* Background animation effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        {generateParticles(15)}
        <div className="absolute -right-32 -top-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -left-32 top-1/2 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className={`text-center mb-16 transition-all duration-1000 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="inline-block relative">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gradient">
              Education Journey
            </h2>
            <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-teal-400"></div>
          </div>
          <p className="text-lg max-w-3xl mx-auto dark:text-gray-300 mt-8">
            My academic journey that has shaped my expertise in technology and computer science.
          </p>
        </div>

        {/* Card Grid Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {educationData.map((item, index) => (
            <div 
              key={item.degree}
              className={`transition-all duration-700 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <div className="h-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden group">
                {/* Card header with gradient */}
                <div className="h-4 bg-gradient-to-r from-blue-500 via-teal-400 to-blue-600"></div>
                
                <div className="p-5">
                  {/* Icon with animated background */}
                  <div className="bg-gradient-to-r from-blue-500 to-teal-400 text-white p-3 rounded-lg shadow-md inline-flex items-center justify-center relative z-10 overflow-hidden">
                    {getIcon(item.icon)}
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                  </div>
                  
                  {/* Badge for year */}
                  <div className="float-right mt-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full text-xs font-medium">
                    {item.year}
                  </div>
                  
                  <h3 className="text-lg font-bold mt-3 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">{item.degree}</h3>
                  
                  <div className="mt-2 flex items-center text-blue-600 dark:text-blue-400">
                    <Award size={14} className="mr-1 flex-shrink-0" />
                    <span className="text-sm">{item.grade}</span>
                  </div>
                  
                  <div className="mt-2 flex items-center dark:text-gray-300">
                    <MapPin size={14} className="mr-1 flex-shrink-0" />
                    <span className="text-sm">{item.institution}</span>
                  </div>
                  
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 text-justify hover:line-clamp-none transition-all duration-300">{item.description}</p>
                  
                  {/* Animated accent elements */}
                  <div className="absolute bottom-0 right-0 w-20 h-20 rounded-tl-full bg-gradient-to-tl from-blue-400/5 to-transparent transform scale-0 group-hover:scale-100 transition-transform duration-500 origin-bottom-right"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Education stats with animated hover effects */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg text-center transform transition-all duration-300 hover:scale-105 hover:shadow-xl group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
            <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
              <GraduationCap size={32} />
            </div>
            <h3 className="text-2xl font-bold dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors duration-300">5 Years</h3>
            <p className="text-gray-600 dark:text-gray-400">Higher Education</p>
            
            {/* Animated stars */}
            <div className="absolute -top-1 -right-1 transform rotate-12 opacity-0 group-hover:opacity-100 transition-all duration-700 delay-100">
              <Star className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="absolute -top-2 right-3 transform rotate-45 opacity-0 group-hover:opacity-100 transition-all duration-700 delay-300">
              <Star className="w-3 h-3 text-yellow-400" />
            </div>
          </div>
          
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg text-center transform transition-all duration-300 hover:scale-105 hover:shadow-xl group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
            <div className="w-16 h-16 mx-auto bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
              <BookOpen size={32} />
            </div>
            <h3 className="text-2xl font-bold dark:text-white group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors duration-300">2026</h3>
            <p className="text-gray-600 dark:text-gray-400">MCA Expected Completion</p>
            
            {/* Animated hearts */}
            <div className="absolute -bottom-1 -right-1 transform -rotate-12 opacity-0 group-hover:opacity-100 transition-all duration-700 delay-300">
              <Heart className="w-5 h-5 text-red-400" />
            </div>
            <div className="absolute -bottom-2 right-4 transform rotate-12 opacity-0 group-hover:opacity-100 transition-all duration-700 delay-500">
              <Heart className="w-3 h-3 text-red-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg text-center transform transition-all duration-300 hover:scale-105 hover:shadow-xl group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
            <div className="w-16 h-16 mx-auto bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center text-teal-600 dark:text-teal-400 mb-4 transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6">
              <Award size={32} />
            </div>
            <h3 className="text-2xl font-bold dark:text-white group-hover:text-teal-500 dark:group-hover:text-teal-400 transition-colors duration-300">2024</h3>
            <p className="text-gray-600 dark:text-gray-400">B.Sc. Graduation</p>
            
            {/* Animated sparkles */}
            <div className="absolute -bottom-1 -left-1 transform rotate-12 opacity-0 group-hover:opacity-100 transition-all duration-700 delay-200">
              <Zap className="w-5 h-5 text-teal-400" />
            </div>
            <div className="absolute bottom-2 left-4 opacity-0 group-hover:opacity-100 transition-all duration-700 delay-400">
              <Zap className="w-3 h-3 text-teal-400" />
            </div>
          </div>
          

        </div>
      </div>
    </section>
  );
};

export default Education;