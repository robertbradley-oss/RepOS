/* RepOS homepage behavior: nav state, hero tilt, the dotted wave field,
   scroll reveals, sticky workflow steps, and the live product preview.
   Sign-in and demo entry stay owned by app.js; the extra CTAs here just
   forward clicks to #homeSignInButton and #homePrimaryCta. */
(function () {
  var screen = document.getElementById("homeScreen");
  if (!screen || !screen.classList.contains("lp")) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasIO = "IntersectionObserver" in window;
  screen.classList.add("lp-js");

  /* ---------- CTA proxies ---------- */

  var primaryCta = document.getElementById("homePrimaryCta");
  var signInButton = document.getElementById("homeSignInButton");
  var demoProxies = screen.querySelectorAll("[data-lp-demo]");

  function syncDemoProxies() {
    if (!primaryCta) return;
    demoProxies.forEach(function (button) {
      button.hidden = primaryCta.hidden;
      button.disabled = primaryCta.disabled;
    });
  }

  demoProxies.forEach(function (button) {
    button.addEventListener("click", function () {
      if (primaryCta && !primaryCta.disabled) primaryCta.click();
    });
  });

  screen.querySelectorAll("[data-lp-signin]").forEach(function (button) {
    button.addEventListener("click", function () {
      if (signInButton) signInButton.click();
    });
  });

  if (primaryCta && "MutationObserver" in window) {
    new MutationObserver(syncDemoProxies).observe(primaryCta, { attributes: true, attributeFilter: ["hidden", "disabled"] });
  }
  syncDemoProxies();

  /* ---------- Nav state + hero tilt (scroll) ---------- */

  var nav = document.getElementById("lpNav");
  var stage = screen.querySelector(".lp-stage");
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      ticking = false;
      var y = screen.scrollTop;
      if (nav) nav.classList.toggle("is-scrolled", y > 8);
      if (stage && !reduceMotion) {
        var progress = Math.min(1, Math.max(0, y / 480));
        stage.style.setProperty("--lp-tilt", (1 - progress).toFixed(3));
      }
    });
  }

  screen.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Scroll reveals ---------- */

  var revealTargets = screen.querySelectorAll("[data-lp-reveal]");
  if (hasIO && !reduceMotion) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.1 });
    revealTargets.forEach(function (target) { revealObserver.observe(target); });
  } else {
    revealTargets.forEach(function (target) { target.classList.add("is-revealed"); });
  }

  /* ---------- Workflow steps ---------- */

  var steps = screen.querySelectorAll("[data-lp-step]");
  var panels = screen.querySelectorAll("[data-lp-panel]");

  // Narrow layouts hide the sticky stage, so each step gets its own copy of its panel.
  panels.forEach(function (panel) {
    var slot = screen.querySelector('[data-lp-slot="' + panel.getAttribute("data-lp-panel") + '"]');
    if (!slot) return;
    var copy = panel.cloneNode(true);
    copy.removeAttribute("data-lp-panel");
    copy.classList.add("is-active");
    slot.setAttribute("aria-hidden", "true");
    slot.appendChild(copy);
  });

  function setStep(index) {
    steps.forEach(function (step) {
      step.classList.toggle("is-active", step.getAttribute("data-lp-step") === String(index));
    });
    panels.forEach(function (panel) {
      panel.classList.toggle("is-active", panel.getAttribute("data-lp-panel") === String(index));
    });
  }

  if (hasIO && steps.length) {
    var stepObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setStep(entry.target.getAttribute("data-lp-step"));
      });
    }, { rootMargin: "-48% 0px -48% 0px" });
    steps.forEach(function (step) { stepObserver.observe(step); });
  }

  /* ---------- Bento spotlight ---------- */

  screen.querySelectorAll(".lp-tile").forEach(function (tile) {
    tile.addEventListener("pointermove", function (event) {
      var rect = tile.getBoundingClientRect();
      tile.style.setProperty("--mx", (event.clientX - rect.left) + "px");
      tile.style.setProperty("--my", (event.clientY - rect.top) + "px");
    });
  });

  /* ---------- Hero preview: typing reply + incoming tickets ---------- */

  var typeTarget = screen.querySelector("[data-lp-type]");
  var queue = screen.querySelector("[data-lp-queue]");
  var heroVisible = true;
  var fullReply = typeTarget ? typeTarget.textContent : "";
  var typeTimer = 0;

  function typeReply() {
    if (!typeTarget) return;
    var index = 0;
    typeTarget.textContent = "";
    function step() {
      if (!heroVisible) {
        typeTimer = window.setTimeout(step, 400);
        return;
      }
      index += 1;
      typeTarget.textContent = fullReply.slice(0, index);
      if (index < fullReply.length) {
        var ch = fullReply.charAt(index - 1);
        typeTimer = window.setTimeout(step, /[,.:]/.test(ch) ? 220 : 24 + Math.random() * 30);
      } else {
        typeTimer = window.setTimeout(typeReply, 5200);
      }
    }
    typeTimer = window.setTimeout(step, 900);
  }

  var incoming = [
    ["#100061", "Replacement filter sizing", "Jamie Ortiz", "low", "Low", "Morgan Lee"],
    ["#100062", "Order arrived with missing part", "Casey Morgan", "high", "High", "Avery Chen"],
    ["#100063", "Warranty registration help", "Riley Carter", "", "Normal", "Jordan Blake"],
    ["#100064", "Address change before shipment", "Sam Patel", "", "Normal", "Avery Chen"]
  ];
  var incomingIndex = 0;

  function addIncomingTicket() {
    if (!queue || !heroVisible || document.hidden || !document.body.classList.contains("home-active")) return;
    var data = incoming[incomingIndex % incoming.length];
    incomingIndex += 1;
    var row = document.createElement("div");
    row.className = "lp-q is-new";
    var pri = data[3] ? "lp-pri lp-pri--" + data[3] : "lp-pri";
    row.innerHTML =
      "<span>" + data[0] + "</span><span>" + data[1] + "</span><span>" + data[2] + "</span>" +
      '<span><b class="' + pri + '"></b>' + data[4] + "</span><span>" + data[5] + "</span>";
    var head = queue.querySelector(".lp-q--head");
    queue.insertBefore(row, head ? head.nextSibling : queue.firstChild);
    var rows = queue.querySelectorAll(".lp-q:not(.lp-q--head)");
    if (rows.length > 10) rows[rows.length - 1].remove();
    window.setTimeout(function () { row.classList.remove("is-new"); }, 1000);
  }

  if (!reduceMotion) {
    typeReply();
    window.setInterval(addIncomingTicket, 6500);
  }

  /* ---------- Dotted wave field behind the product window ---------- */

  var canvas = screen.querySelector("canvas.lp-field");
  var ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;
  var W = 0;
  var H = 0;
  var raf = 0;
  var startTime = 0;

  function resizeField() {
    if (!ctx) return false;
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width;
    H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  var COLS = 88;
  var ROWS = 30;

  function drawField(phase) {
    ctx.clearRect(0, 0, W, H);
    var cx = W * 0.5;
    var breathe = 0.9 + 0.1 * Math.sin(phase * 0.55);
    for (var j = 0; j <= ROWS; j++) {
      var t = j / ROWS;
      var persp = 0.3 + 0.7 * t;
      var rowY = H * (0.1 + 0.84 * Math.pow(t, 1.42));
      var spanX = W * (0.55 + 0.9 * t);
      for (var i = 0; i <= COLS; i++) {
        var u = i / COLS - 0.5;
        var wave = Math.sin(u * 5.4 + t * 2.6 + phase) * 0.5
          + Math.sin(u * 2.2 - t * 5.0 + phase * 0.7) * 0.34
          + Math.sin(u * 9.6 + t * 3.8 - phase * 1.35) * 0.17
          + Math.sin((u * 7.0 + t * 6.5) * 1.9 + phase * 2.2) * 0.07;
        var x = cx + u * spanX;
        var y = rowY + wave * breathe * H * 0.24 * persp;
        if (y < -6 || y > H + 6) continue;
        var edge = 1 - Math.min(1, Math.pow(Math.abs(u) / 0.5, 2.3));
        if (edge <= 0) continue;
        var crest = (wave + 1.08) / 2.16;
        crest = crest < 0 ? 0 : crest > 1 ? 1 : crest;
        crest = crest * crest * (3 - 2 * crest);
        var alpha = edge * persp * (0.2 + crest * 0.8);
        if (alpha <= 0.015) continue;
        var radius = (0.5 + persp * 1.5) * (0.8 + crest * 0.45);
        ctx.beginPath();
        ctx.fillStyle = "rgba(" + (124 + Math.round(crest * 96)) + "," + (92 + Math.round(crest * 118)) + ",255," + alpha.toFixed(3) + ")";
        ctx.arc(x, y, radius, 0, 6.2832);
        ctx.fill();
      }
    }
  }

  function frame(ts) {
    if (!startTime) startTime = ts;
    drawField(((ts - startTime) / 1000) * 0.3);
    raf = window.requestAnimationFrame(frame);
  }

  function startField() {
    if (!ctx || raf || reduceMotion) return;
    if (!W && !resizeField()) return;
    raf = window.requestAnimationFrame(frame);
  }

  function stopField() {
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
  }

  if (ctx) {
    if (resizeField() && reduceMotion) drawField(0.6);
    window.addEventListener("resize", function () {
      if (resizeField() && (reduceMotion || !raf)) drawField(0.6);
    });
  }

  var hero = screen.querySelector(".lp-hero");
  if (hero && hasIO) {
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
      if (heroVisible) startField();
      else stopField();
    }).observe(hero);
  } else {
    startField();
  }
})();
