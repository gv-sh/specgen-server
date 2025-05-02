// scripts/initTestData.js
const databaseService = require('../services/databaseService');

/**
 * Initialize the database with test categories and parameters
 */
async function initializeTestData() {
  try {
    console.log('Starting database initialization...');

    // First, reset the database to ensure we start fresh
    await resetDatabase();

    // Create categories
    const categories = await createCategories();
    console.log(`Created ${categories.length} categories`);

    // Create parameters for each category
    let totalParams = 0;
    for (const category of categories) {
      const params = await createParametersForCategory(category.id);
      totalParams += params.length;
      console.log(`Added ${params.length} parameters to category "${category.name}"`);
    }

    // Create sample generated content
    const content = await createSampleContent();
    console.log(`Added ${content.length} sample generated content items`);

    console.log(`Initialization complete: ${categories.length} categories, ${totalParams} parameters, ${content.length} content items`);
    return { categories, totalParams, content };
  } catch (error) {
    console.error('Error initializing test data:', error);
    throw error;
  }
}

/**
 * Reset the database to an empty state
 */
async function resetDatabase() {
  try {
    const emptyDatabase = {
      categories: [],
      parameters: [],
      generatedContent: []
    };
    await databaseService.saveData(emptyDatabase);
    console.log('Database reset successfully');
  } catch (error) {
    console.error('Error resetting database:', error);
    throw error;
  }
}

/**
 * Create test categories
 */
async function createCategories() {
  try {
    const categories = [
      {
        id: 'science-fiction',
        name: 'Science Fiction',
        visibility: 'Show',
        description: 'Stories set in the future with advanced technology',
        year: 2150
      },
      {
        id: 'fantasy',
        name: 'Fantasy',
        visibility: 'Show',
        description: 'Stories with magic and mythical creatures',
        year: 1250
      },
      {
        id: 'dystopian',
        name: 'Dystopian Future',
        visibility: 'Show',
        description: 'Stories set in bleak futures or post-apocalyptic settings',
        year: 2085
      }
    ];

    // Save each category
    const createdCategories = [];
    for (const category of categories) {
      const created = await databaseService.createCategory(category);
      createdCategories.push(created);
    }

    return createdCategories;
  } catch (error) {
    console.error('Error creating categories:', error);
    throw error;
  }
}

/**
 * Create test parameters for a category
 * @param {string} categoryId - The ID of the category to create parameters for
 */
async function createParametersForCategory(categoryId) {
  try {
    let parameters = [];

    // Common parameters for all categories
    parameters.push({
      id: `${categoryId}-story-length`,
      name: 'Story Length',
      type: 'Slider',
      visibility: 'Basic',
      categoryId,
      description: 'Length of the story in words',
      values: [],
      config: {
        min: 100,
        max: 10000,
        step: 100
      }
    });

    // Add category-specific parameters
    if (categoryId === 'science-fiction') {
      parameters = parameters.concat([
        {
          id: 'science-fiction-technology-level',
          name: 'Technology Level',
          type: 'Dropdown',
          visibility: 'Basic',
          categoryId,
          description: 'The level of technological advancement in the story',
          values: [
            { id: 'near-future', label: 'Near Future' },
            { id: 'advanced', label: 'Advanced' },
            { id: 'post-singularity', label: 'Post-Singularity' }
          ],
          config: {}
        },
        {
          id: 'science-fiction-alien-life',
          name: 'Alien Life',
          type: 'Toggle Switch',
          visibility: 'Basic',
          categoryId,
          description: 'Include alien lifeforms in the story',
          values: {
            on: 'Yes',
            off: 'No'
          },
          config: {}
        },
        {
          id: 'science-fiction-space-exploration-focus',
          name: 'Space Exploration Focus',
          type: 'Slider',
          visibility: 'Basic',
          categoryId,
          description: 'How much the story focuses on space exploration',
          values: [],
          config: {
            min: 1,
            max: 10,
            step: 1
          }
        }
      ]);
    } else if (categoryId === 'fantasy') {
      parameters = parameters.concat([
        {
          id: 'fantasy-magic-system',
          name: 'Magic System',
          type: 'Radio Buttons',
          visibility: 'Basic',
          categoryId,
          description: 'Type of magic system in the story',
          values: [
            { id: 'elemental', label: 'Elemental' },
            { id: 'divine', label: 'Divine' },
            { id: 'wild', label: 'Wild' },
            { id: 'forbidden', label: 'Forbidden' }
          ],
          config: {}
        },
        {
          id: 'fantasy-mythical-creatures',
          name: 'Mythical Creatures',
          type: 'Checkbox',
          visibility: 'Basic',
          categoryId,
          description: 'Mythical creatures to include in the story',
          values: [
            { id: 'dragons', label: 'Dragons' },
            { id: 'elves', label: 'Elves' },
            { id: 'dwarves', label: 'Dwarves' },
            { id: 'unicorns', label: 'Unicorns' },
            { id: 'merfolk', label: 'Merfolk' }
          ],
          config: {}
        },
        {
          id: 'fantasy-setting',
          name: 'Setting',
          type: 'Dropdown',
          visibility: 'Basic',
          categoryId,
          description: 'The world setting for the story',
          values: [
            { id: 'medieval-europe', label: 'Medieval Europe' },
            { id: 'ancient-orient', label: 'Ancient Orient' },
            { id: 'island-realm', label: 'Island Realm' },
            { id: 'desert-kingdom', label: 'Desert Kingdom' }
          ],
          config: {}
        }
      ]);
    } else if (categoryId === 'dystopian') {
      parameters = parameters.concat([
        {
          id: 'dystopian-society-type',
          name: 'Society Type',
          type: 'Dropdown',
          visibility: 'Basic',
          categoryId,
          description: 'The type of dystopian society',
          values: [
            { id: 'totalitarian', label: 'Totalitarian Regime' },
            { id: 'post-apocalyptic', label: 'Post-Apocalyptic' },
            { id: 'corporate', label: 'Corporate Controlled' },
            { id: 'technological', label: 'Technological Surveillance' }
          ],
          config: {}
        },
        {
          id: 'dystopian-survival-difficulty',
          name: 'Survival Difficulty',
          type: 'Slider',
          visibility: 'Basic',
          categoryId,
          description: 'How difficult survival is in this world',
          values: [],
          config: {
            min: 1,
            max: 10,
            step: 1
          }
        },
        {
          id: 'dystopian-hope-level',
          name: 'Hope Level',
          type: 'Slider',
          visibility: 'Basic',
          categoryId,
          description: 'Level of hope present in the story',
          values: [],
          config: {
            min: 1,
            max: 10,
            step: 1
          }
        }
      ]);
    }

    // Save the parameters
    const createdParameters = [];
    for (const parameter of parameters) {
      const created = await databaseService.createParameter(parameter);
      createdParameters.push(created);
    }

    return createdParameters;
  } catch (error) {
    console.error(`Error creating parameters for category ${categoryId}:`, error);
    throw error;
  }
}

/**
 * Create sample generated content for testing
 */
async function createSampleContent() {
  try {
    const sampleContent = [
      {
        id: "content-1713974400000-123",
        title: "Mars Colony Adventure",
        type: "fiction",
        year: 2150,
        content: "The red dust of Mars swirled around Dr. Elena Vasquez as she stepped out of the colony's airlock. The thin atmosphere of the red planet meant that even with the recent terraforming efforts, she still needed her lightweight exosuit for excursions. It had been fifteen years since the first permanent human settlement on Mars, and the New Olympus colony had grown from a small research outpost to a thriving community of three thousand people.\n\nElena checked her tablet, reviewing the aerial scans of Region 7, an unexplored area about twenty kilometers north of the colony. The satellite imagery had shown unusual formations that might be evidence of ancient water flows. As the colony's lead geologist, she was tasked with investigating these potential sites for water extraction.\n\n\"Base to Dr. Vasquez, do you copy?\" The voice of Mission Control crackled through her comm system.\n\n\"Vasquez here. I'm just leaving the colony now,\" she responded, walking toward the rover parked nearby.\n\n\"Be advised, we're picking up increasing wind speeds in your target area. Dust storm potential within the next six hours.\"\n\n\"Understood. I'll keep the excursion brief,\" Elena replied as she climbed into the rover. The vehicle hummed to life, its solar panels gleaming in the pale Martian sunlight.",
        parameterValues: {
          "science-fiction": {
            "science-fiction-technology-level": "Near Future",
            "science-fiction-alien-life": false,
            "science-fiction-space-exploration-focus": 7
          }
        },
        metadata: {
          model: "gpt-4o-mini",
          tokens: 384
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "content-1713974500000-456",
        title: "Dragon Castle",
        type: "image",
        year: 1250,
        imageUrl: "https://example.com/images/dragon-castle.jpg",
        parameterValues: {
          "fantasy": {
            "fantasy-magic-system": "Elemental",
            "fantasy-mythical-creatures": ["Dragons", "Elves"],
            "fantasy-setting": "Medieval Europe"
          }
        },
        metadata: {
          model: "dall-e-3",
          prompt: "Create a detailed, visually striking image with the following elements: A medieval European castle with a massive red dragon perched on its highest tower. Elves with bows stand on the battlements, preparing to defend against an unseen threat. The magic system is elemental, so show glowing runes of fire, water, earth and air around the castle walls."
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "content-1713974600000-789",
        title: "The Last City",
        type: "fiction",
        year: 2085,
        content: "The dome of the Last City glittered in the harsh sunlight, a pristine bubble of civilization amidst the ruined landscape. From her vantage point on the hill, Maya could see the stark contrast between the lush greenery inside and the barren wasteland outside. It had been thirty years since the Great Collapse, and humanity had been reduced to a handful of enclosed cities scattered across what was once a thriving global civilization.\n\nMaya adjusted her breathing mask and checked the radiation levels on her wrist scanner. Outside the city's protective barrier, the air was still toxic in most regions, though levels had begun to decrease in recent years. As one of the few authorized scouts, she was tasked with venturing into the wasteland to search for resources and any signs of other survivors.\n\nThe weight of her mission pressed heavily upon her. The Last City's recycling systems were failing, and without new components, the dome would begin to degrade within months. Their only hope was to locate an abandoned tech facility rumored to exist in the ruins of the old capital, about forty kilometers east.",
        parameterValues: {
          "dystopian": {
            "dystopian-society-type": "Post-Apocalyptic",
            "dystopian-survival-difficulty": 8,
            "dystopian-hope-level": 3
          }
        },
        metadata: {
          model: "gpt-4o-mini",
          tokens: 320
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // Save each content item
    const createdContent = [];
    for (const content of sampleContent) {
      const created = await databaseService.saveGeneratedContent(content);
      createdContent.push(created);
    }

    return createdContent;
  } catch (error) {
    console.error('Error creating sample content:', error);
    throw error;
  }
}

// Run the initialization if this is the main module
if (require.main === module) {
  initializeTestData()
    .then(() => {
      console.log('Initialization complete. You can now use Swagger UI to test the API.');
      globalThis.process?.exit(0);
    })
    .catch(error => {
      console.error('Initialization failed:', error);
      globalThis.process?.exit(1);
    });
} else {
  // Export the function for use in other modules
  module.exports = {
    initializeTestData,
    resetDatabase
  };
}
