import React from 'react';
import { Link } from 'react-router-dom';
import RealTimeAnalyticsDashboard from '../components/admin/RealTimeAnalyticsDashboard';
import { ArrowLeft } from 'lucide-react';

const RealTimeAnalyticsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link to="/admin" className="flex items-center gap-2 text-white hover:text-indigo-300 transition-colors">
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Admin Dashboard</span>
          </Link>
          
          <h1 className="text-2xl font-bold text-white">Real-Time Analytics</h1>
        </div>
        
        <div className="w-full">
          <RealTimeAnalyticsDashboard />
        </div>
      </div>
    </div>
  );
};

export default RealTimeAnalyticsPage;
