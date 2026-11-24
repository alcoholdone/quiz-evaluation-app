import { state, nodes, STORAGE_KEYS, clearScopedTimers } from '../state/store.js';
import { VOCAB_UNITS, EXAM_COUNTS, UNIT_META, EXAM_PREP_CATALOG } from '../data/units.js';
import { DICTATION_ROUNDS, DICTATION_ROUND_TERM } from '../data/dictation-rounds.js';
import { getCustomVocabList } from '../services/storage.js';
import { escapeHTML } from '../utils/sanitize.js';
import { initLearnMode } from './learn.js';
import { getUnit5ExamWords } from './quiz-generator.js';
import { renderCustomVocabTable } from './vocab-manager.js';
import { updateDictationTermUI, updateDictationRound } from './dictation.js';
import { initStarsSystem } from './rewards.js';
import { switchTab } from './navigation.js';
import { pauseTimer, clearTransitionTimeout } from './game.js';
import { renderDashboard } from './dashboard.js';

export function getTermForUnitId(unitId) {
  const examEntry = EXAM_PREP_CATALOG.find(e => e.id === unitId);
  if (examEntry) return examEntry.term;
  const unit = VOCAB_UNITS.find(u => u.id === unitId);
  return (unit && unit.term) ? unit.term : 1;
}

function formatTermUnitRange(termNum) {
  const nums = VOCAB_UNITS
    .filter(u => (u.term || 1) === termNum)
    .map(u => {
      const m = /^unit_(\d+)/.exec(u.id);
      return m ? Number(m[1]) : null;
    })
    .filter(n => n !== null);
  if (nums.length === 0) return '';
  if (nums.length === 1) return `Unit ${nums[0]}`;
  return `Unit ${Math.min(...nums)}–${Math.max(...nums)}`;
}

export function renderTermSelectors() {
  const containers = [
    document.getElementById('learn-term-selector'),
    document.getElementById('game-term-selector'),
    document.getElementById('dictation-term-selector')
  ];

  const terms = [
    { num: 1, label: `📘 เทอม 1 (${formatTermUnitRange(1)})` },
    { num: 2, label: `📗 เทอม 2 (${formatTermUnitRange(2)})` }
  ];

  containers.forEach(container => {
    if (!container) return;
    container.innerHTML = '';
    terms.forEach(t => {
      const isActive = state.currentTerm === t.num;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `btn-term-select term-${t.num}${isActive ? ' active' : ''}`;
      btn.dataset.term = String(t.num);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      btn.textContent = t.label;
      btn.addEventListener('click', () => setCurrentTerm(t.num));
      container.appendChild(btn);
    });
  });
}

export function setCurrentTerm(termNum) {
  state.currentTerm = termNum;
  renderTermSelectors();
  renderUnitSelectors();

  // Switch active unit if current unit doesn't belong to the newly selected term
  if (getTermForUnitId(state.currentUnitId) !== state.currentTerm) {
    const firstUnitOfTerm = VOCAB_UNITS.find(u => (u.term || 1) === state.currentTerm);
    if (firstUnitOfTerm) {
      loadUnitVocab(firstUnitOfTerm.id);
    }
  } else {
    updateUnitSelectorUI();
  }

  // Sync dictation rounds to the selected term
  updateDictationTermUI();
  if ((DICTATION_ROUND_TERM[state.selectedDictationRound] || 1) !== state.currentTerm) {
    const firstRoundOfTerm = Object.keys(DICTATION_ROUNDS).find(r => (DICTATION_ROUND_TERM[r] || 1) === state.currentTerm);
    if (firstRoundOfTerm) {
      updateDictationRound(firstRoundOfTerm);
    }
  }
}

export function initCustomVocabData() {
  // Clean legacy custom vocab once (if exists)
  if (localStorage.getItem(STORAGE_KEYS.CUSTOM_VOCAB)) {
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_VOCAB);
  }

  // Render term & unit shelf selectors initially (default: latest unit -> Term 2 -> Unit 6)
  renderTermSelectors();
  renderUnitSelectors();

  // Load default unit & dictation round
  loadUnitVocab(state.currentUnitId);
  updateDictationRound(state.selectedDictationRound);

  setupQuizLengthSelectors();
  setupGameModeSelectors();

  // Initialize Stars System
  initStarsSystem();
}

export function loadUnitVocab(unitId) {
  // Reset any in-progress game or previous unit's dashboard session state (Bug #1 fix)
  pauseTimer();
  clearTransitionTimeout();
  clearScopedTimers('game');
  clearScopedTimers('review');
  state.challengeQuestions = [];
  state.userAnswers = [];
  state.questionTimeSpent = [];
  state.currentQuestionIndex = 0;
  state.gameTotalSeconds = 0;
  state.questionStartTime = null;
  state.hasCompletedAssessment = false;
  state.learnCategoryFilter = 'all';

  state.currentUnitId = unitId;

  // Keep term UI in sync whenever a unit/exam is loaded directly
  const unitTerm = getTermForUnitId(unitId);
  if (unitTerm !== state.currentTerm) {
    state.currentTerm = unitTerm;
    renderTermSelectors();
    renderUnitSelectors();
    updateDictationTermUI();
  }

  const subtitle = document.getElementById('subtitleText');
  if (unitId === 'midterm_prep') {
    const unit1 = VOCAB_UNITS.find(u => u.id === 'unit_1');
    const unit2 = VOCAB_UNITS.find(u => u.id === 'unit_2');
    state.ORIGINAL_VOCAB_LIST = [...(unit1 ? unit1.words : []), ...(unit2 ? unit2.words : [])];
    if (subtitle) {
      subtitle.textContent = `🎓 เทอม 1 · เตรียมสอบกลางภาค ป.1 (Let's Go 1 Unit 1-2)`;
    }
  } else if (unitId === 'final_exam_prep') {
    const unit3 = VOCAB_UNITS.find(u => u.id === 'unit_3');
    const unit4 = VOCAB_UNITS.find(u => u.id === 'unit_4');
    state.ORIGINAL_VOCAB_LIST = [...(unit3 ? unit3.words : []), ...(unit4 ? unit4.words : [])];
    if (subtitle) {
      subtitle.textContent = `📝 เทอม 1 · เตรียมสอบปลายภาค ป.1 (Let's Go 1 Unit 3-4)`;
    }
  } else if (unitId === 'unit5_exam') {
    state.ORIGINAL_VOCAB_LIST = getUnit5ExamWords();
    if (subtitle) {
      subtitle.textContent = `🎯 เทอม 2 · สอบท้ายบท Unit 5: Birthday and Toys (ของเล่น 10 คำ + Adjectives 8 คำ + โครงสร้าง It's a/an...)`;
    }
  } else {
    const unit = VOCAB_UNITS.find(u => u.id === unitId) || VOCAB_UNITS[0];
    state.ORIGINAL_VOCAB_LIST = [...unit.words];
    if (subtitle) {
      subtitle.textContent = `เทอม ${unit.term || 1} · เรียนรู้คำศัพท์: ${unit.title} (${state.ORIGINAL_VOCAB_LIST.length} คำหลัก)`;
    }
  }

  // Show / hide Unit 5 Exam grammar study guide in Learn mode
  const unit5Guide = document.getElementById('unit5-exam-study-guide');
  if (unit5Guide) {
    unit5Guide.style.display = unitId === 'unit5_exam' ? 'block' : 'none';
  }

  refreshVocabList();
  renderCustomVocabTable();
  updateUnitSelectorUI();

  // Show / hide the Special Practice tab (Unit 3 only)
  const hasSpecial = unitId === 'unit_3';
  if (nodes.tabSpecial) {
    nodes.tabSpecial.style.display = hasSpecial ? '' : 'none';
    if (!hasSpecial && state.activeTab === 'special') {
      switchTab('learn');
    }
  }

  if (state.activeTab === 'game' && nodes.gameStartScreen && nodes.gamePlayArea) {
    nodes.gameStartScreen.style.display = 'block';
    nodes.gamePlayArea.style.display = 'none';
  } else if (state.activeTab === 'dashboard') {
    renderDashboard();
  }
}

function buildLessonShelfInto(container, termUnits, termExams) {
  if (!container) return;
  container.innerHTML = '';

  // Group 1: Unit Lessons
  const unitsGroup = document.createElement('div');
  unitsGroup.className = 'shelf-group';

  const unitsLabel = document.createElement('div');
  unitsLabel.className = 'shelf-group-label';
  unitsLabel.textContent = '📖 บทเรียนประจำหน่วย';
  unitsGroup.appendChild(unitsLabel);

  const unitsGrid = document.createElement('div');
  unitsGrid.className = 'shelf-grid shelf-grid--units';

  termUnits.forEach(unit => {
    const meta = UNIT_META[unit.id] || {
      icon: '📘',
      code: unit.title.split(':')[0],
      titleEn: unit.title,
      titleTh: '',
      accent: 'sage'
    };
    const isActive = unit.id === state.currentUnitId;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn-unit-select unit-tile${isActive ? ' active' : ''}`;
    btn.dataset.unitId = unit.id;
    btn.dataset.accent = meta.accent;
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');

    const specialBadge = (unit.specialPractice || meta.hasSpecial)
      ? `<span class="unit-tile-badge unit-tile-badge--special">⭐ แบบฝึกพิเศษ</span>`
      : '';

    btn.innerHTML = `
      <span class="unit-tile-icon" aria-hidden="true">${escapeHTML(meta.icon)}</span>
      <span class="unit-tile-body">
        <span class="unit-tile-code">${escapeHTML(meta.code)} · ${escapeHTML(meta.titleEn)}</span>
        ${meta.titleTh ? `<span class="unit-tile-sub">${escapeHTML(meta.titleTh)}</span>` : ''}
        <span class="unit-tile-meta">
          <span>${unit.words.length} คำ</span>
          ${specialBadge}
        </span>
      </span>
    `;
    btn.addEventListener('click', () => loadUnitVocab(unit.id));
    unitsGrid.appendChild(btn);
  });

  unitsGroup.appendChild(unitsGrid);
  container.appendChild(unitsGroup);

  // Group 2: Exam Preps
  if (termExams.length > 0) {
    const examsGroup = document.createElement('div');
    examsGroup.className = 'shelf-group';

    const examsLabel = document.createElement('div');
    examsLabel.className = 'shelf-group-label';
    examsLabel.textContent = '🎯 ชุดติวสอบ & เก็บโบนัสดาว';
    examsGroup.appendChild(examsLabel);

    const examsGrid = document.createElement('div');
    examsGrid.className = 'shelf-grid shelf-grid--exams';

    termExams.forEach(exam => {
      const isActive = exam.id === state.currentUnitId;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `btn-unit-select unit-tile unit-tile--exam exam-${exam.theme}${isActive ? ' active' : ''}`;
      btn.dataset.unitId = exam.id;
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      btn.innerHTML = `
        <span class="unit-tile-icon" aria-hidden="true">${escapeHTML(exam.icon)}</span>
        <span class="unit-tile-body">
          <span class="unit-tile-code">${escapeHTML(exam.title)}</span>
          <span class="unit-tile-sub">${escapeHTML(exam.subtitle)}</span>
          <span class="unit-tile-meta">
            <span>${exam.count} ข้อ</span>
            <span class="unit-tile-badge unit-tile-badge--bonus">+${exam.bonusStars} ⭐</span>
          </span>
        </span>
      `;
      btn.addEventListener('click', () => loadUnitVocab(exam.id));
      examsGrid.appendChild(btn);
    });

    examsGroup.appendChild(examsGrid);
    container.appendChild(examsGroup);
  }
}

export function renderUnitSelectors() {
  const learnSelector = document.getElementById('learn-unit-selector');
  const gameSelector = document.getElementById('game-unit-selector');
  if (!learnSelector || !gameSelector) return;

  const termUnits = VOCAB_UNITS.filter(unit => (unit.term || 1) === state.currentTerm);
  const termExams = EXAM_PREP_CATALOG.filter(exam => exam.term === state.currentTerm);

  buildLessonShelfInto(learnSelector, termUnits, termExams);
  buildLessonShelfInto(gameSelector, termUnits, termExams);
}

export function updateUnitSelectorUI() {
  const allBtns = [
    ...document.querySelectorAll('#learn-unit-selector button[data-unit-id]'),
    ...document.querySelectorAll('#game-unit-selector button[data-unit-id]')
  ];
  allBtns.forEach(btn => {
    const isActive = btn.dataset.unitId === state.currentUnitId;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

export function setupQuizLengthSelectors() {
  const btn10 = document.getElementById('quiz-length-10');
  const btnFinal = document.getElementById('quiz-length-final');
  if (!btn10 || !btnFinal) return;

  btn10.addEventListener('click', () => {
    btn10.classList.add('active');
    btnFinal.classList.remove('active');
    btn10.setAttribute('aria-pressed', 'true');
    btnFinal.setAttribute('aria-pressed', 'false');

    state.quizQuestionCount = 10;
    updateGameStartMeta();
  });

  btnFinal.addEventListener('click', () => {
    btnFinal.classList.add('active');
    btn10.classList.remove('active');
    btnFinal.setAttribute('aria-pressed', 'true');
    btn10.setAttribute('aria-pressed', 'false');

    state.quizQuestionCount = Math.min(20, state.VOCAB_LIST.length);
    updateGameStartMeta();
  });
}

export function setupGameModeSelectors() {
  const btnMixed = document.getElementById('game-mode-mixed');
  const btnQA = document.getElementById('game-mode-qa');
  if (!btnMixed || !btnQA) return;

  btnMixed.addEventListener('click', () => {
    state.selectedGameMode = 'mixed';
    btnMixed.classList.add('active');
    btnQA.classList.remove('active');
    btnMixed.setAttribute('aria-pressed', 'true');
    btnQA.setAttribute('aria-pressed', 'false');
  });

  btnQA.addEventListener('click', () => {
    state.selectedGameMode = 'qa';
    btnQA.classList.add('active');
    btnMixed.classList.remove('active');
    btnQA.setAttribute('aria-pressed', 'true');
    btnMixed.setAttribute('aria-pressed', 'false');
  });
}

export function refreshVocabList() {
  state.VOCAB_LIST.length = 0;
  state.VOCAB_LIST.push(...state.ORIGINAL_VOCAB_LIST);

  const custom = getCustomVocabList();
  state.VOCAB_LIST.push(...custom);

  initLearnMode();
  updateGameStartMeta();
}

export function updateGameStartMeta() {
  const countSpan = document.getElementById('start-screen-vocab-count');
  if (countSpan) {
    countSpan.textContent = state.VOCAB_LIST.length;
  }

  const gameModeSetup = document.getElementById('game-mode-group')
    || (document.getElementById('game-mode-mixed') ? document.getElementById('game-mode-mixed').closest('div') : null);
  const quizLengthSetup = document.getElementById('quiz-length-group')
    || (document.getElementById('quiz-length-10') ? document.getElementById('quiz-length-10').closest('div') : null);
  const startMetaInfo = document.getElementById('game-start-meta');
  const startDesc = document.querySelector('#game-start-screen p');
  const startTitle = document.querySelector('#game-start-screen h2');

  if (state.currentUnitId === 'midterm_prep') {
    state.quizQuestionCount = EXAM_COUNTS.midterm;
    if (gameModeSetup) gameModeSetup.style.display = 'none';
    if (quizLengthSetup) quizLengthSetup.style.display = 'none';
    if (startMetaInfo) {
      startMetaInfo.className = 'start-meta-info meta-midterm';
      startMetaInfo.innerHTML = `🎓 แบบทดสอบกลางภาค ป.1 มีทั้งหมด <span class="start-meta-highlight">${EXAM_COUNTS.midterm} ข้อ</span> ครบทุกแนวข้อสอบจ้า`;
    }
    if (startTitle) startTitle.textContent = '🏆 ภารกิจจำลองสอบกลางภาค ป.1 (Let\'s Go 1)';
    if (startDesc) startDesc.textContent = `น้องๆ จะได้ทำข้อสอบ ${EXAM_COUNTS.midterm} ข้อ รวมคำศัพท์ ไวยากรณ์ (Grammar) และฝึกโฟนิกส์ (Phonics Bb, Pp, Cc, Gg) ของบทเรียน Unit 1-2 เพื่อสะสมดาวทองเป็นกรณีพิเศษ!`;
  } else if (state.currentUnitId === 'final_exam_prep') {
    state.quizQuestionCount = EXAM_COUNTS.finalExam;
    if (gameModeSetup) gameModeSetup.style.display = 'none';
    if (quizLengthSetup) quizLengthSetup.style.display = 'none';
    if (startMetaInfo) {
      startMetaInfo.className = 'start-meta-info meta-final';
      startMetaInfo.innerHTML = `🌟 แบบทดสอบปลายภาค ป.1 มีทั้งหมด <span class="start-meta-highlight">${EXAM_COUNTS.finalExam} ข้อ</span> ครบทุกแนวข้อสอบ Unit 3-4 จ้า`;
    }
    if (startTitle) startTitle.textContent = '🌟 ภารกิจจำลองสอบปลายภาค ป.1 (Let\'s Go 1)';
    if (startDesc) startDesc.textContent = `น้องๆ จะได้ทำข้อสอบ ${EXAM_COUNTS.finalExam} ข้อ รวมคำศัพท์ สิ่งของในห้องเรียน/คนในครอบครัว, ไวยากรณ์ Singular/Plural, ประโยคถาม-ตอบ, บทสนทนา และฝึกโฟนิกส์ (Phonics Dd, Tt, Aa) ของบทเรียน Unit 3-4 เพื่อรับโบนัสดาวทองคำพิเศษ 25 ดวง!`;
  } else if (state.currentUnitId === 'unit5_exam') {
    state.quizQuestionCount = EXAM_COUNTS.unit5Exam;
    if (gameModeSetup) gameModeSetup.style.display = 'none';
    if (quizLengthSetup) quizLengthSetup.style.display = 'none';
    if (startMetaInfo) {
      startMetaInfo.className = 'start-meta-info meta-unit5';
      startMetaInfo.innerHTML = `🎯 ข้อสอบท้ายบท Unit 5 มีทั้งหมด <span class="start-meta-highlight">${EXAM_COUNTS.unit5Exam} ข้อ</span> ครบทั้งของเล่น, Adjectives และประโยค It's a/an จ้า`;
    }
    if (startTitle) startTitle.textContent = '🎯 ภารกิจสอบท้ายบท Unit 5: Birthday and Toys';
    if (startDesc) startDesc.textContent = `น้องๆ จะได้ทำข้อสอบ ${EXAM_COUNTS.unit5Exam} ข้อ ครบทั้งคำศัพท์ของเล่น 10 คำ, คำคุณศัพท์ 8 คำ & คู่ตรงข้าม, ไวยากรณ์ It's a/an + adj + noun (ระวัง an old!) และประโยคถาม-ตอบ What is it? เพื่อรับโบนัสดาวทองคำพิเศษ 20 ดวง!`;
  } else {
    if (gameModeSetup) gameModeSetup.style.display = 'block';
    if (quizLengthSetup) quizLengthSetup.style.display = 'block';

    const isLength10 = document.getElementById('quiz-length-10') && document.getElementById('quiz-length-10').classList.contains('active');
    state.quizQuestionCount = isLength10 ? 10 : Math.min(20, state.VOCAB_LIST.length);

    if (startMetaInfo) {
      startMetaInfo.className = 'start-meta-info meta-unit';
      startMetaInfo.innerHTML = `คลังคำศัพท์ปัจจุบันมีทั้งหมด <span id="start-screen-vocab-count" class="start-meta-highlight">${state.VOCAB_LIST.length}</span> คำจ้า`;
    }
    if (startTitle) startTitle.textContent = 'ภารกิจเกมท้าทายสะกดคำ!';
    if (startDesc) startDesc.textContent = 'น้องๆ จะต้องตอบคำถามทั้งหมด 10 ข้อ โดยมีทั้งการฟังเสียง การเลือกคำอังกฤษ และการเชื่อมโยงภาพความหมายภาษาไทยจ้า';
  }
}
