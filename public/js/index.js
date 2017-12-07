mdc.autoInit();


scrollTo(0, 0);

const $ = selector => document.querySelector(selector);
const apiKey = "MjUwMDg2";

const calcPixelsLeft = () => getRealHeightOfHeighestColumn() - (document.documentElement.scrollTop + window.innerHeight);

customElements.define("masonry-panel",
class extends HTMLElement {
  constructor() {
    super();
    let template = document
    .getElementById("panel-template")
    .content;
    const shadowRoot = this.attachShadow({mode: "open"})
    .appendChild(template.cloneNode(true));
  }
});

const getRealHeightOfHeighestColumn = () => {
  return Array.from(getShortestColumn().children).reduce((acc, child) => child.clientHeight + acc, 0);
};

const getShortestColumn = () => {
  const columns = document.querySelectorAll(".masonry-layout-column");
  const heights = Array.from(columns).map(column =>
    Array.from(column.children).reduce((height, elem) => height + elem.offsetHeight, 0)
  );
  return columns[heights.indexOf(Math.min(...heights))];
};

const addImgs = num => {
  for(let i = 0; i < num; i++){
    fetch("https://random.cat/meow").then(x=>x.json()).then(data => {
      const panel = document.createElement("div");
      panel.classList.add("mdc-card");
      panel.innerHTML = `
  <!-- <h2>A cute cat</h2> -->
  <img class = "mdc-card__media" crossorigin = "anonymous" src = "https://cors-anywhere.herokuapp.com/${data.file}"/>
  <p class="mdc-card__supporting-text">
  <i class="heart mdc-icon-toggle material-icons" role="button" aria-pressed="false"
     aria-label="Add to favorites" tabindex="0"
     data-toggle-on='{"label": "Remove from favorites", "content": "favorite"}'
     data-toggle-off='{"label": "Add to favorites", "content": "favorite_border"}'>
    favorite_border
  </i>
  <i class="mdc-icon-toggle material-icons" role="button" aria-pressed="false"
     aria-label="Delete this picture" tabindex="0">
    delete
  </i>
  </p>`;
      getShortestColumn().appendChild(panel);
      mdc.iconToggle.MDCIconToggle.attachTo(panel.querySelector("i"));
    });
  }
};
addImgs(15);

let last = 0;
onscroll = e => {
  if(Date.now() - last > 100){
    last = Date.now();
    const pixels = calcPixelsLeft();
    if(pixels < 200){
      addImgs(20);
      console.log(pixels);
      last -= 750;
    }
  }
}

firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    // User is signed in.
    var displayName = user.displayName;
    var email = user.email;
    var emailVerified = user.emailVerified;
    var photoURL = user.photoURL;
    var isAnonymous = user.isAnonymous;
    var uid = user.uid;
    var providerData = user.providerData;

    console.log("SIGNED IN", {displayName, email, emailVerified, photoURL, isAnonymous, uid, providerData});

    firebase.auth().currentUser.getIdToken().then(console.log)
    $("#signed-out").classList.add("hidden");
    $("#signed-in").classList.remove("hidden");

    $("#profile").innerHTML = `<img src = "${user.photoURL}" class = "logo-button"/>`;
  } else {
    // User is signed out.
    console.log("SIGNED OUT");
    $("#signed-out").classList.remove("hidden")
    $("#signed-in").classList.add("hidden");
  }
});

$("button#sign-out").onclick = () => firebase.auth().signOut();
document.querySelectorAll(".sign-in").forEach(button => button.onclick = () => {
  console.log(button);
  firebase.auth().signInWithPopup(new firebase.auth[button.dataset.authName + "AuthProvider"]());
});
