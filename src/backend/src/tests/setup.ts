import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console methods in test environment to reduce noise
if (process.env.NODE_ENV === 'test') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

// Increase test timeout for integration tests
jest.setTimeout(30000);

// Mock Firebase Admin SDK
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn()
  },
  auth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    revokeRefreshTokens: jest.fn(),
  })),
}));

// Mock AWS SDK
jest.mock('aws-sdk', () => ({
  S3: jest.fn(() => ({
    upload: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Location: 'https://test-bucket.s3.amazonaws.com/test-file.jpg'
      })
    }),
    deleteObject: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    })
  })),
  config: {
    update: jest.fn()
  }
}));

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    keys: jest.fn(),
    hget: jest.fn(),
    hset: jest.fn(),
    hdel: jest.fn(),
    hgetall: jest.fn(),
    lpush: jest.fn(),
    rpop: jest.fn(),
    lrange: jest.fn(),
    sadd: jest.fn(),
    srem: jest.fn(),
    smembers: jest.fn(),
    sismember: jest.fn(),
    incr: jest.fn(),
    mget: jest.fn(),
    mset: jest.fn(),
    ping: jest.fn().mockResolvedValue('PONG'),
    on: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    publish: jest.fn(),
    pipeline: jest.fn().mockReturnValue({
      incr: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([[null, 1]])
    }),
    status: 'ready'
  }));
});

// Mock Knex/Database
jest.mock('knex', () => {
  const mockKnex = jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue({}),
    then: jest.fn().mockResolvedValue([]),
    catch: jest.fn(),
    transaction: jest.fn((callback) => callback(mockKnex)),
    raw: jest.fn().mockResolvedValue({ rows: [] }),
    destroy: jest.fn().mockResolvedValue(undefined)
  }));
  
  return mockKnex;
});

// Mock Puppeteer
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
      close: jest.fn().mockResolvedValue(undefined)
    }),
    close: jest.fn().mockResolvedValue(undefined)
  })
}));

// Mock file system operations
jest.mock('fs/promises', () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(Buffer.from('mock-file-content')),
  access: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined)
}));

// Mock ExcelJS
jest.mock('exceljs', () => ({
  Workbook: jest.fn().mockImplementation(() => ({
    creator: '',
    created: new Date(),
    addWorksheet: jest.fn().mockReturnValue({
      columns: [],
      addRow: jest.fn(),
      getRow: jest.fn().mockReturnValue({
        font: {},
        fill: {}
      }),
      autoFilter: {}
    }),
    xlsx: {
      writeBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-excel-content'))
    }
  }))
}));

// Mock iCal generator
jest.mock('ical-generator', () => {
  return jest.fn().mockImplementation(() => ({
    createEvent: jest.fn(),
    toString: jest.fn().mockReturnValue('mock-ical-content')
  }));
});

// Mock Multer
jest.mock('multer', () => {
  const multer = jest.fn(() => ({
    single: jest.fn(() => (req: any, res: any, next: any) => {
      req.file = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 12345,
        buffer: Buffer.from('mock-file-content')
      };
      next();
    }),
    array: jest.fn(() => (req: any, res: any, next: any) => {
      req.files = [{
        fieldname: 'files',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 12345,
        buffer: Buffer.from('mock-file-content')
      }];
      next();
    })
  }));

  multer.memoryStorage = jest.fn();
  multer.diskStorage = jest.fn();

  return multer;
});

// Mock rate limiter
jest.mock('rate-limiter-flexible', () => ({
  RateLimiterRedis: jest.fn().mockImplementation(() => ({
    consume: jest.fn().mockResolvedValue({ remainingPoints: 10 }),
    points: 100
  })),
  RateLimiterMemory: jest.fn().mockImplementation(() => ({
    consume: jest.fn().mockResolvedValue({ remainingPoints: 10 }),
    points: 100
  }))
}));

// Global test helpers
global.createMockUser = (overrides = {}) => ({
  id: 'user-123',
  firebase_uid: 'firebase-uid-123',
  email: 'test@example.com',
  display_name: 'Test User',
  role: 'pastor',
  workspace_id: 'workspace-123',
  is_active: true,
  profile_picture: null,
  phone: null,
  preferences: {
    theme: 'system',
    notifications: {
      email: true,
      push: true,
      sermon_reminders: true,
      deadline_alerts: true
    },
    timezone: 'UTC',
    language: 'en'
  },
  created_at: new Date(),
  updated_at: new Date(),
  last_login: new Date(),
  ...overrides
});

global.createMockSermon = (overrides = {}) => ({
  id: 'sermon-123',
  workspace_id: 'workspace-123',
  series_id: null,
  title: 'Test Sermon',
  subtitle: null,
  speaker_id: 'user-123',
  service_date: '2024-01-07',
  service_time: '10:00',
  duration_minutes: 30,
  status: 'planning',
  sermon_type: 'sunday_morning',
  scripture_references: [],
  main_points: [],
  target_audience: null,
  description: null,
  notes: null,
  preparation_status: {
    outline_complete: false,
    research_complete: false,
    slides_complete: false,
    notes_complete: false,
    practice_complete: false,
    last_updated: new Date()
  },
  tags: [],
  is_published: false,
  published_at: null,
  created_by: 'user-123',
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides
});

global.createMockSeries = (overrides = {}) => ({
  id: 'series-123',
  workspace_id: 'workspace-123',
  title: 'Test Series',
  description: null,
  theme_scripture: null,
  start_date: '2024-01-01',
  end_date: '2024-03-31',
  is_active: true,
  series_image: null,
  color_theme: '#3B82F6',
  tags: [],
  metadata: {
    target_audience: null,
    series_type: 'topical',
    estimated_sermons: 12,
    resources: []
  },
  created_by: 'user-123',
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides
});

// Cleanup function for tests
global.cleanup = () => {
  jest.clearAllMocks();
  jest.resetModules();
};

// Export types for TypeScript
declare global {
  var createMockUser: (overrides?: any) => any;
  var createMockSermon: (overrides?: any) => any;
  var createMockSeries: (overrides?: any) => any;
  var cleanup: () => void;

  namespace NodeJS {
    interface Global {
      createMockUser: (overrides?: any) => any;
      createMockSermon: (overrides?: any) => any;
      createMockSeries: (overrides?: any) => any;
      cleanup: () => void;
    }
  }
}

export {};