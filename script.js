// Cozy Cattery Cafe
// Add more cats by copying one object in this array and changing its details.
const cats = [
  { id: "mochi", name: "Mochi", mood: "playful", fur: "#d9975f", marking: "#fff0d4", x: "13%", y: "52%", hunger: 58, happiness: 72, affection: 44 },
  { id: "bean", name: "Bean", mood: "sleepy", fur: "#8b6b5a", marking: "#d9bfa5", x: "43%", y: "47%", hunger: 34, happiness: 63, affection: 70 },
  { id: "peaches", name: "Peaches", mood: "curious", fur: "#f0bd78", marking: "#ffe7ba", x: "66%", y: "55%", hunger: 76, happiness: 51, affection: 36 },
  { id: "nori", name: "Nori", mood: "calm", fur: "#3f3835", marking: "#f4efe7", x: "29%", y: "61%", hunger: 46, happiness: 67, affection: 58 }
];

const catLayer = document.querySelector("#catLayer");
const cafe = document.querySelector("#cafe");
const feedbackLayer = document.querySelector("#feedbackLayer");
const statsGrid = document.querySelector("#statsGrid");
const toolButtons = document.querySelectorAll(".tool-button");
const soundToggle = document.querySelector(".sound-toggle");
const topBar = document.querySelector(".top-bar");

let activeTool = "pet";
let soundEnabled = true;
let audioContext;
let heldItem = null;
let activeCatId = null;
let hungerTimer;

const itemKinds = {
  bowl: "food",
  treats: "food",
  yarn: "toy",
  pillow: "comfort",
  plant: "decor"
};

const hint = document.createElement("p");
hint.className = "play-hint";
hint.textContent = "Click food, treats, or yarn to pick it up. Move the mouse, then click again to drop it on a cat.";
topBar.querySelector("div").appendChild(hint);

const catModal = document.createElement("section");
catModal.className = "cat-modal";
catModal.setAttribute("aria-hidden", "true");
catModal.innerHTML =
  '<div class="cat-room" role="dialog" aria-modal="true" aria-labelledby="modalCatName">' +
    '<button class="back-cafe" type="button">Back to Cafe</button>' +
    '<div class="cat-spotlight">' +
      '<div class="detail-cat" id="detailCat">' +
        '<span class="detail-tail"></span><span class="detail-body"></span><span class="detail-marking"></span>' +
        '<span class="detail-head"><span class="detail-face"></span><span class="whiskers left"></span><span class="whiskers right"></span></span>' +
        '<span class="detail-paw left"></span><span class="detail-paw right"></span>' +
      '</div>' +
      '<div class="modal-feedback" id="modalFeedback" aria-live="polite"></div>' +
    '</div>' +
    '<aside class="cat-room-panel">' +
      '<p class="eyebrow">Cat corner</p><h2 id="modalCatName"></h2><p id="modalMood"></p>' +
      '<div id="modalStats"></div>' +
      '<div class="modal-actions"><button type="button" data-cat-action="feed">Feed</button><button type="button" data-cat-action="pet">Pet</button><button type="button" data-cat-action="play">Play</button></div>' +
    '</aside>' +
  '</div>';
document.body.appendChild(catModal);

const detailCat = document.querySelector("#detailCat");
const modalCatName = document.querySelector("#modalCatName");
const modalMood = document.querySelector("#modalMood");
const modalStats = document.querySelector("#modalStats");
const modalFeedback = document.querySelector("#modalFeedback");

function clampStat(value) {
  return Math.max(0, Math.min(100, value));
}

function getCatById(id) {
  return cats.find(function(cat) { return cat.id === id; });
}

function renderCats() {
  catLayer.innerHTML = cats.map(function(cat) {
    return '<button class="cat ' + cat.mood + '" type="button" data-cat-id="' + cat.id + '" aria-label="Open ' + cat.name + ' interaction screen" style="--x: ' + cat.x + '; --y: ' + cat.y + '; --fur: ' + cat.fur + '; --marking: ' + cat.marking + ';">' +
      '<span class="bubble">' + cat.name + '</span>' +
      '<span class="cat-tail"></span>' +
      '<span class="cat-body"></span>' +
      '<span class="cat-marking"></span>' +
      '<span class="cat-head"><span class="cat-face"></span></span>' +
    '</button>';
  }).join("");
}

function renderStats() {
  statsGrid.innerHTML = cats.map(function(cat) {
    return '<article class="cat-card">' +
      '<h3><span>' + cat.name + '</span><span>' + cat.mood + '</span></h3>' +
      statRow("Hunger", cat.hunger, "#e98991") +
      statRow("Happy", cat.happiness, "#ffd166") +
      statRow("Love", cat.affection, "#8ab17d") +
    '</article>';
  }).join("");

  if (activeCatId) renderModalStats();
}

function statRow(label, value, color) {
  return '<div class="stat-row"><span>' + label + '</span>' +
    '<span class="meter" style="--meter-color: ' + color + ';"><span style="--value: ' + value + '%;"></span></span>' +
    '<span>' + value + '</span></div>';
}

function setActiveTool(nextTool) {
  activeTool = nextTool;
  toolButtons.forEach(function(button) {
    const isActive = button.dataset.tool === nextTool;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function feedCat(cat, catElement) {
  cat.hunger = clampStat(cat.hunger - 22);
  cat.happiness = clampStat(cat.happiness + 8);
  showCatMessage(catElement, "nom nom");
  burst(catElement, ["+ food", "meow", "sparkle"], "sparkle");
  playTone(330, 0.12, "triangle");
  animateCat(catElement, "eating");
}

function petCat(cat, catElement) {
  cat.affection = clampStat(cat.affection + 18);
  cat.happiness = clampStat(cat.happiness + 14);
  cat.hunger = clampStat(cat.hunger + 3);
  showCatMessage(catElement, "purr...");
  burst(catElement, ["heart", "purr", "heart"], "");
  playTone(520, 0.1, "sine");
  window.setTimeout(function() { playTone(650, 0.08, "sine"); }, 90);
  animateCat(catElement, "pet");
}

function playWithCat(cat, catElement) {
  cat.happiness = clampStat(cat.happiness + 20);
  cat.affection = clampStat(cat.affection + 8);
  cat.hunger = clampStat(cat.hunger + 5);
  showCatMessage(catElement, "play time!");
  burst(catElement, ["sparkle", "bounce", "meow"], "sparkle");
  playTone(740, 0.09, "square");
  animateCat(catElement, "play");
}

function animateCat(catElement, className) {
  catElement.classList.remove("happy", "eating", "pet", "play");
  void catElement.offsetWidth;
  catElement.classList.add(className, "happy");
  window.setTimeout(function() { catElement.classList.remove(className, "happy"); }, 720);
}

function showCatMessage(catElement, text) {
  const bubble = catElement.querySelector(".bubble");
  bubble.textContent = text;
  window.clearTimeout(catElement.messageTimer);
  catElement.messageTimer = window.setTimeout(function() {
    const cat = getCatById(catElement.dataset.catId);
    bubble.textContent = cat ? cat.name : "meow";
  }, 1100);
}

function burst(anchor, messages, extraClass) {
  const anchorBox = anchor.getBoundingClientRect();
  const cafeBox = feedbackLayer.getBoundingClientRect();

  messages.forEach(function(message, index) {
    const item = document.createElement("span");
    item.className = "floaty " + extraClass;
    item.textContent = decorateMessage(message);
    item.style.left = (anchorBox.left - cafeBox.left + anchorBox.width * (0.35 + index * 0.12)) + "px";
    item.style.top = (anchorBox.top - cafeBox.top + 12 + index * 8) + "px";
    item.style.animationDelay = (index * 70) + "ms";
    feedbackLayer.appendChild(item);
    item.addEventListener("animationend", function() { item.remove(); });
  });
}

function decorateMessage(message) {
  const icons = { heart: "<3", sparkle: "*", meow: "meow!", purr: "purr", "+ food": "+ food", bounce: "bounce!" };
  return icons[message] || message;
}

function startHoldingItem(objectElement, event) {
  const objectType = objectElement.dataset.object;
  const itemType = itemKinds[objectType];

  if (itemType !== "food" && itemType !== "toy") {
    handleObjectClick(objectType, objectElement);
    return;
  }

  heldItem = {
    element: objectElement,
    objectType: objectType,
    itemType: itemType,
    left: objectElement.style.left,
    top: objectElement.style.top,
    right: objectElement.style.right,
    bottom: objectElement.style.bottom
  };

  objectElement.classList.add("held");
  document.body.classList.add("holding-item");
  hint.textContent = "Move the held item over a cat. Click again to drop it, or press Escape to cancel.";
  moveHeldItem(event);
}

function moveHeldItem(event) {
  if (!heldItem) return;
  const cafeBox = cafe.getBoundingClientRect();
  const item = heldItem.element;

  item.style.left = (event.clientX - cafeBox.left - item.offsetWidth / 2) + "px";
  item.style.top = (event.clientY - cafeBox.top - item.offsetHeight / 2) + "px";
  item.style.right = "auto";
  item.style.bottom = "auto";
}

function dropHeldItem(event) {
  if (!heldItem) return;

  const catElement = findCatAtPoint(event.clientX, event.clientY);
  if (catElement) {
    const cat = getCatById(catElement.dataset.catId);
    if (heldItem.itemType === "food") feedCat(cat, catElement);
    if (heldItem.itemType === "toy") playWithCat(cat, catElement);
    hint.textContent = heldItem.itemType === "food" ? cat.name + " enjoyed a snack." : cat.name + " had a playful moment.";
    renderStats();
  } else {
    hint.textContent = "Dropped softly. Pick the item up again whenever you want.";
  }

  releaseHeldItem();
}

function cancelHeldItem() {
  if (!heldItem) return;
  hint.textContent = "Holding cancelled. The cursor is back to normal.";
  releaseHeldItem();
}

function releaseHeldItem() {
  const item = heldItem.element;
  item.classList.remove("held");
  item.style.left = heldItem.left;
  item.style.top = heldItem.top;
  item.style.right = heldItem.right;
  item.style.bottom = heldItem.bottom;
  heldItem = null;
  document.body.classList.remove("holding-item");
}

function findCatAtPoint(x, y) {
  return Array.from(document.querySelectorAll(".cat")).find(function(catElement) {
    const box = catElement.getBoundingClientRect();
    return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
  });
}

function handleObjectClick(objectType, objectElement) {
  if (objectType === "pillow") {
    cats.forEach(function(cat) {
      cat.happiness = clampStat(cat.happiness + 5);
      cat.affection = clampStat(cat.affection + 4);
    });
    showObjectFeedback(objectElement, "cozy");
    playTone(430, 0.12, "sine");
  }

  if (objectType === "plant") {
    showObjectFeedback(objectElement, "sniff sniff");
    playTone(610, 0.08, "triangle");
  }

  renderStats();
}

function showObjectFeedback(objectElement, text) {
  burst(objectElement, [text, "sparkle"], "sparkle");
  objectElement.animate([
    { transform: "translateY(0) rotate(0deg)" },
    { transform: "translateY(-8px) rotate(-3deg)" },
    { transform: "translateY(0) rotate(0deg)" }
  ], { duration: 360, easing: "ease-out" });
}

function openCatScreen(catId) {
  const cat = getCatById(catId);
  if (!cat) return;

  activeCatId = catId;
  modalCatName.textContent = cat.name;
  modalMood.textContent = "Mood: " + cat.mood;
  detailCat.style.setProperty("--fur", cat.fur);
  detailCat.style.setProperty("--marking", cat.marking);
  detailCat.className = "detail-cat " + cat.mood;
  modalFeedback.textContent = "";
  renderModalStats();
  catModal.classList.add("open");
  catModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeCatScreen() {
  activeCatId = null;
  catModal.classList.remove("open");
  catModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function renderModalStats() {
  const cat = getCatById(activeCatId);
  if (!cat) return;
  modalStats.innerHTML = statRow("Hunger", cat.hunger, "#e98991") + statRow("Happy", cat.happiness, "#ffd166") + statRow("Love", cat.affection, "#8ab17d");
}

function runModalAction(action) {
  const cat = getCatById(activeCatId);
  const cafeCat = document.querySelector(".cat[data-cat-id='" + activeCatId + "']");
  if (!cat || !cafeCat) return;

  detailCat.classList.remove("modal-pet", "modal-eat", "modal-play");
  void detailCat.offsetWidth;

  if (action === "feed") {
    feedCat(cat, cafeCat);
    detailCat.classList.add("modal-eat");
    modalFeedback.textContent = "nom nom... tiny cafe crunches";
  }

  if (action === "pet") {
    petCat(cat, cafeCat);
    detailCat.classList.add("modal-pet");
    modalFeedback.textContent = "purr purr <3";
  }

  if (action === "play") {
    playWithCat(cat, cafeCat);
    detailCat.classList.add("modal-play");
    modalFeedback.textContent = "bounce bounce sparkle!";
  }

  renderStats();
  window.setTimeout(function() {
    detailCat.classList.remove("modal-pet", "modal-eat", "modal-play");
  }, 900);
}

// Web Audio creates tiny local sounds without needing audio files.
function playTone(frequency, duration, waveType) {
  if (!soundEnabled) return;
  audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = waveType;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration + 0.02);
}

function slowlyIncreaseHunger() {
  cats.forEach(function(cat) {
    cat.hunger = clampStat(cat.hunger + 1);
    if (cat.hunger > 82) cat.happiness = clampStat(cat.happiness - 1);
  });
  renderStats();
}

toolButtons.forEach(function(button) {
  button.addEventListener("click", function() { setActiveTool(button.dataset.tool); });
});

soundToggle.addEventListener("click", function() {
  soundEnabled = !soundEnabled;
  soundToggle.textContent = soundEnabled ? "Sound On" : "Sound Off";
  soundToggle.setAttribute("aria-pressed", String(soundEnabled));
});

catLayer.addEventListener("click", function(event) {
  const catElement = event.target.closest(".cat");
  if (!catElement) return;

  if (heldItem) {
    dropHeldItem(event);
    return;
  }

  openCatScreen(catElement.dataset.catId);
});

document.querySelectorAll(".object").forEach(function(objectElement) {
  objectElement.addEventListener("click", function(event) {
    event.stopPropagation();
    if (heldItem) dropHeldItem(event);
    else startHoldingItem(objectElement, event);
  });
});

cafe.addEventListener("click", function(event) {
  if (heldItem) dropHeldItem(event);
});

window.addEventListener("mousemove", moveHeldItem);
window.addEventListener("keydown", function(event) {
  if (event.key === "Escape") {
    if (heldItem) cancelHeldItem();
    else if (catModal.classList.contains("open")) closeCatScreen();
  }
});

catModal.querySelector(".back-cafe").addEventListener("click", closeCatScreen);
catModal.querySelectorAll("[data-cat-action]").forEach(function(button) {
  button.addEventListener("click", function() { runModalAction(button.dataset.catAction); });
});

renderCats();
renderStats();
hungerTimer = window.setInterval(slowlyIncreaseHunger, 8000);
