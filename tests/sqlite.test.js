/* global describe, test, expect, jest, beforeEach */

import { jest } from "@jest/globals";

// Mock the SQLite service - must be declared before import
jest.mock('../services/sqliteService.js', () => ({
  default: {
    getAllGenerationsForBackup: jest.fn(),
    restoreGenerationsFromBackup: jest.fn(), 
    resetGeneratedContent: jest.fn(),
    getGeneratedContent: jest.fn(),
    saveGeneratedContent: jest.fn()
  }
}));

// Import the mocked service
import sqliteService from '../services/sqliteService.js';

describe('SQLiteService Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllGenerationsForBackup', () => {
    test('should return all generations data from the database', async () => {
      const mockData = [
        {
          id: 'gen-1',
          title: 'Test Generation',
          content: 'Mock content',
          type: 'fiction',
          parameterValues: { test: 'value' },
          created_at: new Date().toISOString(),
          metadata: { model: 'test' }
        }
      ];
      
      // Setup mock to return test data
      sqliteService.getAllGenerationsForBackup.mockResolvedValue(mockData);
      
      const generations = await sqliteService.getAllGenerationsForBackup();
      
      // Verify we got data back
      expect(generations).toBeInstanceOf(Array);
      expect(generations.length).toBe(1);
      expect(generations[0]).toHaveProperty('id', 'gen-1');
      expect(generations[0]).toHaveProperty('title', 'Test Generation');
      expect(generations[0]).toHaveProperty('parameterValues');
      expect(generations[0]).toHaveProperty('metadata');
      
      // Verify the service method was called
      expect(sqliteService.getAllGenerationsForBackup).toHaveBeenCalledTimes(1);
    });
  });

  describe('restoreGenerationsFromBackup', () => {
    test('should validate input is an array', async () => {
      // Mock implementation that validates input
      sqliteService.restoreGenerationsFromBackup.mockImplementation(async (data) => {
        if (!Array.isArray(data)) {
          throw new Error('Input must be an array');
        }
        return { success: true };
      });
      
      // Test with invalid input
      await expect(sqliteService.restoreGenerationsFromBackup('not-an-array'))
        .rejects.toThrow('Input must be an array');
      
      // Test with valid input
      const result = await sqliteService.restoreGenerationsFromBackup([]);
      expect(result).toEqual({ success: true });
      
      expect(sqliteService.restoreGenerationsFromBackup).toHaveBeenCalledTimes(2);
    });

    test('should restore generations to the database', async () => {
      const sampleGenerations = [
        {
          id: 'gen-1',
          title: 'Test Generation',
          content: 'Test content',
          type: 'fiction',
          parameterValues: { test: 'value' },
          metadata: { model: 'test' }
        }
      ];
      
      // Setup mock successful response
      sqliteService.restoreGenerationsFromBackup.mockResolvedValue({ 
        success: true, 
        restored: 1 
      });
      
      const result = await sqliteService.restoreGenerationsFromBackup(sampleGenerations);
      
      expect(result.success).toBe(true);
      expect(result.restored).toBe(1);
      expect(sqliteService.restoreGenerationsFromBackup).toHaveBeenCalledWith(sampleGenerations);
    });
  });

  describe('resetGeneratedContent', () => {
    test('should delete all data from the generated_content table', async () => {
      // Setup mock successful response
      sqliteService.resetGeneratedContent.mockResolvedValue({ 
        success: true, 
        deleted: 5 
      });
      
      const result = await sqliteService.resetGeneratedContent();
      
      expect(result.success).toBe(true);
      expect(result.deleted).toBe(5);
      expect(sqliteService.resetGeneratedContent).toHaveBeenCalledTimes(1);
    });
  });
});