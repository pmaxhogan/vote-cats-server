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
			const div = document.createElement("masonry-panel");
			div.innerHTML = `
				<span slot = "img"><img crossorigin = "anonymous" src = "https://cors-anywhere.herokuapp.com/${data.file}"/></span>`;
			getShortestColumn().appendChild(div);
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
