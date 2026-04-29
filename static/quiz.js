"use strict";

const state = {
  pool: [],
  quiz: [],
  index: 0,
  correctCount: 0,
  shuffleOptions: true,
  results: [],
  currentSelection: new Set(),
  answered: false,
};

const els = {
  poolSize: document.getElementById("pool-size"),
  loadingMsg: document.getElementById("loading-msg"),
  setup: document.getElementById("setup-screen"),
  quiz: document.getElementById("quiz-screen"),
  results: document.getElementById("results-screen"),

  quizSize: document.getElementById("quiz-size"),
  quizSizeValue: document.getElementById("quiz-size-value"),
  shuffleOpts: document.getElementById("shuffle-options"),
  startBtn: document.getElementById("start-btn"),

  qNumber: document.getElementById("q-number"),
  qSource: document.getElementById("q-source"),
  qText: document.getElementById("q-text"),
  qOptions: document.getElementById("q-options"),
  qFeedback: document.getElementById("q-feedback"),
  feedbackIcon: document.getElementById("feedback-icon"),
  feedbackTitle: document.getElementById("feedback-title"),
  feedbackExplanation: document.getElementById("feedback-explanation"),
  submitBtn: document.getElementById("submit-btn"),
  nextBtn: document.getElementById("next-btn"),
  quitBtn: document.getElementById("quit-btn"),

  resultScore: document.getElementById("result-score"),
  resultTotal: document.getElementById("result-total"),
  resultPercent: document.getElementById("result-percent"),
  resultVerdict: document.getElementById("result-verdict"),
  missedCount: document.getElementById("missed-count"),
  missedList: document.getElementById("missed-list"),
  restartBtn: document.getElementById("restart-btn"),

  sessionStats: document.getElementById("session-stats"),
  statProgress: document.getElementById("stat-progress"),
  statCorrect: document.getElementById("stat-correct"),
  statPercent: document.getElementById("stat-percent"),

  modalOverlay: document.getElementById("modal-overlay"),
  modalTitle: document.getElementById("modal-title"),
  modalBody: document.getElementById("modal-body"),
  modalConfirm: document.getElementById("modal-confirm"),
  modalCancel: document.getElementById("modal-cancel"),
};

function shuffle(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickRandom(arr, n) {
  return shuffle(arr).slice(0, Math.min(n, arr.length));
}

async function loadQuestions() {
  try {
    const res = await fetch("data/questions.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.pool = await res.json();
    els.poolSize.textContent = state.pool.length.toLocaleString();
    els.loadingMsg.textContent = `Loaded ${state.pool.length} questions. Ready when you are.`;
    els.startBtn.disabled = false;
    // Default the slider to 75 unless the pool is smaller.
    const defaultSize = Math.min(75, state.pool.length);
    els.quizSize.value = defaultSize;
    els.quizSizeValue.value = defaultSize;
    els.quizSize.max = Math.min(90, state.pool.length);
  } catch (err) {
    console.error(err);
    els.loadingMsg.textContent =
      "Could not load questions.json. Run python3 build_questions.py first.";
  }
}

function show(screen) {
  for (const s of [els.setup, els.quiz, els.results]) {
    s.classList.add("hidden");
  }
  screen.classList.remove("hidden");
}

function startQuiz() {
  const size = parseInt(els.quizSize.value, 10) || 75;
  state.shuffleOptions = els.shuffleOpts.checked;
  state.quiz = pickRandom(state.pool, size).map((q) => prepareQuestion(q));
  state.index = 0;
  state.correctCount = 0;
  state.results = [];
  state.answered = false;
  els.sessionStats.classList.remove("hidden");
  updateStats();
  show(els.quiz);
  renderQuestion();
}

function prepareQuestion(q) {
  // Build a per-attempt copy that optionally re-letters shuffled options.
  const letters = Object.keys(q.options).sort();
  const ordered = letters.map((letter) => ({
    originalLetter: letter,
    text: q.options[letter],
    isCorrect: q.correct.includes(letter),
  }));
  const display = state.shuffleOptions ? shuffle(ordered) : ordered;
  const newLetters = "ABCDEFGH".slice(0, display.length).split("");
  const finalOptions = display.map((opt, i) => ({
    ...opt,
    letter: newLetters[i],
  }));
  const correctLetters = finalOptions
    .filter((o) => o.isCorrect)
    .map((o) => o.letter);

  return {
    id: q.id,
    topic: q.topic,
    number: q.number,
    question: q.question,
    options: finalOptions,
    correct: correctLetters,
    isMulti: correctLetters.length > 1,
    explanation: q.explanation || "",
  };
}

function renderQuestion() {
  const q = state.quiz[state.index];
  state.currentSelection = new Set();
  state.answered = false;
  els.qNumber.textContent = `Question ${state.index + 1} of ${state.quiz.length}`;
  els.qSource.textContent = `Topic ${q.topic} · #${q.number}`;

  // Show stem; append a "(Choose N)" hint if multi-correct.
  const stem = q.question;
  if (q.isMulti && !/choose\s+(two|three|all)/i.test(stem)) {
    els.qText.innerHTML = `${escapeHtml(stem)} <span class="multi-hint">(Choose ${q.correct.length})</span>`;
  } else {
    els.qText.textContent = stem;
  }

  els.qOptions.innerHTML = "";
  q.options.forEach((opt) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option";
    btn.dataset.letter = opt.letter;
    btn.innerHTML = `
      <span class="letter">${opt.letter}</span>
      <span class="text">${escapeHtml(opt.text)}</span>
    `;
    btn.addEventListener("click", () => onOptionClick(opt.letter));
    li.appendChild(btn);
    els.qOptions.appendChild(li);
  });

  // Show or hide the multi-select Submit button.
  if (q.isMulti) {
    els.submitBtn.classList.remove("hidden");
    els.submitBtn.disabled = true;
    els.submitBtn.textContent = `Submit (0 of ${q.correct.length} selected)`;
  } else {
    els.submitBtn.classList.add("hidden");
  }

  els.qFeedback.classList.add("hidden");
  els.qFeedback.classList.remove("correct", "incorrect");
  els.nextBtn.disabled = true;
  els.nextBtn.textContent =
    state.index === state.quiz.length - 1 ? "Finish quiz" : "Next question";
}

function onOptionClick(letter) {
  const q = state.quiz[state.index];
  if (state.answered) return;

  if (!q.isMulti) {
    // Single-answer: instant feedback on click.
    finalizeAnswer(new Set([letter]));
    return;
  }

  // Multi-answer: toggle selection, wait for Submit.
  const btn = els.qOptions.querySelector(`.option[data-letter="${letter}"]`);
  if (state.currentSelection.has(letter)) {
    state.currentSelection.delete(letter);
    btn.classList.remove("selected");
  } else {
    state.currentSelection.add(letter);
    btn.classList.add("selected");
  }
  const need = q.correct.length;
  const have = state.currentSelection.size;
  els.submitBtn.textContent = `Submit (${have} of ${need} selected)`;
  els.submitBtn.disabled = have === 0;
}

function submitMulti() {
  if (state.answered) return;
  finalizeAnswer(state.currentSelection);
}

function finalizeAnswer(selectedSet) {
  const q = state.quiz[state.index];
  state.answered = true;

  const correctSet = new Set(q.correct);
  const isCorrect =
    selectedSet.size === correctSet.size &&
    [...selectedSet].every((l) => correctSet.has(l));

  if (isCorrect) state.correctCount += 1;

  state.results.push({
    question: q,
    chosen: [...selectedSet].sort(),
    isCorrect,
  });

  const buttons = els.qOptions.querySelectorAll(".option");
  buttons.forEach((btn) => {
    const l = btn.dataset.letter;
    btn.disabled = true;
    btn.classList.remove("selected");
    const inCorrect = correctSet.has(l);
    const inSelected = selectedSet.has(l);
    if (inCorrect && inSelected) btn.classList.add("correct");
    else if (inCorrect && !inSelected) btn.classList.add("missed");
    else if (!inCorrect && inSelected) btn.classList.add("incorrect");
    else btn.classList.add("dimmed");
  });

  els.submitBtn.classList.add("hidden");
  showFeedback(isCorrect, q, [...selectedSet].sort());
  els.nextBtn.disabled = false;
  updateStats();
}

function showFeedback(isCorrect, q, chosenArr) {
  els.qFeedback.classList.remove("hidden", "correct", "incorrect");
  els.qFeedback.classList.add(isCorrect ? "correct" : "incorrect");
  els.feedbackIcon.textContent = isCorrect ? "✓" : "✕";

  const correctStr = q.correct.join(", ");
  const chosenStr = chosenArr.length ? chosenArr.join(", ") : "nothing";
  if (isCorrect) {
    els.feedbackTitle.textContent = q.isMulti
      ? `Correct — ${correctStr} are both right.`
      : `Correct — ${correctStr} is right.`;
  } else {
    els.feedbackTitle.textContent = `Not quite — you picked ${chosenStr}, correct answer is ${correctStr}.`;
  }

  const explanation = q.explanation
    ? q.explanation
    : "(No additional explanation available for this question.)";
  els.feedbackExplanation.textContent = explanation;
}

function nextQuestion() {
  if (!state.answered) return;
  state.index += 1;
  if (state.index >= state.quiz.length) {
    showResults();
    return;
  }
  renderQuestion();
}

function updateStats() {
  const answered = state.results.length;
  els.statProgress.textContent = `${answered} / ${state.quiz.length}`;
  els.statCorrect.textContent = `${state.correctCount}`;
  const pct = answered === 0 ? 0 : Math.round((state.correctCount / answered) * 100);
  els.statPercent.textContent = `${pct}%`;
}

function showResults() {
  const total = state.quiz.length;
  const score = state.correctCount;
  const pct = Math.round((score / total) * 100);
  els.resultScore.textContent = score;
  els.resultTotal.textContent = total;
  els.resultPercent.textContent = `${pct}%`;
  els.resultVerdict.textContent = verdictFor(pct);

  const missed = state.results.filter((r) => !r.isCorrect);
  els.missedCount.textContent = missed.length;
  els.missedList.innerHTML = "";
  missed.forEach((m) => {
    const chosenArr = Array.isArray(m.chosen) ? m.chosen : [m.chosen];
    const yourAnswer = chosenArr.length
      ? chosenArr
          .map((l) => `${l}. ${letterText(m.question, l)}`)
          .join(" + ")
      : "(no answer)";
    const correctAnswer = m.question.correct
      .map((l) => `${l}. ${letterText(m.question, l)}`)
      .join(" + ");
    const item = document.createElement("div");
    item.className = "missed-item";
    item.innerHTML = `
      <h4>${escapeHtml(m.question.question)}</h4>
      <div class="answers">
        Your answer: <span class="wrong">${escapeHtml(yourAnswer)}</span>
      </div>
      <div class="answers">
        Correct answer: <span class="right">${escapeHtml(correctAnswer)}</span>
      </div>
      <div class="why">${escapeHtml(m.question.explanation || "")}</div>
    `;
    els.missedList.appendChild(item);
  });

  show(els.results);
}

function letterText(q, letter) {
  const opt = q.options.find((o) => o.letter === letter);
  return opt ? opt.text : "";
}

function verdictFor(pct) {
  if (pct >= 90) return "Outstanding — you're well above passing range.";
  if (pct >= 80) return "Strong work — keep drilling weak topics and you're set.";
  if (pct >= 70) return "Right around the SY0-701 pass line. Review your misses below.";
  if (pct >= 60) return "Getting there — focus on the missed topics and run another quiz.";
  return "Keep going — review the explanations below and try another randomized round.";
}

function openModal({ title, body, confirmText = "Confirm", cancelText = "Cancel", onConfirm }) {
  els.modalTitle.textContent = title;
  els.modalBody.textContent = body;
  els.modalConfirm.textContent = confirmText;
  els.modalCancel.textContent = cancelText;
  els.modalOverlay.classList.remove("hidden");

  const cleanup = () => {
    els.modalOverlay.classList.add("hidden");
    els.modalConfirm.removeEventListener("click", confirmHandler);
    els.modalCancel.removeEventListener("click", cancelHandler);
    els.modalOverlay.removeEventListener("click", overlayHandler);
    document.removeEventListener("keydown", keyHandler);
  };
  const confirmHandler = () => {
    cleanup();
    onConfirm && onConfirm();
  };
  const cancelHandler = () => cleanup();
  const overlayHandler = (e) => {
    if (e.target === els.modalOverlay) cleanup();
  };
  const keyHandler = (e) => {
    if (e.key === "Escape") cleanup();
    if (e.key === "Enter") confirmHandler();
  };

  els.modalConfirm.addEventListener("click", confirmHandler);
  els.modalCancel.addEventListener("click", cancelHandler);
  els.modalOverlay.addEventListener("click", overlayHandler);
  document.addEventListener("keydown", keyHandler);

  setTimeout(() => els.modalConfirm.focus(), 50);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function init() {
  els.quizSize.addEventListener("input", () => {
    els.quizSizeValue.value = els.quizSize.value;
  });
  els.startBtn.addEventListener("click", startQuiz);
  els.submitBtn.addEventListener("click", submitMulti);
  els.nextBtn.addEventListener("click", nextQuestion);
  els.quitBtn.addEventListener("click", () => {
    if (state.results.length === 0) {
      openModal({
        title: "Leave the quiz?",
        body: "You haven't answered any questions yet. Going back will discard this quiz and return you to the setup screen.",
        confirmText: "Back to setup",
        cancelText: "Stay",
        onConfirm: () => {
          els.sessionStats.classList.add("hidden");
          show(els.setup);
        },
      });
      return;
    }
    const remaining = state.quiz.length - state.results.length;
    openModal({
      title: "End quiz now?",
      body: `You'll see your results so far. ${remaining} question${remaining === 1 ? "" : "s"} you haven't reached will be skipped.`,
      confirmText: "End quiz",
      cancelText: "Keep going",
      onConfirm: () => showResults(),
    });
  });
  els.restartBtn.addEventListener("click", () => {
    els.sessionStats.classList.add("hidden");
    show(els.setup);
  });

  loadQuestions();
}

document.addEventListener("DOMContentLoaded", init);
