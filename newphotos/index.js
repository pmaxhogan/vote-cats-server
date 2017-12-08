const admin = require("firebase-admin");
const fetch = require("node-fetch");


// Fetch the service account key JSON file contents
var serviceAccount = require("./SUPERPRIVATEKEY.json");

// Initialize the app with a service account, granting admin privileges
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://vote-cats.firebaseio.com/",
  storageBucket: "vote-cats.appspot.com"
});

// As an admin, the app has access to read and write all data, regardless of Security Rules
const db = admin.firestore();
const bucket = admin.storage().bucket();

const imagesRef = db.collection("images");

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
  url: "https://example.com"
};

let i = 0;

const newImg = () => fetch("https://random.cat/meow").then(x=>x.json()).then(data=>{
  const URL = data.file;

  var options = {
    destination: "images/" + encodeURIComponent(URL),
    resumable: true,
    validation: "crc32c"
  };

  bucket.upload(URL, options, function(err, file) {
    if(err) return console.error(err);

    const config = {
      action: "read",
      expires: "01-01-2100"
    };

    file.getSignedUrl(config, function(err, url) {
      if (err) {
        console.error(err);
        return;
      }
      console.log(url);
      const img = imgSchema;
      img.url = url;
      img.timeStamp = new Date();
      i++;
      console.log("added img", img, "num", i);
      addDoc(img);
    });
  });
});

imagesRef.get().then(snapshot => {
  snapshot.forEach(doc => {
      //console.log(doc.id, "=>", doc.data());
      images[doc.id] = doc.data();
  });

  newImg();

  setInterval(newImg, 1000);
});
