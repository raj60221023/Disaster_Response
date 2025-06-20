import React, { useState, useEffect } from 'react';
import { Globe, ExternalLink, Clock, AlertTriangle, Info, CheckCircle } from 'lucide-react';

interface OfficialUpdate {
  id: string;
  title: string;
  content: string;
  source: string;
  urgency: 'low' | 'medium' | 'high';
  external_url?: string;
  published_at: string;
  created_at: string;
}

interface OfficialUpdatesProps {
  selectedDisaster: any;
}

const OfficialUpdates: React.FC<OfficialUpdatesProps> = ({ selectedDisaster }) => {
  const [updates, setUpdates] = useState<OfficialUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urgencyFilter, setUrgencyFilter] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (selectedDisaster) {
      fetchOfficialUpdates();
      
      // Set up auto-refresh every 5 minutes for official updates
      const interval = setInterval(fetchOfficialUpdates, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [selectedDisaster]);

  const fetchOfficialUpdates = async () => {
    if (!selectedDisaster) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:5000/api/disasters/${selectedDisaster.id}/official-updates`
      );

      if (!response.ok) throw new Error('Failed to fetch official updates');

      const data = await response.json();
      setUpdates(data.updates || []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch official updates');
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return 'border-red-500 bg-red-500/10 text-red-300';
      case 'medium':
        return 'border-orange-500 bg-orange-500/10 text-orange-300';
      default:
        return 'border-blue-500 bg-blue-500/10 text-blue-300';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return AlertTriangle;
      case 'medium':
        return Info;
      default:
        return CheckCircle;
    }
  };

  const getSourceColor = (source: string) => {
    const colors = {
      'Emergency Management Agency': 'bg-red-600',
      'Red Cross': 'bg-red-700',
      'National Weather Service': 'bg-blue-600',
      'FEMA': 'bg-orange-600',
      'Local Government': 'bg-green-600'
    };
    return colors[source as keyof typeof colors] || 'bg-gray-600';
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Less than 1 hour ago';
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  const filteredUpdates = urgencyFilter 
    ? updates.filter(update => update.urgency === urgencyFilter)
    : updates;

  if (!selectedDisaster) {
    return (
      <div className="text-center py-12">
        <Globe className="h-12 w-12 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400">Select a disaster to view official updates</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Official Updates</h2>
          <p className="text-gray-400 mt-1">
            Government and relief organization updates for: {selectedDisaster.title}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {lastUpdated && (
            <div className="text-sm text-gray-400">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          <button
            onClick={fetchOfficialUpdates}
            disabled={loading}
            className="inline-flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Globe className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters and Stats */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="text-sm text-gray-300">Filter by urgency:</label>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-white text-sm"
            >
              <option value="">All Urgency Levels</option>
              <option value="high">High Urgency</option>
              <option value="medium">Medium Urgency</option>
              <option value="low">Low Urgency</option>
            </select>
          </div>

          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-gray-300">
                High: {updates.filter(u => u.urgency === 'high').length}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-gray-300">
                Medium: {updates.filter(u => u.urgency === 'medium').length}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-gray-300">
                Low: {updates.filter(u => u.urgency === 'low').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {loading && updates.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          <span className="ml-3 text-gray-300">Loading official updates...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
          <p className="text-red-200">Error: {error}</p>
        </div>
      )}

      {/* Updates Feed */}
      <div className="space-y-4">
        {filteredUpdates.map((update) => {
          const UrgencyIcon = getUrgencyIcon(update.urgency);
          
          return (
            <div
              key={update.id}
              className={`border rounded-lg p-6 ${getUrgencyColor(update.urgency)}`}
            >
              <div className="flex items-start space-x-4">
                <UrgencyIcon className="h-6 w-6 mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white leading-tight">
                      {update.title}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-400 ml-4">
                      <Clock className="h-4 w-4" />
                      <span>{formatTimeAgo(update.published_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getSourceColor(update.source)}`}>
                      {update.source}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                      update.urgency === 'high' 
                        ? 'bg-red-600 text-white'
                        : update.urgency === 'medium'
                        ? 'bg-orange-600 text-white'
                        : 'bg-blue-600 text-white'
                    }`}>
                      {update.urgency} Priority
                    </span>
                  </div>
                  
                  <p className="text-white leading-relaxed mb-4">
                    {update.content}
                  </p>
                  
                  {update.external_url && (
                    <a
                      href={update.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 text-blue-400 hover:text-blue-300 text-sm font-medium"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>Read Full Update</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredUpdates.length === 0 && !loading && (
        <div className="text-center py-12">
          <Globe className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">
            {urgencyFilter 
              ? `No ${urgencyFilter} urgency updates found`
              : 'No official updates found'
            }
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Official updates from government and relief organizations will appear here
          </p>
        </div>
      )}

      {/* Auto-refresh Indicator */}
      {!loading && updates.length > 0 && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-center space-x-2 text-green-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm">Auto-refresh active - Updates every 5 minutes</span>
          </div>
        </div>
      )}

      {/* Recent Sources */}
      {updates.length > 0 && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Active Sources</h3>
          <div className="flex flex-wrap gap-2">
            {[...new Set(updates.map(u => u.source))].map(source => (
              <span
                key={source}
                className={`px-3 py-1 rounded-full text-sm text-white ${getSourceColor(source)}`}
              >
                {source}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficialUpdates;