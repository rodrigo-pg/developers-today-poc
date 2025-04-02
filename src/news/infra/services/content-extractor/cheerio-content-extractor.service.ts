import { Injectable, Logger } from '@nestjs/common';
import { ContentExtractor, ExtractedContent } from '../../../domain/services/content-extractor.interface';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Either, left, right } from '@sweet-monads/either';

@Injectable()
export class CheerioContentExtractor implements ContentExtractor {
  private readonly logger = new Logger(CheerioContentExtractor.name);

  async extractContent(url: string): Promise<Either<Error, ExtractedContent>> {
    try {
      const html = await this.fetchHtml(url);
      const $ = cheerio.load(html);
      
      $('script, style, iframe, nav, footer, header, aside').remove();

      const title = $('title').text().trim() || $('h1').first().text().trim();
      
      const date = this.extractDate($);
      
      const content = this.extractArticleContent($);
      
      return right({ title, content, date });
    } catch (error) {
      this.logger.error(`Error extracting content from ${url}: ${error.message}`);
      return left(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async fetchHtml(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NewsRAGBot/1.0)',
        },
        timeout: 10000,
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch URL ${url}: ${error.message}`);
      throw error;
    }
  }

  private extractArticleContent($: cheerio.CheerioAPI): string {
    const possibleArticleSelectors = [
      'article', '.article', '.post', '.content', '.entry-content',
      '[itemprop="articleBody"]', '.story-body', '.story-content'
    ];
    
    for (const selector of possibleArticleSelectors) {
      const element = $(selector);
      if (element.length) {
        return element.text().replace(/\s+/g, ' ').trim();
      }
    }
    
    return $('body').text().replace(/\s+/g, ' ').trim();
  }

  private extractDate($: cheerio.CheerioAPI): string | undefined {
    const dateSelectors = [
      '[itemprop="datePublished"]',
      '.date',
      '.published',
      '.post-date',
      'time',
    ];
    
    for (const selector of dateSelectors) {
      const element = $(selector);
      if (element.length) {
        const dateText = element.attr('datetime') || element.text().trim();
        if (dateText) {
          try {
            const date = new Date(dateText);
            if (!isNaN(date.getTime())) {
              return date.toISOString().split('T')[0];
            }
          } catch (e) {
            // Continue to next selector if date parsing fails
          }
        }
      }
    }
    
    return undefined;
  }
} 