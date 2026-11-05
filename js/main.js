/* main.js: shared helpers, motion preference, navigation and projects */

(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  /* ---------- Storage that never throws (private mode, blocked cookies) ---------- */
  var SafeStore = {
    get: function (key) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    },
    set: function (key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch (e) {
        /* storage blocked: the site keeps working without saving */
      }
    },
    remove: function (key) {
      try {
        window.localStorage.removeItem(key);
      } catch (e) {
        /* ignore */
      }
    }
  };
  window.SafeStore = SafeStore;

  /* ---------- Reduce motion: OS setting first, then the visible toggle ---------- */
  var MOTION_KEY = "em-reduce-motion";
  var motionBtn = document.getElementById("motion-toggle");
  var motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

  function applyMotion(reduce) {
    root.classList.toggle("reduce-motion", reduce);
    root.classList.toggle("motion-ok", !reduce);
    if (motionBtn) motionBtn.setAttribute("aria-pressed", String(reduce));
    window.dispatchEvent(new CustomEvent("motionchange", { detail: { reduce: reduce } }));
  }

  var savedMotion = SafeStore.get(MOTION_KEY);
  var reduceMotion = savedMotion === null ? !!(motionQuery && motionQuery.matches) : savedMotion === "1";
  applyMotion(reduceMotion);

  if (motionBtn) {
    motionBtn.addEventListener("click", function () {
      reduceMotion = !reduceMotion;
      SafeStore.set(MOTION_KEY, reduceMotion ? "1" : "0");
      applyMotion(reduceMotion);
    });
  }

  if (motionQuery && motionQuery.addEventListener) {
    motionQuery.addEventListener("change", function (e) {
      if (SafeStore.get(MOTION_KEY) === null) {
        reduceMotion = e.matches;
        applyMotion(reduceMotion);
      }
    });
  }

  window.isReducedMotion = function () {
    return root.classList.contains("reduce-motion");
  };

  /* ---------- Mobile navigation ---------- */
  var navToggle = document.getElementById("nav-toggle");
  var navMenu = document.getElementById("nav-menu");
  var desktopQuery = window.matchMedia("(min-width: 1100px)");

  function isMenuOpen() {
    return navToggle.getAttribute("aria-expanded") === "true";
  }

  function setMenu(open, focusFirst) {
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    navMenu.classList.toggle("is-open", open);
    if (open && focusFirst) {
      var first = navMenu.querySelector("a, button");
      if (first) first.focus();
    }
  }
  window.closeNavMenu = function () {
    if (isMenuOpen()) setMenu(false);
  };

  navToggle.addEventListener("click", function () {
    setMenu(!isMenuOpen(), true);
  });

  navMenu.addEventListener("click", function (e) {
    if (e.target.closest("a, button") && !desktopQuery.matches) setMenu(false);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isMenuOpen()) {
      setMenu(false);
      navToggle.focus();
    }
  });

  document.addEventListener("click", function (e) {
    if (isMenuOpen() && !e.target.closest(".nav")) setMenu(false);
  });

  var onDesktopChange = function (e) {
    if (e.matches) setMenu(false);
  };
  if (desktopQuery.addEventListener) desktopQuery.addEventListener("change", onDesktopChange);

  /* ---------- Highlight the section in view ---------- */
  var sectionLinks = Array.prototype.slice.call(document.querySelectorAll("[data-section]"));

  function setActive(id) {
    sectionLinks.forEach(function (link) {
      if (link.getAttribute("data-section") === id) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sectionLinks.forEach(function (link) {
      var section = document.getElementById(link.getAttribute("data-section"));
      if (section) observer.observe(section);
    });
  }
  setActive("whoami");

  /* ---------- Footer year ---------- */
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
/* ---------- Projects: data, flip cards and filters ---------- */
(function () {
  "use strict";

  var grid = document.getElementById("project-grid");
  if (!grid) return;

  /* TODO: review every description, problem, build and outcome line below */
  var PROJECTS = [
    {
      id: "auto-pentest",
      name: "Auto-Pentest",
      categories: ["Security", "AI"],
      summary: "AI driven multi-agent API vulnerability scanner. My final-year capstone.",
      tech: ["Python", "Multi-agent AI", "OWASP API Top 10"],
      problem: "Manual API security testing is slow, so many endpoints ship without ever being tested.",
      built: "A team of AI agents that maps an API, generates attack cases, runs them and writes up the findings.",
      outcome: "Repeatable scans that surface issues like broken auth and injection, each with a suggested fix.",
      repo: null /* TODO: private repo. Add the URL here if you make it public */
    },
    {
      id: "chama-keeper",
      name: "Chama Keeper",
      categories: ["AI", "Community"],
      summary: "Autonomous agent that runs the books for African savings groups (chamas).",
      tech: ["Strands Agents SDK", "Amazon Bedrock", "Python"],
      problem: "Chamas often track contributions in notebooks and chat threads, which leads to errors and disputes.",
      built: "An autonomous agent on the Strands Agents SDK that records contributions, sends reminders and answers balance questions.",
      outcome: "A single, transparent record every member can trust, with far less admin for the treasurer.",
      repo: "https://github.com/Eve-maina/Chama-Keeper"
    },
    {
      id: "procrastination-police",
      name: "Procrastination Police",
      categories: ["AI", "Cloud"],
      summary: "AI task tracker that spots missed deadlines and sends a tone based accountability nudge.",
      tech: ["AWS Lambda", "DynamoDB", "Bedrock", "SNS"],
      problem: "Task apps remind you, but nothing holds you accountable when a deadline quietly slips.",
      built: "A serverless tracker on Lambda and DynamoDB that detects missed deadlines and uses Bedrock to write a message in the tone you choose, delivered by app and email through SNS.",
      outcome: "Missed tasks get a personal follow up within minutes instead of being forgotten.",
      repo: "https://github.com/Eve-maina/Procrastination-Police"
    },
    {
      id: "cost-ledger",
      name: "Cost Ledger",
      categories: ["Cloud"],
      summary: "Small serverless pipeline that tracks your AWS spend and serves it to a browser dashboard.",
      tech: ["Terraform", "AWS Lambda", "Cost Explorer"],
      problem: "AWS bills can surprise you, and the billing console is not where you look every day.",
      built: "A Terraform provisioned pipeline that pulls cost data on a schedule and serves it to a lightweight dashboard.",
      outcome: "Daily spend is visible at a glance, so cost spikes are caught early.",
      repo: "https://github.com/Eve-maina/Cost-Ledger"
    },
    {
      id: "broken-labs",
      name: "Broken Labs",
      categories: ["Cloud", "Security"],
      summary: "Deliberately misconfigured AWS networking labs, built with Terraform, for troubleshooting practice.",
      tech: ["Terraform", "AWS VPC", "Networking"],
      problem: "Most tutorials show working networks, but real skill comes from fixing broken ones.",
      built: "Terraform labs that deploy VPCs with planted faults in routes, security groups and NACLs.",
      outcome: "A safe, repeatable way to practise diagnosing cloud networking issues, then tear it all down.",
      repo: "https://github.com/Eve-maina/Day-Start-" /* TODO: this URL is the same as Daystart. Replace with the Broken Labs repo */
    },
    {
      id: "daystart",
      name: "Daystart",
      categories: ["AI"],
      summary: "Autonomous AI learning coach that sends a daily email lesson.",
      tech: ["AI agents", "Python", "Email automation"] /* TODO: confirm the tech stack */,
      problem: "Learning goals stall without a small, consistent daily push.",
      built: "An autonomous agent that plans a learning path and sends a focused lesson by email every morning.",
      outcome: "A daily learning habit that runs itself, with no app to open.",
      repo: "https://github.com/Eve-maina/Day-Start-"
    }
  ];

  var sorted = PROJECTS;
  window.PORTFOLIO_PROJECTS = PROJECTS;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function icon(name) {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "icon");
    svg.setAttribute("aria-hidden", "true");
    var use = document.createElementNS(ns, "use");
    use.setAttribute("href", "assets/icons.svg#" + name);
    svg.appendChild(use);
    return svg;
  }
  window.makeIcon = icon;

  function repoLink(project) {
    var a = el("a", "btn btn-small btn-gh");
    a.appendChild(icon("github"));
    if (project.repo) {
      a.href = project.repo;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.appendChild(document.createTextNode(" GitHub"));
      a.appendChild(el("span", "sr-only", " repository for " + project.name + " (opens in a new tab)"));
    } else {
      a.href = "#contact";
      a.classList.add("is-private");
      a.appendChild(document.createTextNode(" Private repo"));
      a.appendChild(el("span", "sr-only", " for " + project.name + ", contact me for access"));
    }
    return a;
  }

  function flipButton(label, srLabel) {
    var b = el("button", "btn btn-small btn-flip");
    b.type = "button";
    b.appendChild(icon("flip"));
    b.appendChild(document.createTextNode(" " + label));
    b.appendChild(el("span", "sr-only", " " + srLabel));
    return b;
  }

  function buildCard(project, isFirst) {
    var card = el("article", "project-card");
    card.setAttribute("data-categories", project.categories.join(" "));
    card.setAttribute("aria-labelledby", "p-" + project.id);

    var inner = el("div", "card-inner");

    /* Front */
    var front = el("div", "card-face card-front");

    var title = el("h3", "card-title", project.name);
    title.id = "p-" + project.id;
    front.appendChild(title);
    front.appendChild(el("p", "card-summary", project.summary));

    var tags = el("ul", "tag-list");
    tags.setAttribute("aria-label", "Tech used");
    project.tech.slice(0, 3).forEach(function (t) { tags.appendChild(el("li", "tag", t)); });
    front.appendChild(tags);

    var frontActions = el("div", "card-actions");
    frontActions.appendChild(repoLink(project));
    var toBack = flipButton("Details", "about " + project.name);
    frontActions.appendChild(toBack);
    front.appendChild(frontActions);

    if (isFirst) {
      var hint = el("p", "flip-hint");
      hint.setAttribute("aria-hidden", "true");
      hint.appendChild(icon("flip"));
      hint.appendChild(document.createTextNode(" Tap to flip"));
      front.appendChild(hint);
    }

    /* Back */
    var back = el("div", "card-face card-back");
    back.inert = true;
    back.setAttribute("aria-hidden", "true");
    back.appendChild(el("h4", "card-title", project.name));
    var dl = el("dl", "card-details");
    [["The problem", project.problem], ["What I built", project.built], ["The outcome", project.outcome]]
      .forEach(function (row) {
        dl.appendChild(el("dt", "", row[0]));
        dl.appendChild(el("dd", "", row[1]));
      });
    back.appendChild(dl);

    var backActions = el("div", "card-actions");
    backActions.appendChild(repoLink(project));
    var toFront = flipButton("Back", "to " + project.name + " summary");
    backActions.appendChild(toFront);
    back.appendChild(backActions);

    inner.appendChild(front);
    inner.appendChild(back);
    card.appendChild(inner);

    function flip() {
      var flipped = !card.classList.contains("is-flipped");
      var hadFocus = (flipped ? front : back).contains(document.activeElement);
      card.classList.toggle("is-flipped", flipped);
      front.inert = flipped;
      back.inert = !flipped;
      front.setAttribute("aria-hidden", String(flipped));
      back.setAttribute("aria-hidden", String(!flipped));
      if (hadFocus) (flipped ? toFront : toBack).focus();
      var h = grid.querySelector(".flip-hint");
      if (h) h.remove();
    }

    toBack.addEventListener("click", flip);
    toFront.addEventListener("click", flip);

    /* Click or tap anywhere on the card flips it, except on links and buttons */
    card.addEventListener("click", function (e) {
      if (e.target.closest("a, button")) return;
      if (window.getSelection && String(window.getSelection())) return;
      flip();
    });

    return card;
  }

  var cards = sorted.map(function (p, i) {
    var c = buildCard(p, i === 0);
    grid.appendChild(c);
    return c;
  });

  /* Filters */
  var filterBtns = Array.prototype.slice.call(document.querySelectorAll(".filter-chip"));
  var status = document.getElementById("filter-status");

  filterBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var f = btn.getAttribute("data-filter");
      filterBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
      var shown = 0;
      cards.forEach(function (card) {
        var match = f === "All" || card.getAttribute("data-categories").split(" ").indexOf(f) !== -1;
        card.hidden = !match;
        if (match) shown++;
      });
      if (status) {
        status.textContent = "Showing " + shown + (shown === 1 ? " project" : " projects") +
          (f === "All" ? "" : " tagged " + f);
      }
    });
  });
})();

/* ---------- Skills: systems check lights up one by one when scrolled into view ---------- */
(function () {
  "use strict";

  var panel = document.getElementById("sys-panel");
  if (!panel || !("IntersectionObserver" in window)) return;
  if (window.isReducedMotion && window.isReducedMotion()) return;

  var items = panel.querySelectorAll(".sys-item");
  var count = document.getElementById("sys-online");
  Array.prototype.forEach.call(items, function (item, i) {
    item.style.setProperty("--i", String(i));
  });
  panel.classList.add("is-booting");
  if (count) count.textContent = "0";

  var observer = new IntersectionObserver(function (entries) {
    if (!entries[0].isIntersecting) return;
    observer.disconnect();
    panel.classList.remove("is-booting");
    panel.classList.add("is-online");
    var n = 0;
    var timer = window.setInterval(function () {
      n++;
      if (count) count.textContent = String(n);
      if (n >= items.length) window.clearInterval(timer);
    }, 110);
  }, { threshold: 0.35 });
  observer.observe(panel);
})();
