/* NYC LIVE — the player page that runs inside an X post.
   One live NYC DOT camera at a time, refreshed ~1x/sec, with tap / arrow controls. */
(() => {
  const SRC = "https://webcams.nyctmc.org/api/cameras/";
  const url = (id, t) => SRC + id + "/image?t=" + t;
  const RATE = 1000;

  const $ = (s) => document.querySelector(s);
  const elImg = $("#view"), elName = $("#name"), elArea = $("#area"),
        elClock = $("#clock"), elIdx = $("#idx"), elBadge = $("#badge");

  let all = [], queue = [], pos = 0, paused = false, timer = null;

  const clockFmt = new Intl.DateTimeFormat("en-US",
    { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  setInterval(() => { elClock.textContent = clockFmt.format(new Date()); }, 1000);

  /* Preload each frame, then swap, so there is never a black flash. */
  const pre = new Image();
  let want = null;

  function live(on) {
    elBadge.className = on ? "badge" : "badge off";
    elBadge.innerHTML = on ? '<span class="livedot"></span>LIVE' : "NO SIGNAL";
  }

  function tick() {
    if (paused) return;
    const cam = queue[pos];
    if (!cam) return;
    want = cam.id;
    const u = url(cam.id, Date.now());
    pre.onload = () => {
      if (want !== cam.id) return;   // the user already moved on
      elImg.src = u;
      live(true);
    };
    pre.onerror = () => { if (want === cam.id) live(false); };
    pre.src = u;
  }

  function show(cam) {
    elName.textContent = cam.name;
    elArea.textContent = (cam.area || "—").toUpperCase();
    elIdx.textContent = (pos + 1) + " / " + queue.length;
    live(true);
    tick();
  }

  function restart() { clearInterval(timer); timer = setInterval(tick, RATE); }

  function step(d) {
    if (!queue.length) return;
    pos = (pos + d + queue.length) % queue.length;
    show(queue[pos]);
  }

  function draw() {
    if (!all.length) return;
    const cam = all[Math.floor(Math.random() * all.length)];
    let i = queue.findIndex(c => c.id === cam.id);
    if (i < 0) { queue.push(cam); i = queue.length - 1; }
    pos = i;
    show(cam);
    renderThumbs();
  }

  /* three suggested cameras, so a tap gets you somewhere new */
  function renderThumbs() {
    const el = $("#thumbs");
    const picks = [];
    while (picks.length < 3 && all.length) {
      const c = all[Math.floor(Math.random() * all.length)];
      if (c.id !== queue[pos]?.id && !picks.some(p => p.id === c.id)) picks.push(c);
    }
    el.innerHTML = "";
    for (const cam of picks) {
      const b = document.createElement("button");
      b.type = "button";
      b.innerHTML = '<img alt=""><span></span>';
      b.querySelector("span").textContent = cam.name;
      b.querySelector("img").src = url(cam.id, Date.now());
      b.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        let i = queue.findIndex(c => c.id === cam.id);
        if (i < 0) { queue.push(cam); i = queue.length - 1; }
        pos = i;
        show(cam);
      });
      el.appendChild(b);
    }
  }

  /* ------------------------------------------------------------- controls */
  $("#prev").addEventListener("pointerdown", (e) => { e.stopPropagation(); step(-1); });
  $("#next").addEventListener("pointerdown", (e) => { e.stopPropagation(); step(1); });
  $("#rand").addEventListener("pointerdown", (e) => { e.stopPropagation(); draw(); });
  $("#pause").addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    paused = !paused;
    e.target.textContent = paused ? "Resume" : "Pause";
    if (!paused) tick();
  });

  // left third = previous, right third = next, middle = random
  $("#stage").addEventListener("pointerdown", (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const f = (e.clientX - r.left) / r.width;
    if (f < 0.34) step(-1); else if (f > 0.66) step(1); else draw();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
    else if (e.key === " ") { e.preventDefault(); draw(); }
  });

  /* ----------------------------------------------------------------- boot */
  fetch("../cameras.json").then(r => r.json()).then(d => {
    all = d.c.map(([id, name, lat, lng, area]) => ({ id, name, lat, lng, area }));
    const start = all.find(c => /broadway|5 av|times sq|42 st|grand central|columbus/i.test(c.name)) || all[0];
    queue = [start];
    pos = 0;
    show(start);
    restart();
    renderThumbs();
    window.NYCLIVE = { all, queue, get pos() { return pos; }, get paused() { return paused; } };
  }).catch(() => { elName.textContent = "Camera list unavailable"; });
})();
