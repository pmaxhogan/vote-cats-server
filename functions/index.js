const functions = require("firebase-functions");
const express = require("express");
const app = express();
const base = "/api/v1/";

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//

const shortCache = (req, res, next) => {
  res.set("Cache-Control", "private, max-age=300");
  next();
};

const authenticate = (req, res, next) => {
  if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer ")) {
    res.status(403).send("Unauthorized");
    return;
  }
  const idToken = req.headers.authorization.split("Bearer ")[1];
  admin.auth().verifyIdToken(idToken).then(decodedIdToken => {
    req.user = decodedIdToken;
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

exports.cats = functions.https.onRequest(app);
