export type AdminRole = 'super_admin' | 'admin' | 'editor';

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin:       'Admin',
  editor:      'Editor',
};

export const ROLE_OPTIONS: { value: AdminRole; label: string }[] = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin',       label: 'Admin'       },
  { value: 'editor',      label: 'Editor'      },
];

/** Stored in Firestore collection `admin-users/{lowerCaseEmail}`. */
export interface AdminUser {
  /** Firestore document ID — equals the user's lowercase email address. */
  docId:       string;
  /** Firebase Auth UID — empty string until the user first signs in. */
  uid:         string;
  email:       string;
  displayName: string;
  role:        AdminRole;
  active:      boolean;
  createdAt:   { seconds: number; nanoseconds: number } | null;
  createdBy:   string;
}
