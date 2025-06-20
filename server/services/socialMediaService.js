import axios from 'axios';
import { CacheService } from './cacheService.js';
import { logger } from '../utils/logger.js';

export class SocialMediaService {
  static async fetchDisasterReports(keywords, location = null) {
    const cacheKey = `social_${keywords.join('_')}_${location || 'global'}`;
    
    try {
      // Check cache first (5 minutes for social media)
      const cached = await CacheService.get(cacheKey);
      if (cached) {
        logger.debug('Social media data from cache');
        return cached;
      }

      let reports = [];

      // Try Twitter API if available
      if (process.env.TWITTER_BEARER_TOKEN) {
        reports = await this.fetchFromTwitter(keywords, location);
      } else {
        // Use mock data for development
        reports = await this.getMockSocialMediaData(keywords, location);
      }

      const socialMediaData = {
        reports,
        keywords,
        location,
        fetched_at: new Date().toISOString(),
        source: process.env.TWITTER_BEARER_TOKEN ? 'twitter' : 'mock'
      };

      // Cache for 5 minutes
      await CacheService.set(cacheKey, socialMediaData, 5);
      
      logger.info('Social media reports fetched', { count: reports.length });
      return socialMediaData;
      
    } catch (error) {
      logger.error('Social media fetch error:', error);
      return { reports: [], error: error.message };
    }
  }

  static async fetchFromTwitter(keywords, location) {
    try {
      const query = keywords.map(k => `#${k}`).join(' OR ');
      
      const response = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
        headers: {
          'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
        },
        params: {
          query: query,
          max_results: 20,
          'tweet.fields': 'created_at,author_id,public_metrics,context_annotations'
        }
      });

      return response.data.data?.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        author_id: tweet.author_id,
        created_at: tweet.created_at,
        engagement: tweet.public_metrics,
        priority: this.calculatePriority(tweet.text),
        source: 'twitter'
      })) || [];
      
    } catch (error) {
      logger.error('Twitter API error:', error);
      return [];
    }
  }

  static async getMockSocialMediaData(keywords, location) {
    // Mock social media reports for development
    const mockReports = [
      {
        id: 'mock_1',
        text: `#floodrelief Urgent: Need food and water in ${location || 'downtown area'}. Families stranded on rooftops.`,
        author_id: 'citizen123',
        created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        priority: 'high',
        source: 'mock_twitter'
      },
      {
        id: 'mock_2',
        text: `#disasterresponse Local shelter at community center is accepting donations. ${keywords[0]} volunteers needed.`,
        author_id: 'volunteer_org',
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        priority: 'medium',
        source: 'mock_twitter'
      },
      {
        id: 'mock_3',
        text: `Road closures in effect due to ${keywords[0]}. Alternative routes available via highway 101.`,
        author_id: 'traffic_dept',
        created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        priority: 'low',
        source: 'mock_twitter'
      }
    ];

    return mockReports;
  }

  static calculatePriority(text) {
    const urgentKeywords = ['urgent', 'emergency', 'sos', 'help', 'trapped', 'injured'];
    const moderateKeywords = ['need', 'volunteer', 'donation', 'shelter'];
    
    const lowerText = text.toLowerCase();
    
    if (urgentKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'high';
    } else if (moderateKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'medium';
    }
    
    return 'low';
  }
}