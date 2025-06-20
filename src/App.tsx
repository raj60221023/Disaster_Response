import React, { useState, useEffect } from 'react';
import { AlertTriangle, MapPin, Users, Activity, Shield, Globe } from 'lucide-react';
import io from 'socket.io-client';
import DisasterDashboard from './components/DisasterDashboard';
import CreateDisasterForm from './components/CreateDisasterForm';
import ResourceMap from './components/ResourceMap';
import SocialMediaFeed from './components/SocialMediaFeed';
import ImageVerification from './components/ImageVerification';
import OfficialUpdates from './components/OfficialUpdates';

const socket = io('http://localhost:5000');

// Add at the top, after imports
type RealTimeUpdate = {
  type: string;
  message: string;
  timestamp: string;
  data: any;
};

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedDisaster, setSelectedDisaster] = useState<any>(null);
  const [realTimeUpdates, setRealTimeUpdates] = useState<RealTimeUpdate[]>([]);

  useEffect(() => {
    // WebSocket event listeners
    socket.on('disaster_created', (data: any) => {
      setRealTimeUpdates(prev => [...prev.slice(-4), {
        type: 'disaster_created',
        message: `New disaster reported: ${data.disaster.title}`,
        timestamp: new Date().toISOString(),
        data
      }]);
    });

    socket.on('disaster_updated', (data: any) => {
      setRealTimeUpdates(prev => [...prev.slice(-4), {
        type: 'disaster_updated',
        message: `Disaster updated: ${data.disaster.title}`,
        timestamp: new Date().toISOString(),
        data
      }]);
    });

    socket.on('social_media_updated', (data: any) => {
      setRealTimeUpdates(prev => [...prev.slice(-4), {
        type: 'social_media',
        message: `${data.count} new social media reports`,
        timestamp: new Date().toISOString(),
        data
      }]);
    });

    socket.on('resources_updated', (data: any) => {
      setRealTimeUpdates(prev => [...prev.slice(-4), {
        type: 'resources',
        message: `Resources updated near ${data.location.lat}, ${data.location.lon}`,
        timestamp: new Date().toISOString(),
        data
      }]);
    });

    return () => {
      socket.off('disaster_created');
      socket.off('disaster_updated');
      socket.off('social_media_updated');
      socket.off('resources_updated');
    };
  }, []);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'create', label: 'Report Disaster', icon: AlertTriangle },
    { id: 'resources', label: 'Resources', icon: MapPin },
    { id: 'social', label: 'Social Media', icon: Users },
    { id: 'verification', label: 'Image Verification', icon: Shield },
    { id: 'updates', label: 'Official Updates', icon: Globe }
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <h1 className="text-xl font-bold text-white">Disaster Response Platform</h1>
            </div>
            
            {/* Real-time status indicator */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-300">Live Updates</span>
              </div>
              <div className="text-sm text-gray-400">
                Emergency Coordinator
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Real-time Updates Banner */}
      {realTimeUpdates.length > 0 && (
        <div className="bg-blue-900/50 border-b border-blue-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex items-center space-x-4 overflow-x-auto">
              <span className="text-blue-300 text-sm font-medium whitespace-nowrap">Latest:</span>
              {realTimeUpdates.slice(-3).map((update, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm text-blue-200 whitespace-nowrap">
                  <span>•</span>
                  <span>{update.message}</span>
                  <span className="text-blue-400">
                    {new Date(update.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto py-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-red-600 text-white shadow-lg'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DisasterDashboard 
            onSelectDisaster={setSelectedDisaster}
            selectedDisaster={selectedDisaster}
          />
        )}
        
        {activeTab === 'create' && (
          <CreateDisasterForm onDisasterCreated={(disaster) => {
            setSelectedDisaster(disaster);
            setActiveTab('dashboard');
          }} />
        )}
        
        {activeTab === 'resources' && (
          <ResourceMap selectedDisaster={selectedDisaster} />
        )}
        
        {activeTab === 'social' && (
          <SocialMediaFeed selectedDisaster={selectedDisaster} />
        )}
        
        {activeTab === 'verification' && (
          <ImageVerification selectedDisaster={selectedDisaster} />
        )}
        
        {activeTab === 'updates' && (
          <OfficialUpdates selectedDisaster={selectedDisaster} />
        )}
      </main>
    </div>
  );
}

export default App;