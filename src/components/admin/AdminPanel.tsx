import React from 'react';
import ProjectManagement from './ProjectManagement';
import ResumeManagement from './ResumeManagement.tsx';

const AdminPanel: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Admin Panel</h1>
      
      <div className="grid grid-cols-1 gap-8">
        <ResumeManagement />
        <ProjectManagement />
      </div>
    </div>
  );
};

export default AdminPanel; 