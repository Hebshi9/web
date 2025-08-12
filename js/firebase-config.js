// Firebase Configuration and Initialization
// Provide your Firebase config by setting window.FIREBASE_CONFIG before this script,
// or edit the firebaseConfig object below.

(function initFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK not loaded. Ensure firebase-app-compat.js is included before this file.');
      return;
    }

    const fallbackConfig = {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_PROJECT_ID.appspot.com",
      messagingSenderId: "YOUR_SENDER_ID",
      appId: "YOUR_APP_ID"
    };

    const firebaseConfig = window.FIREBASE_CONFIG || fallbackConfig;

    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
    }

    const db = firebase.firestore();
    if (db.settings) {
      db.settings({ ignoreUndefinedProperties: true });
    }

    window.firebase = firebase;
    window.db = db;
    console.log('Firebase initialized');
  } catch (e) {
    console.error('Failed to initialize Firebase:', e);
  }
})();


