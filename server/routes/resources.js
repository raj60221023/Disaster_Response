import express from 'express';
import { supabase } from '../config/supabase.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

const router = express.Router();

// GET /disasters/:id/resources - Get resources near disaster location
router.get('/disasters/:id/resources', async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lon, radius = 10000 } = req.query; // radius in meters, default 10km

    // Get disaster location if lat/lon not provided
    let searchLat = lat;
    let searchLon = lon;

    if (!searchLat || !searchLon) {
      const { data: disaster, error: disasterError } = await supabase
        .from('disasters')
        .select('location')
        .eq('id', id)
        .single();

      if (disasterError) throw disasterError;
      if (!disaster || !disaster.location) {
        return res.status(400).json({ 
          error: 'Location coordinates required or disaster must have location set' 
        });
      }

      // Parse PostGIS POINT format
      const locationMatch = disaster.location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
      if (locationMatch) {
        searchLon = parseFloat(locationMatch[1]);
        searchLat = parseFloat(locationMatch[2]);
      }
    }

    // Geospatial query to find resources within radius
    const { data: resources, error } = await supabase
      .rpc('find_nearby_resources', {
        search_lat: parseFloat(searchLat),
        search_lon: parseFloat(searchLon),
        search_radius: parseInt(radius)
      });

    if (error) throw error;

    // If no resources found, create some sample resources for demo
    if (resources.length === 0) {
      await createSampleResources(id, searchLat, searchLon);
      
      // Re-query after creating sample data
      const { data: newResources, error: newError } = await supabase
        .rpc('find_nearby_resources', {
          search_lat: parseFloat(searchLat),
          search_lon: parseFloat(searchLon),
          search_radius: parseInt(radius)
        });

      if (newError) throw newError;
      
      // Emit real-time update
      req.io.emit('resources_updated', {
        disaster_id: id,
        resources: newResources,
        location: { lat: searchLat, lon: searchLon }
      });

      logger.info('Resources found (including new samples)', { 
        disasterId: id, 
        count: newResources.length 
      });

      return res.json({ 
        resources: newResources,
        search_location: { lat: searchLat, lon: searchLon },
        radius_km: radius / 1000
      });
    }

    logger.info('Resources found', { disasterId: id, count: resources.length });

    res.json({ 
      resources,
      search_location: { lat: searchLat, lon: searchLon },
      radius_km: radius / 1000
    });

  } catch (error) {
    logger.error('Error fetching resources:', error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

// POST /disasters/:id/resources - Add new resource
router.post('/disasters/:id/resources', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location_name, latitude, longitude, type, capacity, contact } = req.body;

    if (!name || !latitude || !longitude || !type) {
      return res.status(400).json({ 
        error: 'Name, coordinates, and type are required' 
      });
    }

    const resourceId = uuidv4();
    const locationData = `POINT(${longitude} ${latitude})`;

    const { data, error } = await supabase
      .from('resources')
      .insert({
        id: resourceId,
        disaster_id: id,
        name,
        location_name,
        location: locationData,
        type,
        capacity,
        contact,
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;

    // Emit real-time update
    req.io.emit('resource_added', {
      disaster_id: id,
      resource: data
    });

    logger.info('Resource added', { id: resourceId, name, type });
    res.status(201).json({ resource: data });

  } catch (error) {
    logger.error('Error adding resource:', error);
    res.status(500).json({ error: 'Failed to add resource' });
  }
});

// Helper function to create sample resources
async function createSampleResources(disasterId, lat, lon) {
  const sampleResources = [
    {
      id: uuidv4(),
      disaster_id: disasterId,
      name: 'Emergency Shelter - Community Center',
      location_name: 'Main Street Community Center',
      location: `POINT(${lon + 0.01} ${lat + 0.01})`,
      type: 'shelter',
      capacity: 200,
      contact: 'shelter@community.org',
      status: 'active'
    },
    {
      id: uuidv4(),
      disaster_id: disasterId,
      name: 'Food Distribution Center',
      location_name: 'City Park Distribution Point',
      location: `POINT(${lon - 0.005} ${lat + 0.008})`,
      type: 'food',
      capacity: 500,
      contact: '555-FOOD-AID',
      status: 'active'
    },
    {
      id: uuidv4(),
      disaster_id: disasterId,
      name: 'Medical Station',
      location_name: 'Mobile Medical Unit #1',
      location: `POINT(${lon + 0.003} ${lat - 0.004})`,
      type: 'medical',
      capacity: 50,
      contact: 'medic1@emergency.gov',
      status: 'active'
    },
    {
      id: uuidv4(),
      disaster_id: disasterId,
      name: 'Water Distribution Point',
      location_name: 'Fire Station #3',
      location: `POINT(${lon - 0.008} ${lat - 0.002})`,
      type: 'water',
      capacity: 1000,
      contact: 'water@emergency.gov',
      status: 'active'
    }
  ];

  const { error } = await supabase
    .from('resources')
    .insert(sampleResources);

  if (error) {
    logger.error('Error creating sample resources:', error);
  } else {
    logger.info('Sample resources created', { count: sampleResources.length });
  }
}

export default router;