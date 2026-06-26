"use strict";

/* ------------------------------------------------------------------ *
 * CompTIA Security+ SY0-701 Study Hub
 * Three modes share one engine:
 *   - exam         : multiple-choice practice quiz (instant feedback)
 *   - examFlash    : flip cards built from the question pool
 *   - acronymFlash : flip cards from the official CompTIA acronym list
 * ------------------------------------------------------------------ */

const MODE = { EXAM: "exam", EXAM_FLASH: "examFlash", ACRONYM_FLASH: "acronymFlash" };

const state = {
  mode: null,
  questionPool: [],
  acronymPool: [],

  // exam
  quiz: [],
  index: 0,
  correctCount: 0,
  shuffleOptions: false,
  results: [],
  currentSelection: new Set(),
  answered: false,

  // flashcards
  deck: [],
  fIndex: 0,
  knownCount: 0,
  definitionFirst: false,
  fResults: [],
  revealed: false,
};

const els = {
  // screens
  home: document.getElementById("home-screen"),
  examSetup: document.getElementById("exam-setup"),
  examScreen: document.getElementById("exam-screen"),
  flashSetup: document.getElementById("flash-setup"),
  flashScreen: document.getElementById("flash-screen"),
  results: document.getElementById("results-screen"),

  // header / nav
  brandHome: document.getElementById("brand-home"),
  homeLoading: document.getElementById("home-loading"),
  modeExam: document.getElementById("mode-exam"),
  modeExamFlash: document.getElementById("mode-exam-flash"),
  modeAcronymFlash: document.getElementById("mode-acronym-flash"),

  // session stats
  sessionStats: document.getElementById("session-stats"),
  statProgress: document.getElementById("stat-progress"),
  statProgressLabel: document.getElementById("stat-progress-label"),
  statCorrect: document.getElementById("stat-correct"),
  statCorrectLabel: document.getElementById("stat-correct-label"),
  statPercent: document.getElementById("stat-percent"),

  // exam setup
  poolSize: document.getElementById("pool-size"),
  loadingMsg: document.getElementById("loading-msg"),
  quizSize: document.getElementById("quiz-size"),
  quizSizeValue: document.getElementById("quiz-size-value"),
  shuffleOpts: document.getElementById("shuffle-options"),
  startBtn: document.getElementById("start-btn"),

  // exam screen
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

  // flash setup
  flashSetupTitle: document.getElementById("flash-setup-title"),
  flashSetupLead: document.getElementById("flash-setup-lead"),
  deckSize: document.getElementById("deck-size"),
  deckSizeValue: document.getElementById("deck-size-value"),
  flipControl: document.getElementById("flip-control"),
  flipDirection: document.getElementById("flip-direction"),
  flashStartBtn: document.getElementById("flash-start-btn"),
  flashLoadingMsg: document.getElementById("flash-loading-msg"),

  // flash screen
  cNumber: document.getElementById("c-number"),
  cPromptLabel: document.getElementById("c-prompt-label"),
  flashcard: document.getElementById("flashcard"),
  flashcardKicker: document.getElementById("flashcard-kicker"),
  flashcardFront: document.getElementById("flashcard-front"),
  flashcardOptions: document.getElementById("flashcard-options"),
  flashcardHint: document.getElementById("flashcard-hint"),
  cFeedback: document.getElementById("c-feedback"),
  cFeedbackIcon: document.getElementById("c-feedback-icon"),
  cFeedbackTitle: document.getElementById("c-feedback-title"),
  cFeedbackLabel: document.getElementById("c-feedback-label"),
  cFeedbackExplanation: document.getElementById("c-feedback-explanation"),
  revealGroup: document.getElementById("reveal-group"),
  revealBtn: document.getElementById("reveal-btn"),
  gradeGroup: document.getElementById("grade-group"),
  knownBtn: document.getElementById("known-btn"),
  missedBtn: document.getElementById("missed-btn"),
  flashQuitBtn: document.getElementById("flash-quit-btn"),

  // results
  resultsEyebrow: document.getElementById("results-eyebrow"),
  resultsHeadline: document.getElementById("results-headline"),
  resultScore: document.getElementById("result-score"),
  resultTotal: document.getElementById("result-total"),
  resultPercent: document.getElementById("result-percent"),
  resultVerdict: document.getElementById("result-verdict"),
  resultBarFill: document.getElementById("result-bar-fill"),
  reviewLabel: document.getElementById("review-label"),
  missedCount: document.getElementById("missed-count"),
  missedList: document.getElementById("missed-list"),
  resultsHomeBtn: document.getElementById("results-home-btn"),
  restartBtn: document.getElementById("restart-btn"),

  // modal
  modalOverlay: document.getElementById("modal-overlay"),
  modalTitle: document.getElementById("modal-title"),
  modalBody: document.getElementById("modal-body"),
  modalConfirm: document.getElementById("modal-confirm"),
  modalCancel: document.getElementById("modal-cancel"),
};

/* ----------------------------- helpers ---------------------------- */

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

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function show(screen) {
  const extra = [
    document.getElementById("pbq-hub"),
    document.getElementById("pbq-lesson"),
    document.getElementById("pbq-setup"),
  ];
  for (const s of [
    els.home,
    els.examSetup,
    els.examScreen,
    els.flashSetup,
    els.flashScreen,
    els.results,
    ...extra,
  ]) {
    if (s) s.classList.add("hidden");
  }
  screen.classList.remove("hidden");
}

function goHome() {
  els.sessionStats.classList.add("hidden");
  show(els.home);
}

/* ------------------------------ data ------------------------------ */

async function loadQuestions() {
  try {
    const res = await fetch("data/questions.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.questionPool = await res.json();
    els.poolSize.textContent = state.questionPool.length.toLocaleString();
    els.loadingMsg.textContent = `Loaded ${state.questionPool.length} questions. Ready when you are.`;
    els.startBtn.disabled = false;
    const defaultSize = Math.min(75, state.questionPool.length);
    els.quizSize.value = defaultSize;
    els.quizSizeValue.value = defaultSize;
    els.quizSize.max = Math.min(90, state.questionPool.length);
    els.homeLoading.textContent = "";
    els.homeLoading.classList.add("hidden");
  } catch (err) {
    console.error(err);
    els.loadingMsg.textContent =
      "Could not load questions.json. Run python build_questions.py first.";
    els.homeLoading.textContent = "Could not load the question bank.";
  }
}

async function loadAcronyms() {
  if (state.acronymPool.length) return true;
  try {
    const res = await fetch("data/acronyms.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.acronymPool = await res.json();
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

/* --------------------------- mode routing ------------------------- */

function chooseMode(mode) {
  state.mode = mode;
  if (mode === MODE.EXAM) {
    openExamSetup();
  } else {
    openFlashSetup(mode);
  }
}

function openExamSetup() {
  show(els.examSetup);
}

async function openFlashSetup(mode) {
  const isAcronym = mode === MODE.ACRONYM_FLASH;

  // Acronym mode needs its deck loaded; exam-flash reuses the question pool.
  els.flashStartBtn.disabled = true;
  if (isAcronym) {
    els.flashLoadingMsg.textContent = "Loading acronym deck…";
    const ok = await loadAcronyms();
    if (!ok) {
      els.flashLoadingMsg.textContent = "Could not load acronyms.json.";
      return;
    }
  }

  const pool = isAcronym ? state.acronymPool : state.questionPool;
  const total = pool.length;

  if (isAcronym) {
    els.flashSetupTitle.textContent = "Acronym flashcards";
    els.flashSetupLead.innerHTML =
      `Drawing from the official CompTIA SY0-701 acronym list of ` +
      `<strong>${total}</strong> acronyms. Flip each card, then grade yourself.`;
    els.flipControl.classList.remove("hidden");
  } else {
    els.flashSetupTitle.textContent = "Exam flashcards";
    els.flashSetupLead.innerHTML =
      `Drawing from the pool of <strong>${total.toLocaleString()}</strong> ` +
      `SY0-701 questions. Read the question, recall the answer, then reveal and grade yourself.`;
    els.flipControl.classList.add("hidden");
    els.flipDirection.checked = false;
  }

  const defaultSize = Math.min(30, total);
  els.deckSize.min = Math.min(10, total);
  els.deckSize.max = total;
  els.deckSize.value = defaultSize;
  els.deckSizeValue.value = defaultSize;
  els.flashLoadingMsg.textContent = `${total.toLocaleString()} cards available.`;
  els.flashStartBtn.disabled = false;

  show(els.flashSetup);
}

/* =========================== EXAM (quiz) ========================== */

function startExam() {
  const size = parseInt(els.quizSize.value, 10) || 75;
  state.shuffleOptions = els.shuffleOpts.checked;
  state.quiz = pickRandom(state.questionPool, size).map((q) => prepareQuestion(q));
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
}

function prepareQuestion(q) {
  const letters = Object.keys(q.options).sort();
  const ordered = letters.map((letter) => ({
    originalLetter: letter,
    text: q.options[letter],
    isCorrect: q.correct.includes(letter),
  }));
  const display = state.shuffleOptions ? shuffle(ordered) : ordered;
  const newLetters = "ABCDEFGH".slice(0, display.length).split("");
  const finalOptions = display.map((opt, i) => ({ ...opt, letter: newLetters[i] }));
  const correctLetters = finalOptions.filter((o) => o.isCorrect).map((o) => o.letter);

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
    state.index === state.quiz.length - 1 ? "Finish exam" : "Next question";
}

function onOptionClick(letter) {
  const q = state.quiz[state.index];
  if (state.answered) return;

  if (!q.isMulti) {
    finalizeAnswer(new Set([letter]));
    return;
  }

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

  state.results.push({ question: q, chosen: [...selectedSet].sort(), isCorrect });

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
  updateExamStats();
}

function showFeedback(isCorrect, q, chosenArr) {
  els.qFeedback.classList.remove("hidden", "correct", "incorrect");
  els.qFeedback.classList.add(isCorrect ? "correct" : "incorrect");
  els.feedbackIcon.textContent = isCorrect ? "✓" : "✕";

  const correctStr = q.correct.join(", ");
  const chosenStr = chosenArr.length ? chosenArr.join(", ") : "nothing";
  if (isCorrect) {
    els.feedbackTitle.textContent = q.isMulti
      ? `Correct — ${correctStr} are right.`
      : `Correct — ${correctStr} is right.`;
  } else {
    els.feedbackTitle.textContent = `Not quite — you picked ${chosenStr}, correct answer is ${correctStr}.`;
  }

  els.feedbackExplanation.textContent = q.explanation
    ? q.explanation
    : "(No additional explanation available for this question.)";
}

function nextQuestion() {
  if (!state.answered) return;
  state.index += 1;
  if (state.index >= state.quiz.length) {
    showExamResults();
    return;
  }
  renderQuestion();
}

function updateExamStats() {
  const answered = state.results.length;
  els.statProgress.textContent = `${answered} / ${state.quiz.length}`;
  els.statCorrect.textContent = `${state.correctCount}`;
  const pct = answered === 0 ? 0 : Math.round((state.correctCount / answered) * 100);
  els.statPercent.textContent = `${pct}%`;
}

function letterText(q, letter) {
  const opt = q.options.find((o) => o.letter === letter);
  return opt ? opt.text : "";
}

function showExamResults() {
  const total = state.quiz.length;
  const score = state.correctCount;
  const pct = total === 0 ? 0 : Math.round((score / total) * 100);

  els.resultsEyebrow.textContent = state.mode === "pbqTest" ? "PBQ test complete" : "Exam complete";
  els.resultsHeadline.innerHTML = `You got <span>${score}</span> of <span>${total}</span> correct.`;
  els.resultPercent.textContent = `${pct}%`;
  els.resultVerdict.textContent = examVerdict(pct);
  els.reviewLabel.textContent = "Review missed questions";

  animateBar(pct, 70);

  const missed = state.results.filter((r) => !r.isCorrect);
  els.missedCount.textContent = missed.length;
  els.missedList.innerHTML = "";
  missed.forEach((m, idx) => {
    const chosenArr = Array.isArray(m.chosen) ? m.chosen : [m.chosen];
    const yourLines = chosenArr.length
      ? chosenArr
          .map(
            (l) => `<span class="answer-letter wrong">${l}</span>${escapeHtml(letterText(m.question, l))}`
          )
          .join("<br>")
      : '<span class="answer-letter wrong">—</span>(no answer)';
    const correctLines = m.question.correct
      .map(
        (l) => `<span class="answer-letter right">${l}</span>${escapeHtml(letterText(m.question, l))}`
      )
      .join("<br>");

    const item = document.createElement("article");
    item.className = "missed-item";
    item.innerHTML = `
      <div class="missed-header">
        <span class="missed-index">${idx + 1}</span>
        <h4>${escapeHtml(m.question.question)}</h4>
      </div>
      <div class="answer-grid">
        <div class="answer-cell wrong-cell">
          <div class="answer-label">Your answer</div>
          <div class="answer-value">${yourLines}</div>
        </div>
        <div class="answer-cell right-cell">
          <div class="answer-label">Correct answer</div>
          <div class="answer-value">${correctLines}</div>
        </div>
      </div>
      <div class="why">
        <div class="why-label">Why?</div>
        <div class="why-text">${escapeHtml(m.question.explanation || "")}</div>
      </div>
    `;
    els.missedList.appendChild(item);
  });

  show(els.results);
}

function examVerdict(pct) {
  if (pct >= 90) return "Outstanding — you're well above passing range.";
  if (pct >= 80) return "Strong work — keep drilling weak topics and you're set.";
  if (pct >= 70) return "Right around the SY0-701 pass line. Review your misses below.";
  if (pct >= 60) return "Getting there — focus on the missed topics and run another exam.";
  return "Keep going — review the explanations below and try another randomized round.";
}

/* ========================== FLASHCARDS ============================ */

function startFlash() {
  const size = parseInt(els.deckSize.value, 10) || 30;
  state.definitionFirst = els.flipDirection.checked;

  if (state.mode === MODE.ACRONYM_FLASH) {
    state.deck = pickRandom(state.acronymPool, size).map((c) => ({ kind: "acronym", data: c }));
  } else {
    state.deck = pickRandom(state.questionPool, size).map((q) => ({ kind: "exam", data: q }));
  }

  state.fIndex = 0;
  state.knownCount = 0;
  state.fResults = [];
  state.revealed = false;
  els.statProgressLabel.textContent = "reviewed";
  els.statCorrectLabel.textContent = "known";
  els.sessionStats.classList.remove("hidden");
  updateFlashStats();
  show(els.flashScreen);
  renderCard();
}

function renderCard() {
  const card = state.deck[state.fIndex];
  state.revealed = false;

  els.cNumber.textContent = `Card ${state.fIndex + 1} of ${state.deck.length}`;
  els.flashcard.classList.remove("flipped");
  els.cFeedback.classList.add("hidden");
  els.cFeedback.classList.remove("correct", "incorrect");
  els.revealGroup.classList.remove("hidden");
  els.gradeGroup.classList.add("hidden");
  els.flashcardHint.textContent = "Tap the card or press Space to flip";

  if (card.kind === "acronym") {
    renderAcronymFront(card.data);
  } else {
    renderExamFront(card.data);
  }
}

function renderAcronymFront(c) {
  const front = state.definitionFirst ? c.definition : c.term;
  els.flashcardKicker.textContent = state.definitionFirst ? "Definition" : "Acronym";
  els.cPromptLabel.textContent = state.definitionFirst ? "Recall the acronym" : "Recall the meaning";
  els.flashcardFront.textContent = front;
  els.flashcardFront.classList.toggle("is-definition", state.definitionFirst);
  els.flashcardOptions.classList.add("hidden");
  els.flashcardOptions.innerHTML = "";
}

function renderExamFront(q) {
  const letters = Object.keys(q.options).sort();
  els.flashcardKicker.textContent = `Question · Topic ${q.topic} · #${q.number}`;
  els.cPromptLabel.textContent = "Recall the answer";
  els.flashcardFront.textContent = q.question;
  els.flashcardFront.classList.add("is-definition");

  els.flashcardOptions.innerHTML = "";
  letters.forEach((letter) => {
    const li = document.createElement("li");
    li.dataset.letter = letter;
    li.innerHTML = `<span class="fc-letter">${letter}</span><span class="fc-text">${escapeHtml(
      q.options[letter]
    )}</span>`;
    els.flashcardOptions.appendChild(li);
  });
  els.flashcardOptions.classList.remove("hidden");
}

function revealCard() {
  if (state.revealed) return;
  state.revealed = true;
  const card = state.deck[state.fIndex];
  els.flashcard.classList.add("flipped");

  if (card.kind === "acronym") {
    revealAcronym(card.data);
  } else {
    revealExam(card.data);
  }

  els.revealGroup.classList.add("hidden");
  els.gradeGroup.classList.remove("hidden");
}

function revealAcronym(c) {
  els.flashcardKicker.textContent = "Answer";
  els.flashcardFront.textContent = state.definitionFirst ? c.term : c.full;
  els.flashcardFront.classList.toggle("is-definition", !state.definitionFirst);
  els.flashcardHint.textContent = state.definitionFirst ? c.definition : c.full;

  els.cFeedback.classList.remove("hidden");
  els.cFeedbackIcon.textContent = "≡";
  els.cFeedbackLabel.textContent = "Definition";
  els.cFeedbackTitle.innerHTML = `<span class="feedback-term">${escapeHtml(
    c.term
  )}</span> — ${escapeHtml(c.full)}`;
  els.cFeedbackExplanation.textContent = c.definition;
}

function revealExam(q) {
  const correctSet = new Set(q.correct);
  // Highlight correct options in the list.
  els.flashcardOptions.querySelectorAll("li").forEach((li) => {
    if (correctSet.has(li.dataset.letter)) li.classList.add("fc-correct");
    else li.classList.add("fc-dim");
  });
  els.flashcardKicker.textContent = "Answer revealed";
  els.flashcardHint.textContent = "";

  const correctText = q.correct
    .map((l) => `${l}. ${q.options[l]}`)
    .join("   ·   ");

  els.cFeedback.classList.remove("hidden");
  els.cFeedbackIcon.textContent = "✓";
  els.cFeedbackLabel.textContent = "Why?";
  els.cFeedbackTitle.textContent = `Correct: ${correctText}`;
  els.cFeedbackExplanation.textContent = q.explanation
    ? q.explanation
    : "(No additional explanation available for this question.)";
}

function gradeCard(known) {
  if (!state.revealed) return;
  const card = state.deck[state.fIndex];
  if (known) state.knownCount += 1;
  state.fResults.push({ card, known });
  updateFlashStats();
  state.fIndex += 1;
  if (state.fIndex >= state.deck.length) {
    showFlashResults();
    return;
  }
  renderCard();
}

function updateFlashStats() {
  const reviewed = state.fResults.length;
  els.statProgress.textContent = `${reviewed} / ${state.deck.length}`;
  els.statCorrect.textContent = `${state.knownCount}`;
  const pct = reviewed === 0 ? 0 : Math.round((state.knownCount / reviewed) * 100);
  els.statPercent.textContent = `${pct}%`;
}

function showFlashResults() {
  const total = state.fResults.length;
  const score = state.knownCount;
  const pct = total === 0 ? 0 : Math.round((score / total) * 100);
  const isAcronym = state.mode === MODE.ACRONYM_FLASH;

  els.resultsEyebrow.textContent = "Session complete";
  els.resultsHeadline.innerHTML = isAcronym
    ? `You knew <span>${score}</span> of <span>${total}</span> acronyms.`
    : `You knew <span>${score}</span> of <span>${total}</span> questions.`;
  els.resultPercent.textContent = `${pct}%`;
  els.resultVerdict.textContent = flashVerdict(pct);
  els.reviewLabel.textContent = "Review the ones you missed";

  animateBar(pct, 80);

  const missed = state.fResults.filter((r) => !r.known);
  els.missedCount.textContent = missed.length;
  els.missedList.innerHTML = "";
  missed.forEach((m, idx) => {
    const item = document.createElement("article");
    item.className = "missed-item";
    if (m.card.kind === "acronym") {
      const c = m.card.data;
      item.innerHTML = `
        <div class="missed-header">
          <span class="missed-index">${idx + 1}</span>
          <div>
            <span class="missed-term">${escapeHtml(c.term)}</span>
            <div class="missed-full">${escapeHtml(c.full)}</div>
          </div>
        </div>
        <div class="why">
          <div class="why-label">Definition</div>
          <div class="why-text">${escapeHtml(c.definition)}</div>
        </div>
      `;
    } else {
      const q = m.card.data;
      const correctLines = q.correct
        .map((l) => `<span class="answer-letter right">${l}</span>${escapeHtml(q.options[l])}`)
        .join("<br>");
      item.innerHTML = `
        <div class="missed-header">
          <span class="missed-index">${idx + 1}</span>
          <h4>${escapeHtml(q.question)}</h4>
        </div>
        <div class="answer-grid one">
          <div class="answer-cell right-cell">
            <div class="answer-label">Correct answer</div>
            <div class="answer-value">${correctLines}</div>
          </div>
        </div>
        <div class="why">
          <div class="why-label">Why?</div>
          <div class="why-text">${escapeHtml(q.explanation || "")}</div>
        </div>
      `;
    }
    els.missedList.appendChild(item);
  });

  show(els.results);
}

function flashVerdict(pct) {
  if (pct >= 90) return "Outstanding — these are locked in.";
  if (pct >= 80) return "Strong recall — just clean up the few you missed.";
  if (pct >= 70) return "Solid — run the missed cards again to cement them.";
  if (pct >= 50) return "Getting there — review the misses below and shuffle a new set.";
  return "Keep drilling — study the misses below and run another round.";
}

/* ----------------------------- shared ----------------------------- */

function animateBar(pct, passingThreshold) {
  els.resultBarFill.style.width = "0%";
  els.resultBarFill.classList.toggle("passing", pct >= passingThreshold);
  requestAnimationFrame(() => {
    setTimeout(() => {
      els.resultBarFill.style.width = `${pct}%`;
    }, 80);
  });
}

function restartCurrentMode() {
  els.sessionStats.classList.add("hidden");
  if (state.mode === "pbqTest" && typeof openPbqSetup === "function") {
    openPbqSetup();
  } else if (state.mode === MODE.EXAM) {
    openExamSetup();
  } else {
    openFlashSetup(state.mode);
  }
}

function openModal({ title, body, confirmText = "Confirm", cancelText = "Cancel", onConfirm }) {
  els.modalTitle.textContent = title;
  els.modalBody.textContent = body;
  els.modalConfirm.textContent = confirmText;
  els.modalCancel.textContent = cancelText;
  els.modalOverlay.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  const cleanup = () => {
    els.modalOverlay.classList.add("hidden");
    document.body.style.overflow = "";
    els.modalConfirm.removeEventListener("click", confirmHandler);
    els.modalCancel.removeEventListener("click", cancelHandler);
    els.modalOverlay.removeEventListener("click", overlayHandler);
    document.removeEventListener("keydown", keyHandler);
  };
  const confirmHandler = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    cleanup();
    if (onConfirm) onConfirm();
  };
  const cancelHandler = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    cleanup();
  };
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

  setTimeout(() => {
    try { els.modalConfirm.focus({ preventScroll: true }); } catch (_) { /* ignore */ }
  }, 50);
}

function endExamRequest() {
  if (state.results.length === 0) {
    openModal({
      title: "Leave the exam?",
      body: "You haven't answered any questions yet. Going back will discard this exam.",
      confirmText: "Back to modes",
      cancelText: "Stay",
      onConfirm: goHome,
    });
    return;
  }
  const remaining = state.quiz.length - state.results.length;
  openModal({
    title: "End exam now?",
    body: `You'll see your results so far. ${remaining} question${remaining === 1 ? "" : "s"} you haven't reached will be skipped.`,
    confirmText: "End exam",
    cancelText: "Keep going",
    onConfirm: () => showExamResults(),
  });
}

function endFlashRequest() {
  if (state.fResults.length === 0) {
    openModal({
      title: "Leave the session?",
      body: "You haven't graded any cards yet. Going back will discard this set.",
      confirmText: "Back to modes",
      cancelText: "Stay",
      onConfirm: goHome,
    });
    return;
  }
  const remaining = state.deck.length - state.fResults.length;
  openModal({
    title: "End session now?",
    body: `You'll see your results so far. ${remaining} card${remaining === 1 ? "" : "s"} you haven't reached will be skipped.`,
    confirmText: "End session",
    cancelText: "Keep going",
    onConfirm: () => showFlashResults(),
  });
}

function isModalOpen() {
  return !els.modalOverlay.classList.contains("hidden");
}

function onKeydown(e) {
  // Flashcard shortcuts only when the card screen is active.
  if (els.flashScreen.classList.contains("hidden") || isModalOpen()) return;
  if (!state.revealed && (e.key === " " || e.key === "Enter")) {
    e.preventDefault();
    revealCard();
  } else if (state.revealed) {
    if (e.key === "1" || e.key.toLowerCase() === "n") {
      e.preventDefault();
      gradeCard(false);
    } else if (e.key === "2" || e.key.toLowerCase() === "y") {
      e.preventDefault();
      gradeCard(true);
    }
  }
}

/* ------------------------------ init ------------------------------ */

function init() {
  // Mode selection
  els.modeExam.addEventListener("click", () => chooseMode(MODE.EXAM));
  els.modeExamFlash.addEventListener("click", () => chooseMode(MODE.EXAM_FLASH));
  els.modeAcronymFlash.addEventListener("click", () => chooseMode(MODE.ACRONYM_FLASH));

  // Back-to-home affordances
  els.brandHome.addEventListener("click", goHome);
  document.querySelectorAll("[data-go-home]").forEach((b) =>
    b.addEventListener("click", goHome)
  );
  els.resultsHomeBtn.addEventListener("click", goHome);

  // Exam setup
  els.quizSize.addEventListener("input", () => {
    els.quizSizeValue.value = els.quizSize.value;
  });
  els.startBtn.addEventListener("click", startExam);

  // Exam screen
  els.submitBtn.addEventListener("click", submitMulti);
  els.nextBtn.addEventListener("click", nextQuestion);
  els.quitBtn.addEventListener("click", endExamRequest);

  // Flash setup
  els.deckSize.addEventListener("input", () => {
    els.deckSizeValue.value = els.deckSize.value;
  });
  els.flashStartBtn.addEventListener("click", startFlash);

  // Flash screen
  els.flashcard.addEventListener("click", revealCard);
  els.flashcard.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      revealCard();
    }
  });
  els.revealBtn.addEventListener("click", revealCard);
  els.knownBtn.addEventListener("click", () => gradeCard(true));
  els.missedBtn.addEventListener("click", () => gradeCard(false));
  els.flashQuitBtn.addEventListener("click", endFlashRequest);

  // Results
  els.restartBtn.addEventListener("click", restartCurrentMode);

  document.addEventListener("keydown", onKeydown);

  loadQuestions();
}

document.addEventListener("DOMContentLoaded", init);
