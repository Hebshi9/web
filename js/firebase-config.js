// Firebase initialization using compat SDKs loaded via CDN in HTML
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBYJNxTaSHn924S1EcsaWVBzHQUte765oA",
  authDomain: "salyesv2.firebaseapp.com",
  projectId: "salyesv2",
  storageBucket: "salyesv2.firebasestorage.app",
  messagingSenderId: "67502829472",
  appId: "1:67502829472:web:e2a123fa4af3253af97ec5",
  measurementId: "G-8JKJNLT3DB"
};

// Initialize Firebase app once
if (typeof firebase !== 'undefined') {
  if (!firebase.apps || firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
  }
  // Expose Firestore and Storage if needed by future features
  window.db = firebase.firestore();
  window.storage = firebase.storage();
}


