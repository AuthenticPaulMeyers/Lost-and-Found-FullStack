import { state, setAuthState, clearAuthState } from './state.js';

let isRefreshing = false;
let refreshSubscribers = [];

function onTokenRefreshed(newAccessToken) {
  refreshSubscribers.forEach(callback => callback(newAccessToken));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback) {
  refreshSubscribers.push(callback);
}

// Custom request wrapper that automatically injects auth headers and manages token refresh
async function request(url, options = {}) {
  // Ensure headers object exists
  options.headers = options.headers || {};

  // Inject access token if authenticated
  if (state.accessToken) {
    options.headers['Authorization'] = `Bearer ${state.accessToken}`;
  }

  // Set Content-Type: application/json if sending a JSON body (and not FormData)
  if (options.body && !(options.body instanceof FormData)) {
    options.headers['Content-Type'] = 'application/json';
  }

  let response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    console.error('Fetch network error:', error);
    throw error;
  }

  // Global responses mapping: redirect to friendly error pages for common statuses
  const status = response.status;
  if (status === 403) {
    // If user not authenticated, send to login; otherwise show error page
    if (!state.isAuthenticated) {
      clearAuthState();
      window.location.hash = '#/login';
      throw new Error('Forbidden - authentication required');
    } else {
      window.location.hash = '#/error?code=403';
      return response;
    }
  }

  if ([404, 429, 405, 500].includes(status)) {
    window.location.hash = `#/error?code=${status}`;
    return response;
  }

  // Handle 401 Unauthorized
  if (response.status === 401) {
    // If the 401 was for the refresh endpoint itself, immediately log out
    if (url.includes('/api/auth/refresh/')) {
      clearAuthState();
      window.location.hash = '#/login';
      throw new Error('Refresh token expired or invalid');
    }

    if (state.refreshToken) {
      if (!isRefreshing) {
        isRefreshing = true;

        // Perform token refresh
        try {
          const refreshResponse = await fetch('/api/auth/refresh/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh: state.refreshToken }),
          });

          if (refreshResponse.ok) {
            const data = await refreshResponse.json();
            const newAccess = data.access;
            // simplejwt refresh view can return new refresh token too if ROTATE_REFRESH_TOKENS is enabled
            const newRefresh = data.refresh || state.refreshToken;

            setAuthState({
              accessToken: newAccess,
              refreshToken: newRefresh,
            });

            isRefreshing = false;
            onTokenRefreshed(newAccess);
          } else {
            isRefreshing = false;
            clearAuthState();
            window.location.hash = '#/login';
            throw new Error('Session expired');
          }
        } catch (error) {
          isRefreshing = false;
          clearAuthState();
          window.location.hash = '#/login';
          throw error;
        }
      }

      // Return a promise that resolves once the refresh is done, then retry the request
      return new Promise((resolve, reject) => {
        addRefreshSubscriber(newAccessToken => {
          // Update authorization header for retry
          options.headers['Authorization'] = `Bearer ${newAccessToken}`;
          resolve(request(url, options));
        });
      });
    } else {
      // No refresh token, clear auth state and redirect
      clearAuthState();
      window.location.hash = '#/login';
    }
  }

  return response;
}

export const api = {
  get: (url, options = {}) => request(url, { ...options, method: 'GET' }),
  post: (url, body, options = {}) => request(url, { ...options, method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
  put: (url, body, options = {}) => request(url, { ...options, method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body) }),
  patch: (url, body, options = {}) => request(url, { ...options, method: 'PATCH', body: body instanceof FormData ? body : JSON.stringify(body) }),
  delete: (url, options = {}) => request(url, { ...options, method: 'DELETE' }),
};
