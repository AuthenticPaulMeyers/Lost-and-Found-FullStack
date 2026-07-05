# Workflows Reference

## Post Item Form Fix

- Categories are preloaded from `/api/categories/` before rendering the post-item form.
- The form now sanitizes and validates user input before building the API payload.
- Required fields show a red `*`, and the verification question becomes required for `found` items.
- Submit is locked during request processing to prevent double posting.
- Image uploads are limited to `.png`, `.jpg`, and `.jpeg`, and the allowed extensions are shown in the UI.
- The form payload now covers the item model fields used by the backend item create endpoint.

## Implementation File

- [frontend/src/views/items.js](frontend/src/views/items.js)

## Validation

- Frontend build verified with `npm run build` from the `frontend` directory.