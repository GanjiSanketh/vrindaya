export interface AuditLog {
  id:                string;
  action:            string;
  module:            string;
  entityId:          string | null;
  entityName:        string | null;
  description:       string;
  performedByUserId: string | null;
  performedByName:   string | null;
  performedByEmail:  string | null;
  performedAt:       string;
  beforeData:        string | null;
  afterData:         string | null;
  ipAddress:         string | null;
  browser:           string | null;
  operatingSystem:   string | null;
  status:            string;
  correlationId:     string | null;
}

export interface AuditLogQuery {
  page?:             number;
  pageSize?:         number;
  action?:           string;
  module?:           string;
  search?:           string;
  performedByEmail?: string;
  status?:           string;
  dateFrom?:         string;
  dateTo?:           string;
}

export const AUDIT_LOG_MODULES = [
  'Auth',
  'AdminUsers',
  'Suppliers',
  'Categories',
  'Collections',
  'Products',
  'InventoryVariants',
  'Purchases',
  'HeroBanners',
  'PromotionalBanners',
  'HomepageConfig',
  'BrandConfig',
] as const;

export const AUDIT_LOG_ACTIONS = [
  'Create',
  'Update',
  'Delete',
  'Login',
  'Logout',
  'PermissionChange',
  'Reorder',
  'StockMovement',
  'BulkUpdate',
  'BulkRestore',
  'BulkDelete',
  'BulkLaunch',
] as const;

export const ACTION_LABELS: Record<string, string> = {
  Create: 'Created',
  Update: 'Updated',
  Delete: 'Deleted',
  Login: 'Login',
  Logout: 'Logout',
  PermissionChange: 'Role Changed',
  Reorder: 'Reordered',
  StockMovement: 'Stock Movement',
  BulkUpdate: 'Bulk Update',
  BulkRestore: 'Bulk Restore',
  BulkDelete: 'Bulk Delete',
  BulkLaunch: 'Bulk Launch',
};
