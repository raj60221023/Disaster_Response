import express from 'express';
import { GeminiService } from '../services/geminiService.js';
import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// POST /disasters/:id/verify-image - Verify disaster image authenticity
router.post('/disasters/:id/verify-image', async (req, res) => {
  try {
    const { id } = req.params;
    const { image_url, context } = req.body;

    if (!image_url) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // Get disaster context if not provided
    let verificationContext = context;
    if (!verificationContext) {
      const { data: disaster, error } = await supabase
        .from('disasters')
        .select('title, description, tags')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (disaster) {
        verificationContext = `${disaster.title}: ${disaster.description}. Tags: ${disaster.tags.join(', ')}`;
      }
    }

    // Verify image using Gemini API
    const verificationResult = await GeminiService.verifyImage(image_url, verificationContext);

    // Store verification result
    const { data: report, error: insertError } = await supabase
      .from('image_verifications')
      .insert({
        disaster_id: id,
        image_url,
        verification_score: verificationResult.verification_score,
        is_authentic: verificationResult.is_authentic,
        analysis: verificationResult.analysis,
        context_match: verificationResult.context_match,
        verification_data: verificationResult,
        verified_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      logger.warn('Error storing verification result:', insertError);
    }

    // Emit real-time update
    req.io.to(`disaster_${id}`).emit('image_verified', {
      disaster_id: id,
      image_url,
      verification: verificationResult
    });

    logger.info('Image verified', { 
      disasterId: id, 
      score: verificationResult.verification_score,
      authentic: verificationResult.is_authentic
    });

    res.json({
      disaster_id: id,
      image_url,
      verification: verificationResult,
      stored_report_id: report?.id
    });

  } catch (error) {
    logger.error('Image verification error:', error);
    res.status(500).json({ error: 'Failed to verify image' });
  }
});

// GET /disasters/:id/verifications - Get all image verifications for a disaster
router.get('/disasters/:id/verifications', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const { data: verifications, error } = await supabase
      .from('image_verifications')
      .select('*')
      .eq('disaster_id', id)
      .order('verified_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    logger.info('Image verifications retrieved', { 
      disasterId: id, 
      count: verifications.length 
    });

    res.json({
      disaster_id: id,
      verifications,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: verifications.length
      }
    });

  } catch (error) {
    logger.error('Error retrieving verifications:', error);
    res.status(500).json({ error: 'Failed to retrieve verifications' });
  }
});

// GET /verifications/suspicious - Get images with low verification scores
router.get('/verifications/suspicious', async (req, res) => {
  try {
    const { threshold = 50, limit = 20 } = req.query;

    const { data: suspiciousImages, error } = await supabase
      .from('image_verifications')
      .select(`
        *,
        disasters (title, location_name)
      `)
      .lt('verification_score', threshold)
      .order('verification_score', { ascending: true })
      .limit(limit);

    if (error) throw error;

    logger.info('Suspicious images retrieved', { 
      count: suspiciousImages.length,
      threshold
    });

    res.json({
      suspicious_images: suspiciousImages,
      threshold,
      count: suspiciousImages.length
    });

  } catch (error) {
    logger.error('Error retrieving suspicious images:', error);
    res.status(500).json({ error: 'Failed to retrieve suspicious images' });
  }
});

export default router;