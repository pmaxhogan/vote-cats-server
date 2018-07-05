const admin = require("firebase-admin");
const fetch = require("node-fetch");
const {parseString} = require("xml2js");

const basePath = process.env.BASEPATH || process.argv[2] || (process.env.NODE_ENV === "production" ? "images" : "") ||  "test_images";
console.log(basePath);

// Initialize the app with a service account, granting admin privileges
admin.initializeApp({storageBucket: "vote-cats.appspot.com"});

// As an admin, the app has access to read and write all data, regardless of Security Rules
const db = admin.firestore();
const bucket = admin.storage().bucket();

const imagesRef = db.collection(basePath);

const images = {};
const updateDoc = (name, value) => {
  images[name] = value;
  return imagesRef.doc(name).set(value);
};
const addDoc = (value) => {
  const d = (new Date).toISOString();
  images[d] = value;
  return imagesRef.doc(d).set(value);
};

const imgSchema = {
  isDeleted: false,
  usersVoted: [],
  timeStamp: new Date(),
  url: "https://example.com",
	numUsersVoted: 0
};

let i = 0;

const newImg = () => fetch("https://thecatapi.com/api/images/get?api_key=MzM3NDUz&format=xml").then(x=>x.text()).then(text=>{
	parseString(text, function (err, result) {
		if(err) throw err;
		const image = result.response.data[0].images[0].image[0];
		console.log("got image", image);
	  const URL = image.url[0];
		const source = image.source_url[0];

	  var options = {
	    destination: basePath + "/" + encodeURIComponent(URL),
	    resumable: true,
	    validation: "crc32c"
	  };

	  bucket.upload(URL, options, function(err, file) {
	    if(err) return console.error(err);
			file.makePublic();
			const uploadedUrl = "https://firebasestorage.googleapis.com/v0/b/vote-cats.appspot.com/o/" + encodeURIComponent(basePath + "/" + encodeURIComponent(URL)) + "?alt=media";

      console.log(uploadedUrl);
      const img = imgSchema;
      img.url = uploadedUrl;
      img.timeStamp = new Date();
			img.source = source;
			img.num = i;
      i++;
      console.log("added img", img, "num", i);
      addDoc(img);
		});
  });
}).catch(console.error);

imagesRef.get().then(snapshot => {
	let maxId = 0;
  snapshot.forEach(doc => {
		const data = doc.data();
		maxId = Math.max(data.num + 1, maxId);
    //console.log(doc.id, "=>", doc.data());
    images[doc.id] = data;
  });
	i = maxId;

  newImg();

  setInterval(newImg, 1500);
});
