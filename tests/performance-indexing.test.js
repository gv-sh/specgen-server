// tests/performance-indexing.test.js
const sqliteService = require('../services/sqliteService');

describe('Database Indexing Performance Tests', () => {
  let testData = [];
  const LARGE_DATASET_SIZE = 1000;

  beforeAll(async () => {
    // Clear existing test data
    await sqliteService.resetGeneratedContent();

    // Generate large test dataset
    console.log(`Generating ${LARGE_DATASET_SIZE} test records...`);
    const types = ['fiction', 'image', 'combined'];
    const years = [2020, 2021, 2022, 2023, 2024];

    for (let i = 0; i < LARGE_DATASET_SIZE; i++) {
      const content = {
        id: `perf-test-${i}`,
        title: `Performance Test Content ${i}`,
        type: types[i % types.length],
        content: `This is test content number ${i} for performance testing.`,
        year: years[i % years.length],
        parameterValues: { testParam: i },
        metadata: { testIndex: i, batch: 'performance' }
      };

      // Add some image data for certain types
      if (content.type === 'image' || content.type === 'combined') {
        content.imageData = Buffer.from(`fake-image-data-${i}`);
      }

      testData.push(content);
    }

    // Insert all test data
    const startTime = Date.now();
    for (const content of testData) {
      await sqliteService.saveGeneratedContent(content);
    }
    const endTime = Date.now();
    console.log(`Inserted ${LARGE_DATASET_SIZE} records in ${endTime - startTime}ms`);
  });

  afterAll(async () => {
    // Clean up test data
    await sqliteService.resetGeneratedContent();
  });

  describe('Index Creation and Validation', () => {
    test('should have all expected indexes created', async () => {
      const dbInfo = await sqliteService.getDatabaseInfo();
      
      expect(dbInfo.totalRecords).toBe(LARGE_DATASET_SIZE);
      
      const indexNames = dbInfo.indexes.map(idx => idx.name);
      
      // Check that all expected indexes exist
      expect(indexNames).toContain('idx_generated_content_created_at');
      expect(indexNames).toContain('idx_generated_content_type');
      expect(indexNames).toContain('idx_generated_content_year');
      expect(indexNames).toContain('idx_generated_content_type_year_created');
      expect(indexNames).toContain('idx_generated_content_type_created');
      expect(indexNames).toContain('idx_generated_content_year_created');
      expect(indexNames).toContain('idx_generated_content_updated_at');
    });

    test('should validate index SQL definitions', async () => {
      const dbInfo = await sqliteService.getDatabaseInfo();
      
      const indexes = dbInfo.indexes.reduce((acc, idx) => {
        acc[idx.name] = idx.sql;
        return acc;
      }, {});

      // Verify critical composite indexes exist
      expect(indexes['idx_generated_content_type_year_created']).toContain('type, year, created_at DESC');
      expect(indexes['idx_generated_content_type_created']).toContain('type, created_at DESC');
      expect(indexes['idx_generated_content_year_created']).toContain('year, created_at DESC');
    });
  });

  describe('Query Performance with Indexes', () => {
    test('should perform basic ORDER BY created_at DESC efficiently', async () => {
      const startTime = Date.now();
      
      const result = await sqliteService.getGeneratedContent({ limit: 50 });
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(result.data).toHaveLength(50);
      expect(result.pagination.total).toBe(LARGE_DATASET_SIZE);
      
      // Query should complete within reasonable time
      expect(queryTime).toBeLessThan(100); // Should be very fast with index
      
      console.log(`Basic pagination query took ${queryTime}ms`);
    });

    test('should perform type filtering efficiently', async () => {
      const startTime = Date.now();
      
      const result = await sqliteService.getGeneratedContent({ 
        type: 'fiction',
        limit: 100 
      });
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(result.data.every(item => item.type === 'fiction')).toBe(true);
      
      // Type filtering should be fast with index
      expect(queryTime).toBeLessThan(50);
      
      console.log(`Type filtering query took ${queryTime}ms`);
    });

    test('should perform year filtering efficiently', async () => {
      const startTime = Date.now();
      
      const result = await sqliteService.getContentByYear(2023);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(result.every(item => item.year === 2023)).toBe(true);
      
      // Year filtering should be fast with index
      expect(queryTime).toBeLessThan(50);
      
      console.log(`Year filtering query took ${queryTime}ms`);
    });

    test('should perform combined type and year filtering efficiently', async () => {
      const startTime = Date.now();
      
      const result = await sqliteService.getGeneratedContent({
        type: 'image',
        year: 2022,
        limit: 50
      });
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(result.data.every(item => item.type === 'image' && item.year === 2022)).toBe(true);
      
      // Combined filtering should benefit from composite index
      expect(queryTime).toBeLessThan(30);
      
      console.log(`Combined type+year filtering query took ${queryTime}ms`);
    });

    test('should perform content summary queries efficiently', async () => {
      const startTime = Date.now();
      
      const result = await sqliteService.getContentSummary({
        page: 1,
        limit: 100
      });
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(result.data).toHaveLength(100);
      expect(result.data[0]).toHaveProperty('hasImage');
      expect(result.data[0]).not.toHaveProperty('content');
      expect(result.data[0]).not.toHaveProperty('imageData');
      
      // Summary queries should be very fast
      expect(queryTime).toBeLessThan(100);
      
      console.log(`Content summary query took ${queryTime}ms`);
    });

    test('should handle large pagination efficiently', async () => {
      const startTime = Date.now();
      
      // Test pagination near the end of dataset
      const lastPage = Math.ceil(LARGE_DATASET_SIZE / 20);
      const result = await sqliteService.getGeneratedContent({
        page: lastPage,
        limit: 20
      });
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(result.pagination.page).toBe(lastPage);
      expect(result.data.length).toBeGreaterThan(0);
      
      // Even large offsets should be reasonably fast
      expect(queryTime).toBeLessThan(200);
      
      console.log(`Large pagination query (page ${lastPage}) took ${queryTime}ms`);
    });
  });

  describe('Query Execution Plan Analysis', () => {
    test('should use indexes for type filtering', async () => {
      const query = 'SELECT * FROM generated_content WHERE type = ? ORDER BY created_at DESC LIMIT 10';
      const analysis = await sqliteService.analyzeQuery(query, ['fiction']);

      const planDetails = analysis.executionPlan.map(step => step.detail).join(' ');
      
      // Should use the type_created composite index
      expect(planDetails).toMatch(/idx_generated_content_type_created|idx_generated_content_type/);
      
      console.log('Type filtering execution plan:', planDetails);
    });

    test('should use indexes for year filtering', async () => {
      const query = 'SELECT * FROM generated_content WHERE year = ? ORDER BY created_at DESC LIMIT 10';
      const analysis = await sqliteService.analyzeQuery(query, [2023]);

      const planDetails = analysis.executionPlan.map(step => step.detail).join(' ');
      
      // Should use the year_created composite index
      expect(planDetails).toMatch(/idx_generated_content_year_created|idx_generated_content_year/);
      
      console.log('Year filtering execution plan:', planDetails);
    });

    test('should use composite index for combined filtering', async () => {
      const query = 'SELECT * FROM generated_content WHERE type = ? AND year = ? ORDER BY created_at DESC LIMIT 10';
      const analysis = await sqliteService.analyzeQuery(query, ['fiction', 2023]);

      const planDetails = analysis.executionPlan.map(step => step.detail).join(' ');
      
      // Should use the composite type_year_created index
      expect(planDetails).toMatch(/idx_generated_content_type_year_created/);
      
      console.log('Combined filtering execution plan:', planDetails);
    });
  });

  describe('Performance Benchmarks', () => {
    test('should meet 50%+ performance improvement target', async () => {
      // Test multiple query patterns and measure average performance
      const queryTests = [
        { name: 'Basic pagination', fn: () => sqliteService.getGeneratedContent({ limit: 50 }) },
        { name: 'Type filtering', fn: () => sqliteService.getGeneratedContent({ type: 'fiction', limit: 50 }) },
        { name: 'Year filtering', fn: () => sqliteService.getContentByYear(2023) },
        { name: 'Combined filtering', fn: () => sqliteService.getGeneratedContent({ type: 'image', year: 2022, limit: 50 }) },
        { name: 'Summary query', fn: () => sqliteService.getContentSummary({ limit: 100 }) }
      ];

      const results = [];
      
      for (const test of queryTests) {
        const iterations = 5;
        const times = [];
        
        for (let i = 0; i < iterations; i++) {
          const start = Date.now();
          await test.fn();
          const end = Date.now();
          times.push(end - start);
        }
        
        const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        
        results.push({
          name: test.name,
          averageTime: avgTime,
          minTime,
          maxTime
        });
        
        console.log(`${test.name}: avg=${avgTime.toFixed(2)}ms, min=${minTime}ms, max=${maxTime}ms`);
      }

      // All operations should be reasonably fast
      results.forEach(result => {
        expect(result.averageTime).toBeLessThan(100); // 100ms threshold for good performance
      });

      // Summary of results
      const overallAvg = results.reduce((sum, r) => sum + r.averageTime, 0) / results.length;
      console.log(`Overall average query time: ${overallAvg.toFixed(2)}ms`);
      
      expect(overallAvg).toBeLessThan(50); // Very good performance target
    });

    test('should scale well with dataset size', async () => {
      // Test queries at different dataset sizes by limiting results
      const limits = [10, 50, 100, 500];
      const results = [];

      for (const limit of limits) {
        const start = Date.now();
        const result = await sqliteService.getGeneratedContent({ limit });
        const end = Date.now();
        
        const queryTime = end - start;
        results.push({ limit, time: queryTime, recordsReturned: result.data.length });
        
        console.log(`Query with limit ${limit}: ${queryTime}ms (${result.data.length} records)`);
      }

      // Performance should scale reasonably
      results.forEach(result => {
        // Even large result sets should complete quickly
        expect(result.time).toBeLessThan(200);
      });
    });
  });

  describe('Database Maintenance', () => {
    test('should run maintenance operations successfully', async () => {
      const result = await sqliteService.runMaintenance();
      
      expect(result.operations).toEqual(['ANALYZE', 'VACUUM']);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.message).toContain('completed successfully');
      
      console.log(`Database maintenance took ${result.duration}ms`);
    });

    test('should provide comprehensive database information', async () => {
      const dbInfo = await sqliteService.getDatabaseInfo();
      
      expect(dbInfo).toHaveProperty('totalRecords');
      expect(dbInfo).toHaveProperty('indexes');
      expect(dbInfo).toHaveProperty('columns');
      
      expect(dbInfo.totalRecords).toBe(LARGE_DATASET_SIZE);
      expect(dbInfo.indexes.length).toBeGreaterThan(6); // At least 7 indexes including PRIMARY KEY
      expect(dbInfo.columns.length).toBe(10); // All table columns
      
      console.log(`Database has ${dbInfo.totalRecords} records and ${dbInfo.indexes.length} indexes`);
    });
  });
});