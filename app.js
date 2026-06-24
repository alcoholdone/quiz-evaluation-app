// Game & Evaluation State
let activeTab = 'learn';
let currentQuestionIndex = 0;
let challengeQuestions = []; // Array of 10 generated questions
let userAnswers = []; // Array of 10 selected option items or null
let questionTimeSpent = []; // Seconds spent per question
let questionStartTime = null;
let gameTimerInterval = null;
let gameTotalSeconds = 0;
let hasCompletedAssessment = false;
let questionTransitionTimeout = null;

// Selected Game Mode State
let selectedGameMode = 'mixed'; // 'mixed' or 'qa'

// Spelling Practice Global State
let currentPracticeItem = null;
let practiceSelectedLetters = [];
let isSpellingSuccess = false;

// Dictation Global State
let currentDictationIndex = 0;
let dictationScore = 0;
let dictationSessionList = [];
let dictationSelectedLetters = [];
const DICTATION_ROUNDS = {
  r1: ['bag', 'board', 'book', 'chair', 'crayon'],
  r2: ['desk', 'eraser', 'globe', 'map', 'marker'],
  r3: ['pen', 'pencil', 'poster', 'ruler', 'wastebasket']
};
let selectedDictationRound = 'r1';
const DICTATION_STORAGE_KEY = 'aura_kids_dictation_history_v1';

function clearTransitionTimeout() {
  if (questionTransitionTimeout) {
    clearTimeout(questionTransitionTimeout);
    questionTransitionTimeout = null;
  }
}

// Chart.js instances
let skillsChart = null;
let trendChart = null;

// Local Storage Key
const STORAGE_KEY = 'aura_kids_vocab_history_v1';
const WEAK_STORAGE_KEY = 'aura_kids_trouble_words_v1';
const CUSTOM_STORAGE_KEY = 'aura_kids_custom_vocab_v1';
let ORIGINAL_VOCAB_LIST = [];
let currentUnitId = 'unit_1';
let quizQuestionCount = 10;
let VOCAB_LIST = [];

// Total questions in the midterm simulation (10 vocab + 4 phonics + 7 grammar).
const MIDTERM_QUESTION_COUNT = 21;

// Each shape's drawn SVG fill is a fixed color, so the "This is a ___. It's ___"
// answer must match the picture the child actually sees.
const SHAPE_COLOR_MAP = {
  circle: 'red',
  square: 'blue',
  triangle: 'green',
  rectangle: 'yellow',
  star: 'purple',
  heart: 'pink',
  diamond: 'orange',
  oval: 'brown'
};

// --- Word classification helpers (single source of truth) ---
// Words that are NOT singular countable nouns: action verbs, adjectives,
// greetings and colors. They must never get "a/an" or "Is this a ___?" framing.
const NON_NOUN_WORDS = ['sing', 'act', 'listen', 'look', 'open', 'close', 'fine', 'great', 'take out', 'put away', 'pick up', 'draw', 'yellow', 'blue', 'red', 'green', 'purple', 'orange', 'brown', 'pink', 'black', 'white'];

// "color" and "shape" ARE nouns, but they are abstract category headers whose
// picture is a generic icon — so we never frame them as "Is this a ___?" /
// "It's a ___" or use them as a picture quiz target.
const CATEGORY_NOUNS = ['color', 'shape'];

// True for any noun (used to decide part-of-speech style behavior).
function isNounWord(item) {
  if (!item || item.type === 'command') return false;
  return !NON_NOUN_WORDS.includes(item.word.trim().toLowerCase());
}

// True only for a concrete, picturable singular countable noun — the kind we can
// safely point at and ask "What's this? It's a ___" / "Is this a ___?".
function isConcreteNoun(item) {
  if (!isNounWord(item)) return false;
  return !CATEGORY_NOUNS.includes(item.word.trim().toLowerCase());
}

// A word is suitable for the letter-arranging spelling game only if it is a
// single, purely alphabetic word. Long nouns (e.g. "Wastebasket") are fine, but
// phrases and commands with spaces/punctuation are not (e.g. "Open your book.",
// "Take out") — those would force the child to place a "." or space tile.
function isSpellable(item) {
  if (!item || item.type === 'command') return false;
  const w = item.word.trim();
  return !/[^a-zA-Z]/.test(w); // letters only (rejects spaces, periods, etc.)
}

// DOM Nodes
const nodes = {
  tabLearn: document.getElementById('tab-learn'),
  tabGame: document.getElementById('tab-game'),
  tabDashboard: document.getElementById('tab-dashboard'),
  
  panelLearn: document.getElementById('learn-panel'),
  panelGame: document.getElementById('game-panel'),
  panelDashboard: document.getElementById('dashboard-panel'),
  
  dbEmptyState: document.getElementById('dashboard-empty-state'),
  dbContent: document.getElementById('dashboard-content'),
  
  currentNum: document.getElementById('current-game-num'),
  liveTimer: document.getElementById('game-live-timer'),
  progressBar: document.getElementById('game-progress-bar'),
  gameBox: document.getElementById('gameBox'),
  gameModeTitle: document.getElementById('gameModeTitle'),
  questionArea: document.getElementById('questionArea'),
  feedback: document.getElementById('feedback'),
  optionsGrid: document.getElementById('optionsGrid'),
  
  btnSkip: document.getElementById('btn-skip-game-question'),
  btnRestart: document.getElementById('btn-restart-game'),
  btnRestartReview: document.getElementById('btn-restart-game-review'),
  btnStartFromEmpty: document.getElementById('btn-goto-game-from-empty'),
  btnClearHistory: document.getElementById('btn-clear-game-history'),
  
  subtabOverview: document.getElementById('subtab-overview'),
  subtabReview: document.getElementById('subtab-review'),
  subtabVocabManager: document.getElementById('subtab-vocab-manager'),
  contentOverview: document.getElementById('dashboard-overview-content'),
  contentReview: document.getElementById('dashboard-review-content'),
  contentVocabManager: document.getElementById('dashboard-vocab-manager-content'),
  
  gameStartScreen: document.getElementById('game-start-screen'),
  gamePlayArea: document.getElementById('game-play-area'),
  btnStartSingle: document.getElementById('btn-start-single'),
  btnBackToStart: document.getElementById('btn-back-to-start'),
  btnBackToStartReview: document.getElementById('btn-back-to-start-review'),
  
  // Spelling Modal
  spellingModalOverlay: document.getElementById('spelling-practice-modal'),
  btnCloseSpellingModal: document.getElementById('btn-close-spelling-modal'),
  spellingModalImage: document.getElementById('spelling-modal-image'),
  spellingModalMeaning: document.getElementById('spelling-modal-meaning'),
  spellingModalSlots: document.getElementById('spelling-modal-slots'),
  spellingModalLetters: document.getElementById('spelling-modal-letters'),
  spellingModalFeedback: document.getElementById('spelling-modal-feedback'),
  btnResetSpelling: document.getElementById('btn-reset-spelling'),
  btnRepeatSound: document.getElementById('btn-repeat-sound'),

  // Dictation Elements
  tabDictation: document.getElementById('tab-dictation'),
  panelDictation: document.getElementById('dictation-panel'),
  dictationStartScreen: document.getElementById('dictation-start-screen'),
  dictationPlayArea: document.getElementById('dictation-play-area'),
  dictationResultScreen: document.getElementById('dictation-result-screen'),
  dictationWordsPreview: document.getElementById('dictation-words-preview'),
  btnStartDictation: document.getElementById('btn-start-dictation'),
  btnDictationSpeak: document.getElementById('btn-dictation-speak'),
  btnDictationSpell: document.getElementById('btn-dictation-spell'),
  dictationSlots: document.getElementById('dictation-slots'),
  dictationLetters: document.getElementById('dictation-letters'),
  btnDictationResetLetters: document.getElementById('btn-dictation-reset-letters'),
  dictationFeedback: document.getElementById('dictation-feedback'),
  btnDictationRestart: document.getElementById('btn-dictation-restart'),
  btnDictationBackHome: document.getElementById('btn-dictation-back-home')
};

// Setup Listeners
document.addEventListener('DOMContentLoaded', () => {
  initCustomVocabData(); // calls loadUnitVocab → refreshVocabList → initLearnMode
  setupEventListeners();
});

function setupEventListeners() {
  // Main Tab Navigation
  nodes.tabLearn.addEventListener('click', () => switchTab('learn'));
  nodes.tabGame.addEventListener('click', () => switchTab('game'));
  nodes.tabDashboard.addEventListener('click', () => switchTab('dashboard'));
  
  // Dashboard Subtabs
  nodes.subtabOverview.addEventListener('click', () => switchDashboardTab('overview'));
  nodes.subtabReview.addEventListener('click', () => switchDashboardTab('review'));
  nodes.subtabVocabManager.addEventListener('click', () => switchDashboardTab('vocab-manager'));
  const subtabRewards = document.getElementById('subtab-rewards');
  if (subtabRewards) {
    subtabRewards.addEventListener('click', () => switchDashboardTab('rewards'));
  }
  
  // Actions
  nodes.btnSkip.addEventListener('click', skipQuestion);
  nodes.btnRestart.addEventListener('click', () => {
    startNewChallenge();
  });
  nodes.btnRestartReview.addEventListener('click', () => {
    startNewChallenge();
  });
  nodes.btnStartFromEmpty.addEventListener('click', () => switchTab('game'));
  nodes.btnClearHistory.addEventListener('click', clearHistoryData);

  // Play Game button (Single Mode)
  if (nodes.btnStartSingle) {
    nodes.btnStartSingle.addEventListener('click', () => {
      nodes.gameStartScreen.style.display = 'none';
      nodes.gamePlayArea.style.display = 'block';
      startNewChallenge();
    });
  }

  // Back to Start menu buttons
  if (nodes.btnBackToStart) {
    nodes.btnBackToStart.addEventListener('click', () => {
      nodes.gameStartScreen.style.display = 'block';
      nodes.gamePlayArea.style.display = 'none';
      switchTab('game');
    });
  }
  if (nodes.btnBackToStartReview) {
    nodes.btnBackToStartReview.addEventListener('click', () => {
      nodes.gameStartScreen.style.display = 'block';
      nodes.gamePlayArea.style.display = 'none';
      switchTab('game');
    });
  }

  // Spelling Modal Listeners
  if (nodes.btnCloseSpellingModal) {
    nodes.btnCloseSpellingModal.addEventListener('click', closeSpellingPractice);
  }
  if (nodes.btnResetSpelling) {
    nodes.btnResetSpelling.addEventListener('click', () => {
      if (currentPracticeItem) resetSpellingPractice(currentPracticeItem);
    });
  }
  if (nodes.btnRepeatSound) {
    nodes.btnRepeatSound.addEventListener('click', () => {
      if (currentPracticeItem) spellAndSpeak(currentPracticeItem, null, 0.8);
    });
  }

  // Parent Vocab add Form Submit
  const addForm = document.getElementById('vocab-add-form');
  if (addForm) {
    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const word = document.getElementById('vocab-word').value.trim();
      const meaning = document.getElementById('vocab-meaning').value.trim();
      const image = document.getElementById('vocab-image').value.trim();
      const explanation = document.getElementById('vocab-explanation').value.trim();
      
      if (!word || !meaning || !image || !explanation) {
        alert('กรุณากรอกข้อมูลให้ครบถ้วนทุกช่องด้วยนะจ๊ะ');
        return;
      }
      
      const exists = VOCAB_LIST.some(item => item.word.toLowerCase() === word.toLowerCase());
      if (exists) {
        alert('คำศัพท์นี้มีอยู่ในคลังแล้วจ้า ลองเพิ่มคำอื่นนะ');
        return;
      }
      
      const newVocab = { word, meaning, image, explanation };
      const list = getCustomVocabList();
      list.push(newVocab);
      saveCustomVocabList(list);
      
      addForm.reset();
      alert('บันทึกคำศัพท์ใหม่เรียบร้อยแล้วจ้า! สามารถไปทบทวนในโหมดฝึกสะกดคำได้เลย');
      
      refreshVocabList();
      renderCustomVocabTable();
      updateGameStartMeta();
    });
  }

  // Dictation Listeners
  if (nodes.tabDictation) {
    nodes.tabDictation.addEventListener('click', () => switchTab('dictation'));
  }
  if (nodes.btnStartDictation) {
    nodes.btnStartDictation.addEventListener('click', startDictationTest);
  }
  if (nodes.btnDictationSpeak) {
    nodes.btnDictationSpeak.addEventListener('click', () => playDictationAudio(false));
  }
  if (nodes.btnDictationSpell) {
    nodes.btnDictationSpell.addEventListener('click', () => playDictationAudio(true));
  }
  if (nodes.btnDictationResetLetters) {
    nodes.btnDictationResetLetters.addEventListener('click', () => {
      const currentItem = dictationSessionList[currentDictationIndex];
      if (currentItem) resetDictationSpelling(currentItem);
    });
  }
  if (nodes.btnDictationRestart) {
    nodes.btnDictationRestart.addEventListener('click', startDictationTest);
  }
  if (nodes.btnDictationBackHome) {
    nodes.btnDictationBackHome.addEventListener('click', showDictationStudyScreen);
  }

  // Dictation Round Selector Click Listeners
  const updateDictationRound = (roundKey) => {
    selectedDictationRound = roundKey;
    ['r1', 'r2', 'r3'].forEach(r => {
      const btn = document.getElementById(`btn-dictation-${r}`);
      if (btn) {
        if (r === roundKey) {
          btn.classList.add('active');
          btn.style.border = '2px solid var(--primary)';
          btn.style.background = 'var(--primary-light)';
          btn.style.color = 'var(--primary-hover)';
          btn.style.boxShadow = '0 4px 6px rgba(16, 185, 129, 0.1)';
        } else {
          btn.classList.remove('active');
          btn.style.border = '2px solid #e2e8f0';
          btn.style.background = 'white';
          btn.style.color = 'var(--text-muted)';
          btn.style.boxShadow = 'none';
        }
      }
    });

    // Update instruction texts dynamically
    const roundNum = roundKey === 'r1' ? '1' : roundKey === 'r2' ? '2' : '3';
    const dictationDesc = document.querySelector('#dictation-start-screen p');
    if (dictationDesc) {
      dictationDesc.textContent = `มารอบที่ ${roundNum} ฝึกเขียนตามคำบอก 5 คำแสนสนุกกันเถอะเด็กๆ! ฟังเสียงสะกดและพิมพ์ให้ถูกต้องเพื่อรับคะแนนนะจ๊ะ`;
    }
    const dictationGuideHeader = document.querySelector('.dictation-study-guide h3');
    if (dictationGuideHeader) {
      dictationGuideHeader.textContent = `📖 คำศัพท์เตรียมท่องรอบที่ ${roundNum}`;
    }

    initDictationStudyMode();
  };

  const btnR1 = document.getElementById('btn-dictation-r1');
  const btnR2 = document.getElementById('btn-dictation-r2');
  const btnR3 = document.getElementById('btn-dictation-r3');
  if (btnR1) btnR1.addEventListener('click', () => updateDictationRound('r1'));
  if (btnR2) btnR2.addEventListener('click', () => updateDictationRound('r2'));
  if (btnR3) btnR3.addEventListener('click', () => updateDictationRound('r3'));
}

// MAIN TAB SWITCHING
function switchTab(tabId) {
  clearTransitionTimeout();
  stopAllSpeech();
  activeTab = tabId;
  
  // Update Tab buttons
  nodes.tabLearn.classList.remove('active');
  nodes.tabGame.classList.remove('active');
  if (nodes.tabDictation) nodes.tabDictation.classList.remove('active');
  nodes.tabDashboard.classList.remove('active');
  
  nodes.tabLearn.setAttribute('aria-selected', 'false');
  nodes.tabGame.setAttribute('aria-selected', 'false');
  if (nodes.tabDictation) nodes.tabDictation.setAttribute('aria-selected', 'false');
  nodes.tabDashboard.setAttribute('aria-selected', 'false');
  
  // Update Panels
  nodes.panelLearn.classList.remove('active');
  nodes.panelGame.classList.remove('active');
  if (nodes.panelDictation) nodes.panelDictation.classList.remove('active');
  nodes.panelDashboard.classList.remove('active');
  
  if (tabId === 'learn') {
    nodes.tabLearn.classList.add('active');
    nodes.tabLearn.setAttribute('aria-selected', 'true');
    nodes.panelLearn.classList.add('active');
  } else if (tabId === 'game') {
    nodes.tabGame.classList.add('active');
    nodes.tabGame.setAttribute('aria-selected', 'true');
    nodes.panelGame.classList.add('active');
    
    // If not currently in a session, or session is already finished, show start screen
    if (challengeQuestions.length === 0 || hasCompletedAssessment) {
      nodes.gameStartScreen.style.display = 'block';
      nodes.gamePlayArea.style.display = 'none';
      updateGameStartMeta();
    } else {
      nodes.gameStartScreen.style.display = 'none';
      nodes.gamePlayArea.style.display = 'block';
      resumeTimer();
    }
  } else if (tabId === 'dictation') {
    if (nodes.tabDictation) {
      nodes.tabDictation.classList.add('active');
      nodes.tabDictation.setAttribute('aria-selected', 'true');
    }
    if (nodes.panelDictation) nodes.panelDictation.classList.add('active');
    pauseTimer();
    initDictationStudyMode();
  } else if (tabId === 'dashboard') {
    nodes.tabDashboard.classList.add('active');
    nodes.tabDashboard.setAttribute('aria-selected', 'true');
    nodes.panelDashboard.classList.add('active');
    pauseTimer();
    
    // Render Dashboard
    renderDashboard();
  }
}

// DASHBOARD SUBTAB SWITCHING
function switchDashboardTab(subtabId) {
  nodes.subtabOverview.classList.remove('active');
  nodes.subtabReview.classList.remove('active');
  nodes.subtabVocabManager.classList.remove('active');
  const subtabRewards = document.getElementById('subtab-rewards');
  if (subtabRewards) subtabRewards.classList.remove('active');
  
  nodes.contentOverview.classList.remove('active');
  nodes.contentReview.classList.remove('active');
  nodes.contentVocabManager.classList.remove('active');
  const contentRewards = document.getElementById('dashboard-rewards-content');
  if (contentRewards) contentRewards.classList.remove('active');
  
  // Hide empty state and dashboard content blocks by default
  nodes.dbEmptyState.style.display = 'none';
  nodes.dbContent.style.display = 'none';
  
  nodes.contentOverview.style.display = 'none';
  nodes.contentReview.style.display = 'none';
  nodes.contentVocabManager.style.display = 'none';
  if (contentRewards) contentRewards.style.display = 'none';
  
  const history = getHistory();
  const assessmentNotCompleted = (history.length === 0 && !hasCompletedAssessment);
  
  if (subtabId === 'overview') {
    nodes.subtabOverview.classList.add('active');
    if (assessmentNotCompleted) {
      nodes.dbEmptyState.style.display = 'flex';
    } else {
      nodes.dbContent.style.display = 'block';
      nodes.contentOverview.classList.add('active');
      nodes.contentOverview.style.display = 'block';
    }
  } else if (subtabId === 'review') {
    nodes.subtabReview.classList.add('active');
    if (assessmentNotCompleted) {
      nodes.dbEmptyState.style.display = 'flex';
    } else {
      nodes.dbContent.style.display = 'block';
      nodes.contentReview.classList.add('active');
      nodes.contentReview.style.display = 'block';
      renderDetailedReview();
    }
  } else if (subtabId === 'vocab-manager') {
    // Vocab manager & rewards don't depend on quiz history, so always show them
    nodes.subtabVocabManager.classList.add('active');
    nodes.dbContent.style.display = 'block';
    nodes.contentVocabManager.classList.add('active');
    nodes.contentVocabManager.style.display = 'block';
    renderCustomVocabTable();
  } else if (subtabId === 'rewards') {
    if (subtabRewards) subtabRewards.classList.add('active');
    nodes.dbContent.style.display = 'block';
    if (contentRewards) {
      contentRewards.classList.add('active');
      contentRewards.style.display = 'block';
    }
    renderRewardsStore();
  }
}

// TEXT TO SPEECH (TTS) ENGINE
let currentSpeechToken = null;
let lastCancelTime = 0;
let activeUtterances = [];

// Preload voices early so they are ready on first click (Chrome loads async)
if ('speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    window.speechSynthesis.getVoices();
  });

  // Chrome bug recovery: when the tab is hidden Chrome pauses the speech engine
  // and frequently leaves it "stuck paused" so the next speak() is silent.
  // Cancelling on hide gives us a clean slate (the app re-speaks on interaction).
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
  });

  // Autoplay unlock: Chrome only allows speech once the page has had a user
  // gesture. Auto-read prompts (fired from setTimeout) get blocked until then.
  // On the very first interaction we speak a silent utterance to "unlock" the
  // engine, so every later auto-read works without a fresh click.
  let speechPrimed = false;
  const primeSpeech = () => {
    if (speechPrimed) return;
    speechPrimed = true;
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    window.speechSynthesis.resume();
    window.speechSynthesis.speak(u);
  };
  ['pointerdown', 'touchstart', 'keydown'].forEach(evt => {
    window.addEventListener(evt, primeSpeech, { once: true, capture: true });
  });
}

// Keepalive: while speech is active, periodically resume() to recover the engine
// from Chrome's "stuck paused" state and to refresh its internal ~15s timeout.
// Runs only while there is active/queued speech, then stops itself.
let speechKeepAliveTimer = null;
function startSpeechKeepAlive() {
  if (speechKeepAliveTimer || !('speechSynthesis' in window)) return;
  speechKeepAliveTimer = setInterval(() => {
    const synth = window.speechSynthesis;
    if (synth.speaking || synth.pending) {
      synth.resume(); // no-op if already running; clears a stuck pause otherwise
    } else {
      clearInterval(speechKeepAliveTimer);
      speechKeepAliveTimer = null;
    }
  }, 5000);
}

function stopAllSpeech() {
  currentSpeechToken = null;
  activeUtterances = []; // Clear references to prevent GC leaks or stuck speech
  if ('speechSynthesis' in window) {
    // Only cancel when there is active speech — unconditional cancel breaks Chrome's engine
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
      lastCancelTime = Date.now();
    }
  }
  document.querySelectorAll('.vocab-card').forEach(c => {
    c.classList.remove('speaking');
    resetCardSpeechHighlight(c);
  });
}

function getVoice(langPrefix) {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find(v => v.lang.startsWith(langPrefix) && v.localService)
    || voices.find(v => v.lang.startsWith(langPrefix))
    || null;
}

function makeUtterance(text, lang, rate = 1) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  const voice = getVoice(lang.slice(0, 2));
  if (voice) u.voice = voice;

  // Prevent Garbage Collection in Chrome by keeping a reference
  activeUtterances.push(u);
  
  u.addEventListener('end', () => {
    activeUtterances = activeUtterances.filter(item => item !== u);
  });
  u.addEventListener('error', () => {
    activeUtterances = activeUtterances.filter(item => item !== u);
  });

  return u;
}

// Voice test / reset — recovers the app's speech state and tells the user when
// the problem is Chrome-level (stuck engine / empty voice list) vs. just paused.
window.testAndResetVoice = function() {
  if (!('speechSynthesis' in window)) {
    alert('เบราว์เซอร์นี้ไม่รองรับระบบเสียงพูด กรุณาใช้ Google Chrome เวอร์ชันล่าสุดนะคะ');
    return;
  }

  const synth = window.speechSynthesis;

  // 1) Clear any stuck/queued state and wake the engine
  stopAllSpeech();
  synth.cancel();
  synth.resume();

  // 2) Re-request the voice list (Chrome loads it lazily and sometimes drops it)
  const voices = synth.getVoices();

  // 3) Empty voice list == Chrome's speech engine is dead. JS can't revive it.
  if (!voices || voices.length === 0) {
    alert('🔇 ระบบเสียงของ Chrome ค้างอยู่ (ไม่พบเสียงพูดในระบบ)\n\nวิธีแก้ที่เร็วที่สุด:\nกด Cmd + Q เพื่อปิด Chrome ให้สนิท แล้วเปิดขึ้นมาใหม่\n(ไม่ต้องรีสตาร์ทเครื่องนะคะ)');
    return;
  }

  // 4) Voices exist → play a short test in both languages
  const btn = document.getElementById('btn-voice-test');
  if (btn) {
    btn.style.transform = 'scale(1.15)';
    setTimeout(() => { btn.style.transform = ''; }, 250);
  }
  playFeedbackSounds([
    makeUtterance('Hello!', 'en-US', 0.9),
    makeUtterance('ระบบเสียงพร้อมใช้งานแล้วจ้า', 'th-TH', 1)
  ]);
};

function speakEN(text, rate = 0.8) {
  if (!('speechSynthesis' in window)) return;
  // Always resume before speaking to fix Chrome's engine getting stuck
  window.speechSynthesis.resume();
  window.speechSynthesis.speak(makeUtterance(text, 'en-US', rate));
  startSpeechKeepAlive();
}

function speakTH(text) {
  if (!('speechSynthesis' in window)) return;
  // Always resume before speaking to fix Chrome's engine getting stuck
  window.speechSynthesis.resume();
  window.speechSynthesis.speak(makeUtterance(text, 'th-TH', 1));
  startSpeechKeepAlive();
}

// SPELL AND SPEAK VOCABULARY (LEARN MODE)
//
// Chrome: calling speak() immediately after cancel() causes silence — needs ~80ms delay.
//   On first click there is no cancel, so delay = 0 and it speaks right away.
//   On subsequent clicks (previous speech was canceled), delay = 80ms.
//   By then Safari has already "unlocked" speech on the first call, so setTimeout works there too.
//
// Safari: onend of the last utterance sometimes does not fire.
//   A fallback timer based on estimated word length cleans up the card state.
function spellAndSpeak(item, cardElement = null, rate = 0.8) {
  if (!('speechSynthesis' in window)) {
    alert('อุปกรณ์ของคุณไม่รองรับระบบสังเคราะห์เสียงพูดภาษาอังกฤษครับ');
    return;
  }

  const token = Symbol('speech');
  stopAllSpeech();
  currentSpeechToken = token;

  if (cardElement) {
    cardElement.classList.add('speaking');
    resetCardSpeechHighlight(cardElement);
  }

  // Safari fix: fallback cleanup if onend never fires (last utterance bug)
  const letterCount = item.word.replaceAll(' ', '').length;
  const estimatedMs = Math.round((letterCount * 700 + 2200) / (rate || 0.8));
  let cleanupTimer = setTimeout(() => {
    if (currentSpeechToken === token && cardElement) {
      resetCardSpeechHighlight(cardElement);
      cardElement.classList.remove('speaking');
    }
  }, estimatedMs);

  function queueAll() {
    if (currentSpeechToken !== token) {
      clearTimeout(cleanupTimer);
      return;
    }
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    startSpeechKeepAlive();

    if (item.type === 'command') {
      // Speak the command full sentence slowly/normally
      const wordU = makeUtterance(item.word, 'en-US', rate);
      wordU.onstart = () => {
        if (currentSpeechToken !== token) { window.speechSynthesis.cancel(); return; }
        if (cardElement) {
          const wordNode = cardElement.querySelector('.word');
          if (wordNode) wordNode.classList.add('highlight-word');
        }
      };
      wordU.onend = () => {
        if (cardElement) {
          const wordNode = cardElement.querySelector('.word');
          if (wordNode) wordNode.classList.remove('highlight-word');
          const meaningNode = cardElement.querySelector('.meaning');
          if (meaningNode) meaningNode.classList.add('highlight-meaning');
        }
      };
      window.speechSynthesis.speak(wordU);

      // Queue Thai meaning
      const thU = makeUtterance(item.meaning, 'th-TH', 1);
      thU.onend = () => {
        clearTimeout(cleanupTimer);
        if (currentSpeechToken === token && cardElement) {
          resetCardSpeechHighlight(cardElement);
          cardElement.classList.remove('speaking');
        }
      };
      window.speechSynthesis.speak(thU);
    } else {
      // Queue each letter
      item.word.split('').forEach((letter, i) => {
        if (letter === ' ') return;
        const charNode = cardElement ? cardElement.querySelector(`.spell-char[data-index="${i}"]`) : null;
        const u = makeUtterance(letter.toLowerCase(), 'en-US', rate * 0.7);
        u.onstart = () => {
          if (currentSpeechToken !== token) { window.speechSynthesis.cancel(); return; }
          if (charNode) charNode.classList.add('active-letter');
        };
        u.onend = () => {
          if (charNode) {
            charNode.classList.remove('active-letter');
            charNode.classList.add('done-letter');
          }
        };
        window.speechSynthesis.speak(u);
      });

      // Queue full word
      const wordU = makeUtterance(item.word, 'en-US', rate);
      wordU.onstart = () => {
        if (currentSpeechToken !== token) { window.speechSynthesis.cancel(); return; }
        if (cardElement) {
          const wordNode = cardElement.querySelector('.word');
          if (wordNode) wordNode.classList.add('highlight-word');
        }
      };
      wordU.onend = () => {
        if (cardElement) {
          const wordNode = cardElement.querySelector('.word');
          if (wordNode) wordNode.classList.remove('highlight-word');
          const meaningNode = cardElement.querySelector('.meaning');
          if (meaningNode) meaningNode.classList.add('highlight-meaning');
        }
      };
      window.speechSynthesis.speak(wordU);

      // Queue Thai meaning — onend here is the primary cleanup path
      const thU = makeUtterance(item.meaning, 'th-TH', 1);
      thU.onend = () => {
        clearTimeout(cleanupTimer);
        if (currentSpeechToken === token && cardElement) {
          resetCardSpeechHighlight(cardElement);
          cardElement.classList.remove('speaking');
        }
      };
      window.speechSynthesis.speak(thU);
    }
  }

  // Chrome: after cancel(), needs ~80ms before speak() works again.
  // First click has no prior cancel (lastCancelTime = 0), so sinceCancel is huge → no delay.
  const sinceCancel = Date.now() - lastCancelTime;
  if (sinceCancel < 200) {
    setTimeout(queueAll, 80);
  } else {
    queueAll();
  }
}

function resetCardSpeechHighlight(cardElement) {
  if (!cardElement) return;
  cardElement.querySelectorAll('.spell-char').forEach(c => {
    c.className = 'spell-char manual-letter-btn';
  });
  const wordNode = cardElement.querySelector('.word');
  if (wordNode) wordNode.classList.remove('highlight-word');
  const meaningNode = cardElement.querySelector('.meaning');
  if (meaningNode) meaningNode.classList.remove('highlight-meaning');
}

// INIT LEARN MODE CARDS
function initLearnMode() {
  const grid = document.getElementById('vocabGrid');
  if (!grid) return;
  grid.innerHTML = '';
  VOCAB_LIST.forEach(item => {
    const card = document.createElement('div');
    card.className = 'vocab-card';
    card.onclick = () => spellAndSpeak(item, card);
    
    let lettersHtml = '';
    let spellingFormatted = '';
    let hasPracticeBtn = true;
    let slowBtnText = '🐢 สะกดช้าๆ';

    if (item.type === 'command') {
      lettersHtml = `<span class="word-text-full" style="font-size: 1.5rem; font-weight: 700; color: var(--dark-2);">${item.word}</span>`;
      hasPracticeBtn = false;
      slowBtnText = '🐢 อ่านช้าๆ';
    } else {
      lettersHtml = item.word.split('').map((char, index) => {
        if (char === ' ') return '<span>&nbsp;</span>';
        return `<span class="spell-char manual-letter-btn" data-index="${index}">${char}</span>`;
      }).join('');
      spellingFormatted = `(${item.word.split('').join(' - ')})`;
    }
    
    const posBadge = item.label
      ? `<span class="pos-badge" title="ชนิดของคำ">${item.label}</span>`
      : '';
    card.innerHTML = `
      <div class="vocab-image">${item.image}</div>
      <div class="word">${lettersHtml}</div>
      <div class="spelling" style="min-height: 20px;">${spellingFormatted}</div>
      <div class="meaning">${posBadge}${item.meaning}</div>
      <div class="vocab-card-actions">
        <button class="slow-spell-btn" type="button">${slowBtnText}</button>
        ${hasPracticeBtn ? '<button class="spelling-practice-btn" type="button">🔤 ฝึกสะกดคำ</button>' : ''}
      </div>
    `;
    
    const slowBtn = card.querySelector('.slow-spell-btn');
    slowBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      spellAndSpeak(item, card, 0.4);
    });
    
    if (hasPracticeBtn) {
      const practiceBtn = card.querySelector('.spelling-practice-btn');
      practiceBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openSpellingPractice(item);
      });
    }
    
    card.querySelectorAll('.manual-letter-btn').forEach(letterSpan => {
      letterSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        const letter = letterSpan.textContent.toLowerCase();
        speakEN(letter, 0.55);
        letterSpan.classList.add('active-letter');
        setTimeout(() => {
          letterSpan.classList.remove('active-letter');
        }, 600);
      });
    });
    
    grid.appendChild(card);
  });
}

function selectTargetWords() {
  const customWords = getCustomVocabList();
  const weakWordNames = getWeakWordList();
  const weakWords = VOCAB_LIST.filter(item => weakWordNames.includes(item.word));
  
  const targets = [];
  const isSelected = (item) => targets.some(t => t.word === item.word);
  const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
  
  const recentCount = Math.min(4, ORIGINAL_VOCAB_LIST.length);
  const recentWords = ORIGINAL_VOCAB_LIST.slice(-recentCount);
  for (const item of recentWords) {
    if (!isSelected(item)) {
      targets.push(item);
    }
  }
  
  const maxCustom = Math.min(customWords.length, Math.floor(quizQuestionCount * 0.3));
  const maxWeak = Math.min(weakWords.length, Math.floor(quizQuestionCount * 0.3));
  
  for (const item of shuffle(customWords).slice(0, maxCustom)) {
    if (!isSelected(item) && targets.length < quizQuestionCount) {
      targets.push(item);
    }
  }
  
  for (const item of shuffle(weakWords).slice(0, maxWeak)) {
    if (!isSelected(item) && targets.length < quizQuestionCount) {
      targets.push(item);
    }
  }
  
  const remaining = shuffle(VOCAB_LIST.filter(item => !isSelected(item)));
  for (const item of remaining) {
    if (targets.length >= quizQuestionCount) break;
    targets.push(item);
  }
  
  return shuffle(targets).slice(0, quizQuestionCount);
}

// GET SENTENCE Q&A HIERARCHY
function getSentenceQA(item) {
  const word = item.word.trim();
  const wordLower = word.toLowerCase();
  
  // Nouns that take "an" (vowel sound)
  const nounsAn = ['eraser'];
  
  // Nouns that take "a" (consonant sound)
  const nounsA = [
    'pen', 'pencil', 'bag', 'book', 'desk', 'chair', 'ruler', 'map', 'marker', 
    'globe', 'table', 'board', 'wastebasket', 'poster', 'crayon', 'ball', 'bird', 'peach'
  ];
  
  if (item.type === 'command') {
    return {
      question: "What does the teacher say?",
      answer: item.word,
      thaiQuestion: "คุณครูพูดว่าอะไร?",
      thaiAnswer: item.meaning
    };
  }
  
  if (nounsAn.includes(wordLower)) {
    return {
      question: "What’s this?",
      answer: `It’s an ${wordLower}.`,
      thaiQuestion: "นี่คืออะไร?",
      thaiAnswer: `มันคือ${item.meaning}`
    };
  } else if (nounsA.includes(wordLower)) {
    return {
      question: "What’s this?",
      answer: `It’s a ${wordLower}.`,
      thaiQuestion: "นี่คืออะไร?",
      thaiAnswer: `มันคือ${item.meaning}`
    };
  } else if (wordLower === 'boy') {
    return {
      question: "Who’s he?",
      answer: "He’s a boy.",
      thaiQuestion: "เขาคือใคร?",
      thaiAnswer: "เขาคือเด็กผู้ชาย"
    };
  } else if (wordLower === 'partner') {
    return {
      question: "Who’s this?",
      answer: "This is my partner.",
      thaiQuestion: "นี่คือใคร?",
      thaiAnswer: "นี่คือคู่หูของฉัน"
    };
  } else if (['open', 'close'].includes(wordLower)) {
    return {
      question: `Please ${wordLower} the book.`,
      answer: `I ${wordLower} the book.`,
      thaiQuestion: `กรุณา${item.meaning}หนังสือ`,
      thaiAnswer: `ฉัน${item.meaning}หนังสือ`
    };
  } else if (wordLower === 'take out') {
    return {
      question: "Please take out your pencil.",
      answer: "I take out my pencil.",
      thaiQuestion: "กรุณาหยิบดินสอของคุณออกมา",
      thaiAnswer: "ฉันหยิบดินสอของฉันออกมา"
    };
  } else if (wordLower === 'put away') {
    return {
      question: "Please put away your pencil.",
      answer: "I put away my pencil.",
      thaiQuestion: "กรุณาเก็บดินสอของคุณเข้าที่",
      thaiAnswer: "ฉันเก็บดินสอของฉันเข้าที่"
    };
  } else if (wordLower === 'listen') {
    return {
      question: "What should we do now?",
      answer: "Let’s listen.",
      thaiQuestion: "พวกเราควรทำอะไรตอนนี้?",
      thaiAnswer: "ไปฟังกันเถอะ"
    };
  } else if (wordLower === 'sing') {
    return {
      question: "What should we do now?",
      answer: "Let’s sing.",
      thaiQuestion: "พวกเราควรทำอะไรตอนนี้?",
      thaiAnswer: "ไปร้องเพลงกันเถอะ"
    };
  } else if (wordLower === 'act') {
    return {
      question: "What should we do now?",
      answer: "Let’s act.",
      thaiQuestion: "พวกเราควรทำอะไรตอนนี้?",
      thaiAnswer: "ไปแสดงท่าทางกันเถอะ"
    };
  } else if (wordLower === 'fine') {
    return {
      question: "How are you?",
      answer: "I’m fine.",
      thaiQuestion: "คุณสบายดีไหม?",
      thaiAnswer: "ฉันสบายดี"
    };
  } else if (wordLower === 'great') {
    return {
      question: "How are you?",
      answer: "I’m great.",
      thaiQuestion: "คุณสบายดีไหม?",
      thaiAnswer: "ฉันสบายดีมาก"
    };
  } else if (wordLower === 'color') {
    return {
      question: "What’s this?",
      answer: "It’s a color.",
      thaiQuestion: "นี่คืออะไร?",
      thaiAnswer: "มันคือสี"
    };
  } else if (['yellow', 'blue', 'red', 'green', 'purple', 'orange', 'brown', 'pink', 'black', 'white'].includes(wordLower)) {
    return {
      question: "What color is this?",
      answer: `It’s ${wordLower}.`,
      thaiQuestion: "นี่คือสีอะไร?",
      thaiAnswer: `มันคือ${item.meaning}`
    };
  } else {
    // Default fallback based on vowel detection
    const isVowel = /^[aeiou]/i.test(wordLower);
    return {
      question: "What’s this?",
      answer: `It’s ${isVowel ? 'an' : 'a'} ${wordLower}.`,
      thaiQuestion: "นี่คืออะไร?",
      thaiAnswer: `มันคือ${item.meaning}`
    };
  }
}

// GENERATE MIDTERM QUESTIONS DYNAMICALLY
function generateMidtermQuestions() {
  const list = [];
  
  const unit1 = VOCAB_UNITS.find(u => u.id === 'unit_1');
  const unit2 = VOCAB_UNITS.find(u => u.id === 'unit_2');
  
  const allWords = [...(unit1 ? unit1.words : []), ...(unit2 ? unit2.words : [])];
  
  // 1. Vocabulary Questions (10 questions)
  const vocabCandidates = allWords.filter(w => w.type !== 'command' && !['fine', 'great', 'color', 'shape'].includes(w.word.toLowerCase()));
  const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
  const shuffledVocab = shuffle(vocabCandidates);
  const vocabTargets = shuffledVocab.slice(0, 10);
  
  const vocabTypes = ['audio', 'audio', 'audio', 'visual_word', 'visual_word', 'visual_word', 'thai_image', 'thai_image', 'spelling_scrambled', 'spelling_scrambled'];
  const shuffledVocabTypes = shuffle(vocabTypes);
  
  for (let i = 0; i < 10; i++) {
    const targetWord = vocabTargets[i] || allWords[i % allWords.length];
    let type = shuffledVocabTypes[i];
    
    if (type === 'spelling_scrambled' && !isSpellable(targetWord)) {
      type = 'visual_word';
    }
    
    let options = [targetWord];
    let remaining = allWords.filter(w => w.word !== targetWord.word && w.type !== 'command');
    remaining = shuffle(remaining);
    
    for (let o = 0; o < 3; o++) {
      if (remaining[o]) options.push(remaining[o]);
    }
    options = shuffle(options);
    
    let skill = 'Visual Matching';
    if (type === 'audio') skill = 'Listening';
    else if (type === 'visual_word') skill = 'Word Recognition';
    else if (type === 'spelling_scrambled') skill = 'Spelling & Phonics';
    
    list.push({
      id: i + 1,
      type: type,
      targetWord: targetWord,
      options: options,
      skill: skill
    });
  }
  
  // 2. Phonics Questions (4 questions: B, P, C, G)
  const phonicsLetters = ['B', 'P', 'C', 'G'];
  phonicsLetters.forEach((letter, index) => {
    // Prefer words explicitly tagged for this phonics sound (e.g. Cat/Cup/Car for C),
    // so we never pick a same-letter-but-different-sound word like "Chair" (/tʃ/) or
    // "Circle" (/s/) as the example for the hard C sound being taught.
    let letterTargets = allWords.filter(w => {
      const firstChar = w.word.charAt(0).toUpperCase();
      return (w.phonicsLetter === letter || firstChar === letter) && w.type !== 'command';
    });
    const taggedTargets = letterTargets.filter(w => w.phonicsLetter === letter);
    if (taggedTargets.length > 0) {
      letterTargets = taggedTargets;
    }

    if (letterTargets.length === 0) {
      if (letter === 'B') letterTargets = [{ word: 'Bird', meaning: 'นก', image: '🐦' }];
      else if (letter === 'P') letterTargets = [{ word: 'Peach', meaning: 'ลูกพีช', image: '🍑' }];
      else if (letter === 'C') letterTargets = [{ word: 'Coat', meaning: 'เสื้อโค้ท', image: '🧥' }];
      else if (letter === 'G') letterTargets = [{ word: 'Girl', meaning: 'เด็กผู้หญิง', image: '👧' }];
    }
    
    const targetWord = shuffle(letterTargets)[0];
    
    const wrongLetters = phonicsLetters.filter(l => l !== letter);
    const wrongOptions = [];
    wrongLetters.forEach(wl => {
      const alternatives = allWords.filter(w => w.word.charAt(0).toUpperCase() === wl && w.type !== 'command');
      if (alternatives.length > 0) {
        wrongOptions.push(shuffle(alternatives)[0]);
      } else {
        if (wl === 'B') wrongOptions.push({ word: 'Bird', meaning: 'นก', image: '🐦' });
        else if (wl === 'P') wrongOptions.push({ word: 'Peach', meaning: 'ลูกพีช', image: '🍑' });
        else if (wl === 'C') wrongOptions.push({ word: 'Coat', meaning: 'เสื้อโค้ท', image: '🧥' });
        else if (wl === 'G') wrongOptions.push({ word: 'Girl', meaning: 'เด็กผู้หญิง', image: '👧' });
      }
    });
    
    let options = [
      { ...targetWord, isCorrect: true },
      ...wrongOptions.map(wo => ({ ...wo, isCorrect: false }))
    ];
    options = shuffle(options);
    
    list.push({
      id: 10 + index + 1,
      type: 'phonics_midterm',
      phonicsLetter: letter,
      targetWord: targetWord,
      options: options,
      skill: 'Spelling & Phonics'
    });
  });
  
  // 3. Grammar Questions (7 questions)
  for (let gIdx = 1; gIdx <= 7; gIdx++) {
    let options = [];
    let questionText = '';
    let thaiQuestionText = '';
    let targetWord = { word: 'Grammar', meaning: 'ไวยากรณ์', image: '📝' };
    
    if (gIdx === 1) {
      questionText = "What's your name?";
      thaiQuestionText = "คุณชื่ออะไรจ๊ะ?";
      targetWord = { word: 'Name', meaning: 'ชื่อ', image: '👦', explanation: '👦 เมื่อมีคนถามว่า "What’s your name?" (คุณชื่ออะไร?) เราตอบว่า "My name is ___." (ฉันชื่อ ___) จ้า' };
      options = [
        { text: "My name is Jenny.", isCorrect: true, word: 'Name', meaning: 'ชื่อ' },
        { text: "It’s a pencil.", isCorrect: false, word: 'Pencil', meaning: 'ดินสอ' },
        { text: "I’m fine.", isCorrect: false, word: 'Fine', meaning: 'สบายดี' },
        { text: "No, it isn't.", isCorrect: false, word: 'No', meaning: 'ไม่ใช่' }
      ];
    } else if (gIdx === 2) {
      questionText = "How are you?";
      thaiQuestionText = "คุณสบายดีไหมจ๊ะ?";
      targetWord = { word: 'Fine', meaning: 'สบายดี', image: '😊', explanation: '😊 เมื่อมีคนถามว่า "How are you?" (คุณสบายดีไหม?) เราตอบว่า "I’m fine." (ฉันสบายดี) จ้า' };
      options = [
        { text: "I’m fine.", isCorrect: true, word: 'Fine', meaning: 'สบายดี' },
        { text: "My name is Bobby.", isCorrect: false, word: 'Name', meaning: 'ชื่อ' },
        { text: "It’s red.", isCorrect: false, word: 'Red', meaning: 'สีแดง' },
        { text: "Yes, it is.", isCorrect: false, word: 'Yes', meaning: 'ใช่แล้ว' }
      ];
    } else if (gIdx === 3) {
      const colors = allWords.filter(w => w.isColor);
      const targetColor = shuffle(colors)[0] || { word: 'Blue', meaning: 'สีน้ำเงิน', image: '💙' };
      const wordLower = targetColor.word.toLowerCase();
      
      questionText = "What color is this?";
      thaiQuestionText = "นี่คือสีอะไรจ๊ะ?";
      targetWord = targetColor;
      
      const otherColors = colors.filter(c => c.word !== targetColor.word);
      const wrongC1 = otherColors[0] || { word: 'Red' };

      options = [
        { text: `It’s ${wordLower}.`, isCorrect: true, word: targetColor.word, meaning: targetColor.meaning, image: targetColor.image },
        { text: `It’s a ${wordLower}.`, isCorrect: false, word: targetColor.word, meaning: targetColor.meaning, image: targetColor.image },
        { text: `It’s a circle.`, isCorrect: false, word: 'Circle', meaning: 'วงกลม' },
        { text: `It’s ${wrongC1.word.toLowerCase()}.`, isCorrect: false, word: wrongC1.word, meaning: wrongC1.meaning }
      ];
    } else if (gIdx === 4) {
      const shapes = allWords.filter(w => w.isShape);
      const colors = allWords.filter(w => w.isColor);
      
      const targetShape = shuffle(shapes)[0] || { word: 'Circle', meaning: 'รูปวงกลม', image: '🔴' };
      // The shape picture is drawn in a fixed color, so the correct answer must be
      // that exact color — not a random one.
      const shapeColorWord = SHAPE_COLOR_MAP[targetShape.word.toLowerCase()] || 'red';
      const targetColor = colors.find(c => c.word.toLowerCase() === shapeColorWord)
        || { word: shapeColorWord, meaning: 'สีแดง' };

      questionText = `This is a ${targetShape.word.toLowerCase()}. It’s _______.`;
      thaiQuestionText = `นี่คือ${targetShape.meaning} มันมีสี_______`;

      targetWord = {
        word: targetShape.word,
        meaning: `${targetShape.meaning} ${targetColor.meaning}`,
        image: targetShape.image,
        explanation: `🎨 รูปนี้คือ${targetShape.meaning} มี${targetColor.meaning} เราพูดว่า "This is a ${targetShape.word.toLowerCase()}. It’s ${targetColor.word.toLowerCase()}." จ้า`
      };

      const otherColors = shuffle(colors.filter(c => c.word.toLowerCase() !== targetColor.word.toLowerCase()));

      options = [
        { text: targetColor.word.toLowerCase(), isCorrect: true, word: targetColor.word, meaning: targetColor.meaning },
        { text: otherColors[0] ? otherColors[0].word.toLowerCase() : 'blue', isCorrect: false, word: otherColors[0] ? otherColors[0].word : 'blue' },
        { text: otherColors[1] ? otherColors[1].word.toLowerCase() : 'green', isCorrect: false, word: otherColors[1] ? otherColors[1].word : 'green' },
        { text: targetShape.word.toLowerCase(), isCorrect: false, word: targetShape.word }
      ];
    } else if (gIdx === 5) {
      const nouns = allWords.filter(w => isConcreteNoun(w));
      const targetNoun = shuffle(nouns)[0] || { word: 'Book', meaning: 'หนังสือ', image: '📖' };
      const wordLower = targetNoun.word.toLowerCase();
      
      const isAn = ['eraser'].includes(wordLower) || /^[aeiou]/i.test(wordLower);
      questionText = `Is this ${isAn ? 'an' : 'a'} ${wordLower}?`;
      thaiQuestionText = `นี่คือ${targetNoun.meaning}ใช่ไหม?`;
      targetWord = targetNoun;
      
      options = [
        { text: "Yes, it is.", isCorrect: true, word: targetNoun.word, meaning: targetNoun.meaning, image: targetNoun.image },
        { text: "No, it isn't.", isCorrect: false, word: targetNoun.word, meaning: targetNoun.meaning, image: targetNoun.image },
        { text: "Yes, I am.", isCorrect: false, word: 'Yes', meaning: 'ใช่' },
        { text: "No, I'm not.", isCorrect: false, word: 'No', meaning: 'ไม่ใช่' }
      ];
    } else if (gIdx === 6) {
      const nouns = allWords.filter(w => isConcreteNoun(w));
      const targetNoun = shuffle(nouns)[0] || { word: 'Pencil', meaning: 'ดินสอ', image: '✏️' };
      const targetNounLower = targetNoun.word.toLowerCase();
      
      const otherNouns = nouns.filter(w => w.word.toLowerCase() !== targetNounLower);
      const wrongNoun = shuffle(otherNouns)[0] || { word: 'Desk', meaning: 'โต๊ะเรียน' };
      const wrongNounLower = wrongNoun.word.toLowerCase();
      
      const isAn = ['eraser'].includes(wrongNounLower) || /^[aeiou]/i.test(wrongNounLower);
      questionText = `Is this ${isAn ? 'an' : 'a'} ${wrongNounLower}?`;
      thaiQuestionText = `นี่คือ${wrongNoun.meaning}ใช่ไหม?`;
      targetWord = targetNoun;
      
      options = [
        { text: "No, it isn't.", isCorrect: true, word: targetNoun.word, meaning: targetNoun.meaning, image: targetNoun.image },
        { text: "Yes, it is.", isCorrect: false, word: targetNoun.word, meaning: targetNoun.meaning, image: targetNoun.image },
        { text: "Yes, I am.", isCorrect: false, word: 'Yes', meaning: 'ใช่' },
        { text: "No, I'm not.", isCorrect: false, word: 'No', meaning: 'ไม่ใช่' }
      ];
    } else if (gIdx === 7) {
      // Unit 1 core structure: "What's this? It's a / an ___" (article practice).
      const nouns = allWords.filter(w => isConcreteNoun(w));
      const targetNoun = shuffle(nouns)[0] || { word: 'Pen', meaning: 'ปากกา', image: '🖊️' };
      const wordLower = targetNoun.word.toLowerCase();
      const isAn = ['eraser'].includes(wordLower) || /^[aeiou]/i.test(wordLower);
      const correctArticle = isAn ? 'an' : 'a';

      questionText = "What’s this?";
      thaiQuestionText = "นี่คืออะไรจ๊ะ?";
      targetWord = {
        word: targetNoun.word,
        meaning: targetNoun.meaning,
        image: targetNoun.image,
        explanation: targetNoun.explanation
          || `🔤 รูปนี้คือ${targetNoun.meaning} เราตอบว่า "It’s ${correctArticle} ${wordLower}." (ใช้ "an" หน้าคำที่ขึ้นต้นด้วยเสียงสระ a e i o u, นอกนั้นใช้ "a") จ้า`
      };

      const otherNouns = shuffle(nouns.filter(w => w.word.toLowerCase() !== wordLower));
      const wrongNoun = otherNouns[0] || { word: 'Book', meaning: 'หนังสือ' };
      const wrongNounLower = wrongNoun.word.toLowerCase();
      const wrongNounIsAn = ['eraser'].includes(wrongNounLower) || /^[aeiou]/i.test(wrongNounLower);

      options = [
        { text: `It’s ${correctArticle} ${wordLower}.`, isCorrect: true, word: targetNoun.word, meaning: targetNoun.meaning, image: targetNoun.image },
        { text: `It’s ${isAn ? 'a' : 'an'} ${wordLower}.`, isCorrect: false, word: targetNoun.word, meaning: targetNoun.meaning, image: targetNoun.image },
        { text: `It’s ${wrongNounIsAn ? 'an' : 'a'} ${wrongNounLower}.`, isCorrect: false, word: wrongNoun.word, meaning: wrongNoun.meaning },
        { text: "I’m fine.", isCorrect: false, word: 'Fine', meaning: 'สบายดี' }
      ];
    }

    options = shuffle(options);
    
    list.push({
      id: 14 + gIdx,
      type: 'grammar_midterm',
      targetWord: targetWord,
      questionText: questionText,
      thaiQuestionText: thaiQuestionText,
      options: options,
      skill: 'Sentence Q&A'
    });
  }
  
  return list;
}

// GENERATE CHALLENGE QUESTIONS DYNAMICALLY
function generateQuestions() {
  if (currentUnitId === 'midterm_prep') {
    return generateMidtermQuestions();
  }
  
  const targets = selectTargetWords();
  const list = [];
  
  // Dynamically assign question types based on count
  const typesPool = selectedGameMode === 'qa'
    ? ['sentence_qa']
    : ['audio', 'visual_word', 'thai_image', 'spelling_scrambled', 'sentence_qa', 'grammar_an'];
    
  const questionTypes = [];
  for (let i = 0; i < quizQuestionCount; i++) {
    questionTypes.push(typesPool[i % typesPool.length]);
  }
  // Shuffle to randomize types (only if not QA mode since QA has only 1 type)
  if (selectedGameMode !== 'qa') {
    questionTypes.sort(() => Math.random() - 0.5);
  }
  
  for (let i = 0; i < quizQuestionCount; i++) {
    const targetWord = targets[i] || VOCAB_LIST[i % VOCAB_LIST.length];
    let type = questionTypes[i];

    // Don't ask young learners to spell phrases, commands, or long words —
    // fall back to picking the written word from the picture instead.
    if (type === 'spelling_scrambled' && !isSpellable(targetWord)) {
      type = 'visual_word';
    }

    if (type === 'grammar_an') {
      // We only choose words that are concrete, picturable nouns
      let targetNoun = targetWord;
      if (!isConcreteNoun(targetNoun)) {
        targetNoun = VOCAB_LIST.find(isConcreteNoun) || targetWord;
      }

      const wordLower = targetNoun.word.toLowerCase();
      const isAn = ['eraser'].includes(wordLower) || /^[aeiou]/i.test(wordLower);

      const correctText = `It’s ${isAn ? 'an' : 'a'} ${wordLower}.`;
      const incorrectArticleText = `It’s ${isAn ? 'a' : 'an'} ${wordLower}.`;

      const otherNouns = VOCAB_LIST.filter(w => w.word.toLowerCase() !== wordLower && isConcreteNoun(w));
      otherNouns.sort(() => Math.random() - 0.5);

      const incorrectNoun1 = otherNouns[0] || { word: 'Pen', meaning: 'ปากกา', image: '🖊️' };
      const incorrectNoun2 = otherNouns[1] || { word: 'Pencil', meaning: 'ดินสอ', image: '✏️' };
      
      const isAn1 = ['eraser'].includes(incorrectNoun1.word.toLowerCase()) || /^[aeiou]/i.test(incorrectNoun1.word.toLowerCase());
      const isAn2 = ['eraser'].includes(incorrectNoun2.word.toLowerCase()) || /^[aeiou]/i.test(incorrectNoun2.word.toLowerCase());
      
      const options = [
        { isCorrect: true, text: correctText, word: targetNoun.word, meaning: targetNoun.meaning, image: targetNoun.image },
        { isCorrect: false, text: incorrectArticleText, word: targetNoun.word, meaning: targetNoun.meaning, image: targetNoun.image },
        { isCorrect: false, text: `It’s ${isAn1 ? 'an' : 'a'} ${incorrectNoun1.word.toLowerCase()}.`, word: incorrectNoun1.word, meaning: incorrectNoun1.meaning, image: incorrectNoun1.image },
        { isCorrect: false, text: `It’s ${isAn2 ? 'an' : 'a'} ${incorrectNoun2.word.toLowerCase()}.`, word: incorrectNoun2.word, meaning: incorrectNoun2.meaning, image: incorrectNoun2.image }
      ];
      
      options.sort(() => Math.random() - 0.5);
      
      list.push({
        id: i + 1,
        type: 'grammar_an',
        targetWord: targetNoun,
        options: options,
        skill: 'Sentence Q&A'
      });
      continue;
    }
    
    if (type === 'sentence_qa') {
      // 50% chance to make it a Yes/No question
      const isYesNo = Math.random() < 0.5;
      const targetWordLower = targetWord.word.toLowerCase();

      // Yes/No "Is this a ___?" questions only make sense for concrete countable nouns
      if (isYesNo && isConcreteNoun(targetWord)) {
        const isYes = Math.random() < 0.5;
        let questionText = '';
        let thaiQuestionText = '';
        let correctAnswerText = '';
        let correctThaiText = '';
        let wrongAnswers = [];
        
        if (isYes) {
          if (['yellow', 'blue', 'red', 'green', 'purple', 'orange', 'brown', 'pink', 'black', 'white'].includes(targetWordLower)) {
            questionText = `Is this ${targetWordLower}?`;
            thaiQuestionText = `นี่คือ${targetWord.meaning}ใช่ไหม?`;
          } else {
            const isAn = ['eraser'].includes(targetWordLower) || /^[aeiou]/i.test(targetWordLower);
            questionText = `Is this ${isAn ? 'an' : 'a'} ${targetWordLower}?`;
            thaiQuestionText = `นี่คือ${targetWord.meaning}ใช่ไหม?`;
          }
          correctAnswerText = "Yes, it is.";
          correctThaiText = "ใช่แล้วจ้า";
          wrongAnswers = [
            { text: "No, it isn't.", thaiText: "ไม่ใช่จ้า", isCorrect: false },
            { text: "Yes, I am.", thaiText: "ใช่ ฉันเอง", isCorrect: false },
            { text: "No, I'm not.", thaiText: "ไม่ใช่ ฉันไม่ใช่", isCorrect: false }
          ];
        } else {
          // Choose a different noun for the question (image stays the target)
          const otherNouns = VOCAB_LIST.filter(w => w.word.toLowerCase() !== targetWordLower && isConcreteNoun(w));
          const wrongWordObj = otherNouns[Math.floor(Math.random() * otherNouns.length)] || { word: 'Book', meaning: 'หนังสือ' };
          const wrongWordLower = wrongWordObj.word.toLowerCase();
          
          if (['yellow', 'blue', 'red', 'green', 'purple', 'orange', 'brown', 'pink', 'black', 'white'].includes(wrongWordLower)) {
            questionText = `Is this ${wrongWordLower}?`;
            thaiQuestionText = `นี่คือ${wrongWordObj.meaning}ใช่ไหม?`;
          } else {
            const isAn = ['eraser'].includes(wrongWordLower) || /^[aeiou]/i.test(wrongWordLower);
            questionText = `Is this ${isAn ? 'an' : 'a'} ${wrongWordLower}?`;
            thaiQuestionText = `นี่คือ${wrongWordObj.meaning}ใช่ไหม?`;
          }
          correctAnswerText = "No, it isn't.";
          correctThaiText = "ไม่ใช่จ้า";
          wrongAnswers = [
            { text: "Yes, it is.", thaiText: "ใช่แล้วจ้า", isCorrect: false },
            { text: "Yes, I am.", thaiText: "ใช่ ฉันเอง", isCorrect: false },
            { text: "No, I'm not.", thaiText: "ไม่ใช่ ฉันไม่ใช่", isCorrect: false }
          ];
        }
        
        const options = [
          { text: correctAnswerText, thaiText: correctThaiText, isCorrect: true, word: targetWord.word, meaning: targetWord.meaning, image: targetWord.image },
          ...wrongAnswers.map(wa => ({ ...wa, word: targetWord.word, meaning: targetWord.meaning, image: targetWord.image }))
        ];
        options.sort(() => Math.random() - 0.5);
        
        list.push({
          id: i + 1,
          type: 'sentence_qa',
          isYesNo: true,
          targetWord: targetWord,
          questionText: questionText,
          thaiQuestionText: thaiQuestionText,
          options: options,
          skill: 'Sentence Q&A'
        });
        continue;
      }
    }
    
    // Generate options: correct word + 3 random ones
    let options = [targetWord];
    let remaining = VOCAB_LIST.filter(w => w.word !== targetWord.word);
    
    // Shuffle remaining and take 3
    remaining.sort(() => Math.random() - 0.5);
    for (let o = 0; o < 3; o++) {
      if (remaining[o]) {
        options.push(remaining[o]);
      }
    }
    
    // Shuffle final options
    options.sort(() => Math.random() - 0.5);
    
    // Skill categorization
    let skill = '';
    if (type === 'audio') skill = 'Listening';
    else if (type === 'visual_word') skill = 'Word Recognition';
    else if (type === 'spelling_scrambled') skill = 'Spelling & Phonics';
    else if (type === 'sentence_qa') skill = 'Sentence Q&A';
    else skill = 'Visual Matching';
    
    list.push({
      id: i + 1,
      type: type,
      targetWord: targetWord,
      options: options,
      skill: skill
    });
  }
  
  return list;
}

// START NEW GAME CHALLENGE
function startNewChallenge() {
  clearTransitionTimeout();
  hasCompletedAssessment = false;
  
  // Generate questions and reset arrays
  challengeQuestions = generateQuestions();
  userAnswers = new Array(challengeQuestions.length).fill(null);
  questionTimeSpent = new Array(challengeQuestions.length).fill(0);
  currentQuestionIndex = 0;
  gameTotalSeconds = 0;
  questionStartTime = null;

  // Bug #3 Fix: Clear any existing timer before starting a new one
  if (gameTimerInterval) {
    clearInterval(gameTimerInterval);
    gameTimerInterval = null;
  }

  // Start clock
  startTimer();

  // Render first question
  renderQuestion(0);

  // Update view if not already game panel
  if (activeTab !== 'game') {
    switchTab('game');
  }
}

// TIMER ENGINE
function startTimer() {
  questionStartTime = Date.now();
  gameTimerInterval = setInterval(() => {
    gameTotalSeconds++;
    
    // Render timer display
    const mm = Math.floor(gameTotalSeconds / 60).toString().padStart(2, '0');
    const ss = (gameTotalSeconds % 60).toString().padStart(2, '0');
    nodes.liveTimer.textContent = `⏱️ ${mm}:${ss}`;
    
  }, 1000);
}

function pauseTimer() {
  if (gameTimerInterval) {
    clearInterval(gameTimerInterval);
    gameTimerInterval = null;
  }
  saveCurrentQuestionTime();
}

function resumeTimer() {
  if (!gameTimerInterval && challengeQuestions.length > 0 && !hasCompletedAssessment) {
    questionStartTime = Date.now();
    startTimer();
  }
}

function saveCurrentQuestionTime() {
  if (questionStartTime !== null && challengeQuestions.length > 0 && currentQuestionIndex < challengeQuestions.length) {
    const elapsed = Math.round((Date.now() - questionStartTime) / 1000);
    questionTimeSpent[currentQuestionIndex] += elapsed;
    questionStartTime = Date.now();
  }
}

// RENDER GAME QUESTION
function renderQuestion(index) {
  clearTransitionTimeout();
  stopAllSpeech();
  
  saveCurrentQuestionTime();
  currentQuestionIndex = index;
  
  if (nodes.btnSkip) {
    nodes.btnSkip.disabled = false;
  }
  
  const q = challengeQuestions[index];
  
  // Reset box styles
  nodes.gameBox.className = 'game-box';
  nodes.feedback.innerHTML = '';
  
  // Update counter & progress bar
  nodes.currentNum.textContent = index + 1;
  const tracker = document.querySelector('.game-tracker');
  if (tracker) {
    tracker.innerHTML = `ภารกิจข้อที่ <span id="current-game-num" class="text-highlight">${index + 1}</span> จาก ${challengeQuestions.length} ข้อ`;
  }
  const percent = ((index + 1) / challengeQuestions.length) * 100;
  nodes.progressBar.style.width = `${percent}%`;
  
  // Clear layout areas and reset grid class to default
  nodes.optionsGrid.className = 'options-grid';
  nodes.questionArea.innerHTML = '';
  nodes.optionsGrid.innerHTML = '';
  
  // Render based on type
  if (q.type === 'audio') {
    nodes.gameModeTitle.innerHTML = '🎧 ภารกิจ: ฟังเสียงแล้วจิ้มรูปภาพให้ถูกตัว!';
    
    // Play button
    nodes.questionArea.innerHTML = `
      <button class="play-btn" id="btn-play-sound">🔊 ฟังเสียงอีกครั้ง</button>
      <div class="question-visual" style="margin-left: 20px;">❓</div>
    `;
    
    document.getElementById('btn-play-sound').addEventListener('click', () => {
      stopAllSpeech();
      speakEN(q.targetWord.word);
    });
    
    // Auto speak sound initially after short pause
    setTimeout(() => {
      if (activeTab === 'game' && currentQuestionIndex === index) {
        speakEN(q.targetWord.word, 0.8);
      }
    }, 400);
    
    // Options: Pictures + Thai meaning
    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.innerHTML = `
        <div class="option-img">${opt.image}</div>
        <div class="option-label">${opt.meaning}</div>
      `;
      btn.onclick = () => selectOption(opt);
      nodes.optionsGrid.appendChild(btn);
    });
    
  } else if (q.type === 'visual_word') {
    nodes.gameModeTitle.innerHTML = '✏️ ภารกิจ: ดูภาพแล้วเลือกคำศัพท์ที่ถูกต้อง!';
    
    // Show image + meaning
    nodes.questionArea.innerHTML = `
      <div class="question-visual">${q.targetWord.image}</div>
      <div class="question-hint" style="font-size: 1rem; color: var(--text-muted); margin-top: 8px;">${q.targetWord.meaning}</div>
    `;
    
    // Options: English words
    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.innerHTML = `<div class="option-word-only">${opt.word}</div>`;
      btn.onclick = () => selectOption(opt);
      nodes.optionsGrid.appendChild(btn);
    });
    
  } else if (q.type === 'spelling_scrambled') {
    // ======== NEW: SPELLING SCRAMBLED ========
    nodes.gameModeTitle.innerHTML = '🔤 ภารกิจ: ดูภาพแล้วเรียงตัวอักษรสะกดคำให้ถูกต้อง!';
    
    nodes.questionArea.innerHTML = `
      <div class="question-visual">${q.targetWord.image}</div>
      <div class="question-hint" style="font-size: 1rem; color: var(--text-muted); margin-top: 8px;">${q.targetWord.meaning}</div>
    `;
    
    // Auto speak the word so kids hear it
    setTimeout(() => {
      if (activeTab === 'game' && currentQuestionIndex === index) {
        speakEN(q.targetWord.word, 0.7);
      }
    }, 500);
    
    const correctWord = q.targetWord.word;
    const correctLetters = correctWord.split('').filter(c => c !== ' ');
    const scrambled = correctLetters.sort(() => Math.random() - 0.5);
    
    let selectedLetters = [];
    
    // Build answer slots
    const slotsContainer = document.createElement('div');
    slotsContainer.className = 'spelling-slots-container';
    for (let i = 0; i < correctWord.length; i++) {
      const slot = document.createElement('div');
      if (correctWord[i] === ' ') {
        slot.className = 'spelling-slot-space';
        slot.innerHTML = '&nbsp;';
        slot.dataset.isSpace = 'true';
      } else {
        slot.className = 'spelling-slot';
        slot.dataset.index = i;
      }
      slotsContainer.appendChild(slot);
    }
    
    // Build scrambled letter buttons
    const lettersContainer = document.createElement('div');
    lettersContainer.className = 'scrambled-letters-container';
    
    let undoBtn; // Declare undoBtn early so it can be referenced inside the event listener
    
    scrambled.forEach((letter, idx) => {
      const btn = document.createElement('button');
      btn.className = 'letter-btn';
      btn.textContent = letter;
      btn.dataset.originalIndex = idx;
      btn.addEventListener('click', () => {
        if (btn.disabled) return;

        selectedLetters.push({ letter, btnEl: btn });
        btn.disabled = true;

        // Find the next non-space unfilled slot
        const unfilledSlots = Array.from(slotsContainer.children).filter(slot => !slot.dataset.isSpace && !slot.classList.contains('filled'));
        if (unfilledSlots.length > 0) {
          const targetSlot = unfilledSlots[0];
          targetSlot.textContent = letter;
          targetSlot.classList.add('filled');
        }

        // Always speak the letter immediately
        speakEN(letter.toLowerCase(), 0.55);

        // Check answer when all actual letters placed
        if (selectedLetters.length === correctLetters.length) {
          if (undoBtn) undoBtn.disabled = true;
          // Build full word including spaces from slots to check
          const spelled = Array.from(slotsContainer.children).map(slot => {
            if (slot.dataset.isSpace) return ' ';
            return slot.textContent;
          }).join('');
          
          // Delay check to allow the last letter voice to play completely
          setTimeout(() => {
            selectOption({ word: spelled, meaning: q.targetWord.meaning, image: q.targetWord.image });
          }, 600);
        }
      });
      lettersContainer.appendChild(btn);
    });
    
    // Undo button
    undoBtn = document.createElement('button');
    undoBtn.className = 'play-btn';
    undoBtn.style.cssText = 'margin-top:10px; padding:6px 16px; font-size:0.85rem;';
    undoBtn.innerHTML = '↩️ ลบตัวสุดท้าย';
    undoBtn.addEventListener('click', () => {
      if (selectedLetters.length === 0) return;
      const last = selectedLetters.pop();
      last.btnEl.disabled = false;

      // Find the last filled non-space slot and clear it
      const filledSlots = Array.from(slotsContainer.children).filter(slot => !slot.dataset.isSpace && slot.classList.contains('filled'));
      if (filledSlots.length > 0) {
        const lastFilledSlot = filledSlots[filledSlots.length - 1];
        lastFilledSlot.textContent = '';
        lastFilledSlot.classList.remove('filled');
      }
    });
    
    // Listen again button
    const listenBtn = document.createElement('button');
    listenBtn.className = 'play-btn';
    listenBtn.style.cssText = 'margin-top:10px; padding:6px 16px; font-size:0.85rem; margin-left:8px;';
    listenBtn.innerHTML = '🔊 ฟังเสียงอีกครั้ง';
    listenBtn.addEventListener('click', () => {
      stopAllSpeech();
      speakEN(q.targetWord.word, 0.7);
    });
    
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex; gap:8px; justify-content:center; flex-wrap:wrap;';
    btnRow.appendChild(undoBtn);
    btnRow.appendChild(listenBtn);
    
    nodes.optionsGrid.appendChild(slotsContainer);
    nodes.optionsGrid.appendChild(lettersContainer);
    nodes.optionsGrid.appendChild(btnRow);
    
  } else if (q.type === 'thai_image') {
    nodes.gameModeTitle.innerHTML = '🧩 ภารกิจ: ดูคำภาษาไทยแล้วเลือกรูปภาพให้ถูกต้อง!';
    
    // Show Thai word
    nodes.questionArea.innerHTML = `<div class="question-visual" style="font-size: 3rem; font-weight: 800; color: #1e3a8a;">${q.targetWord.meaning}</div>`;
    
    setTimeout(() => {
      if (activeTab === 'game' && currentQuestionIndex === index) {
        speakTH(q.targetWord.meaning);
      }
    }, 400);
    
    // Options: Pictures + English words
    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.innerHTML = `
        <div class="option-img">${opt.image}</div>
        <div class="option-word-only" style="font-size: 1.2rem;">${opt.word}</div>
      `;
      btn.onclick = () => selectOption(opt);
      nodes.optionsGrid.appendChild(btn);
    });
  } else if (q.type === 'sentence_qa') {
    nodes.gameModeTitle.innerHTML = q.isYesNo 
      ? '💬 ภารกิจ: ตอบคำถาม Yes, it is. / No, it isn’t. ให้ถูกต้อง!'
      : '💬 ภารกิจ: คุยภาษาอังกฤษถาม-ตอบประโยคสนทนากันเถอะ!';
    
    const qaQuestion = q.isYesNo ? q.questionText : getSentenceQA(q.targetWord).question;
    const qaThaiQuestion = q.isYesNo ? q.thaiQuestionText : getSentenceQA(q.targetWord).thaiQuestion;
    
    // UI Layout: Image + Chat Game Container
    nodes.questionArea.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; width:100%;">
        <div class="question-visual" style="height:100px; font-size:75px; margin: 5px 0;">${q.targetWord.image}</div>
        <div class="chat-game-container">
          <div class="chat-row teacher-row">
            <div class="chat-avatar">👩‍🏫</div>
            <div class="chat-bubble teacher-bubble">
              ${qaQuestion}
              <button class="chat-speak-btn" type="button" id="btn-speak-question" title="ฟังคุณครูพูด">🔊</button>
              <div class="chat-translation">${qaThaiQuestion}</div>
            </div>
          </div>
          <div class="chat-row student-row">
            <div class="chat-bubble student-bubble empty-bubble" id="student-chat-bubble">
              ....................
            </div>
            <div class="chat-avatar">👦</div>
          </div>
        </div>
      </div>
    `;
    
    // Play Speak Event Listener
    document.getElementById('btn-speak-question').addEventListener('click', (e) => {
      e.stopPropagation();
      stopAllSpeech();
      speakEN(qaQuestion);
    });
    
    // Auto speak question
    setTimeout(() => {
      if (activeTab === 'game' && currentQuestionIndex === index) {
        speakEN(qaQuestion, 0.85);
      }
    }, 500);
    
    // Options grid: display as full sentences (one column)
    nodes.optionsGrid.className = 'options-grid sentence-options';
    
    q.options.forEach((opt, optIdx) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      
      const optText = q.isYesNo ? opt.text : getSentenceQA(opt).answer;
      const optThaiText = q.isYesNo ? opt.thaiText : getSentenceQA(opt).thaiAnswer;
      
      btn.innerHTML = `
        <span style="font-size:1.3rem; font-weight:bold; margin-right:12px; color:var(--primary-dark);">${String.fromCharCode(65 + optIdx)}.</span>
        <span class="option-word-only" style="font-size: 1.15rem; font-weight: 700;">${optText}</span>
      `;
      
      btn.onclick = () => {
        // Update student chat bubble
        const studentBubble = document.getElementById('student-chat-bubble');
        if (studentBubble) {
          studentBubble.classList.remove('empty-bubble');
          studentBubble.innerHTML = `
            ${optText}
            <div class="chat-translation">${optThaiText}</div>
          `;
        }
        selectOption(opt);
      };
      
      nodes.optionsGrid.appendChild(btn);
    });
  } else if (q.type === 'grammar_an') {
    nodes.gameModeTitle.innerHTML = '✏️ ภารกิจ: เลือกประโยคไวยากรณ์ (a / an) ที่ถูกต้อง!';
    
    // Show image + question
    nodes.questionArea.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; width:100%;">
        <div class="question-visual" style="font-size: 4.5rem; margin-bottom: 8px;">${q.targetWord.image}</div>
        <div style="font-size: 1.4rem; font-weight: 700; color: var(--dark-2); margin-bottom: 4px;">What’s this?</div>
        <div class="question-hint" style="font-size: 0.95rem; color: var(--text-muted); font-weight: 600;">(คำแปล: ${q.targetWord.meaning})</div>
      </div>
    `;
    
    // Auto speak question
    setTimeout(() => {
      if (activeTab === 'game' && currentQuestionIndex === index) {
        speakEN("What’s this?", 0.85);
      }
    }, 500);
    
    // Options grid: display as full sentences (one column)
    nodes.optionsGrid.className = 'options-grid sentence-options';
    
    q.options.forEach((opt, optIdx) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      
      btn.innerHTML = `
        <span style="font-size:1.3rem; font-weight:bold; margin-right:12px; color:var(--primary-dark);">${String.fromCharCode(65 + optIdx)}.</span>
        <span class="option-word-only" style="font-size: 1.15rem; font-weight: 700;">${opt.text}</span>
      `;
      
      btn.onclick = () => selectOption(opt);
      nodes.optionsGrid.appendChild(btn);
    });
  } else if (q.type === 'phonics_midterm') {
    nodes.gameModeTitle.innerHTML = '🔤 ภารกิจ Phonics: เลือกคำศัพท์ที่ขึ้นต้นด้วยเสียงตัวอักษร!';
    
    nodes.questionArea.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; width:100%;">
        <div class="question-visual" style="font-size: 5rem; margin-bottom: 8px;">❓</div>
        <div style="font-size: 1.4rem; font-weight: 700; color: var(--dark-2); margin-bottom: 4px; text-align: center; max-width: 90%;">Which word starts with the "${q.phonicsLetter.toLowerCase()}" sound?</div>
        <button class="play-btn" id="btn-speak-phonics" style="margin-top: 5px;">🔊 ฟังเสียงตัวอักษร</button>
      </div>
    `;
    
    const speakText = `Which word starts with the ${q.phonicsLetter.toLowerCase()} sound?`;
    document.getElementById('btn-speak-phonics').addEventListener('click', () => {
      stopAllSpeech();
      speakEN(speakText, 0.85);
    });
    
    setTimeout(() => {
      if (activeTab === 'game' && currentQuestionIndex === index) {
        speakEN(speakText, 0.85);
      }
    }, 500);
    
    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      
      const imgHtml = opt.image.startsWith('<svg') ? opt.image : `<div class="option-img">${opt.image}</div>`;
      btn.innerHTML = `
        ${imgHtml}
        <div class="option-word-only" style="font-size: 1.25rem; font-weight: 700; margin-top: 8px;">${opt.word}</div>
        <div class="option-label" style="font-size: 0.8rem; color: var(--text-muted);">${opt.meaning}</div>
      `;
      btn.onclick = () => selectOption(opt);
      nodes.optionsGrid.appendChild(btn);
    });
  } else if (q.type === 'grammar_midterm') {
    nodes.gameModeTitle.innerHTML = '💬 ภารกิจ: เติมบทสนทนาและตอบคำถามไวยากรณ์ให้ถูกต้อง!';
    
    const imgHtml = q.targetWord.image.startsWith('<svg') ? q.targetWord.image : `<div class="question-visual" style="height:100px; font-size:75px; margin: 5px 0;">${q.targetWord.image}</div>`;
    
    nodes.questionArea.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; width:100%;">
        ${imgHtml}
        <div class="chat-game-container" style="width: 100%; max-width: 450px; margin-top: 10px;">
          <div class="chat-row teacher-row" style="display: flex; gap: 8px; margin-bottom: 12px; justify-content: flex-start;">
            <div class="chat-avatar" style="font-size: 1.8rem;">👩‍🏫</div>
            <div class="chat-bubble teacher-bubble" style="background: #f1f5f9; border: 1.5px solid #cbd5e1; padding: 10px 14px; border-radius: 18px 18px 18px 4px; font-size: 1.05rem; font-weight: 700; color: var(--dark-3); position: relative;">
              ${q.questionText}
              <button class="chat-speak-btn" type="button" id="btn-speak-question" title="ฟังคุณครูพูด" style="background: none; border: none; font-size: 1.1rem; cursor: pointer; margin-left: 6px; padding: 0; vertical-align: middle;">🔊</button>
              <div class="chat-translation" style="font-size: 0.82rem; color: var(--text-muted); font-weight: 500; margin-top: 4px;">(${q.thaiQuestionText})</div>
            </div>
          </div>
          <div class="chat-row student-row" style="display: flex; gap: 8px; justify-content: flex-end;">
            <div class="chat-bubble student-bubble empty-bubble" id="student-chat-bubble" style="background: #fff; border: 2px dashed #cbd5e1; padding: 10px 14px; border-radius: 18px 18px 4px 18px; font-size: 1.05rem; font-weight: 700; color: var(--text-muted);">
              ....................
            </div>
            <div class="chat-avatar" style="font-size: 1.8rem;">👦</div>
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('btn-speak-question').addEventListener('click', (e) => {
      e.stopPropagation();
      stopAllSpeech();
      speakEN(q.questionText, 0.85);
    });
    
    setTimeout(() => {
      if (activeTab === 'game' && currentQuestionIndex === index) {
        speakEN(q.questionText, 0.85);
      }
    }, 500);
    
    nodes.optionsGrid.className = 'options-grid sentence-options';
    
    q.options.forEach((opt, optIdx) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      
      btn.innerHTML = `
        <span style="font-size:1.3rem; font-weight:bold; margin-right:12px; color:var(--primary-dark);">${String.fromCharCode(65 + optIdx)}.</span>
        <span class="option-word-only" style="font-size: 1.12rem; font-weight: 700;">${opt.text}</span>
      `;
      
      btn.onclick = () => {
        const studentBubble = document.getElementById('student-chat-bubble');
        if (studentBubble) {
          studentBubble.className = 'chat-bubble student-bubble';
          studentBubble.style.cssText = 'background: var(--primary-light); border: 1.5px solid var(--primary); padding: 10px 14px; border-radius: 18px 18px 4px 18px; font-size: 1.05rem; font-weight: 700; color: var(--primary-hover);';
          studentBubble.innerHTML = opt.text;
        }
        selectOption(opt);
      };
      
      nodes.optionsGrid.appendChild(btn);
    });
  }
}

// Play feedback sounds after stopAllSpeech — handles Chrome's post-cancel delay
function playFeedbackSounds(utterances) {
  if (!utterances.length || !('speechSynthesis' in window)) return;
  const doSpeak = () => {
    window.speechSynthesis.resume();
    utterances.forEach(u => window.speechSynthesis.speak(u));
    startSpeechKeepAlive();
  };
  const sinceCancel = Date.now() - lastCancelTime;
  if (sinceCancel < 200) {
    setTimeout(doSpeak, 80);
  } else {
    doSpeak();
  }
}

// SELECT ANSWER OPTION
function selectOption(selectedOpt) {
  // Disable options grid to prevent double-clicks
  const optionBtns = nodes.optionsGrid.querySelectorAll('.option-btn');
  optionBtns.forEach(btn => btn.disabled = true);
  // Also disable letter buttons for spelling mode
  const letterBtns = nodes.optionsGrid.querySelectorAll('.letter-btn');
  letterBtns.forEach(btn => btn.disabled = true);
  // Also disable play/control buttons (Undo, Listen) for spelling mode
  const playBtns = nodes.optionsGrid.querySelectorAll('.play-btn');
  playBtns.forEach(btn => btn.disabled = true);
  
  // Disable skip button during feedback
  if (nodes.btnSkip) {
    nodes.btnSkip.disabled = true;
  }
  
  const isCorrect = selectedOpt.hasOwnProperty('isCorrect')
    ? selectedOpt.isCorrect
    : (selectedOpt.word.toLowerCase() === challengeQuestions[currentQuestionIndex].targetWord.word.toLowerCase());
  
  // Record choice
  userAnswers[currentQuestionIndex] = selectedOpt;
  
  // Reset classes
  nodes.gameBox.className = 'game-box';
  void nodes.gameBox.offsetWidth; // reflow
  
  const q = challengeQuestions[currentQuestionIndex];

  if (isCorrect) {
    nodes.gameBox.classList.add('success-bounce');
    nodes.feedback.innerHTML = '<span class="correct">🎉 ถูกต้องแล้วจ้า เก่งที่สุดเลย!</span>';

    const feedbackUtterances = [makeUtterance('เก่งมากค่ะ', 'th-TH', 1)];
    if (q.type === 'sentence_qa') {
      if (q.isYesNo) {
        const correctOpt = q.options.find(o => o.isCorrect);
        feedbackUtterances.push(makeUtterance(correctOpt.text, 'en-US', 0.8));
        feedbackUtterances.push(makeUtterance(correctOpt.thaiText, 'th-TH', 1));
      } else {
        const qaData = getSentenceQA(q.targetWord);
        feedbackUtterances.push(makeUtterance(qaData.answer, 'en-US', 0.8));
        feedbackUtterances.push(makeUtterance(qaData.thaiAnswer, 'th-TH', 1));
      }
    } else if (q.type === 'grammar_an' || q.type === 'grammar_midterm') {
      const correctOpt = q.options.find(o => o.isCorrect);
      if (correctOpt) {
        feedbackUtterances.push(makeUtterance(correctOpt.text, 'en-US', 0.8));
      }
    } else if (q.type !== 'audio') {
      feedbackUtterances.push(makeUtterance(q.targetWord.word, 'en-US', 0.8));
    }
    stopAllSpeech();
    playFeedbackSounds(feedbackUtterances);
  } else {
    nodes.gameBox.classList.add('shake');
    
    if (q.type === 'sentence_qa') {
      if (q.isYesNo) {
        const correctOpt = q.options.find(o => o.isCorrect);
        nodes.feedback.innerHTML = `<span class="wrong">❌ อ๊ะ.. ประโยคที่ถูกคือ <strong>${correctOpt.text}</strong> (${correctOpt.thaiText})</span>`;
        
        stopAllSpeech();
        playFeedbackSounds([
          makeUtterance('ลองใหม่อีกทีนะจ๊ะ', 'th-TH', 1),
          makeUtterance(correctOpt.text, 'en-US', 0.8),
          makeUtterance(correctOpt.thaiText, 'th-TH', 1)
        ]);
      } else {
        const qaData = getSentenceQA(q.targetWord);
        nodes.feedback.innerHTML = `<span class="wrong">❌ อ๊ะ.. ประโยคที่ถูกคือ <strong>${qaData.answer}</strong> (${qaData.thaiAnswer})</span>`;
        
        stopAllSpeech();
        playFeedbackSounds([
          makeUtterance('ลองใหม่อีกทีนะจ๊ะ', 'th-TH', 1),
          makeUtterance(qaData.answer, 'en-US', 0.8),
          makeUtterance(qaData.thaiAnswer, 'th-TH', 1)
        ]);
      }
    } else if (q.type === 'grammar_an' || q.type === 'grammar_midterm') {
      const correctOpt = q.options.find(o => o.isCorrect);
      nodes.feedback.innerHTML = `<span class="wrong">❌ อ๊ะ.. ประโยคที่ถูกคือ <strong>${correctOpt.text}</strong></span>`;
      
      stopAllSpeech();
      playFeedbackSounds([
        makeUtterance('ลองใหม่อีกทีนะจ๊ะ', 'th-TH', 1),
        makeUtterance(correctOpt.text, 'en-US', 0.8)
      ]);
    } else {
      nodes.feedback.innerHTML = `<span class="wrong">❌ อ๊ะ.. คำตอบที่ถูกคือ <strong>${q.targetWord.word}</strong> (${q.targetWord.meaning}) ลองพยายามใหม่ข้อถัดไปนะ</span>`;
      
      stopAllSpeech();
      playFeedbackSounds([makeUtterance('ลองใหม่อีกทีนะจ๊ะ', 'th-TH', 1)]);
    }
  }
  
  // Progress to next question or submit after 2 seconds
  questionTransitionTimeout = setTimeout(() => {
    questionTransitionTimeout = null;
    if (currentQuestionIndex < challengeQuestions.length - 1) {
      renderQuestion(currentQuestionIndex + 1);
    } else {
      submitAssessment();
    }
  }, 2000);
}

// SKIP QUESTION
function skipQuestion() {
  clearTransitionTimeout();
  stopAllSpeech();
  userAnswers[currentQuestionIndex] = null; // Mark as skipped
  
  if (currentQuestionIndex < challengeQuestions.length - 1) {
    renderQuestion(currentQuestionIndex + 1);
  } else {
    submitAssessment();
  }
}

// SUBMIT QUIZ ASSESSMENT & COMPLETE
function submitAssessment() {
  pauseTimer();
  
  hasCompletedAssessment = true;
  
  // Calculate raw scores for single mode
  let correctCount = 0;
  let skippedCount = 0;
  
  // Skills tracking (dynamic) — now includes Spelling, Phonics & Sentence Q&A
  const skills = {
    Listening: { total: 0, correct: 0 },
    "Word Recognition": { total: 0, correct: 0 },
    "Visual Matching": { total: 0, correct: 0 },
    "Spelling & Phonics": { total: 0, correct: 0 },
    "Sentence Q&A": { total: 0, correct: 0 }
  };
  
  const weakWordsToSave = getWeakWordList();
  
  challengeQuestions.forEach((q, idx) => {
    const ans = userAnswers[idx];
    const skill = q.skill;
    const wordText = q.targetWord.word;
    
    if (!skills[skill]) {
      skills[skill] = { total: 0, correct: 0 };
    }
    skills[skill].total++;
    
    if (ans === null) {
      skippedCount++;
      if (!weakWordsToSave.includes(wordText)) {
        weakWordsToSave.push(wordText);
      }
    } else if (ans.hasOwnProperty('isCorrect') ? ans.isCorrect : (ans.word.toLowerCase() === q.targetWord.word.toLowerCase())) {
      correctCount++;
      skills[skill].correct++;
      const index = weakWordsToSave.indexOf(wordText);
      if (index > -1) {
        weakWordsToSave.splice(index, 1);
      }
    } else {
      if (!weakWordsToSave.includes(wordText)) {
        weakWordsToSave.push(wordText);
      }
    }
  });
  
  saveWeakWordList(weakWordsToSave);
  
  // Base 500 Score (dynamic division)
  const scaledScore = Math.round((correctCount / challengeQuestions.length) * 500);
  const totalSecondsSpent = questionTimeSpent.reduce((a, b) => a + b, 0);
  
  // Calculate Stars for this attempt (percentage-based so it works for any quiz length)
  const starsEarned = calculateStarsEarned(correctCount, challengeQuestions.length);

  // Add to total stars
  let finalStarsEarned = starsEarned;
  if (currentUnitId === 'midterm_prep') {
    finalStarsEarned += 20; // โบนัสเพิ่ม 20 ดาวพิเศษสำหรับการจำลองสอบกลางภาค ป.1!
  }
  addStars(finalStarsEarned);
  
  // Save to localStorage history database
  saveHistory(scaledScore, totalSecondsSpent);

  // Persist a review snapshot so the detailed review works after a reload
  saveReviewSnapshot();

  // Jump directly to dashboard
  switchTab('dashboard');
  
  // Trigger celebration speak and confetti
  setTimeout(() => {
    celebrateQuizResult(correctCount, starsEarned);
  }, 300);
}

// LOCAL STORAGE PERSISTENCE
function getHistory() {
  const data = localStorage.getItem(`${STORAGE_KEY}_${currentUnitId}`);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('History parse error', e);
    return [];
  }
}

function saveHistory(score, duration) {
  const history = getHistory();
  const finalTestBtn = document.getElementById('quiz-length-final');
  const isFinal = (finalTestBtn && finalTestBtn.classList.contains('active')) || challengeQuestions.length > 10;
  const attempt = {
    score: score,
    date: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
    duration: duration,
    timestamp: Date.now(),
    questionsCount: challengeQuestions.length,
    isFinalTest: isFinal
  };
  history.push(attempt);
  try {
    localStorage.setItem(`${STORAGE_KEY}_${currentUnitId}`, JSON.stringify(history));
  } catch (e) {
    console.error('History save error', e);
  }
}

// Persist the latest attempt's questions + answers so the detailed review
// survives a page reload (challengeQuestions/userAnswers live only in memory).
const REVIEW_SNAPSHOT_KEY = 'aura_kids_last_review_v1';

function saveReviewSnapshot() {
  if (challengeQuestions.length === 0) return;
  try {
    const snapshot = { questions: challengeQuestions, answers: userAnswers };
    localStorage.setItem(`${REVIEW_SNAPSHOT_KEY}_${currentUnitId}`, JSON.stringify(snapshot));
  } catch (e) {
    console.error('Review snapshot save error', e);
  }
}

function getReviewSnapshot() {
  const data = localStorage.getItem(`${REVIEW_SNAPSHOT_KEY}_${currentUnitId}`);
  if (!data) return null;
  try {
    const snap = JSON.parse(data);
    if (snap && Array.isArray(snap.questions) && Array.isArray(snap.answers)) return snap;
    return null;
  } catch (e) {
    console.error('Review snapshot parse error', e);
    return null;
  }
}

function clearHistoryData() {
  if (confirm('คุณต้องการล้างประวัติการประเมินผลทั้งหมดของ Unit นี้ใช่หรือไม่?')) {
    try {
      localStorage.removeItem(`${STORAGE_KEY}_${currentUnitId}`);
      localStorage.removeItem(`${REVIEW_SNAPSHOT_KEY}_${currentUnitId}`);
    } catch (e) {
      console.error('History clear error', e);
    }
    renderDashboard();
  }
}

function renderDashboard() {
  const history = getHistory();

  // Restore standard single player dashboard items
  const normalGrid = document.querySelector('.db-grid');
  const normalCharts = document.querySelector('.db-charts-row');
  const normalRec = document.getElementById('db-rec-wrapper');

  if (normalGrid) normalGrid.style.display = 'grid';
  if (normalCharts) normalCharts.style.display = 'grid';
  if (normalRec) normalRec.style.display = 'block';

  if (history.length === 0 && !hasCompletedAssessment) {
    // Show empty state
    nodes.dbEmptyState.style.display = 'flex';
    nodes.dbContent.style.display = 'none';
    return;
  }
  
  // Hide empty state, show content
  nodes.dbEmptyState.style.display = 'none';
  nodes.dbContent.style.display = 'block';
  
  // Calculate results for the most recent attempt
  // If user navigated to Dashboard manually, read the last record. Otherwise use live session calculations.
  let correctCount = 0;
  let totalSecondsSpent = 0;
  let skills = {
    Listening: { total: 0, correct: 0 },
    "Word Recognition": { total: 0, correct: 0 },
    "Visual Matching": { total: 0, correct: 0 },
    "Spelling & Phonics": { total: 0, correct: 0 },
    "Sentence Q&A": { total: 0, correct: 0 }
  };
  
  if (challengeQuestions.length > 0) {
    challengeQuestions.forEach((q, idx) => {
      const ans = userAnswers[idx];
      const skill = q.skill;
      if (!skills[skill]) {
        skills[skill] = { total: 0, correct: 0 };
      }
      skills[skill].total++;
      const isAnsCorrect = ans && (ans.hasOwnProperty('isCorrect') ? ans.isCorrect : (ans.word.toLowerCase() === q.targetWord.word.toLowerCase()));
      if (isAnsCorrect) {
        correctCount++;
        skills[skill].correct++;
      }
    });
    totalSecondsSpent = questionTimeSpent.reduce((a, b) => a + b, 0);
  } else {
    // Fallback to reading the latest record if they just clicked the tab without playing
    const lastRec = history[history.length - 1];
    const recLength = lastRec && lastRec.questionsCount ? lastRec.questionsCount : 10;
    correctCount = lastRec ? Math.round((lastRec.score / 500) * recLength) : 0;
    totalSecondsSpent = lastRec ? lastRec.duration : 0;
    
    // Simulate skills distribution for history display fallback
    skills.Listening.total = Math.round(recLength * 0.2);
    skills.Listening.correct = Math.min(skills.Listening.total, Math.round(correctCount * 0.2));
    
    skills["Word Recognition"].total = Math.round(recLength * 0.2);
    skills["Word Recognition"].correct = Math.min(skills["Word Recognition"].total, Math.round(correctCount * 0.2));
    
    skills["Spelling & Phonics"].total = Math.round(recLength * 0.2);
    skills["Spelling & Phonics"].correct = Math.min(skills["Spelling & Phonics"].total, Math.round(correctCount * 0.2));
    
    skills["Sentence Q&A"].total = Math.round(recLength * 0.2);
    skills["Sentence Q&A"].correct = Math.min(skills["Sentence Q&A"].total, Math.round(correctCount * 0.2));
    
    skills["Visual Matching"].total = recLength - skills.Listening.total - skills["Word Recognition"].total - skills["Spelling & Phonics"].total - skills["Sentence Q&A"].total;
    skills["Visual Matching"].correct = correctCount - skills.Listening.correct - skills["Word Recognition"].correct - skills["Spelling & Phonics"].correct - skills["Sentence Q&A"].correct;
  }
  
  const totalQuestions = challengeQuestions.length > 0 ? challengeQuestions.length : (history[history.length - 1] && history[history.length - 1].questionsCount ? history[history.length - 1].questionsCount : 10);
  const scaledScore = Math.round((correctCount / totalQuestions) * 500);

  // Bug #2 Fix: Calculate incorrect and skipped counts separately
  let incorrectCount = 0;
  let skippedCount = 0;
  if (challengeQuestions.length > 0) {
    challengeQuestions.forEach((q, idx) => {
      const ans = userAnswers[idx];
      if (ans === null) {
        skippedCount++;
      } else {
        const isAnsCorrect = ans && (ans.hasOwnProperty('isCorrect') ? ans.isCorrect : (ans.word.toLowerCase() === q.targetWord.word.toLowerCase()));
        if (!isAnsCorrect) {
          incorrectCount++;
        }
      }
    });
  } else {
    incorrectCount = totalQuestions - correctCount;
  }

  // Render texts
  document.getElementById('dashboard-score-val').textContent = scaledScore;
  document.getElementById('stat-correct-count').textContent = `${correctCount} / ${totalQuestions} ข้อ`;
  document.getElementById('stat-incorrect-count').textContent =
    skippedCount > 0
      ? `ผิด ${incorrectCount} / ข้าม ${skippedCount} ข้อ`
      : `${incorrectCount} / ${totalQuestions} ข้อ`;

  // Render Stars Row dynamically
  const starsRow = document.getElementById('dashboard-stars-row');
  if (starsRow) {
    starsRow.innerHTML = '';
    const starsCount = calculateStarsEarned(correctCount, totalQuestions);

    for (let s = 0; s < 3; s++) {
      const starEl = document.createElement('span');
      if (s < starsCount) {
        starEl.className = `dashboard-star delay-${s}`;
        starEl.style.cssText = 'cursor:default;';
        starEl.textContent = '⭐';
      } else {
        const starEmptyEl = document.createElement('span');
        starEmptyEl.style.cssText = 'color:#cbd5e1; opacity:0.6; filter:none; font-size:2rem; cursor:default;';
        starEmptyEl.textContent = '☆';
        starsRow.appendChild(starEmptyEl);
        continue;
      }
      starsRow.appendChild(starEl);
    }
  }

  // Update total stars count displayed
  updateTotalStarsBadgeUI();

  // Format duration
  const mm = Math.floor(totalSecondsSpent / 60).toString().padStart(2, '0');
  const ss = (totalSecondsSpent % 60).toString().padStart(2, '0');
  document.getElementById('stat-total-time').textContent = `${mm}:${ss}`;

  // Avg Speed
  const avgSpeed = totalSecondsSpent / totalQuestions;
  document.getElementById('stat-avg-speed').textContent = `${avgSpeed.toFixed(1)} วินาที`;
  
  // Circular gauge animation
  const ring = document.getElementById('dashboard-score-ring');
  const offset = 339.292 - ((scaledScore / 500) * 339.292);
  ring.style.strokeDashoffset = offset;
  
  // Kids rating badge
  const badge = document.getElementById('dashboard-perf-badge');
  const summary = document.getElementById('dashboard-perf-summary');
  
  badge.className = 'kids-perf-badge';
  if (scaledScore >= 450) {
    badge.textContent = '🌟 อัจฉริยะตัวน้อย (SUPERSTAR)';
    badge.style.backgroundColor = '#10b981';
    summary.textContent = `ยอดเยี่ยมที่สุดเลยจ้า! น้องสะกดและเข้าใจคำศัพท์ทั้งหมด ${ORIGINAL_VOCAB_LIST.length} คำหลักได้อย่างคล่องแคล่วว่องไว พร้อมเรียนรู้คำศัพท์ระดับที่สูงขึ้นแล้ว!`;
  } else if (scaledScore >= 350) {
    badge.textContent = '🏅 เด็กเก่งคนดี (GREAT JOB)';
    badge.style.backgroundColor = '#3b82f6';
    summary.textContent = 'เก่งมากจ้า! น้องมีความรู้คำศัพท์ในเกณฑ์ดี จดจำอักษรสะกดคำได้ถูกต้องเกือบทั้งหมด มีเพียงส่วนเล็กๆ น้อยๆ ที่อาจจะสับสนเวลาฟัง';
  } else if (scaledScore >= 200) {
    badge.textContent = '👍 พยายามได้ดี (GOOD TRY)';
    badge.style.backgroundColor = '#f59e0b';
    summary.textContent = 'ทำได้ดีครับ! น้องมีความเข้าใจคำศัพท์ระดับปานกลาง อาจมีหลงลืมสะกดตัวอักษรบางตัวหรือสับสนเวลาฟังเสียง แนะนำฝึกทบทวนเพิ่มอีกนิด';
  } else {
    badge.textContent = '💪 สู้ๆ นะจ๊ะ (DEVELOPING)';
    badge.style.backgroundColor = '#ef4444';
    summary.textContent = 'ไม่เป็นไรนะจ๊ะ! ฝึกฝนสะกดคำทีละนิดทุกวัน ลองกลับไปเปิดโหมดฝึกสะกดคำแล้วเล่นใหม่อีกรอบ น้องจะสะกดได้เก่งขึ้นแน่นอนจ้า!';
  }
  
  // Personalized Parent Recommendations
  generateRecommendationsForParents(skills);
  
  // Render charts visualization
  renderEvaluationCharts(skills, history);

  // Render Dictation History
  renderDictationHistoryInDashboard();
  
  // Switch to default overview subtab
  switchDashboardTab('overview');
}

function generateRecommendationsForParents(skills) {
  const recContent = document.getElementById('rec-body-content');
  
  const listenPct = (skills.Listening.correct / skills.Listening.total) * 100 || 100;
  const wordPct = (skills["Word Recognition"].correct / skills["Word Recognition"].total) * 100 || 100;
  const matchPct = (skills["Visual Matching"].correct / skills["Visual Matching"].total) * 100 || 100;
  const spellingPct = skills["Spelling & Phonics"] ? ((skills["Spelling & Phonics"].correct / skills["Spelling & Phonics"].total) * 100) : 100;
  const qaPct = skills["Sentence Q&A"] ? ((skills["Sentence Q&A"].correct / skills["Sentence Q&A"].total) * 100) : 100;
  
  const suggestions = [];
  
  if (listenPct < 75) {
    suggestions.push(`
      <li>
        <strong>📢 เสริมทักษะการฟัง (ทักษะการฟังของน้องคือ ${listenPct.toFixed(0)}%):</strong> 
        น้องมีปัญหาในการเลือกรูปเมื่อฟังเสียงคำศัพท์ แนะนำให้ผู้ปกครองชี้ไปที่สิ่งของจริงในบ้าน เช่น ปากกา หรือ เก้าอี้ แล้วออกเสียงคำศัพท์นั้นให้ฟังบ่อยๆ หรือกดปุ่ม 🔊 เพื่อฟังซ้ำในโหมดสะกดคำจ้า
      </li>
    `);
  }
  
  if (wordPct < 75) {
    suggestions.push(`
      <li>
        <strong>✏️ ทบทวนตัวอักษรและการสะกด (ทักษะการจำตัวอักษรคือ ${wordPct.toFixed(0)}%):</strong> 
        น้องสะกดคำสับสน แนะนำให้ฝึกเขียนคำศัพท์โดยใช้สีสันช่วยแยกแยะ เช่น เขียนตัวอักษร Pen, Book ลงบนกระดาษวาดรูปเพื่อให้น้องจดจำภาพรวมของคำศัพท์ได้ดีขึ้น
      </li>
    `);
  }
  
  if (matchPct < 75) {
    suggestions.push(`
      <li>
        <strong>🧩 เชื่อมโยงความหมายกับภาพ (ทักษะการเชื่อมโยงคือ ${matchPct.toFixed(0)}%):</strong> 
        น้องสับสนในการแปลความหมายภาษาไทยกับภาษาอังกฤษ แนะนำให้เล่นเกมชี้ภาพทายศัพท์ในชีวิตประจำวันเพื่อฝึกความคุ้นเคย
      </li>
    `);
  }

  if (spellingPct < 75) {
    suggestions.push(`
      <li>
        <strong>✏️ ทักษะการประกอบคำสะกด (ทักษะการต่ออักษรสะกดคำคือ ${spellingPct.toFixed(0)}%):</strong> 
        น้องยังสับสนตำแหน่งตัวอักษรเวลาสะกดเอง แนะนำให้พาน้องเล่น "โหมดสะกดคำช้าๆ 🐢" หรือฝึกแตะทีละตัวอักษรในการ์ดทบทวนคำศัพท์บ่อยๆ เพื่อให้เสียงของแต่ละอักษรซึมซับเข้าไปจ้า
      </li>
    `);
  }
  
  if (qaPct < 75) {
    suggestions.push(`
      <li>
        <strong>💬 เสริมทักษะถาม-ตอบประโยค (ทักษะประโยคสนทนาของน้องคือ ${qaPct.toFixed(0)}%):</strong> 
        น้องยังไม่คุ้นเคยกับการเลือกและพูดตอบเป็นประโยค แนะนำให้ผู้ปกครองชวนออกเสียงประโยคถาม-ตอบภาษาอังกฤษง่ายๆ ในบ้าน เช่น ชี้ที่โต๊ะแล้วถามว่า "What is this?" และให้น้องลองตอบเต็มประโยค "It is a table." เพื่อฝึกพูดภาษาอังกฤษเป็นประโยคสนทนาจ้า
      </li>
    `);
  }
  
  if (suggestions.length === 0) {
    recContent.innerHTML = `
      <p style="color: var(--primary-hover); font-weight: 700; margin-bottom: 8px;">🎉 วิเคราะห์แล้ว: น้องเก่งและรอบรู้ครบทุกด้านเลยจ้า!</p>
      <p><strong>คำแนะนำ:</strong> ตอนนี้น้องมีความเข้าใจและพร้อมขึ้นไปท่องสะกดคำศัพท์ในบทเรียนต่อไปของ ป.1/ป.2 แล้ว ผู้ปกครองสามารถหาบัตรคำศัพท์หมวดหมู่สัตว์หรือผักผลไม้มาเล่นทายศัพท์เพิ่มเติมกับน้องได้เลยจ้า</p>
    `;
  } else {
    recContent.innerHTML = `
      <p style="margin-bottom: 10px; font-weight: 600;">แนะนำข้อควรพัฒนาสำหรับเด็ก ป.1:</p>
      <ul style="padding-left: 20px; display: flex; flex-direction: column; gap: 8px; list-style-type: disc;">
        ${suggestions.join('')}
      </ul>
    `;
  }
}

// RENDER CHARTS
function renderEvaluationCharts(skills, history) {
  // Reset charts instances
  if (skillsChart) skillsChart.destroy();
  if (trendChart) trendChart.destroy();
  
  const listenPct = Math.round((skills.Listening.correct / skills.Listening.total) * 100) || 100;
  const wordPct = Math.round((skills["Word Recognition"].correct / skills["Word Recognition"].total) * 100) || 100;
  const matchPct = Math.round((skills["Visual Matching"].correct / skills["Visual Matching"].total) * 100) || 100;
  const spellingPct = skills["Spelling & Phonics"] ? Math.round((skills["Spelling & Phonics"].correct / skills["Spelling & Phonics"].total) * 100) : 100;
  const qaPct = skills["Sentence Q&A"] ? Math.round((skills["Sentence Q&A"].correct / skills["Sentence Q&A"].total) * 100) : 100;
  
  // 1. Radar chart of Skills
  const radarCtx = document.getElementById('skillsRadarChart').getContext('2d');
  skillsChart = new Chart(radarCtx, {
    type: 'radar',
    data: {
      labels: ['การฟัง (Listening)', 'การจำคำศัพท์ (Spelling)', 'การเชื่อมโยงภาพ (Visual)', 'สะกดประกอบคำ (Phonics)', 'ถาม-ตอบประโยค (Q&A)'],
      datasets: [{
        label: 'สัดส่วนทักษะของน้อง (%)',
        data: [listenPct, wordPct, matchPct, spellingPct, qaPct],
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        borderColor: '#22c55e',
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#fff',
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          angleLines: { color: '#e2e8f0' },
          grid: { color: '#e2e8f0' },
          pointLabels: { color: '#475569', font: { family: 'Sarabun', size: 11, weight: 'bold' } },
          ticks: { color: '#94a3b8', backdropColor: 'transparent', stepSize: 20 },
          min: 0,
          max: 100
        }
      }
    }
  });

  // Skills Insight text
  let lowSkill = '';
  let minPct = Math.min(listenPct, wordPct, matchPct, spellingPct, qaPct);
  if (minPct === listenPct) lowSkill = 'ทักษะการฟังภาษาอังกฤษ (Listening)';
  else if (minPct === wordPct) lowSkill = 'การจดจำคำศัพท์และตัวอักษร (Word Recognition)';
  else if (minPct === matchPct) lowSkill = 'การเชื่อมโยงภาพและความหมาย (Visual Matching)';
  else if (minPct === spellingPct) lowSkill = 'การสะกดคำศัพท์ด้วยตนเอง (Spelling & Phonics)';
  else lowSkill = 'การถาม-ตอบประโยคสนทนา (Sentence Q&A)';
  
  document.getElementById('skills-insight-text').innerHTML = `
    💡 <strong>จุดสังเกต:</strong> น้องทำคะแนนด้าน <span class="text-highlight" style="font-weight: 700;">${lowSkill}</span> ได้น้อยที่สุด (${minPct}%) ผู้ปกครองสามารถร่วมฝึกทักษะนี้กับน้องได้จ้า
  `;
  
  // 2. Line Chart of History
  const lineCtx = document.getElementById('progressLineChart').getContext('2d');
  
  if (history.length <= 1) {
    document.getElementById('progress-insight-text').innerHTML = `
      📈 <strong>ประวัติความก้าวหน้า:</strong> จะแสดงกราฟพัฒนาการคะแนน เมื่อเล่นโหมดท้าทายครบ 2 ครั้งขึ้นไปนะจ๊ะ
    `;
    
    // Fallback single dot chart
    const singleMode = (history[0] && history[0].isFinalTest !== undefined)
      ? (history[0].isFinalTest ? 'Final Test' : 'ฝึกรายวัน')
      : (history[0] && history[0].questionsCount === 10 ? 'ฝึกรายวัน' : 'Final Test');
    const singleCount = history[0] && history[0].questionsCount ? history[0].questionsCount : 10;
    const labelText = `ครั้งที่ 1 (${singleMode} - ${singleCount} ข้อ)`;

    trendChart = new Chart(lineCtx, {
      type: 'line',
      data: {
        labels: [labelText],
        datasets: [{
          data: [history[0] ? history[0].score : 0],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { min: 0, max: 500, grid: { color: '#f1f5f9' }, ticks: { color: '#94a3b8' } },
          x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
        }
      }
    });
  } else {
    const labels = history.map((h, i) => {
      const mode = (h.isFinalTest !== undefined)
        ? (h.isFinalTest ? 'Final Test' : 'ฝึกรายวัน')
        : (h.questionsCount === 10 ? 'ฝึกรายวัน' : 'Final Test');
      const count = h.questionsCount || 10;
      return `ครั้งที่ ${i + 1} (${mode} - ${count} ข้อ)`;
    });
    const scores = history.map(h => h.score);
    
    trendChart = new Chart(lineCtx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          data: scores,
          borderColor: '#3b82f6',
          borderWidth: 4,
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.3,
          pointBackgroundColor: '#2563eb',
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            min: 0,
            max: 500,
            grid: { color: '#e2e8f0' },
            ticks: { color: '#64748b', font: { family: 'Fredoka', weight: 'bold' } }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#64748b', font: { family: 'Sarabun', size: 10 } }
          }
        }
      }
    });
    
    // Insight comparison
    const cur = scores[scores.length - 1];
    const prev = scores[scores.length - 2];
    const diff = cur - prev;
    
    if (diff > 0) {
      document.getElementById('progress-insight-text').innerHTML = `
        🚀 <strong>พัฒนาการดีขึ้น:</strong> คะแนนเพิ่มขึ้นจากรอบที่แล้ว <span style="color: var(--primary-hover); font-weight: 700;">+${diff} คะแนน</span> เก่งขึ้นแบบก้าวกระโดดเลยจ้า!
      `;
    } else if (diff < 0) {
      document.getElementById('progress-insight-text').innerHTML = `
        ⚠️ <strong>คำแนะนำประวัติ:</strong> คะแนนครั้งนี้ลดลงกว่ารอบที่แล้ว <span style="color: var(--danger); font-weight: 700;">${diff} คะแนน</span> ลองทบทวนคำศัพท์และไปสู้ใหม่อีกรอบนะจ๊ะ!
      `;
    } else {
      document.getElementById('progress-insight-text').innerHTML = `
        📊 <strong>ความก้าวหน้า:</strong> คะแนนคงที่อยู่ที่ <span class="text-highlight" style="font-weight: 700;">${cur} คะแนน</span> รอบหน้าลองเร่งความเร็วในการตอบให้ไวขึ้นดูจ้า
      `;
    }
  }
}

// RENDER DETAILED REVIEW CARDS
// RENDER DETAILED REVIEW CARDS
function renderDetailedReview() {
  const container = document.getElementById('review-list-container');
  container.innerHTML = '';

  // Prefer the in-memory session; fall back to the persisted snapshot (e.g. after a reload)
  let questions = challengeQuestions;
  let answers = userAnswers;
  if (questions.length === 0) {
    const snap = getReviewSnapshot();
    if (snap) {
      questions = snap.questions;
      answers = snap.answers;
    }
  }

  if (questions.length === 0) {
    container.innerHTML = `
      <div class="text-center" style="padding: 30px; color: var(--text-muted);">
        ยังไม่มีเฉลยรายข้อให้ดูจ้า ลองทำแบบทดสอบสักรอบก่อนนะ แล้วเฉลยละเอียดจะมาแสดงตรงนี้เลย! 📖
      </div>`;
    return;
  }

  questions.forEach((q, idx) => {
    const ans = answers[idx];
    const isCorrect = ans && (ans.hasOwnProperty('isCorrect') ? ans.isCorrect : ans.word.toLowerCase() === q.targetWord.word.toLowerCase());
    
    const card = document.createElement('div');
    card.className = 'review-item-card';
    card.id = `review-card-${idx}`;
    
    let statusClass = 'skipped';
    let statusText = 'ข้ามคำถาม';
    if (ans !== null) {
      statusClass = isCorrect ? 'correct' : 'incorrect';
      statusText = isCorrect ? 'ตอบถูกจ้า' : 'ตอบผิด';
    }
    
    // Build Question text display
    let qText = '';
    if (q.type === 'audio') {
      qText = `คำถามการฟัง: ได้ยินคำว่า "${q.targetWord.word}" และมีความหมายตรงกับรูปใด?`;
    } else if (q.type === 'visual_word') {
      qText = `คำถามการจำศัพท์: ดูภาพคำว่า "${q.targetWord.meaning}" และตรงกับตัวอักษรข้อใด?`;
    } else if (q.type === 'spelling_scrambled') {
      qText = `คำถามสะกดคำ: ดูภาพแล้วเลือกตัวอักษรเพื่อเรียงสะกดคำว่า "${q.targetWord.word}" (${q.targetWord.meaning}) จ้า`;
    } else if (q.type === 'sentence_qa') {
      if (q.isYesNo) {
        qText = `คำถาม Yes/No: ถาม "${q.questionText}" สำหรับภาพ "${q.targetWord.meaning}" และตรงกับประโยคคำตอบข้อใด?`;
      } else {
        const qaData = getSentenceQA(q.targetWord);
        qText = `คำถามถาม-ตอบประโยค: ถาม "${qaData.question}" สำหรับภาพ "${q.targetWord.meaning}" และตรงกับประโยคคำตอบข้อใด?`;
      }
    } else if (q.type === 'grammar_an') {
      qText = `คำถามไวยากรณ์: ประโยคถาม "What’s this?" สำหรับรูปภาพ "${q.targetWord.meaning}" ตอบโดยใช้ไวยากรณ์รูปย่อและเลือก a / an ที่ถูกต้องคือประโยคใด?`;
    } else if (q.type === 'phonics_midterm') {
      qText = `คำถามโฟนิกส์ (Phonics): คำศัพท์ใดที่ขึ้นต้นด้วยเสียงตัวอักษร "${q.phonicsLetter.toUpperCase()}" จ๊ะ?`;
    } else if (q.type === 'grammar_midterm') {
      qText = `คำถามไวยากรณ์กลางภาค (Grammar): เติมบทสนทนาและตอบคำถามไวยากรณ์ "${q.questionText}" ให้ถูกต้องตามหลักภาษา`;
    } else {
      qText = `คำถามจับคู่: คำศัพท์ภาษาไทยคำว่า "${q.targetWord.meaning}" ตรงกับรูปและคำอังกฤษข้อใด?`;
    }
    
    // Header status badges
    const badgesHtml = `<span class="status-badge ${statusClass}">${statusText}</span>`;
    
    // Header
    const header = document.createElement('div');
    header.className = 'review-item-header';
    header.innerHTML = `
      <div class="review-header-left">
        <div class="review-tag-row" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span class="category-badge" style="font-size:0.75rem; font-weight:700; background:#dbeafe; color:#1e40af; border:1px solid #bfdbfe; padding:2px 8px; border-radius:50px;">
            ${q.skill}
          </span>
          ${badgesHtml}
          <span class="question-tracker" style="font-size:0.8rem; font-weight:700;">ข้อที่ ${idx + 1}</span>
        </div>
        <div class="review-item-q-text">${escapeHTML(qText)}</div>
      </div>
      <div class="toggle-icon">▼</div>
    `;
    
    // Details
    const details = document.createElement('div');
    details.className = 'review-item-details';
    
    const optionsList = document.createElement('div');
    optionsList.className = 'review-options-list';
    
    q.options.forEach((opt, optIdx) => {
      const optDiv = document.createElement('div');
      optDiv.className = 'review-option default';
      const label = String.fromCharCode(65 + optIdx);
      
      let optLabelStr = '';
      if (q.type === 'sentence_qa') {
        if (q.isYesNo) {
          optLabelStr = `${label}. &nbsp; <strong>${opt.text}</strong> (${opt.thaiText})`;
        } else {
          const optQA = getSentenceQA(opt);
          optLabelStr = `${label}. &nbsp; <strong>${optQA.answer}</strong> (${optQA.thaiAnswer})`;
        }
      } else if (q.type === 'grammar_an' || q.type === 'grammar_midterm') {
        optLabelStr = `${label}. &nbsp; <strong>${opt.text}</strong>`;
      } else {
        const optRepresentation = (opt.image.startsWith('<svg') ? opt.image : opt.image);
        optLabelStr = `${label}. &nbsp; ${optRepresentation} &nbsp; <strong>${opt.word}</strong> (${opt.meaning})`;
      }
      
      let optBadgesHtml = '';
      let isOptCorrect = false;
      let isOptSelected = false;
      
      if (opt.hasOwnProperty('isCorrect')) {
        isOptCorrect = opt.isCorrect;
        if (q.type === 'grammar_midterm' || q.type === 'grammar_an' || (q.type === 'sentence_qa' && q.isYesNo)) {
          isOptSelected = ans && ans.text === opt.text;
        } else {
          isOptSelected = ans && ans.word === opt.word;
        }
      } else {
        isOptCorrect = opt.word === q.targetWord.word;
        isOptSelected = ans && ans.word === opt.word;
      }
      
      if (isOptCorrect) {
        optDiv.className = 'review-option correct';
        optBadgesHtml += `<span class="option-badge correct">คำตอบที่ถูกต้อง</span>`;
      } else if (isOptSelected && !isCorrect) {
        optDiv.className = 'review-option user-incorrect';
        optBadgesHtml += `<span class="option-badge incorrect">น้องเลือกข้อนี้</span>`;
      } else {
        optDiv.className = 'review-option default';
      }
      
      optDiv.innerHTML = `
        <span style="display:flex; align-items:center; gap:10px;">${optLabelStr}</span>
        <div class="review-option-badges" style="display:flex; gap:6px; align-items:center; margin-left:auto; flex-wrap:wrap; justify-content:flex-end;">
          ${optBadgesHtml}
        </div>
      `;
      optionsList.appendChild(optDiv);
    });
    
    // Explanation box
    const explanation = document.createElement('div');
    explanation.className = 'explanation-box';
    explanation.innerHTML = `
      <div class="explanation-title">💡 เกร็ดความรู้น่ารู้สำหรับเด็กๆ:</div>
      <div class="explanation-text">${q.targetWord.explanation || `ลองทบทวนคำว่า "${q.targetWord.word}" (${q.targetWord.meaning}) อีกครั้งนะจ๊ะ`}</div>
    `;
    
    // Speaker trigger inside review to let kids listen to it again
    const speakButton = document.createElement('button');
    speakButton.className = 'play-btn';
    speakButton.style.padding = '8px 16px';
    speakButton.style.fontSize = '0.9rem';
    speakButton.style.marginTop = '15px';
    speakButton.innerHTML = '🔊 กดฟังการออกเสียงและคำแปลอีกรอบ';
    speakButton.addEventListener('click', () => {
      if (q.type === 'sentence_qa') {
        stopAllSpeech();
        if (q.isYesNo) {
          speakEN(q.questionText, 0.85);
          const correctOpt = q.options.find(o => o.isCorrect);
          setTimeout(() => {
            if (activeTab === 'dashboard') {
              speakEN(correctOpt.text, 0.8);
              setTimeout(() => {
                if (activeTab === 'dashboard') speakTH(correctOpt.thaiText);
              }, 1200);
            }
          }, 1800);
        } else {
          const qaData = getSentenceQA(q.targetWord);
          // Queue question
          speakEN(qaData.question, 0.85);
          // Queue answer after a short pause
          setTimeout(() => {
            if (activeTab === 'dashboard') {
              speakEN(qaData.answer, 0.8);
              setTimeout(() => {
                if (activeTab === 'dashboard') speakTH(qaData.thaiAnswer);
              }, 1200);
            }
          }, 1800);
        }
      } else if (q.type === 'grammar_an') {
        stopAllSpeech();
        speakEN("What’s this?", 0.85);
        const correctOpt = q.options.find(o => o.isCorrect);
        if (correctOpt) {
          setTimeout(() => {
            if (activeTab === 'dashboard') {
              speakEN(correctOpt.text, 0.8);
              setTimeout(() => {
                if (activeTab === 'dashboard') speakTH(`มันคือ${q.targetWord.meaning}`);
              }, 1200);
            }
          }, 1800);
        }
      } else {
        spellAndSpeak(q.targetWord);
      }
    });
    
    details.appendChild(optionsList);
    details.appendChild(explanation);
    details.appendChild(speakButton);
    
    // Header click trigger
    header.addEventListener('click', () => {
      card.classList.toggle('expanded');
    });
    
    card.appendChild(header);
    card.appendChild(details);
    container.appendChild(card);
  });
}

// Helpers
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// CUSTOM VOCABULARY & WEAK WORDS PORTAL MANAGEMENT
function getCustomVocabList() {
  const data = localStorage.getItem(`${CUSTOM_STORAGE_KEY}_${currentUnitId}`);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Custom list parse error', e);
    return [];
  }
}

function saveCustomVocabList(list) {
  localStorage.setItem(`${CUSTOM_STORAGE_KEY}_${currentUnitId}`, JSON.stringify(list));
}

function getWeakWordList() {
  const data = localStorage.getItem(WEAK_STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Weak list parse error', e);
    return [];
  }
}

function saveWeakWordList(list) {
  localStorage.setItem(WEAK_STORAGE_KEY, JSON.stringify(list));
}

function initCustomVocabData() {
  // Clean legacy custom vocab once (if exists)
  if (localStorage.getItem(CUSTOM_STORAGE_KEY)) {
    localStorage.removeItem(CUSTOM_STORAGE_KEY);
  }

  // Load default unit
  loadUnitVocab(currentUnitId);
  
  // Render selectors initially
  renderUnitSelectors();
  setupQuizLengthSelectors();
  setupGameModeSelectors();
  
  // Initialize Stars System
  initStarsSystem();
}

function loadUnitVocab(unitId) {
  currentUnitId = unitId;
  
  const subtitle = document.getElementById('subtitleText');
  if (unitId === 'midterm_prep') {
    const unit1 = VOCAB_UNITS.find(u => u.id === 'unit_1');
    const unit2 = VOCAB_UNITS.find(u => u.id === 'unit_2');
    ORIGINAL_VOCAB_LIST = [...(unit1 ? unit1.words : []), ...(unit2 ? unit2.words : [])];
    if (subtitle) {
      subtitle.textContent = `🎓 โหมดเตรียมสอบกลางภาค ป.1 (Let's Go 1 Unit 1-2)`;
    }
  } else {
    const unit = VOCAB_UNITS.find(u => u.id === unitId) || VOCAB_UNITS[0];
    ORIGINAL_VOCAB_LIST = [...unit.words];
    if (subtitle) {
      subtitle.textContent = `เรียนรู้คำศัพท์: ${unit.title} (${ORIGINAL_VOCAB_LIST.length} คำหลัก)`;
    }
  }
  
  refreshVocabList();
  renderCustomVocabTable();
  updateUnitSelectorUI();
}

function renderUnitSelectors() {
  const learnSelector = document.getElementById('learn-unit-selector');
  const gameSelector = document.getElementById('game-unit-selector');
  
  if (!learnSelector || !gameSelector) return;
  
  learnSelector.innerHTML = '';
  gameSelector.innerHTML = '';
  
  VOCAB_UNITS.forEach(unit => {
    // Learn button
    const btnLearn = document.createElement('button');
    btnLearn.type = 'button';
    btnLearn.className = `btn-unit-select ${unit.id === currentUnitId ? 'active' : ''}`;
    btnLearn.textContent = unit.title.split(':')[0]; // "Unit 1"
    btnLearn.style.cssText = getUnitBtnStyle(unit.id === currentUnitId, false);
    btnLearn.addEventListener('click', () => {
      loadUnitVocab(unit.id);
    });
    learnSelector.appendChild(btnLearn);
    
    // Game button
    const btnGame = document.createElement('button');
    btnGame.type = 'button';
    btnGame.className = `btn-unit-select ${unit.id === currentUnitId ? 'active' : ''}`;
    btnGame.textContent = unit.title.split(':')[0];
    btnGame.style.cssText = getUnitBtnStyle(unit.id === currentUnitId, false);
    btnGame.addEventListener('click', () => {
      loadUnitVocab(unit.id);
    });
    gameSelector.appendChild(btnGame);
  });

  // Add Midterm Prep Button to Learn Mode
  const btnLearnMidterm = document.createElement('button');
  btnLearnMidterm.type = 'button';
  btnLearnMidterm.className = `btn-unit-select ${currentUnitId === 'midterm_prep' ? 'active' : ''}`;
  btnLearnMidterm.textContent = '🎓 เตรียมสอบกลางภาค';
  btnLearnMidterm.style.cssText = getUnitBtnStyle(currentUnitId === 'midterm_prep', true);
  btnLearnMidterm.addEventListener('click', () => {
    loadUnitVocab('midterm_prep');
  });
  learnSelector.appendChild(btnLearnMidterm);

  // Add Midterm Prep Button to Game Mode
  const btnGameMidterm = document.createElement('button');
  btnGameMidterm.type = 'button';
  btnGameMidterm.className = `btn-unit-select ${currentUnitId === 'midterm_prep' ? 'active' : ''}`;
  btnGameMidterm.textContent = '🎓 เตรียมสอบกลางภาค';
  btnGameMidterm.style.cssText = getUnitBtnStyle(currentUnitId === 'midterm_prep', true);
  btnGameMidterm.addEventListener('click', () => {
    loadUnitVocab('midterm_prep');
  });
  gameSelector.appendChild(btnGameMidterm);
}

function getUnitBtnStyle(isActive, isMidterm = false) {
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

function updateUnitSelectorUI() {
  const learnBtns = document.querySelectorAll('#learn-unit-selector button');
  const gameBtns = document.querySelectorAll('#game-unit-selector button');
  
  VOCAB_UNITS.forEach((unit, idx) => {
    const isActive = unit.id === currentUnitId;
    if (learnBtns[idx]) {
      learnBtns[idx].className = `btn-unit-select ${isActive ? 'active' : ''}`;
      learnBtns[idx].style.cssText = getUnitBtnStyle(isActive, false);
    }
    if (gameBtns[idx]) {
      gameBtns[idx].className = `btn-unit-select ${isActive ? 'active' : ''}`;
      gameBtns[idx].style.cssText = getUnitBtnStyle(isActive, false);
    }
  });

  const midtermIdx = VOCAB_UNITS.length;
  const isMidtermActive = currentUnitId === 'midterm_prep';
  if (learnBtns[midtermIdx]) {
    learnBtns[midtermIdx].className = `btn-unit-select ${isMidtermActive ? 'active' : ''}`;
    learnBtns[midtermIdx].style.cssText = getUnitBtnStyle(isMidtermActive, true);
  }
  if (gameBtns[midtermIdx]) {
    gameBtns[midtermIdx].className = `btn-unit-select ${isMidtermActive ? 'active' : ''}`;
    gameBtns[midtermIdx].style.cssText = getUnitBtnStyle(isMidtermActive, true);
  }
}

function setupQuizLengthSelectors() {
  const btn10 = document.getElementById('quiz-length-10');
  const btnFinal = document.getElementById('quiz-length-final');
  
  if (!btn10 || !btnFinal) return;
  
  btn10.addEventListener('click', () => {
    btn10.classList.add('active');
    btnFinal.classList.remove('active');
    
    btn10.style.cssText = 'flex: 1; padding: 10px 14px; font-size: 0.88rem; font-weight: 700; border-radius: 12px; border: 2px solid var(--primary); background: var(--primary-light); color: var(--primary-hover); cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.1);';
    btnFinal.style.cssText = 'flex: 1; padding: 10px 14px; font-size: 0.88rem; font-weight: 700; border-radius: 12px; border: 2px solid #e2e8f0; background: white; color: var(--text-muted); cursor: pointer; transition: all 0.2s;';
    
    quizQuestionCount = 10;
    updateGameStartMeta();
  });
  
  btnFinal.addEventListener('click', () => {
    btnFinal.classList.add('active');
    btn10.classList.remove('active');
    
    btnFinal.style.cssText = 'flex: 1; padding: 10px 14px; font-size: 0.88rem; font-weight: 700; border-radius: 12px; border: 2px solid var(--primary); background: var(--primary-light); color: var(--primary-hover); cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.1);';
    btn10.style.cssText = 'flex: 1; padding: 10px 14px; font-size: 0.88rem; font-weight: 700; border-radius: 12px; border: 2px solid #e2e8f0; background: white; color: var(--text-muted); cursor: pointer; transition: all 0.2s;';
    
    quizQuestionCount = Math.min(20, VOCAB_LIST.length);
    updateGameStartMeta();
  });
}

function setupGameModeSelectors() {
  const btnMixed = document.getElementById('game-mode-mixed');
  const btnQA = document.getElementById('game-mode-qa');
  
  if (!btnMixed || !btnQA) return;
  
  btnMixed.addEventListener('click', () => {
    selectedGameMode = 'mixed';
    btnMixed.classList.add('active');
    btnQA.classList.remove('active');
    
    btnMixed.style.cssText = 'flex: 1; padding: 10px 14px; font-size: 0.88rem; font-weight: 700; border-radius: 12px; border: 2px solid var(--primary); background: var(--primary-light); color: var(--primary-hover); cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.1);';
    btnQA.style.cssText = 'flex: 1; padding: 10px 14px; font-size: 0.88rem; font-weight: 700; border-radius: 12px; border: 2px solid #e2e8f0; background: white; color: var(--text-muted); cursor: pointer; transition: all 0.2s;';
  });
  
  btnQA.addEventListener('click', () => {
    selectedGameMode = 'qa';
    btnQA.classList.add('active');
    btnMixed.classList.remove('active');
    
    btnQA.style.cssText = 'flex: 1; padding: 10px 14px; font-size: 0.88rem; font-weight: 700; border-radius: 12px; border: 2px solid var(--primary); background: var(--primary-light); color: var(--primary-hover); cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.1);';
    btnMixed.style.cssText = 'flex: 1; padding: 10px 14px; font-size: 0.88rem; font-weight: 700; border-radius: 12px; border: 2px solid #e2e8f0; background: white; color: var(--text-muted); cursor: pointer; transition: all 0.2s;';
  });
}

function refreshVocabList() {
  VOCAB_LIST.length = 0;
  VOCAB_LIST.push(...ORIGINAL_VOCAB_LIST);
  
  const custom = getCustomVocabList();
  VOCAB_LIST.push(...custom);
  
  initLearnMode();
  updateGameStartMeta();
}

function renderCustomVocabTable() {
  const tbody = document.getElementById('custom-vocab-list-tbody');
  const emptyDiv = document.getElementById('custom-vocab-empty');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  const custom = getCustomVocabList();
  
  if (custom.length === 0) {
    if (emptyDiv) emptyDiv.style.display = 'block';
    return;
  }
  
  if (emptyDiv) emptyDiv.style.display = 'none';
  
  custom.forEach((item, idx) => {
    const tr = document.createElement('tr');
    tr.style.height = '50px';
    
    const imgHtml = item.image.startsWith('<svg') ? item.image : `<span style="font-size:1.5rem;">${item.image}</span>`;
    
    tr.innerHTML = `
      <td style="padding: 10px; width: 60px;">${imgHtml}</td>
      <td style="padding: 10px; font-weight:700; color:var(--dark-2);">${escapeHTML(item.word)}</td>
      <td style="padding: 10px; color:var(--text-muted);">${escapeHTML(item.meaning)}</td>
      <td style="padding: 10px; text-align: center;">
        <button class="btn-delete-vocab" onclick="deleteCustomVocab(${idx})">ลบ</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function deleteCustomVocab(idx) {
  if (confirm('คุณพ่อคุณแม่ต้องการลบคำศัพท์นี้ออกจากคลังใช่หรือไม่จ๊ะ?')) {
    const custom = getCustomVocabList();
    custom.splice(idx, 1);
    saveCustomVocabList(custom);
    refreshVocabList();
    renderCustomVocabTable();
    updateGameStartMeta();
  }
}

function updateGameStartMeta() {
  const countSpan = document.getElementById('start-screen-vocab-count');
  if (countSpan) {
    countSpan.textContent = VOCAB_LIST.length;
  }
  
  const gameModeSetup = document.getElementById('game-mode-mixed') ? document.getElementById('game-mode-mixed').closest('div') : null;
  const quizLengthSetup = document.getElementById('quiz-length-10') ? document.getElementById('quiz-length-10').closest('div') : null;
  const startMetaInfo = document.getElementById('game-start-meta');
  const startDesc = document.querySelector('#game-start-screen p');
  const startTitle = document.querySelector('#game-start-screen h2');
  
  if (currentUnitId === 'midterm_prep') {
    quizQuestionCount = MIDTERM_QUESTION_COUNT;
    if (gameModeSetup) gameModeSetup.style.display = 'none';
    if (quizLengthSetup) quizLengthSetup.style.display = 'none';
    if (startMetaInfo) {
      startMetaInfo.innerHTML = `🎓 แบบทดสอบกลางภาค ป.1 มีทั้งหมด <span style="color:#d97706; font-weight:800;">${MIDTERM_QUESTION_COUNT} ข้อ</span> ครบทุกแนวข้อสอบจ้า`;
      startMetaInfo.style.cssText = 'background: #fffbeb; border: 1.5px solid #fef08a; padding: 10px 16px; border-radius: 12px; display: inline-block; font-size: 0.95rem; font-weight: 600; color: #b45309; margin-bottom: 24px; animation: pulse-gold 2s infinite;';
    }
    if (startTitle) startTitle.textContent = '🏆 ภารกิจจำลองสอบกลางภาค ป.1 (Let\'s Go 1)';
    if (startDesc) startDesc.textContent = `น้องๆ จะได้ทำข้อสอบ ${MIDTERM_QUESTION_COUNT} ข้อ รวมคำศัพท์ ไวยากรณ์ (Grammar) และฝึกโฟนิกส์ (Phonics Bb, Pp, Cc, Gg) ของบทเรียน Unit 1-2 เพื่อสะสมดาวทองเป็นกรณีพิเศษ!`;
  } else {
    if (gameModeSetup) gameModeSetup.style.display = 'block';
    if (quizLengthSetup) quizLengthSetup.style.display = 'block';
    
    const isLength10 = document.getElementById('quiz-length-10') && document.getElementById('quiz-length-10').classList.contains('active');
    quizQuestionCount = isLength10 ? 10 : Math.min(20, VOCAB_LIST.length);
    
    if (startMetaInfo) {
      startMetaInfo.innerHTML = `คลังคำศัพท์ปัจจุบันมีทั้งหมด <span id="start-screen-vocab-count" style="color: var(--primary-hover); font-weight: 700;">${VOCAB_LIST.length}</span> คำจ้า`;
      startMetaInfo.style.cssText = 'background: var(--secondary-light); border: 1px solid var(--secondary-border); padding: 10px 16px; border-radius: 12px; display: inline-block; font-size: 0.95rem; font-weight: 600; color: var(--secondary-dark); margin-bottom: 24px;';
    }
    if (startTitle) startTitle.textContent = 'ภารกิจเกมท้าทายสะกดคำ!';
    if (startDesc) startDesc.textContent = 'น้องๆ จะต้องตอบคำถามทั้งหมด 10 ข้อ โดยมีทั้งการฟังเสียง การเลือกคำอังกฤษ และการเชื่อมโยงภาพความหมายภาษาไทยจ้า';
  }
}

// ============================================================
// SPELLING PRACTICE MODAL LOGIC
// ============================================================
function openSpellingPractice(item) {
  stopAllSpeech();
  currentPracticeItem = item;
  isSpellingSuccess = false;
  nodes.spellingModalOverlay.style.display = 'flex';
  nodes.btnRepeatSound.style.display = 'none';
  nodes.spellingModalFeedback.innerHTML = '';
  nodes.spellingModalFeedback.className = 'spelling-modal-feedback';
  
  // Set Visuals
  nodes.spellingModalImage.innerHTML = item.image;
  nodes.spellingModalMeaning.textContent = item.meaning;
  
  resetSpellingPractice(item);
}

function resetSpellingPractice(item) {
  if (!item) return;
  stopAllSpeech();
  isSpellingSuccess = false;
  practiceSelectedLetters = [];
  
  nodes.spellingModalFeedback.innerHTML = '';
  nodes.spellingModalFeedback.className = 'spelling-modal-feedback';
  nodes.btnRepeatSound.style.display = 'none';
  
  const contentBox = document.querySelector('.spelling-modal-content');
  if (contentBox) {
    contentBox.classList.remove('shake');
    contentBox.classList.remove('success');
  }

  // Create empty slots (handling space)
  nodes.spellingModalSlots.innerHTML = '';
  for (let i = 0; i < item.word.length; i++) {
    const slot = document.createElement('div');
    if (item.word[i] === ' ') {
      slot.className = 'spelling-slot-space';
      slot.innerHTML = '&nbsp;';
      slot.dataset.isSpace = 'true';
    } else {
      slot.className = 'spelling-slot';
      slot.dataset.index = i;
    }
    nodes.spellingModalSlots.appendChild(slot);
  }
  
  // Create scrambled letters (excluding space)
  nodes.spellingModalLetters.innerHTML = '';
  const correctLetters = item.word.split('').filter(c => c !== ' ');
  const scrambled = correctLetters.sort(() => Math.random() - 0.5);
  scrambled.forEach((letter) => {
    const btn = document.createElement('button');
    btn.className = 'letter-btn';
    btn.textContent = letter;
    btn.addEventListener('click', () => handlePracticeLetterTap(letter, btn, item));
    nodes.spellingModalLetters.appendChild(btn);
  });
  
  speakTH('ลองสะกดคำนี้ดูสิจ๊ะ');
}

function handlePracticeLetterTap(letter, btn, item) {
  if (isSpellingSuccess || btn.disabled) return;
  
  practiceSelectedLetters.push({ letter, btnEl: btn });
  btn.disabled = true;
  
  // Find next non-space slot
  const unfilledSlots = Array.from(nodes.spellingModalSlots.children).filter(slot => !slot.dataset.isSpace && !slot.classList.contains('filled'));
  if (unfilledSlots.length > 0) {
    const targetSlot = unfilledSlots[0];
    targetSlot.textContent = letter;
    targetSlot.classList.add('filled');
  }
  
  // Always speak the tapped letter immediately
  speakEN(letter.toLowerCase(), 0.55);
  
  const correctLettersCount = item.word.split('').filter(c => c !== ' ').length;
  if (practiceSelectedLetters.length === correctLettersCount) {
    // Delay check so the last letter audio has time to play
    setTimeout(() => {
      checkPracticeSpelling(item);
    }, 600);
  }
}

function checkPracticeSpelling(item) {
  // Reconstruct spelled word from slots to retain space correctly
  const spelledWord = Array.from(nodes.spellingModalSlots.children).map(slot => {
    if (slot.dataset.isSpace) return ' ';
    return slot.textContent;
  }).join('');
  const contentBox = document.querySelector('.spelling-modal-content');
  
  if (spelledWord.toLowerCase() === item.word.toLowerCase()) {
    // Success
    isSpellingSuccess = true;
    contentBox.classList.add('success');
    nodes.spellingModalFeedback.innerHTML = `🎉 เก่งมากเลยจ้า! <b>${item.word}</b>`;
    nodes.btnRepeatSound.style.display = 'inline-flex';
    
    // Play full explanation
    spellAndSpeak(item, null, 0.8);
  } else {
    // Fail
    contentBox.classList.add('shake');
    nodes.spellingModalFeedback.innerHTML = '<span class="wrong">❌ ลองใหม่อีกครั้งนะจ๊ะ</span>';
    speakTH('ลองใหม่อีกครั้งนะจ๊ะ');
    
    // Auto reset after 1.5s
    setTimeout(() => {
      if (currentPracticeItem === item && !isSpellingSuccess) {
        resetSpellingPractice(item);
      }
    }, 1500);
  }
}

function closeSpellingPractice() {
  nodes.spellingModalOverlay.style.display = 'none';
  stopAllSpeech();
  currentPracticeItem = null;
  practiceSelectedLetters = [];
  const contentBox = document.querySelector('.spelling-modal-content');
  if (contentBox) {
    contentBox.classList.remove('shake');
    contentBox.classList.remove('success');
  }
}

/* ============================================================
   Dictation Mode Logic & Functions (Word Builder Edition)
   ============================================================ */

function initDictationStudyMode() {
  // ดึงคำศัพท์ 5 คำแรกที่ผู้ใช้ระบุจาก VOCAB_LIST (หรือ fallback ไปยัง VOCAB_UNITS[0].words หาก VOCAB_LIST ว่างเปล่า)
  const sourceList = (VOCAB_LIST && VOCAB_LIST.length > 0) ? VOCAB_LIST : (VOCAB_UNITS && VOCAB_UNITS[0] ? VOCAB_UNITS[0].words : []);
  
  const roundWords = DICTATION_ROUNDS[selectedDictationRound] || DICTATION_ROUNDS.r1;
  dictationSessionList = sourceList.filter(item => 
    roundWords.includes(item.word.trim().toLowerCase())
  );

  // Fallback เพิ่มเติมหากไม่พบคำใดๆ เลย ป้องกันระบบขัดข้อง
  if (dictationSessionList.length === 0) {
    dictationSessionList = [
      { word: 'Pencil', meaning: 'ดินสอ', image: '✏️', explanation: '✏️ Pencil สะกดว่า P - E - N - C - I - L แปลว่า ดินสอ จ้า' },
      { word: 'Book', meaning: 'หนังสือ', image: '📖', explanation: '📖 Book สะกดว่า B - O - O - K แปลว่า หนังสือ จ้า' },
      { word: 'Ruler', meaning: 'ไม้บรรทัด', image: '📏', explanation: '📏 Ruler สะกดว่า R - U - L - E - R แปลว่า ไม้บรรทัด จ้า' },
      { word: 'Map', meaning: 'แผนที่', image: '🗺️', explanation: '🗺️ Map สะกดว่า M - A - P แปลว่า แผนที่ จ้า' },
      { word: 'Globe', meaning: 'ลูกโลก', image: '🌍', explanation: '🌍 Globe สะกดว่า G - L - O - B - E แปลว่า ลูกโลก จ้า' }
    ];
  }

  // เรนเดอร์การ์ดเตรียมสะกดใน Study Guide
  if (nodes.dictationWordsPreview) {
    nodes.dictationWordsPreview.innerHTML = '';
    dictationSessionList.forEach(item => {
      const card = document.createElement('div');
      card.className = 'dictation-preview-card';
      card.innerHTML = `
        <div class="dictation-preview-emoji">${item.image}</div>
        <div class="dictation-preview-details">
          <div class="dictation-preview-word">${item.word}</div>
          <div class="dictation-preview-meaning">${item.meaning}</div>
        </div>
      `;
      card.onclick = () => {
        // เล่นเสียงพูดเมื่อกดที่การ์ดเพื่อฝึกสะกด
        spellAndSpeak(item, null, 0.8);
      };
      nodes.dictationWordsPreview.appendChild(card);
    });
  }

  showDictationStudyScreen();
}

function showDictationStudyScreen() {
  stopAllSpeech();
  if (nodes.dictationStartScreen) nodes.dictationStartScreen.style.display = 'block';
  if (nodes.dictationPlayArea) nodes.dictationPlayArea.style.display = 'none';
  if (nodes.dictationResultScreen) nodes.dictationResultScreen.style.display = 'none';
}

function startDictationTest() {
  stopAllSpeech();
  
  if (nodes.dictationStartScreen) nodes.dictationStartScreen.style.display = 'none';
  if (nodes.dictationPlayArea) nodes.dictationPlayArea.style.display = 'block';
  if (nodes.dictationResultScreen) nodes.dictationResultScreen.style.display = 'none';

  // สุ่มคำศัพท์เพื่อให้เด็กไม่ได้จำลำดับการทำแบบทดสอบ
  dictationSessionList = [...dictationSessionList].sort(() => Math.random() - 0.5);
  currentDictationIndex = 0;
  dictationScore = 0;

  renderDictationQuestion();
}

function renderDictationQuestion() {
  stopAllSpeech();

  // อัปเดตข้อมูล UI ข้อปัจจุบัน
  const currentNumNode = document.getElementById('current-dictation-num');
  const currentScoreNode = document.getElementById('dictation-current-score');
  const progressBarNode = document.getElementById('dictation-progress-bar');

  if (currentNumNode) currentNumNode.textContent = currentDictationIndex + 1;
  if (currentScoreNode) currentScoreNode.textContent = dictationScore;

  const progressPct = (currentDictationIndex / 5) * 100;
  if (progressBarNode) progressBarNode.style.width = `${progressPct}%`;

  // แสดงคำแปลไทยเพื่อบอกคำใบ้
  const currentItem = dictationSessionList[currentDictationIndex];
  const meaningClueNode = document.getElementById('dictation-meaning-clue');
  if (meaningClueNode) {
    meaningClueNode.textContent = currentItem.meaning;
  }

  // ซ่อนรูปภาพด้วยเครื่องหมายคำถาม
  const visualClueNode = document.getElementById('dictation-visual-clue');
  if (visualClueNode) {
    visualClueNode.innerHTML = '❓';
  }

  // รีเซ็ตการสะกดอักษร
  resetDictationSpelling(currentItem);

  // เล่นเสียงทันทีเมื่อเริ่มข้อใหม่
  playDictationAudio(false);
}

function resetDictationSpelling(item) {
  if (!item) return;
  stopAllSpeech();
  
  dictationSelectedLetters = [];
  
  if (nodes.dictationFeedback) {
    nodes.dictationFeedback.innerHTML = '';
  }

  const dictationBox = document.getElementById('dictationBox');
  if (dictationBox) {
    dictationBox.classList.remove('dictation-shake');
    dictationBox.classList.remove('dictation-bounce');
  }

  // สร้างช่องว่างสะกดคำ (Slots)
  if (nodes.dictationSlots) {
    nodes.dictationSlots.innerHTML = '';
    for (let i = 0; i < item.word.length; i++) {
      const slot = document.createElement('div');
      if (item.word[i] === ' ') {
        slot.className = 'spelling-slot-space';
        slot.innerHTML = '&nbsp;';
        slot.dataset.isSpace = 'true';
      } else {
        slot.className = 'spelling-slot';
        slot.dataset.index = i;
      }
      nodes.dictationSlots.appendChild(slot);
    }
  }

  // สร้างปุ่มกดตัวอักษรแบบสุ่มสลับ (Scrambled Letters)
  if (nodes.dictationLetters) {
    nodes.dictationLetters.innerHTML = '';
    const correctLetters = item.word.split('').filter(c => c !== ' ');
    const scrambled = [...correctLetters].sort(() => Math.random() - 0.5);
    scrambled.forEach((letter) => {
      const btn = document.createElement('button');
      btn.className = 'letter-btn';
      btn.textContent = letter;
      btn.addEventListener('click', () => handleDictationLetterTap(letter, btn, item));
      nodes.dictationLetters.appendChild(btn);
    });
  }
}

function handleDictationLetterTap(letter, btn, item) {
  if (btn.disabled) return;

  // เล่นเสียงอักษรทันที
  speakEN(letter.toLowerCase(), 0.55);

  dictationSelectedLetters.push({ letter, btnEl: btn });
  btn.disabled = true;

  // เอาตัวอักษรไปใส่ในช่องว่างที่ว่างอยู่
  const unfilledSlots = Array.from(nodes.dictationSlots.children).filter(
    slot => !slot.dataset.isSpace && !slot.classList.contains('filled')
  );

  if (unfilledSlots.length > 0) {
    const targetSlot = unfilledSlots[0];
    targetSlot.textContent = letter;
    targetSlot.classList.add('filled');
  }

  // ตรวจสอบจำนวนอักษรที่กดสะกดเรียง
  const correctLettersCount = item.word.split('').filter(c => c !== ' ').length;
  if (dictationSelectedLetters.length === correctLettersCount) {
    // หน่วงเวลาสั้นๆ เพื่อให้เสียงพูดตัวอักษรสุดท้ายเล่นจบ
    setTimeout(() => {
      checkDictationSpelling(item);
    }, 600);
  }
}

function checkDictationSpelling(item) {
  // รวบรวมตัวอักษรจากกล่อง Slots เพื่อนำมารวมกันเป็นคำศัพท์
  const spelledWord = Array.from(nodes.dictationSlots.children).map(slot => {
    if (slot.dataset.isSpace) return ' ';
    return slot.textContent;
  }).join('');

  // ปิดปุ่มทั้งหมดในการ์ดสะกด
  if (nodes.dictationLetters) {
    Array.from(nodes.dictationLetters.children).forEach(btn => {
      btn.disabled = true;
    });
  }

  const dictationBox = document.getElementById('dictationBox');
  const visualClueNode = document.getElementById('dictation-visual-clue');

  if (spelledWord.toLowerCase() === item.word.toLowerCase()) {
    // สะกดถูกต้อง!
    dictationScore++;
    const currentScoreNode = document.getElementById('dictation-current-score');
    if (currentScoreNode) currentScoreNode.textContent = dictationScore;

    if (dictationBox) dictationBox.classList.add('dictation-bounce');
    if (nodes.dictationFeedback) {
      nodes.dictationFeedback.innerHTML = `<span class="correct">🎉 เก่งมากจ้า! สะกดถูกต้อง</span>`;
    }

    if (visualClueNode) {
      visualClueNode.innerHTML = item.image;
    }

    speakEN(item.word, 0.8);
    removeWeakWord(item.word);
  } else {
    // สะกดผิด
    if (dictationBox) dictationBox.classList.add('dictation-shake');
    if (nodes.dictationFeedback) {
      nodes.dictationFeedback.innerHTML = `<span class="wrong" style="color: var(--danger);">❌ ยังไม่ถูกน้า ตัวสะกดคือ "${item.word}"</span>`;
    }

    if (visualClueNode) {
      visualClueNode.innerHTML = item.image;
    }

    // สะกดให้ฟังอย่างละเอียด
    spellAndSpeak(item, null, 0.8);
    addWeakWord(item.word);
  }

  // อัปเดต Progress Bar สำหรับข้อปัจจุบัน
  const progressBarNode = document.getElementById('dictation-progress-bar');
  const progressPct = ((currentDictationIndex + 1) / 5) * 100;
  if (progressBarNode) progressBarNode.style.width = `${progressPct}%`;

  // หน่วงเวลา 4.2 วินาที ก่อนขยับข้อถัดไป เพื่อให้เด็กสังเกตคำสะกดเฉลยและฟังเสียงสะกดจนเสร็จสิ้น
  setTimeout(() => {
    currentDictationIndex++;
    if (currentDictationIndex < 5) {
      renderDictationQuestion();
    } else {
      showDictationResults();
    }
  }, 4200);
}

function playDictationAudio(slowMode = false) {
  const currentItem = dictationSessionList[currentDictationIndex];
  if (!currentItem) return;

  stopAllSpeech();

  if (slowMode) {
    // สะกดคำศัพท์ทีละตัวอักษรช้าๆ
    spellAndSpeak(currentItem, null, 0.45);
  } else {
    // ออกเสียงทั้งคำภาษาอังกฤษและตามด้วยความหมายไทยเป็นคำใบ้
    speakEN(currentItem.word, 0.75);
    setTimeout(() => {
      speakTH(currentItem.meaning);
    }, 1200);
  }
}

function showDictationResults() {
  stopAllSpeech();

  if (nodes.dictationPlayArea) nodes.dictationPlayArea.style.display = 'none';
  if (nodes.dictationResultScreen) nodes.dictationResultScreen.style.display = 'block';

  const resultScoreNode = document.getElementById('dictation-result-score');
  if (resultScoreNode) resultScoreNode.textContent = dictationScore;

  let msg = '';
  if (dictationScore === 5) {
    msg = 'ยอดเยี่ยมที่สุดเลยจ้า! สะกดเขียนคำถูกต้องครบถ้วนทุกข้อเลย 🏆🌟';
    speakTH('ยอดเยี่ยมที่สุดเลยจ้า สะกดเขียนคำถูกต้องครบถ้วนทุกข้อเลย');
  } else if (dictationScore >= 3) {
    msg = 'ดีมากเลยจ้า! น้องตอบถูกส่วนใหญ่ ฝึกฝนอีกนิดจะเก่งมากยิ่งขึ้นนะจ๊ะ 👍';
    speakTH('ดีมากเลยจ้า น้องตอบถูกส่วนใหญ่ ฝึกฝนอีกนิดจะเก่งมากยิ่งขึ้นนะจ๊ะ');
  } else {
    msg = 'พยายามต่อไปน้าคนเก่ง! หมั่นกลับไปทบทวนสะกดคำศัพท์แล้วมาเล่นใหม่จ้า ✏️';
    speakTH('พยายามต่อไปน้าคนเก่ง หมั่นกลับไปทบทวนสะกดคำศัพท์แล้วมาเล่นใหม่จ้า');
  }

  const resultMsgNode = document.getElementById('dictation-result-message');
  if (resultMsgNode) resultMsgNode.textContent = msg;

  saveDictationHistory(dictationScore);
}

function getDictationHistory() {
  const data = localStorage.getItem(DICTATION_STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Dictation history parse error', e);
    return [];
  }
}

function saveDictationHistory(score) {
  const history = getDictationHistory();
  const attempt = {
    score: score,
    date: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
    timestamp: Date.now(),
    round: selectedDictationRound
  };
  history.push(attempt);
  try {
    localStorage.setItem(DICTATION_STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Dictation history save error', e);
  }
}

// เรนเดอร์รายการสถิติการเขียนตามคำบอกลงใน Dashboard
function renderDictationHistoryInDashboard() {
  const history = getDictationHistory();
  const listNode = document.getElementById('dictation-history-list');
  const emptyNode = document.getElementById('dictation-history-empty');

  if (!listNode || !emptyNode) return;

  listNode.innerHTML = '';

  if (history.length === 0) {
    emptyNode.style.display = 'block';
    return;
  }

  emptyNode.style.display = 'none';

  // โชว์ประวัติโดยเอาการทำแบบทดสอบล่าสุดอยู่บนสุด
  const reversedHistory = [...history].reverse();
  reversedHistory.forEach(attempt => {
    const item = document.createElement('div');
    item.className = 'mini-stat-card';
    item.style.padding = '12px 16px';
    item.style.borderRadius = '12px';
    item.style.border = '1.5px solid #cbd5e1';
    item.style.background = '#ffffff';
    item.style.display = 'flex';
    item.style.justifyContent = 'space-between';
    item.style.alignItems = 'center';
    item.style.margin = '0';

    let stars = '';
    for (let s = 0; s < 5; s++) {
      stars += s < attempt.score ? '⭐' : '☆';
    }

    const roundName = attempt.round === 'r2' ? 'รอบที่ 2' : attempt.round === 'r3' ? 'รอบที่ 3' : 'รอบที่ 1';

    item.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">
        <span style="font-weight: 700; color: var(--dark-2); font-size: 0.95rem;">เขียนตามคำบอก ${roundName}</span>
        <span style="font-size: 0.75rem; color: var(--text-light);">${attempt.date} น.</span>
      </div>
      <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
        <span style="color: var(--accent-dark); font-weight: 700; font-size: 1.1rem; letter-spacing: 2px;">${stars}</span>
        <span style="font-size: 0.85rem; font-weight: 700; color: var(--primary-hover);">${attempt.score} / 5 คะแนน</span>
      </div>
    `;
    listNode.appendChild(item);
  });
}

function addWeakWord(wordText) {
  const list = getWeakWordList();
  if (!list.includes(wordText)) {
    list.push(wordText);
    saveWeakWordList(list);
  }
}

function removeWeakWord(wordText) {
  const list = getWeakWordList();
  const index = list.indexOf(wordText);
  if (index !== -1) {
    list.splice(index, 1);
    saveWeakWordList(list);
  }
}

window.deleteCustomVocab = deleteCustomVocab;

// --- AURA Kids Star System Functions ---
const STARS_STORAGE_KEY = 'aura_kids_total_stars_v1';

function initStarsSystem() {
  updateTotalStarsBadgeUI();
  
  // Setup reward store listeners
  // Changing the exchange rate is gated behind a parental lock so a child
  // cannot inflate the cash value of their stars on their own.
  const rateSelect = document.getElementById('exchange-rate-select');
  if (rateSelect) {
    let committedRate = getExchangeRate();
    rateSelect.addEventListener('change', (e) => {
      const newRate = parseInt(e.target.value, 10);
      if (newRate === committedRate) return;

      const ok = verifyParentalAccess('การเปลี่ยนอัตราการแลกรางวัลต้องได้รับอนุญาตจากผู้ปกครองนะจ๊ะ');
      if (!ok) {
        // Revert the dropdown to the previously committed rate
        e.target.value = committedRate;
        updateRateDisplayText(committedRate);
        alert('🔒 ยังไม่ได้เปลี่ยนอัตราการแลกนะคะ ต้องให้คุณพ่อคุณแม่ยืนยันก่อนจ้า');
        return;
      }

      committedRate = newRate;
      saveExchangeRate(newRate);
      updateRateDisplayText(newRate);
      updateRedeemPreview();
    });
  }
  
  const starsInput = document.getElementById('redeem-stars-input');
  if (starsInput) {
    starsInput.addEventListener('input', () => {
      updateRedeemPreview();
    });
  }
  
  const refreshLockBtn = document.getElementById('btn-refresh-lock');
  if (refreshLockBtn) {
    refreshLockBtn.addEventListener('click', () => {
      generateParentLockQuestion();
      const answerInput = document.getElementById('lock-answer-input');
      if (answerInput) answerInput.value = '';
    });
  }
  
  const redeemForm = document.getElementById('reward-redeem-form');
  if (redeemForm) {
    redeemForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleRedeemSubmit();
    });
  }
}

// Calculate stars based on accuracy percentage so it scales to any quiz length
// (10 questions: 10/10=3⭐, 8/10=2⭐, 5/10=1⭐ — same as before; 20 questions now fair too)
function calculateStarsEarned(correctCount, totalQuestions) {
  if (!totalQuestions || totalQuestions <= 0) return 0;
  const ratio = correctCount / totalQuestions;
  if (ratio >= 1) return 3;
  if (ratio >= 0.8) return 2;
  if (ratio >= 0.5) return 1;
  return 0;
}

function getTotalStars() {
  const stars = localStorage.getItem(STARS_STORAGE_KEY);
  return stars ? parseInt(stars, 10) : 0;
}

function addStars(count) {
  if (count <= 0) return;
  const current = getTotalStars();
  localStorage.setItem(STARS_STORAGE_KEY, current + count);
  updateTotalStarsBadgeUI();
}

function updateTotalStarsBadgeUI() {
  const countEl = document.getElementById('total-stars-count');
  if (countEl) {
    countEl.textContent = getTotalStars();
  }
}

// Confetti Particle Explosion
function spawnStarConfetti(x, y, count = 30) {
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'star-particle';
    p.textContent = ['⭐', '✨', '💛', '🌟'][Math.floor(Math.random() * 4)];
    
    // Random direction and distances
    const angle = Math.random() * Math.PI * 2;
    const distance = 50 + Math.random() * 200;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance - (50 + Math.random() * 100); // bias upwards
    
    const duration = 0.8 + Math.random() * 0.8;
    const scale = 0.5 + Math.random() * 1.2;
    const rot = -180 + Math.random() * 360;
    
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.setProperty('--tx', `${tx}px`);
    p.style.setProperty('--ty', `${ty}px`);
    p.style.setProperty('--duration', `${duration}s`);
    p.style.setProperty('--scale', scale);
    p.style.setProperty('--rot', `${rot}deg`);
    
    document.body.appendChild(p);
    
    // Remove particle after animation ends
    setTimeout(() => {
      p.remove();
    }, duration * 1000);
  }
}

// Click to trigger fun confetti on badge
window.celebrateStars = function() {
  const badge = document.getElementById('total-stars-badge');
  if (badge) {
    const rect = badge.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    spawnStarConfetti(x, y, 20);
    
    // Play quick star sound or speech
    stopAllSpeech();
    const stars = getTotalStars();
    if (stars === 0) {
      speakTH(`ตอนนี้น้องยังไม่มีดาวสะสมจ้า มาทำข้อสอบเพื่อเก็บดาวกันนะ!`);
    } else {
      speakTH(`เก่งมากเลยจ้า ตอนนี้น้องสะสมดาวได้ทั้งหมด ${stars} ดวงแล้วนะจ๊ะ!`);
    }
  }
};

// Celebrate Quiz Results
function celebrateQuizResult(correctCount, starsEarned) {
  // Center of screen confetti burst
  const x = window.innerWidth / 2;
  const y = window.innerHeight / 2 - 100;
  
  if (currentUnitId === 'midterm_prep') {
    // Grand celebration for midterm exam prep completion!
    spawnStarConfetti(x - 120, y, 25);
    spawnStarConfetti(x + 120, y, 25);
    setTimeout(() => spawnStarConfetti(x, y - 60, 35), 250);
    setTimeout(() => spawnStarConfetti(x, y, 20), 500);
    
    stopAllSpeech();
    playFeedbackSounds([
      makeUtterance('เย้! สอบจำลองกลางภาคสำเร็จแล้วค่ะ', 'th-TH', 1),
      makeUtterance(`น้องตอบถูก ${correctCount} จาก ${challengeQuestions.length} ข้อ และได้รับโบนัสดาวทองคำพิเศษ 20 ดวงสำหรับความพยายามสะสมไปเลยจ้า!`, 'th-TH', 1)
    ]);
    return;
  }
  
  if (starsEarned === 3) {
    // 3 bursts for perfect score
    spawnStarConfetti(x - 100, y, 20);
    spawnStarConfetti(x + 100, y, 20);
    setTimeout(() => spawnStarConfetti(x, y - 50, 30), 300);
    
    stopAllSpeech();
    playFeedbackSounds([
      makeUtterance('ไชโย! เก่งที่สุดเลยค่ะ', 'th-TH', 1),
      makeUtterance(`น้องตอบถูกทั้งหมด ${correctCount} ข้อเต็ม และได้รับดาวทอง 3 ดวงสะสมไปเลยจ้า!`, 'th-TH', 1)
    ]);
  } else if (starsEarned === 2) {
    spawnStarConfetti(x, y, 25);
    stopAllSpeech();
    playFeedbackSounds([
      makeUtterance('เก่งมากค่ะ', 'th-TH', 1),
      makeUtterance(`น้องได้รับดาวทอง 2 ดวงสะสมเพิ่มจ้า พยายามต่อไปนะจ๊ะ!`, 'th-TH', 1)
    ]);
  } else if (starsEarned === 1) {
    spawnStarConfetti(x, y, 15);
    stopAllSpeech();
    playFeedbackSounds([
      makeUtterance('เยี่ยมเลยค่ะ', 'th-TH', 1),
      makeUtterance(`น้องได้รับดาวทอง 1 ดวงสะสมเพิ่มจ้า รอบหน้าสู้ใหม่นะจ๊ะ!`, 'th-TH', 1)
    ]);
  } else {
    stopAllSpeech();
    speakTH(`ตอบถูก ${correctCount} ข้อ รอบหน้าพยายามอีกนิดเพื่อเก็บดาวนะจ๊ะเด็กๆ!`);
  }
}

// --- AURA Kids Reward Store System ---
const REDEEM_LOG_STORAGE_KEY = 'aura_kids_redeem_log_v1';
const EXCHANGE_RATE_STORAGE_KEY = 'aura_kids_exchange_rate_v1';
let currentParentLockAnswer = 0;

function getExchangeRate() {
  const rate = localStorage.getItem(EXCHANGE_RATE_STORAGE_KEY);
  return rate ? parseInt(rate, 10) : 1; // Default: 1 star = 1 THB
}

function saveExchangeRate(rate) {
  localStorage.setItem(EXCHANGE_RATE_STORAGE_KEY, rate);
}

function getRedeemLog() {
  const data = localStorage.getItem(REDEEM_LOG_STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Redeem log parse error', e);
    return [];
  }
}

function saveRedeemLog(log) {
  localStorage.setItem(REDEEM_LOG_STORAGE_KEY, JSON.stringify(log));
}

// Render the Reward Store
function renderRewardsStore() {
  // Update stars count
  const stars = getTotalStars();
  const starsCountEl = document.getElementById('rewards-stars-count');
  if (starsCountEl) starsCountEl.textContent = stars;
  
  // Set current exchange rate selection
  const rate = getExchangeRate();
  const selectEl = document.getElementById('exchange-rate-select');
  if (selectEl) {
    selectEl.value = rate;
  }
  
  // Update exchange rate label text
  updateRateDisplayText(rate);
  
  // Reset fields
  const starsInput = document.getElementById('redeem-stars-input');
  if (starsInput) {
    starsInput.value = '';
    starsInput.max = stars;
  }
  
  const previewText = document.getElementById('exchange-preview-text');
  if (previewText) previewText.textContent = '';
  
  const answerInput = document.getElementById('lock-answer-input');
  if (answerInput) answerInput.value = '';
  
  // Generate lock question
  generateParentLockQuestion();
  
  // Render table
  renderRedeemHistoryTable();
}

// Build a standalone parental math challenge (for prompt-based locks)
function makeParentalMathChallenge() {
  const isMultiplication = Math.random() < 0.5;
  if (isMultiplication) {
    const a = 2 + Math.floor(Math.random() * 8); // 2 to 9
    const b = 3 + Math.floor(Math.random() * 7); // 3 to 9
    return { text: `${a} × ${b}`, answer: a * b };
  }
  const a = 11 + Math.floor(Math.random() * 30); // 11 to 40
  const b = 12 + Math.floor(Math.random() * 30); // 12 to 41
  return { text: `${a} + ${b}`, answer: a + b };
}

// Verify the person is an adult via a quick math challenge.
// Returns true only when the math answer is correct; false on wrong answer or cancel.
function verifyParentalAccess(reason) {
  const challenge = makeParentalMathChallenge();
  const input = prompt(`🔒 ${reason}\n\nให้คุณพ่อคุณแม่ช่วยตอบโจทย์เลขนี้เพื่อยืนยันค่ะ\n\n${challenge.text} = ?`);
  if (input === null) return false; // cancelled
  return parseInt(input, 10) === challenge.answer;
}

// Generate Parental Lock Math Question
function generateParentLockQuestion() {
  const questionEl = document.getElementById('lock-question');
  if (!questionEl) return;
  
  // Random simple multiplication or addition
  const isMultiplication = Math.random() < 0.5;
  if (isMultiplication) {
    const a = 2 + Math.floor(Math.random() * 8); // 2 to 9
    const b = 3 + Math.floor(Math.random() * 7); // 3 to 9
    questionEl.textContent = `${a} x ${b} = ?`;
    currentParentLockAnswer = a * b;
  } else {
    const a = 11 + Math.floor(Math.random() * 30); // 11 to 40
    const b = 12 + Math.floor(Math.random() * 30); // 12 to 41
    questionEl.textContent = `${a} + ${b} = ?`;
    currentParentLockAnswer = a + b;
  }
}

function updateRateDisplayText(rate) {
  const displayText = document.getElementById('rate-display-text');
  if (displayText) {
    displayText.textContent = `1 ดาว = ${rate} บาท`;
  }
}

function updateRedeemPreview() {
  const starsInput = document.getElementById('redeem-stars-input');
  const previewText = document.getElementById('exchange-preview-text');
  if (!starsInput || !previewText) return;
  
  const starsToRedeem = parseInt(starsInput.value, 10);
  if (isNaN(starsToRedeem) || starsToRedeem <= 0) {
    previewText.textContent = '';
    return;
  }
  
  const totalStars = getTotalStars();
  if (starsToRedeem > totalStars) {
    previewText.textContent = `❌ ยอดดาวทองไม่เพียงพอจ้า (มีอยู่ ${totalStars} ดวง)`;
    previewText.style.color = '#ef4444';
    return;
  }
  
  const rate = getExchangeRate();
  const amount = starsToRedeem * rate;
  previewText.textContent = `💰 แลกเงินรางวัลได้ทั้งหมด: ${amount} บาทจ้า!`;
  previewText.style.color = '#16a34a';
}

function handleRedeemSubmit() {
  const starsInput = document.getElementById('redeem-stars-input');
  const answerInput = document.getElementById('lock-answer-input');
  if (!starsInput || !answerInput) return;
  
  const starsToRedeem = parseInt(starsInput.value, 10);
  const totalStars = getTotalStars();
  
  if (isNaN(starsToRedeem) || starsToRedeem <= 0) {
    alert('กรุณากรอกจำนวนดาวที่จะแลกให้ถูกต้องนะจ๊ะ');
    return;
  }
  
  if (starsToRedeem > totalStars) {
    alert(`ยอดดาวทองสะสมไม่พอจ้า ตอนนี้น้องมีอยู่ ${totalStars} ดวง`);
    return;
  }
  
  // Verify Parental Lock Answer
  const parentAnswer = parseInt(answerInput.value, 10);
  if (parentAnswer !== currentParentLockAnswer) {
    alert('🔒 คำตอบวิเคราะห์โจทย์เลขไม่ถูกต้องจ้า! ให้คุณพ่อคุณแม่ช่วยคิดคำนวณและกดยืนยันนะจ๊ะ');
    generateParentLockQuestion();
    answerInput.value = '';
    return;
  }
  
  // Process Redeem
  const rate = getExchangeRate();
  const amount = starsToRedeem * rate;
  
  // Deduct stars
  subtractStars(starsToRedeem);
  
  // Add to log
  const now = new Date();
  const dateTimeStr = now.toLocaleDateString('th-TH') + ' ' + now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  const logItem = {
    dateTime: dateTimeStr,
    starsRedeemed: starsToRedeem,
    amountEarned: amount,
    paid: false
  };
  
  const log = getRedeemLog();
  log.unshift(logItem); // Add to beginning
  saveRedeemLog(log);
  
  // Refresh Store UI
  renderRewardsStore();
  updateTotalStarsBadgeUI();
  
  // Confetti celebration
  const redeemBtn = document.getElementById('btn-redeem-submit');
  if (redeemBtn) {
    const rect = redeemBtn.getBoundingClientRect();
    spawnStarConfetti(rect.left + rect.width/2, rect.top + rect.height/2, 30);
  }
  
  stopAllSpeech();
  playFeedbackSounds([
    makeUtterance('ยินดีด้วยค่ะ แลกรางวัลสำเร็จแล้วนะจ๊ะ', 'th-TH', 1),
    makeUtterance(`น้องหักดาวทอง ${starsToRedeem} ดวง แลกเป็นเงินรางวัล ${amount} บาทสำเร็จแล้วจ้า คุณพ่อคุณแม่เตรียมรับรองและจ่ายเงินสดให้น้องด้วยนะจ๊ะ`, 'th-TH', 1)
  ]);
}

function subtractStars(count) {
  if (count <= 0) return;
  const current = getTotalStars();
  const next = Math.max(0, current - count);
  localStorage.setItem(STARS_STORAGE_KEY, next);
  updateTotalStarsBadgeUI();
}

// Render Redemption History Table
function renderRedeemHistoryTable() {
  const tbody = document.getElementById('rewards-history-tbody');
  const emptyState = document.getElementById('rewards-history-empty');
  if (!tbody || !emptyState) return;
  
  tbody.innerHTML = '';
  const log = getRedeemLog();
  
  if (log.length === 0) {
    emptyState.style.display = 'block';
    tbody.parentElement.style.display = 'none';
    return;
  }
  
  emptyState.style.display = 'none';
  tbody.parentElement.style.display = 'table';
  
  log.forEach((item, idx) => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid #e2e8f0';
    tr.style.height = '48px';
    
    // Status Badge
    let statusClass = 'status-unpaid';
    let statusText = '❌ ค้างจ่ายเงิน';
    if (item.paid) {
      statusClass = 'status-paid';
      statusText = '✅ จ่ายแล้ว';
    }
    
    tr.innerHTML = `
      <td style="padding: 10px; color: var(--text-muted); font-size: 0.85rem;">${item.dateTime}</td>
      <td style="padding: 10px; text-align: center; font-weight: 700; color: #d97706;">⭐ ${item.starsRedeemed} ดวง</td>
      <td style="padding: 10px; text-align: center; font-weight: 800; color: #16a34a;">${item.amountEarned} บาท</td>
      <td style="padding: 10px; text-align: center;">
        <span class="${statusClass}" onclick="toggleRedeemPaidStatus(${idx})">${statusText}</span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Toggle paid status
window.toggleRedeemPaidStatus = function(idx) {
  const log = getRedeemLog();
  if (log[idx]) {
    log[idx].paid = !log[idx].paid;
    saveRedeemLog(log);
    renderRedeemHistoryTable();
    
    // Voice feedback when changing status
    stopAllSpeech();
    if (log[idx].paid) {
      speakTH(`จ่ายเงินรางวัล ${log[idx].amountEarned} บาท ให้น้องเสร็จสิ้นเรียบร้อยแล้วค่ะ`);
    } else {
      speakTH(`เปลี่ยนสถานะเป็นค้างจ่ายเงินรางวัลค่ะ`);
    }
  }
};
