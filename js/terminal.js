/* terminal.js: a small, real-looking terminal in the bottom right corner.
   Visitors type straight onto the prompt line. A hidden text input does the
   actual typing (so mobile keyboards and screen readers work) and its value
   is mirrored onto the prompt with a block cursor.
   Commands: help, whoami, skills, projects, clear, exit. */

(function () {
  "use strict";

  var widget = document.getElementById("term-widget");
  var panel = document.getElementById("term-panel");
  var launcher = document.getElementById("term-launcher");
  var closeBtn = document.getElementById("term-close");
  var screen = document.getElementById("term-screen");
  var output = document.getElementById("term-output");
  var form = document.getElementById("term-form");
  var input = document.getElementById("term-input");
  var typed = document.getElementById("term-typed");
  if (!widget || !panel || !launcher || !screen || !output || !form || !input || !typed) return;

  var history = [];
  var historyIndex = 0;
  var greeted = false;

  /* ---------- Output helpers ---------- */
  function line(text, cls) {
    var p = document.createElement("p");
    p.className = "term-line" + (cls ? " " + cls : "");
    if (text != null) p.textContent = text;
    output.appendChild(p);
    return p;
  }

  function span(text, cls) {
    var s = document.createElement("span");
    s.className = cls;
    s.textContent = text;
    return s;
  }

  function link(label, href) {
    var a = document.createElement("a");
    a.href = href;
    a.textContent = label;
    if (/^https?:/.test(href)) {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
    return a;
  }

  /* The prompt, as it appears on every echoed command */
  function promptLine(cmd) {
    var p = line(null, "t-echo");
    p.appendChild(span("eve@portfolio", "p-user"));
    p.appendChild(span(":", "p-sep"));
    p.appendChild(span("~", "p-path"));
    p.appendChild(span("$", "p-sign"));
    p.appendChild(document.createTextNode(" " + cmd));
  }

  function pad(text, size) {
    while (text.length < size) text += " ";
    return text;
  }

  function scrollDown() {
    screen.scrollTop = screen.scrollHeight;
  }

  /* ---------- Commands ---------- */
  var COMMANDS = {
    help: {
      about: "show this list",
      run: function () {
        line("Available commands:", "t-bold");
        Object.keys(COMMANDS).forEach(function (name) {
          var p = line(null);
          p.appendChild(span("  " + pad(name, 10), "t-green"));
          p.appendChild(document.createTextNode(COMMANDS[name].about));
        });
      }
    },
    whoami: {
      about: "who is Eve Maina",
      run: function () {
        line("eve-maina", "t-bold");
        line("role      Cloud Engineer");
        line("mission   I architect and build secure cloud systems.");
        line("offline   hiking, adventure and a good book");
        var p = line("contact   ");
        p.appendChild(link("linkedin.com/in/eve-maina", "https://www.linkedin.com/in/eve-maina/"));
      }
    },
    skills: {
      about: "list my skills",
      run: function () {
        var names = Array.prototype.map.call(document.querySelectorAll(".skill-names .sys-name"), function (n) {
          return n.textContent.trim();
        });
        line("total " + names.length, "t-dim");
        names.forEach(function (n) {
          var p = line(null);
          p.appendChild(span("drwxr-xr-x  ", "t-dim"));
          p.appendChild(span(n, "t-blue"));
        });
      }
    },
    projects: {
      about: "list what I have built",
      run: function () {
        var list = window.PORTFOLIO_PROJECTS || [];
        line("total " + list.length, "t-dim");
        list.forEach(function (proj) {
          var p = line(null);
          p.appendChild(span(proj.name, "t-yellow"));
          p.appendChild(document.createTextNode("  " + proj.summary + " "));
          if (proj.repo) p.appendChild(link("[repo]", proj.repo));
          else p.appendChild(span("[private]", "t-dim"));
        });
      }
    },
    clear: {
      about: "clear the screen",
      run: function () { output.textContent = ""; }
    },
    exit: {
      about: "close the terminal",
      run: function () { setOpen(false); }
    }
  };

  function execute(raw) {
    var cmd = raw.trim();
    promptLine(cmd);
    if (!cmd) { scrollDown(); return; }
    history.push(cmd);
    historyIndex = history.length;
    var name = cmd.toLowerCase();
    if (name === "sudo" || name.indexOf("sudo ") === 0) {
      line("eve is not in the sudoers file. This incident will be reported.", "t-red");
      line("(least privilege, always)", "t-dim");
    } else if (COMMANDS[name]) {
      COMMANDS[name].run();
    } else {
      line("zsh: command not found: " + cmd, "t-red");
      line("Type help to see available commands.", "t-dim");
    }
    scrollDown();
  }

  /* ---------- Typing on the prompt line ---------- */
  function render() {
    var value = input.value;
    var pos = input.selectionStart == null ? value.length : input.selectionStart;
    typed.textContent = "";
    typed.appendChild(document.createTextNode(value.slice(0, pos)));
    var cursor = span(value.charAt(pos) || " ", "term-cursor");
    typed.appendChild(cursor);
    typed.appendChild(document.createTextNode(value.slice(pos + 1)));
  }

  ["input", "keyup", "click", "select", "focus"].forEach(function (ev) {
    input.addEventListener(ev, render);
  });
  document.addEventListener("selectionchange", function () {
    if (document.activeElement === input) render();
  });

  /* Clicking anywhere on the screen puts you back on the prompt,
     unless you clicked a link or are selecting text */
  screen.addEventListener("click", function (e) {
    if (e.target.closest("a")) return;
    if (window.getSelection && String(window.getSelection())) return;
    input.focus();
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var value = input.value;
    input.value = "";
    execute(value);
    render();
  });

  input.addEventListener("keydown", function (e) {
    if (e.key === "ArrowUp") {
      if (!history.length) return;
      e.preventDefault();
      historyIndex = Math.max(0, historyIndex - 1);
      input.value = history[historyIndex];
      input.setSelectionRange(input.value.length, input.value.length);
      render();
    } else if (e.key === "ArrowDown") {
      if (!history.length) return;
      e.preventDefault();
      historyIndex = Math.min(history.length, historyIndex + 1);
      input.value = history[historyIndex] || "";
      input.setSelectionRange(input.value.length, input.value.length);
      render();
    } else if (e.key === "Tab" && input.value.trim()) {
      var start = input.value.trim().toLowerCase();
      var match = Object.keys(COMMANDS).filter(function (c) { return c.indexOf(start) === 0; });
      if (match.length === 1) {
        e.preventDefault();
        input.value = match[0];
        render();
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      output.textContent = "";
    }
  });

  /* ---------- Open and close ---------- */
  function lastLogin() {
    var d = new Date();
    var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var t = ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2) + ":" + ("0" + d.getSeconds()).slice(-2);
    return "Last login: " + days[d.getDay()] + " " + months[d.getMonth()] + " " + d.getDate() + " " + t + " on ttys001";
  }

  function setOpen(open) {
    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", String(open));
    widget.classList.toggle("is-open", open);
    if (open) {
      if (!greeted) {
        greeted = true;
        line(lastLogin(), "t-dim");
        line("Welcome to Eve's portfolio shell. Type help and press Enter.");
      }
      render();
      input.focus();
      scrollDown();
    } else {
      launcher.focus();
    }
  }

  launcher.addEventListener("click", function () { setOpen(panel.hidden); });
  closeBtn.addEventListener("click", function () { setOpen(false); });

  panel.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      e.stopPropagation();
      setOpen(false);
    }
  });

  render();
})();
