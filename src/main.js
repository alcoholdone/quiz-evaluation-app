import { state, nodes, initNodes } from './state/store.js';
import {
  initSpeechEngine,
  stopAllSpeech,
  speakEN,
  spellAndSpeak,
  testAndResetVoice
} from './services/speech.js';
import { switchTab } from './features/navigation.js';
import { initCustomVocabData, loadUnitVocab } from './features/catalog.js';
import { resetSpellingPractice, closeSpellingPractice } from './features/learn.js';
import { startNewChallenge, skipQuestion } from './features/game.js';
import {
  updateDictationRound,
  showDictationStudyScreen,
  startDictationTest,
  resetDictationSpelling,
  playDictationAudio
} from './features/dictation.js';
import { switchSpecialActivity, nextSpQuestion } from './features/special.js';
import { switchDashboardTab, clearHistoryData } from './features/dashboard.js';
import { setupVocabAddForm, deleteCustomVocab } from './features/vocab-manager.js';
import { celebrateStars, toggleRedeemPaidStatus } from './features/rewards.js';

export function setupEventListeners() {
  // Main Tab Navigation
  nodes.tabLearn.addEventListener('click', () => switchTab('learn'));
  nodes.tabGame.addEventListener('click', () => switchTab('game'));
  nodes.tabDashboard.addEventListener('click', () => switchTab('dashboard'));
  if (nodes.tabSpecial) nodes.tabSpecial.addEventListener('click', () => switchTab('special'));
  if (nodes.tabDictation) nodes.tabDictation.addEventListener('click', () => switchTab('dictation'));

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
      if (state.currentPracticeItem) resetSpellingPractice(state.currentPracticeItem);
    });
  }
  if (nodes.btnRepeatSound) {
    nodes.btnRepeatSound.addEventListener('click', () => {
      if (state.currentPracticeItem) spellAndSpeak(state.currentPracticeItem, null, 0.8);
    });
  }

  // Parent Vocab add Form Submit
  setupVocabAddForm();

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
      const currentItem = state.dictationSessionList[state.currentDictationIndex];
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
  const btnR1 = document.getElementById('btn-dictation-r1');
  const btnR2 = document.getElementById('btn-dictation-r2');
  const btnR3 = document.getElementById('btn-dictation-r3');
  const btnR4 = document.getElementById('btn-dictation-r4');
  const btnR5 = document.getElementById('btn-dictation-r5');
  const btnR6 = document.getElementById('btn-dictation-r6');
  if (btnR1) btnR1.addEventListener('click', () => updateDictationRound('r1'));
  if (btnR2) btnR2.addEventListener('click', () => updateDictationRound('r2'));
  if (btnR3) btnR3.addEventListener('click', () => updateDictationRound('r3'));
  if (btnR4) btnR4.addEventListener('click', () => updateDictationRound('r4'));
  if (btnR5) btnR5.addEventListener('click', () => updateDictationRound('r5'));
  if (btnR6) btnR6.addEventListener('click', () => updateDictationRound('r6'));

  // Unit 5 Exam Study Guide buttons
  const btnGoUnit5Exam = document.getElementById('btn-go-unit5-exam');
  if (btnGoUnit5Exam) {
    btnGoUnit5Exam.addEventListener('click', () => {
      loadUnitVocab('unit5_exam');
      switchTab('game');
    });
  }
  document.querySelectorAll('.u5-example-speak').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.getAttribute('data-text');
      if (text) {
        stopAllSpeech();
        speakEN(text, 0.8);
      }
    });
  });
}

export function bootstrapApp() {
  initNodes();
  initSpeechEngine();

  // Compatibility bridges for inline HTML onclick handlers and src/services/sync.js
  if (typeof window !== 'undefined') {
    window.switchTab = switchTab;
    window.testAndResetVoice = testAndResetVoice;
    window.celebrateStars = celebrateStars;
    window.deleteCustomVocab = deleteCustomVocab;
    window.toggleRedeemPaidStatus = toggleRedeemPaidStatus;
    window.switchSpecialActivity = switchSpecialActivity;
    window.nextSpQuestion = nextSpQuestion;
  }

  initCustomVocabData();
  setupEventListeners();
}

if (typeof document !== 'undefined' && typeof window !== 'undefined' && !window.__QUIZ_TEST_ENV__) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapApp);
  } else {
    bootstrapApp();
  }
}
