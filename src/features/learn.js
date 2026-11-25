import { state, nodes, registerTimeout, clearScopedTimers } from '../state/store.js';
import { stopAllSpeech, speakEN, speakTH, spellAndSpeak } from '../services/speech.js';
import { getWeakWordList } from '../services/storage.js';
import { escapeHTML, renderVisualHTML } from '../utils/sanitize.js';
import { shuffleScrambled } from '../utils/shuffle.js';
import { isSeparatorChar } from '../utils/word-helpers.js';

const CATEGORY_DEFS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'noun', label: 'คำนาม (n)' },
  { key: 'verb', label: 'คำกริยา (v)' },
  { key: 'adj', label: 'คำคุณศัพท์ (adj)' },
  { key: 'prep', label: 'คำบุพบท (prep)' },
  { key: 'command', label: 'ประโยคคำสั่ง' },
  { key: 'other', label: 'เพิ่มเติม' }
];

export function getWordCategory(item) {
  if (!item) return 'other';
  if (item.type === 'command' || item.label === 'phrase') return 'command';
  if (item.label === 'n') return 'noun';
  if (item.label && item.label.startsWith('v')) return 'verb';
  if (item.label === 'adj') return 'adj';
  if (item.label === 'prep') return 'prep';
  return 'other';
}

export function setLearnCategoryFilter(categoryKey) {
  state.learnCategoryFilter = categoryKey || 'all';
  initLearnMode();
}

export function renderLearnCategoryFilter(weakSet) {
  const bar = nodes.learnCategoryFilter || document.getElementById('learn-category-filter');
  if (!bar) return;

  const list = state.VOCAB_LIST || [];
  const counts = {
    all: list.length,
    noun: 0,
    verb: 0,
    adj: 0,
    prep: 0,
    command: 0,
    other: 0,
    weak: 0
  };

  list.forEach(item => {
    const cat = getWordCategory(item);
    if (counts[cat] !== undefined) counts[cat]++;
    if (weakSet && item.word && weakSet.has(item.word.toLowerCase())) {
      counts.weak++;
    }
  });

  bar.innerHTML = '';

  const chipsToShow = CATEGORY_DEFS.filter(def => def.key === 'all' || counts[def.key] > 0);
  if (counts.weak > 0) {
    chipsToShow.push({ key: 'weak', label: '⭐ คำที่ต้องทบทวน', isWeak: true });
  }

  chipsToShow.forEach(def => {
    const isActive = state.learnCategoryFilter === def.key;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `filter-chip${def.isWeak ? ' filter-chip--weak' : ''}${isActive ? ' active' : ''}`;
    btn.dataset.category = def.key;
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    btn.innerHTML = `${escapeHTML(def.label)} <span class="chip-count">${counts[def.key]}</span>`;
    btn.addEventListener('click', () => setLearnCategoryFilter(def.key));
    bar.appendChild(btn);
  });
}

function getPosBadgeClass(item) {
  const cat = getWordCategory(item);
  if (cat === 'verb') return 'pos-badge pos-badge--verb';
  if (cat === 'adj') return 'pos-badge pos-badge--adj';
  if (cat === 'prep') return 'pos-badge pos-badge--prep';
  if (cat === 'command') return 'pos-badge pos-badge--cmd';
  return 'pos-badge';
}

// INIT LEARN MODE CARDS
export function initLearnMode() {
  const grid = document.getElementById('vocabGrid');
  if (!grid) return;

  const weakSet = new Set(getWeakWordList().map(w => String(w).toLowerCase()));
  const fullList = state.VOCAB_LIST || [];

  const filterList = (catKey) => {
    if (catKey === 'weak') {
      return fullList.filter(item => item.word && weakSet.has(item.word.toLowerCase()));
    }
    if (catKey === 'all') return fullList;
    return fullList.filter(item => getWordCategory(item) === catKey);
  };

  let visibleList = filterList(state.learnCategoryFilter);
  if (state.learnCategoryFilter !== 'all' && visibleList.length === 0) {
    state.learnCategoryFilter = 'all';
    visibleList = fullList;
  }

  renderLearnCategoryFilter(weakSet);

  grid.innerHTML = '';
  visibleList.forEach(item => {
    const card = document.createElement('div');
    card.className = 'vocab-card';
    card.onclick = () => spellAndSpeak(item, card);

    let lettersHtml = '';
    let spellingFormatted = '';
    let hasPracticeBtn = true;
    let slowBtnText = '🐢 สะกดช้าๆ';

    if (item.type === 'command') {
      lettersHtml = `<span class="word-text-full">${escapeHTML(item.word)}</span>`;
      hasPracticeBtn = false;
      slowBtnText = '🐢 อ่านช้าๆ';
    } else {
      lettersHtml = item.word.split('').map((char, index) => {
        if (char === ' ') return '<span>&nbsp;</span>';
        if (char === '-') return '<span class="spell-separator">-</span>';
        return `<span class="spell-char manual-letter-btn" data-index="${index}">${escapeHTML(char)}</span>`;
      }).join('');
      const spellableChars = item.word.split('').filter(c => !isSeparatorChar(c)).map(c => escapeHTML(c));
      spellingFormatted = `(${spellableChars.join(' - ')})`;
    }

    const posBadge = item.label
      ? `<span class="${getPosBadgeClass(item)}" title="ชนิดของคำ">${escapeHTML(item.label)}</span>`
      : '';
    const isWeak = item.word && weakSet.has(item.word.toLowerCase());
    const weakBadge = isWeak ? '<span class="vocab-weak-tag">ทบทวน</span>' : '';
    const visualHtml = renderVisualHTML(item.image, { trusted: !item.isCustom });

    card.innerHTML = `
      ${weakBadge}
      <div class="vocab-image">${visualHtml}</div>
      <div class="word">${lettersHtml}</div>
      <div class="spelling">${spellingFormatted}</div>
      <div class="meaning">${posBadge}${escapeHTML(item.meaning)}</div>
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

// ============================================================
// NATIVE <dialog> SPELLING PRACTICE MODAL LOGIC
// ============================================================
function cleanupSpellingModalState() {
  state.spellingSessionToken++;
  clearScopedTimers('spelling');
  stopAllSpeech();
  state.currentPracticeItem = null;
  state.practiceSelectedLetters = [];
  state.isSpellingSuccess = false;
  const contentBox = document.querySelector('.spelling-modal-content');
  if (contentBox) {
    contentBox.classList.remove('shake');
    contentBox.classList.remove('success');
  }
}

export function initSpellingDialogEvents() {
  const dialog = nodes.spellingModalOverlay || document.getElementById('spelling-practice-modal');
  if (!dialog || dialog.dataset.dialogEventsBound === 'true') return;
  dialog.dataset.dialogEventsBound = 'true';

  dialog.addEventListener('close', () => {
    cleanupSpellingModalState();
  });

  // Fallback light-dismiss for Safari (which lacks closedby="any")
  if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
    const outside = (e) => {
      if (!dialog.open) return false;
      const contentBox = dialog.querySelector('.spelling-modal-content') || dialog;
      const r = contentBox.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    let pressedOutside = false;
    dialog.addEventListener('pointerdown', (e) => {
      pressedOutside = outside(e);
    });
    dialog.addEventListener('pointerup', (e) => {
      if (pressedOutside && outside(e)) {
        closeSpellingPractice();
      }
      pressedOutside = false;
    });
  }
}

export function openSpellingPractice(item) {
  const dialog = nodes.spellingModalOverlay || document.getElementById('spelling-practice-modal');
  if (!dialog) return;

  stopAllSpeech();
  clearScopedTimers('spelling');
  state.spellingSessionToken++;
  state.currentPracticeItem = item;
  state.isSpellingSuccess = false;

  if (typeof dialog.showModal === 'function') {
    if (!dialog.open) dialog.showModal();
  } else {
    dialog.open = true;
    dialog.style.display = 'flex';
  }

  nodes.btnRepeatSound.style.display = 'none';
  nodes.spellingModalFeedback.innerHTML = '';
  nodes.spellingModalFeedback.className = 'spelling-modal-feedback';

  // Set Visuals
  nodes.spellingModalImage.innerHTML = renderVisualHTML(item.image, { trusted: !item.isCustom });
  nodes.spellingModalMeaning.textContent = item.meaning;

  resetSpellingPractice(item);
}

export function resetSpellingPractice(item) {
  if (!item) return;
  stopAllSpeech();
  clearScopedTimers('spelling');
  state.spellingSessionToken++;
  state.isSpellingSuccess = false;
  state.practiceSelectedLetters = [];

  nodes.spellingModalFeedback.innerHTML = '';
  nodes.spellingModalFeedback.className = 'spelling-modal-feedback';
  nodes.btnRepeatSound.style.display = 'none';

  const contentBox = document.querySelector('.spelling-modal-content');
  if (contentBox) {
    contentBox.classList.remove('shake');
    contentBox.classList.remove('success');
  }

  // Create empty slots (handling spaces and hyphens as fixed separators)
  nodes.spellingModalSlots.innerHTML = '';
  for (let i = 0; i < item.word.length; i++) {
    const ch = item.word[i];
    const slot = document.createElement('div');
    if (ch === ' ') {
      slot.className = 'spelling-slot-space';
      slot.innerHTML = '&nbsp;';
      slot.dataset.fixedChar = ' ';
      slot.dataset.isSpace = 'true';
    } else if (ch === '-') {
      slot.className = 'spelling-slot-space spelling-slot-hyphen';
      slot.textContent = '-';
      slot.dataset.fixedChar = '-';
      slot.dataset.isSpace = 'true';
    } else {
      slot.className = 'spelling-slot';
      slot.dataset.index = i;
    }
    nodes.spellingModalSlots.appendChild(slot);
  }

  // Create scrambled letters (excluding spaces & hyphens)
  nodes.spellingModalLetters.innerHTML = '';
  const correctLetters = item.word.split('').filter(c => !isSeparatorChar(c));
  const scrambled = shuffleScrambled(correctLetters);
  scrambled.forEach((letter) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'letter-btn';
    btn.textContent = letter;
    btn.addEventListener('click', () => handlePracticeLetterTap(letter, btn, item));
    nodes.spellingModalLetters.appendChild(btn);
  });

  speakTH('ลองสะกดคำนี้ดูสิจ๊ะ');
}

export function handlePracticeLetterTap(letter, btn, item) {
  if (state.isSpellingSuccess || btn.disabled) return;

  const sessionToken = state.spellingSessionToken;
  state.practiceSelectedLetters.push({ letter, btnEl: btn });
  btn.disabled = true;

  // Find next non-separator unfilled slot
  const unfilledSlots = Array.from(nodes.spellingModalSlots.children).filter(
    slot => slot.dataset.fixedChar === undefined && !slot.dataset.isSpace && !slot.classList.contains('filled')
  );
  if (unfilledSlots.length > 0) {
    const targetSlot = unfilledSlots[0];
    targetSlot.textContent = letter;
    targetSlot.classList.add('filled');
  }

  // Always speak the tapped letter immediately
  const letterU = speakEN(letter.toLowerCase(), 0.55);

  const correctLettersCount = item.word.split('').filter(c => !isSeparatorChar(c)).length;
  if (state.practiceSelectedLetters.length === correctLettersCount) {
    const reveal = () => {
      if (state.spellingSessionToken !== sessionToken || state.currentPracticeItem !== item) return;
      checkPracticeSpelling(item);
    };
    if (letterU && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      let fired = false;
      const fire = (d) => {
        if (fired) return;
        fired = true;
        registerTimeout('spelling', reveal, d);
      };
      letterU.addEventListener('end', () => fire(350));
      letterU.addEventListener('error', () => fire(150));
      registerTimeout('spelling', () => fire(0), 4000);
    } else {
      registerTimeout('spelling', reveal, 600);
    }
  }
}

export function checkPracticeSpelling(item) {
  const sessionToken = state.spellingSessionToken;
  // Reconstruct spelled word from slots to retain spaces/hyphens correctly
  const spelledWord = Array.from(nodes.spellingModalSlots.children).map(slot => {
    if (slot.dataset.fixedChar !== undefined) return slot.dataset.fixedChar;
    if (slot.dataset.isSpace) return ' ';
    return slot.textContent;
  }).join('');
  const contentBox = document.querySelector('.spelling-modal-content');

  if (spelledWord.toLowerCase() === item.word.toLowerCase()) {
    // Success
    state.isSpellingSuccess = true;
    if (contentBox) contentBox.classList.add('success');
    nodes.spellingModalFeedback.innerHTML = `🎉 เก่งมากเลยจ้า! <b>${escapeHTML(item.word)}</b>`;
    nodes.btnRepeatSound.style.display = 'inline-flex';

    spellAndSpeak(item, null, 0.8);
  } else {
    // Fail
    if (contentBox) contentBox.classList.add('shake');
    nodes.spellingModalFeedback.innerHTML = '<span class="wrong">❌ ลองใหม่อีกครั้งนะจ๊ะ</span>';
    speakTH('ลองใหม่อีกครั้งนะจ๊ะ');

    registerTimeout('spelling', () => {
      if (state.spellingSessionToken === sessionToken && state.currentPracticeItem === item && !state.isSpellingSuccess) {
        resetSpellingPractice(item);
      }
    }, 1500);
  }
}

export function closeSpellingPractice() {
  const dialog = nodes.spellingModalOverlay || document.getElementById('spelling-practice-modal');
  cleanupSpellingModalState();
  if (!dialog) return;

  if (typeof dialog.close === 'function') {
    if (dialog.open) dialog.close();
  } else {
    dialog.open = false;
    dialog.style.display = 'none';
  }
}
