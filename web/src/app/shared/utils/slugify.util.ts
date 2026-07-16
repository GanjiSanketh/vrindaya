/** Lowercases, replaces runs of non-alphanumeric characters with a hyphen, and trims leading/trailing hyphens — e.g. "Long Kurta (Set)" → "long-kurta-set". */
export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
}
