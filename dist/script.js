const colors = [
  "#6EC6E0", // Darkened Light Blue
  "#2FB2B2", // Darkened Aqua
  "#36865C", // Darkened Olive
  "#28C232", // Darkened Green
  "#ddB700", // Darkened Yellow
  "#E67315", // Darkened Orange
  "#E6382D", // Darkened Red
  "#76123D", // Darkened Maroon
  "#A10DB5", // Darkened Purple
  "#919191" // Darkened Gray
].sort(() => Math.random() - 0.5);
const shapes = [
  "hex",
  "paral",
  "trap",
  "curved",
  "scoop",
  "scallop",
  "heart",
  "film",
  "cloud",
  "circle",
  "ribbon"
].sort(() => Math.random() - 0.5);

const board = document.getElementById("board");
const topContainer = document.getElementById("top-container");
let stillPlaying = true;
const maxCats = 5;

document.body.addEventListener("click", () => {
  board.classList.toggle("hidden");
  topContainer.classList.toggle("hidden");
  stillPlaying = !stillPlaying;
  window.scrollTo(0,0);
});

const { div } = van.tags;

/* Adjust colors */
// van.add(
//   document.body,
//   colors.map(c => div({class: 'box', style: `background-color: ${c}`})))

const root = "https://en.wikipedia.org";
const caturl =
  "/w/api.php?&origin=*&format=json&action=query&list=random&rnnamespace=14&rnlimit=20";
const pageurl = (v) =>
  "/w/api.php?&origin=*&format=json&action=query&list=categorymembers&cmpageid=" +
  v.id +
  "&cmlimit=30&cmsort=timestamp&cmdir=asc";

const trimTitle = (title) =>
  title
    .replace(/(Category:|Talk:|Stub-Class|List-Class|Template:)/g, "")
    .trim();
let allCats;

fetch(root + caturl)
  .then((response) => response.json())
  .then((data) => data.query.random)
  .then((cats) => {
    // find pages for each of the categories
    return cats.map((cat) => {
      return fetch(root + pageurl(cat))
        .then((response) => response.json())
        .then((data) => {
          const pages = data.query.categorymembers
            .sort(() => Math.random() - 0.5)
            .slice(0, 10);
          return { cat, pages };
        });
    });
  })
  .then((data) => {
    Promise.all(data).then((data) => {
      allCats = data
        .filter((cat) => cat.pages.length > 5)
        .slice(0, maxCats)
        .map((data, i) => {
          // trim title of category
          data.cat.title = trimTitle(data.cat.title);
          // remove for client transmission
          data.cat.color = colors[i];
          data.pages.map((page) => {
            page.title = trimTitle(page.title);
            page.color = colors[i];
          });
          data.correct = { index: i, color: colors[i], id: data.cat.id };
          return data;
        });

      van.add(
        topContainer,
        div(
          // overflow container
          { class: "container-fluid p-2 overflow-scroll" },
          div(
            // layout container
            { class: "d-flex" },
            allCats.map((cat) =>
              div(
                // category container
                { class: "m-2 border p-2 flex-grow-1" },
                div(
                  // category title container
                  { class: "h2" },
                  cat.cat.title
                ),
                div(
                  cat.pages.map((page) =>
                    div(
                      { class: "clue-holder d-inline-block" },
                      div(
                        // page / clue container
                        {
                          class: `my-1 text-center clue d-flex justify-content-center flex-column ${
                            shapes[cat.correct.index]
                          }`,
                          style: `background-color: ${
                            colors[cat.correct.index]
                          }`
                        },
                        div({ class: "text" }, page.title)
                      )
                    )
                  )
                )
              )
            )
          )
        )
      );

      let lastTime = 0;
      let next = 50;

      const launch = (timestamp) => {
        const progress = timestamp - lastTime;

        if (progress > (16000 / window.innerWidth) * next && stillPlaying) {
          next += 5;
          lastTime = timestamp;

          const clue = [...document.getElementsByClassName("clue-holder")]
            .sort(() => Math.random() - 0.5)[0]
            .cloneNode(true);
          clue.style.left = `${
            -10 + Math.random() * (window.innerWidth - 240)
          }px`;
          clue.style.zIndex = ~~(Math.random() * 10);

          clue.addEventListener("animationend", () => {
            board.removeChild(clue);
          });
          board.appendChild(clue);
        }

        requestAnimationFrame(launch);
      };

      requestAnimationFrame(launch);
    });
  });