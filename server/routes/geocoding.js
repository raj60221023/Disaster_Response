import express from 'express';
import { GeminiService } from '../services/geminiService.js';
import { GeocodingService } from '../services/geocodingService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// POST /geocode - Extract location from text and convert to coordinates
router.post('/geocode', async (req, res) => {
  try {
    const { description, location_name } = req.body;

    if (!description && !location_name) {
      return res.status(400).json({ 
        error: 'Either description or location_name is required' 
      });
    }

    let extractedData = { locations: [] };
    let geocodedResults = [];

    // If description provided, extract locations using Gemini
    if (description) {
      extractedData = await GeminiService.extractLocation(description);
      
      if (extractedData.error) {
        return res.status(500).json({ 
          error: 'Failed to extract locations from description',
          details: extractedData.error
        });
      }
    }

    // If location_name provided directly, add it to locations list
    if (location_name) {
      extractedData.locations.push(location_name);
    }

    // Geocode each extracted location
    for (const location of extractedData.locations) {
      const coordinates = await GeocodingService.geocodeLocation(location);
      
      geocodedResults.push({
        location_name: location,
        coordinates,
        geocoded: coordinates !== null
      });
    }

    const response = {
      original_description: description,
      extracted_locations: extractedData.locations,
      geocoded_results: geocodedResults,
      successful_geocodes: geocodedResults.filter(r => r.geocoded).length,
      processed_at: new Date().toISOString()
    };

    logger.info('Geocoding completed', { 
      extracted: extractedData.locations.length,
      geocoded: response.successful_geocodes
    });

    res.json(response);

  } catch (error) {
    logger.error('Geocoding error:', error);
    res.status(500).json({ error: 'Failed to process geocoding request' });
  }
});

// GET /geocode/location/:name - Geocode a specific location name
router.get('/geocode/location/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    const coordinates = await GeocodingService.geocodeLocation(name);
    
    if (!coordinates) {
      return res.status(404).json({ 
        error: 'Location not found',
        location_name: name
      });
    }

    logger.info('Location geocoded', { location: name, coordinates });

    res.json({
      location_name: name,
      coordinates,
      geocoded_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Location geocoding error:', error);
    res.status(500).json({ error: 'Failed to geocode location' });
  }
});

export default router;