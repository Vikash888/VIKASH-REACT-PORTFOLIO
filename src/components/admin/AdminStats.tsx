import { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { Users, Eye, Clock, Server } from 'lucide-react';
import VisitorMap from './VisitorMap';

const AdminStats = () => {
  const [projectCount, setProjectCount] = useState(0);
  const [lastVisit, setLastVisit] = useState('');

  useEffect(() => {
    // Fetch project count
    const fetchProjectCount = async () => {
      try {
        if (!database) {
          console.warn('Database not initialized, using mock project count');
          setProjectCount(12); // Default mock count
          return;
        }
        
        const projectsRef = ref(database, 'projects');
        const snapshot = await get(projectsRef);
        if (snapshot.exists()) {
          const projects = snapshot.val();
          setProjectCount(Object.keys(projects).length);
        } else {
          setProjectCount(0);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        setProjectCount(12); // Default mock count on error
      }
    };

    fetchProjectCount();

    // Set last visit time
    setLastVisit(new Date().toLocaleString());
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Dashboard Overview</h1>
      
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 mr-4">
              <Eye className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Views</p>
              <p className="text-xl font-semibold dark:text-white">1,250</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30 mr-4">
              <Users className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Unique Visitors</p>
              <p className="text-xl font-semibold dark:text-white">825</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 mr-4">
              <Server className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Projects</p>
              <p className="text-xl font-semibold dark:text-white">{projectCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30 mr-4">
              <Clock className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Last Visit</p>
              <p className="text-xl font-semibold dark:text-white" style={{ fontSize: '0.95rem' }}>{lastVisit}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Visitor Map */}
      <VisitorMap />
    </div>
  );
};

export default AdminStats; 