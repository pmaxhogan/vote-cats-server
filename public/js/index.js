mdc.autoInit();

// some browsers scroll you to where you were last
scrollTo(0, 0);

const $ = selector => document.querySelector(selector);

const imageshowcase = $("#imageshowcase");
const imageshowcaseDialog = new mdc.dialog.MDCDialog(imageshowcase);
const imageshowcaseDialogFavButton = new mdc.iconButton.MDCIconButtonToggle(document.querySelector("#imageshowcase .add-to-favorites"));
imageshowcaseDialog.listen("MDCDialog:opened", () => {
  imageshowcaseDialogFavButton.ripple.layout();
});


const dialog = new mdc.dialog.MDCDialog($("#sign-in-modal"));
dialog.listen("MDCDialog:closed", e => {
	if(e.detail.action === "accept"){
		firebase.auth().signInWithPopup(new firebase.auth["GoogleAuthProvider"]());
	}
});


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

const fetchIt = async (url, options = {}, allowNoAuth = true) => {
	const currentUser = firebase.auth().currentUser;
	if(currentUser){
		const token = await currentUser.getIdToken();
		if(!options.headers) options.headers = {};
		options.headers.authorization = "Bearer " + token;
		return fetch(url, options);
	}else if(allowNoAuth){// if it's ok to make the request when signed out
		return fetch(url, options);
	}else{
		throw new Error("Not signed in!");
	}
};

const showcaseImage = id => {
	fetchIt(`/api/v1/picts/${id}`).then(x=>{
		if(x.ok){
			return x.json();
		}
		throw new Error(x);
	}).then(img => {
		imageshowcase.querySelector("img").setAttribute("src", img.url);
		const abbr = imageshowcase.querySelector("abbr");
		const imgDate = new Date(img.timeStamp);
		abbr.setAttribute("title", imgDate.toLocaleString());
		abbr.innerText = dateFns.distanceInWordsToNow(imgDate, {addSuffix: true, includeSeconds: true});

		const favButton = imageshowcase.querySelector(".add-to-favorites");
		procFavButton(favButton, imageshowcaseDialogFavButton, img.timeStamp, imageshowcase.querySelector(".num-likes"));

		imageshowcase.setAttribute("data-timestamp", img.timeStamp);

		imageshowcase.querySelector(".num-likes").innerText = img.numUsersVoted;

		imageshowcase.mdcFavButton = imageshowcaseDialogFavButton;
		imageshowcaseDialog.open();
		updateLikes();
	});
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

const disableAdmin = () => document.body.classList.remove("admin");
const enableAdmin = () => document.body.classList.add("admin");

disableAdmin();

const updateAdmin = () => {
	disableAdmin();
	fetchIt("/api/v1/admin/test").then(res => {
		if(res.ok){
			enableAdmin();
		}
	});
};

let lastTimeStamp;

let imgs = [];
let myLikes = [];

const updateLikes = () => {
	document.querySelectorAll("[data-timestamp]").forEach(x=>x.mdcFavButton.on = false);
	myLikes.forEach(like => {
		const elems = document.querySelectorAll(`[data-timestamp="${like}"]`);
		elems.forEach(elem => elem.mdcFavButton.on = true);
	});
};

const procFavButton = (favButton, mdcFavButton, id, counter) => {
	favButton.addEventListener("MDCIconButtonToggle:change", e => {
		fetchIt(`/api/v1/picts/${id}/${e.detail.isOn ? "" : "un"}favorite`, {
			method: "PUT"
		}).then(resp => {
			// if the request failed
			if(resp.status === 403){// if you're not signed in
				dialog.open();
			}else if(!resp.ok && resp.status !== 400){
				console.log("ERROR - resetting button", favButton);
				// put the button back where it was
				mdcFavButton.on = !e.detail.isOn;
			}else{
				let diff = 0;
				if(e.detail.isOn){
					myLikes.push(id);
					diff = 1;// add one
				}else {
					const index = myLikes.indexOf(id);
					if(index > -1) myLikes.splice(index, 1);
					diff = -1;// subtract one
				}
				counter.innerText = parseInt(counter.innerText) + diff;
				updateLikes();
			}
		});
	});
};

const procDeleteButton = button => button.addEventListener("click", () => {
		fetchIt("/api/v1/admin/picts/delete/" + pict.timeStamp).then(resp => {
			// if the request succeded, remove the panel
			if(resp.ok){
				panel.remove();
			}
		});
	});

const addPict = pict => {
	console.log(pict);
	const panel = document.createElement("div");
	panel.classList.add("mdc-card");
	panel.setAttribute("data-timestamp", pict.timeStamp);
	panel.innerHTML = `
<div class = "mdc-card__media mdc-card__primary-action" tabindex="0"><img src = "${pict.dispUrl || pict.url}"/>
</div>
<div class="mdc-card__actions mdc-card__actions--full-bleed">
<button class="add-to-favorites mdc-icon-button mdc-card__action mdc-card__action--icon"
 aria-label="Add to favorites"
 aria-hidden="true"
 aria-pressed="false">
 <i class="material-icons mdc-icon-button__icon mdc-icon-button__icon--on">favorite</i>
 <i class="material-icons mdc-icon-button__icon">favorite_border</i>
</button>
<span class = "mdc-typography--overline num-likes">${pict.numUsersVoted}</span>
<button class="material-icons mdc-icon-button mdc-card__action mdc-card__action--icon delete" title="Delete">delete</button>
</div>`;
	// add the panel
	getShortestColumn().appendChild(panel);

	new mdc.ripple.MDCRipple(panel.querySelector(".mdc-card__primary-action"));

	// initalize the button
	const favButton = panel.querySelector("button");
	(new mdc.ripple.MDCRipple(favButton)).unbounded = true;
	const mdcFavButton = new mdc.iconButton.MDCIconButtonToggle(favButton);
	panel.mdcFavButton = mdcFavButton;

	panel.querySelector(".mdc-card__primary-action").onclick = () => showcaseImage(pict.timeStamp);

		// when the button is cliked
	procFavButton(favButton, mdcFavButton, pict.timeStamp, panel.querySelector(".num-likes"));

	procDeleteButton(panel.querySelector(".delete"));
	// console.log("\t" + pict.timeStamp);
	lastTimeStamp = new Date(pict.timeStamp);
	updateLikes();
};

const addImgs = num => {
	let params = "";
	if(lastTimeStamp){
		params = "&startAfter=" + lastTimeStamp.toISOString();
	}
	const url = "/api/v1/picts/get?limit=" + num + params;
	console.log(url);
  return fetchIt(url).then(x=>x.json()).then(data => {
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

let hasLoaded = false;
firebase.auth().onAuthStateChanged(function(user) {
	if(!hasLoaded) addImgs(7 * calcNumColumns(innerWidth));
  if (user) {
		fetchIt("/api/v1/mylikes").then(x=>{
			if(x.ok) return x.json();
			throw new Error(x.statusText);
		}).then(likes => {
			myLikes = likes;
			updateLikes();
		});

		fetchIt("/api/v1/auth/profile").then(x=>x.json()).then(data => {
			updateDarkTheme(data.darkTheme || false);
			darkTheme.checked = data.darkTheme;
		});


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
		updateAdmin();
  } else {
    // User is signed out.
    console.log("SIGNED OUT");
    $("#signed-out").classList.remove("hidden")
    $("#signed-in").classList.add("hidden");
		disableAdmin();
  }
	hasLoaded = true;
});

const updateDarkTheme = isDark => isDark ? document.documentElement.classList.add("dark") : document.documentElement.classList.remove("dark");

const menu = new mdc.menu.MDCMenu($("#settings"));
const darkTheme = new mdc.switchControl.MDCSwitch($("#dark-theme"));
darkTheme.listen("change", () => {
	fetchIt("/api/v1/auth/profile", {method: "PATCH", body: JSON.stringify({darkTheme: darkTheme.checked})}).then(resp => {
		if(!resp.ok) throw new Error(resp.statusText);
		updateDarkTheme(darkTheme.checked);
	}).catch(() => {
		darkTheme.checked = !darkTheme.checked;
	});
});

$("#profile").onclick = () => {
	menu.open = !menu.open;
};

$("button#sign-out").onclick = () => firebase.auth().signOut();
document.querySelectorAll(".sign-in").forEach(button => button.onclick = () => {
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
