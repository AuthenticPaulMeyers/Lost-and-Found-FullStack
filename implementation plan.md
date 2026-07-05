# Fix Items Implementation Plan (fix2, fix3, fix5, fix6)

This plan details the implementation steps required to fulfill the requests in `fix2.md`, `fix3.md`, `fix5.md`, and `fix6.md`.

## Open Questions

None at this time. The requirements are clear and align well with the existing frontend architecture.

## Proposed Changes

### 1. Item Postings (`fix2.md` & `fix6.md`)

#### [MODIFY] [items.js](file:///c:/Users/meyers/Desktop/projects/uFoundIt-API/frontend/src/views/items.js)
- **Edit Mode (`renderEdit`, `afterRenderEdit`)**: Add dedicated rendering logic for `#/items/:id/edit` to allow users to update their existing postings.
- **Post Item (`renderNew`, `afterRenderNew`)**: 
  - Add red asterisks (`*`) to all required field labels.
  - Add the `campus_area` input element to match the backend Item model attributes.
  - Set `accept="image/png, image/jpeg, image/jpg"` on the file input to indicate allowed extensions.
  - Implement frontend data validation (trimming strings, checking required fields) before submitting.
  - Change the submit button text to "Post Item" and implement a visual loading state to prevent double submissions.

#### [MODIFY] [dashboard.js](file:///c:/Users/meyers/Desktop/projects/uFoundIt-API/frontend/src/views/dashboard.js)
- **My Postings**: Add `Edit` and `Delete` action buttons next to each item in the "My Postings" tab. Ensure the delete action prompts for confirmation before execution.

### 2. Item Browsing & Claims (`fix3.md` & `fix5.md`)

#### [MODIFY] [items.js](file:///c:/Users/meyers/Desktop/projects/uFoundIt-API/frontend/src/views/items.js)
- **Pagination**: Implement frontend pagination controls (Prev/Next) on the browse items list using the `next` and `previous` cursor links provided by the paginated backend API.
- **Item Details**:
  - Expose the poster's phone number alongside their name.
  - Add a "Call Poster" button configured with `href="tel:{phone_number}"` to trigger the user's caller app.
  - Add a "Message Poster" button linking to `#/chat` for coordinating hand-offs.
  - Refactor the claim submission UI: Query the user's existing claims. If a claim is submitted, show its status ("pending" or "approved") and disable further submissions. Add a loading state to the claim button.

### 3. Global UI, Footer, and Error Handling (`fix6.md`)

#### [MODIFY] [index.html](file:///c:/Users/meyers/Desktop/projects/uFoundIt-API/frontend/index.html)
- Extract the global `<footer>` element so it no longer appears on every app view.

#### [MODIFY] [home.js](file:///c:/Users/meyers/Desktop/projects/uFoundIt-API/frontend/src/views/home.js)
- Inject the extracted `<footer>` directly into the bottom of the landing page view, ensuring it only displays on the home route.

#### [MODIFY] [router.js](file:///c:/Users/meyers/Desktop/projects/uFoundIt-API/frontend/src/router.js)
- Add route mapping for `#/items/:id/edit`.
- Add a generic fallback route mapping for `#/error` to render the friendly error pages.

#### [NEW] [error.js](file:///c:/Users/meyers/Desktop/projects/uFoundIt-API/frontend/src/views/error.js)
- Create a reusable view module to display user-friendly error messages based on HTTP status codes (e.g., 404 Not Found, 500 Server Error, 403 Forbidden).

#### [MODIFY] [api.js](file:///c:/Users/meyers/Desktop/projects/uFoundIt-API/frontend/src/api.js)
- Update the fetch request wrapper to catch runtime errors (e.g., 4xx and 5xx responses).
- Redirect `401 Unauthorized` responses explicitly to the `#/login` page.
- Redirect other errors (403, 404, 405, 429, 500) to the new `#/error?code={status}` view.

## Verification Plan

### Automated Tests
- Execute existing pytest test suite to ensure the backend logic (API queries, auth logic) remains unbroken.

### Manual Verification
- Manually run the frontend build server and navigate through the UI.
- Test the item creation validation, file input restrictions, and button loading states.
- Click the "Edit" and "Delete" buttons from the dashboard to verify proper interaction.
- Force an API error (e.g. visiting an unknown page) to test the error page redirection.
- Validate that the footer only appears on the landing page.
