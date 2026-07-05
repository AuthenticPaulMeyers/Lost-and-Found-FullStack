export default {
  render(params, query) {
    const code = query.code || 'unknown';
    let title = 'Error';
    let message = 'An unexpected error occurred.';

    switch (code) {
      case '401':
        title = 'Unauthorized';
        message = 'You need to sign in to access this page.';
        break;
      case '403':
        title = 'Forbidden';
        message = 'You do not have permission to access this resource.';
        break;
      case '404':
        title = 'Not Found';
        message = 'The requested resource was not found.';
        break;
      case '405':
        title = 'Method Not Allowed';
        message = 'The request method is not supported for this resource.';
        break;
      case '429':
        title = 'Too Many Requests';
        message = 'You are making requests too quickly. Please try again later.';
        break;
      case '500':
        title = 'Server Error';
        message = 'The server encountered an error. Please try again later.';
        break;
      default:
        title = `Error ${code}`;
        message = 'Something went wrong.';
    }

    return `
      <div class="max-w-md mx-auto my-20 text-center p-8 bg-white rounded-2xl border border-red-100 shadow-xl">
        <span class="material-symbols-outlined text-6xl text-red-500 mb-4">error</span>
        <h2 class="text-xl font-bold mb-2">${title}</h2>
        <p class="text-slate-500 mb-4">${message}</p>
        <div class="flex justify-center gap-3">
          <a href="#/" class="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white font-bold rounded-lg">Go Home</a>
          <a href="#/login" class="inline-flex items-center gap-2 px-6 py-2 bg-white border rounded-lg">Sign In</a>
        </div>
      </div>
    `;
  }
};
