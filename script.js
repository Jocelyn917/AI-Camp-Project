// Cozy Cattery Cafe
// Add more cats by copying one object in this array and changing its details.
const cats = [
  { id: "mochi", name: "Mochi", mood: "playful", fur: "#d9975f", marking: "#fff0d4", x: "13%", y: "52%", hunger: 58, happiness: 72, affection: 44 },
  { id: "bean", name: "Bean", mood: "sleepy", fur: "#8b6b5a", marking: "#d9bfa5", x: "43%", y: "47%", hunger: 34, happiness: 63, affection: 70 },
  { id: "peaches", name: "Peaches", mood: "curious", fur: "#f0bd78", marking: "#ffe7ba", x: "66%", y: "55%", hunger: 76, happiness: 51, affection: 36 },
  { id: "nori", name: "Nori", mood: "calm", fur: "#3f3835", marking: "#f4efe7", x: "29%", y: "61%", hunger: 46, happiness: 67, affection: 58 }
];

const catLayer = document.querySelector("#catLayer");
const feedbackLayer = document.querySelector("#feedbackLayer");
const statsGrid = document.querySelector("#statsGrid");
const toolButtons = document.querySelectorAll(".tool-button");
const soundToggle = document.querySelector(".sound-toggle");

let activeTool = "pet";
let soundEnabled = true;
let audioContext;

function clampStat(value) {
  return Math.max(0, Math.min(100, value));
}

function getCatById(id) {
  return cats.find(function(cat) { return cat.id === id; });
}

function renderCats() {
  catLayer.innerHTML = cats.map(function(cat) {
    return "<button class=\"cat " + cat.mood + "\" type=\"button\" data-cat-id=\"" + cat.id + "\" aria-label=\"" + cat.name + ", " + cat.mood + " cat\" style=\"--x: " + cat.x + "; --y: " + cat.y + "; --fur: " + cat.fur + "; --marking: " + cat.marking + ";\">" +
      "<span class=\"bubble\">" + cat.name + "</span>" +
      "<span class=\"cat-tail\"></span>" +
      "<span class=\"cat-body\"></span>" +
      "<span class=\"cat-marking\"></span>" +
      "<span class=\"cat-head\"><span class=\"cat-face\"></span></span>" +
    "</button>";
  }).join("");
}

function renderStats() {
  statsGrid.innerHTML = cats.map(function(cat) {
    return "<article class=\"cat-card\">" +
      "<h3><span>" + cat.name + "</span><span>" + cat.mood + "</span></h3>" +
      statRow("Hunger", cat.hunger, "#e98991") +
      statRow("Happy", cat.happiness, "#ffd166") +
      statRow("Love", cat.affection, "#8ab17d") +
    "</article>";
  }).join("");
}

function statRow(label, value, color) {
  return "<div class=\"stat-row\"><span>" + label + "</span>" +
    "<span class=\"meter\" style=\"--meter-color: " + color + ";\"><span style=\"--value: " + value + "%;\"></span></span>" +
    "<span>" + value + "</span></div>";
}

function setActiveTool(nextTool) {
  activeTool = nextTool;
  toolButtons.forEach(function(button) {
    const isActive = button.dataset.tool === nextTool;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function interactWithCat(catId, catElement) {
  const cat = getCatById(catId);
  if (!cat) return;

  if (activeTool === "feed") {
    feedCat(cat, catElement);
  } else {
    petCat(cat, catElement);
  }

  renderStats();
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

function animateCat(catElement, className) {
  catElement.classList.remove("happy", "eating", "pet");
  void catElement.offsetWidth;
  catElement.classList.add(className, "happy");
  window.setTimeout(function() { catElement.classList.remove(className, "happy"); }, 620);
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
  const icons = { heart: "<3", sparkle: "*", meow: "meow!", purr: "purr", "+ food": "+ food" };
  return icons[message] || message;
}

function handleObjectClick(objectType, objectElement) {
  const nearestCat = findNearestCat(objectElement);

  if (objectType === "bowl" || objectType === "treats") {
    setActiveTool("feed");
    if (nearestCat) feedCat(nearestCat.cat, nearestCat.element);
  }

  if (objectType === "yarn") {
    cats.forEach(function(cat) { cat.happiness = clampStat(cat.happiness + 8); });
    showObjectFeedback(objectElement, "play!");
    playTone(740, 0.09, "square");
  }

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

function findNearestCat(objectElement) {
  const objectBox = objectElement.getBoundingClientRect();
  const objectCenter = { x: objectBox.left + objectBox.width / 2, y: objectBox.top + objectBox.height / 2 };

  return Array.from(document.querySelectorAll(".cat"))
    .map(function(element) {
      const box = element.getBoundingClientRect();
      const center = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
      return { element: element, cat: getCatById(element.dataset.catId), distance: Math.hypot(center.x - objectCenter.x, center.y - objectCenter.y) };
    })
    .filter(function(item) { return item.cat; })
    .sort(function(a, b) { return a.distance - b.distance; })[0];
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
  interactWithCat(catElement.dataset.catId, catElement);
});

document.querySelectorAll(".object").forEach(function(objectElement) {
  objectElement.addEventListener("click", function() { handleObjectClick(objectElement.dataset.object, objectElement); });
});

renderCats();
renderStats();
window.setInterval(slowlyIncreaseHunger, 8000);
