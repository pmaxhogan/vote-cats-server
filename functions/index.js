const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const app = express();
const base = "/api/v1/";

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//

// Fetch the service account key JSON file contents
var serviceAccount = require("./SUPERPRIVATEKEY.json");

// Initialize the app with a service account, granting admin privileges
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://vote-cats.firebaseio.com/",
  storageBucket: "vote-cats.appspot.com"
});

const shortCache = (req, res, next) => {
  res.set("Cache-Control", "private, max-age=1");
  next();
};

const authenticate = (req, res, next) => {
  if(req.query.token){
    req.headers.authorization = "Bearer " + req.query.token;
  }
  if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer ")) {
    res.status(403).send("Unauthorized");
    return;
  }
  const idToken = req.headers.authorization.split("Bearer ")[1];
  admin.auth().verifyIdToken(idToken).then(decodedIdToken => {
    req.user = decodedIdToken;
    console.log(decodedIdToken);
    next();
  }).catch(error => {
    res.status(403).send("Invalid Token");
  });
};

app.use(shortCache);

app.use(base + "authcheck", authenticate);
app.get(base + "authcheck", (req, res) => res.send("Auth successful."));

app.get(base, (req, res) => {
  res.send("Hello, World!");
});

app.get(base + "picts/new", (req, res) => {

});

exports.cats = functions.https.onRequest(app);
