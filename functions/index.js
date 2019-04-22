const functions = require("firebase-functions");
const admin = require("firebase-admin");

const express = require("express");
const app = express();

app.disable("x-powered-by");
app.use(express.json({
  inflate: true,
  limit: "10kb",
  reviver: null,
  strict: true,
  type: "application/json",
  verify: undefined
}))

const base = "/api/v1/";

// Initialize the app with a service account, granting admin privileges
admin.initializeApp();

const db = admin.firestore();
//const bucket = admin.storage().bucket();

const basePath = "images";

const imagesRef = db.collection(basePath);
const metaRef = db.collection("meta");
const usersRef = db.collection("users");
const adminDoc = metaRef.doc("admins");

let admins = [];

adminDoc.get().then(doc => {
	const data = doc.data();
	admins = data.adminIds;
});

// returns true if the provided User object is an admin
const checkIfAdmin = user => admins.includes(user.uid);

// fixes the timestamp of an image.
const procImageData = (data, user)=>{
	data.timeStamp = data.timeStamp.toDate();
	if(user) data.iVoted = data.usersVoted.includes(user.uid);
	// if you"re not an admin, don"t tell you who voted for who
	if(!user || !checkIfAdmin(user)) delete data.usersVoted;
	return data;
};

const noCache = (req, res, next) => {
  res.set("Cache-Control", "private, max-age=1");
  next();
};

// app.use(noCache);

// hard-fails if authentication is not present
const authenticate = (req, res, next) => {
  if(!req.user) res.status(403).send("Invalid Token");
	next();
};

// determines if the user attempted to authenticate and validates them if so
const softAuthenticate = (req, res, next) => {
  if(req.query.token){
    req.headers.authorization = "Bearer " + req.query.token;
  }
  if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer ")) {
    return next();
  }
  const idToken = req.headers.authorization.split("Bearer ")[1];
  admin.auth().verifyIdToken(idToken).then(decodedIdToken => {
    req.user = decodedIdToken;
    next();
  }).catch(error => {
		console.error("invalid token");
    res.status(403).send("Invalid Token");
  });
};

app.use(softAuthenticate);

const authenticateAdmin = (req, res, next) => {
	if(!req.user) {
		console.log("Admin authentication failed (no user)");
		res.status(403).send("Unauthorized");
		return;
	}
	adminDoc.get().then(doc => {
		const data = doc.data();
		admins = data.adminIds;
		if(checkIfAdmin(req.user)){
			next();
		}else{
			console.log("did not find admin", req.user.id, "in", admins);
			res.status(403).send("Unauthorized");
			return;
		}
	});
};

app.use(base + "auth/", authenticate);
app.get(base + "auth", (req, res) => res.send("Auth successful."));

app.get(base, (req, res) => {
  res.send("Hello, World!");
});

app.use(base + "mylikes/", authenticate);
app.get(base + "mylikes/", (req, res) => {
	usersRef.doc(req.user.uid).get().then(doc => {
		const data = doc.data();

		res.json(data && data.likes || []);
		if(!doc.exists) usersRef.doc(req.user.uid).set({});
	});
});
app.use(base + "admin/", authenticate);
app.use(base + "admin/", authenticateAdmin);

app.get(base + "admin/test", (_, res) => res.end());

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

	let prom = imagesRef.
	orderBy("timeStamp", "desc").
	orderBy("numUsersVoted", "desc").
	startAfter(startAfter).
	limit(limit).
	get().
  then(snapshot => {
    const data = [];
    snapshot.forEach(doc => {
			data.push(procImageData(doc.data(), req.user));
      data[doc.id] = doc.data();
    });
    res.json(data);
  });
});

app.get(base + "picts/getalot", (req, res) => {
	if(!Array.isArray(req.query.ids)){
		return res.status(400).send("Invalid param");
	}

	db.getAll(req.query.ids.map(id => imagesRef.doc(id))).then(snapshot => {
    const data = [];
    snapshot.forEach(doc => {
			data.push(procImageData(doc.data(), req.user));
      data[doc.id] = doc.data();
    });
    res.json(data);
  }).catch(e => {
		return res.status(400).send("Invalid id");
	});
});

app.get(base + "picts/:id", (req, res) => {
	imagesRef.doc(req.params.id).get().then(doc => {
		if(!doc.exists) return res.status(404).end();
		res.json(procImageData(doc.data(), req.user));
	});
});

app.get(base + "auth", (req, res) => res.send("Auth successful."));

app.patch(base + "auth/profile", (req, res) => {
	try{
		if(!req.body) return req.status(400).end();
		const data = JSON.parse(req.body);
		console.log(data, typeof data);
		usersRef.doc(req.user.uid).update(data);
		res.end();
	}catch(e){
		console.error(e);
		return res.status(400).end();
	}
});
app.get(base + "auth/profile", (req, res) => {
	usersRef.doc(req.user.uid).get().then(doc => {
		const data = doc.data();
		console.log(data);
		res.json(data);
	});
});

// a curried function that returns a function for handleing either favoriting or unfavoriting
const getFavorite = isFavorite => (req, res) => {
	usersRef.doc(req.user.uid).get().then(doc => {
		const data = doc.data();
		data.likes = data.likes || [];

		// ensures that you can"t favorite something already favorited and the reverse also
		if(data && data.likes && isFavorite === data.likes.includes(req.params.id)) return res.status(400).end();

		if(isFavorite){
			// append to
			if(data.likes) data.likes.push(req.params.id);
			else data.likes = [req.params.id];
			usersRef.doc(req.user.uid).set(data);
		}else{
			isFavorite
			const index = data.likes.indexOf(req.params.id);
			if(index > -1){
			  data.likes.splice(index, 1);
				usersRef.doc(req.user.uid).set(data);
			}
		}



		const image = imagesRef.doc(req.params.id);
		image.get().then(imageDoc => {
			if(!imageDoc.exists) return res.status(404).end();
			const imageData = imageDoc.data();
			const newData = {
				numUsersVoted: (imageData.numUsersVoted || 0) + (isFavorite ? 1 : -1)
			};

			image.update(newData).then(() => res.json(Object.assign(imageData, newData)));
		});
	}).catch(e => {
		console.error(e);
		res.status(400).end();
	});
};

app.put(base + "picts/:id/favorite", getFavorite(true));
app.put(base + "picts/:id/unfavorite", getFavorite(false));

exports.cats = functions.https.onRequest(app);


exports.setUserFirestore = functions.auth.user().onCreate((user, context) => {
	usersRef.doc(user.uid).get().then(doc => {
		let data;

		// get the data if it exists
		if(doc.exists) data = doc.data();
		else data = {};

		usersRef.doc(user.uid).set(data);
	});
});
