// For Firebase JS SDK v7.20.0 and later, measurementId is optional
import firebase from "firebase";
const firebaseConfig = {
    apiKey: "AIzaSyBJtNuA38trABmgqOiX7ztsjBt78DEU2Ps",
    authDomain: "fb-clone-721cd.firebaseapp.com",
    projectId: "fb-clone-721cd",
    storageBucket: "fb-clone-721cd.appspot.com",
    messagingSenderId: "458613257037",
    appId: "1:458613257037:web:cc54363e475a8c7efe3d04",
    measurementId: "G-GX97Y5YPK9"
  };
  const firebaseApp = firebase.initializeApp(firebaseConfig);
  const db = firebaseApp.firestore();
  const auth = firebase.auth();
  const provider = new firebase.auth.GoogleAuthProvider();

  export {auth , provider} ;
  export default db;