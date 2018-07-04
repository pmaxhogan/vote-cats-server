console.log("require google");

const functions = require("firebase-functions");
const admin = require("firebase-admin");

console.log("require non - google");

const express = require("express");
const app = express();
const base = "/api/v1/";


console.log("init");

try{
// Initialize the app with a service account, granting admin privileges
admin.initializeApp();

const db = admin.firestore();
//const bucket = admin.storage().bucket();

const basePath = process.env.BASEPATH || process.argv[2] || (process.env.NODE_ENV === "production" ? "images" : "") ||  "test_images";
console.log(basePath);

const imagesRef = db.collection(basePath);

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//


const shortCache = (req, res, next) => {
  res.set("Cache-Control", "private, max-age=1");
  next();
};

app.use(shortCache);

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

app.use(base + "authcheck", authenticate);
app.get(base + "authcheck", (req, res) => res.send("Auth successful."));

app.get(base, (req, res) => {
  res.send("Hello, World!");
});

app.get(base + "picts/get", (req, res) => {
  let start = 0;
  let end = 20;
  if(req.query.start || req.query.end){
    start = Math.max(Math.min(parseInt(req.query.start), 1000000), 0);
    end = Math.max(Math.min(parseInt(req.query.end), 1000000), start);
    if(typeof start !== "number" || typeof end !== "number" || Number.isNaN(start) || Number.isNaN(start)){
      return res.status(400).json({"error": "Invalid or missing start / end query parameter"});
    }
  }
	console.log("start", start, req.query.start, "end", end, req.query.end);
  const prom = imagesRef.
	orderBy("timeStamp", "desc").
	orderBy("numUsersVoted", "desc").
	startAt(start).
	limit(end - start + 1).
	get();
  prom.then(snapshot => {
    let data = {};
		console.log(snapshot.docs);
    snapshot.forEach(doc => {
      data[doc.id] = doc.data();
    });
    res.json(data);
  });
});

exports.cats = functions.https.onRequest(app);
}catch(e){
console.error(e.toString());
}
