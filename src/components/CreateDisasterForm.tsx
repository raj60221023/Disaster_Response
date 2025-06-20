import React, { useState } from 'react';
import { AlertTriangle, MapPin, Save, Zap } from 'lucide-react';

interface DisasterFormData {
  title: string;
  location_name: string;
  description: string;
  tags: string[];
}

interface CreateDisasterFormProps {
  onDisasterCreated: (disaster: any) => void;
}

const CreateDisasterForm: React.FC<CreateDisasterFormProps> = ({ onDisasterCreated }) => {
  const [formData, setFormData] = useState<DisasterFormData>({
    title: '',
    location_name: '',
    description: '',
    tags: []
  });
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [extractedLocations, setExtractedLocations] = useState<string[]>([]);

  const disasterTypes = [
    'earthquake', 'flood', 'fire', 'hurricane', 'tornado', 'tsunami',
    'landslide', 'drought', 'blizzard', 'heatwave', 'pandemic', 'explosion'
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTagToggle = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const extractLocationsFromDescription = async () => {
    if (!formData.description.trim()) {
      setError('Please enter a description first');
      return;
    }

    setGeocoding(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: formData.description
        }),
      });

      if (!response.ok) throw new Error('Failed to extract locations');

      const data = await response.json();
      setExtractedLocations(data.extracted_locations);
      
      if (data.extracted_locations.length > 0 && !formData.location_name) {
        setFormData(prev => ({
          ...prev,
          location_name: data.extracted_locations[0]
        }));
      }

      setSuccess(`Extracted ${data.extracted_locations.length} location(s) from description`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract locations');
    } finally {
      setGeocoding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Title and description are required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // First geocode the location if provided
      let coordinates = null;
      if (formData.location_name.trim()) {
        const geocodeResponse = await fetch('http://localhost:5000/api/geocode', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            location_name: formData.location_name
          }),
        });

        if (geocodeResponse.ok) {
          const geocodeData = await geocodeResponse.json();
          if (geocodeData.geocoded_results.length > 0 && geocodeData.geocoded_results[0].geocoded) {
            coordinates = geocodeData.geocoded_results[0].coordinates;
          }
        }
      }

      // Create the disaster
      const disasterData = {
        ...formData,
        ...(coordinates && {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude
        })
      };

      const response = await fetch('http://localhost:5000/api/disasters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(disasterData),
      });

      if (!response.ok) throw new Error('Failed to create disaster');

      const result = await response.json();
      setSuccess('Disaster reported successfully!');
      onDisasterCreated(result.disaster);
      
      // Reset form
      setFormData({
        title: '',
        location_name: '',
        description: '',
        tags: []
      });
      setExtractedLocations([]);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create disaster');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <AlertTriangle className="h-6 w-6 text-red-500" />
          <h2 className="text-xl font-bold text-white">Report New Disaster</h2>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-900/50 border border-green-700 rounded-lg p-4 mb-6">
            <p className="text-green-200">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
              Disaster Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="e.g., Flash Flooding in Downtown Area"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Provide detailed information about the disaster, including location, severity, and current conditions..."
              required
            />
            <div className="mt-2">
              <button
                type="button"
                onClick={extractLocationsFromDescription}
                disabled={geocoding || !formData.description.trim()}
                className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white text-sm rounded-lg font-medium transition-colors"
              >
                <Zap className="h-4 w-4" />
                <span>{geocoding ? 'Extracting...' : 'Extract Locations with AI'}</span>
              </button>
            </div>
          </div>

          {extractedLocations.length > 0 && (
            <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-300 mb-2">AI Extracted Locations:</h4>
              <div className="flex flex-wrap gap-2">
                {extractedLocations.map((location, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, location_name: location }))}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-full transition-colors"
                  >
                    {location}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="location_name" className="block text-sm font-medium text-gray-300 mb-2">
              Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                id="location_name"
                name="location_name"
                value={formData.location_name}
                onChange={handleInputChange}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="e.g., Manhattan, NYC or use extracted locations above"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Disaster Type Tags
            </label>
            <div className="grid grid-cols-3 gap-2">
              {disasterTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTagToggle(type)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.tags.includes(type)
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            <Save className="h-5 w-5" />
            <span>{loading ? 'Creating Disaster Report...' : 'Report Disaster'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateDisasterForm;