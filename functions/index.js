console.log("require google");
Error.stackTraceLimit = 40;

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

// app.use(shortCache);

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
  let startAfter = new Date;
  let limit = 20;
  if(req.query.startAfter){
    start = new Date(Date.parse(parseInt(req.query.startAfter)));
    if(typeof start !== "object"|| Number.isNaN(parseInt(req.query.startAfter))){
      return res.status(400).json({"error": "Invalid start query parameter. It should be a date parseable with Date.parse()"});
    }
  }
  if(req.query.limit){
    limit = parseInt(req.query.limit);
    if(Number.isNaN(limit) || limit < 1){
      return res.status(400).json({"error": "Invalid limit query parameter. It should be an integer"});
    }
  }
	console.log("start", start, req.query.start, "limit", limit, req.query.limit);

	let prom = imagesRef.
	orderBy("timeStamp", "desc").
	orderBy("numUsersVoted", "desc").
	startAfter(startAfter).
	limit(limit).
	get().
  then(snapshot => {
    const data = [];
    snapshot.forEach(doc => {
			data.push(doc.data());
      data[doc.id] = doc.data();
    });
    res.json(data);
  });
});

exports.cats = functions.https.onRequest(app);
}catch(e){
console.error(e.toString());
}
