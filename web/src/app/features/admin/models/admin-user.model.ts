export type AdminRole = 'SuperAdmin' | 'Admin';

export const ROLE_LABELS: Record<AdminRole, string> = {
  SuperAdmin: 'Super Admin',
  Admin:      'Admin',
};

export const ROLE_OPTIONS: { value: AdminRole; label: string }[] = [
  { value: 'SuperAdmin', label: 'Super Admin' },
  { value: 'Admin',      label: 'Admin'       },
];

/** Mirrors the backend's AdminUserResponse (GET/POST/PUT `/admin-users`). */
export interface AdminUser {
  id:            string;
  googleUserId:  string | null;
  name:          string;
  email:         string;
  role:          AdminRole;
  isActive:      boolean;
  createdAt:     string;
  createdBy:     string;
  updatedAt:     string;
  updatedBy:     string;
}

/** Mirrors the backend's CreateAdminUserRequest — no password field, Google login only. */
export interface CreateAdminUserRequest {
  name:  string;
  email: string;
  role:  AdminRole;
}

/** Mirrors the backend's UpdateAdminUserRequest — Email is not editable (it's the lookup key). */
export interface UpdateAdminUserRequest {
  name:     string;
  role:     AdminRole;
  isActive: boolean;
}
