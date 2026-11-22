/* Ganda Pani, Saaf Bijli — scroll film
   Stack: GSAP 3 + ScrollTrigger (scrubbed timelines, pinning), Lenis (inertial scroll),
   Three.js (GPU particle river), Canvas2D (microbe simulation). */
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const FILM_SECONDS = 176.6, FPS = 30;
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: "expo.out" });
  document.body.classList.add("loading");

  /* ---------- smooth scroll (Lenis drives ScrollTrigger) ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
    const el = $(a.getAttribute("href")); if (!el) return;
    e.preventDefault(); lenis ? lenis.scrollTo(el, { offset: 0, duration: 1.6 }) : el.scrollIntoView({ behavior: "smooth" });
  }));

  /* ---------- text splitting ---------- */
  const splitChars = (el) => {
    const html = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = html.map((line) => {
      const tmp = document.createElement("div"); tmp.innerHTML = line;
      let out = "";
      tmp.childNodes.forEach((n) => {
        const wrapEm = n.nodeType === 1 && n.tagName === "EM";
        const text = n.textContent;
        const chars = text.split(/(\s+)/).map((w) => /^\s+$/.test(w) || !w ? w :
          `<span class="wd" style="display:inline-block;white-space:nowrap">${[...w].map((c) => `<span class="ch">${c}</span>`).join("")}</span>`).join("");
        out += wrapEm ? `<em>${chars}</em>` : chars;
      });
      return `<span class="ln">${out}</span>`;
    }).join("<br>");
    return $$(".ch", el);
  };
  const splitWords = (el) => {
    const nodes = [...el.childNodes]; el.innerHTML = "";
    nodes.forEach((n) => {
      const isEm = n.nodeType === 1 && n.tagName === "EM";
      n.textContent.split(/(\s+)/).forEach((w) => {
        if (!w.trim()) { el.append(document.createTextNode(w)); return; }
        const ln = document.createElement("span"); ln.className = "ln";
        const s = document.createElement(isEm ? "em" : "span"); s.className = "w"; s.textContent = w;
        ln.append(s); el.append(ln);
      });
    });
    return $$(".w", el);
  };

  /* ---------- cursor ---------- */
  const cursor = $("#cursor");
  if (cursor && matchMedia("(hover:hover)").matches) {
    const xTo = gsap.quickTo(cursor, "x", { duration: 0.45, ease: "power3" });
    const yTo = gsap.quickTo(cursor, "y", { duration: 0.45, ease: "power3" });
    addEventListener("mousemove", (e) => { xTo(e.clientX); yTo(e.clientY); });
    $$("a, img, video, summary, .edl li").forEach((el) => {
      el.addEventListener("mouseenter", () => cursor.classList.add("is-big"));
      el.addEventListener("mouseleave", () => cursor.classList.remove("is-big"));
    });
  }

  /* ---------- progress bar + timecode (scroll = playhead) ---------- */
  const tc = $("#timecode");
  const pad = (n) => String(Math.floor(n)).padStart(2, "0");
  ScrollTrigger.create({
    start: 0, end: "max",
    onUpdate: (st) => {
      gsap.set("#progress", { scaleX: st.progress });
      const t = st.progress * FILM_SECONDS;
      tc.textContent = `00:${pad(t / 60)}:${pad(t % 60)}:${pad((t * FPS) % FPS)}`;
    },
  });

  /* =========================================================
     SCIENCE — Canvas2D microbe + electron simulation
     ========================================================= */
  const sci = { p: 0 };
  function microbes() {
    const c = $("#microbes"), ctx = c.getContext("2d");
    let W = 0, H = 0, dpr = Math.min(devicePixelRatio, 2);
    const fit = () => { W = c.clientWidth; H = c.clientHeight; c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    fit(); addEventListener("resize", fit);
    const bugs = Array.from({ length: 70 }, (_, i) => ({ x: Math.random(), y: 0.45 + Math.random() * 0.55, a: Math.random() * 6.28, l: 26 + Math.random() * 26, v: 0.2 + Math.random() * 0.5, ph: Math.random() * 6 }));
    const e = []; let acc = 0, visible = false;
    ScrollTrigger.create({ trigger: ".science", start: "top bottom", end: "bottom top", onToggle: (s) => (visible = s.isActive) });
    gsap.ticker.add((t, dt) => {
      if (!visible) return;
      ctx.clearRect(0, 0, W, H);
      // anode plate at top
      const plateY = H * 0.08;
      ctx.fillStyle = "rgba(40,40,40,.9)"; ctx.fillRect(W * 0.55, plateY - 10, W * 0.4, 14);
      ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.font = "12px JetBrains Mono"; ctx.fillText("ANODE (CARBON FELT)", W * 0.55, plateY - 18);
      bugs.forEach((b) => {
        b.a += Math.sin(t * 0.7 + b.ph) * 0.01; b.x += Math.cos(b.a) * b.v * 0.0006; b.y += Math.sin(b.a) * b.v * 0.0004;
        if (b.x < -0.05) b.x = 1.05; if (b.x > 1.05) b.x = -0.05; if (b.y < 0.4) b.a = Math.abs(b.a); if (b.y > 1.02) b.a = -Math.abs(b.a);
        const x = b.x * W, y = b.y * H;
        ctx.save(); ctx.translate(x, y); ctx.rotate(b.a);
        ctx.fillStyle = "rgba(160,200,120,.42)"; ctx.strokeStyle = "rgba(210,240,170,.55)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(-b.l / 2, -7, b.l, 14, 7); ctx.fill(); ctx.stroke(); ctx.restore();
      });
      // emit electrons proportional to scroll progress (sci.p)
      acc += dt * 0.001 * sci.p * 60;
      while (acc > 1 && e.length < 400) { acc -= 1; const b = bugs[(Math.random() * bugs.length) | 0]; e.push({ x: b.x * W, y: b.y * H, vx: (Math.random() - 0.5) * 0.6, life: 0 }); }
      ctx.font = "600 13px Space Grotesk";
      for (let i = e.length - 1; i >= 0; i--) {
        const p = e[i]; p.life += dt * 0.001;
        const tx = W * (0.57 + ((i * 37) % 100) / 100 * 0.36);
        p.vx += (tx - p.x) * 0.00012 * dt; p.x += p.vx; p.y -= (1.2 + p.life * 1.4) * dt * 0.06;
        if (p.y < plateY) { e.splice(i, 1); continue; }
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 14);
        g.addColorStop(0, "rgba(242,98,15,.9)"); g.addColorStop(1, "rgba(242,98,15,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 14, 0, 6.28); ctx.fill();
        ctx.fillStyle = "#1a0a02"; ctx.fillText("e", p.x - 4, p.y + 4);
      }
    });
  }

  /* =========================================================
     END — rising electron field
     ========================================================= */
  function endField() {
    const c = $("#endGL"), ctx = c.getContext("2d");
    let W, H; const fit = () => { W = c.width = c.clientWidth; H = c.height = c.clientHeight; }; fit(); addEventListener("resize", fit);
    const ps = Array.from({ length: 160 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() }));
    let vis = false; ScrollTrigger.create({ trigger: ".end", start: "top bottom", onToggle: (s) => (vis = s.isActive) });
    gsap.ticker.add((t) => {
      if (!vis) return; ctx.clearRect(0, 0, W, H);
      ps.forEach((p) => {
        const y = ((p.y - t * 0.02 * (0.3 + p.s)) % 1 + 1) % 1 * H, x = p.x * W + Math.sin(t + p.s * 20) * 20;
        ctx.fillStyle = `rgba(242,98,15,${0.15 + p.s * 0.5})`; ctx.beginPath(); ctx.arc(x, y, 1 + p.s * 2.5, 0, 6.28); ctx.fill();
      });
    });
  }

  /* =========================================================
     SCROLL SCENES
     ========================================================= */
  // editor's notes live inside pinned frames so they're on screen during the shot
  $$("section").forEach((sec) => {
    const note = $(":scope > .ed-note", sec);
    const pin = $(":scope > [class$='__pin']", sec);
    if (note && pin) pin.append(note);
  });

  // collapse each editor's note behind a dots button
  const notes = [];
  $$(".ed-note").forEach((n) => {
    const text = n.textContent.trim();
    n.innerHTML = `<div class="row"><span class="ed-label">Editor's note</span><button class="dots" aria-expanded="false" aria-label="Show editor's note"><i></i><i></i><i></i></button></div><div class="ed-body" hidden></div>`;
    const btn = $("button", n), body = $(".ed-body", n);
    body.textContent = text;
    const set = (open) => { body.hidden = !open; btn.setAttribute("aria-expanded", open); if (open) gsap.from(body, { y: 10, opacity: 0, duration: 0.5 }); };
    btn.addEventListener("click", () => set(body.hidden));
    notes.push(set);
  });
  $("#notesToggle").addEventListener("change", (e) => notes.forEach((s) => s(e.target.checked)));

  // 3-dot nav menu
  const mBtn = $("#menuBtn"), mPanel = $("#menuPanel");
  const setMenu = (open) => { mPanel.hidden = !open; mBtn.setAttribute("aria-expanded", open); if (open) gsap.from(mPanel, { y: -8, opacity: 0, duration: 0.4 }); };
  mBtn.addEventListener("click", (e) => { e.stopPropagation(); setMenu(mPanel.hidden); });
  document.addEventListener("click", (e) => { if (!mPanel.hidden && !e.target.closest(".menu")) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
  $$("a", mPanel).forEach((a) => a.addEventListener("click", () => setMenu(false)));

  function scenes() {
    // generic word reveals
    $$(".split-words").forEach((el) => {
      if (el.id === "question") return;
      const w = splitWords(el);
      gsap.from(w, { yPercent: 110, rotate: 4, duration: 1.1, stagger: 0.035, scrollTrigger: { trigger: el, start: "top 82%" } });
    });
    $$(".end .split").forEach((el) => {
      const ch = splitChars(el);
      gsap.from(ch, { yPercent: 110, duration: 1, stagger: 0.012, scrollTrigger: { trigger: el, start: "top 80%" } });
    });
    $$(".stagger").forEach((el, i) => gsap.from(el, { y: 40, opacity: 0, duration: 1, delay: (i % 3) * 0.08, scrollTrigger: { trigger: el, start: "top 88%" } }));

    // 01B reel — window grows to full bleed, title lands on top
    const reelVid = $("#reelVideo");
    const reelChars = splitChars($("#reelTitle"));
    const rt = gsap.timeline({ scrollTrigger: { trigger: ".reel", start: "top top", end: "bottom bottom", scrub: 1,
      onToggle: (s) => { if (s.isActive) reelVid.play().catch(() => {}); else reelVid.pause(); } } });
    rt.fromTo("#reelFrame", { width: () => (innerWidth < 860 ? "70vw" : "34vw"), height: () => (innerWidth < 860 ? "39.4vw" : "19.1vw"), borderRadius: 22 },
        { width: "100vw", height: "100vh", borderRadius: 0, ease: "power2.inOut", duration: 1 })
      .to("#reelShade", { opacity: 1, ease: "none", duration: 0.4 }, 0.6)
      .to(["#reelKicker", "#reelHint"], { opacity: 0, y: -24, ease: "power2.in", duration: 0.22 }, 0)
      .set("#reelTitle", { opacity: 1 }, 0.72)
      .from(reelChars, { yPercent: 120, opacity: 0, rotate: 6, stagger: 0.02, ease: "expo.out", duration: 0.35 }, 0.72)
      .to("#reelCopy", { opacity: 1, ease: "power2.out", duration: 0.2 }, 0.95)
      .from("#reelCopy", { y: 30, ease: "power2.out", duration: 0.2 }, 0.95)
      .to({}, { duration: 0.3 });

    // 02 gomti iris
    const g = gsap.timeline({ scrollTrigger: { trigger: ".gomti", start: "top top", end: "bottom bottom", scrub: 1 } });
    g.fromTo("#gomtiFrame", { clipPath: "inset(30% 30% 30% 30% round 24px)" }, { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "power2.inOut", duration: 1 })
     .fromTo("#gomtiImg", { scale: 1.25 }, { scale: 1, ease: "power1.inOut", duration: 1.4 }, 0)
     .from(".gomti__title .line", { yPercent: 60, opacity: 0, stagger: 0.25, duration: 0.5, ease: "power3.out" }, 0.7);

    // 03 horizontal track
    const track = $("#track");
    const dist = () => track.scrollWidth - innerWidth + innerWidth * 0.08;
    const h = gsap.to(track, { x: () => -dist(), ease: "none",
      scrollTrigger: { trigger: ".problem", pin: ".problem__pin", start: "top top", end: () => "+=" + dist(), scrub: 1, invalidateOnRefresh: true } });
    $$(".pcard__img img").forEach((img) => gsap.fromTo(img, { xPercent: -8 }, { xPercent: 8, ease: "none",
      scrollTrigger: { trigger: img.closest(".pcard"), containerAnimation: h, start: "left right", end: "right left", scrub: true } }));
    const ring = { v: 0 };
    gsap.to(ring, { v: 95, ease: "power2.out", duration: 2,
      scrollTrigger: { trigger: ".pcard--stat", containerAnimation: h, start: "left 70%", toggleActions: "play none none reverse" },
      onUpdate: () => { $("#ringNum").textContent = Math.round(ring.v); gsap.set("#ringFg", { strokeDashoffset: 590.6 * (1 - ring.v / 100) }); } });

    // 04 marquee + parallax
    $$(".parallax").forEach((el) => {
      const sp = parseFloat(el.dataset.speed || "-0.15"); const img = $("img", el);
      gsap.fromTo(img, { yPercent: sp * 50 }, { yPercent: -sp * 50, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
    });

    // 05 question — word-by-word light-up
    const qw = splitWords($("#question"));
    gsap.to(qw, { opacity: 1, stagger: 0.5, ease: "none", scrollTrigger: { trigger: ".question", start: "top top", end: "bottom bottom", scrub: true } });

    // 06 science
    const lines = $$(".sci-line");
    ScrollTrigger.create({ trigger: ".science", start: "top top", end: "bottom bottom", scrub: true,
      onUpdate: (s) => {
        sci.p = clamp01((s.progress - 0.3) / 0.6);
        lines.forEach((l, i) => gsap.set(l, { opacity: 0.12 + 0.88 * clamp01(s.progress * 3.2 - i * 0.9) }));
        $("#volt").textContent = (0.05 + sci.p * 0.6).toFixed(2);
      } });

    // 07 lab wipe
    gsap.timeline({ scrollTrigger: { trigger: ".lab", start: "top 75%", end: "center center", scrub: 1 } })
      .to(".lab__img", { clipPath: "inset(0 0 0 0% round 22px)", ease: "power3.inOut" })
      .fromTo(".lab__img img", { scale: 1.2 }, { scale: 1, ease: "power2.out" }, 0);

    // 08 how — pinned steps + self-drawing wire
    const wire = $("#wire"); const wl = wire.getTotalLength();
    gsap.set(wire, { strokeDasharray: `${wl} ${wl}`, strokeDashoffset: wl });
    const nodes = $$("#howSvg .node"), steps = $$(".how__steps li");
    ScrollTrigger.create({ trigger: ".how", start: "top top", end: "bottom bottom", scrub: true,
      onUpdate: (s) => {
        const p = s.progress, idx = Math.min(3, Math.floor(p * 4.4));
        gsap.set(wire, { strokeDashoffset: wl * (1 - clamp01(p * 1.25)) });
        nodes.forEach((n, i) => { n.classList.toggle("on", i <= idx); n.classList.toggle("active", i === idx); });
        steps.forEach((n, i) => n.classList.toggle("on", i <= idx));
        $("#mcuText").textContent = idx >= 2 ? (idx === 2 ? "Circuit: awake" : "Circuit: asleep") : "Circuit";
      } });

    // 09 bars
    gsap.utils.toArray(".bar").forEach((b, i) => gsap.to($("i", b), { scaleY: parseFloat(b.dataset.h), ease: "power3.out",
      scrollTrigger: { trigger: "#bars", start: "top 75%", end: "bottom 45%", scrub: 1 }, delay: i * 0.2 }));
    gsap.from(".equation", { scale: 0.85, opacity: 0, duration: 1.2, ease: "back.out(1.6)", scrollTrigger: { trigger: ".equation", start: "top 85%" } });

    // 10 map — path draw + pins
    const river = $("#river"), rLine = $("#riverLine"), L = river.getTotalLength(), svg = $("#mapSvg");
    [river, rLine].forEach((p) => gsap.set(p, { strokeDasharray: L, strokeDashoffset: L }));
    const cols = ["#d63a3a", "#c9b48a", "#d63a3a", "#5fb8e0", "#c9b48a", "#5fb8e0", "#d63a3a"];
    const pins = cols.map((c, i) => {
      const pt = river.getPointAtLength(L * (0.1 + i * 0.13));
      const gEl = document.createElementNS("http://www.w3.org/2000/svg", "g"); gEl.setAttribute("class", "pin");
      gEl.innerHTML = `<line x1="${pt.x}" y1="${pt.y - 120}" x2="${pt.x}" y2="${pt.y}"/><circle class="halo" cx="${pt.x}" cy="${pt.y - 130}" r="26" fill="${c}"/><circle cx="${pt.x}" cy="${pt.y - 130}" r="15" fill="${c}"/><text x="${pt.x}" y="${pt.y - 168}">D${i + 1}</text>`;
      svg.append(gEl); gsap.set(gEl, { opacity: 0, scale: 0, transformOrigin: `${pt.x}px ${pt.y - 130}px` });
      gsap.to($(".halo", gEl), { attr: { r: 34 }, opacity: 0.08, repeat: -1, yoyo: true, duration: 1.4 + i * 0.1, ease: "sine.inOut" });
      return gEl;
    });
    const mt = gsap.timeline({ scrollTrigger: { trigger: ".map", start: "top top", end: "bottom bottom", scrub: 1 } });
    mt.to([river, rLine], { strokeDashoffset: 0, ease: "power2.inOut", duration: 1 });
    pins.forEach((p, i) => mt.to(p, { opacity: 1, scale: 1, ease: "back.out(2.2)", duration: 0.18 }, 0.25 + i * 0.1));

    // 12 director's cut
    gsap.from(".cut__player", { scale: 0.88, opacity: 0.4, ease: "none", scrollTrigger: { trigger: ".cut__player", start: "top bottom", end: "top 30%", scrub: true } });
  }

  /* ---------- golden footer motion ---------- */
  function footer() {
    // marquee rows drift opposite ways; scroll speed adds a kick
    const r1 = $("#footRow1"), r2 = $("#footRow2");
    const loop1 = gsap.to(r1, { xPercent: -50, ease: "none", duration: 28, repeat: -1 });
    const loop2 = gsap.fromTo(r2, { xPercent: -50 }, { xPercent: 0, ease: "none", duration: 34, repeat: -1 });
    ScrollTrigger.create({ trigger: ".foot", start: "top bottom", end: "bottom top",
      onUpdate: (s) => { const v = gsap.utils.clamp(1, 5, 1 + Math.abs(s.getVelocity()) / 400);
        gsap.to([loop1, loop2], { timeScale: v, duration: 0.2, overwrite: true, onComplete: () => gsap.to([loop1, loop2], { timeScale: 1, duration: 1 }) }); } });
    // rotating badge
    gsap.to("#footBadge", { rotate: 360, duration: 18, ease: "none", repeat: -1, transformOrigin: "50% 50%" });
    // owner name: letter wave on enter
    const oc = splitChars($("#footOwner"));
    gsap.from(oc, { yPercent: 110, rotate: 8, opacity: 0, stagger: 0.035, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: "#footOwner", start: "top 90%" } });
    $("#footOwner").addEventListener("mouseenter", () => gsap.fromTo(oc, { y: 0 }, { y: -18, stagger: 0.03, duration: 0.25, yoyo: true, repeat: 1, ease: "power2.out" }));
    gsap.from(".foot__main", { y: 60, opacity: 0, duration: 1.2, scrollTrigger: { trigger: ".foot", start: "top 80%" } });
  }
  footer();

  /* ---------- credits ---------- */
  fetch("assets/credits.json").then((r) => r.json()).then((c) => {
    $("#creditList").innerHTML = Object.values(c).map((x) => `<li><b>${x.tag}</b>: ${x.credit}</li>`).join("");
  }).catch(() => {});

  /* ---------- boot: loader -> hero intro ---------- */
  gsap.set("#reelFrame", { xPercent: -50, yPercent: -50, x: 0, y: 0 });
  microbes(); endField();
  scenes(); // scroll-scrubbed scenes only move when the user scrolls, so they stay on for reduced-motion users

  const count = { v: 0 };
  const intro = gsap.timeline({ paused: true, onStart: () => $("#reelVideo").play().catch(() => {}) })
    .from("#reelFrame", { scale: 0.82, opacity: 0, duration: 1.4, ease: "expo.out" })
    .from("#reelKicker", { y: 24, opacity: 0, duration: 1 }, 0.25)
    .from("#reelHint", { y: -16, opacity: 0, duration: 1 }, 0.45);
  gsap.timeline()
    .to(count, { v: 100, duration: reduce ? 0.2 : 1.6, ease: "power2.inOut",
      onUpdate: () => { $("#loadNum").textContent = Math.round(count.v); $("#loadBar").style.width = count.v + "%"; } })
    .to("#loader", { yPercent: -100, duration: 1.1, ease: "expo.inOut" }, "+=0.15")
    .add(() => { document.body.classList.remove("loading"); lenis && lenis.start(); intro.play(); ScrollTrigger.refresh(); }, "-=0.6")
    .set("#loader", { display: "none" });
})();
