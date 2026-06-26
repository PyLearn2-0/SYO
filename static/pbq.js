"use strict";

/* ------------------------------------------------------------------ *
 * PBQ Lessons + PBQ Test.
 *
 * This script runs AFTER app.js, so it shares app.js's top-level
 * bindings (state, els, show, prepareQuestion, renderQuestion,
 * updateExamStats, pickRandom, escapeHtml, ...). It adds two modes:
 *   - PBQ Lessons : guided readers built from PBQ_DATA.lessons
 *   - PBQ Test    : a 5-question quiz that reuses the exam engine and
 *                   the existing results/review screen.
 * ------------------------------------------------------------------ */

(function () {
  const data = window.PBQ_DATA || { lessons: [], questions: [] };

  const pbq = {
    // mode buttons
    btnLessons: document.getElementById("mode-pbq-lessons"),
    btnTest: document.getElementById("mode-pbq-test"),

    // hub
    hub: document.getElementById("pbq-hub"),
    list: document.getElementById("pbq-lesson-list"),
    hubTestBtn: document.getElementById("pbq-hub-test-btn"),

    // lesson reader
    lesson: document.getElementById("pbq-lesson"),
    lessonBack: document.getElementById("pbq-lesson-back"),
    lessonProgress: document.getElementById("pbq-lesson-progress"),
    lessonEyebrow: document.getElementById("pbq-lesson-eyebrow"),
    lessonTitle: document.getElementById("pbq-lesson-title"),
    lessonBody: document.getElementById("pbq-lesson-body"),
    lessonPrev: document.getElementById("pbq-lesson-prev"),
    lessonNext: document.getElementById("pbq-lesson-next"),

    // test setup
    setup: document.getElementById("pbq-setup"),
    catGrid: document.getElementById("pbq-cat-grid"),
    startBtn: document.getElementById("pbq-start-btn"),
    loadingMsg: document.getElementById("pbq-loading-msg"),

    // interactive test runner
    xScreen: document.getElementById("pbqx-screen"),
    xProgress: document.getElementById("pbqx-progress"),
    xMark: document.getElementById("pbqx-mark"),
    xTitle: document.getElementById("pbqx-title"),
    xScenario: document.getElementById("pbqx-scenario"),
    xBody: document.getElementById("pbqx-body"),
    xFeedback: document.getElementById("pbqx-feedback"),
    xFeedbackIcon: document.getElementById("pbqx-feedback-icon"),
    xFeedbackTitle: document.getElementById("pbqx-feedback-title"),
    xFeedbackText: document.getElementById("pbqx-feedback-text"),
    xReset: document.getElementById("pbqx-reset"),
    xSubmit: document.getElementById("pbqx-submit"),
    xPrev: document.getElementById("pbqx-prev"),
    xNext: document.getElementById("pbqx-next"),
    xExit: document.getElementById("pbqx-exit"),

    // interactive results
    xResults: document.getElementById("pbqx-results"),
    xScore: document.getElementById("pbqx-result-score"),
    xPercent: document.getElementById("pbqx-result-percent"),
    xBar: document.getElementById("pbqx-result-bar"),
    xVerdict: document.getElementById("pbqx-result-verdict"),
    xReview: document.getElementById("pbqx-review"),
    xResultsHome: document.getElementById("pbqx-results-home"),
    xResultsRestart: document.getElementById("pbqx-results-restart"),
  };

  const TEST_BANK = window.PBQ_TEST || [];

  let lessonIndex = 0;
  let selectedCategory = "all";
  const TEST_SIZE = 5;

  // active test
  const T = { quiz: [], i: 0, answers: [], graded: [] };
  let picked = null; // drag/drop: currently selected chip {item, from}

  /* -------------------------- block renderer -------------------------- */

  function esc(t) {
    return String(t == null ? "" : t)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderBlock(b) {
    switch (b.type) {
      case "p":
        return `<p class="lb-p">${esc(b.text)}</p>`;

      case "h":
        return `<h3 class="lb-h">${esc(b.text)}</h3>`;

      case "list": {
        const tag = b.ordered ? "ol" : "ul";
        const items = b.items.map((i) => `<li>${esc(i)}</li>`).join("");
        return `<${tag} class="lb-list">${items}</${tag}>`;
      }

      case "steps": {
        const items = b.items
          .map(
            (i, n) =>
              `<li><span class="lb-step-num">${n + 1}</span><span class="lb-step-text">${esc(
                i
              )}</span></li>`
          )
          .join("");
        return `<ol class="lb-steps">${items}</ol>`;
      }

      case "callout": {
        const v = ["tip", "warn", "key", "note"].includes(b.variant)
          ? b.variant
          : "note";
        const labelMap = { tip: "Tip", warn: "Watch out", key: "Key idea", note: "Scenario" };
        const title = b.title || labelMap[v];
        return (
          `<div class="lb-callout lb-${v}">` +
          `<div class="lb-callout-title">${esc(title)}</div>` +
          `<p class="lb-callout-text">${esc(b.text)}</p>` +
          `</div>`
        );
      }

      case "keys": {
        const items = b.items.map((i) => `<li>${esc(i)}</li>`).join("");
        return (
          `<div class="lb-keys">` +
          `<div class="lb-keys-title">Key takeaways</div>` +
          `<ul>${items}</ul></div>`
        );
      }

      case "table": {
        const head = b.head.map((h) => `<th>${esc(h)}</th>`).join("");
        const rows = b.rows
          .map(
            (r) =>
              `<tr>${r
                .map((c, i) => `<td${i === 0 ? ' class="lb-td-key"' : ""}>${esc(c)}</td>`)
                .join("")}</tr>`
          )
          .join("");
        const cap = b.caption ? `<figcaption class="lb-cap">${esc(b.caption)}</figcaption>` : "";
        return (
          `<figure class="lb-table-wrap"><table class="lb-table">` +
          `<thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>${cap}</figure>`
        );
      }

      case "log": {
        const intro = b.intro ? `<div class="lb-log-intro">${esc(b.intro)}</div>` : "";
        const lines = b.lines
          .map(
            (l) =>
              `<div class="lb-logline${l.bad ? " bad" : ""}">` +
              `<span class="lb-logtag">${l.bad ? "ALERT" : "INFO"}</span>` +
              `<span class="lb-logmeta">${esc(l.meta)}</span>` +
              `<span class="lb-logtext">${esc(l.text)}</span></div>`
          )
          .join("");
        return `${intro}<div class="lb-log">${lines}</div>`;
      }

      case "diagram": {
        // Authored HTML only (never user input) -> safe to inject.
        const title = b.title ? `<figcaption class="lb-cap">${esc(b.title)}</figcaption>` : "";
        return `<figure class="lb-diagram">${b.html}${title}</figure>`;
      }

      default:
        return "";
    }
  }

  /* ------------------------------- hub ------------------------------- */

  function buildHub() {
    pbq.list.innerHTML = "";
    data.lessons.forEach((l, i) => {
      const li = document.createElement("li");
      li.className = "lesson-card";
      li.tabIndex = 0;
      li.setAttribute("role", "button");
      li.innerHTML =
        `<span class="lesson-card-index">${i + 1}</span>` +
        `<span class="lesson-card-main">` +
        `<span class="lesson-card-eyebrow">${esc(l.eyebrow || "")}</span>` +
        `<span class="lesson-card-title">${esc(l.title)}</span>` +
        `<span class="lesson-card-summary">${esc(l.summary || "")}</span></span>` +
        `<span class="lesson-card-meta">${esc(l.minutes ? l.minutes + " min" : "")}<span class="lesson-card-arrow" aria-hidden="true">→</span></span>`;
      const open = () => openLesson(i);
      li.addEventListener("click", open);
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      });
      pbq.list.appendChild(li);
    });
  }

  function openHub() {
    els.sessionStats.classList.add("hidden");
    show(pbq.hub);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  /* --------------------------- lesson reader -------------------------- */

  function openLesson(i) {
    lessonIndex = Math.max(0, Math.min(i, data.lessons.length - 1));
    const l = data.lessons[lessonIndex];

    pbq.lessonEyebrow.textContent = l.eyebrow || "PBQ Lesson";
    pbq.lessonTitle.textContent = l.title;
    pbq.lessonProgress.textContent = `Lesson ${lessonIndex + 1} of ${data.lessons.length}`;
    pbq.lessonBody.innerHTML = (l.blocks || []).map(renderBlock).join("");

    pbq.lessonPrev.disabled = lessonIndex === 0;
    const isLast = lessonIndex === data.lessons.length - 1;
    pbq.lessonNext.textContent = isLast ? "Take the PBQ test →" : "Next lesson ›";

    show(pbq.lesson);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function nextLesson() {
    if (lessonIndex >= data.lessons.length - 1) {
      openPbqSetup();
      return;
    }
    openLesson(lessonIndex + 1);
  }

  function prevLesson() {
    if (lessonIndex > 0) openLesson(lessonIndex - 1);
  }

  /* ============================== PBQ TEST ============================ */

  // Pool = interactive bank + the simple MCQs from PBQ_DATA (tagged mcq).
  function fullPool() {
    const mcqs = (data.questions || []).map((q) =>
      Object.assign({ type: "mcq" }, q)
    );
    return TEST_BANK.concat(mcqs);
  }

  function poolFor(cat) {
    const pool = fullPool();
    if (cat === "all") return pool;
    return pool.filter((q) => q.category === cat);
  }

  function openPbqSetup() {
    els.sessionStats.classList.add("hidden");
    const count = poolFor(selectedCategory).length;
    pbq.loadingMsg.textContent = `${count} questions available in this focus area.`;
    pbq.startBtn.disabled = count < 1;
    show(pbq.setup);
    window.scrollTo({ top: 0, behavior: "auto" });
  }
  window.openPbqSetup = openPbqSetup;

  function selectCategory(cat) {
    selectedCategory = cat;
    pbq.catGrid.querySelectorAll(".pbq-cat").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.cat === cat);
    });
    const count = poolFor(cat).length;
    pbq.loadingMsg.textContent = `${count} questions available in this focus area.`;
    pbq.startBtn.disabled = count < 1;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function blankAnswer(q) {
    switch (q.type) {
      case "mcq":
        return { selected: [] };
      case "dragdrop":
        return { tray: q.items.slice(), zones: q.zones.map(() => []) };
      case "grid":
        return { cells: q.rows.map(() => ({})) };
      case "logselect":
        return { lines: [], attack: "" };
      default:
        return {};
    }
  }

  function startTest() {
    const pool = poolFor(selectedCategory);
    if (!pool.length) return;
    T.quiz = shuffle(pool).slice(0, Math.min(TEST_SIZE, pool.length));
    T.i = 0;
    T.answers = T.quiz.map(blankAnswer);
    T.graded = T.quiz.map(() => null);
    state.mode = "pbqTest";
    renderActive();
  }

  /* --------------------------- grading helpers ------------------------ */

  function norm(s) {
    return String(s == null ? "" : s).trim().toLowerCase();
  }
  function matchCell(expected, val) {
    const v = norm(val);
    if (v === "") return false;
    const list = Array.isArray(expected) ? expected : [expected];
    return list.some((e) => norm(e) === v || (norm(e) === "any" && v === "any"));
  }
  function sameSet(a, b) {
    if (a.length !== b.length) return false;
    const sa = a.slice().sort();
    const sb = b.slice().sort();
    return sa.every((x, i) => x === sb[i]);
  }

  function grade(q, ans) {
    if (q.type === "mcq") {
      const correct = q.correct.slice();
      const ok = sameSet(ans.selected, correct);
      return { score: ok ? 1 : 0, max: 1, correct: ok };
    }
    if (q.type === "dragdrop") {
      let score = 0;
      q.zones.forEach((z, zi) => {
        if (sameSet(ans.zones[zi], z.answer)) score++;
      });
      return { score, max: q.zones.length, correct: score === q.zones.length };
    }
    if (q.type === "grid") {
      let score = 0;
      let max = 0;
      q.rows.forEach((row, ri) => {
        q.columns.forEach((col) => {
          max++;
          if (matchCell(row.answer[col.key], (ans.cells[ri] || {})[col.key])) score++;
        });
      });
      return { score, max, correct: score === max };
    }
    if (q.type === "logselect") {
      const mal = [];
      q.lines.forEach((l, i) => { if (l.bad) mal.push(i); });
      let lineScore = 0;
      q.lines.forEach((l, i) => {
        const picked = ans.lines.indexOf(i) !== -1;
        if (picked === !!l.bad) lineScore++;
      });
      const linesExact = sameSet(ans.lines, mal);
      const attackOk = norm(ans.attack) === norm(q.attackAnswer);
      return {
        score: lineScore + (attackOk ? 1 : 0),
        max: q.lines.length + 1,
        correct: linesExact && attackOk,
        linesExact,
        attackOk,
      };
    }
    return { score: 0, max: 1, correct: false };
  }

  /* --------------------------- body renderers ------------------------- */

  function renderMcq(q, ans, locked) {
    const single = q.correct.length < 2;
    const prompt = `<p class="pbqx-q">${esc(q.question)}</p>`;
    const hint = single
      ? ""
      : `<p class="pbqx-multi-hint">Select all that apply.</p>`;
    const opts = Object.keys(q.options)
      .map((k) => {
        const chosen = ans.selected.indexOf(k) !== -1;
        const isCorrect = q.correct.indexOf(k) !== -1;
        let cls = "pbqx-opt";
        if (chosen) cls += " is-chosen";
        if (locked) {
          if (isCorrect) cls += " is-correct";
          else if (chosen) cls += " is-wrong";
        }
        return (
          `<button type="button" class="${cls}" data-letter="${k}" ${locked ? "disabled" : ""}>` +
          `<span class="pbqx-opt-letter">${k}</span>` +
          `<span class="pbqx-opt-text">${esc(q.options[k])}</span></button>`
        );
      })
      .join("");
    return `${prompt}${hint}<div class="pbqx-opts">${opts}</div>`;
  }

  function renderDragdrop(q, ans, locked) {
    const trayChips = ans.tray
      .map((it) => `<button type="button" class="pbqx-chip" data-item="${esc(it)}" data-from="tray" ${locked ? "disabled" : ""}>${esc(it)}</button>`)
      .join("");
    const zones = q.zones
      .map((z, zi) => {
        const placed = ans.zones[zi];
        const chips = placed
          .map((it) => {
            let cls = "pbqx-chip pbqx-chip-placed";
            if (locked) cls += z.answer.indexOf(it) !== -1 ? " is-correct" : " is-wrong";
            return `<button type="button" class="${cls}" data-item="${esc(it)}" data-from="${zi}" ${locked ? "disabled" : ""}>${esc(it)}</button>`;
          })
          .join("");
        const empty = placed.length === 0 && !locked ? `<span class="pbqx-drop-hint">Drop items here</span>` : "";
        const answerLine = locked
          ? `<div class="pbqx-zone-answer">Correct: ${z.answer.map(esc).join(", ")}</div>`
          : "";
        return (
          `<div class="pbqx-zone">` +
          `<div class="pbqx-drop${locked ? " is-locked" : ""}" data-zone="${zi}">${chips}${empty}</div>` +
          `<div class="pbqx-zone-desc">${esc(z.prompt)}${answerLine}</div>` +
          `</div>`
        );
      })
      .join("");
    return (
      `<div class="pbqx-dnd">` +
      `<div class="pbqx-tray">${trayChips || '<span class="pbqx-tray-empty">All placed</span>'}</div>` +
      `<div class="pbqx-zones">${zones}</div></div>`
    );
  }

  function renderGrid(q, ans, locked) {
    const diagram = q.diagram ? `<figure class="lb-diagram pbqx-diagram">${q.diagram}</figure>` : "";
    const head =
      `<th class="pbqx-grid-rowhead">${esc(q.rowLabel || "Threat Scenario")}</th>` +
      q.columns.map((c) => `<th>${esc(c.label)}</th>`).join("");
    const body = q.rows
      .map((row, ri) => {
        const cells = q.columns
          .map((col) => {
            const val = (ans.cells[ri] || {})[col.key] || "";
            if (locked) {
              const ok = matchCell(row.answer[col.key], val);
              const want = Array.isArray(row.answer[col.key]) ? row.answer[col.key][0] : row.answer[col.key];
              return (
                `<td class="pbqx-cell ${ok ? "is-correct" : "is-wrong"}">` +
                `<span class="pbqx-cell-val">${esc(val || "—")}</span>` +
                (ok ? "" : `<span class="pbqx-cell-want">${esc(want)}</span>`) +
                `</td>`
              );
            }
            if (col.kind === "text") {
              return `<td><input type="text" class="pbqx-input" data-row="${ri}" data-key="${col.key}" value="${esc(val)}" placeholder="${esc(col.placeholder || "")}" /></td>`;
            }
            const opts =
              `<option value="">-- Select --</option>` +
              col.options.map((o) => `<option value="${esc(o)}"${o === val ? " selected" : ""}>${esc(o)}</option>`).join("");
            return `<td><select class="pbqx-select" data-row="${ri}" data-key="${col.key}">${opts}</select></td>`;
          })
          .join("");
        return `<tr><td class="pbqx-grid-prompt">${esc(row.prompt)}</td>${cells}</tr>`;
      })
      .join("");
    return (
      diagram +
      `<div class="pbqx-grid-wrap"><table class="pbqx-grid"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`
    );
  }

  function renderLogselect(q, ans, locked) {
    const opts =
      `<option value="">--Select--</option>` +
      q.attackOptions.map((o) => `<option value="${esc(o)}"${o === ans.attack ? " selected" : ""}>${esc(o)}</option>`).join("");
    const attackCls = locked ? (norm(ans.attack) === norm(q.attackAnswer) ? " is-correct" : " is-wrong") : "";
    const attack =
      `<div class="pbqx-attack">` +
      `<label for="pbqx-attack-sel">Identify the Type of Attack:</label>` +
      `<select id="pbqx-attack-sel" class="pbqx-select${attackCls}" ${locked ? "disabled" : ""}>${opts}</select>` +
      (locked && norm(ans.attack) !== norm(q.attackAnswer) ? `<span class="pbqx-attack-want">Answer: ${esc(q.attackAnswer)}</span>` : "") +
      `</div>`;
    const lines = q.lines
      .map((l, i) => {
        const sel = ans.lines.indexOf(i) !== -1;
        let cls = "pbqx-logline";
        if (sel) cls += " is-sel";
        if (locked) {
          if (l.bad) cls += " is-mal";
          if (sel && !l.bad) cls += " is-falsepos";
          if (!sel && l.bad) cls += " is-missed";
        }
        return (
          `<button type="button" class="${cls}" data-idx="${i}" ${locked ? "disabled" : ""}>` +
          `<span class="pbqx-logtag ${l.level === "ERROR" ? "tag-err" : "tag-info"}">${l.level}</span>` +
          `<span class="pbqx-logtext">${esc(l.text)}</span></button>`
        );
      })
      .join("");
    return (
      attack +
      `<p class="pbqx-log-instr">Select the pieces of evidence that indicate the correct answer:</p>` +
      `<div class="pbqx-log">${lines}</div>`
    );
  }

  function renderBody(q, ans, locked) {
    switch (q.type) {
      case "mcq": return renderMcq(q, ans, locked);
      case "dragdrop": return renderDragdrop(q, ans, locked);
      case "grid": return renderGrid(q, ans, locked);
      case "logselect": return renderLogselect(q, ans, locked);
      default: return "";
    }
  }

  /* --------------------------- event wiring --------------------------- */

  function wireBody(q, ans) {
    const root = pbq.xBody;
    if (q.type === "mcq") {
      const single = q.correct.length < 2;
      root.querySelectorAll(".pbqx-opt").forEach((b) => {
        b.addEventListener("click", () => {
          const k = b.dataset.letter;
          const at = ans.selected.indexOf(k);
          if (single) {
            ans.selected = [k];
          } else if (at === -1) {
            ans.selected.push(k);
          } else {
            ans.selected.splice(at, 1);
          }
          rerenderBody();
        });
      });
    } else if (q.type === "dragdrop") {
      const place = (item, from, zoneIdx) => {
        // remove from current location
        if (from === "tray") {
          const k = ans.tray.indexOf(item);
          if (k !== -1) ans.tray.splice(k, 1);
        } else {
          const z = ans.zones[Number(from)];
          const k = z.indexOf(item);
          if (k !== -1) z.splice(k, 1);
        }
        if (zoneIdx === "tray") ans.tray.push(item);
        else ans.zones[zoneIdx].push(item);
        picked = null;
        rerenderBody();
      };
      root.querySelectorAll(".pbqx-chip").forEach((c) => {
        c.setAttribute("draggable", "true");
        c.addEventListener("dragstart", (e) => {
          picked = { item: c.dataset.item, from: c.dataset.from };
          e.dataTransfer.setData("text/plain", c.dataset.item);
        });
        c.addEventListener("click", () => {
          if (c.dataset.from === "tray") {
            // toggle pick
            if (picked && picked.item === c.dataset.item) { picked = null; updatePicked(); return; }
            picked = { item: c.dataset.item, from: "tray" };
            updatePicked();
          } else {
            // placed chip -> send back to tray
            place(c.dataset.item, c.dataset.from, "tray");
          }
        });
      });
      root.querySelectorAll(".pbqx-drop").forEach((d) => {
        const zi = Number(d.dataset.zone);
        d.addEventListener("click", () => {
          if (picked) place(picked.item, picked.from, zi);
        });
        d.addEventListener("dragover", (e) => { e.preventDefault(); d.classList.add("is-over"); });
        d.addEventListener("dragleave", () => d.classList.remove("is-over"));
        d.addEventListener("drop", (e) => {
          e.preventDefault();
          d.classList.remove("is-over");
          if (picked) place(picked.item, picked.from, zi);
        });
      });
    } else if (q.type === "grid") {
      root.querySelectorAll(".pbqx-select").forEach((s) => {
        s.addEventListener("change", () => {
          const ri = Number(s.dataset.row);
          ans.cells[ri] = ans.cells[ri] || {};
          ans.cells[ri][s.dataset.key] = s.value;
        });
      });
      root.querySelectorAll(".pbqx-input").forEach((inp) => {
        inp.addEventListener("input", () => {
          const ri = Number(inp.dataset.row);
          ans.cells[ri] = ans.cells[ri] || {};
          ans.cells[ri][inp.dataset.key] = inp.value;
        });
      });
    } else if (q.type === "logselect") {
      const sel = root.querySelector("#pbqx-attack-sel");
      if (sel) sel.addEventListener("change", () => { ans.attack = sel.value; });
      root.querySelectorAll(".pbqx-logline").forEach((b) => {
        b.addEventListener("click", () => {
          const idx = Number(b.dataset.idx);
          const at = ans.lines.indexOf(idx);
          if (at === -1) ans.lines.push(idx);
          else ans.lines.splice(at, 1);
          rerenderBody();
        });
      });
    }
  }

  function updatePicked() {
    pbq.xBody.querySelectorAll(".pbqx-chip[data-from='tray']").forEach((c) => {
      c.classList.toggle("is-picked", !!picked && picked.item === c.dataset.item);
    });
  }

  function rerenderBody() {
    const q = T.quiz[T.i];
    const ans = T.answers[T.i];
    const locked = !!T.graded[T.i];
    pbq.xBody.innerHTML = renderBody(q, ans, locked);
    if (!locked) wireBody(q, ans);
    if (q.type === "dragdrop" && !locked) updatePicked();
  }

  /* ------------------------------ screens ----------------------------- */

  function renderActive() {
    picked = null;
    const q = T.quiz[T.i];
    const ans = T.answers[T.i];
    const g = T.graded[T.i];
    const locked = !!g;

    pbq.xProgress.textContent = `Question ${T.i + 1} of ${T.quiz.length}`;
    pbq.xTitle.textContent = q.type === "mcq" ? (q.topic || "Knowledge Check") : q.title;
    pbq.xScenario.textContent = q.type === "mcq" ? "" : (q.scenario || "");
    pbq.xScenario.classList.toggle("hidden", !pbq.xScenario.textContent);

    pbq.xBody.innerHTML = renderBody(q, ans, locked);
    if (!locked) wireBody(q, ans);

    // feedback + buttons
    if (locked) {
      showFeedback(q, g);
      pbq.xSubmit.classList.add("hidden");
      pbq.xReset.classList.add("hidden");
      pbq.xNext.classList.remove("hidden");
      pbq.xNext.textContent = T.i === T.quiz.length - 1 ? "Review answers ›" : "Next ›";
    } else {
      pbq.xFeedback.classList.add("hidden");
      pbq.xSubmit.classList.remove("hidden");
      pbq.xReset.classList.remove("hidden");
      pbq.xNext.classList.add("hidden");
    }
    pbq.xPrev.disabled = T.i === 0;

    show(pbq.xScreen);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function showFeedback(q, g) {
    const fb = pbq.xFeedback;
    fb.classList.remove("hidden", "is-correct", "is-partial", "is-wrong");
    let cls, icon, title;
    if (g.correct) {
      cls = "is-correct"; icon = "✓"; title = "Correct";
    } else if (g.score > 0) {
      cls = "is-partial"; icon = "◑"; title = `Partially correct — ${g.score} / ${g.max}`;
    } else {
      cls = "is-wrong"; icon = "✕"; title = "Incorrect";
    }
    fb.classList.add(cls);
    pbq.xFeedbackIcon.textContent = icon;
    pbq.xFeedbackTitle.textContent = title;
    pbq.xFeedbackText.textContent = q.explanation || "";
  }

  function submitActive() {
    const q = T.quiz[T.i];
    const ans = T.answers[T.i];
    T.graded[T.i] = grade(q, ans);
    renderActive();
  }

  function resetActive() {
    if (T.graded[T.i]) return;
    T.answers[T.i] = blankAnswer(T.quiz[T.i]);
    picked = null;
    renderActive();
  }

  function nextActive() {
    if (T.i === T.quiz.length - 1) { showResults(); return; }
    T.i++;
    renderActive();
  }

  function prevActive() {
    if (T.i > 0) { T.i--; renderActive(); }
  }

  function showResults() {
    let full = 0, totScore = 0, totMax = 0;
    T.quiz.forEach((q, i) => {
      const g = T.graded[i] || grade(q, T.answers[i]);
      T.graded[i] = g;
      if (g.correct) full++;
      totScore += g.score;
      totMax += g.max;
    });
    const pct = totMax ? Math.round((totScore / totMax) * 100) : 0;

    pbq.xScore.textContent = `${full} / ${T.quiz.length}`;
    pbq.xPercent.textContent = `${pct}%`;
    pbq.xBar.style.width = pct + "%";
    pbq.xBar.className = "pbqx-bar-fill " + (pct >= 80 ? "good" : pct >= 60 ? "ok" : "low");
    pbq.xVerdict.textContent =
      full === T.quiz.length
        ? "Perfect score — you nailed every task."
        : pct >= 80
        ? "Strong work. Review the misses below and you're exam-ready."
        : pct >= 60
        ? "Solid start. Re-read the lessons for the topics you missed."
        : "Keep practicing — work through the PBQ lessons, then retry.";

    pbq.xReview.innerHTML = "";
    T.quiz.forEach((q, i) => {
      const g = T.graded[i];
      const item = document.createElement("div");
      item.className = "pbqx-review-item " + (g.correct ? "ok" : g.score > 0 ? "partial" : "bad");
      const tag = g.correct ? "Correct" : g.score > 0 ? `Partial ${g.score}/${g.max}` : "Incorrect";
      const titleTxt = q.type === "mcq" ? (q.topic || "Knowledge Check") : q.title;
      const head =
        `<div class="pbqx-review-head">` +
        `<span class="pbqx-review-num">Q${i + 1}</span>` +
        `<span class="pbqx-review-title">${esc(titleTxt)}</span>` +
        `<span class="pbqx-review-badge">${tag}</span></div>`;
      const scn = q.type === "mcq" ? "" : `<p class="pbqx-review-scn">${esc(q.scenario || "")}</p>`;
      const body = `<div class="pbqx-review-body">${renderBody(q, T.answers[i], true)}</div>`;
      const exp = `<div class="pbqx-review-exp"><strong>Why:</strong> ${esc(q.explanation || "")}</div>`;
      item.innerHTML = head + scn + body + exp;
      pbq.xReview.appendChild(item);
    });

    els.sessionStats.classList.add("hidden");
    show(pbq.xResults);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function exitTest() {
    state.mode = null;
    goHome();
  }

  // Read-only introspection hook (used by automated UI tests; harmless).
  window.__pbq = {
    cur: () => ({ q: T.quiz[T.i], ans: T.answers[T.i], i: T.i, n: T.quiz.length, graded: T.graded[T.i] }),
  };

  /* ------------------------------- wire ------------------------------- */

  function init() {
    if (pbq.btnLessons) pbq.btnLessons.addEventListener("click", () => { buildHub(); openHub(); });
    if (pbq.btnTest) pbq.btnTest.addEventListener("click", () => { selectCategory("all"); openPbqSetup(); });

    if (pbq.hubTestBtn) pbq.hubTestBtn.addEventListener("click", () => { selectCategory("all"); openPbqSetup(); });

    if (pbq.lessonBack) pbq.lessonBack.addEventListener("click", () => { buildHub(); openHub(); });
    if (pbq.lessonPrev) pbq.lessonPrev.addEventListener("click", prevLesson);
    if (pbq.lessonNext) pbq.lessonNext.addEventListener("click", nextLesson);

    if (pbq.catGrid) {
      pbq.catGrid.querySelectorAll(".pbq-cat").forEach((b) => {
        b.addEventListener("click", () => selectCategory(b.dataset.cat));
      });
    }
    if (pbq.startBtn) pbq.startBtn.addEventListener("click", startTest);

    if (pbq.xSubmit) pbq.xSubmit.addEventListener("click", submitActive);
    if (pbq.xReset) pbq.xReset.addEventListener("click", resetActive);
    if (pbq.xNext) pbq.xNext.addEventListener("click", nextActive);
    if (pbq.xPrev) pbq.xPrev.addEventListener("click", prevActive);
    if (pbq.xExit) pbq.xExit.addEventListener("click", exitTest);
    if (pbq.xMark) pbq.xMark.addEventListener("click", () => pbq.xMark.classList.toggle("is-marked"));
    if (pbq.xResultsHome) pbq.xResultsHome.addEventListener("click", exitTest);
    if (pbq.xResultsRestart) pbq.xResultsRestart.addEventListener("click", openPbqSetup);

    buildHub();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
