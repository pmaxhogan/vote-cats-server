const functions = require("firebase-functions");
const admin = require("firebase-admin");

const express = require("express");
const app = express();

const base = "/api/v1/";

// Initialize the app with a service account, granting admin privileges
admin.initializeApp();

const db = admin.firestore();
//const bucket = admin.storage().bucket();

const basePath = "images";

const imagesRef = db.collection(basePath);
const metaRef = db.collection("meta");
const adminDoc = metaRef.doc("admins");

// fixes the timestamp of an image.
const procImageData = (data)=>{
	data.timeStamp = data.timeStamp.toDate();
	return data;
};

const noCache = (req, res, next) => {
  res.set("Cache-Control", "private, max-age=1");
  next();
};

// app.use(noCache);

const authenticate = (req, res, next) => {
  if(req.query.token){
    req.headers.authorization = "Bearer " + req.query.token;
  }
  if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer ")) {
		console.log("no auth!");
    res.status(403).send("Unauthorized");
    return;
  }
  const idToken = req.headers.authorization.split("Bearer ")[1];
  admin.auth().verifyIdToken(idToken).then(decodedIdToken => {
    req.user = decodedIdToken;
    console.log(decodedIdToken);
    next();
  }).catch(error => {
		console.log(error);
		console.log("invalid token");
    res.status(403).send("Invalid Token");
  });
};
const authenticateAdmin = (req, res, next) => {
	if(!req.user) {
		console.log("no user");
		res.status(403).send("Unauthorized");
		return;
	}
	adminDoc.get().then(doc => {
		const data = doc.data();
		const admins = data.adminIds;
		if(admins.includes(req.user.uid)){
			next();
		}else{
			console.log("did not find admin", req.user.id, "in", admins);
			res.status(403).send("Unauthorized");
			return;
		}
	});
};

app.get(base + "auth", (req, res) => res.send("Auth successful."));

app.get(base, (req, res) => {
  res.send("Hello, World!");
});


app.use(base + "admin/", authenticate);
app.use(base + "admin/", authenticateAdmin);
app.get(base + "admin/picts/delete/:id", (req, res) => {
	console.log("Deleting picture", req.params.id);
	imagesRef.doc(req.params.id).delete().then(()=>{
		res.send("");
	}).catch(e => {
		console.error(e);
		res.status(500).send(e.toString());
	});
});

app.get(base + "picts/get", (req, res) => {
  let startAfter = new Date;
  let limit = 20;
  if(req.query.startAfter){
    startAfter = new Date(Date.parse(req.query.startAfter));
    if(typeof startAfter !== "object"|| Number.isNaN(parseInt(req.query.startAfter))){
      return res.status(400).json({"error": "Invalid start query parameter. It should be a date parseable with Date.parse()"});
    }
  }
  if(req.query.limit){
    limit = parseInt(req.query.limit);
    if(Number.isNaN(limit) || limit < 1){
      return res.status(400).json({"error": "Invalid limit query parameter. It should be an integer"});
    }
  }
	console.log("startAfter", startAfter, req.query.startAfter, "limit", limit, req.query.limit);

	let prom = imagesRef.
	orderBy("timeStamp", "desc").
	orderBy("numUsersVoted", "desc").
	startAfter(startAfter).
	limit(limit).
	get().
  then(snapshot => {
    const data = [];
    snapshot.forEach(doc => {
			data.push(procImageData(doc.data()));
      data[doc.id] = doc.data();
    });
    res.json(data);
  });
});

app.get(base + "picts/:id", (req, res) => {
	imagesRef.doc(req.params.id).get().then(doc => {
		if(!doc.exists) return res.status(404).end();
		res.json(procImageData(doc.data()));
	});
});

app.use([base + "picts/:id/favorite", base + "picts/:id/unfavorite"], authenticate);

const getFavorite = isFavorite => (req, res) => {
	const image = imagesRef.doc(req.params.id);
	image.get().then(doc => {
		console.log(doc);
		if(!doc.exists) return res.status(404).end();
		const data = doc.data();

		// short version of ensuring that you can't favorite something already favorited and the reverse also
		if(isFavorite === data.usersVoted.includes(req.user.uid)) return res.status(400).end();
		const newData = {
			numUsersVoted: data.numUsersVoted + (isFavorite ? 1 : -1),
			usersVoted: (isFavorite ?
				data.usersVoted.concat(req.user.uid) :
				data.usersVoted.filter(user => user !== req.user.uid)
			)
		};
		image.update(newData).then(() => res.json(Object.assign(data, newData)));
	});
};

app.put(base + "picts/:id/favorite", getFavorite(true));
app.put(base + "picts/:id/unfavorite", getFavorite(false));

exports.cats = functions.https.onRequest(app);
