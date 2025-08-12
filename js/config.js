(function() {
  const metaTag = document.querySelector('meta[name="api-base-url"]');
  const configuredBase = (metaTag && metaTag.content ? metaTag.content.trim() : '') || '';
  const normalizedBase = configuredBase.endsWith('/') ? configuredBase.slice(0, -1) : configuredBase;

  window.API_BASE_URL = normalizedBase; // e.g., "" for same-origin
  window.api = function(path) {
    if (!path) return normalizedBase;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizedBase}${cleanPath}`;
  };
})();