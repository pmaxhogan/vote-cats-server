mdc.autoInit();

scrollTo(0, 0);

const $ = selector => document.querySelector(selector);

const calcPixelsLeft = () => getRealHeightOfHighestColumn() - (document.documentElement.scrollTop + window.innerHeight);

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

const fetchWithAuth = async (url, options = {}) => {
	const token = await firebase.auth().currentUser.getIdToken();
	if(!options.headers) options.headers = {};
	options.headers.authorization = "Bearer " + token;
	return fetch(url, options);
};

const getRealHeightOfHighestColumn = () => {
  return Array.from(getShortestColumn().children).reduce((acc, child) => child.clientHeight + acc, 0);
};

const getShortestColumn = () => {
  const columns = document.querySelectorAll(".masonry-layout-column");
  const heights = Array.from(columns).map(column =>
    Array.from(column.children).reduce((height, elem) => height + elem.offsetHeight, 0)
  );
  return columns[heights.indexOf(Math.min(...heights))];
};

let lastTimeStamp;

const addImgs = num => {
	let params = "";
	if(lastTimeStamp){
		params = "&startAfter=" + lastTimeStamp.toISOString();
	}
	const url = "/api/v1/picts/get?limit=" + num + params;
	console.log(url);
  return fetch(url).then(x=>x.json()).then(data => {
		// if we didn't get anything, tell the user
		if(!data.length) $("#no-more").removeAttribute("hidden");
		// else $("#no-more").setAttribute("hidden")

		data.forEach(pict=>pict.date = Date.parse(pict.timeStamp));
		data.sort((a, b) => b.date - a.date).forEach(pict => {
	    const panel = document.createElement("div");
	    panel.classList.add("mdc-card");
			panel.setAttribute("data-timestamp", pict.timeStamp);
	    panel.innerHTML = `
<!-- <h2>A cute cat</h2> -->
<img class = "mdc-card__media" src = "${pict.url}"/>
<div class="mdc-card__actions">
  <button class="mdc-icon-button mdc-card__action mdc-card__action--icon"
     aria-pressed="false"
     aria-label="Add to favorites"
     title="Add to favorites">
   <i class="material-icons mdc-icon-button__icon mdc-icon-button__icon--on">favorite</i>
   <i class="material-icons mdc-icon-button__icon">favorite_border</i>
  </button>
  <button class="material-icons mdc-icon-button mdc-card__action mdc-card__action--icon delete" title="Delete">delete</button>
</div>`;
	    getShortestColumn().appendChild(panel);
	    mdc.iconButton.MDCIconButtonToggle.attachTo(panel.querySelector("i"));
			panel.querySelector(".delete").addEventListener("click", () => {
				fetchWithAuth("/api/v1/admin/picts/delete/" + pict.timeStamp).then(() => {
					panel.remove();
				}).catch(console.error);
			});
			// console.log("\t" + pict.timeStamp);
			lastTimeStamp = new Date(pict.timeStamp);
	  });
		// console.log(lastTimeStamp, num);
	});
};
addImgs(15);

let last = 0;
let isLoading = false;
onscroll = e => {
  if(Date.now() - last > 1000 && !isLoading){
    last = Date.now();
    const pixels = calcPixelsLeft();
    if(pixels < 200){
			isLoading = true;
      addImgs(20).then(() => isLoading = false);
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

    $("#signed-out").classList.add("hidden");
    $("#signed-in").classList.remove("hidden");

    const text = $("#profile").querySelector("span");
    text.innerText = displayName;

    const img = $("#profile").querySelector("img");
    img.src = user.photoURL;
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
