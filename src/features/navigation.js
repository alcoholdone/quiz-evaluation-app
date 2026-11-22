import { state, nodes, clearScopedTimers } from '../state/store.js';
import { stopAllSpeech } from '../services/speech.js';
import { clearTransitionTimeout, pauseTimer, resumeTimer } from './game.js';
import { updateGameStartMeta } from './catalog.js';
import { initDictationStudyMode } from './dictation.js';
import { initSpecialPanel } from './special.js';
import { renderDashboard } from './dashboard.js';

// MAIN TAB SWITCHING
export function switchTab(tabId) {
  clearTransitionTimeout();
  clearScopedTimers('dictation');
  clearScopedTimers('special');
  clearScopedTimers('spelling');
  clearScopedTimers('review');
  if (state.spAutoAdvanceTimer) {
    clearTimeout(state.spAutoAdvanceTimer);
    state.spAutoAdvanceTimer = null;
  }
  stopAllSpeech();
  state.activeTab = tabId;

  // Update Tab buttons
  nodes.tabLearn.classList.remove('active');
  nodes.tabGame.classList.remove('active');
  if (nodes.tabDictation) nodes.tabDictation.classList.remove('active');
  if (nodes.tabSpecial) nodes.tabSpecial.classList.remove('active');
  nodes.tabDashboard.classList.remove('active');

  nodes.tabLearn.setAttribute('aria-selected', 'false');
  nodes.tabGame.setAttribute('aria-selected', 'false');
  if (nodes.tabDictation) nodes.tabDictation.setAttribute('aria-selected', 'false');
  if (nodes.tabSpecial) nodes.tabSpecial.setAttribute('aria-selected', 'false');
  nodes.tabDashboard.setAttribute('aria-selected', 'false');

  // Update Panels
  nodes.panelLearn.classList.remove('active');
  nodes.panelGame.classList.remove('active');
  if (nodes.panelDictation) nodes.panelDictation.classList.remove('active');
  if (nodes.panelSpecial) nodes.panelSpecial.classList.remove('active');
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
    if (state.challengeQuestions.length === 0 || state.hasCompletedAssessment) {
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
  } else if (tabId === 'special') {
    if (nodes.tabSpecial) {
      nodes.tabSpecial.classList.add('active');
      nodes.tabSpecial.setAttribute('aria-selected', 'true');
    }
    if (nodes.panelSpecial) nodes.panelSpecial.classList.add('active');
    pauseTimer();
    initSpecialPanel();
  } else if (tabId === 'dashboard') {
    nodes.tabDashboard.classList.add('active');
    nodes.tabDashboard.setAttribute('aria-selected', 'true');
    nodes.panelDashboard.classList.add('active');
    pauseTimer();

    // Render Dashboard
    renderDashboard();
  }
}
