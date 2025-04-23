// server/scripts/initDatabase.js
const fs = require('fs-extra');
const path = require('path');

const DATABASE_PATH = path.join(__dirname, '../data/database.json');

// Convert name to a slug suitable for use as an ID
function nameToId(name) {
  return name.replace(/\s+/g, '-').toLowerCase();
}

// Category IDs based on their names
const CATEGORIES = {
  sciFi: nameToId("Science Fiction"),
  fantasy: nameToId("Fantasy"),
  dystopian: nameToId("Dystopian Future")
};

// Parameter IDs based on category ID + name
const PARAMETERS = {
  // Sci-Fi parameters
  techLevel: `${CATEGORIES.sciFi}-${nameToId("Technology Level")}`,
  alienLife: `${CATEGORIES.sciFi}-${nameToId("Alien Life")}`,
  spaceExploration: `${CATEGORIES.sciFi}-${nameToId("Space Exploration Focus")}`,
  
  // Fantasy parameters
  magicSystem: `${CATEGORIES.fantasy}-${nameToId("Magic System")}`,
  creatures: `${CATEGORIES.fantasy}-${nameToId("Mythical Creatures")}`,
  setting: `${CATEGORIES.fantasy}-${nameToId("Setting")}`,
  
  // Dystopian parameters
  societyType: `${CATEGORIES.dystopian}-${nameToId("Society Type")}`,
  survivalDifficulty: `${CATEGORIES.dystopian}-${nameToId("Survival Difficulty")}`,
  hopeLevel: `${CATEGORIES.dystopian}-${nameToId("Hope Level")}`
};

// Create sample database content
const databaseContent = {
  categories: [
    {
      id: CATEGORIES.sciFi,
      name: "Science Fiction",
      visibility: "Show"
    },
    {
      id: CATEGORIES.fantasy,
      name: "Fantasy",
      visibility: "Show"
    },
    {
      id: CATEGORIES.dystopian,
      name: "Dystopian Future",
      visibility: "Show"
    }
  ],
  parameters: [
    // Sci-Fi Parameters
    {
      id: PARAMETERS.techLevel,
      name: "Technology Level",
      type: "Dropdown",
      visibility: "Basic",
      categoryId: CATEGORIES.sciFi,
      values: [
        { id: nameToId("Near Future"), label: "Near Future" },
        { id: nameToId("Advanced"), label: "Advanced" },
        { id: nameToId("Post-Singularity"), label: "Post-Singularity" },
        { id: nameToId("Ancient Advanced Tech"), label: "Ancient Advanced Tech" }
      ],
      config: {}
    },
    {
      id: PARAMETERS.alienLife,
      name: "Alien Life",
      type: "Toggle Switch",
      visibility: "Basic",
      categoryId: CATEGORIES.sciFi,
      values: {
        on: "Yes",
        off: "No"
      },
      config: {}
    },
    {
      id: PARAMETERS.spaceExploration,
      name: "Space Exploration Focus",
      type: "Slider",
      visibility: "Basic",
      categoryId: CATEGORIES.sciFi,
      values: [],
      config: {
        min: 1,
        max: 10,
        step: 1
      }
    },
    
    // Fantasy Parameters
    {
      id: PARAMETERS.magicSystem,
      name: "Magic System",
      type: "Radio Buttons",
      visibility: "Basic",
      categoryId: CATEGORIES.fantasy,
      values: [
        { id: nameToId("Elemental"), label: "Elemental" },
        { id: nameToId("Divine"), label: "Divine" },
        { id: nameToId("Wild"), label: "Wild" },
        { id: nameToId("Forbidden"), label: "Forbidden" }
      ],
      config: {}
    },
    {
      id: PARAMETERS.creatures,
      name: "Mythical Creatures",
      type: "Checkbox",
      visibility: "Basic",
      categoryId: CATEGORIES.fantasy,
      values: [
        { id: nameToId("Dragons"), label: "Dragons" },
        { id: nameToId("Elves"), label: "Elves" },
        { id: nameToId("Dwarves"), label: "Dwarves" },
        { id: nameToId("Unicorns"), label: "Unicorns" },
        { id: nameToId("Merfolk"), label: "Merfolk" }
      ],
      config: {}
    },
    {
      id: PARAMETERS.setting,
      name: "Setting",
      type: "Dropdown",
      visibility: "Basic",
      categoryId: CATEGORIES.fantasy,
      values: [
        { id: nameToId("Medieval Europe"), label: "Medieval Europe" },
        { id: nameToId("Ancient Orient"), label: "Ancient Orient" },
        { id: nameToId("Island Realm"), label: "Island Realm" },
        { id: nameToId("Desert Kingdom"), label: "Desert Kingdom" }
      ],
      config: {}
    },
    
    // Dystopian Parameters
    {
      id: PARAMETERS.societyType,
      name: "Society Type",
      type: "Dropdown",
      visibility: "Basic",
      categoryId: CATEGORIES.dystopian,
      values: [
        { id: nameToId("Totalitarian Regime"), label: "Totalitarian Regime" },
        { id: nameToId("Post-Apocalyptic"), label: "Post-Apocalyptic" },
        { id: nameToId("Corporate Controlled"), label: "Corporate Controlled" },
        { id: nameToId("Technological Surveillance"), label: "Technological Surveillance" }
      ],
      config: {}
    },
    {
      id: PARAMETERS.survivalDifficulty,
      name: "Survival Difficulty",
      type: "Slider",
      visibility: "Basic",
      categoryId: CATEGORIES.dystopian,
      values: [],
      config: {
        min: 1,
        max: 10,
        step: 1
      }
    },
    {
      id: PARAMETERS.hopeLevel,
      name: "Hope Level",
      type: "Slider",
      visibility: "Basic",
      categoryId: CATEGORIES.dystopian,
      values: [],
      config: {
        min: 1,
        max: 10,
        step: 1
      }
    }
  ]
};

// Write sample data to database.json
async function initializeDatabase() {
  try {
    // Make sure the data directory exists
    await fs.ensureDir(path.dirname(DATABASE_PATH));
    
    // Write the data
    await fs.writeJson(DATABASE_PATH, databaseContent, { spaces: 2 });
    
    console.log('Database initialized with sample data!');
    console.log('\nSample Generate Request:');
    console.log(JSON.stringify({
      [CATEGORIES.sciFi]: {
        [PARAMETERS.techLevel]: "Near Future",
        [PARAMETERS.alienLife]: true,
        [PARAMETERS.spaceExploration]: 7
      }
    }, null, 2));
    
    console.log('\nCategory IDs (derived from names):');
    Object.entries(CATEGORIES).forEach(([name, id]) => {
      console.log(`${name}: ${id}`);
    });
    
    console.log('\nParameter IDs (derived from category + name):');
    Object.entries(PARAMETERS).forEach(([name, id]) => {
      console.log(`${name}: ${id}`);
    });
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Run the initialization
initializeDatabase();