import React, { useState, useEffect } from 'react';
import { MessageCircle, AlertTriangle, Clock, User, RefreshCw } from 'lucide-react';

interface SocialMediaReport {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  priority: 'low' | 'medium' | 'high';
  source: string;
}

interface SocialMediaFeedProps {
  selectedDisaster: any;
}

const SocialMediaFeed: React.FC<SocialMediaFeedProps> = ({ selectedDisaster }) => {
  const [reports, setReports] = useState<SocialMediaReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (selectedDisaster) {
      fetchSocialMediaReports();
      
      // Set up auto-refresh every 30 seconds for real-time updates
      const interval = setInterval(fetchSocialMediaReports, 30000);
      return () => clearInterval(interval);
    }
  }, [selectedDisaster]);

  const fetchSocialMediaReports = async () => {
    if (!selectedDisaster) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:5000/api/disasters/${selectedDisaster.id}/social-media`
      );

      if (!response.ok) throw new Error('Failed to fetch social media reports');

      const data = await response.json();
      setReports(data.reports || []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch social media reports');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-500 bg-red-500/10 text-red-300';
      case 'medium':
        return 'border-orange-500 bg-orange-500/10 text-orange-300';
      default:
        return 'border-blue-500 bg-blue-500/10 text-blue-300';
    }
  };

  const getPriorityIcon = (priority: string) => {
    return priority === 'high' ? AlertTriangle : MessageCircle;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const filteredReports = priorityFilter 
    ? reports.filter(report => report.priority === priorityFilter)
    : reports;

  if (!selectedDisaster) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400">Select a disaster to view social media reports</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Social Media Reports</h2>
          <p className="text-gray-400 mt-1">
            Real-time social media monitoring for: {selectedDisaster.title}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {lastUpdated && (
            <div className="text-sm text-gray-400">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          <button
            onClick={fetchSocialMediaReports}
            disabled={loading}
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters and Stats */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="text-sm text-gray-300">Filter by priority:</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-white text-sm"
            >
              <option value="">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>

          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-gray-300">
                High: {reports.filter(r => r.priority === 'high').length}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-gray-300">
                Medium: {reports.filter(r => r.priority === 'medium').length}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-gray-300">
                Low: {reports.filter(r => r.priority === 'low').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {loading && reports.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-300">Loading social media reports...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
          <p className="text-red-200">Error: {error}</p>
        </div>
      )}

      {/* Reports Feed */}
      <div className="space-y-4">
        {filteredReports.map((report) => {
          const PriorityIcon = getPriorityIcon(report.priority);
          
          return (
            <div
              key={report.id}
              className={`border rounded-lg p-4 ${getPriorityColor(report.priority)}`}
            >
              <div className="flex items-start space-x-3">
                <PriorityIcon className="h-5 w-5 mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <User className="h-4 w-4" />
                      <span className="font-medium">{report.author_id}</span>
                      <span className="text-gray-400">via {report.source}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <Clock className="h-4 w-4" />
                      <span>{formatTimeAgo(report.created_at)}</span>
                    </div>
                  </div>
                  
                  <p className="text-white leading-relaxed">{report.text}</p>
                  
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                      report.priority === 'high' 
                        ? 'bg-red-600 text-white'
                        : report.priority === 'medium'
                        ? 'bg-orange-600 text-white'
                        : 'bg-blue-600 text-white'
                    }`}>
                      {report.priority} Priority
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredReports.length === 0 && !loading && (
        <div className="text-center py-12">
          <MessageCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">
            {priorityFilter 
              ? `No ${priorityFilter} priority reports found`
              : 'No social media reports found'
            }
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Reports will appear here as they are detected from social media platforms
          </p>
        </div>
      )}

      {/* Live Update Indicator */}
      {!loading && reports.length > 0 && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-center space-x-2 text-green-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm">Live monitoring active - Updates every 30 seconds</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialMediaFeed;