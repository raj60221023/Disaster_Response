import React, { useState, useEffect } from 'react';
import { AlertTriangle, MapPin, Calendar, User, Tag, Eye } from 'lucide-react';

interface Disaster {
  id: string;
  title: string;
  location_name?: string;
  description: string;
  tags: string[];
  owner_id: string;
  created_at: string;
  audit_trail: any[];
}

interface DisasterDashboardProps {
  onSelectDisaster: (disaster: Disaster) => void;
  selectedDisaster: Disaster | null;
}

const DisasterDashboard: React.FC<DisasterDashboardProps> = ({ onSelectDisaster, selectedDisaster }) => {
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string>('');

  useEffect(() => {
    fetchDisasters();
  }, [filterTag]);

  const fetchDisasters = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterTag) params.append('tag', filterTag);
      
      const response = await fetch(`http://localhost:5000/api/disasters?${params}`);
      if (!response.ok) throw new Error('Failed to fetch disasters');
      
      const data = await response.json();
      setDisasters(data.disasters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch disasters');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (tags: string[]) => {
    if (tags.some(tag => ['earthquake', 'tsunami', 'hurricane'].includes(tag.toLowerCase()))) {
      return 'border-red-500 bg-red-500/10';
    } else if (tags.some(tag => ['flood', 'fire', 'tornado'].includes(tag.toLowerCase()))) {
      return 'border-orange-500 bg-orange-500/10';
    }
    return 'border-blue-500 bg-blue-500/10';
  };

  const getTagColor = (tag: string) => {
    const colors = {
      'earthquake': 'bg-red-600',
      'flood': 'bg-blue-600',
      'fire': 'bg-orange-600',
      'hurricane': 'bg-purple-600',
      'tornado': 'bg-yellow-600',
      'tsunami': 'bg-red-700'
    };
    return colors[tag.toLowerCase() as keyof typeof colors] || 'bg-gray-600';
  };

  const uniqueTags = [...new Set(disasters.flatMap(d => d.tags))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
        <span className="ml-3 text-gray-300">Loading disasters...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <span className="text-red-200">Error: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Active Disasters</h2>
        <div className="flex items-center space-x-4">
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="">All Tags</option>
            {uniqueTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
          <div className="text-sm text-gray-400">
            {disasters.length} disaster{disasters.length !== 1 ? 's' : ''} found
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-200">Disaster List</h3>
          <div className="space-y-3">
            {disasters.map((disaster) => (
              <div
                key={disaster.id}
                onClick={() => onSelectDisaster(disaster)}
                className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  selectedDisaster?.id === disaster.id 
                    ? 'ring-2 ring-red-500 ' + getPriorityColor(disaster.tags)
                    : getPriorityColor(disaster.tags)
                } hover:border-opacity-80`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-2">{disaster.title}</h4>
                    <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                      {disaster.description}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-400 mb-3">
                      {disaster.location_name && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" />
                          <span>{disaster.location_name}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(disaster.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>{disaster.owner_id}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {disaster.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`px-2 py-1 rounded-full text-xs text-white ${getTagColor(tag)}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Eye className="h-4 w-4 text-gray-500 ml-2" />
                </div>
              </div>
            ))}
          </div>

          {disasters.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No disasters found matching your criteria.</p>
            </div>
          )}
        </div>

        {selectedDisaster && (
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Disaster Details</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-200 mb-2">{selectedDisaster.title}</h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {selectedDisaster.description}
                </p>
              </div>

              {selectedDisaster.location_name && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Location</label>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-300">{selectedDisaster.location_name}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {selectedDisaster.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`px-3 py-1 rounded-full text-sm text-white ${getTagColor(tag)}`}
                    >
                      <Tag className="h-3 w-3 inline mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Created</label>
                <p className="text-gray-300 text-sm">
                  {new Date(selectedDisaster.created_at).toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Owner</label>
                <p className="text-gray-300 text-sm">{selectedDisaster.owner_id}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Audit Trail</label>
                <div className="bg-gray-800 rounded-lg p-3 max-h-32 overflow-y-auto">
                  {selectedDisaster.audit_trail.map((entry, index) => (
                    <div key={index} className="text-xs text-gray-400 mb-1">
                      <span className="text-gray-300">{entry.action}</span> by {entry.user_id} at{' '}
                      <span className="text-gray-300">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DisasterDashboard;