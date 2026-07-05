import { api } from '../api.js';
import { state } from '../state.js';

const ALLOWED_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg'];

function unwrapListResponse(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.results)) {
    return payload.results;
  }

  return [];
}

function sanitizeText(value) {
  return (value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeTextarea(value) {
  return (value || '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
    .replace(/<[^>]*>/g, '')
    .trim();
}

function isAllowedImageFile(file) {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  return ALLOWED_IMAGE_EXTENSIONS.includes(fileExtension) && ['image/jpeg', 'image/png'].includes(file.type);
}

async function loadCategories() {
  try {
    const response = await api.get('/api/categories/');
    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    return unwrapListResponse(payload);
  } catch (error) {
    console.error('Failed to load categories:', error);
    return [];
  }
}

export default {
  async render(params, query) {
    const isNew = window.location.hash.includes('/new');
    const isEdit = window.location.hash.includes('/edit');
    const isDetails = !!params.id && !isEdit;

    if (isDetails) {
      return this.renderDetails(params.id);
    } else if (isNew) {
      return this.renderNew(query.type || 'lost');
    } else if (isEdit) {
      return this.renderEdit(params.id);
    } else {
      return this.renderList(query);
    }
  },

  async afterRender(params, query) {
    const isNew = window.location.hash.includes('/new');
    const isEdit = window.location.hash.includes('/edit');
    const isDetails = !!params.id && !isEdit;

    if (isDetails) {
      await this.afterRenderDetails(params.id);
    } else if (isNew) {
      await this.afterRenderNew(query.type || 'lost');
    } else if (isEdit) {
      await this.afterRenderEdit(params.id);
    } else {
      await this.afterRenderList(query);
    }
  },

  // ==========================================
  // RENDER SEARCH / LIST
  // ==========================================
  renderList(query) {
    return `
      <div class="max-w-7xl mx-auto px-4 md:px-8 py-8 animate-fade-in">
        <!-- Search and header row -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h2 class="text-3xl font-extrabold text-slate-900 dark:text-white">Campus Directory</h2>
            <p class="text-slate-500 text-sm">Browse, filter, and match reported lost & found items</p>
          </div>
          <a href="#/items/new" class="px-6 py-3 bg-primary text-white font-bold rounded-xl text-sm flex items-center gap-2 hover:bg-primary/95 transition-all">
            <span class="material-symbols-outlined text-sm">add_circle</span> Report Item
          </a>
        </div>

        <!-- Filter bar -->
        <div class="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm mb-8 flex flex-col md:flex-row items-center gap-4">
          <div class="flex-1 w-full relative">
            <span class="material-symbols-outlined absolute left-3 top-3 text-slate-400">search</span>
            <input type="text" id="search-input" class="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm" placeholder="Search title, description, or location..." />
          </div>

          <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select id="filter-type" class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">All Types</option>
              <option value="lost">Lost Items</option>
              <option value="found">Found Items</option>
            </select>

            <select id="filter-category" class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">All Categories</option>
              <!-- Populated dynamically -->
            </select>

            <select id="filter-status" class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="claimed">Claimed</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>

        <!-- Items grid container -->
        <div id="items-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <div class="col-span-full flex flex-col items-center justify-center p-20">
            <span class="material-symbols-outlined animate-spin text-5xl text-primary">sync</span>
            <p class="text-slate-500 text-sm mt-4 font-semibold">Loading items database...</p>
          </div>
        </div>
      </div>
    `;
  },

  async afterRenderList(query) {
    const searchInput = document.getElementById('search-input');
    const typeSelect = document.getElementById('filter-type');
    const catSelect = document.getElementById('filter-category');
    const statusSelect = document.getElementById('filter-status');
    const grid = document.getElementById('items-grid');

    // Preset filters if query parameters are passed (e.g. ?type=lost)
    if (query.type) typeSelect.value = query.type;
    if (query.status) statusSelect.value = query.status;

    // Fetch categories and items dynamically
    const fetchFiltersAndItems = async () => {
      try {
        const catRes = await api.get('/api/categories/');
        if (catRes.ok) {
          const cats = unwrapListResponse(await catRes.json());
          // populate categories select options
          catSelect.innerHTML = `<option value="">All Categories</option>` +
            cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      }

      await refreshItems();
    };

    const refreshItems = async () => {
      grid.innerHTML = `
        <div class="col-span-full flex flex-col items-center justify-center p-20">
          <span class="material-symbols-outlined animate-spin text-5xl text-primary">sync</span>
          <p class="text-slate-500 text-sm mt-4 font-semibold">Filtering directory...</p>
        </div>
      `;

      const searchVal = searchInput.value.trim();
      const typeVal = typeSelect.value;
      const catVal = catSelect.value;
      const statusVal = statusSelect.value;

      // Build url search parameters
      const params = new URLSearchParams();
      if (searchVal) params.append('search', searchVal);
      if (typeVal) params.append('item_type', typeVal);
      if (catVal) params.append('category', catVal);
      if (statusVal) params.append('status', statusVal);

      try {
        const res = await api.get(`/api/items/?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          const items = data.results || [];
          // pass pagination metadata so UI can render controls
          renderItemsList(items, { next: data.next, previous: data.previous, count: data.count });
        } else {
          grid.innerHTML = `<div class="col-span-full text-center text-slate-500 py-8">Failed to fetch items</div>`;
        }
      } catch (err) {
        console.error(err);
        grid.innerHTML = `<div class="col-span-full text-center text-slate-500 py-8">Network error loading items</div>`;
      }
    };

    const renderItemsList = (items, paging = {}) => {
      if (items.length === 0) {
        grid.innerHTML = `
          <div class="col-span-full flex flex-col items-center justify-center p-16 text-center gap-3">
            <span class="material-symbols-outlined text-6xl text-slate-300">search_off</span>
            <h4 class="font-bold text-slate-700 dark:text-slate-200">No matching items found</h4>
            <p class="text-slate-500 text-sm">Try widening your filters or search keywords.</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = items.map(item => {
        const imageSrc = item.images && item.images.length > 0 ? item.images[0].image : null;
        return `
          <div class="item-card bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md cursor-pointer flex flex-col h-full" onclick="window.location.hash='#/items/${item.id}'">
            <div class="relative h-44 bg-slate-100 shrink-0 flex items-center justify-center overflow-hidden">
              ${imageSrc ? `<img src="${imageSrc}" alt="${item.title}" class="w-full h-full object-cover" />` : `<span class="material-symbols-outlined text-5xl text-slate-300">image</span>`}
              <span class="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${item.item_type === 'lost' ? 'bg-red-500 text-white' : 'bg-primary text-white'}">${item.item_type}</span>
              ${item.status !== 'active' ? `<span class="absolute inset-0 bg-black/40 flex items-center justify-center"><span class="bg-gray-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest">${item.status}</span></span>` : ''}
            </div>
            <div class="p-4 flex flex-col flex-1 gap-2">
              <h3 class="font-bold text-slate-800 dark:text-white truncate">${item.title}</h3>
              <span class="text-[10px] font-bold text-primary flex items-center gap-0.5"><span class="material-symbols-outlined text-xs">folder</span> ${item.category_name || 'Category'}</span>
              <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">${item.description}</p>
              <div class="mt-auto pt-2 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-400 font-medium">
                <span class="flex items-center gap-0.5"><span class="material-symbols-outlined text-xs">location_on</span> ${item.location_name}</span>
                <span>${new Date(item.date_found_lost).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        `;
      }).join('');

      // Pagination controls (simple next/prev)
      const pagingHtml = [];
      if (paging.previous) {
        pagingHtml.push(`<button id="btn-prev-page" class="px-4 py-2 bg-white border rounded-lg">Previous</button>`);
      }
      if (paging.next) {
        pagingHtml.push(`<button id="btn-next-page" class="px-4 py-2 bg-white border rounded-lg">Next</button>`);
      }

      // Insert pagination bar after grid (remove previous if present)
      document.getElementById('items-pagination')?.remove();
      const paginationBar = `<div id="items-pagination" class="col-span-full flex justify-center gap-4 mt-6">${pagingHtml.join('')}</div>`;
      grid.insertAdjacentHTML('afterend', paginationBar);

      // Attach handlers
      if (paging.previous) {
        document.getElementById('btn-prev-page')?.addEventListener('click', async () => {
          try {
            const res = await api.get(paging.previous);
            if (res.ok) {
              const d = await res.json();
              renderItemsList(d.results || [], { next: d.next, previous: d.previous, count: d.count });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          } catch (e) { console.error(e); }
        });
      }

      if (paging.next) {
        document.getElementById('btn-next-page')?.addEventListener('click', async () => {
          try {
            const res = await api.get(paging.next);
            if (res.ok) {
              const d = await res.json();
              renderItemsList(d.results || [], { next: d.next, previous: d.previous, count: d.count });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          } catch (e) { console.error(e); }
        });
      }
    };

    // Event listeners for live filtering
    let timeout = null;
    searchInput?.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(refreshItems, 400);
    });

    typeSelect?.addEventListener('change', refreshItems);
    catSelect?.addEventListener('change', refreshItems);
    statusSelect?.addEventListener('change', refreshItems);

    await fetchFiltersAndItems();
  },

  // ==========================================
  // RENDER POST ITEM (NEW)
  // ==========================================
  async renderNew(defaultType) {
    const categories = await loadCategories();
    const categoryOptions = categories.length
      ? categories.map(category => `<option value="${category.id}">${category.name}</option>`).join('')
      : '<option value="" disabled selected>No categories available</option>';

    return `
      <div class="max-w-2xl mx-auto my-12 p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl animate-fade-in">
        <h2 class="text-2xl font-bold mb-2 dark:text-white">Report lost or found item</h2>
        <p class="text-slate-500 text-sm mb-6">Complete the specifications below to notify other campus network users.</p>
        
        <div id="post-alert" class="hidden mb-6 p-4 rounded-xl text-sm flex items-center gap-2">
          <span class="material-symbols-outlined" id="post-alert-icon">info</span>
          <span id="post-alert-msg"></span>
        </div>

        <form id="form-post-item" class="flex flex-col gap-5">
          <div class="flex flex-col gap-1">
            <label for="item-title" class="text-xs font-semibold text-slate-700 dark:text-slate-300">Listing Title <span class="text-red-500">*</span></label>
            <input type="text" id="item-title" required class="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. iPhone 13 Pro with green cover" />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label for="item-type" class="text-xs font-semibold text-slate-700 dark:text-slate-300">Listing Type <span class="text-red-500">*</span></label>
              <select id="item-type" required class="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="lost" ${defaultType === 'lost' ? 'selected' : ''}>Lost Item</option>
                <option value="found" ${defaultType === 'found' ? 'selected' : ''}>Found Item</option>
              </select>
            </div>
            
            <div class="flex flex-col gap-1">
              <label for="item-cat" class="text-xs font-semibold text-slate-700 dark:text-slate-300">Category <span class="text-red-500">*</span></label>
              <select id="item-cat" required class="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="" disabled selected>Select a category</option>
                ${categoryOptions}
              </select>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label for="item-desc" class="text-xs font-semibold text-slate-700 dark:text-slate-300">Detailed Description <span class="text-red-500">*</span></label>
            <textarea id="item-desc" required class="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 h-28" placeholder="Provide color, brand, distinct marks, case details, or screen wallpaper description..."></textarea>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label for="item-location" class="text-xs font-semibold text-slate-700 dark:text-slate-300">Location Name <span class="text-red-500">*</span></label>
              <input type="text" id="item-location" required class="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. Main Library 2nd floor" />
            </div>

            <div class="flex flex-col gap-1">
              <label for="item-area" class="text-xs font-semibold text-slate-700 dark:text-slate-300">Campus Area</label>
              <input type="text" id="item-area" class="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. North Campus" />
            </div>

            <div class="flex flex-col gap-1">
              <label for="item-date" class="text-xs font-semibold text-slate-700 dark:text-slate-300">Date Lost / Found <span class="text-red-500">*</span></label>
              <input type="date" id="item-date" required class="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label for="item-question" class="text-xs font-semibold text-slate-700 dark:text-slate-300">Ownership Verification Question <span class="text-red-500" id="item-question-required-mark">*</span></label>
            <input type="text" id="item-question" class="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. What is written on the back? / What sticker is on the bottle?" />
            <p class="text-[11px] text-slate-500">Required for found items.</p>
          </div>

          <div class="flex flex-col gap-1">
            <label for="item-files" class="text-xs font-semibold text-slate-700 dark:text-slate-300">Item Pictures</label>
            <input type="file" id="item-files" multiple accept=".png,.jpg,.jpeg,image/png,image/jpeg" class="text-xs bg-slate-50 p-3 rounded-xl border border-slate-200" />
            <p class="text-[11px] text-slate-500">Allowed file types: .png, .jpg, .jpeg</p>
          </div>

          <div class="flex items-center gap-2 mt-2">
            <input type="checkbox" id="item-anon" class="rounded border-slate-200 text-primary focus:ring-primary" />
            <label for="item-anon" class="text-xs text-slate-600 dark:text-slate-300 font-medium">Post anonymously (your name won't be shown publicly)</label>
          </div>

          <input type="hidden" id="item-status" value="active" />

          <button type="submit" id="btn-post-submit" class="w-full cursor-pointer items-center justify-center rounded-xl h-12 bg-primary text-white text-sm font-bold shadow-md hover:bg-primary/95 transition-all flex gap-2 justify-center mt-4">
            <span>Post Item</span>
          </button>
        </form>
      </div>
    `;
  },

  async afterRenderNew() {
    const form = document.getElementById('form-post-item');
    const catSelect = document.getElementById('item-cat');
    const typeSelect = document.getElementById('item-type');
    const questionInput = document.getElementById('item-question');
    const questionRequiredMark = document.getElementById('item-question-required-mark');
    const submitBtn = document.getElementById('btn-post-submit');

    const alertEl = document.getElementById('post-alert');
    const alertMsg = document.getElementById('post-alert-msg');
    const alertIcon = document.getElementById('post-alert-icon');

    const showAlert = (message, isSuccess = true) => {
      alertEl.classList.remove('hidden', 'bg-green-50', 'text-green-700', 'border-green-500', 'bg-red-50', 'text-red-700', 'border-red-500');
      if (isSuccess) {
        alertEl.classList.add('bg-green-50', 'text-green-700', 'border-l-4', 'border-green-500');
        alertIcon.innerText = 'check_circle';
      } else {
        alertEl.classList.add('bg-red-50', 'text-red-700', 'border-l-4', 'border-red-500');
        alertIcon.innerText = 'error';
      }
      alertMsg.innerText = message;
    };

    const setQuestionRequirement = () => {
      const isFound = typeSelect.value === 'found';
      questionInput.required = isFound;
      questionRequiredMark.classList.toggle('hidden', !isFound);
    };

    setQuestionRequirement();
    typeSelect?.addEventListener('change', setQuestionRequirement);

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (submitBtn.disabled) {
        return;
      }

      if (!form.checkValidity()) {
        form.reportValidity();
        showAlert('Please complete all required fields marked with *.', false);
        return;
      }

      const titleVal = sanitizeText(document.getElementById('item-title').value);
      const descVal = sanitizeTextarea(document.getElementById('item-desc').value);
      const locVal = sanitizeText(document.getElementById('item-location').value);
      const areaVal = sanitizeText(document.getElementById('item-area').value);
      const dateVal = document.getElementById('item-date').value;
      const typeVal = typeSelect.value;
      const categoryVal = catSelect.value;
      const verificationQuestionVal = sanitizeTextarea(questionInput.value);
      const imageInput = document.getElementById('item-files');
      const selectedFiles = Array.from(imageInput.files || []);

      if (!titleVal || !descVal || !locVal || !dateVal || !typeVal || !categoryVal) {
        showAlert('Please fill out all required fields marked with *.', false);
        return;
      }

      if (typeVal === 'found' && !verificationQuestionVal) {
        showAlert('Found items require a verification question.', false);
        return;
      }

      const invalidFiles = selectedFiles.filter(file => !isAllowedImageFile(file));
      if (invalidFiles.length > 0) {
        showAlert('Only .png, .jpg, and .jpeg images are allowed.', false);
        return;
      }

      alertEl.classList.add('hidden');
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm">sync</span> Posting...`;

      // Use FormData for multipart/image uploads
      const formData = new FormData();
      formData.append('title', titleVal);
      formData.append('item_type', typeVal);
      formData.append('category', categoryVal);
      formData.append('description', descVal);
      formData.append('location_name', locVal);
      formData.append('campus_area', areaVal);
      formData.append('date_found_lost', dateVal);
      formData.append('verification_question', verificationQuestionVal);
      formData.append('is_anonymous', document.getElementById('item-anon').checked);
      formData.append('status', document.getElementById('item-status').value);

      // Append selected files
      if (selectedFiles.length > 0) {
        selectedFiles.forEach(file => {
          formData.append('uploaded_images', file);
        });
      }

      try {
        const res = await api.post('/api/items/', formData);

        if (res.ok) {
          showAlert('Item reported successfully! Redirecting...', true);
          setTimeout(() => {
            window.location.hash = '#/items';
          }, 1500);
        } else {
          const errs = await res.json();
          showAlert(JSON.stringify(errs), false);
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>Post Item</span>`;
        }
      } catch (err) {
        console.error(err);
        showAlert('Network exception occurred. Please try again.', false);
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Post Item</span>`;
      }
    });
  },

  // ==========================================
  // RENDER ITEM DETAILS
  // ==========================================
  renderDetails(itemId) {
    return `
      <div class="max-w-4xl mx-auto my-12 px-4 md:px-8 py-8 animate-fade-in">
        <div id="details-container">
          <!-- Dynamically populated details loader -->
          <div class="flex flex-col items-center justify-center p-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <span class="material-symbols-outlined animate-spin text-5xl text-primary">sync</span>
            <p class="text-slate-500 text-sm mt-4 font-semibold">Fetching item information...</p>
          </div>
        </div>
      </div>
    `;
  },

  async afterRenderDetails(itemId) {
    const container = document.getElementById('details-container');
    let item = null;

    try {
      const res = await api.get(`/api/items/${itemId}/`);
      if (res.ok) {
        item = await res.json();
        renderItem(item);
      } else {
        container.innerHTML = `
          <div class="text-center p-12 bg-white rounded-2xl border border-red-50">
            <span class="material-symbols-outlined text-6xl text-red-500 mb-2">info</span>
            <h3 class="font-bold text-lg">Item not found</h3>
            <a href="#/items" class="text-primary font-semibold underline mt-2 block">Back to browse</a>
          </div>
        `;
      }
    } catch (error) {
      console.error(error);
      container.innerHTML = `<div class="text-center py-12">Connection error fetching item details</div>`;
    }

    function renderItem(data) {
      const imageSrc = data.images && data.images.length > 0 ? data.images[0].image : null;
      const isOwner = state.user && data.owner && state.user.id === data.owner.id;

      container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <!-- Image Section -->
          <div class="w-full aspect-square bg-slate-50 dark:bg-slate-800 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-100 dark:border-slate-700 relative">
            ${imageSrc ? `<img src="${imageSrc}" class="w-full h-full object-cover"/>` : '<span class="material-symbols-outlined text-8xl text-slate-300">image</span>'}
            <span class="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${data.item_type === 'lost' ? 'bg-red-500 text-white' : 'bg-primary text-white'}">${data.item_type}</span>
          </div>

          <!-- Metadata Section -->
          <div class="flex flex-col gap-6">
            <div class="flex flex-col gap-2">
              <span class="px-3 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 w-fit uppercase tracking-widest">${data.category_name}</span>
              <h2 class="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">${data.title}</h2>
              <span class="text-xs text-slate-400 font-semibold uppercase tracking-wider">Status: <strong class="text-primary">${data.status}</strong></span>
            </div>

            <div class="flex flex-col gap-1.5 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100/50">
              <div class="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span class="material-symbols-outlined text-sm">location_on</span>
                <span>Location: ${data.location_name}</span>
              </div>
              <div class="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span class="material-symbols-outlined text-sm">calendar_month</span>
                <span>Date: ${new Date(data.date_found_lost).toLocaleDateString()}</span>
              </div>
              <div class="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span class="material-symbols-outlined text-sm">person</span>
                <span>Reporter: ${data.is_anonymous ? 'Anonymous user' : (data.owner?.full_name || 'Campus Student')}</span>
              </div>

              ${data.is_anonymous ? '' : `
                <div class="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span class="material-symbols-outlined text-sm">call</span>
                  <span>Phone: ${data.owner?.phone_number || 'Not provided'}</span>
                </div>

                <div class="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span class="material-symbols-outlined text-sm">place</span>
                  <span>Campus area: ${data.owner?.campus_location || 'Not provided'}</span>
                </div>

                <div class="flex gap-2 mt-3">
                  ${data.owner?.phone_number ? `<a href="tel:${data.owner.phone_number}" id="btn-call-poster" class="px-3 py-2 bg-white border rounded-xl text-xs font-semibold">Call Poster</a>` : ''}
                  <a href="#/chat?user=${data.owner?.id || ''}&item=${data.id}" id="btn-chat-poster" class="px-3 py-2 bg-primary text-white rounded-xl text-xs font-semibold">Chat</a>
                </div>
              `}
            </div>

            <div>
              <h3 class="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Description</h3>
              <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">${data.description}</p>
            </div>

            ${data.item_type === 'found' && !isOwner && data.status === 'active' ? `
              <div class="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-3">
                <h3 class="text-sm font-bold text-slate-700 flex items-center gap-1"><span class="material-symbols-outlined text-base">verified</span> Verification Question</h3>
                <p class="text-xs text-slate-500 font-medium italic">"${data.verification_question}"</p>
                
                <div id="claim-alert" class="hidden p-3 rounded-lg text-xs flex items-center gap-2"></div>
                
                <div id="claim-form-wrap" class="mt-2">
                  <form id="form-claim-item" class="flex flex-col gap-3">
                    <input type="text" id="claim-answer" required class="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Provide the answer or proof of ownership..." />
                    <button type="submit" id="btn-claim-submit" class="w-full py-3 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-xl shadow transition-all">
                      Submit Claim request
                    </button>
                  </form>
                </div>
              </div>
            ` : ''}

            ${isOwner ? `
              <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                      <a href="#/items/${data.id}/edit" id="btn-edit-listing" class="px-3 py-3 bg-white border rounded-xl text-xs font-semibold">Edit</a>
                      <button id="btn-delete-listing" class="flex-1 py-3 bg-red-50 text-red-600 hover:bg-red-100 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1">
                        <span class="material-symbols-outlined text-sm">delete</span> Delete Listing
                      </button>
              </div>
            ` : ''}
          </div>
        </div>
      `;

      // Handle claim form submission
      const claimForm = document.getElementById('form-claim-item');
      document.getElementById('form-claim-item')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('btn-claim-submit');
        const alertEl = document.getElementById('claim-alert');
        const answer = document.getElementById('claim-answer').value.trim();

        submitBtn.disabled = true;
        submitBtn.innerText = 'Submitting claim...';
        alertEl.classList.add('hidden');

        try {
          const res = await api.post('/api/claims/', {
            item: data.id,
            verification_description: answer,
          });

          if (res.ok) {
            alertEl.className = 'p-3 rounded-lg text-xs bg-green-50 text-green-700';
            alertEl.innerHTML = `<span class="material-symbols-outlined text-sm">check_circle</span> Claim request submitted. Track it on your dashboard.`;
            alertEl.classList.remove('hidden');
            document.getElementById('form-claim-item').reset();
            // disable form to prevent duplicate claims and show pending
            submitBtn.disabled = true;
            submitBtn.innerText = 'Pending approval';
            submitBtn.classList.add('opacity-70', 'cursor-not-allowed');
          } else {
            const err = await res.json();
            alertEl.className = 'p-3 rounded-lg text-xs bg-red-50 text-red-700';
            alertEl.innerHTML = `<span class="material-symbols-outlined text-sm">error</span> Failed: ${err.non_field_errors || JSON.stringify(err)}`;
            alertEl.classList.remove('hidden');
            submitBtn.disabled = false;
            submitBtn.innerText = 'Submit Claim request';
          }
        } catch (error) {
          console.error(error);
          submitBtn.disabled = false;
          submitBtn.innerText = 'Submit Claim request';
        }
      });

      // If user is authenticated, fetch their claims to show status and disable duplicate actions
      (async () => {
        try {
          if (!state.isAuthenticated) {
            // replace claim form with login prompt
            if (document.getElementById('claim-form-wrap')) {
              document.getElementById('claim-form-wrap').innerHTML = `<div class="text-xs text-slate-500">Please <a href="#/login" class="text-primary font-semibold">log in</a> to submit a claim.</div>`;
            }
            return;
          }

          const claimsRes = await api.get('/api/claims/');
          if (!claimsRes.ok) return;
          const claimsData = await claimsRes.json();
          const claims = claimsData.results || [];
          const myClaim = claims.find(c => c.item === data.id);
          if (myClaim) {
            const alertEl = document.getElementById('claim-alert');
            if (myClaim.status === 'pending') {
              alertEl.className = 'p-3 rounded-lg text-xs bg-yellow-50 text-yellow-700';
              alertEl.innerHTML = `<span class="material-symbols-outlined text-sm">hourglass_top</span> Your claim is pending approval.`;
              alertEl.classList.remove('hidden');
              document.getElementById('btn-claim-submit')?.setAttribute('disabled', 'disabled');
              document.getElementById('btn-claim-submit').innerText = 'Pending approval';
            } else if (myClaim.status === 'approved') {
              alertEl.className = 'p-3 rounded-lg text-xs bg-green-50 text-green-700';
              alertEl.innerHTML = `<span class="material-symbols-outlined text-sm">check_circle</span> Your claim was approved. Coordinate pickup via chat or call.`;
              alertEl.classList.remove('hidden');
              document.getElementById('btn-claim-submit')?.setAttribute('disabled', 'disabled');
              document.getElementById('btn-claim-submit').innerText = 'Approved';
            } else if (myClaim.status === 'resolved') {
              alertEl.className = 'p-3 rounded-lg text-xs bg-gray-50 text-gray-700';
              alertEl.innerHTML = `<span class="material-symbols-outlined text-sm">done_all</span> This claim has been resolved.`;
              alertEl.classList.remove('hidden');
              document.getElementById('btn-claim-submit')?.setAttribute('disabled', 'disabled');
              document.getElementById('btn-claim-submit').innerText = 'Resolved';
            }
          }
        } catch (e) { console.error(e); }
      })();

      // Handle delete listing
      document.getElementById('btn-delete-listing')?.addEventListener('click', async () => {
        const btn = document.getElementById('btn-delete-listing');
        if (!confirm('Are you sure you want to delete this listing permanently?')) return;
        try {
          btn.disabled = true;
          btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm">sync</span> Deleting...`;
          const res = await api.delete(`/api/items/${data.id}/`);
          if (res.ok) {
            window.location.hash = '#/items';
          } else {
            alert('Failed to delete item listing');
            btn.disabled = false;
            btn.innerHTML = `<span class="material-symbols-outlined text-sm">delete</span> Delete Listing`;
          }
        } catch (error) {
          console.error(error);
          btn.disabled = false;
          btn.innerHTML = `<span class="material-symbols-outlined text-sm">delete</span> Delete Listing`;
        }
      });
    }
  },

  // ==========================================
  // RENDER ITEM EDIT
  // ==========================================
  async renderEdit(itemId) {
    // Reuse new item form layout but change button text
    const base = await this.renderNew();
    // replace submit button text via string replace; afterRenderEdit will populate values
    return base.replace('Post Item', 'Update Item');
  },

  async afterRenderEdit(itemId) {
    // Prefill form with item data and change submit to perform PUT
    const form = document.getElementById('form-post-item');
    const submitBtn = document.getElementById('btn-post-submit');
    const alertEl = document.getElementById('post-alert');

    if (!form) return;

    try {
      const res = await api.get(`/api/items/${itemId}/`);
      if (!res.ok) {
        document.getElementById('app').innerHTML = `<div class="max-w-md mx-auto my-20 text-center p-8 bg-white rounded-2xl border border-red-100 shadow-xl">Item not found.</div>`;
        return;
      }

      const data = await res.json();
      // Fill fields
      document.getElementById('item-title').value = data.title || '';
      document.getElementById('item-desc').value = data.description || '';
      document.getElementById('item-location').value = data.location_name || '';
      document.getElementById('item-area').value = data.campus_area || '';
      if (data.date_found_lost) document.getElementById('item-date').value = data.date_found_lost.split('T')[0];
      document.getElementById('item-type').value = data.item_type || 'lost';
      document.getElementById('item-status').value = data.status || 'active';
      document.getElementById('item-question').value = data.verification_question || '';
      // select category
      const catSelect = document.getElementById('item-cat');
      if (catSelect) {
        // try to set value, options should have been loaded
        catSelect.value = data.category || '';
      }
    } catch (e) {
      console.error(e);
    }

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (submitBtn.disabled) return;

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm">sync</span> Updating...`;

      const titleVal = sanitizeText(document.getElementById('item-title').value);
      const descVal = sanitizeTextarea(document.getElementById('item-desc').value);
      const locVal = sanitizeText(document.getElementById('item-location').value);
      const areaVal = sanitizeText(document.getElementById('item-area').value);
      const dateVal = document.getElementById('item-date').value;
      const typeVal = document.getElementById('item-type').value;
      const categoryVal = document.getElementById('item-cat').value;
      const verificationQuestionVal = sanitizeTextarea(document.getElementById('item-question').value);

      const formData = new FormData();
      formData.append('title', titleVal);
      formData.append('item_type', typeVal);
      formData.append('category', categoryVal);
      formData.append('description', descVal);
      formData.append('location_name', locVal);
      formData.append('campus_area', areaVal);
      formData.append('date_found_lost', dateVal);
      formData.append('verification_question', verificationQuestionVal);
      formData.append('is_anonymous', document.getElementById('item-anon').checked);
      formData.append('status', document.getElementById('item-status').value);

      try {
        const res = await api.put(`/api/items/${itemId}/`, formData);
        if (res.ok) {
          window.location.hash = `#/items/${itemId}`;
        } else {
          const errs = await res.json();
          alertEl.classList.remove('hidden');
          alertEl.classList.add('bg-red-50', 'text-red-700', 'border-l-4', 'border-red-500');
          document.getElementById('post-alert-msg').innerText = JSON.stringify(errs);
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>Update Item</span>`;
        }
      } catch (err) {
        console.error(err);
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Update Item</span>`;
      }
    });
  },
};
