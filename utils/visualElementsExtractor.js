/**
 * Simplified visual elements extraction utility
 */

const MAX_VISUAL_ELEMENTS = 5;

// Pattern configurations
const PATTERNS = {
  characters: [
    /(Dr\.|Professor|Captain|Agent|Detective|Pandit|Guru|Swami)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
    /(Arjun|Priya|Raj|Kavya|Dev|Meera|Ravi|Anita|Vikram|Shreya|Kiran|Nisha|Amit|Pooja)\s+(?:stood|walked|ran|sat|looked|gazed|entered)/gi,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:stood|walked|ran|sat|looked|gazed|stepped)/gi
  ],
  locations: [
    /(in|at|on|through)\s+(the\s+)?([A-Z][a-z\s]{3,30}(?:city|planet|station|facility|temple|palace|fort|market))/gi,
    /(Mumbai|Delhi|Bangalore|Chennai|Kolkata|Hyderabad|Punjab|Gujarat|Rajasthan|Bengal)/gi,
    /(starship|spaceship|vessel|train|auto|rickshaw)\s+([A-Z][a-z]+)/gi
  ],
  objects: [
    /(advanced|alien|ancient|glowing|metallic|golden|ornate|carved)\s+(scanner|device|weapon|helmet|suit|artifact|tabla|sitar|diya|statue|jewelry)/gi,
    /\b(scanner|device|weapon|helmet|portal|chamber|altar|tabla|sitar|diya|lotus|rangoli|statue|turban|sari|dhoti|kurta)\b/gi
  ],
  atmosphere: [
    /(glittering|shimmering|glowing|pulsing|swirling|falling|pouring)\s+(mist|fog|clouds|dust|rain|petals|smoke|steam)/gi,
    /(red|blue|green|golden|silver|purple|crimson|saffron|ochre)\s+(light|glow|aurora|mist|sky|sunset|flame|fire)/gi,
    /\b(storm|clouds|mist|aurora|lightning|monsoon|rain|sunshine|smoke|flames|candles)\b/gi
  ]
};

/**
 * Extract visual elements from generated text
 * @param {string} text - Generated story text
 * @returns {Array<string>} - Array of visual elements
 */
export const extractVisualElementsFromText = (text) => {
  if (!text) return [];
  
  const visualElements = [];
  const cleanText = text.replace(/\*\*Title:.*?\*\*/, '').trim();
  
  // Extract elements for each pattern category
  Object.entries(PATTERNS).forEach(([category, patterns]) => {
    patterns.forEach(pattern => {
      const matches = cleanText.match(pattern);
      if (matches) {
        matches.slice(0, 2).forEach(match => {
          const cleaned = cleanMatch(match, category);
          if (cleaned && cleaned.length > 2 && cleaned.length < 50) {
            visualElements.push(cleaned);
          }
        });
      }
    });
  });
  
  return removeDuplicates(visualElements).slice(0, MAX_VISUAL_ELEMENTS);
};

/**
 * Clean and format matched text
 * @private
 */
function cleanMatch(match, category) {
  if (category === 'characters') {
    return match.replace(/\s+(stood|walked|ran|sat|looked|gazed|stepped).*$/i, '').trim();
  } else if (category === 'locations') {
    return match.replace(/^(in|at|on|through)\s+(the\s+)?/i, '').trim();
  }
  return match.trim();
}

/**
 * Remove duplicates with fuzzy matching
 * @private
 */
function removeDuplicates(elements) {
  const uniqueElements = [];
  const seenElements = new Set();
  
  for (const element of elements) {
    const lowerElement = element.toLowerCase();
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
  
  return uniqueElements;
}