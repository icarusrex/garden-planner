const FILES = new Map([
  ['/index.html', 'text/html; charset=utf-8'],
  ['/studio.css', 'text/css; charset=utf-8'],
  ['/studio.js', 'text/javascript; charset=utf-8'],
]);

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname === '/' ? '/index.html' : url.pathname;

    if (path === '/favicon.ico') return new Response(null, { status: 204 });

    const contentType = FILES.get(path);
    if (!contentType) return new Response('Not found', { status: 404 });

    const source = `https://raw.githubusercontent.com/icarusrex/garden-planner/main${path}`;
    const upstream = await fetch(source, {
      cf: { cacheEverything: true, cacheTtl: 60 },
    });

    if (!upstream.ok) {
      return new Response('Garden planner is temporarily unavailable', { status: 502 });
    }

    const headers = new Headers(upstream.headers);
    headers.delete('content-security-policy');
    headers.delete('cross-origin-resource-policy');
    headers.delete('x-frame-options');
    headers.delete('content-disposition');
    headers.set('content-type', contentType);
    headers.set('cache-control', path === '/index.html' ? 'no-cache' : 'public, max-age=60');
    headers.set('x-content-type-options', 'nosniff');

    return new Response(upstream.body, { status: 200, headers });
  },
};
