mdc.autoInit();

// some browsers scroll you to where you were
scrollTo(0, 0);

const $ = selector => document.querySelector(selector);

// if if we've ran out of content
let noMore = false;
// the snackbar to tell us we've ran out of content
const thatsIt = new mdc.snackbar.MDCSnackbar($(".thats-it"));

const calcPixelsLeft = () => getRealHeightOfHighestColumn() - (document.documentElement.scrollTop + innerHeight);

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
  return getShortestColumn().offsetHeight;
};

const getShortestColumn = () => {
	// get all columns
  const columns = document.querySelectorAll(".masonry-layout-column");
	// and return the shortest one
  return Array.from(columns).sort((a, b) => a.offsetHeight - b.offsetHeight)[0];
};

let lastTimeStamp;

let imgs = [];

const addPict = pict => {
	const panel = document.createElement("div");
	panel.classList.add("mdc-card");
	panel.setAttribute("data-timestamp", pict.timeStamp);
	panel.innerHTML = `
<img class = "mdc-card__media mdc-card__primary-action" src = "${pict.dispUrl || decodeURIComponent(decodeURIComponent(pict.url.slice(77, -10)))}"/>
<div class="mdc-card__actions mdc-card__actions--full-bleed">
<button id="add-to-favorites"
 class="mdc-icon-button mdc-card__action mdc-card__action--icon"
 aria-label="Add to favorites"
 aria-hidden="true"
 aria-pressed="false">
 <i class="material-icons mdc-icon-button__icon mdc-icon-button__icon--on">favorite</i>
 <i class="material-icons mdc-icon-button__icon">favorite_border</i>
</button>
<button class="material-icons mdc-icon-button mdc-card__action mdc-card__action--icon delete" title="Delete">delete</button>
</div>`;
	// add the panel
	getShortestColumn().appendChild(panel);

	// initalize the button
	const favButton = panel.querySelector("button");
	(new mdc.ripple.MDCRipple(favButton)).unbounded = true;
	const mdcFavButton = new mdc.iconButton.MDCIconButtonToggle(favButton);
	favButton.addEventListener("MDCIconButtonToggle:change", e => {
		console.log("fav pressed", e.detail.isOn, pict);
	});

	panel.querySelector(".delete").addEventListener("click", () => {
		fetchWithAuth("/api/v1/admin/picts/delete/" + pict.timeStamp).then(() => {
			panel.remove();
		}).catch(console.error);
	});
	// console.log("\t" + pict.timeStamp);
	lastTimeStamp = new Date(pict.timeStamp);
};

const addImgs = num => {
	let params = "";
	if(lastTimeStamp){
		params = "&startAfter=" + lastTimeStamp.toISOString();
	}
	const url = "/api/v1/picts/get?limit=" + num + params;
	console.log(url);
  return fetch(url).then(x=>x.json()).then(data => {
		// if we didn't get anything, tell the user
		if(!data.length) noMore = true;
		else noMore = false;

		data.forEach(pict=>pict.date = Date.parse(pict.timeStamp));
		data = data.sort((a, b) => b.date - a.date);


		imgs = imgs.concat(data);
		data.forEach(addPict);
		// console.log(lastTimeStamp, num);
	}).catch(() => {
		isLoading = false;
	});
};

let last = 0;
let isLoading = false;
onscroll = e => {
  if(!isLoading && !noMore){
    last = Date.now();
    const pixels = calcPixelsLeft();
    if(pixels < 400){
			isLoading = true;
      addImgs(20).then(() => isLoading = false);
      console.log(pixels);
      last -= 750;
    }
  }

	// if we've reached the end and we can't load more content
	if(noMore && document.documentElement.scrollHeight - innerHeight - document.documentElement.scrollTop < 400){
		thatsIt.open();
	}
}

firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    // User is signed in.thats-it
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

let currentColumns = 5;
let pastColumns = currentColumns;
// the width when a column is removed
const widthBreakpoints = [400, 675, 900, 1125, 1250, 1425];

// calculate the amount of columns we will need given a display width
const calcNumColumns = (width) => {
	let num = 1;
	widthBreakpoints.forEach((breakpoint, idx) => {
		// if we're in the right range
		if(width >= breakpoint && (width < widthBreakpoints[idx + 1] || widthBreakpoints.length === idx + 1)){
			// return the num
			num = idx + 2;
		}
	});
	return num;
};

const updateColumns = () => {
	pastColumns = currentColumns;
	currentColumns = calcNumColumns(innerWidth);
	if(currentColumns !== pastColumns){
		console.log("going from", pastColumns, "to", currentColumns);
		const parent = $(".masonry-layout");

		// empty it
		while (parent.hasChildNodes()) {
	  	parent.removeChild(parent.lastChild);
		}

		for(let i = 0; i < currentColumns; i ++){
			const div = document.createElement("div");
			div.classList.add("masonry-layout-column");
			parent.appendChild(div);
		}

		imgs.forEach(addPict);
	}
};

onresize = () => updateColumns();
updateColumns();
addImgs(7 * calcNumColumns(innerWidth));
