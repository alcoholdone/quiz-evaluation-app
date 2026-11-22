import { state } from '../state/store.js';
import { VOCAB_UNITS } from '../data/units.js';
import { stopAllSpeech, speakEN, speakTH } from '../services/speech.js';
import { saveSpecialScore, getSpecialScores } from '../services/storage.js';

// ============================================================
//  SPECIAL PRACTICE — Unit 3 (What's this? / Plural / How many / Fill in the blank)
// ============================================================

// --- Helper: shuffle array ---
export function spShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- Get special practice vocab ---
function getSpVocab() {
  const unit = VOCAB_UNITS.find(u => u.id === 'unit_3');
  return (unit && unit.specialPractice) ? unit.specialPractice.vocabulary : [];
}

function getSpHowMany() {
  const unit = VOCAB_UNITS.find(u => u.id === 'unit_3');
  return (unit && unit.specialPractice) ? unit.specialPractice.howManyItems : [];
}

// --- Image helper: supports both emoji strings and inline SVG ---
// Returns the full HTML to embed inside .sp-image-display
function spImageHTML(image) {
  if (typeof image === 'string' && image.trim().startsWith('<svg')) {
    // SVG: wrap so CSS can target it cleanly
    return `<span class="sp-svg-wrap">${image}</span>`;
  }
  // Plain emoji / text
  return image;
}

// --- Init: called when tab is opened ---
export function initSpecialPanel() {
  if (state.spCurrentActivity < 1 || state.spCurrentActivity > 4) state.spCurrentActivity = 1;
  switchSpecialActivity(state.spCurrentActivity);
}

// --- Switch between activities ---
export function switchSpecialActivity(num) {
  state.spCurrentActivity = num;
  // Update selector buttons
  for (let i = 1; i <= 4; i++) {
    const btn = document.getElementById(`sp-act-btn-${i}`);
    if (btn) btn.classList.toggle('active', i === num);
  }
  state.spCurrentIndex = 0;
  state.spScore = 0;
  state.spAnswered = false;
  buildSpQuestions(num);
  renderSpQuestion();
}

// --- Build question list for each activity ---
function buildSpQuestions(activity) {
  const vocab = getSpVocab();
  if (activity === 1) {
    // What's this? — 7 questions, one per word
    state.spQuestions = spShuffle(vocab).map(v => ({ type: 'singular', item: v }));
    state.spTotal = state.spQuestions.length;
  } else if (activity === 2) {
    // What are these? — 7 questions
    state.spQuestions = spShuffle(vocab).map(v => ({ type: 'plural', item: v }));
    state.spTotal = state.spQuestions.length;
  } else if (activity === 3) {
    // How many — 8 questions
    const items = getSpHowMany();
    const questions = [];
    const counts = [1, 2, 3, 4, 5];
    for (let i = 0; i < 8; i++) {
      const item = items[i % items.length];
      const count = counts[Math.floor(Math.random() * counts.length)];
      questions.push({ type: 'howmany', item, count });
    }
    state.spQuestions = spShuffle(questions);
    state.spTotal = 8;
  } else if (activity === 4) {
    // Fill in the blank — 6 questions (mix of a/an + singular/plural)
    const blanks = [];
    const shuffled = spShuffle(vocab);
    shuffled.slice(0, 3).forEach(v => {
      blanks.push({
        type: 'fillblank', subtype: 'article', item: v,
        question: `Q: What's this?\nA: It's ___ ${v.word}.`,
        answer: v.article,
        choices: ['a', 'an', 'the', 'some']
      });
    });
    shuffled.slice(3, 6).forEach(v => {
      blanks.push({
        type: 'fillblank', subtype: 'plural', item: v,
        question: `Q: What are these?\nA: They're ___.`,
        answer: v.plural,
        choices: spShuffle([v.plural, v.word, vocab.find(x => x.word !== v.word)?.plural || 'notebooks', vocab.find(x => x.word !== v.word && x.plural !== (vocab.find(y => y.word !== v.word)?.plural))?.word || 'computers'])
      });
    });
    state.spQuestions = spShuffle(blanks);
    state.spTotal = 6;
  }
}

// --- Render current question ---
export function renderSpQuestion() {
  const area = document.getElementById('special-play-area');
  if (!area) return;

  if (state.spCurrentIndex >= state.spTotal) {
    renderSpResult();
    return;
  }

  const q = state.spQuestions[state.spCurrentIndex];
  if (!q) return;

  state.spAnswered = false;

  if (q.type === 'singular') renderSpSingular(area, q);
  else if (q.type === 'plural') renderSpPlural(area, q);
  else if (q.type === 'howmany') renderSpHowMany(area, q);
  else if (q.type === 'fillblank') renderSpFillBlank(area, q);
}

// --- Activity 1: What's this? ---
function renderSpSingular(area, q) {
  const vocab = getSpVocab();
  const correctText = `It's ${q.item.article} ${q.item.word}.`;
  const distractors = spShuffle(vocab.filter(v => v.word !== q.item.word)).slice(0, 3)
    .map(v => `It's ${v.article} ${v.word}.`);
  const choices = spShuffle([correctText, ...distractors]);

  area.innerHTML = `
    <div class="sp-question-card">
      <div class="sp-progress-bar"><div class="sp-progress-fill" style="width:${Math.round((state.spCurrentIndex / state.spTotal) * 100)}%"></div></div>
      <div class="sp-counter">${state.spCurrentIndex + 1} / ${state.spTotal}</div>
      <div class="sp-question-label">❓ What's this?</div>
      <div class="sp-image-display">${spImageHTML(q.item.image)}</div>
      <div class="sp-options-grid" id="sp-opts-container">
        ${choices.map((c, i) => `
          <button class="sp-option-btn" id="sp-opt-${i}" data-choice="${i}">
            ${c}
          </button>`).join('')}
      </div>
      <div class="sp-feedback" id="sp-feedback"></div>
      <button class="sp-next-btn" id="sp-next-btn" style="display:none;">
        ➡️ ข้อถัดไป
      </button>
    </div>`;

  state.spCurrentChoices = choices;
  state.spCurrentCorrect = correctText;
  attachSpOptionListeners(1);
  attachSpNextListener();
  setTimeout(() => speakEN(`What's this?`, 0.85), 400);
}

// --- Activity 2: What are these? ---
function renderSpPlural(area, q) {
  const vocab = getSpVocab();
  const correctText = `They're ${q.item.plural}.`;
  const distractors = spShuffle(vocab.filter(v => v.word !== q.item.word)).slice(0, 3)
    .map(v => `They're ${v.plural}.`);
  const choices = spShuffle([correctText, ...distractors]);

  area.innerHTML = `
    <div class="sp-question-card">
      <div class="sp-progress-bar"><div class="sp-progress-fill" style="width:${Math.round((state.spCurrentIndex / state.spTotal) * 100)}%"></div></div>
      <div class="sp-counter">${state.spCurrentIndex + 1} / ${state.spTotal}</div>
      <div class="sp-question-label">❓ What are these?</div>
      <div class="sp-image-display ${q.item.image.startsWith('<svg') ? 'sp-plural-display-svg' : 'sp-plural-display'}">
        ${spImageHTML(q.item.image)}${spImageHTML(q.item.image)}${spImageHTML(q.item.image)}
      </div>
      <div class="sp-options-grid" id="sp-opts-container">
        ${choices.map((c, i) => `
          <button class="sp-option-btn" id="sp-opt-${i}" data-choice="${i}">
            ${c}
          </button>`).join('')}
      </div>
      <div class="sp-feedback" id="sp-feedback"></div>
      <button class="sp-next-btn" id="sp-next-btn" style="display:none;">
        ➡️ ข้อถัดไป
      </button>
    </div>`;

  state.spCurrentChoices = choices;
  state.spCurrentCorrect = correctText;
  attachSpOptionListeners(2);
  attachSpNextListener();
  setTimeout(() => speakEN(`What are these?`, 0.85), 400);
}

// --- Activity 3: How many? ---
const SP_NUMBER_WORDS = ['one', 'two', 'three', 'four', 'five'];

function renderSpHowMany(area, q) {
  const count = q.count;  // 1-5
  const numWord = SP_NUMBER_WORDS[count - 1];
  // Correct answer: "Three CDs."
  const label = count === 1 ? q.item.word : q.item.plural;
  const correctText = `${numWord.charAt(0).toUpperCase() + numWord.slice(1)} ${label}.`;

  // Distractors: same item, other counts
  const otherCounts = [1, 2, 3, 4, 5].filter(n => n !== count);
  const distractors = spShuffle(otherCounts).slice(0, 3).map(n => {
    const nw = SP_NUMBER_WORDS[n - 1];
    const lbl = n === 1 ? q.item.word : q.item.plural;
    return `${nw.charAt(0).toUpperCase() + nw.slice(1)} ${lbl}.`;
  });
  const choices = spShuffle([correctText, ...distractors]);

  // Build emoji display
  let emojiRow = '';
  for (let i = 0; i < count; i++) emojiRow += `<span class="sp-count-emoji">${q.item.image}</span>`;

  area.innerHTML = `
    <div class="sp-question-card">
      <div class="sp-progress-bar"><div class="sp-progress-fill" style="width:${Math.round((state.spCurrentIndex / state.spTotal) * 100)}%"></div></div>
      <div class="sp-counter">${state.spCurrentIndex + 1} / ${state.spTotal}</div>
      <div class="sp-question-label">🔢 How many ${q.item.plural}?</div>
      <div class="sp-howmany-grid">${emojiRow}</div>
      <div class="sp-qa-answer-prompt">A: ___</div>
      <div class="sp-options-grid" id="sp-opts-container">
        ${choices.map((c, i) => `
          <button class="sp-option-btn" id="sp-opt-${i}" data-choice="${i}">
            ${c}
          </button>`).join('')}
      </div>
      <div class="sp-feedback" id="sp-feedback"></div>
      <button class="sp-next-btn" id="sp-next-btn" style="display:none;">
        ➡️ ข้อถัดไป
      </button>
    </div>`;

  state.spCurrentChoices = choices;
  state.spCurrentCorrect = correctText;
  attachSpOptionListeners(3);
  attachSpNextListener();
  setTimeout(() => speakEN(`How many ${q.item.plural}?`, 0.85), 400);
}

// --- Activity 4: Fill in the blank ---
function renderSpFillBlank(area, q) {
  const choices = q.choices;
  const correctText = q.answer;

  area.innerHTML = `
    <div class="sp-question-card">
      <div class="sp-progress-bar"><div class="sp-progress-fill" style="width:${Math.round((state.spCurrentIndex / state.spTotal) * 100)}%"></div></div>
      <div class="sp-counter">${state.spCurrentIndex + 1} / ${state.spTotal}</div>
      <div class="sp-question-label">🔄 Fill in the blank</div>
      <div class="sp-image-display">${spImageHTML(q.item.image)}</div>
      <div class="sp-fillblank-sentence">${q.question.replace('___', '<span class="sp-blank">___</span>')}</div>
      <div class="sp-options-grid" id="sp-opts-container">
        ${choices.map((c, i) => `
          <button class="sp-option-btn" id="sp-opt-${i}" data-choice="${i}">
            ${c}
          </button>`).join('')}
      </div>
      <div class="sp-feedback" id="sp-feedback"></div>
      <button class="sp-next-btn" id="sp-next-btn" style="display:none;">
        ➡️ ข้อถัดไป
      </button>
    </div>`;

  state.spCurrentChoices = choices;
  state.spCurrentCorrect = correctText;
  attachSpOptionListeners(4);
  attachSpNextListener();
  // No TTS for fill-in-the-blank — reading aloud the blank sounds odd
}

// --- Delegated event helpers ---
function attachSpOptionListeners(activityNum) {
  const container = document.getElementById('sp-opts-container');
  if (!container) return;
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.sp-option-btn');
    if (!btn) return;
    const idx = parseInt(btn.dataset.choice, 10);
    const selected = state.spCurrentChoices[idx];
    checkSpAnswerInternal(btn, selected, state.spCurrentCorrect, activityNum);
  });
}

function attachSpNextListener() {
  const nextBtn = document.getElementById('sp-next-btn');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (state.spAutoAdvanceTimer) clearTimeout(state.spAutoAdvanceTimer);
      state.spCurrentIndex++;
      state.spAnswered = false;
      renderSpQuestion();
    });
  }
}

// --- Check answer (internal, called by delegation) ---
function checkSpAnswerInternal(btn, selected, correct, activityNum) {
  if (state.spAnswered) return;
  state.spAnswered = true;

  // Cancel previous auto-advance if any
  if (state.spAutoAdvanceTimer) clearTimeout(state.spAutoAdvanceTimer);

  const isCorrect = selected === correct;
  if (isCorrect) state.spScore++;

  // Disable all option buttons and highlight correct/wrong
  document.querySelectorAll('.sp-option-btn').forEach(b => {
    b.disabled = true;
    const idx = parseInt(b.dataset.choice, 10);
    const bText = state.spCurrentChoices[idx];
    if (bText === correct) {
      b.classList.add('sp-correct');
    } else if (b === btn && !isCorrect) {
      b.classList.add('sp-wrong');
    }
  });

  const fb = document.getElementById('sp-feedback');
  if (fb) {
    if (isCorrect) {
      fb.innerHTML = `<span class="sp-fb-correct">🌟 ถูกต้องมากเลย! <em>${correct}</em></span>`;
      fb.classList.add('sp-fb-show');
      stopAllSpeech();
      setTimeout(() => speakEN(correct, 0.85), 300);
    } else {
      fb.innerHTML = `<span class="sp-fb-wrong">❌ คำตอบที่ถูกคือ: <em>${correct}</em></span>`;
      fb.classList.add('sp-fb-show');
      stopAllSpeech();
      setTimeout(() => speakEN(correct, 0.75), 300);
    }
  }

  // Show next button
  const nextBtn = document.getElementById('sp-next-btn');
  if (nextBtn) nextBtn.style.display = 'block';

  // Auto-advance after 2.5s
  state.spAutoAdvanceTimer = setTimeout(() => {
    if (state.spAnswered) {
      state.spCurrentIndex++;
      state.spAnswered = false;
      renderSpQuestion();
    }
  }, 2500);
}

// --- Next question (legacy, kept for compatibility) ---
export function nextSpQuestion() {
  if (state.spAutoAdvanceTimer) clearTimeout(state.spAutoAdvanceTimer);
  state.spCurrentIndex++;
  state.spAnswered = false;
  renderSpQuestion();
}

// --- Show result screen ---
function renderSpResult() {
  const area = document.getElementById('special-play-area');
  if (!area) return;

  // Save to localStorage
  saveSpecialScore(state.spCurrentActivity, state.spScore, state.spTotal);

  const pct = Math.round((state.spScore / state.spTotal) * 100);
  let emoji, msg;
  if (pct === 100) { emoji = '🏆'; msg = 'เก่งมากเลย! ได้คะแนนเต็ม!'; }
  else if (pct >= 70) { emoji = '🌟'; msg = 'ดีมาก! ทำได้ดีจ้า'; }
  else if (pct >= 50) { emoji = '💪'; msg = 'พยายามอีกนิดนะ!'; }
  else { emoji = '📚'; msg = 'ลองฝึกใหม่อีกครั้งจ้า!'; }

  const activityNames = ['', "What's this?", "What are these?", "How many...?", "Fill in the blank"];
  const stored = getSpecialScores();

  area.innerHTML = `
    <div class="sp-result-card">
      <div class="sp-result-emoji">${emoji}</div>
      <h3 class="sp-result-title">${activityNames[state.spCurrentActivity]}</h3>
      <div class="sp-result-score">${state.spScore} / ${state.spTotal}</div>
      <div class="sp-result-pct">${pct}%</div>
      <p class="sp-result-msg">${msg}</p>

      <div class="sp-history-grid">
        ${Object.entries(stored).map(([key, val]) => `
          <div class="sp-history-item">
            <div class="sp-history-act">${['', '🖼️', '👥', '🔢', '🔄'][parseInt(key.replace('activity', ''))]}</div>
            <div class="sp-history-score">${val.score}/${val.total}</div>
            <div class="sp-history-date">${val.date}</div>
          </div>`).join('')}
      </div>

      <div class="sp-result-actions">
        <button class="sp-retry-btn" onclick="switchSpecialActivity(${state.spCurrentActivity})">🔄 ลองใหม่อีกครั้ง</button>
        <button class="sp-next-act-btn" onclick="switchSpecialActivity(${state.spCurrentActivity < 4 ? state.spCurrentActivity + 1 : 1})">
          ${state.spCurrentActivity < 4 ? '➡️ กิจกรรมถัดไป' : '🏁 เริ่มใหม่ทั้งหมด'}
        </button>
      </div>
    </div>`;

  stopAllSpeech();
  setTimeout(() => speakTH(msg), 500);
}
