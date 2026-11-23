(function () {
  "use strict";

  const STORAGE_KEY = "zh_grundkenntnistest_stats_v1";
  const EXAM_QUESTION_COUNT = 40;
  const EXAM_PASS_THRESHOLD = 27; // 27 / 40 (67.5%) official Canton Zurich threshold
  const EXAM_TIME_SECONDS = 60 * 60; // 60 minutes

  const allQuestions = window.QUESTIONS_DATA || [];
  const allCategories = window.CATEGORIES_DATA || [];

  // Persistent state structure:
  // stats.questions[qId] = { correct: 0, wrong: 0, lastResult: 'correct'|'wrong', lastTimestamp: 0 }
  // stats.exams = { attempts: 0, passed: 0, bestScore: 0 }
  let userStats = loadStats();

  // Active Quiz Session State
  let session = {
    mode: "training", // 'training' | 'exam' | 'failed'
    questions: [],
    currentIndex: 0,
    answers: {}, // index -> 'a'|'b'|'c'|'d'
    recordedInSession: {}, // index -> boolean (prevent double-counting in training mode)
    startTime: 0,
    elapsedSeconds: 0,
    remainingSeconds: EXAM_TIME_SECONDS,
    timerInterval: null,
    reviewFilter: "all",
  };

  function loadStats() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          questions: parsed.questions || {},
          exams: parsed.exams || { attempts: 0, passed: 0, bestScore: 0 },
        };
      }
    } catch (e) {
      console.warn("Could not load stats from localStorage:", e);
    }
    return {
      questions: {},
      exams: { attempts: 0, passed: 0, bestScore: 0 },
    };
  }

  function saveStats() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userStats));
    } catch (e) {
      console.warn("Could not save stats:", e);
    }
  }

  function getQuestionStat(qId) {
    return (
      userStats.questions[qId] || {
        correct: 0,
        wrong: 0,
        lastResult: null,
        lastTimestamp: 0,
      }
    );
  }

  function recordQuestionAttempt(qId, isCorrect) {
    if (!userStats.questions[qId]) {
      userStats.questions[qId] = {
        correct: 0,
        wrong: 0,
        lastResult: null,
        lastTimestamp: 0,
      };
    }
    const st = userStats.questions[qId];
    if (isCorrect) {
      st.correct += 1;
      st.lastResult = "correct";
    } else {
      st.wrong += 1;
      st.lastResult = "wrong";
    }
    st.lastTimestamp = Date.now();
    saveStats();
  }

  function isQuestionMastered(qId) {
    const st = getQuestionStat(qId);
    return st.correct > 0 && st.correct >= st.wrong && st.lastResult === "correct";
  }

  // Returns questions sorted by failure frequency (most failed first)
  function getMostFailedQuestions() {
    const failed = [];
    for (const q of allQuestions) {
      const st = getQuestionStat(q.id);
      if (st.wrong > 0) {
        const total = st.wrong + st.correct;
        const failRate = total > 0 ? st.wrong / total : 0;
        const netFail = st.wrong - st.correct;
        failed.push({
          question: q,
          stat: st,
          failRate,
          netFail,
        });
      }
    }
    // Sort by highest wrong count first, then net failures, then failRate, then most recent
    failed.sort((a, b) => {
      if (b.stat.wrong !== a.stat.wrong) return b.stat.wrong - a.stat.wrong;
      if (b.netFail !== a.netFail) return b.netFail - a.netFail;
      if (b.failRate !== a.failRate) return b.failRate - a.failRate;
      return b.stat.lastTimestamp - a.stat.lastTimestamp;
    });
    return failed;
  }

  function shuffleArray(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  // DOM Elements
  const views = {
    home: document.getElementById("view-home"),
    quiz: document.getElementById("view-quiz"),
    results: document.getElementById("view-results"),
    failedList: document.getElementById("view-failed-list"),
    catalog: document.getElementById("view-catalog"),
  };

  const btnBackHome = document.getElementById("btn-back-home");
  const brandHome = document.getElementById("brand-home");
  const timerBadge = document.getElementById("timer-badge");
  const btnCatalog = document.getElementById("btn-catalog");

  function showView(viewKey) {
    Object.keys(views).forEach((k) => {
      views[k].classList.toggle("active", k === viewKey);
    });
    btnBackHome.classList.toggle("hidden", viewKey === "home");
    if (viewKey !== "quiz") {
      stopTimer();
      timerBadge.classList.add("hidden");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // HOME DASHBOARD RENDERING
  function renderHome() {
    let masteredCount = 0;
    let totalCorrect = 0;
    let totalWrong = 0;

    for (const q of allQuestions) {
      const st = getQuestionStat(q.id);
      totalCorrect += st.correct;
      totalWrong += st.wrong;
      if (isQuestionMastered(q.id)) {
        masteredCount += 1;
      }
    }

    const totalAttempts = totalCorrect + totalWrong;
    const accuracyPct =
      totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
    const failedList = getMostFailedQuestions();
    const overallPct = Math.round((masteredCount / allQuestions.length) * 100);

    document.getElementById("stat-mastered").textContent =
      `${masteredCount} / ${allQuestions.length}`;
    document.getElementById("stat-accuracy").textContent = `${accuracyPct}%`;
    document.getElementById("stat-failed-count").textContent = `${failedList.length}`;
    document.getElementById("stat-exams-passed").textContent =
      `${userStats.exams.passed} / ${userStats.exams.attempts}`;
    document.getElementById("stat-progress-pct").textContent = `${overallPct}%`;
    document.getElementById("stat-progress-bar").style.width = `${overallPct}%`;

    // Update Training Filter Match Count
    updateTrainingFilterCount();

    // Update Most Failed Mode Card
    const failedBadgePill = document.getElementById("failed-badge-pill");
    failedBadgePill.textContent = `${failedList.length} ${
      failedList.length === 1 ? "Frage" : "Fragen"
    }`;

    const failedPreviewBox = document.getElementById("failed-preview-box");
    const btnStartFailed = document.getElementById("btn-start-failed");

    if (failedList.length === 0) {
      failedPreviewBox.innerHTML = `<div class="failed-preview-empty">Noch keine Fehlerfragen vorhanden. Sobald du im Training oder in einer Prüfungssimulation eine Frage falsch beantwortest, erscheint sie hier zum gezielten Üben.</div>`;
      btnStartFailed.textContent = "Fehlerfragen üben (0)";
      btnStartFailed.disabled = true;
    } else {
      btnStartFailed.disabled = false;
      btnStartFailed.textContent = `Fehlerfragen üben (${failedList.length})`;
      const top3 = failedList.slice(0, 3);
      failedPreviewBox.innerHTML = top3
        .map(
          (item) => `
          <div class="failed-preview-item">
            <span class="failed-preview-q">#${item.question.id} ${escapeHtml(
            item.question.question
          )}</span>
            <span class="failed-count-badge">${item.stat.wrong}× falsch</span>
          </div>
        `
        )
        .join("");
    }

    // Update Topic Breakdown List
    const catListEl = document.getElementById("categories-progress-list");
    catListEl.innerHTML = allCategories
      .map((cat) => {
        const catQs = allQuestions.filter((q) => q.categoryId === cat.id);
        const catMastered = catQs.filter((q) => isQuestionMastered(q.id)).length;
        const pct = Math.round((catMastered / catQs.length) * 100);
        return `
        <div class="category-progress-card" data-cat-id="${cat.id}" title="Klicken zum Trainieren dieses Themas">
          <div class="cat-row-top">
            <span class="cat-name">${cat.icon} ${cat.id}. ${escapeHtml(
          cat.title
        )}</span>
            <span class="cat-stats-txt">${catMastered} / ${
          catQs.length
        } (${pct}%)</span>
          </div>
          <div class="progress-track compact" style="margin: 0;">
            <div class="progress-fill" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
      })
      .join("");

    // Clicking a category card starts training for that category
    catListEl.querySelectorAll(".category-progress-card").forEach((card) => {
      card.addEventListener("click", () => {
        const catId = card.getAttribute("data-cat-id");
        document.getElementById("train-category").value = catId;
        document.getElementById("train-level").value = "all";
        document.getElementById("train-filter").value = "all";
        updateTrainingFilterCount();
        startTrainingMode();
      });
    });
  }

  function getFilteredTrainingQuestions() {
    const catVal = document.getElementById("train-category").value;
    const levelVal = document.getElementById("train-level").value;
    const statusVal = document.getElementById("train-filter").value;

    return allQuestions.filter((q) => {
      if (catVal !== "all" && q.categoryId !== catVal) return false;
      if (levelVal !== "all" && q.subcategory !== levelVal) return false;
      if (statusVal === "unanswered") {
        const st = getQuestionStat(q.id);
        if (st.correct + st.wrong > 0) return false;
      } else if (statusVal === "unmastered") {
        if (isQuestionMastered(q.id)) return false;
      }
      return true;
    });
  }

  function updateTrainingFilterCount() {
    const matched = getFilteredTrainingQuestions();
    const countEl = document.getElementById("train-match-count");
    const btnStart = document.getElementById("btn-start-training");
    countEl.textContent = `${matched.length} ${
      matched.length === 1 ? "Frage" : "Fragen"
    } verfügbar`;
    btnStart.disabled = matched.length === 0;
  }

  // MODE 1: START TRAINING MODE
  function startTrainingMode() {
    let pool = getFilteredTrainingQuestions();
    if (pool.length === 0) return;

    const shouldShuffle = document.getElementById("train-shuffle").checked;
    if (shouldShuffle) {
      pool = shuffleArray(pool);
    }

    initQuizSession("training", pool);
  }

  // MODE 2: START 40-QUESTION TEST SIMULATION
  function startExamSimulation() {
    // Official Zurich test has 40 questions across the 5 main topics (8 per topic)
    let examDeck = [];
    const questionsPerCategory = 8;

    for (const cat of allCategories) {
      const catPool = shuffleArray(
        allQuestions.filter((q) => q.categoryId === cat.id)
      );
      examDeck = examDeck.concat(catPool.slice(0, questionsPerCategory));
    }

    // Ensure exactly 40 questions
    if (examDeck.length < EXAM_QUESTION_COUNT) {
      const usedIds = new Set(examDeck.map((q) => q.id));
      const remaining = shuffleArray(
        allQuestions.filter((q) => !usedIds.has(q.id))
      );
      examDeck = examDeck.concat(
        remaining.slice(0, EXAM_QUESTION_COUNT - examDeck.length)
      );
    }

    initQuizSession("exam", examDeck);
  }

  // MODE 3: START MOST FAILED QUESTIONS TRAINING
  function startFailedTrainingMode(limitCount) {
    const failedItems = getMostFailedQuestions();
    if (failedItems.length === 0) return;

    let pool = failedItems.map((item) => item.question);
    if (limitCount && limitCount > 0) {
      pool = pool.slice(0, limitCount);
    }
    initQuizSession("failed", pool);
  }

  function initQuizSession(mode, questionDeck) {
    stopTimer();
    session = {
      mode,
      questions: questionDeck,
      currentIndex: 0,
      answers: {},
      recordedInSession: {},
      startTime: Date.now(),
      elapsedSeconds: 0,
      remainingSeconds: EXAM_TIME_SECONDS,
      timerInterval: null,
      reviewFilter: "all",
    };

    document.getElementById("quiz-grid-panel").classList.add("hidden");

    if (mode === "exam") {
      timerBadge.classList.remove("hidden");
      updateTimerBadge();
      session.timerInterval = setInterval(() => {
        session.elapsedSeconds += 1;
        session.remainingSeconds = Math.max(
          0,
          EXAM_TIME_SECONDS - session.elapsedSeconds
        );
        updateTimerBadge();
        if (session.remainingSeconds <= 0) {
          finishQuizSession();
        }
      }, 1000);
    } else {
      timerBadge.classList.add("hidden");
      session.timerInterval = setInterval(() => {
        session.elapsedSeconds += 1;
      }, 1000);
    }

    showView("quiz");
    renderCurrentQuestion();
  }

  function stopTimer() {
    if (session.timerInterval) {
      clearInterval(session.timerInterval);
      session.timerInterval = null;
    }
  }

  function updateTimerBadge() {
    const mins = Math.floor(session.remainingSeconds / 60);
    const secs = session.remainingSeconds % 60;
    timerBadge.textContent = `${String(mins).padStart(2, "0")}:${String(
      secs
    ).padStart(2, "0")}`;
    timerBadge.classList.toggle("urgent", session.remainingSeconds <= 300);
  }

  function renderCurrentQuestion() {
    const q = session.questions[session.currentIndex];
    if (!q) return;

    const total = session.questions.length;
    const idx = session.currentIndex;
    const userAns = session.answers[idx];

    // Header tags
    const modeLabel = document.getElementById("quiz-mode-label");
    modeLabel.className = "mode-pill";
    if (session.mode === "training") {
      modeLabel.textContent = "Trainingsmodus";
    } else if (session.mode === "exam") {
      modeLabel.textContent = "Prüfungssimulation (40 Fragen)";
      modeLabel.classList.add("exam");
    } else if (session.mode === "failed") {
      modeLabel.textContent = "Fehler-Training";
      modeLabel.classList.add("failed");
    }

    document.getElementById("quiz-counter").textContent = `Frage ${
      idx + 1
    } / ${total}`;
    const pct = Math.round(((idx + 1) / total) * 100);
    document.getElementById("quiz-progress-bar").style.width = `${pct}%`;

    document.getElementById(
      "quiz-cat-badge"
    ).textContent = `${q.categoryId}. ${q.category}`;
    document.getElementById(
      "quiz-subcat-badge"
    ).textContent = `${q.subcategoryId} ${q.subcategory}`;
    document.getElementById(
      "quiz-page-badge"
    ).textContent = `Frage #${q.id} (S. ${q.page})`;

    // Show error history indicator if this question has past failures
    const failIndicator = document.getElementById("question-fail-indicator");
    const st = getQuestionStat(q.id);
    if (st.wrong > 0 && session.mode !== "exam") {
      failIndicator.classList.remove("hidden");
      failIndicator.textContent = `⚠️ Bisher ${st.wrong}× falsch • ${st.correct}× richtig beantwortet`;
    } else {
      failIndicator.classList.add("hidden");
    }

    // Question text & optional illustration
    document.getElementById("question-text").textContent = q.question;
    const imgWrap = document.getElementById("question-image-wrap");
    const imgEl = document.getElementById("question-image");
    if (q.questionImage) {
      imgEl.src = q.questionImage;
      imgWrap.classList.remove("hidden");
    } else {
      imgEl.src = "";
      imgWrap.classList.add("hidden");
    }

    // Options rendering
    const optsContainer = document.getElementById("options-container");
    const hasOptionImages = Boolean(q.optionImages);
    optsContainer.classList.toggle("image-grid", hasOptionImages);

    const isInstantFeedback =
      session.mode === "training" || session.mode === "failed";

    optsContainer.innerHTML = ["a", "b", "c", "d"]
      .map((key) => {
        let stateClass = "";
        if (userAns) {
          if (isInstantFeedback) {
            if (key === q.answer) {
              stateClass = "correct";
            } else if (key === userAns && userAns !== q.answer) {
              stateClass = "wrong";
            }
          } else {
            // Exam mode: highlight selected option without revealing the answer yet
            if (key === userAns) {
              stateClass = "selected";
            }
          }
        }

        const disabledAttr =
          isInstantFeedback && userAns ? 'disabled="disabled"' : "";

        const innerContent = hasOptionImages
          ? `<img src="${q.optionImages[key]}" alt="Option ${key}" class="option-img" />`
          : `<span class="option-content">${escapeHtml(q.options[key])}</span>`;

        return `
        <button class="option-btn ${stateClass}" data-opt="${key}" ${disabledAttr}>
          <span class="option-letter">${key}</span>
          ${innerContent}
        </button>
      `;
      })
      .join("");

    optsContainer.querySelectorAll(".option-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const chosen = btn.getAttribute("data-opt");
        handleOptionSelect(chosen);
      });
    });

    // Instant Feedback Banner (Training & Failed Modes)
    const feedbackBanner = document.getElementById("feedback-banner");
    if (isInstantFeedback && userAns) {
      const isRight = userAns === q.answer;
      feedbackBanner.className = `feedback-banner ${
        isRight ? "correct" : "wrong"
      }`;
      feedbackBanner.innerHTML = isRight
        ? `<span>✓ Richtig! Antwort ${q.answer.toUpperCase()} ist korrekt.</span>`
        : `<span>✗ Leider falsch. Richtige Antwort: ${q.answer.toUpperCase()}</span>`;
    } else {
      feedbackBanner.className = "feedback-banner hidden";
    }

    // Prev / Next buttons
    document.getElementById("btn-prev-q").disabled = idx === 0;
    const btnNext = document.getElementById("btn-next-q");
    if (idx === total - 1) {
      btnNext.textContent =
        session.mode === "exam" ? "Test abgeben ✓" : "Auswertung ✓";
    } else {
      btnNext.textContent = "Weiter →";
    }

    // Update grid if open
    if (!document.getElementById("quiz-grid-panel").classList.contains("hidden")) {
      renderQuestionGrid();
    }
  }

  function handleOptionSelect(chosenKey) {
    const idx = session.currentIndex;
    const q = session.questions[idx];
    if (!q) return;

    const isInstantFeedback =
      session.mode === "training" || session.mode === "failed";

    if (isInstantFeedback) {
      // Only allow answering once per question in instant feedback mode
      if (session.answers[idx]) return;
      session.answers[idx] = chosenKey;
      if (!session.recordedInSession[idx]) {
        session.recordedInSession[idx] = true;
        recordQuestionAttempt(q.id, chosenKey === q.answer);
      }
      renderCurrentQuestion();
    } else {
      // Exam mode: user can select or change answer until submission
      session.answers[idx] = chosenKey;
      renderCurrentQuestion();
    }
  }

  function renderQuestionGrid() {
    const gridEl = document.getElementById("quiz-grid-numbers");
    const isInstant = session.mode === "training" || session.mode === "failed";

    gridEl.innerHTML = session.questions
      .map((q, i) => {
        const ans = session.answers[i];
        let cls = "";
        if (i === session.currentIndex) cls += " current";
        if (ans) {
          if (isInstant) {
            cls += ans === q.answer ? " correct" : " wrong";
          } else {
            cls += " answered";
          }
        }
        return `<button class="grid-num-btn ${cls}" data-idx="${i}">${
          i + 1
        }</button>`;
      })
      .join("");

    gridEl.querySelectorAll(".grid-num-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        session.currentIndex = parseInt(btn.getAttribute("data-idx"), 10);
        renderCurrentQuestion();
      });
    });
  }

  function finishQuizSession() {
    stopTimer();
    const total = session.questions.length;
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    session.questions.forEach((q, idx) => {
      const ans = session.answers[idx];
      if (!ans) {
        unansweredCount += 1;
        // In exam mode, unanswered questions count as wrong
        if (session.mode === "exam" && !session.recordedInSession[idx]) {
          session.recordedInSession[idx] = true;
          recordQuestionAttempt(q.id, false);
        }
      } else if (ans === q.answer) {
        correctCount += 1;
        if (session.mode === "exam" && !session.recordedInSession[idx]) {
          session.recordedInSession[idx] = true;
          recordQuestionAttempt(q.id, true);
        }
      } else {
        wrongCount += 1;
        if (session.mode === "exam" && !session.recordedInSession[idx]) {
          session.recordedInSession[idx] = true;
          recordQuestionAttempt(q.id, false);
        }
      }
    });

    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    if (session.mode === "exam") {
      userStats.exams.attempts += 1;
      if (correctCount >= EXAM_PASS_THRESHOLD) {
        userStats.exams.passed += 1;
      }
      if (correctCount > userStats.exams.bestScore) {
        userStats.exams.bestScore = correctCount;
      }
      saveStats();
    }

    // Render Results View
    const statusBadge = document.getElementById("results-status-badge");
    const titleEl = document.getElementById("results-title");
    const subtitleEl = document.getElementById("results-subtitle");

    if (session.mode === "exam") {
      const passed = correctCount >= EXAM_PASS_THRESHOLD;
      statusBadge.className = `results-status-badge ${passed ? "pass" : "fail"}`;
      statusBadge.textContent = passed
        ? "PRÜFUNG BESTANDEN"
        : "NICHT BESTANDEN";
      titleEl.textContent = passed
        ? "Herzliche Gratulation!"
        : "Noch etwas Übung nötig";
      subtitleEl.textContent = passed
        ? `Du hast ${correctCount} von 40 Fragen richtig beantwortet (mind. 27 erforderlich).`
        : `Du hast ${correctCount} von 40 Fragen erreicht. Für das Bestehen im Kanton Zürich sind mindestens 27 richtige Antworten (67.5%) nötig.`;
    } else {
      const good = pct >= 68;
      statusBadge.className = `results-status-badge ${good ? "pass" : "fail"}`;
      statusBadge.textContent =
        session.mode === "failed"
          ? "FEHLER-TRAINING ABGESCHLOSSEN"
          : "TRAINING ABGESCHLOSSEN";
      titleEl.textContent = `${correctCount} von ${total} richtig (${pct}%)`;
      subtitleEl.textContent =
        wrongCount > 0
          ? `${wrongCount} ${
              wrongCount === 1 ? "Frage wurde" : "Fragen wurden"
            } falsch beantwortet und für das Fehler-Training vorgemerkt.`
          : "Ausgezeichnet! Alle beantworteten Fragen waren korrekt.";
    }

    document.getElementById(
      "results-score-main"
    ).textContent = `${correctCount} / ${total}`;
    document.getElementById("results-score-pct").textContent = `${pct}%`;
    document.getElementById("res-correct").textContent = `${correctCount}`;
    document.getElementById("res-wrong").textContent = `${wrongCount}`;
    document.getElementById("res-unanswered").textContent = `${unansweredCount}`;

    const mins = Math.floor(session.elapsedSeconds / 60);
    const secs = session.elapsedSeconds % 60;
    document.getElementById("res-time").textContent = `${String(mins).padStart(
      2,
      "0"
    )}:${String(secs).padStart(2, "0")}`;

    // Show "Retry Mistakes" button if any question was wrong or unanswered
    const mistakeQuestions = session.questions.filter(
      (q, i) => session.answers[i] !== q.answer
    );
    const btnRetryMistakes = document.getElementById("btn-retry-mistakes");
    if (mistakeQuestions.length > 0) {
      btnRetryMistakes.classList.remove("hidden");
      btnRetryMistakes.textContent = `Falsche/offene Fragen dieser Runde üben (${mistakeQuestions.length})`;
      btnRetryMistakes.onclick = () => {
        initQuizSession("failed", mistakeQuestions);
      };
    } else {
      btnRetryMistakes.classList.add("hidden");
    }

    // Topic breakdown for Exam mode
    const breakdownEl = document.getElementById("results-topic-breakdown");
    if (session.mode === "exam") {
      breakdownEl.innerHTML =
        `<h3 class="section-heading">Ergebnis nach Themengebiet</h3><div class="categories-list">` +
        allCategories
          .map((cat) => {
            const indices = session.questions
              .map((q, idx) => (q.categoryId === cat.id ? idx : -1))
              .filter((idx) => idx !== -1);
            if (indices.length === 0) return "";
            const catCorrect = indices.filter(
              (idx) => session.answers[idx] === session.questions[idx].answer
            ).length;
            const catPct = Math.round((catCorrect / indices.length) * 100);
            return `
            <div class="category-progress-card" style="cursor: default;">
              <div class="cat-row-top">
                <span class="cat-name">${cat.icon} ${cat.id}. ${escapeHtml(
              cat.title
            )}</span>
                <span class="cat-stats-txt">${catCorrect} / ${
              indices.length
            } (${catPct}%)</span>
              </div>
              <div class="progress-track compact" style="margin: 0;">
                <div class="progress-fill" style="width: ${catPct}%"></div>
              </div>
            </div>
          `;
          })
          .join("") +
        `</div>`;
    } else {
      breakdownEl.innerHTML = "";
    }

    session.reviewFilter = "all";
    document.querySelectorAll("[data-review-filter]").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-review-filter") === "all");
    });
    renderResultsReviewList();
    showView("results");
  }

  function renderResultsReviewList() {
    const listEl = document.getElementById("results-review-list");
    const onlyWrong = session.reviewFilter === "wrong";

    const items = session.questions
      .map((q, idx) => ({ q, idx, userAns: session.answers[idx] }))
      .filter((item) => !onlyWrong || item.userAns !== item.q.answer);

    if (items.length === 0) {
      listEl.innerHTML = `<div class="review-card">Keine Fehler in dieser Sitzung!</div>`;
      return;
    }

    listEl.innerHTML = items
      .map(({ q, idx, userAns }) => {
        const isCorrect = userAns === q.answer;
        return buildQuestionReviewCardHtml(q, {
          headerLeft: `Frage ${idx + 1} (#${q.id} • ${q.subcategoryId} ${q.subcategory})`,
          headerRight: isCorrect
            ? "✓ Richtig"
            : userAns
            ? `✗ Falsch (Gewählt: ${userAns.toUpperCase()})`
            : "Nicht beantwortet",
          userAns,
          cardStateClass: isCorrect ? "is-correct" : "is-wrong",
        });
      })
      .join("");
  }

  function buildQuestionReviewCardHtml(q, meta) {
    const hasOptImgs = Boolean(q.optionImages);
    const qImgHtml = q.questionImage
      ? `<div class="question-image-wrap"><img src="${q.questionImage}" alt="Illustration" /></div>`
      : "";

    const optsHtml = ["a", "b", "c", "d"]
      .map((key) => {
        let cls = "review-opt-item";
        if (key === q.answer) {
          cls += " correct-ans";
        } else if (meta.userAns && key === meta.userAns && key !== q.answer) {
          cls += " user-wrong-ans";
        }
        const optBody = hasOptImgs
          ? `<img src="${q.optionImages[key]}" alt="Option ${key}" class="review-thumb" />`
          : `<span>${escapeHtml(q.options[key])}</span>`;
        return `
        <div class="${cls}">
          <strong>${key})</strong>
          ${optBody}
        </div>
      `;
      })
      .join("");

    return `
      <div class="review-card ${meta.cardStateClass || ""}">
        <div class="review-card-top">
          <span>${escapeHtml(meta.headerLeft)}</span>
          <span>${escapeHtml(meta.headerRight)}</span>
        </div>
        <div class="review-q-title">${escapeHtml(q.question)}</div>
        ${qImgHtml}
        <div class="review-opts-list">${optsHtml}</div>
      </div>
    `;
  }

  // FAILED QUESTIONS RANKING VIEW
  function renderFailedListView() {
    const failedItems = getMostFailedQuestions();
    const container = document.getElementById("failed-ranking-container");
    const btnAll = document.getElementById("btn-train-all-failed");
    const btnTop15 = document.getElementById("btn-train-top15-failed");

    btnAll.disabled = failedItems.length === 0;
    btnTop15.disabled = failedItems.length === 0;

    if (failedItems.length === 0) {
      container.innerHTML = `<div class="review-card">Du hast aktuell keine Fehlerfragen in deiner Statistik. Beantworte Fragen im Trainingsmodus oder in der Prüfungssimulation – alle falsch beantworteten Fragen werden hier automatisch nach Fehlerhäufigkeit aufgelistet.</div>`;
      return;
    }

    container.innerHTML = failedItems
      .map((item, rankIdx) => {
        const q = item.question;
        const st = item.stat;
        const failPct = Math.round(item.failRate * 100);
        return buildQuestionReviewCardHtml(q, {
          headerLeft: `Rang #${rankIdx + 1} • Frage #${q.id} (${q.category})`,
          headerRight: `${st.wrong}× falsch • ${st.correct}× richtig (${failPct}% Fehlerquote)`,
          userAns: null,
          cardStateClass: "is-wrong",
        });
      })
      .join("");
  }

  // FULL CATALOG / SEARCH VIEW
  function renderCatalogView() {
    const query = (
      document.getElementById("catalog-search-input").value || ""
    )
      .trim()
      .toLowerCase();
    const catFilter = document.getElementById("catalog-cat-filter").value;
    const statusFilter = document.getElementById("catalog-status-filter").value;

    const filtered = allQuestions.filter((q) => {
      if (catFilter !== "all" && q.categoryId !== catFilter) return false;
      const st = getQuestionStat(q.id);
      if (statusFilter === "failed" && st.wrong === 0) return false;
      if (statusFilter === "mastered" && !isQuestionMastered(q.id)) return false;
      if (statusFilter === "unseen" && st.correct + st.wrong > 0) return false;

      if (query) {
        const inId = `#${q.id}` === query || `${q.id}` === query;
        const inQ = q.question.toLowerCase().includes(query);
        const inOpts = Object.values(q.options).some((v) =>
          v.toLowerCase().includes(query)
        );
        return inId || inQ || inOpts;
      }
      return true;
    });

    document.getElementById(
      "catalog-count-label"
    ).textContent = `${filtered.length} ${
      filtered.length === 1 ? "Frage" : "Fragen"
    } gefunden`;

    const container = document.getElementById("catalog-list-container");
    // Render up to 100 at once for snappy mobile scrolling, or all if filtered
    const displayList = query || catFilter !== "all" || statusFilter !== "all"
      ? filtered
      : filtered.slice(0, 150);

    container.innerHTML = displayList
      .map((q) => {
        const st = getQuestionStat(q.id);
        let rightLabel = `Seite ${q.page}`;
        if (st.wrong > 0 || st.correct > 0) {
          rightLabel = `${st.correct}✓ / ${st.wrong}✗ • S. ${q.page}`;
        }
        return buildQuestionReviewCardHtml(q, {
          headerLeft: `Frage #${q.id} • ${q.subcategoryId} ${q.subcategory} (${q.category})`,
          headerRight: rightLabel,
          userAns: null,
          cardStateClass:
            st.wrong > st.correct
              ? "is-wrong"
              : isQuestionMastered(q.id)
              ? "is-correct"
              : "",
        });
      })
      .join("");
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // EVENT LISTENERS
  function bindEvents() {
    btnBackHome.addEventListener("click", () => {
      renderHome();
      showView("home");
    });

    brandHome.addEventListener("click", () => {
      renderHome();
      showView("home");
    });

    btnCatalog.addEventListener("click", () => {
      renderCatalogView();
      showView("catalog");
    });

    document
      .getElementById("btn-open-catalog-bottom")
      .addEventListener("click", () => {
        renderCatalogView();
        showView("catalog");
      });

    // Training filter changes
    ["train-category", "train-level", "train-filter"].forEach((id) => {
      document
        .getElementById(id)
        .addEventListener("change", updateTrainingFilterCount);
    });

    document
      .getElementById("btn-start-training")
      .addEventListener("click", startTrainingMode);

    document
      .getElementById("btn-start-exam")
      .addEventListener("click", startExamSimulation);

    document
      .getElementById("btn-start-failed")
      .addEventListener("click", () => startFailedTrainingMode(0));

    document
      .getElementById("btn-view-failed-list")
      .addEventListener("click", () => {
        renderFailedListView();
        showView("failedList");
      });

    document
      .getElementById("btn-train-all-failed")
      .addEventListener("click", () => startFailedTrainingMode(0));

    document
      .getElementById("btn-train-top15-failed")
      .addEventListener("click", () => startFailedTrainingMode(15));

    // Quiz navigation
    document.getElementById("btn-prev-q").addEventListener("click", () => {
      if (session.currentIndex > 0) {
        session.currentIndex -= 1;
        renderCurrentQuestion();
      }
    });

    document.getElementById("btn-next-q").addEventListener("click", () => {
      if (session.currentIndex < session.questions.length - 1) {
        session.currentIndex += 1;
        renderCurrentQuestion();
      } else {
        finishQuizSession();
      }
    });

    document.getElementById("btn-toggle-grid").addEventListener("click", () => {
      const panel = document.getElementById("quiz-grid-panel");
      panel.classList.toggle("hidden");
      if (!panel.classList.contains("hidden")) {
        renderQuestionGrid();
      }
    });

    document.getElementById("btn-close-grid").addEventListener("click", () => {
      document.getElementById("quiz-grid-panel").classList.add("hidden");
    });

    document
      .getElementById("btn-finish-quiz-early")
      .addEventListener("click", finishQuizSession);

    // Results buttons
    document
      .getElementById("btn-results-restart")
      .addEventListener("click", () => {
        if (session.mode === "exam") {
          startExamSimulation();
        } else if (session.mode === "failed") {
          const failed = getMostFailedQuestions();
          if (failed.length > 0) {
            startFailedTrainingMode(0);
          } else {
            renderHome();
            showView("home");
          }
        } else {
          startTrainingMode();
        }
      });

    document
      .getElementById("btn-results-home")
      .addEventListener("click", () => {
        renderHome();
        showView("home");
      });

    document.querySelectorAll("[data-review-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        session.reviewFilter = btn.getAttribute("data-review-filter");
        document.querySelectorAll("[data-review-filter]").forEach((b) => {
          b.classList.toggle("active", b === btn);
        });
        renderResultsReviewList();
      });
    });

    // Catalog filters
    document
      .getElementById("catalog-search-input")
      .addEventListener("input", renderCatalogView);
    document
      .getElementById("catalog-cat-filter")
      .addEventListener("change", renderCatalogView);
    document
      .getElementById("catalog-status-filter")
      .addEventListener("change", renderCatalogView);

    // Reset stats
    document
      .getElementById("btn-reset-stats")
      .addEventListener("click", () => {
        if (
          window.confirm(
            "Möchtest du deine gesamte Lernstatistik und Fehlerliste wirklich zurücksetzen?"
          )
        ) {
          userStats = {
            questions: {},
            exams: { attempts: 0, passed: 0, bestScore: 0 },
          };
          saveStats();
          renderHome();
        }
      });
  }

  // Initialize App
  bindEvents();
  renderHome();
})();
