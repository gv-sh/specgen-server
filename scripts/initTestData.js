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

    console.log(`Initialization complete: ${categories.length} categories, ${totalParams} parameters`);
    return { categories, totalParams };
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
      parameters: []
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
        description: 'Stories set in the future with advanced technology'
      },
      {
        id: 'fantasy',
        name: 'Fantasy',
        visibility: 'Show',
        description: 'Stories with magic and mythical creatures'
      },
      {
        id: 'dystopian',
        name: 'Dystopian Future',
        visibility: 'Show',
        description: 'Stories set in bleak futures or post-apocalyptic settings'
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

// Run the initialization if this is the main module
if (require.main === module) {
  initializeTestData()
    .then(() => {
      console.log('Initialization complete. You can now use Swagger UI to test the API.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Initialization failed:', error);
      process.exit(1);
    });
} else {
  // Export the function for use in other modules
  module.exports = {
    initializeTestData,
    resetDatabase
  };
}
