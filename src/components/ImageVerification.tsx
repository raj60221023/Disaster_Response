import React, { useState, useEffect } from 'react';
import { Shield, Upload, Check, X, AlertTriangle, Eye } from 'lucide-react';

interface ImageVerification {
  id: string;
  image_url: string;
  verification_score: number;
  is_authentic: boolean;
  analysis: string;
  verified_at: string;
}

interface ImageVerificationProps {
  selectedDisaster: any;
}

const ImageVerification: React.FC<ImageVerificationProps> = ({ selectedDisaster }) => {
  const [verifications, setVerifications] = useState<ImageVerification[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (selectedDisaster) {
      fetchVerifications();
    }
  }, [selectedDisaster]);

  const fetchVerifications = async () => {
    if (!selectedDisaster) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:5000/api/disasters/${selectedDisaster.id}/verifications`
      );

      if (!response.ok) throw new Error('Failed to fetch verifications');

      const data = await response.json();
      setVerifications(data.verifications || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch verifications');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyImage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!imageUrl.trim()) {
      setError('Please enter an image URL');
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:5000/api/disasters/${selectedDisaster.id}/verify-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image_url: imageUrl,
            context: `${selectedDisaster.title}: ${selectedDisaster.description}`
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to verify image');

      const result = await response.json();
      
      // Add new verification to the list
      setVerifications(prev => [result.verification, ...prev]);
      setImageUrl('');
      setShowForm(false);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify image');
    } finally {
      setVerifying(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    
    return 'bg-red-500';
  };

  if (!selectedDisaster) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400">Select a disaster to verify images</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Image Verification</h2>
          <p className="text-gray-400 mt-1">
            AI-powered authenticity verification for: {selectedDisaster.title}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Upload className="h-5 w-5" />
          <span>Verify Image</span>
        </button>
      </div>

      {/* Verification Form */}
      {showForm && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Submit Image for Verification</h3>
          
          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-4">
              <p className="text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleVerifyImage} className="space-y-4">
            <div>
              <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-300 mb-2">
                Image URL
              </label>
              <input
                type="url"
                id="imageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="https://example.com/disaster-image.jpg"
                required
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={verifying}
                className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Shield className="h-4 w-4" />
                <span>{verifying ? 'Verifying...' : 'Verify Image'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && verifications.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <span className="ml-3 text-gray-300">Loading verifications...</span>
        </div>
      )}

      {/* Verification Results */}
      <div className="space-y-4">
        {verifications.map((verification) => (
          <div
            key={verification.id}
            className="bg-gray-900 border border-gray-700 rounded-lg p-6"
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <img
                  src={verification.image_url}
                  alt="Verification subject"
                  className="w-24 h-24 object-cover rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik0xMiA5VjEzTTEyIDE3SDE2TTE2IDlIMTJNOCA5SDEyIiBzdHJva2U9IiM2QjcyODAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+Cjwvc3ZnPgo=';
                  }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {verification.is_authentic ? (
                        <Check className="h-5 w-5 text-green-400" />
                      ) : (
                        <X className="h-5 w-5 text-red-400" />
                      )}
                      <span className={`font-medium ${
                        verification.is_authentic ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {verification.is_authentic ? 'Authentic' : 'Suspicious'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-400">Score:</span>
                      <span className={`font-bold ${getScoreColor(verification.verification_score)}`}>
                        {verification.verification_score}/100
                      </span>
                    </div>
                  </div>

                  <div className="text-sm text-gray-400">
                    {new Date(verification.verified_at).toLocaleString()}
                  </div>
                </div>

                {/* Score Bar */}
                <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                  <div
                    className={`h-2 rounded-full ${getScoreBg(verification.verification_score)}`}
                    style={{ width: `${verification.verification_score}%` }}
                  ></div>
                </div>

                <p className="text-gray-300 text-sm leading-relaxed mb-3">
                  {verification.analysis}
                </p>

                <div className="flex items-center justify-between">
                  <a
                    href={verification.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 text-blue-400 hover:text-blue-300 text-sm"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View Original</span>
                  </a>

                  {verification.verification_score < 50 && (
                    <div className="flex items-center space-x-2 text-red-400 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Requires manual review</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {verifications.length === 0 && !loading && (
        <div className="text-center py-12">
          <Shield className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">No image verifications yet</p>
          <p className="text-gray-500 text-sm mt-2">
            Submit images for AI-powered authenticity verification
          </p>
        </div>
      )}

      {/* Verification Stats */}
      {verifications.length > 0 && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Verification Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {verifications.filter(v => v.is_authentic).length}
              </div>
              <div className="text-sm text-gray-400">Authentic</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">
                {verifications.filter(v => !v.is_authentic).length}
              </div>
              <div className="text-sm text-gray-400">Suspicious</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {verifications.filter(v => v.verification_score < 50).length}
              </div>
              <div className="text-sm text-gray-400">Need Review</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {Math.round(verifications.reduce((sum, v) => sum + v.verification_score, 0) / verifications.length)}
              </div>
              <div className="text-sm text-gray-400">Avg Score</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageVerification;