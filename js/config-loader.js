(function loadFirebaseConfig() {
  try {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/config/firebase.json', false);
    xhr.send(null);
    if (xhr.status === 200 && xhr.responseText) {
      try {
        var cfg = JSON.parse(xhr.responseText);
        if (cfg && cfg.apiKey && cfg.projectId) {
          window.FIREBASE_CONFIG = cfg;
          console.log('Loaded Firebase config from /config/firebase.json');
        }
      } catch (e) {
        console.warn('Invalid /config/firebase.json content');
      }
    }
  } catch (e) {
    // ignore if file not found
  }
})();