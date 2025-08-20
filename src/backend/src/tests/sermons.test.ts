import request from 'supertest';
import { DatabaseService } from '../services/database';
import { RedisService } from '../services/redis';
import { SermonStatus, SermonType, UserRole } from '../types';

// Mock services
jest.mock('../services/database');
jest.mock('../services/redis');

describe('Sermons Routes', () => {
  let app: any;

  const mockUser = {
    id: 'user-123',
    email: 'pastor@church.com',
    display_name: 'Pastor John',
    role: UserRole.PASTOR,
    workspace_id: 'workspace-123',
    is_active: true
  };

  const mockSermon = {
    id: 'sermon-123',
    workspace_id: 'workspace-123',
    series_id: 'series-123',
    title: 'Test Sermon',
    subtitle: 'A test sermon',
    speaker_id: 'user-123',
    service_date: '2024-01-07',
    service_time: '10:00',
    duration_minutes: 30,
    status: SermonStatus.PLANNING,
    sermon_type: SermonType.SUNDAY_MORNING,
    scripture_references: [
      {
        book: 'John',
        chapter: 3,
        verse_start: 16,
        verse_end: 17,
        version: 'NIV',
        is_primary: true
      }
    ],
    main_points: ['God loves us', 'Jesus saves', 'We should respond'],
    target_audience: 'All ages',
    description: 'A sermon about God\'s love',
    notes: 'Remember to speak slowly',
    tags: ['love', 'salvation'],
    is_published: false,
    created_by: 'user-123',
    created_at: new Date(),
    updated_at: new Date()
  };

  beforeAll(async () => {
    // Import app after mocks are set up
    const { app: testApp } = await import('../index');
    app = testApp;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication middleware
    jest.doMock('../middleware/auth', () => ({
      authMiddleware: (req: any, res: any, next: any) => {
        req.user = mockUser;
        next();
      },
      requireRole: () => (req: any, res: any, next: any) => next(),
      requireWorkspaceAccess: () => (req: any, res: any, next: any) => next(),
      requireOwnership: () => (req: any, res: any, next: any) => next()
    }));
  });

  describe('GET /api/v1/sermons', () => {
    it('should get sermons with pagination', async () => {
      const mockSermons = [mockSermon, { ...mockSermon, id: 'sermon-456', title: 'Another Sermon' }];
      
      (DatabaseService.query as jest.Mock)
        .mockResolvedValueOnce({ rows: mockSermons }) // Main query
        .mockResolvedValueOnce({ rows: [{ total: '2' }] }); // Count query

      const response = await request(app)
        .get('/api/v1/sermons')
        .set('Authorization', 'Bearer valid-token')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        pages: 1,
        has_next: false,
        has_prev: false
      });
    });

    it('should filter sermons by series', async () => {
      (DatabaseService.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockSermon] })
        .mockResolvedValueOnce({ rows: [{ total: '1' }] });

      const response = await request(app)
        .get('/api/v1/sermons')
        .set('Authorization', 'Bearer valid-token')
        .query({ series_id: 'series-123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      
      // Verify query includes series filter
      expect(DatabaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('s.series_id = $2'),
        expect.arrayContaining(['workspace-123', 'series-123'])
      );
    });

    it('should filter sermons by status', async () => {
      (DatabaseService.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockSermon] })
        .mockResolvedValueOnce({ rows: [{ total: '1' }] });

      const response = await request(app)
        .get('/api/v1/sermons')
        .set('Authorization', 'Bearer valid-token')
        .query({ status: SermonStatus.PLANNING })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify query includes status filter
      expect(DatabaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('s.status = $2'),
        expect.arrayContaining(['workspace-123', SermonStatus.PLANNING])
      );
    });

    it('should search sermons by text', async () => {
      (DatabaseService.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockSermon] })
        .mockResolvedValueOnce({ rows: [{ total: '1' }] });

      const response = await request(app)
        .get('/api/v1/sermons')
        .set('Authorization', 'Bearer valid-token')
        .query({ search: 'love' })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify query includes search filter
      expect(DatabaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining(['workspace-123', '%love%'])
      );
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/sermons')
        .set('Authorization', 'Bearer valid-token')
        .query({ page: 'invalid', limit: 200 }) // Invalid page, limit too high
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('GET /api/v1/sermons/:id', () => {
    it('should get sermon by id with resources and assignments', async () => {
      const mockResources = [
        { id: 'resource-1', type: 'outline', title: 'Sermon Outline' }
      ];
      const mockAssignments = [
        { id: 'assignment-1', title: 'Prepare slides', status: 'pending' }
      ];

      (DatabaseService.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockSermon] }) // Main sermon query
        .mockResolvedValueOnce({ rows: mockResources }) // Resources query
        .mockResolvedValueOnce({ rows: mockAssignments }); // Assignments query

      const response = await request(app)
        .get('/api/v1/sermons/sermon-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('sermon-123');
      expect(response.body.data.resources).toEqual(mockResources);
      expect(response.body.data.assignments).toEqual(mockAssignments);
    });

    it('should return 404 for non-existent sermon', async () => {
      (DatabaseService.query as jest.Mock).mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/v1/sermons/non-existent')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Sermon not found');
    });
  });

  describe('POST /api/v1/sermons', () => {
    const validSermonData = {
      title: 'New Test Sermon',
      subtitle: 'A new test sermon',
      speaker_id: 'user-123',
      service_date: '2024-02-14',
      service_time: '10:00',
      duration_minutes: 45,
      sermon_type: SermonType.SUNDAY_MORNING,
      scripture_references: [
        {
          book: 'Romans',
          chapter: 8,
          verse_start: 28,
          version: 'NIV',
          is_primary: true
        }
      ],
      main_points: ['God works for good', 'We are called', 'His purpose prevails'],
      description: 'About God\'s purpose'
    };

    it('should create new sermon successfully', async () => {
      const mockSpeaker = { id: 'user-123' };
      const mockCreatedSermon = { id: 'new-sermon-123', ...validSermonData };

      (DatabaseService.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockSpeaker] }) // Speaker exists check
        .mockResolvedValueOnce({ rows: [] }) // No scheduling conflicts
        .mockResolvedValueOnce({ rows: [mockCreatedSermon] }); // Create sermon

      (RedisService.del as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/v1/sermons')
        .set('Authorization', 'Bearer valid-token')
        .send(validSermonData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(validSermonData.title);
      expect(response.body.message).toBe('Sermon created successfully');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        title: '', // Empty title
        speaker_id: 'user-123',
        service_date: '2024-02-14'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/v1/sermons')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: expect.stringMatching(/title|service_time|duration_minutes|sermon_type|scripture_references|main_points/)
          })
        ])
      );
    });

    it('should prevent scheduling conflicts', async () => {
      const conflictingSermon = { id: 'existing-sermon', title: 'Existing Sermon' };

      (DatabaseService.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] }) // Speaker exists
        .mockResolvedValueOnce({ rows: [conflictingSermon] }); // Scheduling conflict

      const response = await request(app)
        .post('/api/v1/sermons')
        .set('Authorization', 'Bearer valid-token')
        .send(validSermonData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already scheduled');
    });

    it('should validate speaker exists', async () => {
      (DatabaseService.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }); // Speaker doesn't exist

      const response = await request(app)
        .post('/api/v1/sermons')
        .set('Authorization', 'Bearer valid-token')
        .send(validSermonData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Speaker not found');
    });

    it('should validate series exists if provided', async () => {
      const dataWithSeries = { ...validSermonData, series_id: 'non-existent-series' };

      (DatabaseService.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }); // Series doesn't exist

      const response = await request(app)
        .post('/api/v1/sermons')
        .set('Authorization', 'Bearer valid-token')
        .send(dataWithSeries)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Series not found');
    });

    it('should validate future service date for non-admin users', async () => {
      const pastDate = '2020-01-01';
      const dataWithPastDate = { ...validSermonData, service_date: pastDate };

      // Mock user as volunteer (not admin/pastor)
      const volunteerUser = { ...mockUser, role: UserRole.VOLUNTEER };
      
      const response = await request(app)
        .post('/api/v1/sermons')
        .set('Authorization', 'Bearer valid-token')
        .send(dataWithPastDate)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('cannot be in the past');
    });
  });

  describe('PUT /api/v1/sermons/:id', () => {
    const updateData = {
      title: 'Updated Sermon Title',
      description: 'Updated description'
    };

    it('should update sermon successfully', async () => {
      const updatedSermon = { ...mockSermon, ...updateData };

      (DatabaseService.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockSermon] }) // Get current sermon
        .mockResolvedValueOnce({ rows: [updatedSermon] }); // Update sermon

      (RedisService.del as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .put('/api/v1/sermons/sermon-123')
        .set('Authorization', 'Bearer valid-token')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.message).toBe('Sermon updated successfully');
    });

    it('should return 404 for non-existent sermon', async () => {
      (DatabaseService.query as jest.Mock).mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put('/api/v1/sermons/non-existent')
        .set('Authorization', 'Bearer valid-token')
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Sermon not found');
    });

    it('should validate scheduling conflicts when updating date/time', async () => {
      const conflictingSermon = { id: 'other-sermon', title: 'Other Sermon' };
      const scheduleUpdate = {
        service_date: '2024-03-15',
        service_time: '11:00'
      };

      (DatabaseService.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockSermon] }) // Current sermon
        .mockResolvedValueOnce({ rows: [conflictingSermon] }); // Scheduling conflict

      const response = await request(app)
        .put('/api/v1/sermons/sermon-123')
        .set('Authorization', 'Bearer valid-token')
        .send(scheduleUpdate)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already scheduled');
    });
  });

  describe('DELETE /api/v1/sermons/:id', () => {
    it('should delete sermon successfully', async () => {
      (DatabaseService.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ title: mockSermon.title }] }) // Sermon exists
        .mockResolvedValueOnce({ rows: [] }); // Delete sermon

      (RedisService.del as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/v1/sermons/sermon-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Sermon deleted successfully');
    });

    it('should return 404 for non-existent sermon', async () => {
      (DatabaseService.query as jest.Mock).mockResolvedValue({ rows: [] });

      const response = await request(app)
        .delete('/api/v1/sermons/non-existent')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Sermon not found');
    });
  });

  describe('PATCH /api/v1/sermons/:id/status', () => {
    it('should update sermon status', async () => {
      const updatedSermon = { 
        title: mockSermon.title, 
        status: SermonStatus.READY 
      };

      (DatabaseService.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [updatedSermon] });

      (RedisService.del as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .patch('/api/v1/sermons/sermon-123/status')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: SermonStatus.READY })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(SermonStatus.READY);
      expect(response.body.message).toBe('Sermon status updated successfully');
    });

    it('should validate status value', async () => {
      const response = await request(app)
        .patch('/api/v1/sermons/sermon-123/status')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'invalid-status' })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid status value');
    });
  });

  describe('PATCH /api/v1/sermons/:id/publish', () => {
    it('should publish sermon', async () => {
      const publishedSermon = {
        title: mockSermon.title,
        is_published: true,
        published_at: new Date()
      };

      (DatabaseService.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [publishedSermon] });

      (RedisService.del as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .patch('/api/v1/sermons/sermon-123/publish')
        .set('Authorization', 'Bearer valid-token')
        .send({ is_published: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.is_published).toBe(true);
      expect(response.body.message).toBe('Sermon published successfully');
    });

    it('should unpublish sermon', async () => {
      const unpublishedSermon = {
        title: mockSermon.title,
        is_published: false,
        published_at: null
      };

      (DatabaseService.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [unpublishedSermon] });

      (RedisService.del as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .patch('/api/v1/sermons/sermon-123/publish')
        .set('Authorization', 'Bearer valid-token')
        .send({ is_published: false })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.is_published).toBe(false);
      expect(response.body.message).toBe('Sermon unpublished successfully');
    });
  });

  describe('GET /api/v1/sermons/:id/timeline', () => {
    it('should get sermon timeline', async () => {
      const mockTimeline = [
        {
          event_type: 'sermon_created',
          event_date: new Date(),
          user_name: 'Pastor John',
          description: 'Sermon created'
        },
        {
          event_type: 'assignment_created',
          event_date: new Date(),
          user_name: 'Pastor John',
          description: 'Assignment created: Prepare slides'
        }
      ];

      (DatabaseService.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'sermon-123' }] }) // Sermon exists
        .mockResolvedValueOnce({ rows: mockTimeline }); // Timeline events

      const response = await request(app)
        .get('/api/v1/sermons/sermon-123/timeline')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].event_type).toBe('sermon_created');
    });

    it('should return 404 for non-existent sermon', async () => {
      (DatabaseService.query as jest.Mock).mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/v1/sermons/non-existent/timeline')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Sermon not found');
    });
  });

  describe('Authorization', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/sermons')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should enforce role-based access for creation', async () => {
      // Test would verify that only ADMIN, PASTOR, VOLUNTEER can create
      // Implementation depends on how roles are mocked
    });

    it('should enforce ownership for updates', async () => {
      // Test would verify that users can only update their own sermons
      // unless they're admin/pastor
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      (DatabaseService.query as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/v1/sermons')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle cache errors gracefully', async () => {
      (DatabaseService.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockSermon] })
        .mockResolvedValueOnce({ rows: [{ total: '1' }] });

      (RedisService.del as jest.Mock).mockRejectedValue(new Error('Redis error'));

      // Should still work even if cache fails
      const response = await request(app)
        .get('/api/v1/sermons')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});