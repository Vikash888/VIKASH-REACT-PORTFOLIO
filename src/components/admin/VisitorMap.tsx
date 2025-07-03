import React, { useState, useEffect } from 'react';
import { 
  ComposableMap, 
  Geographies, 
  Geography, 
  Marker,
  ZoomableGroup
} from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import { visitorAnalytics, ProcessedVisitorData } from '../../services/realTimeVisitorAnalytics';
import { 
  Maximize, 
  Minimize, 
  RefreshCw, 
  Users, 
  Globe, 
  TrendingUp,
  Activity,
  Map as MapIcon
} from 'lucide-react';

// World map topography data
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const VisitorMap: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ coordinates: [0, 20], zoom: 1 });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'heatmap' | 'markers'>('heatmap');
  const [timeFilter, setTimeFilter] = useState<'24h' | '7d' | '30d' | 'all'>('all');
  const [analyticsData, setAnalyticsData] = useState<ProcessedVisitorData | null>(null);

  // Scale for marker size based on visitor count
  const markerSize = scaleLinear<number>()
    .domain([1, 50])
    .range([4, 15]);

  // Scale for marker color based on visitor count
  const markerColor = scaleLinear<string>()
    .domain([1, 10, 50])
    .range(['#6366F1', '#3B82F6', '#0EA5E9']);

  useEffect(() => {
    fetchVisitorData();
    
    // Set up real-time updates
    const unsubscribe = visitorAnalytics.subscribeToUpdates((data) => {
      setAnalyticsData(data);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [timeFilter]);

  const fetchVisitorData = async () => {
    try {
      setLoading(true);
      if (isRefreshing) setIsRefreshing(true);
      
      const data = await visitorAnalytics.getVisitorAnalytics(timeFilter);
      setAnalyticsData(data);
      
      console.log('Map data loaded:', data.locations.length, 'locations');
    } catch (error) {
      console.error('Error fetching visitor data:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleZoomIn = () => {
    if (zoom < 4) setZoom(zoom + 1);
  };

  const handleZoomOut = () => {
    if (zoom > 1) setZoom(zoom - 1);
  };

  const handleMoveEnd = (position: any) => {
    setPosition(position);
  };

  // Get data with fallback
  const locations = analyticsData?.locations || [];
  const countries = analyticsData?.countries || {};
  const mapStats = analyticsData?.stats || {
    totalVisitors: 0,
    activeCountries: 0,
    topCountry: '',
    recentVisits: 0
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Visitors</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{mapStats.totalVisitors}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Countries</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{mapStats.activeCountries}</p>
            </div>
            <Globe className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Top Country</p>
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{mapStats.topCountry}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Recent (24h)</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{mapStats.recentVisits}</p>
            </div>
            <Activity className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Main Map Container */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        {/* Map Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <MapIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Global Visitor Map</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Real-time visitor distribution worldwide</p>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('heatmap')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'heatmap'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Heatmap
              </button>
              <button
                onClick={() => setViewMode('markers')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'markers'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Markers
              </button>
            </div>

            {/* Time Filter */}
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as '24h' | '7d' | '30d' | 'all')}
              className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="24h">Last 24h</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="all">All time</option>
            </select>

            {/* Zoom Controls */}
            <div className="flex space-x-1">
              <button 
                onClick={handleZoomIn}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Zoom In"
              >
                <Maximize className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              <button 
                onClick={handleZoomOut}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Zoom Out"
              >
                <Minimize className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              <button 
                onClick={fetchVisitorData}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                disabled={isRefreshing}
                title="Refresh Data"
              >
                <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
        
        {/* Map Content */}
        <div className="relative bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800" style={{ height: '500px' }}>
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 backdrop-blur-sm">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading visitor data...</p>
              </div>
            </div>
          ) : mapStats.totalVisitors === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <MapIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">No Visitor Data</h3>
                <p className="text-gray-500 dark:text-gray-500 mb-4">
                  The map will display visitor locations once people start visiting your site.
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-md">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>IP-based tracking:</strong> Only real visitors with valid IP addresses will appear on this map.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full">
              <ComposableMap
                projectionConfig={{ scale: 140 }}
                style={{ width: '100%', height: '100%' }}
              >
                <ZoomableGroup
                  zoom={zoom}
                  center={position.coordinates as [number, number]}
                  onMoveEnd={handleMoveEnd}
                >
                  <Geographies geography={geoUrl}>
                    {({ geographies }) =>
                      geographies.map(geo => {
                        const countryName = geo.properties.name;
                        const countryData = countries[countryName];
                        const hasVisitors = countryData !== undefined;
                        
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={hasVisitors 
                              ? `rgba(59, 130, 246, ${Math.min(0.2 + (countryData.count / mapStats.totalVisitors) * 3, 0.9)})`
                              : "#E5E7EB"
                            }
                            stroke="#FFFFFF"
                            strokeWidth={0.5}
                            style={{
                              default: { outline: "none" },
                              hover: { 
                                outline: "none", 
                                fill: hasVisitors ? "rgba(59, 130, 246, 0.9)" : "#D1D5DB",
                                cursor: "pointer"
                              },
                              pressed: { outline: "none" }
                            }}
                          />
                        );
                      })
                    }
                  </Geographies>
                  
                  {/* Render markers based on view mode */}
                  {(viewMode === 'markers' || viewMode === 'heatmap') && locations.map((location, index) => (
                    <Marker
                      key={`marker-${index}`}
                      coordinates={[location.lng, location.lat]}
                    >
                      {viewMode === 'markers' ? (
                        <g>
                          <circle
                            r={markerSize(location.count)}
                            fill={markerColor(location.count)}
                            stroke="#fff"
                            strokeWidth={2}
                            opacity={0.9}
                            className="animate-pulse"
                          />
                          <circle
                            r={markerSize(location.count) * 0.5}
                            fill="#fff"
                            opacity={0.8}
                          />
                        </g>
                      ) : (
                        <circle
                          r={markerSize(location.count) * 1.5}
                          fill={markerColor(location.count)}
                          opacity={0.4}
                          className="animate-ping"
                        />
                      )}
                      <title>
                        {`${location.city}, ${location.country}\n${location.count} ${location.count === 1 ? 'visitor' : 'visitors'}\nLast visit: ${location.lastVisit}`}
                      </title>
                    </Marker>
                  ))}
                </ZoomableGroup>
              </ComposableMap>
            </div>
          )}
        </div>
      </div>

      {/* Country Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Countries */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
            Top Visitor Countries
          </h4>
          <div className="space-y-4">
            {Object.keys(countries).length > 0 ? (
              Object.entries(countries)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 8)
                .map(([country, data], index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{country}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{data.percentage.toFixed(1)}% of total</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{data.count}</p>
                      <p className={`text-sm ${data.growth && data.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {data.growth && data.growth >= 0 ? '+' : ''}{data.growth}%
                      </p>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-8">
                <Globe className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No visitor data available</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">Visitors will appear here when they access your site</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-green-500" />
            Recent Activity
          </h4>
          <div className="space-y-3">
            {locations.filter(loc => loc.recentVisits && loc.recentVisits > 0).length > 0 ? (
              locations
                .filter(loc => loc.recentVisits && loc.recentVisits > 0)
                .sort((a, b) => (b.recentVisits || 0) - (a.recentVisits || 0))
                .slice(0, 6)
                .map((location, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{location.city}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{location.country}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{location.recentVisits} visits</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Last: {location.lastVisit}</p>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">Recent visitor activity will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisitorMap; 