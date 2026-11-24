// LocalStorage keys (must stay identical for existing user data & Firestore cloud sync)
export const STORAGE_KEYS = {
  HISTORY: 'aura_kids_vocab_history_v1',
  WEAK_WORDS: 'aura_kids_trouble_words_v1',
  CUSTOM_VOCAB: 'aura_kids_custom_vocab_v1',
  REVIEW_SNAPSHOT: 'aura_kids_last_review_v1',
  DICTATION_HISTORY: 'aura_kids_dictation_history_v1',
  TOTAL_STARS: 'aura_kids_total_stars_v1',
  REDEEM_LOG: 'aura_kids_redeem_log_v1',
  EXCHANGE_RATE: 'aura_kids_exchange_rate_v1',
  SPECIAL_PRACTICE: 'aura_kids_special_practice_v1'
};

// Centralized mutable app state
export const state = {
  // Game & Evaluation State
  activeTab: 'learn',
  currentQuestionIndex: 0,
  challengeQuestions: [],
  userAnswers: [],
  questionTimeSpent: [],
  questionStartTime: null,
  gameTimerInterval: null,
  gameTotalSeconds: 0,
  hasCompletedAssessment: false,
  questionTransitionTimeout: null,
  selectedGameMode: 'mixed', // 'mixed' or 'qa'

  // Spelling Practice Modal State
  currentPracticeItem: null,
  practiceSelectedLetters: [],
  isSpellingSuccess: false,
  spellingSessionToken: 0,

  // Dictation Global State
  currentDictationIndex: 0,
  dictationScore: 0,
  dictationSessionList: [],
  dictationSelectedLetters: [],
  selectedDictationRound: 'r6',
  dictationSessionToken: 0,

  // Chart.js instances
  skillsChart: null,
  trendChart: null,

  // Vocabulary & Catalog State
  ORIGINAL_VOCAB_LIST: [],
  VOCAB_LIST: [],
  currentTerm: 2,
  currentUnitId: 'unit_6',
  quizQuestionCount: 10,
  learnCategoryFilter: 'all',

  // Rewards Store State
  currentParentLockAnswer: 0,

  // Special Practice State (Unit 3)
  spCurrentActivity: 1, // 1–4
  spCurrentIndex: 0,
  spQuestions: [],
  spScore: 0,
  spTotal: 0,
  spAnswered: false,
  spCurrentChoices: [],
  spCurrentCorrect: '',
  spAutoAdvanceTimer: null
};

// Scoped Timer Registry (prevents leaked timeouts across tabs/modals)
const scopedTimers = new Map();

export function registerTimeout(scope, fn, ms) {
  if (!scopedTimers.has(scope)) {
    scopedTimers.set(scope, new Set());
  }
  const bucket = scopedTimers.get(scope);
  const id = setTimeout(() => {
    bucket.delete(id);
    fn();
  }, ms);
  bucket.add(id);
  return id;
}

export function clearScopedTimers(scope) {
  const bucket = scopedTimers.get(scope);
  if (!bucket) return;
  for (const id of bucket) {
    clearTimeout(id);
  }
  bucket.clear();
}

export function clearAllScopedTimers() {
  for (const scope of scopedTimers.keys()) {
    clearScopedTimers(scope);
  }
}

// Cached DOM nodes (populated during initNodes(), never at module load)
export const nodes = {};

export function initNodes() {
  Object.assign(nodes, {
    tabLearn: document.getElementById('tab-learn'),
    tabGame: document.getElementById('tab-game'),
    tabDashboard: document.getElementById('tab-dashboard'),

    panelLearn: document.getElementById('learn-panel'),
    panelGame: document.getElementById('game-panel'),
    panelDashboard: document.getElementById('dashboard-panel'),

    dbEmptyState: document.getElementById('dashboard-empty-state'),
    dbContent: document.getElementById('dashboard-content'),

    currentNum: document.getElementById('current-game-num'),
    totalNum: document.getElementById('total-game-num'),
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
    btnDictationBackHome: document.getElementById('btn-dictation-back-home'),

    // Special Practice Elements
    tabSpecial: document.getElementById('tab-special'),
    panelSpecial: document.getElementById('special-panel'),
    specialPlayArea: document.getElementById('special-play-area'),

    // Learn Filter Bar
    learnCategoryFilter: document.getElementById('learn-category-filter')
  });
  return nodes;
}
