import { state } from './state.js';

// Route configurations
const routes = {
  '/': { view: 'home', isPrivate: false },
  '/login': { view: 'login', isGuest: true },
  '/register': { view: 'register', isGuest: true },
  '/dashboard': { view: 'dashboard', isPrivate: true },
  '/profile/:id': { view: 'dashboard', isPrivate: true }, // We render profile/dashboard unified or sub-tabs
  '/items': { view: 'items', isPrivate: true },
  '/items/new': { view: 'items', isPrivate: true },
  '/items/:id/edit': { view: 'items', isPrivate: true },
  '/items/:id': { view: 'items', isPrivate: true },
  '/error': { view: 'error', isPrivate: false },
  '/chat': { view: 'chat', isPrivate: true },
};

// Map of imported view modules
const views = {};

// Register a view module
export function registerView(name, module) {
  views[name] = module;
}

// Extract path parameter (e.g. /items/:id -> gets id)
function getParsedHash() {
  const hash = window.location.hash.slice(1) || '/';
  
  // Split query parameters if any (e.g. #/items?type=lost)
  const [path, queryString] = hash.split('?');
  
  // Parse query string
  const query = {};
  if (queryString) {
    queryString.split('&').forEach(param => {
      const [key, val] = param.split('=');
      query[key] = decodeURIComponent(val || '');
    });
  }

  // Parse path and extract dynamic parameters (e.g. :id)
  let matchingRoute = null;
  let params = {};

  const pathParts = path.split('/').filter(Boolean);
  
  for (const routePattern of Object.keys(routes)) {
    const routeParts = routePattern.split('/').filter(Boolean);
    
    if (routeParts.length === pathParts.length) {
      let match = true;
      let tempParams = {};
      
      for (let i = 0; i < routeParts.length; i++) {
        if (routeParts[i].startsWith(':')) {
          const paramName = routeParts[i].slice(1);
          tempParams[paramName] = pathParts[i];
        } else if (routeParts[i] !== pathParts[i]) {
          match = false;
          break;
        }
      }
      
      if (match) {
        matchingRoute = routePattern;
        params = tempParams;
        break;
      }
    }
  }

  // Fallback to exact match if no parameter match was found
  if (!matchingRoute && routes[path]) {
    matchingRoute = path;
  }

  return {
    path,
    route: matchingRoute,
    params,
    query,
  };
}

// Update navigation header link activation and auth action buttons
export function updateNavigation() {
  const navActions = document.getElementById('nav-actions');
  const navLinks = document.getElementById('nav-links');
  if (!navActions) return;

  const currentHash = window.location.hash || '#/';

  if (state.isAuthenticated) {
    // Nav links for logged in users
    if (navLinks) {
      if (currentHash === '#/dashboard' || currentHash.startsWith('#/profile/')) {
        navLinks.innerHTML = '';
      } else {
        navLinks.innerHTML = `
          <a class="text-[#111418] dark:text-slate-300 text-sm font-medium hover:text-primary transition-colors ${currentHash.startsWith('#/items') && !currentHash.includes('new') ? 'text-primary font-bold' : ''}" href="#/items">Browse Items</a>
          <a class="text-[#111418] dark:text-slate-300 text-sm font-medium hover:text-primary transition-colors ${currentHash.includes('new') ? 'text-primary font-bold' : ''}" href="#/items/new">Post Item</a>
          <a class="text-[#111418] dark:text-slate-300 text-sm font-medium hover:text-primary transition-colors ${currentHash === '#/chat' ? 'text-primary font-bold' : ''}" href="#/chat">Messages</a>
          <a class="text-[#111418] dark:text-slate-300 text-sm font-medium hover:text-primary transition-colors ${currentHash === '#/dashboard' ? 'text-primary font-bold' : ''}" href="#/dashboard">Dashboard</a>
        `;
      }
    }

    // Avatar and logout button for authenticated
    const avatarUrl = state.user?.profile_picture_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDXuyMvuk0imR0E1bUgkh_20NE5HGS1Cw-uNCCYGRS0JucK9YimIGsiJXX-faZQiB3qgaReF7vuhQpvyoBPOostf6qEhrH9pS9rYQiYyinEVzjwBwyv5BNp7k5Mq5NqVG9fRU_xXfKrxuEx_LbHxovWk-2dEvcEXiDiuR_DP7yk7aN0bqaGsgCwQzbqtoLn4-99Ggpsg_vAs7fbjeAnBXn2dfGGuyookJ5yIpOMOr_tofvCPanw5OY8-d6uiJdXMOMtGGGWSSBg7QG9';
    navActions.innerHTML = `
      <div class="flex items-center gap-3">
        <a href="#/dashboard" class="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 overflow-hidden cursor-pointer flex items-center justify-center">
          <img src="${avatarUrl}" alt="Profile" class="w-full h-full object-cover" />
        </a>
        <button id="btn-logout" class="min-w-[84px] cursor-pointer items-center justify-center rounded-lg h-9 px-4 bg-primary/10 text-primary text-sm font-bold hover:bg-primary/20 transition-all flex gap-1">
          <span class="material-symbols-outlined text-sm">logout</span> Logout
        </button>
      </div>
    `;

    document.getElementById('btn-logout')?.addEventListener('click', async () => {
      const { clearAuthState } = await import('./state.js');
      // Attempt backend logout
      try {
        const { api } = await import('./api.js');
        await api.post('/api/auth/logout/', { refresh: state.refreshToken });
      } catch (err) {
        console.error('Logout request failed:', err);
      }
      clearAuthState();
      window.location.hash = '#/login';
    });

  } else {
    // Nav links for visitors
    if (navLinks) {
      navLinks.innerHTML = `
        <a class="text-[#111418] dark:text-slate-300 text-sm font-medium hover:text-primary transition-colors" href="#/">How it Works</a>
      `;
    }

    // Guest actions
    navActions.innerHTML = `
      <a href="#/login" class="min-w-[84px] cursor-pointer flex items-center justify-center rounded-lg h-9 px-4 bg-primary/10 text-primary text-sm font-bold hover:bg-primary/20 transition-all">
        Login
      </a>
      <a href="#/register" class="flex min-w-[84px] cursor-pointer flex items-center justify-center rounded-lg h-9 px-4 bg-primary text-white text-sm font-bold shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all">
        Sign Up
      </a>
    `;
  }
}

// Route navigation worker
async function navigate() {
  const parsed = getParsedHash();
  const route = routes[parsed.route];

  // Fallback if route does not exist
  if (!route) {
    window.location.hash = '#/';
    return;
  }

  // Guards: private route redirects unauthenticated to login
  if (route.isPrivate && !state.isAuthenticated) {
    window.location.hash = '#/login';
    return;
  }

  // Guards: guest route redirects authenticated to dashboard
  if (route.isGuest && state.isAuthenticated) {
    window.location.hash = '#/dashboard';
    return;
  }

  // Import view bundle lazily if not registered
  if (!views[route.view]) {
    try {
      const viewModule = await import(`./views/${route.view}.js`);
      registerView(route.view, viewModule.default);
    } catch (error) {
      console.error(`Error loading view ${route.view}:`, error);
      const message = (error && (error.message || String(error))) || 'Unknown error';
      document.getElementById('app').innerHTML = `
        <div class="max-w-md mx-auto my-20 text-center p-8 bg-white rounded-2xl border border-red-100 shadow-xl">
          <span class="material-symbols-outlined text-6xl text-red-500 mb-4">error</span>
          <h2 class="text-xl font-bold mb-2">Error Loading Page</h2>
          <p class="text-slate-500 mb-4">We encountered an issue loading this section.</p>
          <pre class="text-xs text-left p-3 bg-slate-50 rounded mt-2 overflow-auto text-red-600">${message}</pre>
          <div class="flex justify-center gap-3 mt-4">
            <a href="#/" class="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white font-bold rounded-lg">Go Home</a>
            <a href="#/" onclick="window.location.reload();return false;" class="inline-flex items-center gap-2 px-6 py-2 bg-white border rounded-lg">Reload</a>
          </div>
        </div>
      `;
      return;
    }
  }

  const activeView = views[route.view];
  const appContainer = document.getElementById('app');

  // Render view templates
  appContainer.innerHTML = await activeView.render(parsed.params, parsed.query);
  
  // Attach view dynamic handlers
  if (activeView.afterRender) {
    await activeView.afterRender(parsed.params, parsed.query);
  }

  // Footer visibility: only show on landing page '/'
  try {
    const footerEl = document.querySelector('footer');
    if (footerEl) {
      if (parsed.path === '/') footerEl.style.display = '';
      else footerEl.style.display = 'none';
    }
  } catch (e) { /* ignore */ }

  // Update layout header
  updateNavigation();
}

export function initRouter() {
  window.addEventListener('hashchange', navigate);
  window.addEventListener('load', navigate);
  window.addEventListener('auth-change', updateNavigation);
}
