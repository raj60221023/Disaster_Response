import express from 'express';
import { SocialMediaService } from '../services/socialMediaService.js';
import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// GET /disasters/:id/social-media - Get social media reports for a disaster
router.get('/disasters/:id/social-media', async (req, res) => {
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

    // Use disaster tags as keywords for social media search
    const keywords = disaster.tags.length > 0 ? disaster.tags : ['disaster', 'emergency'];
    
    const socialMediaData = await SocialMediaService.fetchDisasterReports(
      keywords, 
      disaster.location_name
    );

    // Store reports in database for persistence
    if (socialMediaData.reports && socialMediaData.reports.length > 0) {
      const reportsToInsert = socialMediaData.reports.map(report => ({
        disaster_id: id,
        social_media_id: report.id,
        content: report.text,
        author_id: report.author_id,
        priority: report.priority || 'low',
        source: report.source,
        published_at: report.created_at,
        created_at: new Date().toISOString()
      }));

      // Insert reports (ignore conflicts for existing reports)
      const { error: insertError } = await supabase
        .from('social_media_reports')
        .upsert(reportsToInsert, { 
          onConflict: 'social_media_id',
          ignoreDuplicates: true 
        });

      if (insertError) {
        logger.warn('Error storing social media reports:', insertError);
      }
    }

    // Emit real-time update
    req.io.emit('social_media_updated', {
      disaster_id: id,
      reports: socialMediaData.reports,
      count: socialMediaData.reports.length
    });

    logger.info('Social media reports fetched', { 
      disasterId: id, 
      count: socialMediaData.reports.length 
    });

    res.json(socialMediaData);

  } catch (error) {
    logger.error('Error fetching social media reports:', error);
    res.status(500).json({ error: 'Failed to fetch social media reports' });
  }
});

// GET /disasters/:id/social-media/priority - Get high priority social media reports
router.get('/disasters/:id/social-media/priority', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: reports, error } = await supabase
      .from('social_media_reports')
      .select('*')
      .eq('disaster_id', id)
      .eq('priority', 'high')
      .order('published_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    logger.info('Priority social media reports retrieved', { 
      disasterId: id, 
      count: reports.length 
    });

    res.json({ priority_reports: reports });

  } catch (error) {
    logger.error('Error fetching priority social media reports:', error);
    res.status(500).json({ error: 'Failed to fetch priority reports' });
  }
});

export default router;