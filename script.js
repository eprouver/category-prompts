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
];
let allCats = [];

const { div } = van.tags;
let selectedShape;

const win = new Howl({
  src: ["win.mp3"],
  volume: 0.2,
});

const nope = new Howl({
  src: ["nope.mp3"],
  volume: 0.35,
});

const selectShape = (holder, cat) => {
  [...document.getElementsByClassName("selected")].forEach((ele) =>
    ele.classList.remove("selected")
  );
  holder.classList.add("selected");
  selectedShape = cat;
};

const checkAnswer = (e) => {
  const winner = [...document.getElementsByClassName("cat-picker")]
    .map((el) => el.dataset.correct || false)
    .every((e) => e === "true");

  if (winner) {
    document.getElementById(
      "tries"
    ).innerHTML = `<div class="h1 text-light">You Did It!</div>`;
    win.play();
    [...document.querySelectorAll(".cat-picker")]
      .concat([...document.querySelectorAll(".shape-token")])
      .forEach((el) => {
        el.classList.add("dance");
        el.parentNode.classList.add("selected");
      });
  } else {
    nope.play();
    e.currentTarget.parentNode.removeChild(e.currentTarget);
  }
};

function onReceiveChannelMessageCallback(event) {
  const name = document.getElementById("name").value;
  document.getElementById("wait").innerHTML = `<h1>${name}</h1>`;
  allCats = JSON.parse(event.data);

  van.add(
    document.body,
    div(
      { class: "player-board" },
      div(
        { id: "tries", class: "text-center" },
        ["success", "warning", "danger"].map((color, index) =>
          div(
            {
              class: `btn btn-lg btn-secondary fs-3 m-3 px-3 py-3`,
              onclick: checkAnswer,
            },
            `Submit Shapes`
          )
        )
      ),
      div(
        { class: "d-flex" },
        div(
          { class: "w-50 text-center" },
          structuredClone(allCats)
            .sort(() => Math.random() - 0.5)
            .map((cat) =>
              // category left column
              div(
                {
                  class: "cat-picker",
                  onclick: (e) => {
                    if (!selectedShape) return;
                    [...document.getElementsByClassName("selected")].forEach(
                      (ele) => ele.classList.remove("selected")
                    );
                    e.currentTarget.setAttribute(
                      "class",
                      `${selectedShape.correct.shape} m-4 w-75 d-inline-block cat-picker`
                    );
                    e.currentTarget.style.backgroundColor =
                      selectedShape.correct.color;
                    if (selectedShape.cat.id === cat.cat.id) {
                      e.currentTarget.dataset.correct = true;
                    } else {
                      e.currentTarget.dataset.correct = false;
                    }
                  },
                },
                div({ class: "p-3 py-5 h2 text-light" }, cat.cat.title)
              )
            )
        ),
        div(
          { class: "w-50 text-center" },
          div(
            { class: "d-flex justify-content-center flex-wrap" },
            structuredClone(allCats)
              .sort(() => Math.random() - 0.5)
              .map((cat) =>
                // shapes right column
                div(
                  {
                    onclick: (e) => {
                      selectShape(e.currentTarget, cat);
                    },
                  },
                  div({
                    class: `${cat.correct.shape} shape-token`,
                    style: `background-color: ${cat.correct.color}`,
                  })
                )
              )
          )
        )
      )
    )
  );
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
