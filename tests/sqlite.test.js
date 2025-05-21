/* global describe, test, expect, jest, beforeEach, afterEach */

// Mock the sqlite3 module
jest.mock('sqlite3', () => {
  // Create mock implementation for Database constructor and methods
  const mockDb = {
    run: jest.fn().mockImplementation((query, params, callback) => {
      // If params is a function, it's the callback
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      
      // Immediately call the callback with null error
      if (callback) {
        callback.call({ changes: 1 }, null);
      }
      return mockDb;
    }),
    all: jest.fn().mockImplementation((query, params, callback) => {
      // If params is a function, it's the callback
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      
      const mockRows = [
        {
          id: 'gen-1',
          title: 'Test Generation',
          type: 'fiction',
          content: 'This is test content.',
          parameter_values: '{"key":"value"}',
          metadata: '{"model":"test-model"}',
          year: 2023,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        }
      ];
      
      // Immediately call the callback with null error and mock rows
      if (callback) {
        callback(null, mockRows);
      }
    }),
    get: jest.fn().mockImplementation((query, params, callback) => {
      // If params is a function, it's the callback
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      
      // Immediately call the callback with null error and mock row
      if (callback) {
        callback(null, {
          id: 'gen-1',
          title: 'Test Generation',
          type: 'fiction',
          content: 'This is test content.',
          parameter_values: '{"key":"value"}',
          metadata: '{"model":"test-model"}',
          year: 2023,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        });
      }
    }),
    prepare: jest.fn().mockImplementation(() => {
      const mockStmt = {
        run: jest.fn().mockImplementation((...args) => {
          // The last argument should be the callback if provided
          const callback = args[args.length - 1];
          if (typeof callback === 'function') {
            callback(null);
          }
          return mockStmt;
        }),
        finalize: jest.fn().mockImplementation((callback) => {
          if (callback) {
            callback(null);
          }
          return mockStmt;
        })
      };
      return mockStmt;
    }),
    serialize: jest.fn().mockImplementation((callback) => {
      if (callback) {
        callback();
      }
      return mockDb;
    }),
    close: jest.fn().mockImplementation((callback) => {
      if (callback) {
        callback(null);
      }
    })
  };

  return {
    verbose: jest.fn().mockReturnValue({
      Database: jest.fn().mockImplementation(() => mockDb)
    })
  };
});

// Mock fs.promises
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined)
  }
}));

// Load the SQLiteService after mocking dependencies
const sqliteService = require('../services/sqliteService');

describe('SQLiteService Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllGenerationsForBackup', () => {
    test('should return all generations data from the database', async () => {
      const generations = await sqliteService.getAllGenerationsForBackup();
      
      // Verify we got data back
      expect(generations).toBeInstanceOf(Array);
      expect(generations.length).toBe(1);
      expect(generations[0]).toHaveProperty('id', 'gen-1');
      expect(generations[0]).toHaveProperty('title', 'Test Generation');
      expect(generations[0]).toHaveProperty('parameterValues');
      expect(generations[0]).toHaveProperty('metadata');
      
      // Verify SQL query
      const db = sqliteService.db;
      expect(db.all).toHaveBeenCalledWith(
        'SELECT * FROM generated_content ORDER BY created_at DESC',
        [],
        expect.any(Function)
      );
    });
  });

  describe('restoreGenerationsFromBackup', () => {
    const sampleGenerations = [
      {
        id: 'gen-1',
        title: 'Test Generation',
        type: 'fiction',
        content: 'This is test content.',
        parameterValues: { key: 'value' },
        metadata: { model: 'test-model' },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      }
    ];

    test('should validate input is an array', async () => {
      await expect(sqliteService.restoreGenerationsFromBackup('not-an-array'))
        .rejects.toThrow('Invalid generations data: must be an array');
    });

    test('should restore generations to the database', async () => {
      // Increase the timeout for this test
      jest.setTimeout(30000);
      
      await sqliteService.restoreGenerationsFromBackup(sampleGenerations);
      
      const db = sqliteService.db;
      
      // Verify transaction started
      expect(db.run).toHaveBeenCalledWith('BEGIN TRANSACTION');
      
      // Verify deletion of existing data
      expect(db.run).toHaveBeenCalledWith('DELETE FROM generated_content', expect.any(Function));
      
      // Verify prepared statement
      expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO generated_content'));
      
      // Verify transaction committed
      expect(db.run).toHaveBeenCalledWith('COMMIT', expect.any(Function));
    });
  });

  describe('resetGeneratedContent', () => {
    test('should delete all data from the generated_content table', async () => {
      // Increase the timeout for this test
      jest.setTimeout(30000);
      
      await sqliteService.resetGeneratedContent();
      
      const db = sqliteService.db;
      
      // Verify deletion query was executed
      expect(db.run).toHaveBeenCalledWith('DELETE FROM generated_content', expect.any(Function));
    });
  });
});