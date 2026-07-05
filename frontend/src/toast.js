export function showToast(message, type = 'success', timeout = 3000) {
  try {
    const id = `toast-${Date.now()}`;
    const container = document.createElement('div');
    container.id = id;
    container.className = 'fixed bottom-6 right-6 max-w-sm w-full z-50 pointer-events-auto';

    const color = type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200';

    container.innerHTML = `
      <div class="p-3 rounded-xl border ${color} shadow-md">
        <div class="flex items-start gap-3">
          <div class="material-symbols-outlined text-xl ${type === 'error' ? 'text-red-500' : 'text-green-600'}">${type === 'error' ? 'error' : 'check_circle'}</div>
          <div class="flex-1 text-sm font-medium">${message}</div>
          <button class="ml-2 text-sm opacity-70 close-toast">✕</button>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    const remove = () => {
      container.classList.add('opacity-0');
      setTimeout(() => container.remove(), 300);
    };

    container.querySelector('.close-toast')?.addEventListener('click', remove);
    setTimeout(remove, timeout);
  } catch (e) {
    console.error('showToast error', e);
  }
}
