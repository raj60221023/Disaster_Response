import React, { useState, useEffect } from 'react';
import { MapPin, Search, Filter, Plus, Users, Utensils, Heart, Droplets } from 'lucide-react';

interface Resource {
  id: string;
  name: string;
  location_name: string;
  type: string;
  capacity: number;
  contact: string;
  distance_meters: number;
  status: string;
}

interface ResourceMapProps {
  selectedDisaster: any;
}

const ResourceMap: React.FC<ResourceMapProps> = ({ selectedDisaster }) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchRadius, setSearchRadius] = useState(10000); // 10km default
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (selectedDisaster) {
      fetchResources();
    }
  }, [selectedDisaster, searchRadius, typeFilter]);

  const fetchResources = async () => {
    if (!selectedDisaster) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        radius: searchRadius.toString()
      });

      const response = await fetch(
        `http://localhost:5000/api/disasters/${selectedDisaster.id}/resources?${params}`
      );

      if (!response.ok) throw new Error('Failed to fetch resources');

      const data = await response.json();
      let filteredResources = data.resources || [];

      if (typeFilter) {
        filteredResources = filteredResources.filter((r: Resource) => r.type === typeFilter);
      }

      setResources(filteredResources);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch resources');
    } finally {
      setLoading(false);
    }
  };

  const getResourceIcon = (type: string) => {
    const icons = {
      'shelter': Users,
      'food': Utensils,
      'medical': Heart,
      'water': Droplets,
      'evacuation': MapPin
    };
    return icons[type as keyof typeof icons] || MapPin;
  };

  const getResourceColor = (type: string) => {
    const colors = {
      'shelter': 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
      'food': 'text-green-500 bg-green-100 dark:bg-green-900/30',
      'medical': 'text-red-500 bg-red-100 dark:bg-red-900/30',
      'water': 'text-cyan-500 bg-cyan-100 dark:bg-cyan-900/30',
      'evacuation': 'text-orange-500 bg-orange-100 dark:bg-orange-900/30'
    };
    return colors[type as keyof typeof colors] || 'text-gray-500 bg-gray-100 dark:bg-gray-900/30';
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const resourceTypes = ['shelter', 'food', 'medical', 'water', 'evacuation'];

  if (!selectedDisaster) {
    return (
      <div className="text-center py-12">
        <MapPin className="h-12 w-12 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400">Select a disaster to view nearby resources</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Emergency Resources</h2>
          <p className="text-gray-400 mt-1">
            Resources near: {selectedDisaster.location_name || selectedDisaster.title}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Add Resource</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Search className="h-5 w-5 text-gray-400" />
            <label className="text-sm text-gray-300">Search Radius:</label>
            <select
              value={searchRadius}
              onChange={(e) => setSearchRadius(parseInt(e.target.value))}
              className="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-white text-sm"
            >
              <option value={5000}>5km</option>
              <option value={10000}>10km</option>
              <option value={25000}>25km</option>
              <option value={50000}>50km</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <label className="text-sm text-gray-300">Type:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-white text-sm"
            >
              <option value="">All Types</option>
              {resourceTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-300">Loading resources...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
          <p className="text-red-200">Error: {error}</p>
        </div>
      )}

      {/* Resource List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {resources.map((resource) => {
          const Icon = getResourceIcon(resource.type);
          const colorClass = getResourceColor(resource.type);
          
          return (
            <div
              key={resource.id}
              className="bg-gray-900 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${colorClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white truncate">{resource.name}</h3>
                  <p className="text-sm text-gray-400 mt-1">{resource.location_name}</p>
                  
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-gray-500">
                      {formatDistance(resource.distance_meters)} away
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      resource.status === 'active' 
                        ? 'bg-green-900/50 text-green-300'
                        : 'bg-gray-800 text-gray-400'
                    }`}>
                      {resource.status}
                    </span>
                  </div>

                  {resource.capacity && (
                    <p className="text-xs text-gray-400 mt-2">
                      Capacity: {resource.capacity}
                    </p>
                  )}

                  {resource.contact && (
                    <p className="text-xs text-gray-400 mt-1">
                      Contact: {resource.contact}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {resources.length === 0 && !loading && (
        <div className="text-center py-12">
          <MapPin className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">No resources found in the selected area</p>
          <p className="text-gray-500 text-sm mt-2">
            Try expanding the search radius or adding new resources
          </p>
        </div>
      )}

      {/* Quick Stats */}
      {resources.length > 0 && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Resource Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {resourceTypes.map(type => {
              const count = resources.filter(r => r.type === type).length;
              const Icon = getResourceIcon(type);
              const colorClass = getResourceColor(type);
              
              return (
                <div key={type} className="text-center">
                  <div className={`p-3 rounded-lg mx-auto w-fit ${colorClass}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <p className="text-2xl font-bold text-white mt-2">{count}</p>
                  <p className="text-sm text-gray-400 capitalize">{type}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceMap;