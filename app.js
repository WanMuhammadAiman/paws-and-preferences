const TOTAL_CATS = 12; // fixed number between 10–20 as allowed
let cats = []; // all fetched cat URLs
let currentIndex = 0; // which cat is currently shown
let likedCats = []; // URLs the user liked

const card = document.getElementById("card");
const catImage = document.getElementById("cat-image");
catImage.draggable = false;
const swipeView = document.getElementById("swipe-view");
const summaryView = document.getElementById("summary-view");
const progressText = document.getElementById("progress-text");
const likedCountEl = document.getElementById("liked-count");
const totalCountEl = document.getElementById("total-count");
const likedGrid = document.getElementById("liked-grid");
const noLikedMessage = document.getElementById("no-liked-message");

const btnLike = document.getElementById("btn-like");
const btnDislike = document.getElementById("btn-dislike");
const btnRestart = document.getElementById("btn-restart");

// touch / mouse swipe position
let startX = 0;
let currentX = 0;
let isDragging = false;

/* -----------------------------
   Fetch stable cat URLs
-------------------------------- */

async function fetchCatUrls(count) {
  const tasks = Array.from({ length: count }, async () => {
    try {
      const res = await fetch("https://cataas.com/cat?json=true", {
        cache: "no-store",
      });
      const data = await res.json();

      // prefer full URL from API, fallback to /cat/{id}
      let url = data.url || `https://cataas.com/cat/${data.id}`;

      // add size params (if already has ?, use &)
      const separator = url.includes("?") ? "&" : "?";
      url = `${url}${separator}width=500&height=600`;

      return url;
    } catch (err) {
      console.error("Error fetching cat:", err);
      return null;
    }
  });

  const results = await Promise.all(tasks);

  // filter out failed requests
  return results.filter((url) => url !== null);
}

// simple preload so next images feel instant
function preloadImages(urls) {
  urls.forEach((url) => {
    const img = new Image();
    img.src = url;
  });
}

/* -----------------------------
   App lifecycle
-------------------------------- */

async function initApp() {
  showView("swipe");
  progressText.textContent = "Loading cats…";

  cats = await fetchCatUrls(TOTAL_CATS);

  if (!cats.length) {
    progressText.textContent =
      "Failed to load cats. Please check your connection and refresh.";
    return;
  }

  preloadImages(cats);

  currentIndex = 0;
  likedCats = [];
  showCurrentCat();
}

// toggle between main swipe view and summary
function showView(name) {
  if (name === "swipe") {
    swipeView.classList.add("active");
    summaryView.classList.remove("active");
  } else {
    swipeView.classList.remove("active");
    summaryView.classList.add("active");
  }
}

function showCurrentCat() {
  // no more cats → go to summary
  if (currentIndex >= cats.length) {
    showSummary();
    return;
  }

  const url = cats[currentIndex];

  // show loading overlay while the image loads
  const loader = document.getElementById("loading-overlay");
  loader.classList.remove("hidden");

  const tempImg = new Image();
  tempImg.src = url;

  tempImg.onload = () => {
    // only swap once fully loaded to avoid flicker
    catImage.src = url;
    catImage.alt = `Cat ${currentIndex + 1}`;

    loader.classList.add("hidden");
    updateProgress();
  };

  tempImg.onerror = () => {
    // if this image fails, skip it and move on
    loader.classList.add("hidden");
    progressText.textContent =
      "Failed loading image, skipping to the next cat…";
    currentIndex++;
    showCurrentCat();
  };
}

function updateProgress() {
  const total = cats.length;
  if (currentIndex < total) {
    progressText.textContent = `Cat ${currentIndex + 1} of ${total}`;
  } else {
    progressText.textContent = `All cats viewed`;
  }
}

// record like/dislike, then go to next cat
function handleSwipeResult(liked) {
  const url = cats[currentIndex];
  if (liked) {
    likedCats.push(url);
  }
  currentIndex += 1;
  card.classList.remove("swiping-like", "swiping-dislike");
  btnLike.classList.remove("btn-like-active");
  btnDislike.classList.remove("btn-dislike-active");
  showCurrentCat();
}

// small animation before applying swipe result
function animateAndHandle(liked) {
  const direction = liked ? 1 : -1;
  const offscreenX = window.innerWidth * direction;

  card.style.transition = "transform 0.25s ease-out";
  card.style.transform = `translateX(${offscreenX}px) rotate(${
    direction * 20
  }deg)`;

  setTimeout(() => {
    card.style.transition = "none";
    card.style.transform = "translateX(0) rotate(0deg)";

    // reset button glow after animation
    btnLike.classList.remove("btn-like-active");
    btnDislike.classList.remove("btn-dislike-active");

    handleSwipeResult(liked);
  }, 250);
}

// Like / Dislike buttons (desktop)
btnLike.addEventListener("click", () => {
  btnLike.classList.add("btn-like-active");
  card.classList.add("swiping-like");

  // quick visual feedback only
  setTimeout(() => {
    btnLike.classList.remove("btn-like-active");
  }, 150);

  animateAndHandle(true);
});

btnDislike.addEventListener("click", () => {
  btnDislike.classList.add("btn-dislike-active");
  card.classList.add("swiping-dislike");

  setTimeout(() => {
    btnDislike.classList.remove("btn-dislike-active");
  }, 150);

  animateAndHandle(false);
});

/* -----------------------------
   Touch swipe (mobile)
-------------------------------- */

card.addEventListener("touchstart", (event) => {
  const touch = event.touches[0];
  startX = touch.clientX;
  currentX = startX;
  isDragging = true;
  card.style.transition = "none";
});

card.addEventListener("touchmove", (event) => {
  if (!isDragging) return;

  const touch = event.touches[0];
  currentX = touch.clientX;
  const deltaX = currentX - startX;

  // stop vertical scroll if swiping horizontally
  if (Math.abs(deltaX) > 10) {
    event.preventDefault();
  }

  const rotation = deltaX / 15;
  card.style.transform = `translateX(${deltaX}px) rotate(${rotation}deg)`;

  // reset badges + buttons before applying new state
  card.classList.remove("swiping-like", "swiping-dislike");
  btnLike.classList.remove("btn-like-active");
  btnDislike.classList.remove("btn-dislike-active");

  // show badges + button highlight based on direction
  if (deltaX > 20) {
    card.classList.add("swiping-like");
    btnLike.classList.add("btn-like-active");
  } else if (deltaX < -20) {
    card.classList.add("swiping-dislike");
    btnDislike.classList.add("btn-dislike-active");
  }
});

card.addEventListener("touchend", () => {
  if (!isDragging) return;
  isDragging = false;

  const deltaX = currentX - startX;
  const threshold = 80;

  card.style.transition = "transform 0.25s ease-out";

  if (deltaX > threshold) {
    // like → swipe right
    card.classList.add("swiping-like");
    btnLike.classList.add("btn-like-active");
    animateAndHandle(true);
  } else if (deltaX < -threshold) {
    // dislike → swipe left
    card.classList.add("swiping-dislike");
    btnDislike.classList.add("btn-dislike-active");
    animateAndHandle(false);
  } else {
    // not enough movement → snap back
    card.style.transform = "translateX(0) rotate(0deg)";
    card.classList.remove("swiping-like", "swiping-dislike");
    btnLike.classList.remove("btn-like-active");
    btnDislike.classList.remove("btn-dislike-active");
  }
});

/* -----------------------------
   Mouse swipe (desktop)
-------------------------------- */

let isMouseDown = false;

card.addEventListener("mousedown", (event) => {
  // only left click
  if (event.button !== 0) return;

  event.preventDefault(); // avoid text/image selection

  isMouseDown = true;
  startX = event.clientX;
  currentX = startX;
  card.style.transition = "none";
});

document.addEventListener("mousemove", (event) => {
  if (!isMouseDown) return;

  currentX = event.clientX;
  const deltaX = currentX - startX;

  const rotation = deltaX / 15;
  card.style.transform = `translateX(${deltaX}px) rotate(${rotation}deg)`;

  // reset states before applying new one
  card.classList.remove("swiping-like", "swiping-dislike");
  btnLike.classList.remove("btn-like-active");
  btnDislike.classList.remove("btn-dislike-active");

  // direction feedback
  if (deltaX > 20) {
    card.classList.add("swiping-like");
    btnLike.classList.add("btn-like-active");
  } else if (deltaX < -20) {
    card.classList.add("swiping-dislike");
    btnDislike.classList.add("btn-dislike-active");
  }
});

document.addEventListener("mouseup", () => {
  if (!isMouseDown) return;
  isMouseDown = false;

  const deltaX = currentX - startX;
  const threshold = 80;

  card.style.transition = "transform 0.25s ease-out";

  if (deltaX > threshold) {
    // LIKE
    card.classList.add("swiping-like");
    btnLike.classList.add("btn-like-active");
    animateAndHandle(true);
  } else if (deltaX < -threshold) {
    // DISLIKE
    card.classList.add("swiping-dislike");
    btnDislike.classList.add("btn-dislike-active");
    animateAndHandle(false);
  } else {
    // BACK TO CENTER
    card.style.transform = "translateX(0) rotate(0deg)";
    card.classList.remove("swiping-like", "swiping-dislike");
    btnLike.classList.remove("btn-like-active");
    btnDislike.classList.remove("btn-dislike-active");
  }
});

// if mouse leaves window mid-drag, just stop
window.addEventListener("mouseleave", () => {
  isMouseDown = false;
});

/* -----------------------------
   Summary + restart + keyboard
-------------------------------- */

function showSummary() {
  showView("summary");
  const total = cats.length;
  const likedCount = likedCats.length;

  totalCountEl.textContent = total;
  likedCountEl.textContent = likedCount;

  likedGrid.innerHTML = "";

  if (likedCount === 0) {
    noLikedMessage.classList.remove("hidden");
  } else {
    noLikedMessage.classList.add("hidden");
    likedCats.forEach((url, index) => {
      const img = document.createElement("img");
      img.src = url; // same URL we used during swipe
      img.alt = `Liked cat ${index + 1}`;
      likedGrid.appendChild(img);
    });
  }
}

// restart whole flow with a new batch
btnRestart.addEventListener("click", () => {
  initApp();
});

// keyboard support on desktop (arrow keys)
window.addEventListener("keydown", (event) => {
  if (summaryView.classList.contains("active")) return; // ignore on summary

  if (event.key === "ArrowRight") {
    btnLike.click();
  } else if (event.key === "ArrowLeft") {
    btnDislike.click();
  }
});

// boot up the app once the page is ready
window.addEventListener("load", () => {
  initApp();
});
