/* station.js: "Mission: Secure the Station", the creative feature.
   Five station emergencies each stand for a classic AWS breach, and each
   breach is fixed with its own hands-on mini-game. The portfolio underneath
   is never changed, and closing the station always works. */

(function () {
  "use strict";

  var overlay = document.getElementById("station");
  var launchBtn = document.getElementById("launch-mission");
  if (!overlay || !launchBtn) return;

  var STORE_KEY = "em-station-v2";
  var store = window.SafeStore || { get: function () { return null; }, set: function () {}, remove: function () {} };

  function reduced() {
    return !!(window.isReducedMotion && window.isReducedMotion());
  }

  var BREACHES = [
    {
      id: "airlock",
      animal: "Airlock",
      photo: "assets/photos/airlock.jpg",
      name: "The airlock venting into space",
      aws: "Public S3 bucket",
      pos: [44, 70],
      wrong: "The airlock is wide open. The S3 bucket station-telemetry allows public access, so anyone with the URL can download what is inside, including a crew records file.",
      why: "Public buckets are one of the most common causes of cloud data leaks. Records, backups and logs end up exposed to the whole internet.",
      fix: "S3 Block Public Access is on at the bucket level, so public ACLs and public bucket policies are ignored. Turn it on at the account level too, and serve public files through CloudFront with origin access control.",
      game: gameSwitches
    },
    {
      id: "card",
      animal: "Access card",
      photo: "assets/photos/spacewalk.jpg",
      name: "The access card drifting out the hatch",
      aws: "Hardcoded secret",
      pos: [31, 27],
      wrong: "A database password is written straight into the station's source code and pushed to the repository. It is floating out there for anyone to grab.",
      why: "Space never forgets, and neither does git history. Anyone who can read the code can use the password, and bots scan public repos for keys within minutes.",
      fix: "The password lives in AWS Secrets Manager. The app reads it at runtime through its IAM role, the leaked value was rotated, and nothing sensitive is left in the code.",
      game: gameSecret
    },
    {
      id: "master",
      animal: "Master key",
      photo: "assets/photos/controls.jpg",
      name: "The master control key marked \"*\"",
      aws: "Over-permissive IAM policy",
      pos: [62, 66],
      wrong: "The telemetry app's IAM policy allows every action on every resource: \"Action\": \"*\", \"Resource\": \"*\". One key opens every door on the station.",
      why: "If the app is compromised, the attacker inherits full control of the account. The blast radius is everything.",
      fix: "The policy now follows least privilege: only s3:GetObject and s3:PutObject, only on the station-telemetry bucket. The app still works, and every attack is denied.",
      game: gamePolicy
    },
    {
      id: "hatch",
      animal: "Docking bay",
      photo: "assets/photos/docking.jpg",
      name: "The docking bay left unlocked",
      aws: "No MFA",
      pos: [51, 34],
      wrong: "The officer account signs in with just a password. An unknown ship has it, and the docking bay opens on request.",
      why: "Passwords get phished, reused and guessed. Without a second factor, one stolen password means a full account takeover.",
      fix: "MFA is enforced. A sign-in now needs the password and a fresh code from the officer's device, so a stolen password alone gets nowhere.",
      game: gameMfa
    },
    {
      id: "satellite",
      animal: "Comms satellite",
      photo: "assets/photos/satellite.jpg",
      name: "The comms satellite gone dark",
      aws: "Logging disabled",
      pos: [80, 24],
      wrong: "The comms satellite is dark. CloudTrail is off, so nobody can see who is moving through the account.",
      why: "Without logs you cannot detect an attack, investigate it or prove what happened. Attackers love blind spots.",
      fix: "CloudTrail is recording every API call, the suspicious root sign-in was caught, and a CloudWatch alarm now fires on any root sign-in.",
      game: gameLogs
    }
  ];

  /* ---------- State, saved safely ---------- */
  function freshState() {
    return { started: false, skipped: false, sealed: [] };
  }

  function loadState() {
    var raw = store.get(STORE_KEY);
    if (!raw) return freshState();
    try {
      var s = JSON.parse(raw);
      var ids = BREACHES.map(function (b) { return b.id; });
      return {
        started: !!s.started,
        skipped: !!s.skipped,
        sealed: Array.isArray(s.sealed) ? s.sealed.filter(function (id) { return ids.indexOf(id) !== -1; }) : []
      };
    } catch (e) {
      return freshState();
    }
  }

  function saveState() {
    try { store.set(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  var state = loadState();

  function isSealed(id) { return state.sealed.indexOf(id) !== -1; }
  function plainsUnlocked() { return state.skipped || state.sealed.length >= 3; }
  function campUnlocked() { return state.skipped || state.sealed.length >= BREACHES.length; }
  function byId(id) { return BREACHES.filter(function (b) { return b.id === id; })[0]; }
  function nextOpen(afterId) {
    var start = afterId ? BREACHES.indexOf(byId(afterId)) + 1 : 0;
    for (var i = 0; i < BREACHES.length; i++) {
      var b = BREACHES[(start + i) % BREACHES.length];
      if (!isSealed(b.id)) return b.id;
    }
    return null;
  }

  /* ---------- Small DOM helpers ---------- */
  function $(id) { return document.getElementById(id); }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function btn(cls, text) {
    var b = el("button", cls, text);
    b.type = "button";
    return b;
  }

  function photo(b, cls) {
    var img = el("img", "animal-photo ph-" + b.id + (cls ? " " + cls : ""));
    img.src = b.photo;
    img.alt = "";
    img.decoding = "async";
    return img;
  }

  function icon(name) {
    return window.makeIcon ? window.makeIcon(name) : document.createTextNode("");
  }

  var announcer = $("station-announcer");
  function announce(msg) {
    announcer.textContent = "";
    window.setTimeout(function () { announcer.textContent = msg; }, 60);
  }

  /* Timers belong to the open mission and are cleared when it closes */
  var timers = [];
  function later(fn, ms) { timers.push(window.setTimeout(fn, ms)); }
  function every(fn, ms) { timers.push(window.setInterval(fn, ms)); }
  function clearTimers() {
    timers.forEach(function (t) { window.clearTimeout(t); window.clearInterval(t); });
    timers = [];
  }

  /* ==========================================================
     Mini-game 1: Block Public Access switches
     ========================================================== */
  function gameSwitches(root, ui) {
    ui.say("Seal the airlock: turn on all four Block Public Access settings for the bucket station-telemetry.");

    var settings = [
      "Block public access granted through new ACLs",
      "Block public access granted through any ACLs",
      "Block public access granted through new public bucket policies",
      "Block public access granted through any public bucket policies"
    ];
    var on = 0;

    var list = el("ul", "switch-list");
    settings.forEach(function (label) {
      var li = el("li");
      var b = btn("switch-row");
      b.setAttribute("role", "switch");
      b.setAttribute("aria-checked", "false");
      b.appendChild(el("span", "switch-track"));
      b.appendChild(el("span", "switch-label", label));
      b.addEventListener("click", function () {
        if (ui.isDone()) return;
        var now = b.getAttribute("aria-checked") !== "true";
        b.setAttribute("aria-checked", String(now));
        on += now ? 1 : -1;
        update();
      });
      li.appendChild(b);
      list.appendChild(li);
    });
    root.appendChild(list);

    var meter = el("p", "game-meter");
    root.appendChild(meter);

    var sim = el("div", "sim");
    sim.appendChild(el("p", "sim-label", "Anonymous request from the internet"));
    sim.appendChild(el("code", "sim-code", "GET https://station-telemetry.s3.amazonaws.com/crew-records.csv"));
    var result = el("p", "pill pill-bad", "200 OK: file downloaded by an unknown probe");
    sim.appendChild(result);
    root.appendChild(sim);

    function update() {
      meter.textContent = "Protections on: " + on + " of 4";
      ui.setProgress(on / 4);
      if (on === 4) {
        result.className = "pill pill-good";
        result.textContent = "403 Access Denied: the airlock is sealed";
        ui.done("All four settings are on. The bucket is no longer public.");
      } else if (on > 0) {
        ui.say("Still venting: " + (4 - on) + (4 - on === 1 ? " setting is" : " settings are") + " off, so a public policy or ACL could still open the airlock.");
      }
    }
    update();
  }

  /* ==========================================================
     Mini-game 2: find the secret, move it to the vault, rotate it
     ========================================================== */
  function gameSecret(root, ui) {
    ui.say("Step 1 of 3: tap the secret hiding in this code.");

    var tokens = [
      { key: "host", value: "\"prod-db.internal\"", hint: "That is a hostname. Not ideal to expose, but not a secret." },
      { key: "user", value: "\"station_app\"", hint: "A username on its own does not unlock anything. Keep looking." },
      { key: "password", value: "\"Orbit#2026!\"", secret: true },
      { key: "region", value: "\"af-south-1\"", hint: "That is the AWS region, Cape Town. Public information." }
    ];

    var code = el("div", "code-card");
    code.setAttribute("role", "group");
    code.setAttribute("aria-label", "App source code");
    code.appendChild(el("div", "code-line", "const db = connect({"));
    var secretLine = null;
    var secretBtn = null;
    var picked = false;

    tokens.forEach(function (t, i) {
      var line = el("div", "code-line code-indent");
      line.appendChild(el("span", "c-key", t.key + ": "));
      var b = btn("code-token", t.value);
      b.setAttribute("aria-label", t.key + " value " + t.value);
      b.addEventListener("click", function () {
        if (picked) return;
        if (t.secret) {
          picked = true;
          b.classList.add("is-picked");
          b.setAttribute("aria-pressed", "true");
          step2();
        } else {
          b.classList.add("is-wrong");
          ui.say(t.hint);
        }
      });
      line.appendChild(b);
      if (i < tokens.length - 1) line.appendChild(el("span", "c-punct", ","));
      if (t.secret) { secretLine = line; secretBtn = b; }
      code.appendChild(line);
    });
    code.appendChild(el("div", "code-line", "});"));
    root.appendChild(code);

    var vault = btn("vault", "");
    vault.disabled = true;
    vault.appendChild(icon("lock"));
    vault.appendChild(el("span", "", "AWS Secrets Manager vault"));
    root.appendChild(vault);

    var rotate = btn("btn btn-small btn-ghost", "Rotate the leaked password");
    rotate.hidden = true;
    root.appendChild(rotate);

    function step2() {
      ui.setProgress(1 / 3);
      vault.disabled = false;
      vault.classList.add("is-ready");
      ui.say("Found it. Step 2 of 3: drag the password into the vault, or tap the vault.");
      enableDrag(secretBtn, vault, storeSecret);
      vault.focus();
    }

    var stored = false;
    function storeSecret() {
      if (stored) return;
      stored = true;
      vault.classList.remove("is-ready");
      vault.classList.add("is-full");
      vault.disabled = true;
      vault.querySelector("span").textContent = "Stored as prod/db/password";
      secretLine.textContent = "";
      secretLine.appendChild(el("span", "c-key", "password: "));
      secretLine.appendChild(el("span", "c-good", "await getSecret(\"prod/db/password\")"));
      secretLine.appendChild(el("span", "c-punct", ","));
      ui.setProgress(2 / 3);
      ui.say("The code now reads the secret at runtime. Step 3 of 3: the old password is still in git history, so rotate it.");
      rotate.hidden = false;
      rotate.focus();
    }

    vault.addEventListener("click", storeSecret);
    rotate.addEventListener("click", function () {
      rotate.disabled = true;
      rotate.textContent = "Password rotated";
      ui.done("Secret moved to Secrets Manager and the leaked value is dead.");
    });
  }

  /* Pointer drag from a token to a drop target. Tapping the target works too. */
  function enableDrag(source, target, onDrop) {
    source.classList.add("is-draggable");
    source.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      var ghost = el("span", "drag-ghost", source.textContent);
      document.body.appendChild(ghost);
      var moved = false;
      source.setPointerCapture(e.pointerId);
      function place(ev) {
        ghost.style.left = ev.clientX + "px";
        ghost.style.top = ev.clientY + "px";
      }
      place(e);
      function over(ev) {
        var r = target.getBoundingClientRect();
        return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
      }
      function move(ev) {
        moved = true;
        place(ev);
        target.classList.toggle("is-over", over(ev));
      }
      function up(ev) {
        source.removeEventListener("pointermove", move);
        source.removeEventListener("pointerup", up);
        source.removeEventListener("pointercancel", up);
        ghost.remove();
        target.classList.remove("is-over");
        if (moved && over(ev)) onDrop();
      }
      source.addEventListener("pointermove", move);
      source.addEventListener("pointerup", up);
      source.addEventListener("pointercancel", up);
    });
  }

  /* ==========================================================
     Mini-game 3: rewrite the IAM policy and watch attacks fail
     ========================================================== */
  function gamePolicy(root, ui) {
    ui.say("Rewire the master key: pick only the actions the telemetry app needs, and lock the resource to its bucket. Watch the requests update live.");

    var ACTIONS = ["*", "s3:GetObject", "s3:PutObject", "s3:DeleteBucket", "iam:CreateUser", "secretsmanager:GetSecretValue"];
    var RESOURCES = ["*", "arn:aws:s3:::station-telemetry/*"];
    var chosen = ["*"];
    var resource = "*";

    var REQUESTS = [
      { who: "Telemetry app", action: "s3:GetObject", res: "arn:aws:s3:::station-telemetry/readings.json", want: true },
      { who: "Telemetry app", action: "s3:PutObject", res: "arn:aws:s3:::station-telemetry/new-reading.json", want: true },
      { who: "Attacker", action: "s3:DeleteBucket", res: "arn:aws:s3:::station-telemetry", want: false },
      { who: "Attacker", action: "iam:CreateUser", res: "*", want: false },
      { who: "Attacker", action: "secretsmanager:GetSecretValue", res: "arn:aws:secretsmanager:af-south-1:secret:prod/db", want: false },
      { who: "Attacker", action: "s3:GetObject", res: "arn:aws:s3:::crew-records/ids.csv", want: false }
    ];

    function allowed(r) {
      var actionOk = chosen.indexOf("*") !== -1 || chosen.indexOf(r.action) !== -1;
      var resOk = resource === "*" || (r.res.indexOf(resource.slice(0, -1)) === 0);
      return actionOk && resOk;
    }

    var grid = el("div", "policy-game");

    /* Builder */
    var builder = el("div", "policy-builder");
    builder.appendChild(el("p", "builder-label", "Action"));
    var actionGroup = el("div", "chip-row");
    actionGroup.setAttribute("role", "group");
    actionGroup.setAttribute("aria-label", "Allowed actions");
    var actionBtns = ACTIONS.map(function (a) {
      var b = btn("pchip", a);
      b.setAttribute("aria-pressed", String(chosen.indexOf(a) !== -1));
      b.addEventListener("click", function () {
        if (ui.isDone()) return;
        var i = chosen.indexOf(a);
        if (i === -1) chosen.push(a); else chosen.splice(i, 1);
        b.setAttribute("aria-pressed", String(i === -1));
        update();
      });
      actionGroup.appendChild(b);
      return b;
    });
    builder.appendChild(actionGroup);

    builder.appendChild(el("p", "builder-label", "Resource"));
    var resGroup = el("div", "chip-row");
    resGroup.setAttribute("role", "group");
    resGroup.setAttribute("aria-label", "Resource");
    var resBtns = RESOURCES.map(function (r) {
      var b = btn("pchip", r);
      b.setAttribute("aria-pressed", String(r === resource));
      b.addEventListener("click", function () {
        if (ui.isDone()) return;
        resource = r;
        resBtns.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        update();
      });
      resGroup.appendChild(b);
      return b;
    });
    builder.appendChild(resGroup);

    var preview = el("pre", "policy-preview");
    preview.setAttribute("aria-label", "Policy preview");
    builder.appendChild(preview);
    grid.appendChild(builder);

    /* Live requests */
    var reqBox = el("div", "requests");
    reqBox.appendChild(el("p", "builder-label", "Live requests"));
    var reqList = el("ul", "req-list");
    var rows = REQUESTS.map(function (r) {
      var li = el("li", "req");
      var who = el("span", "req-who " + (r.who === "Attacker" ? "is-attacker" : "is-app"), r.who);
      var act = el("code", "req-action", r.action);
      var pill = el("span", "pill");
      li.appendChild(who);
      li.appendChild(act);
      li.appendChild(pill);
      reqList.appendChild(li);
      return { r: r, pill: pill, li: li };
    });
    reqBox.appendChild(reqList);
    grid.appendChild(reqBox);
    root.appendChild(grid);

    function update() {
      var acts = chosen.length ? chosen.map(function (a) { return "\"" + a + "\""; }).join(", ") : "";
      preview.textContent =
        "{\n  \"Effect\": \"Allow\",\n  \"Action\": [" + acts + "],\n  \"Resource\": \"" + resource + "\"\n}";

      var good = 0;
      var appBroken = false;
      var leaks = 0;
      rows.forEach(function (row) {
        var ok = allowed(row.r);
        var correct = ok === row.r.want;
        if (correct) good++;
        if (row.r.want && !ok) appBroken = true;
        if (!row.r.want && ok) leaks++;
        row.pill.textContent = ok ? "ALLOWED" : "DENIED";
        row.pill.className = "pill " + (correct ? "pill-good" : "pill-bad");
        row.li.classList.toggle("is-wrong", !correct);
      });
      ui.setProgress(good / rows.length);

      if (good === rows.length) {
        ui.done("Least privilege achieved: the app works and every attack bounces off the hull.");
      } else if (appBroken) {
        ui.say("Careful: the telemetry app is now blocked from something it needs.");
      } else if (leaks) {
        ui.say(leaks + (leaks === 1 ? " attack still gets" : " attacks still get") + " through. " +
          (chosen.indexOf("*") !== -1 ? "The \"*\" action allows everything." : resource === "*" ? "Try scoping the resource to the app's bucket." : ""));
      }
    }
    update();
  }

  /* ==========================================================
     Mini-game 4: enforce MFA and beat the token timer
     ========================================================== */
  function gameMfa(root, ui) {
    var PERIOD = 30;
    var attempt = el("div", "sim");
    attempt.appendChild(el("p", "sim-label", "Sign-in attempt from an unknown ship"));
    attempt.appendChild(el("code", "sim-code", "user: officer   password: ********"));
    var attemptResult = el("p", "pill pill-bad", "Signed in with password only");
    attempt.appendChild(attemptResult);
    root.appendChild(attempt);

    var enforce = btn("btn btn-primary btn-small", "Require MFA for all users");
    root.appendChild(enforce);
    ui.say("Step 1 of 2: require a second factor for every sign-in.");

    var device = el("div", "mfa");
    device.hidden = true;
    root.appendChild(device);

    enforce.addEventListener("click", function () {
      enforce.disabled = true;
      enforce.textContent = "MFA required";
      attemptResult.className = "pill pill-warn";
      attemptResult.textContent = "Waiting for an MFA code";
      ui.setProgress(0.5);
      ui.say("Step 2 of 2: enrol the officer's device. Type the docking code shown before the timer runs out.");
      showDevice();
    });

    function newCode() {
      var n = Math.floor(Math.random() * 1000000);
      return ("000000" + n).slice(-6);
    }

    function showDevice() {
      device.hidden = false;
      var screen = el("div", "mfa-device");
      screen.appendChild(el("p", "mfa-name", "Officer's MFA device"));
      var codeEl = el("p", "mfa-code");
      codeEl.setAttribute("aria-live", "polite");
      screen.appendChild(codeEl);

      var ns = "http://www.w3.org/2000/svg";
      var ring = document.createElementNS(ns, "svg");
      ring.setAttribute("viewBox", "0 0 44 44");
      ring.setAttribute("class", "mfa-ring");
      ring.setAttribute("aria-hidden", "true");
      var bg = document.createElementNS(ns, "circle");
      bg.setAttribute("cx", "22"); bg.setAttribute("cy", "22"); bg.setAttribute("r", "18");
      bg.setAttribute("class", "mfa-ring-bg");
      var fg = document.createElementNS(ns, "circle");
      fg.setAttribute("cx", "22"); fg.setAttribute("cy", "22"); fg.setAttribute("r", "18");
      fg.setAttribute("class", "mfa-ring-fg");
      ring.appendChild(bg);
      ring.appendChild(fg);
      var timeText = el("p", "mfa-time");
      var timerWrap = el("div", "mfa-timer");
      timerWrap.appendChild(ring);
      timerWrap.appendChild(timeText);
      screen.appendChild(timerWrap);
      device.appendChild(screen);

      var form = el("form", "mfa-form");
      var label = el("label", "", "Enter the code");
      label.setAttribute("for", "mfa-input");
      var input = el("input", "mfa-input");
      input.id = "mfa-input";
      input.type = "text";
      input.inputMode = "numeric";
      input.autocomplete = "one-time-code";
      input.maxLength = 6;
      input.pattern = "[0-9]{6}";
      var verify = btn("btn btn-primary btn-small", "Verify");
      verify.type = "submit";
      var pause = btn("link-btn", "Pause timer");
      form.appendChild(label);
      var row = el("div", "mfa-row");
      row.appendChild(input);
      row.appendChild(verify);
      form.appendChild(row);
      form.appendChild(pause);
      device.appendChild(form);

      var current = newCode();
      var previous = null;
      var left = PERIOD;
      var paused = false;
      var CIRC = 2 * Math.PI * 18;
      fg.style.strokeDasharray = String(CIRC);

      function draw() {
        codeEl.textContent = current.slice(0, 3) + " " + current.slice(3);
        timeText.textContent = left + "s";
        fg.style.strokeDashoffset = String(CIRC * (1 - left / PERIOD));
        fg.classList.toggle("is-low", left <= 8);
      }
      draw();

      every(function () {
        if (paused || ui.isDone()) return;
        left--;
        if (left <= 0) {
          previous = current;
          current = newCode();
          left = PERIOD;
          ui.say("That code expired and a new one appeared, just like a real token. Codes change every 30 seconds.");
        }
        draw();
      }, 1000);

      pause.addEventListener("click", function () {
        paused = !paused;
        pause.textContent = paused ? "Resume timer" : "Pause timer";
      });

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (ui.isDone()) return;
        var v = input.value.replace(/\s/g, "");
        if (v === current || (previous && v === previous)) {
          input.disabled = true;
          verify.disabled = true;
          pause.hidden = true;
          attemptResult.className = "pill pill-good";
          attemptResult.textContent = "Ship turned away: password alone is not enough";
          ui.done("MFA enrolled and enforced. The docking bay is locked.");
        } else {
          input.select();
          ui.say(v.length !== 6 ? "The code has 6 digits." : "That code does not match. Check the device and try again.");
        }
      });
      input.focus();
    }
  }

  /* ==========================================================
     Mini-game 5: switch on CloudTrail and spot the intruder
     ========================================================== */
  function gameLogs(root, ui) {
    var EVENTS = [
      { t: "02:55:10", who: "telemetry-ingest (Lambda)", ev: "GetObject", from: "AWS internal", note: "Normal: the ingest Lambda reads sensor data all night." },
      { t: "03:01:44", who: "backup-job (role)", ev: "PutObject", from: "AWS internal", note: "Normal: the nightly backup job writing to S3." },
      { t: "03:12:47", who: "root", ev: "ConsoleLogin", from: "185.220.101.4, unknown location, no MFA", bad: true },
      { t: "03:14:02", who: "root", ev: "CreateAccessKey", from: "185.220.101.4", near: true, note: "Good instinct, this is the intruder's next move. Find where it started." },
      { t: "07:30:18", who: "eve.maina", ev: "ConsoleLogin", from: "41.90.x.x, Nairobi, MFA used", note: "Normal: that is Eve signing in from Nairobi with MFA." },
      { t: "07:45:51", who: "telemetry-app (role)", ev: "PutObject", from: "AWS internal", note: "Normal: the telemetry app saving a new reading." }
    ];

    var tower = btn("switch-row is-wide");
    tower.setAttribute("role", "switch");
    tower.setAttribute("aria-checked", "false");
    tower.appendChild(el("span", "switch-track"));
    tower.appendChild(el("span", "switch-label", "CloudTrail logging for all regions"));
    root.appendChild(tower);
    ui.say("Step 1 of 3: switch on CloudTrail to bring the comms satellite back online.");

    var stream = el("ol", "log-stream");
    stream.setAttribute("aria-label", "CloudTrail events");
    stream.hidden = true;
    root.appendChild(stream);

    var alarm = btn("btn btn-small btn-primary", "Create a CloudWatch alarm for root sign-ins");
    alarm.hidden = true;
    root.appendChild(alarm);

    var found = false;

    tower.addEventListener("click", function () {
      if (tower.getAttribute("aria-checked") === "true") return;
      tower.setAttribute("aria-checked", "true");
      tower.disabled = true;
      ui.setProgress(1 / 3);
      ui.say("The satellite is back online and events are streaming in. Step 2 of 3: tap the event that looks like an intruder.");
      stream.hidden = false;
      EVENTS.forEach(function (ev, i) {
        if (reduced()) addRow(ev);
        else later(function () { addRow(ev); }, i * 450);
      });
    });

    function addRow(ev) {
      var li = el("li");
      var b = btn("log-row");
      b.appendChild(el("span", "log-time", ev.t));
      b.appendChild(el("span", "log-ev", ev.ev));
      b.appendChild(el("span", "log-who", ev.who));
      b.appendChild(el("span", "log-from", ev.from));
      b.addEventListener("click", function () {
        if (found) return;
        if (ev.bad) {
          found = true;
          b.classList.add("is-caught");
          ui.setProgress(2 / 3);
          ui.say("Caught it: a root sign-in at 3 AM from an unknown address with no MFA. Step 3 of 3: make sure the next one raises an alarm.");
          alarm.hidden = false;
          alarm.focus();
        } else {
          b.classList.add(ev.near ? "is-near" : "is-cleared");
          ui.say(ev.note);
        }
      });
      li.appendChild(b);
      stream.appendChild(li);
    }

    alarm.addEventListener("click", function () {
      alarm.disabled = true;
      alarm.textContent = "Alarm created";
      ui.done("Logging is on, the intruder was spotted and alarms are armed.");
    });
  }

  /* ==========================================================
     Field: scene hotspots and list
     ========================================================== */
  var scene = $("scene");
  var lens = $("scope-lens");
  var list = $("breach-list");
  var field = $("station-field");
  var mission = $("mission");
  var intro = $("station-intro");
  var camp = $("level-deep");
  var counter = $("sealed-count");
  var levels = overlay.querySelectorAll(".level");
  var viewBtns = Array.prototype.slice.call(overlay.querySelectorAll(".view-btn"));
  var hotspots = {};
  var listBtns = {};
  var currentId = null;

  BREACHES.forEach(function (b, i) {
    var hs = btn("hotspot");
    hs.style.left = b.pos[0] + "%";
    hs.style.top = b.pos[1] + "%";
    hs.appendChild(photo(b));
    var tag = el("span", "hotspot-name", b.animal);
    tag.setAttribute("aria-hidden", "true");
    hs.appendChild(tag);
    hs.addEventListener("click", function () { openMission(b.id); });
    hs.addEventListener("focus", function () { moveLens(hs); });
    scene.appendChild(hs);
    hotspots[b.id] = hs;

    var li = el("li");
    var lb = btn("breach-item");
    var em = photo(b, "breach-item-photo");
    var text = el("span", "breach-item-text");
    text.appendChild(el("strong", "", b.name));
    text.appendChild(el("span", "", (i + 1) + ". " + b.aws));
    lb.appendChild(em);
    lb.appendChild(text);
    lb.appendChild(el("span", "breach-item-status"));
    lb.addEventListener("click", function () { openMission(b.id); });
    li.appendChild(lb);
    list.appendChild(li);
    listBtns[b.id] = lb;
  });

  /* Binocular lens follows the pointer, or the focused animal */
  function setLens(x, y) {
    scene.style.setProperty("--lx", x + "px");
    scene.style.setProperty("--ly", y + "px");
  }
  function moveLens(target) {
    var r = scene.getBoundingClientRect();
    var t = target.getBoundingClientRect();
    setLens(t.left + t.width / 2 - r.left, t.top + t.height / 2 - r.top);
  }
  var lensMoved = false;
  function centerLens() {
    if (lensMoved || scene.hidden) return;
    var r = scene.getBoundingClientRect();
    if (r.width) setLens(r.width / 2, r.height / 2);
  }
  scene.addEventListener("pointermove", function (e) {
    lensMoved = true;
    var r = scene.getBoundingClientRect();
    setLens(e.clientX - r.left, e.clientY - r.top);
  });
  window.addEventListener("resize", function () { lensMoved = false; centerLens(); });

  function render() {
    counter.textContent = String(state.sealed.length);
    intro.hidden = state.started;
    var inMission = !mission.hidden;
    field.hidden = !state.started || inMission;
    camp.hidden = !campUnlocked() || inMission;

    var reached = campUnlocked() ? 2 : plainsUnlocked() ? 1 : 0;
    var labels = ["Reached", plainsUnlocked() ? "Unlocked" : "Seal 3 to unlock", campUnlocked() ? "Unlocked" : "Seal all 5 to unlock"];
    Array.prototype.forEach.call(levels, function (li, i) {
      li.classList.toggle("is-reached", i <= reached);
      li.querySelector(".level-state").textContent = labels[i];
      if (i === reached) li.setAttribute("aria-current", "step");
      else li.removeAttribute("aria-current");
    });

    BREACHES.forEach(function (b, i) {
      var sealed = isSealed(b.id);
      hotspots[b.id].classList.toggle("is-sealed", sealed);
      hotspots[b.id].setAttribute("aria-label", (i + 1) + ". " + b.name + ", " + b.aws + ", " + (sealed ? "sealed" : "open"));
      listBtns[b.id].classList.toggle("is-sealed", sealed);
      listBtns[b.id].querySelector(".breach-item-status").textContent = sealed ? "Sealed" : "Open";
    });
    var open = BREACHES.length - state.sealed.length;
    var status = $("scene-status");
    if (status) status.textContent = open ? open + (open === 1 ? " OPEN BREACH" : " OPEN BREACHES") : "ALL CLEAR // STATION SECURE";
    if (!field.hidden) window.requestAnimationFrame(centerLens);
  }

  function setView(view) {
    scene.hidden = view !== "map";
    list.hidden = view !== "list";
    $("field-hint").textContent = view === "map"
      ? "Scan the station and tap a flashing breach to start its mission."
      : "Choose a breach to start its mission.";
    viewBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-view") === view)); });
  }
  viewBtns.forEach(function (b) {
    b.addEventListener("click", function () { setView(b.getAttribute("data-view")); });
  });

  /* ==========================================================
     Missions
     ========================================================== */
  function block(parent, heading, body, cls) {
    var wrap = el("div", "mission-block" + (cls ? " " + cls : ""));
    wrap.appendChild(el("h4", "", heading));
    wrap.appendChild(el("p", "", body));
    parent.appendChild(wrap);
    return wrap;
  }

  function openMission(id) {
    var b = byId(id);
    if (!b) return;
    clearTimers();
    currentId = id;
    mission.textContent = "";
    mission.hidden = false;

    var back = btn("link-btn mission-back", "");
    back.appendChild(icon("arrow-left"));
    back.appendChild(document.createTextNode(" Back to the station"));
    back.addEventListener("click", closeMission);
    mission.appendChild(back);

    var head = el("div", "mission-head");
    head.appendChild(photo(b, "mission-photo"));
    var titles = el("div");
    titles.appendChild(el("p", "breach-tag", "Breach " + (BREACHES.indexOf(b) + 1) + " of 5 | " + b.aws));
    var h = el("h3", "mission-title", b.name);
    h.id = "mission-title";
    h.tabIndex = -1;
    titles.appendChild(h);
    head.appendChild(titles);
    mission.appendChild(head);

    var info = el("div", "mission-info");
    block(info, "What went wrong", b.wrong);
    block(info, "Why it matters", b.why);
    mission.appendChild(info);

    var game = el("section", "game");
    game.setAttribute("aria-labelledby", "game-title");
    var gh = el("div", "game-head");
    var gt = el("h4", "", "Your move");
    gt.id = "game-title";
    gh.appendChild(gt);
    var bar = el("div", "game-progress");
    bar.setAttribute("role", "progressbar");
    bar.setAttribute("aria-label", "Mission progress");
    bar.setAttribute("aria-valuemin", "0");
    bar.setAttribute("aria-valuemax", "100");
    var fill = el("span", "game-progress-fill");
    bar.appendChild(fill);
    gh.appendChild(bar);
    game.appendChild(gh);

    var feedback = el("p", "game-feedback");
    feedback.setAttribute("aria-live", "polite");
    game.appendChild(feedback);

    var area = el("div", "game-area");
    game.appendChild(area);
    mission.appendChild(game);

    var result = el("div", "mission-result");
    result.hidden = true;
    mission.appendChild(result);

    var finished = false;
    var ui = {
      say: function (msg) { feedback.textContent = msg; },
      setProgress: function (p) {
        var pct = Math.round(Math.max(0, Math.min(1, p)) * 100);
        fill.style.width = pct + "%";
        bar.setAttribute("aria-valuenow", String(pct));
      },
      isDone: function () { return finished; },
      done: function (msg) {
        if (finished) return;
        finished = true;
        ui.setProgress(1);
        feedback.textContent = msg;
        feedback.classList.add("is-success");
        sealBreach(b.id, result);
      }
    };

    if (isSealed(b.id)) {
      var again = el("p", "game-note", "You already sealed this one. Play it again any time.");
      area.appendChild(again);
      var replay = btn("btn btn-small btn-ghost", "Play again");
      replay.addEventListener("click", function () {
        area.textContent = "";
        b.game(area, ui);
      });
      area.appendChild(replay);
      showResult(b, result, false);
    } else {
      b.game(area, ui);
    }

    render();
    $("station-scroll").scrollTop = 0;
    h.focus({ preventScroll: true });
  }

  function showResult(b, result, fresh) {
    result.textContent = "";
    result.hidden = false;
    var fix = block(result, "The fix", b.fix, "is-fix");
    fix.tabIndex = -1;
    var badge = el("p", "sealed-badge");
    badge.appendChild(icon("check"));
    badge.appendChild(document.createTextNode(" " + b.animal + " breach sealed"));
    result.appendChild(badge);

    var actions = el("div", "mission-actions");
    var next = nextOpen(b.id);
    if (next) {
      var nb = btn("btn btn-primary btn-small", "Next: " + byId(next).animal);
      nb.setAttribute("aria-label", "Next breach: " + byId(next).name);
      nb.addEventListener("click", function () { openMission(next); });
      actions.appendChild(nb);
    }
    var back = btn("btn btn-ghost btn-small", campUnlocked() ? "Go to Deep Space" : "Back to the station");
    back.addEventListener("click", function () {
      closeMission();
      if (campUnlocked()) {
        camp.scrollIntoView({ block: "start", behavior: reduced() ? "auto" : "smooth" });
        $("deep-title").focus({ preventScroll: true });
      }
    });
    actions.appendChild(back);
    result.appendChild(actions);
    if (fresh) fix.focus({ preventScroll: true });
    if (fresh) fix.scrollIntoView({ block: "nearest", behavior: reduced() ? "auto" : "smooth" });
  }

  function sealBreach(id, result) {
    var hadPlains = plainsUnlocked();
    var hadCamp = campUnlocked();
    if (!isSealed(id)) state.sealed.push(id);
    state.started = true;
    saveState();
    var b = byId(id);
    render();
    showResult(b, result, true);
    var msg = b.name + ": sealed. " + state.sealed.length + " of 5 breaches sealed.";
    if (!hadCamp && campUnlocked()) msg += " All five sealed. Deep Space unlocked.";
    else if (!hadPlains && plainsUnlocked()) msg += " Orbit unlocked.";
    announce(msg);
    if (!hadCamp && campUnlocked()) flash(camp);
  }

  function flash(n) {
    n.classList.remove("just-unlocked");
    void n.offsetWidth;
    n.classList.add("just-unlocked");
  }

  function closeMission() {
    clearTimers();
    mission.hidden = true;
    mission.textContent = "";
    render();
    var back = currentId && (scene.hidden ? listBtns[currentId] : hotspots[currentId]);
    if (back) back.focus();
    currentId = null;
  }

  /* ---------- Intro, skip, reset ---------- */
  $("station-start").addEventListener("click", function () {
    state.started = true;
    saveState();
    render();
    $("field-title").focus();
  });

  $("station-skip").addEventListener("click", function () {
    state.started = true;
    state.skipped = true;
    saveState();
    render();
    announce("Skipped to Deep Space.");
    camp.scrollIntoView({ block: "start", behavior: reduced() ? "auto" : "smooth" });
    $("deep-title").focus({ preventScroll: true });
  });

  $("station-reset").addEventListener("click", function () {
    clearTimers();
    state = freshState();
    store.remove(STORE_KEY);
    mission.hidden = true;
    mission.textContent = "";
    currentId = null;
    render();
    announce("Mission reset.");
    $("station-start").focus();
  });

  /* ==========================================================
     Open and close, with the binoculars transition
     ========================================================== */
  var page = [document.querySelector(".site-header"), document.getElementById("main"), document.querySelector(".footer"), document.querySelector(".skip-link"), document.getElementById("term-widget")];
  var lastFocus = null;
  var opening = false;

  function setPageInert(on) {
    page.forEach(function (n) {
      if (!n) return;
      n.inert = on;
      if (on) n.setAttribute("aria-hidden", "true");
      else n.removeAttribute("aria-hidden");
    });
  }

  /* A round viewport opens, pauses, then widens like a hatch */
  function viewport() {
    return new Promise(function (resolve) {
      if (reduced()) { resolve(); return; }
      var max = Math.hypot(window.innerWidth, window.innerHeight);
      var small = Math.min(window.innerWidth, window.innerHeight) * 0.2;
      var DURATION = 1300;
      var start = performance.now();
      overlay.classList.add("is-scoping");
      overlay.style.setProperty("--scope-r", "0px");
      function ease(t) { return 1 - Math.pow(1 - t, 3); }
      function step(now) {
        var t = Math.min(1, (now - start) / DURATION);
        var r;
        if (t < 0.3) r = small * ease(t / 0.3);
        else if (t < 0.55) r = small;
        else r = small + (max - small) * ease((t - 0.55) / 0.45);
        overlay.style.setProperty("--scope-r", r.toFixed(1) + "px");
        if (t < 1) window.requestAnimationFrame(step);
        else {
          overlay.classList.remove("is-scoping");
          overlay.style.removeProperty("--scope-r");
          resolve();
        }
      }
      window.requestAnimationFrame(step);
    });
  }

  /* ---------- Launch sound: plays only when a visitor clicks Launch Mission ---------- */
  var SOUND_KEY = "em-station-sound";
  var soundBtn = $("sound-toggle");
  var soundOn = store.get(SOUND_KEY) !== "0";
  var launchSound = null;

  function getLaunchSound() {
    if (launchSound || !window.Audio) return launchSound;
    launchSound = new Audio();
    launchSound.preload = "auto";
    launchSound.volume = 0.75;
    launchSound.src = launchSound.canPlayType('audio/ogg; codecs="opus"') ? "assets/audio/launch.ogg" : "assets/audio/launch.mp3";
    return launchSound;
  }

  function renderSound() {
    if (!soundBtn) return;
    soundBtn.classList.toggle("is-on", soundOn);
    soundBtn.querySelector(".sound-label").textContent = soundOn ? "Sound on" : "Sound off";
    soundBtn.querySelector(".sound-icon").textContent = soundOn ? "\uD83D\uDD0A" : "\uD83D\uDD07";
  }

  if (soundBtn) {
    soundBtn.addEventListener("click", function () {
      soundOn = !soundOn;
      store.set(SOUND_KEY, soundOn ? "1" : "0");
      if (!soundOn && launchSound) launchSound.pause();
      renderSound();
    });
    renderSound();
  }

  /* Warm the file up as soon as someone heads for the button */
  ["pointerenter", "focus", "touchstart"].forEach(function (ev) {
    launchBtn.addEventListener(ev, getLaunchSound, { passive: true });
  });

  /* Returns true when the launchSound actually started */
  function playLaunch() {
    if (!soundOn) return false;
    var a = getLaunchSound();
    if (!a) return false;
    try {
      a.currentTime = 0;
      var p = a.play();
      if (p && p.catch) p.catch(function () { /* blocked or missing: carry on silently */ });
      return true;
    } catch (e) {
      return false;
    }
  }

  function shakePage() {
    if (reduced()) return;
    document.body.classList.remove("launch-shake");
    void document.body.offsetWidth;
    document.body.classList.add("launch-shake");
    window.setTimeout(function () { document.body.classList.remove("launch-shake"); }, 700);
  }

  function openStation() {
    if (opening || !overlay.hidden) return;
    opening = true;
    lastFocus = document.activeElement;
    if (window.closeNavMenu) window.closeNavMenu();
    /* Liftoff rumble first, then the viewport opens while it rolls on */
    if (playLaunch()) {
      shakePage();
      window.setTimeout(showStation, 550);
    } else {
      showStation();
    }
  }

  function showStation() {
    mission.hidden = true;
    render();
    setView(window.innerWidth < 600 ? "list" : "map");
    overlay.hidden = false;
    document.body.classList.add("station-open");
    setPageInert(true);
    $("station-scroll").scrollTop = 0;
    $("station-title").focus({ preventScroll: true });
    viewport().then(function () {
      opening = false;
      centerLens();
    });
  }

  function closeStation() {
    if (overlay.hidden) return;
    clearTimers();
    if (launchSound) launchSound.pause();
    mission.hidden = true;
    mission.textContent = "";
    overlay.classList.remove("is-scoping");
    overlay.hidden = true;
    opening = false;
    document.body.classList.remove("station-open");
    setPageInert(false);
    var back = lastFocus && document.contains(lastFocus) && lastFocus.offsetParent !== null ? lastFocus : launchBtn;
    if (back.offsetParent === null) back = document.getElementById("nav-toggle");
    if (back) back.focus();
  }

  launchBtn.addEventListener("click", openStation);
  $("station-close").addEventListener("click", closeStation);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !overlay.hidden) {
      e.preventDefault();
      closeStation();
    }
  });

  /* Keep Tab inside the dialog for browsers without inert support */
  overlay.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    var f = Array.prototype.filter.call(
      overlay.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])"),
      function (n) { return n.offsetParent !== null; }
    );
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });

  render();
})();
