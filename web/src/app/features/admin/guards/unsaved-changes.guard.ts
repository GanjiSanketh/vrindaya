import { CanDeactivateFn } from '@angular/router';

interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/** Warns before navigating away from a form with unsaved edits — e.g. the admin product form. */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = component => {
  if (!component.hasUnsavedChanges()) return true;
  return window.confirm('You have unsaved changes. Leave without saving?');
};
