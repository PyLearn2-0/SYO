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
  };

  let lessonIndex = 0;
  let selectedCategory = "all";
  const TEST_SIZE = 5;

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

  /* ----------------------------- PBQ test ----------------------------- */

  function openPbqSetup() {
    els.sessionStats.classList.add("hidden");
    const count = poolFor(selectedCategory).length;
    pbq.loadingMsg.textContent = `${count} questions available in this focus area.`;
    pbq.startBtn.disabled = count === 0;
    show(pbq.setup);
    window.scrollTo({ top: 0, behavior: "auto" });
  }
  // Expose for app.js restartCurrentMode().
  window.openPbqSetup = openPbqSetup;

  function poolFor(cat) {
    if (cat === "all") return data.questions.slice();
    return data.questions.filter((q) => q.category === cat);
  }

  function startTest() {
    const pool = poolFor(selectedCategory);
    if (!pool.length) return;

    state.mode = "pbqTest";
    state.shuffleOptions = false; // keep letters aligned with explanations
    state.quiz = pickRandom(pool, TEST_SIZE).map((q) => prepareQuestion(q));
    state.index = 0;
    state.correctCount = 0;
    state.results = [];
    state.answered = false;

    els.statProgressLabel.textContent = "answered";
    els.statCorrectLabel.textContent = "correct";
    els.sessionStats.classList.remove("hidden");
    updateExamStats();
    show(els.examScreen);
    renderQuestion();
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function selectCategory(cat) {
    selectedCategory = cat;
    pbq.catGrid.querySelectorAll(".pbq-cat").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.cat === cat);
    });
    const count = poolFor(cat).length;
    pbq.loadingMsg.textContent = `${count} questions available in this focus area.`;
    pbq.startBtn.disabled = count === 0;
  }

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

    buildHub();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
