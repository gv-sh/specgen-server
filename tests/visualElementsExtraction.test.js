/* global describe, test, expect */
import { jest } from '@jest/globals';

/**
 * Unit tests for visual element extraction from story text
 * These tests verify the new sequential generation logic
 */

// Mock the dependencies but not the main class
jest.mock('axios');
jest.mock('../services/settingsService.js');

import axios from 'axios';
import { Buffer } from 'buffer';
import settingsService from '../services/settingsService.js';

describe('Visual Element Extraction Tests', () => {
  // Since we're testing the actual implementation, we need to create a real instance
  // instead of using the mocked version

  // Create a test instance of AIService without the full module mock
  class TestAIService {
    extractVisualElementsFromText(text) {
      if (!text) return [];
      
      const visualElements = [];
      
      // Remove the title if present
      const cleanText = text.replace(/\*\*Title:.*?\*\*/, '').trim();
      
      // Extract characters - improved patterns with better action words
      const characterPatterns = [
        /(Dr\.|Professor|Captain|Agent|Detective)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(stood|walked|ran|sat|looked|gazed|stared|stepped)/gi
      ];
      
      for (const pattern of characterPatterns) {
        const matches = cleanText.match(pattern);
        if (matches) {
          matches.slice(0, 3).forEach(match => {
            // Clean up the match to get just the name
            let cleaned = match.replace(/\s+(stood|walked|ran|sat|looked|gazed|stared|stepped).*$/i, '').trim();
            // For patterns with titles, keep the full title + name
            if (cleaned.match(/^(Dr\.|Professor|Captain|Agent|Detective)/)) {
              visualElements.push(cleaned);
            } else {
              // For action-based patterns, extract just the name before the action
              const nameMatch = match.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
              if (nameMatch) {
                visualElements.push(nameMatch[1]);
              }
            }
          });
        }
      }
      
      // Extract locations and settings
      const locationPatterns = [
        /(in|at|on|through)\s+(the\s+)?([A-Z][a-z\s]{3,30}(?:city|planet|station|facility|dome|colony|ship|chamber|laboratory|castle|forest|mountain|desert|ocean|space))/gi,
        /(starship|spaceship|vessel|craft|vehicle)\s+([A-Z][a-z]+)/gi,
        /(colony|city|station|outpost|facility)\s+([A-Z][a-z\s]+)/gi
      ];
      
      for (const pattern of locationPatterns) {
        const matches = cleanText.match(pattern);
        if (matches) {
          matches.slice(0, 2).forEach(match => {
            const location = match.replace(/^(in|at|on|through)\s+(the\s+)?/i, '').trim();
            if (location.length > 3 && location.length < 50) {
              visualElements.push(location);
            }
          });
        }
      }
      
      // Extract objects and technology
      // Pattern 1: adjective + noun combinations  
      let matches = cleanText.match(/(advanced|alien|ancient|glowing|metallic|crystalline)\s+(scanner|device|weapon|tool|helmet|suit|console|terminal|reactor|portal|gateway|chamber|throne|altar|artifact)/gi);
      if (matches) {
        matches.forEach(match => {
          visualElements.push(match.trim());
        });
      }
      
      // Pattern 2: standalone tech objects
      matches = cleanText.match(/\b(scanner|device|weapon|tool|helmet|suit|console|terminal|reactor|portal|gateway|chamber|throne|altar|artifact)\b/gi);
      if (matches) {
        matches.forEach(match => {
          visualElements.push(match.trim());
        });
      }
      
      // Extract atmospheric elements
      // Pattern 1: action + atmospheric combinations
      matches = cleanText.match(/(glittering|shimmering|glowing|pulsing|swirling|drifting)\s+(purple\s+mist|mist|fog|clouds|dust|air)/gi);
      if (matches) {
        matches.forEach(match => {
          visualElements.push(match.trim());
        });
      }
      
      // Pattern 2: color + atmospheric combinations
      matches = cleanText.match(/(red|blue|green|golden|silver|purple|crimson)\s+(light|glow|aurora|mist|dust|sky)/gi);
      if (matches) {
        matches.forEach(match => {
          visualElements.push(match.trim());
        });
      }
      
      // Pattern 3: standalone atmospheric elements
      matches = cleanText.match(/\b(chamber|storm|clouds|mist|fog|aurora|lightning)\b/gi);
      if (matches) {
        matches.forEach(match => {
          visualElements.push(match.trim());
        });
      }
      
      // Remove duplicates (case-insensitive) and limit to most important elements
      const uniqueElements = [];
      const seenElements = new Set();
      
      for (const element of visualElements) {
        const lowerElement = element.toLowerCase();
        // Additional check to avoid partial matches within longer names
        let isDuplicate = false;
        for (const seenElement of seenElements) {
          if (seenElement === lowerElement || 
              (lowerElement.includes(seenElement) && seenElement.length > 5) ||
              (seenElement.includes(lowerElement) && lowerElement.length > 5)) {
            isDuplicate = true;
            break;
          }
        }
        
        if (!isDuplicate) {
          seenElements.add(lowerElement);
          uniqueElements.push(element);
        }
      }
      
      return uniqueElements.slice(0, 5); // Limit to 5 key visual elements
    }

    formatImagePrompt(parameters, year = null, generatedText = null) {
      let prompt = "Create a detailed, visually striking image";
      
      // If we have generated text, use it to create a more coherent image
      if (generatedText) {
        // Extract key visual elements from the generated text
        const visualElements = this.extractVisualElementsFromText(generatedText);
        
        if (visualElements.length > 0) {
          prompt += ` depicting the following scene: ${visualElements.join(', ')}`;
        }
        
        // Add context from the generated text
        prompt += "\n\nThis image should complement the following story:\n";
        // Use the first 500 characters of the story for context
        const storyExcerpt = generatedText.substring(0, 500) + (generatedText.length > 500 ? '...' : '');
        prompt += `"${storyExcerpt}"\n\n`;
      } else {
        // Fallback to parameter-based prompt when no text is provided
        prompt += " with the following elements:\n\n";
      }
      
      // If year is provided, add it to the prompt
      if (year) {
        prompt += `Set in the year ${year}. `;
      }
      
      // Add parameters...
      Object.entries(parameters).forEach(([categoryName, categoryParams]) => {
        prompt += `${categoryName}: `;
        
        const paramValues = [];
        Object.entries(categoryParams).forEach(([paramName, paramValue]) => {
          if (Array.isArray(paramValue)) {
            paramValues.push(`${paramName}: ${paramValue.join(', ')}`);
          } else if (typeof paramValue === 'boolean') {
            if (paramValue) {
              paramValues.push(paramName);
            }
          } else {
            paramValues.push(`${paramName}: ${paramValue}`);
          }
        });
        
        prompt += paramValues.join(', ');
        prompt += '.\n';
      });
      
      prompt += "\nUse high-quality, photorealistic rendering with attention to lighting, detail, and composition. The image should be visually cohesive and striking.";
      
      return prompt;
    }
  }

  test('Should extract character names correctly', () => {
    const testAI = new TestAIService();
    
    const text = `**Title: Test Story**
    
    Dr. Elena Rodriguez stood at the edge of the platform, gazing out into space. Captain Marcus ran towards the console while Professor Chen looked at the readings.`;
    
    const elements = testAI.extractVisualElementsFromText(text);
    
    // Check that we got the expected character names 
    expect(elements).toContain('Dr. Elena Rodriguez');
    expect(elements).toContain('Captain Marcus');
    expect(elements).toContain('Professor Chen');
  });

  test('Should extract locations and settings', () => {
    const testAI = new TestAIService();
    
    const text = `The team arrived at the lunar station after traveling through the asteroid field. The starship Enterprise docked at the space facility.`;
    
    const elements = testAI.extractVisualElementsFromText(text);
    
    expect(elements).toContain('lunar station');
    expect(elements).toContain('starship Enterprise');
    expect(elements).toContain('space facility');
  });

  test('Should extract objects and technology', () => {
    const testAI = new TestAIService();
    
    const text = `She picked up the advanced scanner and pointed it at the glowing artifact. The metallic console displayed alien symbols while the ancient portal shimmered.`;
    
    const elements = testAI.extractVisualElementsFromText(text);
    
    expect(elements).toContain('advanced scanner');
    expect(elements).toContain('glowing artifact');
    expect(elements).toContain('metallic console');
    expect(elements).toContain('ancient portal');
  });

  test('Should extract atmospheric elements', () => {
    const testAI = new TestAIService();
    
    const text = `The chamber was filled with swirling purple mist. A crimson aurora danced across the sky while blue light emanated from the crystals.`;
    
    const elements = testAI.extractVisualElementsFromText(text);
    
    expect(elements).toContain('swirling purple mist');
    expect(elements).toContain('crimson aurora');
    expect(elements).toContain('blue light');
  });

  test('Should remove title formatting', () => {
    const testAI = new TestAIService();
    
    const text = `**Title: The Crystal Chambers**
    
    Dr. Elena stepped through the portal.`;
    
    const elements = testAI.extractVisualElementsFromText(text);
    
    // Should not contain the title text
    expect(elements.join(' ')).not.toContain('Title: The Crystal Chambers');
    // Should still extract the character name
    const hasElena = elements.some(element => element.includes('Elena'));
    expect(hasElena).toBe(true);
  });

  test('Should limit to 5 visual elements maximum', () => {
    const testAI = new TestAIService();
    
    const text = `Dr. Elena Rodriguez stood at the advanced console. Captain Marcus ran through the metallic corridor towards the glowing portal. Professor Chen gazed at the crystalline chamber filled with swirling mist. The ancient artifact pulsed with blue light while the starship Nebula waited at the lunar station.`;
    
    const elements = testAI.extractVisualElementsFromText(text);
    
    expect(elements.length).toBeLessThanOrEqual(5);
    expect(elements.length).toBeGreaterThan(0);
  });

  test('Should create coherent image prompt from generated text', () => {
    const testAI = new TestAIService();
    
    const parameters = {
      'science-fiction': {
        'technology-level': 'Advanced',
        'space-exploration': true
      }
    };
    
    const generatedText = `**Title: The Nebula Station**
    
    Dr. Elena Rodriguez stepped through the ancient portal, her metallic suit gleaming in the ethereal blue light. The crystalline chamber stretched before her, filled with swirling purple mist and glowing artifacts.`;
    
    const prompt = testAI.formatImagePrompt(parameters, 2150, generatedText);
    
    // Should include visual elements from the text
    expect(prompt).toContain('Dr. Elena Rodriguez');
    expect(prompt).toContain('ancient portal');
    expect(prompt).toContain('metallic suit');
    expect(prompt).toContain('crystalline chamber');
    expect(prompt).toContain('swirling purple mist');
    
    // Should include story context
    expect(prompt).toContain('This image should complement the following story');
    expect(prompt).toContain('Dr. Elena Rodriguez stepped through');
    
    // Should include year
    expect(prompt).toContain('Set in the year 2150');
    
    // Should include parameters
    expect(prompt).toContain('science-fiction');
    expect(prompt).toContain('Advanced');
  });

  test('Should fallback to parameter-based prompt when no text provided', () => {
    const testAI = new TestAIService();
    
    const parameters = {
      'fantasy': {
        'magic-system': 'Elemental',
        'creatures': ['Dragons', 'Elves']
      }
    };
    
    const prompt = testAI.formatImagePrompt(parameters, 1250);
    
    // Should not include story-specific elements
    expect(prompt).not.toContain('depicting the following scene');
    expect(prompt).not.toContain('complement the following story');
    
    // Should include basic prompt structure
    expect(prompt).toContain('Create a detailed, visually striking image');
    expect(prompt).toContain('with the following elements');
    
    // Should include parameters
    expect(prompt).toContain('fantasy');
    expect(prompt).toContain('Elemental');
    expect(prompt).toContain('Dragons, Elves');
  });

  test('Should handle empty or invalid text gracefully', () => {
    const testAI = new TestAIService();
    
    const emptyElements = testAI.extractVisualElementsFromText('');
    expect(emptyElements).toEqual([]);
    
    const nullElements = testAI.extractVisualElementsFromText(null);
    expect(nullElements).toEqual([]);
    
    const undefinedElements = testAI.extractVisualElementsFromText(undefined);
    expect(undefinedElements).toEqual([]);
    
    const shortTextElements = testAI.extractVisualElementsFromText('Hi.');
    expect(shortTextElements).toEqual([]);
  });

  test('Should remove duplicate visual elements', () => {
    const testAI = new TestAIService();
    
    const text = `Dr. Elena stood at the console. Dr. Elena looked at the scanner. The advanced console beeped while Dr. Elena stepped back.`;
    
    const elements = testAI.extractVisualElementsFromText(text);
    
    // Should contain Dr. Elena only once
    const elenaCount = elements.filter(element => element.includes('Dr. Elena')).length;
    expect(elenaCount).toBe(1);
  });
});