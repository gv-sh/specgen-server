/**
 * Simplified AI service using existing patterns
 */

import axios from 'axios';
import boom from '@hapi/boom';

// Visual elements patterns (simplified from original extractor)
const VISUAL_PATTERNS = {
  characters: [
    /(Dr\.|Professor|Captain|Agent|Detective|Pandit|Guru|Swami)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
    /(Arjun|Priya|Raj|Kavya|Dev|Meera|Ravi|Anita|Vikram|Shreya)\s+(?:stood|walked|ran|sat|looked|gazed)/gi
  ],
  locations: [
    /(in|at|on|through)\s+(the\s+)?([A-Z][a-z\s]{3,30}(?:city|planet|station|facility|temple|palace))/gi,
    /(Mumbai|Delhi|Bangalore|Chennai|Kolkata|Hyderabad)/gi
  ],
  objects: [
    /(advanced|alien|ancient|glowing|metallic|golden)\s+(scanner|device|weapon|helmet|artifact|tabla|sitar)/gi
  ],
  atmosphere: [
    /(red|blue|green|golden|silver|purple|saffron)\s+(light|glow|mist|sky|flame)/gi
  ]
};

class AIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseUrl = 'https://api.openai.com/v1';
    this.isConfigured = Boolean(this.apiKey);
  }

  /**
   * Generate content based on type and parameters
   */
  async generate(type, parameters, year = null) {
    if (!this.isConfigured) {
      throw boom.internal('OpenAI API key not configured');
    }

    switch (type) {
      case 'fiction':
        return this.generateFiction(parameters, year);
      case 'image':
        return this.generateImage(parameters, year);
      case 'combined':
        return this.generateCombined(parameters, year);
      default:
        throw boom.badRequest(`Unsupported generation type: ${type}`);
    }
  }

  /**
   * Generate fiction content
   */
  async generateFiction(parameters, year) {
    const prompt = this.buildFictionPrompt(parameters, year);
    
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a speculative fiction generator that creates compelling, imaginative stories.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 1000
        },
        {
          headers: { Authorization: `Bearer ${this.apiKey}` }
        }
      );

      const content = response.data.choices[0].message.content;
      const title = this.extractTitle(content);

      return {
        success: true,
        title,
        content,
        type: 'fiction',
        metadata: {
          model: response.data.model,
          tokens: response.data.usage.total_tokens
        }
      };
    } catch (error) {
      throw boom.internal('Fiction generation failed', error);
    }
  }

  /**
   * Generate image content
   */
  async generateImage(parameters, year, generatedText = null) {
    const prompt = this.buildImagePrompt(parameters, year, generatedText);
    
    try {
      const response = await axios.post(
        `${this.baseUrl}/images/generations`,
        {
          model: 'dall-e-3',
          prompt: prompt.substring(0, 4000), // DALL-E prompt limit
          size: '1024x1024',
          quality: 'standard',
          response_format: 'b64_json',
          n: 1
        },
        {
          headers: { Authorization: `Bearer ${this.apiKey}` }
        }
      );

      const imageData = Buffer.from(response.data.data[0].b64_json, 'base64');

      return {
        success: true,
        imageData,
        type: 'image',
        metadata: {
          model: 'dall-e-3',
          prompt: prompt.substring(0, 100) + '...'
        }
      };
    } catch (error) {
      throw boom.internal('Image generation failed', error);
    }
  }

  /**
   * Generate combined fiction and image
   */
  async generateCombined(parameters, year) {
    // Generate fiction first
    const fictionResult = await this.generateFiction(parameters, year);
    if (!fictionResult.success) {
      return fictionResult;
    }

    // Generate image based on the fiction
    const imageResult = await this.generateImage(parameters, year, fictionResult.content);
    if (!imageResult.success) {
      return imageResult;
    }

    return {
      success: true,
      title: fictionResult.title,
      content: fictionResult.content,
      imageData: imageResult.imageData,
      type: 'combined',
      metadata: {
        fiction: fictionResult.metadata,
        image: imageResult.metadata
      }
    };
  }

  /**
   * Build fiction generation prompt
   */
  buildFictionPrompt(parameters, year) {
    let prompt = 'Create a compelling speculative fiction story with the following elements:\n\n';
    
    // Add year context
    if (year) {
      prompt += `Setting: Year ${year}\n`;
    }
    
    // Add parameter-based elements
    Object.entries(parameters).forEach(([category, categoryParams]) => {
      if (typeof categoryParams === 'object') {
        Object.entries(categoryParams).forEach(([param, value]) => {
          if (value !== null && value !== undefined) {
            prompt += `${param.replace(/-/g, ' ')}: ${value}\n`;
          }
        });
      }
    });
    
    prompt += '\nWrite a story that incorporates these elements naturally. Include a compelling title.';
    return prompt;
  }

  /**
   * Build image generation prompt
   */
  buildImagePrompt(parameters, year, generatedText) {
    let prompt = 'Create a beautiful, detailed image';
    
    if (generatedText) {
      const visualElements = this.extractVisualElements(generatedText);
      if (visualElements.length > 0) {
        prompt += ` showing: ${visualElements.join(', ')}`;
      }
    }
    
    if (year) {
      prompt += ` Set in year ${year}.`;
    }
    
    // Add style guidance
    prompt += ' Use high-quality, photorealistic rendering with attention to detail and composition.';
    
    return prompt;
  }

  /**
   * Extract visual elements from text (simplified)
   */
  extractVisualElements(text) {
    const elements = [];
    const cleanText = text.replace(/\*\*Title:.*?\*\*/g, '').trim();
    
    // Apply pattern matching
    Object.values(VISUAL_PATTERNS).forEach(patterns => {
      patterns.forEach(pattern => {
        const matches = cleanText.match(pattern) || [];
        matches.slice(0, 2).forEach(match => {
          const cleaned = match.replace(/\s+(stood|walked|ran|sat|looked|gazed).*$/i, '').trim();
          if (cleaned.length > 2 && cleaned.length < 50) {
            elements.push(cleaned);
          }
        });
      });
    });
    
    // Remove duplicates and limit
    return [...new Set(elements)].slice(0, 5);
  }

  /**
   * Extract title from generated content
   */
  extractTitle(content) {
    const titleMatch = content.match(/\*\*Title:\s*([^*\n]+)\*\*/);
    if (titleMatch) {
      return titleMatch[1].trim();
    }
    
    const firstLine = content.split('\n')[0];
    if (firstLine.length < 100) {
      return firstLine.replace(/^\*\*|\*\*$/g, '').trim();
    }
    
    return `Fiction ${new Date().toISOString().slice(0, 10)}`;
  }
}

export default new AIService();