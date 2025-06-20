import express from 'express';
import { supabase } from '../config/supabase.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { GeminiService } from '../services/geminiService.js';

const router = express.Router();

// Mock authentication middleware
const authenticate = (req, res, next) => {
  // In production, implement proper JWT authentication
  req.user = { 
    id: 'netrunnerX', 
    role: 'admin',
    name: 'Emergency Coordinator'
  };
  next();
};

// GET /disasters - List all disasters with filtering
router.get('/disasters', authenticate, async (req, res) => {
  try {
    const { tag, owner_id, limit = 20, offset = 0 } = req.query;
    
    let query = supabase
      .from('disasters')
      .select(`
        id,
        title,
        location_name,
        location,
        description,
        tags,
        owner_id,
        created_at,
        audit_trail
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    if (owner_id) {
      query = query.eq('owner_id', owner_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    logger.info(`Disasters listed: ${data.length} results`);
    res.json({
      disasters: data,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: data.length
      }
    });

  } catch (error) {
    logger.error('Error listing disasters:', error);
    res.status(500).json({ error: 'Failed to fetch disasters' });
  }
});

// POST /disasters - Create new disaster
router.post('/disasters', authenticate, async (req, res) => {
  try {
    const { title, location_name, description, tags, latitude, longitude } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const disasterId = uuidv4();
    
    // Analyze disaster severity using Gemini
    let severityAnalysis = null;
    try {
      severityAnalysis = await GeminiService.analyzeDisasterSeverity(description, tags || []);
    } catch (err) {
      logger.warn('Failed to analyze disaster severity:', err);
    }

    const auditEntry = {
      action: 'create',
      user_id: req.user.id,
      timestamp: new Date().toISOString(),
      changes: { title, location_name, description, tags },
      severity_analysis: severityAnalysis
    };

    let locationData = null;
    if (latitude && longitude) {
      locationData = `POINT(${longitude} ${latitude})`;
    }

    const { data, error } = await supabase
      .from('disasters')
      .insert({
        id: disasterId,
        title,
        location_name,
        location: locationData,
        description,
        tags: tags || [],
        owner_id: req.user.id,
        audit_trail: [auditEntry]
      })
      .select()
      .single();

    if (error) throw error;

    // Emit real-time update
    req.io.emit('disaster_created', {
      disaster: data,
      user: req.user.name,
      severity: severityAnalysis
    });

    logger.info('Disaster created', { 
      id: disasterId, 
      title, 
      owner: req.user.id,
      severity: severityAnalysis?.severity_level 
    });
    
    res.status(201).json({ 
      disaster: data,
      severity_analysis: severityAnalysis
    });

  } catch (error) {
    logger.error('Error creating disaster:', error);
    res.status(500).json({ error: 'Failed to create disaster' });
  }
});

// PUT /disasters/:id - Update disaster
router.put('/disasters/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, location_name, description, tags, latitude, longitude } = req.body;

    // Get existing disaster for audit trail
    const { data: existing, error: fetchError } = await supabase
      .from('disasters')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!existing) {
      return res.status(404).json({ error: 'Disaster not found' });
    }

    // Check ownership (admins can edit any, contributors only their own)
    if (req.user.role !== 'admin' && existing.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Re-analyze severity if description or tags changed
    let severityAnalysis = null;
    if (description !== existing.description || JSON.stringify(tags) !== JSON.stringify(existing.tags)) {
      try {
        severityAnalysis = await GeminiService.analyzeDisasterSeverity(
          description || existing.description, 
          tags || existing.tags
        );
      } catch (err) {
        logger.warn('Failed to re-analyze disaster severity:', err);
      }
    }

    const auditEntry = {
      action: 'update',
      user_id: req.user.id,
      timestamp: new Date().toISOString(),
      changes: { title, location_name, description, tags },
      severity_analysis: severityAnalysis
    };

    let locationData = existing.location;
    if (latitude && longitude) {
      locationData = `POINT(${longitude} ${latitude})`;
    }

    const { data, error } = await supabase
      .from('disasters')
      .update({
        title: title || existing.title,
        location_name: location_name || existing.location_name,
        location: locationData,
        description: description || existing.description,
        tags: tags || existing.tags,
        audit_trail: [...existing.audit_trail, auditEntry]
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Emit real-time update
    req.io.emit('disaster_updated', {
      disaster: data,
      user: req.user.name,
      severity: severityAnalysis
    });

    logger.info('Disaster updated', { 
      id, 
      title, 
      updatedBy: req.user.id,
      severity: severityAnalysis?.severity_level 
    });
    
    res.json({ 
      disaster: data,
      severity_analysis: severityAnalysis
    });

  } catch (error) {
    logger.error('Error updating disaster:', error);
    res.status(500).json({ error: 'Failed to update disaster' });
  }
});

// DELETE /disasters/:id - Delete disaster
router.delete('/disasters/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Get existing disaster to check ownership
    const { data: existing, error: fetchError } = await supabase
      .from('disasters')
      .select('owner_id, title')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!existing) {
      return res.status(404).json({ error: 'Disaster not found' });
    }

    // Check ownership (admins can delete any, contributors only their own)
    if (req.user.role !== 'admin' && existing.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { error } = await supabase
      .from('disasters')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Emit real-time update
    req.io.emit('disaster_deleted', {
      disaster_id: id,
      title: existing.title,
      user: req.user.name
    });

    logger.info('Disaster deleted', { id, title: existing.title, deletedBy: req.user.id });
    res.json({ message: 'Disaster deleted successfully' });

  } catch (error) {
    logger.error('Error deleting disaster:', error);
    res.status(500).json({ error: 'Failed to delete disaster' });
  }
});

// GET /disasters/:id - Get single disaster
router.get('/disasters/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('disasters')
      .select(`
        id,
        title,
        location_name,
        location,
        description,
        tags,
        owner_id,
        created_at,
        audit_trail
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Disaster not found' });
    }

    logger.info('Disaster retrieved', { id });
    res.json({ disaster: data });

  } catch (error) {
    logger.error('Error retrieving disaster:', error);
    res.status(500).json({ error: 'Failed to retrieve disaster' });
  }
});

export default router;