import { state, nodes, STORAGE_KEYS, clearScopedTimers } from '../state/store.js';
import { VOCAB_UNITS, EXAM_COUNTS } from '../data/units.js';
import { DICTATION_ROUNDS, DICTATION_ROUND_TERM } from '../data/dictation-rounds.js';
import { getCustomVocabList } from '../services/storage.js';
import { initLearnMode } from './learn.js';
import { getUnit5ExamWords } from './quiz-generator.js';
import { renderCustomVocabTable } from './vocab-manager.js';
import { updateDictationTermUI, updateDictationRound } from './dictation.js';
import { initStarsSystem } from './rewards.js';
import { switchTab } from './navigation.js';
import { pauseTimer, clearTransitionTimeout } from './game.js';
import { renderDashboard } from './dashboard.js';

export function getTermForUnitId(unitId) {
  if (unitId === 'midterm_prep' || unitId === 'final_exam_prep') return 1;
  if (unitId === 'unit5_exam') return 2;
  const unit = VOCAB_UNITS.find(u => u.id === unitId);
  return (unit && unit.term) ? unit.term : 1;
}

export function getTermBtnStyle(isActive, termNum) {
  if (isActive) {
    if (termNum === 2) {
      return 'padding: 7px 14px; font-size: 0.85rem; font-weight: 800; border-radius: 999px; border: 2px solid #059669; background: linear-gradient(135deg, #d1fae5 0%, #6ee7b7 100%); color: #065f46; cursor: pointer; transition: all 0.2s; box-shadow: 0 3px 8px rgba(5, 150, 105, 0.25);';
    }
    return 'padding: 7px 14px; font-size: 0.85rem; font-weight: 800; border-radius: 999px; border: 2px solid #2563eb; background: linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%); color: #1e3a8a; cursor: pointer; transition: all 0.2s; box-shadow: 0 3px 8px rgba(37, 99, 235, 0.25);';
  }
  return 'padding: 7px 14px; font-size: 0.85rem; font-weight: 700; border-radius: 999px; border: 2px solid #cbd5e1; background: #ffffff; color: var(--text-muted); cursor: pointer; transition: all 0.2s;';
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
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `btn-term-select ${state.currentTerm === t.num ? 'active' : ''}`;
      btn.dataset.term = String(t.num);
      btn.textContent = t.label;
      btn.style.cssText = getTermBtnStyle(state.currentTerm === t.num, t.num);
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

  // Render term & unit selectors initially (default: Term 2 -> Unit 5)
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
    // If current tab is special and we switch away, go back to learn
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

export function renderUnitSelectors() {
  const learnSelector = document.getElementById('learn-unit-selector');
  const gameSelector = document.getElementById('game-unit-selector');

  if (!learnSelector || !gameSelector) return;

  learnSelector.innerHTML = '';
  gameSelector.innerHTML = '';

  const termUnits = VOCAB_UNITS.filter(unit => (unit.term || 1) === state.currentTerm);

  const appendUnitButton = (container, id, label, flags = {}) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const isActive = id === state.currentUnitId;
    btn.className = `btn-unit-select ${isActive ? 'active' : ''}`;
    btn.dataset.unitId = id;
    btn.textContent = label;
    btn.style.cssText = getUnitBtnStyle(isActive, !!flags.isMidterm, !!flags.isFinal, !!flags.isUnit5Exam);
    btn.addEventListener('click', () => loadUnitVocab(id));
    container.appendChild(btn);
  };

  termUnits.forEach(unit => {
    const shortLabel = unit.title.split(':')[0];
    appendUnitButton(learnSelector, unit.id, shortLabel);
    appendUnitButton(gameSelector, unit.id, shortLabel);
  });

  if (state.currentTerm === 1) {
    appendUnitButton(learnSelector, 'midterm_prep', '🎓 เตรียมสอบกลางภาค', { isMidterm: true });
    appendUnitButton(learnSelector, 'final_exam_prep', '🌟 เตรียมสอบปลายภาค', { isFinal: true });
    appendUnitButton(gameSelector, 'midterm_prep', '🎓 เตรียมสอบกลางภาค', { isMidterm: true });
    appendUnitButton(gameSelector, 'final_exam_prep', '🌟 เตรียมสอบปลายภาค', { isFinal: true });
  } else if (state.currentTerm === 2) {
    appendUnitButton(learnSelector, 'unit5_exam', '🎯 สอบท้ายบท Unit 5', { isUnit5Exam: true });
    appendUnitButton(gameSelector, 'unit5_exam', '🎯 สอบท้ายบท Unit 5', { isUnit5Exam: true });
  }
}

export function getUnitBtnStyle(isActive, isMidterm = false, isFinal = false, isUnit5Exam = false) {
  if (isUnit5Exam) {
    if (isActive) {
      return 'padding: 8px 16px; font-size: 0.88rem; font-weight: 800; border-radius: 10px; border: 2px solid #ea580c; background: linear-gradient(135deg, #fed7aa 0%, #fb923c 100%); color: #7c2d12; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 10px rgba(234, 88, 12, 0.35); animation: pulse-gold 2s infinite;';
    } else {
      return 'padding: 8px 16px; font-size: 0.88rem; font-weight: 800; border-radius: 10px; border: 2px solid #fed7aa; background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); color: #c2410c; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(234, 88, 12, 0.1);';
    }
  }
  if (isFinal) {
    if (isActive) {
      return 'padding: 8px 16px; font-size: 0.88rem; font-weight: 800; border-radius: 10px; border: 2px solid #a855f7; background: linear-gradient(135deg, #f3e8ff 0%, #c084fc 100%); color: #581c87; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 10px rgba(168, 85, 247, 0.35); animation: pulse-gold 2s infinite;';
    } else {
      return 'padding: 8px 16px; font-size: 0.88rem; font-weight: 800; border-radius: 10px; border: 2px solid #e9d5ff; background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); color: #7e22ce; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(168, 85, 247, 0.1);';
    }
  }
  if (isMidterm) {
    if (isActive) {
      return 'padding: 8px 16px; font-size: 0.88rem; font-weight: 800; border-radius: 10px; border: 2px solid #eab308; background: linear-gradient(135deg, #fef08a 0%, #facc15 100%); color: #78350f; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 10px rgba(234, 179, 8, 0.35); animation: pulse-gold 2s infinite;';
    } else {
      return 'padding: 8px 16px; font-size: 0.88rem; font-weight: 800; border-radius: 10px; border: 2px solid #fef08a; background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); color: #b45309; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(234, 179, 8, 0.1);';
    }
  }
  if (isActive) {
    return 'padding: 8px 16px; font-size: 0.88rem; font-weight: 700; border-radius: 10px; border: 2px solid var(--primary); background: var(--primary-light); color: var(--primary-hover); cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.1);';
  } else {
    return 'padding: 8px 16px; font-size: 0.88rem; font-weight: 700; border-radius: 10px; border: 2px solid #cbd5e1; background: white; color: var(--text-muted); cursor: pointer; transition: all 0.2s;';
  }
}

export function updateUnitSelectorUI() {
  const allBtns = [
    ...document.querySelectorAll('#learn-unit-selector button'),
    ...document.querySelectorAll('#game-unit-selector button')
  ];
  allBtns.forEach(btn => {
    const id = btn.dataset.unitId;
    const isActive = id === state.currentUnitId;
    btn.className = `btn-unit-select ${isActive ? 'active' : ''}`;
    btn.style.cssText = getUnitBtnStyle(
      isActive,
      id === 'midterm_prep',
      id === 'final_exam_prep',
      id === 'unit5_exam'
    );
  });
}

export function setupQuizLengthSelectors() {
  const btn10 = document.getElementById('quiz-length-10');
  const btnFinal = document.getElementById('quiz-length-final');

  if (!btn10 || !btnFinal) return;

  btn10.addEventListener('click', () => {
    btn10.classList.add('active');
    btnFinal.classList.remove('active');

    btn10.style.cssText = 'flex: 1; padding: 10px 14px; font-size: 0.88rem; font-weight: 700; border-radius: 12px; border: 2px solid var(--primary); background: var(--primary-light); color: var(--primary-hover); cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.1);';
    btnFinal.style.cssText = 'flex: 1; padding: 10px 14px; font-size: 0.88rem; font-weight: 700; border-radius: 12px; border: 2px solid #e2e8f0; background: white; color: var(--text-muted); cursor: pointer; transition: all 0.2s;';

    state.quizQuestionCount = 10;
    updateGameStartMeta();
  });

  btnFinal.addEventListener('click', () => {
    btnFinal.classList.add('active');
    btn10.classList.remove('active');

    btnFinal.style.cssText = 'flex: 1; padding: 10px 14px; font-size: 0.88rem; font-weight: 700; border-radius: 12px; border: 2px solid var(--primary); background: var(--primary-light); color: var(--primary-hover); cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.1);';
    btn10.style.cssText = 'flex: 1; padding: 10px 14px; font-size: 0.88rem; font-weight: 700; border-radius: 12px; border: 2px solid #e2e8f0; background: white; color: var(--text-muted); cursor: pointer; transition: all 0.2s;';

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

    btnMixed.style.cssText = 'flex: 1; padding: 10px 14px; font-size: 0.88rem; font-weight: 700; border-radius: 12px; border: 2px solid var(--primary); background: var(--primary-light); color: var(--primary-hover); cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.1);';
    btnQA.style.cssText = 'flex: 1; padding: 10px 14px; font-size: 0.88rem; font-weight: 700; border-radius: 12px; border: 2px solid #e2e8f0; background: white; color: var(--text-muted); cursor: pointer; transition: all 0.2s;';
  });

  btnQA.addEventListener('click', () => {
    state.selectedGameMode = 'qa';
    btnQA.classList.add('active');
    btnMixed.classList.remove('active');

    btnQA.style.cssText = 'flex: 1; padding: 10px 14px; font-size: 0.88rem; font-weight: 700; border-radius: 12px; border: 2px solid var(--primary); background: var(--primary-light); color: var(--primary-hover); cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.1);';
    btnMixed.style.cssText = 'flex: 1; padding: 10px 14px; font-size: 0.88rem; font-weight: 700; border-radius: 12px; border: 2px solid #e2e8f0; background: white; color: var(--text-muted); cursor: pointer; transition: all 0.2s;';
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
      startMetaInfo.innerHTML = `🎓 แบบทดสอบกลางภาค ป.1 มีทั้งหมด <span style="color:#d97706; font-weight:800;">${EXAM_COUNTS.midterm} ข้อ</span> ครบทุกแนวข้อสอบจ้า`;
      startMetaInfo.style.cssText = 'background: #fffbeb; border: 1.5px solid #fef08a; padding: 10px 16px; border-radius: 12px; display: inline-block; font-size: 0.95rem; font-weight: 600; color: #b45309; margin-bottom: 24px; animation: pulse-gold 2s infinite;';
    }
    if (startTitle) startTitle.textContent = '🏆 ภารกิจจำลองสอบกลางภาค ป.1 (Let\'s Go 1)';
    if (startDesc) startDesc.textContent = `น้องๆ จะได้ทำข้อสอบ ${EXAM_COUNTS.midterm} ข้อ รวมคำศัพท์ ไวยากรณ์ (Grammar) และฝึกโฟนิกส์ (Phonics Bb, Pp, Cc, Gg) ของบทเรียน Unit 1-2 เพื่อสะสมดาวทองเป็นกรณีพิเศษ!`;
  } else if (state.currentUnitId === 'final_exam_prep') {
    state.quizQuestionCount = EXAM_COUNTS.finalExam;
    if (gameModeSetup) gameModeSetup.style.display = 'none';
    if (quizLengthSetup) quizLengthSetup.style.display = 'none';
    if (startMetaInfo) {
      startMetaInfo.innerHTML = `🌟 แบบทดสอบปลายภาค ป.1 มีทั้งหมด <span style="color:#7e22ce; font-weight:800;">${EXAM_COUNTS.finalExam} ข้อ</span> ครบทุกแนวข้อสอบ Unit 3-4 จ้า`;
      startMetaInfo.style.cssText = 'background: #faf5ff; border: 1.5px solid #e9d5ff; padding: 10px 16px; border-radius: 12px; display: inline-block; font-size: 0.95rem; font-weight: 600; color: #7e22ce; margin-bottom: 24px; animation: pulse-gold 2s infinite;';
    }
    if (startTitle) startTitle.textContent = '🌟 ภารกิจจำลองสอบปลายภาค ป.1 (Let\'s Go 1)';
    if (startDesc) startDesc.textContent = `น้องๆ จะได้ทำข้อสอบ ${EXAM_COUNTS.finalExam} ข้อ รวมคำศัพท์ สิ่งของในห้องเรียน/คนในครอบครัว, ไวยากรณ์ Singular/Plural, ประโยคถาม-ตอบ, บทสนทนา และฝึกโฟนิกส์ (Phonics Dd, Tt, Aa) ของบทเรียน Unit 3-4 เพื่อรับโบนัสดาวทองคำพิเศษ 25 ดวง!`;
  } else if (state.currentUnitId === 'unit5_exam') {
    state.quizQuestionCount = EXAM_COUNTS.unit5Exam;
    if (gameModeSetup) gameModeSetup.style.display = 'none';
    if (quizLengthSetup) quizLengthSetup.style.display = 'none';
    if (startMetaInfo) {
      startMetaInfo.innerHTML = `🎯 ข้อสอบท้ายบท Unit 5 มีทั้งหมด <span style="color:#ea580c; font-weight:800;">${EXAM_COUNTS.unit5Exam} ข้อ</span> ครบทั้งของเล่น, Adjectives และประโยค It's a/an จ้า`;
      startMetaInfo.style.cssText = 'background: #fff7ed; border: 1.5px solid #fdba74; padding: 10px 16px; border-radius: 12px; display: inline-block; font-size: 0.95rem; font-weight: 600; color: #c2410c; margin-bottom: 24px; animation: pulse-gold 2s infinite;';
    }
    if (startTitle) startTitle.textContent = '🎯 ภารกิจสอบท้ายบท Unit 5: Birthday and Toys';
    if (startDesc) startDesc.textContent = `น้องๆ จะได้ทำข้อสอบ ${EXAM_COUNTS.unit5Exam} ข้อ ครบทั้งคำศัพท์ของเล่น 10 คำ, คำคุณศัพท์ 8 คำ & คู่ตรงข้าม, ไวยากรณ์ It's a/an + adj + noun (ระวัง an old!) และประโยคถาม-ตอบ What is it? เพื่อรับโบนัสดาวทองคำพิเศษ 20 ดวง!`;
  } else {
    if (gameModeSetup) gameModeSetup.style.display = 'block';
    if (quizLengthSetup) quizLengthSetup.style.display = 'block';

    const isLength10 = document.getElementById('quiz-length-10') && document.getElementById('quiz-length-10').classList.contains('active');
    state.quizQuestionCount = isLength10 ? 10 : Math.min(20, state.VOCAB_LIST.length);

    if (startMetaInfo) {
      startMetaInfo.innerHTML = `คลังคำศัพท์ปัจจุบันมีทั้งหมด <span id="start-screen-vocab-count" style="color: var(--primary-hover); font-weight: 700;">${state.VOCAB_LIST.length}</span> คำจ้า`;
      startMetaInfo.style.cssText = 'background: var(--secondary-light); border: 1px solid var(--secondary-border); padding: 10px 16px; border-radius: 12px; display: inline-block; font-size: 0.95rem; font-weight: 600; color: var(--secondary-dark); margin-bottom: 24px;';
    }
    if (startTitle) startTitle.textContent = 'ภารกิจเกมท้าทายสะกดคำ!';
    if (startDesc) startDesc.textContent = 'น้องๆ จะต้องตอบคำถามทั้งหมด 10 ข้อ โดยมีทั้งการฟังเสียง การเลือกคำอังกฤษ และการเชื่อมโยงภาพความหมายภาษาไทยจ้า';
  }
}
