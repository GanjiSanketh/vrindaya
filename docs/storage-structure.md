# Firebase Storage Structure

Bucket: the default bucket for project `vrindaya-ad7b0`
(`vrindaya-ad7b0.firebasestorage.app`, `Firebase:StorageBucket` in
`api/appsettings.json`). All product and homepage-CMS images are uploaded
through `api/` — Angular never uploads to Storage directly. Campaign media
(`campaign-images/`, `campaign-videos/`, `campaign-documents/`) is a
separate, pre-existing area written directly from `web/`'s marketing
module — see [Firestore Schema](database/firestore-schema.md#firebase-storage-campaign-media)
for that one; this document covers the two paths the API itself owns.

## `products/{productId}/{guid}.webp`

Written by `ProductStorageService` (`api/Services/Products/`). One object
per uploaded image — the filename is a random GUID, not the slot name or
position, because final gallery order is a Firestore-document concern
(`ProductDocument.Images[].order`), decided by the admin's drag-reorder,
not encoded in the Storage path. A product can have up to 10 images.

- **Upload**: `POST /api/v1/products/upload-images` (multipart:
  `productId`, `file`) — compresses/converts to WebP server-side
  (`IImageCompressionService`: longest edge capped at 1600px, quality 82,
  max 5MB input, `jpg`/`jpeg`/`png`/`webp` only), returns `{url, path}`.
- **Delete**: `DELETE /api/v1/products/upload-images?productId=&path=` —
  validates the path actually starts with `products/{productId}/` before
  deleting (defense against a caller passing an arbitrary path);
  idempotent (already-deleted is treated as success).
- **Public URL format**: `https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{url-encoded-path}?alt=media`
  — the same format the Firebase client SDK returns, so `storage.rules`'
  `allow read: if true` on `products/**` stays correct even though writes
  now come from a service-account-authenticated server call (which bypasses
  Storage Rules entirely — Rules gate client-SDK/end-user requests, not
  Admin/service-account credentials).

## `homepage/{section}/{guid}.webp`

Written by `HomepageStorageService` (`api/Services/Homepage/`) — mirrors
`ProductStorageService` exactly (same compression pipeline, same
idempotent-delete semantics), just a different path prefix and no
product-id concept. `{section}` is one of:

| Section | Used by |
| --- | --- |
| `hero` | Hero banner background/mobile images |
| `promotional` | Promotional banner desktop/mobile images |
| `categories` | Category images |
| `footer` | Footer banner image |
| `instagram` | Admin-curated Instagram section images |

- **Upload**: `POST /api/v1/homepage-assets/images` (multipart: `section`,
  `file`) — one shared endpoint for all five sections above, avoiding
  duplicated multipart-handling code across each section's own controller.
  Same validation as products (5MB max, `jpg`/`jpeg`/`png`/`webp` only).
- **Delete**: `DELETE /api/v1/homepage-assets/images?path=` — validates the
  path starts with `homepage/` before deleting.
- **Public URL format**: identical to the `products/` path above.

## Known infrastructure gap

Firebase Cloud Storage has never actually been provisioned for the
`vrindaya-ad7b0` project — confirmed via `StorageClient.ListBucketsAsync`
returning zero buckets. Both paths above are correctly implemented but
**cannot succeed until Storage is enabled** (a one-time "Get Started"
click in the Firebase Console). This has been a known, flagged gap since
the Product Management API was first built and still applies to every
upload path documented here.
