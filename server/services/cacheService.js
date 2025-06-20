import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

export class CacheService {
  static async get(key) {
    try {
      const { data, error } = await supabase
        .from('cache')
        .select('value, expires_at')
        .eq('key', key)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) return null;

      // Check if cache has expired
      if (new Date(data.expires_at) < new Date()) {
        await this.delete(key);
        return null;
      }

      return data.value;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  static async set(key, value, ttlMinutes = 60) {
    try {
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
      
      const { error } = await supabase
        .from('cache')
        .upsert({
          key,
          value,
          expires_at: expiresAt.toISOString()
        });

      if (error) throw error;
      
      logger.debug(`Cache set: ${key} (TTL: ${ttlMinutes}min)`);
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  static async delete(key) {
    try {
      const { error } = await supabase
        .from('cache')
        .delete()
        .eq('key', key);

      if (error) throw error;
    } catch (error) {
      logger.error('Cache delete error:', error);
    }
  }
}

export async function cleanExpiredCache() {
  try {
    const { error } = await supabase
      .from('cache')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) throw error;
    
    logger.info('Expired cache entries cleaned');
  } catch (error) {
    logger.error('Cache cleanup error:', error);
  }
}