import axios from 'axios';
import { CacheService } from './cacheService.js';
import { logger } from '../utils/logger.js';

export class GeocodingService {
  static async geocodeLocation(locationName) {
    const cacheKey = `geocode_${locationName.toLowerCase().replace(/\s+/g, '_')}`;
    
    try {
      // Check cache first
      const cached = await CacheService.get(cacheKey);
      if (cached) {
        logger.debug('Geocoding from cache');
        return cached;
      }

      let coordinates = null;

      // Try Google Maps first
      if (process.env.GOOGLE_MAPS_API_KEY) {
        coordinates = await this.geocodeWithGoogle(locationName);
      }
      
      // Fallback to OpenStreetMap Nominatim
      if (!coordinates) {
        coordinates = await this.geocodeWithNominatim(locationName);
      }

      if (coordinates) {
        // Cache for 24 hours (locations don't change often)
        await CacheService.set(cacheKey, coordinates, 24 * 60);
        logger.info('Location geocoded', { locationName, coordinates });
      }

      return coordinates;
      
    } catch (error) {
      logger.error('Geocoding error:', error);
      return null;
    }
  }

  static async geocodeWithGoogle(locationName) {
    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          address: locationName,
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      });

      if (response.data.results && response.data.results.length > 0) {
        const result = response.data.results[0];
        return {
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
          formatted_address: result.formatted_address,
          source: 'google_maps'
        };
      }
    } catch (error) {
      logger.error('Google Maps geocoding error:', error);
    }
    return null;
  }

  static async geocodeWithNominatim(locationName) {
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: locationName,
          format: 'json',
          limit: 1
        },
        headers: {
          'User-Agent': 'DisasterResponsePlatform/1.0'
        }
      });

      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        return {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          formatted_address: result.display_name,
          source: 'openstreetmap'
        };
      }
    } catch (error) {
      logger.error('Nominatim geocoding error:', error);
    }
    return null;
  }
}