import axios from 'axios';
import { Buffer } from 'buffer';
import settingsService from './settingsService.js';
import logger from '../utils/logger.js';
import environment from '../utils/environment.js';
import { extractVisualElementsFromText } from '../utils/visualElementsExtractor.js';

class AIService {
  constructor() {
    this.apiKey = environment.config.openaiApiKey;
    this.baseUrl = 'https://api.openai.com/v1';
    this.chatCompletionUrl = `${this.baseUrl}/chat/completions`;
    this.imageGenerationUrl = `${this.baseUrl}/images/generations`;

    if (!environment.hasApiKey) {
      logger.error('OPENAI_API_KEY not set in environment variables');
    }
  }

  /**
   * Generate content based on provided parameters and type (fiction, image, or combined)
   * @param {Object} parameters - User-selected parameters for generation
   * @param {String} type - Type of content to generate ('fiction', 'image', or 'combined')
   * @param {Number} year - Optional year for the story setting
   * @returns {Promise<Object>} - Generated content from OpenAI
   */
  async generateContent(parameters, type = 'fiction', year = null) {
    try {
      // Call appropriate generation method based on type
      if (type === 'fiction') {
        return this.generateFiction(parameters, year);
      } else if (type === 'image') {
        return this.generateImage(parameters, year);
      } else if (type === 'combined') {
        return this.generateCombined(parameters, year);
      } else {
        throw new Error(`Unsupported generation type: ${type}`);
      }
    } catch (error) {
      logger.error(`Error generating ${type}`, {
        error: error.response ? error.response.data : error.message
      });
      return {
        success: false,
        error: error.response ? error.response.data.error.message : error.message
      };
    }
  }

  /**
   * Generate fiction content based on provided parameters
   * @param {Object} parameters - User-selected parameters for fiction generation
   * @param {Number} year - Optional year for story setting
   * @returns {Promise<Object>} - Generated fiction content from OpenAI
   */
  async generateFiction(parameters, year = null) {
    try {
      // Get model settings
      const model = await settingsService.getSetting('ai.models.fiction', 'gpt-4o-mini');
      const temperature = await settingsService.getSetting('ai.parameters.fiction.temperature', 0.8);
      const maxTokens = await settingsService.getSetting('ai.parameters.fiction.max_tokens', 1000);
      
      // Format parameters into a clean markdown prompt, including year
      const prompt = await this.formatFictionPrompt(parameters, year);
      
      // Get system prompt from settings
      const systemPrompt = await settingsService.getSetting(
        'ai.parameters.fiction.system_prompt', 
        "You are a speculative fiction generator that creates compelling, imaginative stories based on the parameters provided by the user."
      );
      
      // Call OpenAI API
      const response = await axios.post(
        this.chatCompletionUrl,
        {
          model: model,
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: temperature,
          max_tokens: maxTokens
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      
      logger.ai('Fiction generation completed', {
        model: response.data?.model || 'unknown',
        hasChoices: Boolean(response.data?.choices),
        tokens: response.data?.usage?.total_tokens
      });
      
      // Extract the generated content and title from response
      const generatedContent = response.data.choices[0].message.content;
      const extractedTitle = this.extractTitleFromContent(generatedContent);
      
      // Extract or use provided year
      const storyYear = year || this.extractYearFromContent(generatedContent);
      
      return {
        success: true,
        content: generatedContent,
        title: extractedTitle,
        year: storyYear,
        metadata: {
          model: response.data.model,
          tokens: response.data.usage.total_tokens
        }
      };
    } catch (error) {
      logger.error('OpenAI text generation failed', {
        error: error.response ? error.response.data : error.message
      });
      return {
        success: false,
        error: error.response ? error.response.data.error.message : error.message
      };
    }
  }

  /**
   * Generate image based on provided parameters and optional generated text
   * @param {Object} parameters - User-selected parameters for image generation
   * @param {Number} year - Optional year to include in the image concept
   * @param {String} generatedText - Optional generated text to use for creating a more coherent image
   * @returns {Promise<Object>} - Generated image URL from OpenAI
   */
  async generateImage(parameters, year = null, generatedText = null) {
    try {
      // Get model settings
      const model = await settingsService.getSetting('ai.models.image', 'dall-e-3');
      const size = await settingsService.getSetting('ai.parameters.image.size', '1024x1024');
      const quality = await settingsService.getSetting('ai.parameters.image.quality', 'standard');
      
      // Format parameters into a prompt for image generation, including year and generated text if provided
      const prompt = this.formatImagePrompt(parameters, year, generatedText);
      
      // Call OpenAI API for image generation
      const response = await axios.post(
        this.imageGenerationUrl,
        {
          model: model,
          prompt: prompt,
          n: 1,
          size: size,
          quality: quality,
          response_format: "b64_json"
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      
      // Extract the generated image data from response
      return {
        success: true,
        imageData: Buffer.from(response.data.data[0].b64_json, 'base64'),
        year: year, // Pass through the year
        title: null, // Return null title to allow controller to use provided title
        metadata: {
          model: model,
          prompt: prompt
        }
      };
    } catch (error) {
      logger.error('OpenAI image generation failed', {
        error: error.response ? error.response.data : error.message
      });
      return {
        success: false,
        error: error.response ? error.response.data.error.message : error.message
      };
    }
  }

  /**
   * Format user parameters into a clean markdown prompt for OpenAI text generation
   * @param {Object} parameters - User-selected parameters
   * @param {Number} year - Optional year for story setting
   * @returns {String} - Formatted prompt
   */
  async formatFictionPrompt(parameters, year = null) {
    // Get default story length from settings
    const defaultStoryLength = await settingsService.getSetting(
      'ai.parameters.fiction.default_story_length', 
      500
    );
    
    // Extract the story length parameter if present
    let storyLength = defaultStoryLength;
    
    // Start with a simple prompt
    let prompt = "Write a speculative fiction story with the following elements:\n\n";
    
    // If year is provided, add it to the prompt
    if (year) {
      prompt += `Set this story in the year ${year}.\n\n`;
    }
    
    // Format each parameter in a simple list
    Object.entries(parameters).forEach(([categoryName, categoryParams]) => {
      // Add category name
      prompt += `${categoryName}:\n`;
      
      // Add each parameter as a bullet point
      Object.entries(categoryParams).forEach(([paramName, paramValue]) => {
        if (paramName.toLowerCase().includes('length') && typeof paramValue === 'number') {
          storyLength = paramValue;
        } else if (Array.isArray(paramValue)) {
          prompt += `- ${paramName}: ${paramValue.join(', ')}\n`;
        } else if (typeof paramValue === 'boolean') {
          prompt += `- ${paramName}: ${paramValue ? 'Yes' : 'No'}\n`;
        } else {
          prompt += `- ${paramName}: ${paramValue}\n`;
        }
      });
      prompt += '\n';
    });
    
    // Add instructions for title format and story length
    prompt += "IMPORTANT: Begin your response with a title in this format: **Title: Your Story Title Here**\n";
    prompt += `The story should be approximately ${storyLength} words long. Make it creative, engaging, and with a clear beginning, middle, and end.`;
    
    return prompt;
  }

  /**
   * Format user parameters into a prompt for DALL-E image generation
   * @param {Object} parameters - User-selected parameters
   * @param {Number} year - Optional year to include in the image concept
   * @param {String} generatedText - Optional generated text to use for creating a more coherent image
   * @returns {String} - Formatted prompt
   */
  formatImagePrompt(parameters, year = null, generatedText = null) {
    let prompt = "Create a beautiful, detailed image";
    
    if (generatedText) {
      const visualElements = extractVisualElementsFromText(generatedText);
      
      if (visualElements.length > 0) {
        prompt += ` showing this scene: ${visualElements.join(', ')}`;
      }
      
      prompt += "\n\nMake the image match this story:\n";
      const storyExcerpt = generatedText.substring(0, 400) + (generatedText.length > 400 ? '...' : '');
      prompt += `"${storyExcerpt}"\n\n`;
    } else {
      prompt += " with these story elements:\n\n";
    }
    
    // If year is provided, add it to the prompt
    if (year) {
      prompt += `Set in the year ${year}. `;
    }
    
    // Collect all parameter values for the image prompt
    Object.entries(parameters).forEach(([categoryName, categoryParams]) => {
      prompt += `${categoryName}: `;
      
      const paramValues = [];
      
      // Add each parameter and its value
      Object.entries(categoryParams).forEach(([paramName, paramValue]) => {
        // Handle different parameter types
        if (Array.isArray(paramValue)) {
          // For multi-select parameters (checkboxes)
          paramValues.push(`${paramName}: ${paramValue.join(', ')}`);
        } else if (typeof paramValue === 'boolean') {
          // For toggle parameters
          if (paramValue) {
            paramValues.push(paramName);
          }
        } else {
          // For other parameter types (dropdown, radio, slider)
          paramValues.push(`${paramName}: ${paramValue}`);
        }
      });
      
      prompt += paramValues.join(', ');
      prompt += '.\n';
    });
    
    // Add India-specific visual style guidance
    const defaultSuffix = "Make the image look realistic and vivid. Use warm, rich colors like those found in Indian art - golds, deep reds, saffron, and earthy tones. Include good lighting that brings out textures and details. If showing people, give them expressive faces and natural poses. The overall feeling should be engaging and authentic to Indian/South Asian culture.";
    prompt += `\n${defaultSuffix}`;
    
    return prompt;
  }


  /**
   * Generate both fiction and image content based on the same parameters
   * Now generates image based on the generated fiction text for better coherence
   * @param {Object} parameters - User-selected parameters for generation
   * @param {Number} year - Optional year for story setting
   * @returns {Promise<Object>} - Generated fiction and image content from OpenAI
   */
  async generateCombined(parameters, year = null) {
    try {
      // First generate the fiction content
      const fictionResult = await this.generateFiction(parameters, year);
      
      if (!fictionResult.success) {
        return fictionResult; // Return early if fiction generation failed
      }
      
      // Then generate the image based on the generated text and parameters
      // This creates a more coherent image that complements the story
      const imageResult = await this.generateImage(
        parameters, 
        year || fictionResult.year, 
        fictionResult.content // Pass the generated text to create a coherent image
      );
      
      if (!imageResult.success) {
        return imageResult; // Return early if image generation failed
      }
      
      // Combine the results
      return {
        success: true,
        content: fictionResult.content,
        title: fictionResult.title,
        year: year || fictionResult.year,
        imageData: imageResult.imageData,
        metadata: {
          fiction: fictionResult.metadata,
          image: imageResult.metadata
        }
      };
    } catch (error) {
      logger.error('Combined generation failed', {
        error: error.response ? error.response.data : error.message
      });
      return {
        success: false,
        error: error.response ? error.response.data.error.message : error.message
      };
    }
  }

  /**
   * Extract title from generated content
   * @param {String} content - Generated story content
   * @returns {String} - Extracted title or default title
   */
  extractTitleFromContent(content) {
    if (!content) return "Untitled Story";
    
    // Look for title in the format: **Title: Story Title**
    const titleMatch = content.match(/\*\*Title:\s*(.*?)\*\*/);
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1].trim();
    }
    
    // Fallback: use first line as title if it's reasonably short
    const firstLine = content.split('\n')[0].trim();
    if (firstLine.length <= 60) {
      return firstLine;
    }
    
    return "Untitled Story";
  }

  /**
   * Extract year from content if not provided in parameters
   * @param {String} content - Generated story content
   * @returns {Number|null} - Extracted year or null
   */
  extractYearFromContent(content) {
    if (!content) return null;
    
    // Look for year mentions in the first few paragraphs
    const yearRegex = /\b(20\d{2}|21\d{2}|22\d{2})\b/;
    const yearMatch = content.match(yearRegex);
    
    if (yearMatch && yearMatch[1]) {
      return parseInt(yearMatch[1]);
    }
    
    return null;
  }
}

export default new AIService();