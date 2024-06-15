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
  "#919191", // Darkened Gray
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
  "ribbon",
].sort(() => Math.random() - 0.5);

const board = document.getElementById("board");
const topContainer = document.getElementById("top-container");
const startButton = document.getElementById("start-button");
let stillPlaying = true;
const maxCats = Math.min(
  new URLSearchParams(window.location.search).get("cats") || 5,
  9
);
document.getElementById("prompts").innerText = maxCats;
const bgsound = new Howl({
  src: ["wall.mp3"],
  volume: 0.35,
});

startButton.addEventListener("click", (e) => {
  e.stopPropagation();
  e.preventDefault();

  startConnection();

  bgsound.play();

  document.body.addEventListener("click", () => {
    board.classList.toggle("hidden");
    topContainer.classList.toggle("hidden");
    stillPlaying = !stillPlaying;
    window.scrollTo(0, 0);
  });

  description.classList.add("hidden");

  const { div } = van.tags;

  /* Adjust colors */
  // van.add(
  //   document.body,
  //   colors.map(c => div({class: 'box', style: `background-color: ${c}`})))

  const root = "https://en.wikipedia.org";
  const caturl =
    "/w/api.php?&origin=*&format=json&action=query&list=random&rnnamespace=14&rnlimit=50";
  const pageurl = (v) =>
    "/w/api.php?&origin=*&format=json&action=query&list=categorymembers&cmpageid=" +
    v.id +
    "&cmlimit=30&cmsort=timestamp&cmdir=asc";

  const trimTitle = (title) =>
    title
      .replace(/(Category:|Talk:|Stub-Class|List-Class|Template:|File:)/g, "")
      .trim();

  const totesLev = (str1, str2) => {
    let total = 0;
    const regex = /[^a-zA-Z\s]/g;
    const array1 = str1.replace(regex, "").split(" ");
    const array2 = str2.replace(regex, "").split(" ");

    const levDist = (s, t) => {
      if (!s.length) return t.length;
      if (!t.length) return s.length;
      const arr = [];
      for (let i = 0; i <= t.length; i++) {
        arr[i] = [i];
        for (let j = 1; j <= s.length; j++) {
          arr[i][j] =
            i === 0
              ? j
              : Math.min(
                  arr[i - 1][j] + 1,
                  arr[i][j - 1] + 1,
                  arr[i - 1][j - 1] + (s[j - 1] === t[i - 1] ? 0 : 1)
                );
        }
      }
      return arr[t.length][s.length];
    };

    const func = (elem1, elem2) => {
      const step = levDist(elem1, elem2);
      if (step < 2) {
        total += 10;
      }
    };

    for (let i = 0; i < array1.length; i++) {
      const elem1 = array1[i];

      for (let j = 0; j < array2.length; j++) {
        const elem2 = array2[j];
        func(elem1, elem2);
      }
    }

    return total;
  };

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
          .map((cat) => {
            const trimmed = trimTitle(cat.cat.title);
            cat.pages = cat.pages
              .filter((page) => !/(^talk:)|(^user:)/i.test(page.title))
              .filter((page) => page.title !== cat.cat.title)
              .filter((page) => totesLev(trimmed, trimTitle(page.title)) < 21);
            return cat;
          })
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
            data.correct = {
              index: i,
              color: colors[i],
              id: data.cat.id,
              shape: shapes[i],
            };
            return data;
          });

        sendData(
          JSON.stringify(
            structuredClone(allCats).map((cat) => {
              delete cat.pages;
              return cat;
            })
          )
        );

        van.add(
          topContainer,
          div(
            // overflow container
            { class: "container-fluid p-2 overflow-scroll bg-secondary" },
            div(
              // layout container
              { class: "d-flex" },
              allCats.map((cat) =>
                div(
                  // category container
                  { class: "m-2 border border-secondary p-2 flex-grow-1" },
                  div(
                    // category title container
                    { class: "h2 text-center" },
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
                            }`,
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
        let next = 40;

        const launch = (timestamp) => {
          const progress = timestamp - lastTime;

          if (progress > (16000 / window.innerWidth) * next && stillPlaying) {
            next += 2;
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
});

function onReceiveChannelMessageCallback(event) {
  console.log("onReceiveChannelMessageCallback");
  console.log("Received Message", event.data);
}

function onSendChannelMessageCallback(event) {
  console.log("onSendChannelMessageCallback");
  console.log("Received Message", event.data);
}

function onSendChannelStateChange() {
  console.log("onSendChannelStateChange");
  const readyState = sendChannel.readyState;
  console.log("Send channel state is: " + readyState);
}

function onReceiveChannelStateChange() {
  console.log("onReceiveChannelStateChange");
  const readyState = receiveChannel.readyState;
  console.log(`Receive channel state is: ${readyState}`);
}

function receiveChannelCallback(event) {
  console.log("receiveChannelCallback");
  receiveChannel = event.channel;
  receiveChannel.onmessage = onReceiveChannelMessageCallback;
  receiveChannel.onopen = onReceiveChannelStateChange;
  receiveChannel.onclose = onReceiveChannelStateChange;
}
