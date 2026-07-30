export type AuditAction = 'create' | 'update' | 'delete' | 'archive' | 'restore' | 'publish' | 'unpublish' | 'sync' | 'bulk_create' | 'bulk_update' | 'bulk_delete' | 'bulk_archive' | 'bulk_restore' | 'enqueue' | 'login' | 'logout' | 'export' | 'import';
export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';
export type AuditStatus = 'success' | 'failure' | 'pending';

export interface AuditEntry {
  id?: string;
  action: AuditAction;
  severity: AuditSeverity;
  status: AuditStatus;
  collection: string;
  documentId?: string;
  documentIds?: string[];
  previousData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  changedFields?: string[];
  performedBy?: string;
  performedByRole?: string;
  ipAddress?: string;
  userAgent?: string;
  duration?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'archive' | 'publish' | 'sync' | 'manage' | 'admin';
export type PermissionResource = 'products' | 'listings' | 'platforms' | 'sync' | 'automation' | 'analytics' | 'settings' | 'inventory' | 'ai' | 'logs' | 'audit' | 'notifications' | 'health' | 'users';
export type UserRole = 'admin' | 'manager' | 'operator' | 'viewer';

export interface RolePermission {
  role: UserRole;
  resource: PermissionResource;
  actions: PermissionAction[];
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  permissions: RolePermission[];
  lastLoginAt?: Date;
  createdAt: Date;
}

export interface Notification {
  id?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'inventory' | 'sync' | 'automation' | 'system' | 'audit' | 'permission';
  read: boolean;
  dismissed: boolean;
  actionUrl?: string;
  actionLabel?: string;
  sourceId?: string;
  sourceCollection?: string;
  expiresAt?: Date;
  recipientId?: string;
  recipientRole?: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  lastChecked: Date;
  error?: string;
  details?: Record<string, unknown>;
}

export interface SystemHealth {
  firestore: HealthCheckResult;
  aiProviders: HealthCheckResult[];
  marketplaceProviders: HealthCheckResult[];
  overall: 'healthy' | 'degraded' | 'unhealthy';
  lastUpdated: Date;
}

export interface RequestLog {
  id?: string;
  operation: string;
  collection: string;
  documentId?: string;
  method: 'get' | 'list' | 'create' | 'update' | 'delete' | 'batch';
  duration: number;
  status: 'success' | 'error';
  userId?: string;
  error?: string;
  createdAt: Date;
}

export interface PerfMetric {
  id?: string;
  operation: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface RateLimitEntry {
  key: string;
  count: number;
  windowStart: number;
  limit: number;
  windowMs: number;
}

export interface RetryJob<T = unknown> {
  id?: string;
  originalTaskId?: string;
  jobType: string;
  data: T;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'dead_letter';
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  lastErrorAt?: Date;
  nextRetryAt?: Date;
  deadLetterAt?: Date;
  deadLetterReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BackgroundJob<T = unknown> {
  id?: string;
  name: string;
  type: 'sync' | 'publish' | 'update' | 'delete' | 'ai_generate' | 'import' | 'export' | 'cleanup' | 'custom';
  data: T;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  progress: number;
  result?: Record<string, unknown>;
  error?: string;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  concurrencyGroup?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_RETRY_CONFIG = { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 30000 };
export const DEFAULT_RATE_LIMIT_CONFIG = { maxRequests: 60, windowMs: 60000 };
export const ROLES: UserRole[] = ['admin', 'manager', 'operator', 'viewer'];

export const ROLE_PERMISSIONS: RolePermission[] = [
  { role: 'admin', resource: 'products', actions: ['create', 'read', 'update', 'delete', 'archive', 'publish', 'sync', 'manage', 'admin'] },
  { role: 'admin', resource: 'listings', actions: ['create', 'read', 'update', 'delete', 'archive', 'publish', 'sync', 'manage', 'admin'] },
  { role: 'admin', resource: 'platforms', actions: ['create', 'read', 'update', 'delete', 'archive', 'manage', 'admin'] },
  { role: 'admin', resource: 'sync', actions: ['create', 'read', 'update', 'delete', 'manage', 'admin'] },
  { role: 'admin', resource: 'automation', actions: ['create', 'read', 'update', 'delete', 'manage', 'admin'] },
  { role: 'admin', resource: 'analytics', actions: ['read', 'admin'] },
  { role: 'admin', resource: 'settings', actions: ['create', 'read', 'update', 'delete', 'admin'] },
  { role: 'admin', resource: 'inventory', actions: ['create', 'read', 'update', 'delete', 'sync', 'admin'] },
  { role: 'admin', resource: 'ai', actions: ['create', 'read', 'update', 'delete', 'manage', 'admin'] },
  { role: 'admin', resource: 'logs', actions: ['read', 'admin'] },
  { role: 'admin', resource: 'audit', actions: ['read', 'admin'] },
  { role: 'admin', resource: 'notifications', actions: ['create', 'read', 'update', 'delete', 'admin'] },
  { role: 'admin', resource: 'health', actions: ['read', 'admin'] },
  { role: 'admin', resource: 'users', actions: ['create', 'read', 'update', 'delete', 'manage', 'admin'] },
  { role: 'manager', resource: 'products', actions: ['create', 'read', 'update', 'archive', 'publish', 'sync'] },
  { role: 'manager', resource: 'listings', actions: ['create', 'read', 'update', 'archive', 'publish', 'sync'] },
  { role: 'manager', resource: 'platforms', actions: ['read', 'update'] },
  { role: 'manager', resource: 'sync', actions: ['create', 'read', 'update'] },
  { role: 'manager', resource: 'automation', actions: ['create', 'read', 'update'] },
  { role: 'manager', resource: 'analytics', actions: ['read'] },
  { role: 'manager', resource: 'settings', actions: ['read', 'update'] },
  { role: 'manager', resource: 'inventory', actions: ['create', 'read', 'update'] },
  { role: 'manager', resource: 'ai', actions: ['create', 'read', 'update'] },
  { role: 'manager', resource: 'notifications', actions: ['read', 'update'] },
  { role: 'manager', resource: 'health', actions: ['read'] },
  { role: 'operator', resource: 'products', actions: ['create', 'read', 'update'] },
  { role: 'operator', resource: 'listings', actions: ['create', 'read', 'update'] },
  { role: 'operator', resource: 'sync', actions: ['read', 'create'] },
  { role: 'operator', resource: 'automation', actions: ['read', 'create'] },
  { role: 'operator', resource: 'inventory', actions: ['read', 'update'] },
  { role: 'operator', resource: 'notifications', actions: ['read'] },
  { role: 'viewer', resource: 'products', actions: ['read'] },
  { role: 'viewer', resource: 'listings', actions: ['read'] },
  { role: 'viewer', resource: 'analytics', actions: ['read'] },
  { role: 'viewer', resource: 'inventory', actions: ['read'] },
  { role: 'viewer', resource: 'health', actions: ['read'] },
];
