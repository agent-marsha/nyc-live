/* NYC live camera wall — data from the NYC DOT traffic camera network.
   The camera list is baked into cameras.json at build time; the images are
   streamed live from webcams.nyctmc.org. */
(() => {
  const SRC = "https://webcams.nyctmc.org/api/cameras/";
  const img = (id, t) => SRC + id + "/image?t=" + t;

  const PER_PAGE = 12;
  const state = { all: [], list: [], page: 1, borough: "All", q: "", rate: 2500,
                  paused: false, featured: null };

  const $ = (s) => document.querySelector(s);
  const elGrid = $("#grid"), elMore = $("#more");
  const elHeroImg = $("#hero-img"), elHeroName = $("#hero-name"),
        elHeroMeta = $("#hero-meta"), elHeroBadge = $("#hero-badge");
  const elCount = $("#count"), elClock = $("#clock");

  /* ---------------------------------------------------------------- clock */
  const clockFmt = new Intl.DateTimeFormat("en-US",
    { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  setInterval(() => { elClock.textContent = clockFmt.format(new Date()) + " NYC"; }, 1000);

  /* --------------------------------------------------------------- helpers */
  const visible = new Set();          // tiles currently on screen
  const timers = new Map();           // tile element -> interval id
  let heroTimer = null;

  function stopTile(t) {
    const id = timers.get(t);
    if (id) { clearInterval(id); timers.delete(t); }
  }
  function startTile(t) {
    const cam = t._cam;
    const load = () => {
      if (state.paused || !visible.has(t)) return;
      t._img.src = img(cam.id, Date.now());
    };
    load();
    stopTile(t);
    timers.set(t, setInterval(load, state.rate + Math.random() * 400)); // small jitter
  }

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const t = e.target;
      if (e.isIntersecting) { visible.add(t); startTile(t); }
      else { visible.delete(t); stopTile(t); }
    }
  }, { rootMargin: "300px" });

  /* ------------------------------------------------------------------ UI */
  function matches(c) {
    if (state.borough !== "All" && c.area !== state.borough) return false;
    if (state.q && !(c.name.toLowerCase().includes(state.q) || c.area.toLowerCase().includes(state.q))) return false;
    return true;
  }

  function apply() {
    state.list = state.all.filter(matches);
    state.page = 1;
    renderGrid(true);
    elCount.textContent = state.list.length.toLocaleString() + " cameras";
    if (!state.featured || !matches(state.featured)) {
      const pick = state.list.find(c => c.area === "Manhattan") || state.list[0];
      if (pick) feature(pick);
    }
  }

  function renderGrid(reset) {
    if (reset) { elGrid.innerHTML = ""; timers.forEach((v, k) => stopTile(k)); }
    const upto = state.page * PER_PAGE;
    const slice = state.list.slice(reset ? 0 : elGrid.children.length, upto);
    for (const cam of slice) elGrid.appendChild(makeTile(cam));
    elMore.hidden = state.list.length <= upto;
    elMore.textContent = "Show " + Math.min(PER_PAGE, state.list.length - upto) + " more";
  }

  function makeTile(cam) {
    const t = document.createElement("button");
    t.className = "tile";
    t.type = "button";
    t._cam = cam;
    t.innerHTML = '<span class="ph"><img alt="" loading="lazy"><span class="off">NO SIGNAL</span></span>' +
                  '<span class="n"></span><span class="b"></span>';
    t.querySelector(".n").textContent = cam.name;
    t.querySelector(".b").textContent = (cam.area || "").toUpperCase();
    t._img = t.querySelector("img");
    t._img.addEventListener("error", () => t.classList.add("err"));
    t._img.addEventListener("load", () => t.classList.remove("err"));
    t.addEventListener("click", () => feature(cam));
    io.observe(t);
    return t;
  }

  function feature(cam) {
    state.featured = cam;
    elHeroName.textContent = cam.name;
    elHeroMeta.innerHTML =
      (cam.area || "—") + " &nbsp;·&nbsp; " + cam.lat.toFixed(5) + ", " + cam.lng.toFixed(5) +
      '<br><span id="hero-ts" class="mono"></span>';
    elHeroBadge.className = "badge";
    elHeroBadge.innerHTML = '<span class="livedot"></span>LIVE';
    for (const t of elGrid.children) t.setAttribute("aria-current", String(t._cam === cam));

    const paint = () => {
      if (state.paused) return;
      elHeroImg.src = img(cam.id, Date.now());
      const ts = document.getElementById("hero-ts");
      if (ts) ts.textContent = "frame " + clockFmt.format(new Date());
    };
    elHeroImg.onerror = () => { elHeroBadge.className = "badge off"; elHeroBadge.textContent = "NO SIGNAL"; };
    paint();
    clearInterval(heroTimer);
    heroTimer = setInterval(paint, Math.max(1000, state.rate));
  }

  /* --------------------------------------------------------------- events */
  document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", "false"));
      chip.setAttribute("aria-pressed", "true");
      state.borough = chip.dataset.area;
      apply();
    });
  });
  $("#q").addEventListener("input", (e) => { state.q = e.target.value.trim().toLowerCase(); apply(); });
  $("#shuffle").addEventListener("click", () => {
    const pool = state.list;
    if (pool.length) feature(pool[Math.floor(Math.random() * pool.length)]);
  });
  $("#rate").addEventListener("change", (e) => { state.rate = +e.target.value; refreshTimers(); });
  $("#pause").addEventListener("click", (e) => {
    state.paused = !state.paused;
    e.target.textContent = state.paused ? "Resume" : "Pause";
    e.target.classList.toggle("primary", state.paused);
    refreshTimers();
  });
  elMore.addEventListener("click", () => { state.page++; renderGrid(false); });

  function refreshTimers() {
    for (const t of [...timers.keys()]) { stopTile(t); if (visible.has(t)) startTile(t); }
    if (state.featured) feature(state.featured);
  }

  /* ----------------------------------------------------------------- boot */
  fetch("cameras.json").then(r => r.json()).then(d => {
    state.all = d.c.map(([id, name, lat, lng, area]) => ({ id, name, lat, lng, area }));
    $("#total").textContent = state.all.length.toLocaleString();
    apply();
  }).catch(() => {
    elGrid.innerHTML = '<p style="color:#7C8896">Could not load cameras.json</p>';
  });
})();
