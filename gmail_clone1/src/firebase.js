import firebase from 'firebase'; 
const firebaseConfig = {
    apiKey: "AIzaSyABa6IwnzuMtUfiZ6Aj1L3zsqK0wfKMsn4",
    authDomain: "clone-7c8e8.firebaseapp.com",
    projectId: "clone-7c8e8",
    storageBucket: "clone-7c8e8.appspot.com",
    messagingSenderId: "971362563853",
    appId: "1:971362563853:web:78cc3ac0a958999fed6244",
    measurementId: "G-DC65VR2YY2"
  };

  const firebaseApp = firebase.initializeApp(firebaseConfig)
  const db = firebaseApp.firestore();
  const auth = firebase.auth();
  const provider = firebase.auth.GoogleAuthProvider();

  export {db, auth, provider};
