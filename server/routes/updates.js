import express from 'express';
import { OfficialUpdatesService } from '../services/officialUpdatesService.js';
import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// GET /disasters/:id/official-updates - Get official updates for a disaster
router.get('/disasters/:id/official-updates', async (req, res) => {
  try {
    const { id } = req.params;
    const { refresh = false } = req.query;

    // Get disaster details
    const { data: disaster, error: disasterError } = await supabase
      .from('disasters')
      .select('tags, location_name, title')
      .eq('id', id)
      .single();

    if (disasterError) throw disasterError;
    if (!disaster) {
      return res.status(404).json({ error: 'Disaster not found' });
    }

    // Determine disaster type from tags
    const disasterType = disaster.tags.length > 0 ? disaster.tags[0] : 'disaster';
    
    const updatesData = await OfficialUpdatesService.fetchOfficialUpdates(
      disasterType,
      disaster.location_name || disaster.title
    );

    // Store updates in database for persistence
    if (updatesData.updates && updatesData.updates.length > 0) {
      const updatesToInsert = updatesData.updates.map(update => ({
        disaster_id: id,
        title: update.title,
        content: update.content,
        source: update.source,
        urgency: update.urgency,
        external_url: update.url,
        published_at: update.published_at,
        created_at: new Date().toISOString()
      }));

      // Insert updates (ignore conflicts for existing updates)
      const { error: insertError } = await supabase
        .from('official_updates')
        .upsert(updatesToInsert, { 
          onConflict: 'disaster_id,title,source',
          ignoreDuplicates: true 
        });

      if (insertError) {
        logger.warn('Error storing official updates:', insertError);
      }
    }

    // Emit real-time update
    req.io.emit('official_updates_received', {
      disaster_id: id,
      updates: updatesData.updates,
      count: updatesData.updates.length
    });

    logger.info('Official updates fetched', { 
      disasterId: id, 
      count: updatesData.updates.length 
    });

    res.json(updatesData);

  } catch (error) {
    logger.error('Error fetching official updates:', error);
    res.status(500).json({ error: 'Failed to fetch official updates' });
  }
});

// GET /disasters/:id/official-updates/urgent - Get urgent official updates
router.get('/disasters/:id/official-updates/urgent', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: urgentUpdates, error } = await supabase
      .from('official_updates')
      .select('*')
      .eq('disaster_id', id)
      .eq('urgency', 'high')
      .order('published_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    logger.info('Urgent official updates retrieved', { 
      disasterId: id, 
      count: urgentUpdates.length 
    });

    res.json({ urgent_updates: urgentUpdates });

  } catch (error) {
    logger.error('Error fetching urgent official updates:', error);
    res.status(500).json({ error: 'Failed to fetch urgent updates' });
  }
});

// GET /updates/all - Get all recent official updates across all disasters
router.get('/updates/all', async (req, res) => {
  try {
    const { limit = 50, urgency } = req.query;

    let query = supabase
      .from('official_updates')
      .select(`
        *,
        disasters (title, location_name, tags)
      `)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (urgency) {
      query = query.eq('urgency', urgency);
    }

    const { data: allUpdates, error } = await query;

    if (error) throw error;

    logger.info('All official updates retrieved', { 
      count: allUpdates.length,
      urgency: urgency || 'all'
    });

    res.json({ 
      updates: allUpdates,
      filter: { urgency: urgency || 'all' },
      count: allUpdates.length
    });

  } catch (error) {
    logger.error('Error fetching all official updates:', error);
    res.status(500).json({ error: 'Failed to fetch updates' });
  }
});

export default router;