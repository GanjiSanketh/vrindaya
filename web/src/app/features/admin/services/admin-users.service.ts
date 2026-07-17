import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AdminUser, CreateAdminUserRequest, UpdateAdminUserRequest } from '../models/admin-user.model';

const URL = `${environment.apiBaseUrl}/admin-users`;

/** Reads the backend's ApiErrorResponse.message (see GlobalExceptionMiddleware) — e.g. the specific lockout/self-demote/conflict text — falling back to a generic message only when the body doesn't have one. */
function apiErrorMessage(err: unknown, fallback: string): Error {
  if (err instanceof HttpErrorResponse && typeof err.error?.message === 'string') {
    return new Error(err.error.message);
  }
  return new Error(fallback);
}

/**
 * SuperAdmin-only CRUD over the backend's AdminUsersController — no direct
 * Firestore access from the browser (unlike most other admin CRUD in this
 * app), since the last-SuperAdmin lockout rules only exist in
 * AdminUserService server-side and must not be bypassable from the client.
 */
@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly http = inject(HttpClient);

  getAll(): Promise<AdminUser[]> {
    return firstValueFrom(
      this.http.get<AdminUser[]>(URL).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load admin users. Please try again.'))),
      ),
    );
  }

  create(request: CreateAdminUserRequest): Promise<AdminUser> {
    return firstValueFrom(
      this.http.post<AdminUser>(URL, request).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Failed to add admin user.'))),
      ),
    );
  }

  update(email: string, request: UpdateAdminUserRequest): Promise<AdminUser> {
    return firstValueFrom(
      this.http.put<AdminUser>(`${URL}/${encodeURIComponent(email)}`, request).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Failed to update admin user.'))),
      ),
    );
  }

  activate(email: string): Promise<AdminUser> {
    return firstValueFrom(
      this.http.patch<AdminUser>(`${URL}/${encodeURIComponent(email)}/activate`, {}).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Failed to activate admin user.'))),
      ),
    );
  }

  deactivate(email: string): Promise<AdminUser> {
    return firstValueFrom(
      this.http.patch<AdminUser>(`${URL}/${encodeURIComponent(email)}/deactivate`, {}).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Failed to deactivate admin user.'))),
      ),
    );
  }
}
