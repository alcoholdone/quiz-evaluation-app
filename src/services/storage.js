import { STORAGE_KEYS, state } from '../state/store.js';

export function getHistory() {
  const data = localStorage.getItem(`${STORAGE_KEYS.HISTORY}_${state.currentUnitId}`);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('History parse error', e);
    return [];
  }
}

export function saveHistory(score, duration) {
  const history = getHistory();
  const finalTestBtn = document.getElementById('quiz-length-final');
  const isFinal = (finalTestBtn && finalTestBtn.classList.contains('active')) || state.challengeQuestions.length > 10;
  const attempt = {
    score: score,
    date: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
    duration: duration,
    timestamp: Date.now(),
    questionsCount: state.challengeQuestions.length,
    isFinalTest: isFinal
  };
  history.push(attempt);
  try {
    localStorage.setItem(`${STORAGE_KEYS.HISTORY}_${state.currentUnitId}`, JSON.stringify(history));
  } catch (e) {
    console.error('History save error', e);
  }
}

export function saveReviewSnapshot() {
  if (state.challengeQuestions.length === 0) return;
  try {
    const snapshot = { questions: state.challengeQuestions, answers: state.userAnswers };
    localStorage.setItem(`${STORAGE_KEYS.REVIEW_SNAPSHOT}_${state.currentUnitId}`, JSON.stringify(snapshot));
  } catch (e) {
    console.error('Review snapshot save error', e);
  }
}

export function getReviewSnapshot() {
  const data = localStorage.getItem(`${STORAGE_KEYS.REVIEW_SNAPSHOT}_${state.currentUnitId}`);
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

export function clearUnitHistory() {
  try {
    localStorage.removeItem(`${STORAGE_KEYS.HISTORY}_${state.currentUnitId}`);
    localStorage.removeItem(`${STORAGE_KEYS.REVIEW_SNAPSHOT}_${state.currentUnitId}`);
  } catch (e) {
    console.error('History clear error', e);
  }
}

export function getCustomVocabList() {
  const data = localStorage.getItem(`${STORAGE_KEYS.CUSTOM_VOCAB}_${state.currentUnitId}`);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Custom list parse error', e);
    return [];
  }
}

export function saveCustomVocabList(list) {
  localStorage.setItem(`${STORAGE_KEYS.CUSTOM_VOCAB}_${state.currentUnitId}`, JSON.stringify(list));
}

export function getWeakWordList() {
  const data = localStorage.getItem(STORAGE_KEYS.WEAK_WORDS);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Weak list parse error', e);
    return [];
  }
}

export function saveWeakWordList(list) {
  localStorage.setItem(STORAGE_KEYS.WEAK_WORDS, JSON.stringify(list));
}

export function addWeakWord(wordText) {
  const list = getWeakWordList();
  if (!list.includes(wordText)) {
    list.push(wordText);
    saveWeakWordList(list);
  }
}

export function removeWeakWord(wordText) {
  const list = getWeakWordList();
  const index = list.indexOf(wordText);
  if (index !== -1) {
    list.splice(index, 1);
    saveWeakWordList(list);
  }
}

export function getDictationHistory() {
  const data = localStorage.getItem(STORAGE_KEYS.DICTATION_HISTORY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Dictation history parse error', e);
    return [];
  }
}

export function saveDictationHistory(score) {
  const history = getDictationHistory();
  const attempt = {
    score: score,
    total: state.dictationSessionList.length || 5,
    date: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
    timestamp: Date.now(),
    round: state.selectedDictationRound
  };
  history.push(attempt);
  try {
    localStorage.setItem(STORAGE_KEYS.DICTATION_HISTORY, JSON.stringify(history));
  } catch (e) {
    console.error('Dictation history save error', e);
  }
}

export function getTotalStars() {
  const stars = localStorage.getItem(STORAGE_KEYS.TOTAL_STARS);
  return stars ? parseInt(stars, 10) : 0;
}

export function addStars(count) {
  if (count <= 0) return getTotalStars();
  const next = getTotalStars() + count;
  localStorage.setItem(STORAGE_KEYS.TOTAL_STARS, next);
  return next;
}

export function subtractStars(count) {
  if (count <= 0) return getTotalStars();
  const next = Math.max(0, getTotalStars() - count);
  localStorage.setItem(STORAGE_KEYS.TOTAL_STARS, next);
  return next;
}

export function getExchangeRate() {
  const rate = localStorage.getItem(STORAGE_KEYS.EXCHANGE_RATE);
  return rate ? parseInt(rate, 10) : 1; // Default: 1 star = 1 THB
}

export function saveExchangeRate(rate) {
  localStorage.setItem(STORAGE_KEYS.EXCHANGE_RATE, rate);
}

export function getRedeemLog() {
  const data = localStorage.getItem(STORAGE_KEYS.REDEEM_LOG);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Redeem log parse error', e);
    return [];
  }
}

export function saveRedeemLog(log) {
  localStorage.setItem(STORAGE_KEYS.REDEEM_LOG, JSON.stringify(log));
}

export function saveSpecialScore(activity, score, total) {
  const key = `${STORAGE_KEYS.SPECIAL_PRACTICE}_unit3`;
  let data = {};
  try { data = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { data = {}; }
  const dateStr = new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
  data[`activity${activity}`] = { score, total, date: dateStr };
  localStorage.setItem(key, JSON.stringify(data));
}

export function getSpecialScores() {
  const key = `${STORAGE_KEYS.SPECIAL_PRACTICE}_unit3`;
  try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { return {}; }
}
