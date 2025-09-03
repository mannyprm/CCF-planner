// Core types and interfaces for the CCF Sermon Planning API
import { Request } from 'express';

// ==================== AUTHENTICATION & AUTHORIZATION ====================

export interface User {
  id: string;
  firebase_uid: string;
  email: string;
  display_name: string;
  role: UserRole;
  workspace_id: string;
  is_active: boolean;
  profile_picture?: string;
  phone?: string;
  preferences: UserPreferences;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  PASTOR = 'pastor',
  VOLUNTEER = 'volunteer',
  VIEWER = 'viewer'
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
    sermon_reminders: boolean;
    deadline_alerts: boolean;
  };
  timezone: string;
  language: string;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
  token?: string;
}

// ==================== WORKSPACE ====================

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  church_name: string;
  address?: Address;
  settings: WorkspaceSettings;
  subscription_tier: 'free' | 'basic' | 'premium';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
}

export interface WorkspaceSettings {
  time_zone: string;
  default_service_time: string;
  advance_planning_weeks: number;
  sermon_length_minutes: number;
  allow_guest_speakers: boolean;
  require_approval: boolean;
  branding: {
    logo_url?: string;
    primary_color: string;
    secondary_color: string;
  };
}

// ==================== SERMON SERIES ====================

export interface SermonSeries {
  id: string;
  workspace_id: string;
  title: string;
  description?: string;
  theme_scripture?: string;
  start_date: Date;
  end_date?: Date;
  is_active: boolean;
  series_image?: string;
  color_theme: string;
  tags: string[];
  metadata: SeriesMetadata;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface SeriesMetadata {
  target_audience?: string;
  series_type: 'expository' | 'topical' | 'narrative' | 'seasonal' | 'other';
  estimated_sermons: number;
  actual_sermons?: number;
  resources: string[];
}

// ==================== SERMONS ====================

export interface Sermon {
  id: string;
  workspace_id: string;
  series_id?: string;
  title: string;
  subtitle?: string;
  speaker_id: string;
  service_date: Date;
  service_time: string;
  duration_minutes: number;
  status: SermonStatus;
  sermon_type: SermonType;
  scripture_references: ScriptureReference[];
  main_points: string[];
  target_audience?: string;
  description?: string;
  notes?: string;
  preparation_status: PreparationStatus;
  resources: SermonResource[];
  assignments: Assignment[];
  tags: string[];
  is_published: boolean;
  published_at?: Date;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export enum SermonStatus {
  PLANNING = 'planning',
  IN_PREPARATION = 'in_preparation',
  READY = 'ready',
  DELIVERED = 'delivered',
  ARCHIVED = 'archived'
}

export enum SermonType {
  SUNDAY_MORNING = 'sunday_morning',
  SUNDAY_EVENING = 'sunday_evening',
  WEDNESDAY = 'wednesday',
  SPECIAL_EVENT = 'special_event',
  GUEST_SPEAKER = 'guest_speaker',
  SERIES = 'series',
  STANDALONE = 'standalone'
}

export interface ScriptureReference {
  book: string;
  chapter: number;
  verse_start?: number;
  verse_end?: number;
  version: string;
  is_primary: boolean;
}

export interface PreparationStatus {
  outline_complete: boolean;
  research_complete: boolean;
  slides_complete: boolean;
  notes_complete: boolean;
  practice_complete: boolean;
  last_updated: Date;
}

// ==================== RESOURCES & ASSIGNMENTS ====================

export interface SermonResource {
  id: string;
  type: ResourceType;
  title: string;
  description?: string;
  url?: string;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by: string;
  created_at: Date;
}

export enum ResourceType {
  OUTLINE = 'outline',
  SLIDES = 'slides',
  AUDIO = 'audio',
  VIDEO = 'video',
  HANDOUT = 'handout',
  SCRIPTURE = 'scripture',
  RESEARCH = 'research',
  IMAGE = 'image',
  OTHER = 'other'
}

export interface Assignment {
  id: string;
  sermon_id: string;
  assigned_to: string;
  assigned_by: string;
  task_type: TaskType;
  title: string;
  description?: string;
  due_date: Date;
  status: AssignmentStatus;
  priority: Priority;
  estimated_hours?: number;
  actual_hours?: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
}

export enum TaskType {
  RESEARCH = 'research',
  OUTLINE = 'outline',
  SLIDES = 'slides',
  MUSIC = 'music',
  MULTIMEDIA = 'multimedia',
  HANDOUTS = 'handouts',
  TECHNICAL = 'technical',
  PROMOTION = 'promotion',
  FOLLOW_UP = 'follow_up',
  OTHER = 'other'
}

export enum AssignmentStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

// ==================== API RESPONSES ====================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ValidationError[];
  pagination?: PaginationInfo;
  timestamp: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// ==================== REQUEST/RESPONSE DTOS ====================

export interface CreateSermonRequest {
  title: string;
  subtitle?: string;
  series_id?: string;
  speaker_id: string;
  service_date: string;
  service_time: string;
  duration_minutes: number;
  sermon_type: SermonType;
  scripture_references: Omit<ScriptureReference, 'id'>[];
  main_points: string[];
  target_audience?: string;
  description?: string;
  notes?: string;
  tags?: string[];
}

export interface UpdateSermonRequest extends Partial<CreateSermonRequest> {
  status?: SermonStatus;
  is_published?: boolean;
}

export interface CreateSeriesRequest {
  title: string;
  description?: string;
  theme_scripture?: string;
  start_date: string;
  end_date?: string;
  color_theme: string;
  tags?: string[];
  metadata: Partial<SeriesMetadata>;
}

export interface CreateUserRequest {
  email: string;
  display_name: string;
  role: UserRole;
  workspace_id: string;
  phone?: string;
  preferences?: Partial<UserPreferences>;
}

export interface LoginRequest {
  firebase_token: string;
}

export interface LoginResponse {
  user: Omit<User, 'firebase_uid'>;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// ==================== QUERY PARAMETERS ====================

export interface SermonQueryParams {
  page?: number;
  limit?: number;
  series_id?: string;
  speaker_id?: string;
  status?: SermonStatus;
  service_date_from?: string;
  service_date_to?: string;
  search?: string;
  tags?: string;
  sort_by?: 'service_date' | 'created_at' | 'title';
  sort_order?: 'asc' | 'desc';
}

export interface SeriesQueryParams {
  page?: number;
  limit?: number;
  is_active?: boolean;
  search?: string;
  tags?: string;
  sort_by?: 'start_date' | 'created_at' | 'title';
  sort_order?: 'asc' | 'desc';
}

// ==================== EXPORT TYPES ====================

export interface ExportRequest {
  format: ExportFormat;
  date_range?: {
    start: string;
    end: string;
  };
  series_ids?: string[];
  sermon_ids?: string[];
  include_resources?: boolean;
  template?: string;
}

export enum ExportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  ICAL = 'ical',
  JSON = 'json',
  CSV = 'csv'
}

// ==================== WEBSOCKET EVENTS ====================

export interface WebSocketEvent {
  type: WebSocketEventType;
  payload: any;
  user_id: string;
  workspace_id: string;
  timestamp: Date;
}

export enum WebSocketEventType {
  SERMON_UPDATED = 'sermon_updated',
  SERMON_CREATED = 'sermon_created',
  ASSIGNMENT_UPDATED = 'assignment_updated',
  USER_ONLINE = 'user_online',
  USER_OFFLINE = 'user_offline',
  NOTIFICATION = 'notification'
}

// ==================== DATABASE INTERFACES ====================

export interface DbConnection {
  query: (text: string, params?: any[]) => Promise<any>;
  transaction: (callback: (trx: any) => Promise<any>) => Promise<any>;
}

export interface CacheService {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttl?: number) => Promise<void>;
  del: (key: string) => Promise<void>;
  exists: (key: string) => Promise<boolean>;
}

// ==================== ERROR TYPES ====================

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationErrorClass extends AppError {
  public readonly errors: ValidationError[];

  constructor(errors: ValidationError[]) {
    super('Validation failed', 400);
    this.errors = errors;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
  }
}