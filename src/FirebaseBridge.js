var firebase = require("firebase-admin");


const serviceAccount = require('./config/firebase.json'); // you will need to have thos JSON filled with credentials from firestore

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com",
  storageBucket: "YOUR_PROJECT_ID.appspot.com"
});
  
const firestore = firebase.firestore();


module.exports = { firebase, firestore, getUserDetails, bucket, fbUpload }