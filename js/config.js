const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://127.0.0.1:5000'
  : 'https://5000-is20x6ners704x6gl1at6-16b15953.manusvm.computer';

// Expose for inline scripts if needed
window.API_BASE = API_BASE;