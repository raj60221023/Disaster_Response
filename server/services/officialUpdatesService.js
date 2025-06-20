import axios from 'axios';
import * as cheerio from 'cheerio';
import { CacheService } from './cacheService.js';
import { logger } from '../utils/logger.js';

export class OfficialUpdatesService {
  static async fetchOfficialUpdates(disasterType, location) {
    const cacheKey = `official_updates_${disasterType}_${location}`;
    
    try {
      // Check cache first (30 minutes for official updates)
      const cached = await CacheService.get(cacheKey);
      if (cached) {
        logger.debug('Official updates from cache');
        return cached;
      }

      const updates = await this.scrapeOfficialSources(disasterType, location);
      
      const updatesData = {
        updates,
        disaster_type: disasterType,
        location,
        fetched_at: new Date().toISOString()
      };

      // Cache for 30 minutes
      await CacheService.set(cacheKey, updatesData, 30);
      
      logger.info('Official updates fetched', { count: updates.length });
      return updatesData;
      
    } catch (error) {
      logger.error('Official updates fetch error:', error);
      return { updates: [], error: error.message };
    }
  }

  static async scrapeOfficialSources(disasterType, location) {
    const updates = [];

    try {
      // Mock official updates for development
      // In production, you would scrape actual government/relief websites
      const mockUpdates = [
        {
          title: `${disasterType.toUpperCase()} Alert: ${location} Area`,
          content: `Official evacuation orders in effect for residents in flood-prone areas. Emergency shelters opened at local schools.`,
          source: 'Emergency Management Agency',
          published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          urgency: 'high',
          url: 'https://emergency.gov/alerts/flood-alert'
        },
        {
          title: `Resource Distribution Centers Open`,
          content: `Three resource distribution centers are now operational in ${location}. Providing food, water, and medical supplies.`,
          source: 'Red Cross',
          published_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          urgency: 'medium',
          url: 'https://redcross.org/disaster-relief'
        },
        {
          title: `Weather Update: ${disasterType} Conditions`,
          content: `Current weather conditions show improvement. Residents advised to remain cautious and follow local authority guidance.`,
          source: 'National Weather Service',
          published_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          urgency: 'low',
          url: 'https://weather.gov/alerts'
        }
      ];

      updates.push(...mockUpdates);
      
    } catch (error) {
      logger.error('Error scraping official sources:', error);
    }

    return updates;
  }

  // Example of how to scrape a real website (commented out for demo)
  /*
  static async scrapeFEMA() {
    try {
      const response = await axios.get('https://www.fema.gov/disaster/current');
      const $ = cheerio.load(response.data);
      
      const updates = [];
      $('.disaster-item').each((i, element) => {
        const title = $(element).find('.title').text().trim();
        const content = $(element).find('.content').text().trim();
        const date = $(element).find('.date').text().trim();
        
        updates.push({
          title,
          content,
          source: 'FEMA',
          published_at: new Date(date).toISOString(),
          urgency: 'medium'
        });
      });
      
      return updates;
    } catch (error) {
      logger.error('FEMA scraping error:', error);
      return [];
    }
  }
  */
}