import { state, nodes } from '../state/store.js';
import { stopAllSpeech, speakEN, speakTH, spellAndSpeak } from '../services/speech.js';

// INIT LEARN MODE CARDS
export function initLearnMode() {
  const grid = document.getElementById('vocabGrid');
  if (!grid) return;
  grid.innerHTML = '';
  state.VOCAB_LIST.forEach(item => {
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

// ============================================================
// SPELLING PRACTICE MODAL LOGIC
// ============================================================
export function openSpellingPractice(item) {
  stopAllSpeech();
  state.currentPracticeItem = item;
  state.isSpellingSuccess = false;
  nodes.spellingModalOverlay.style.display = 'flex';
  nodes.btnRepeatSound.style.display = 'none';
  nodes.spellingModalFeedback.innerHTML = '';
  nodes.spellingModalFeedback.className = 'spelling-modal-feedback';

  // Set Visuals
  nodes.spellingModalImage.innerHTML = item.image;
  nodes.spellingModalMeaning.textContent = item.meaning;

  resetSpellingPractice(item);
}

export function resetSpellingPractice(item) {
  if (!item) return;
  stopAllSpeech();
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

export function handlePracticeLetterTap(letter, btn, item) {
  if (state.isSpellingSuccess || btn.disabled) return;

  state.practiceSelectedLetters.push({ letter, btnEl: btn });
  btn.disabled = true;

  // Find next non-space slot
  const unfilledSlots = Array.from(nodes.spellingModalSlots.children).filter(slot => !slot.dataset.isSpace && !slot.classList.contains('filled'));
  if (unfilledSlots.length > 0) {
    const targetSlot = unfilledSlots[0];
    targetSlot.textContent = letter;
    targetSlot.classList.add('filled');
  }

  // Always speak the tapped letter immediately
  const letterU = speakEN(letter.toLowerCase(), 0.55);

  const correctLettersCount = item.word.split('').filter(c => c !== ' ').length;
  if (state.practiceSelectedLetters.length === correctLettersCount) {
    // Wait for the last letter to finish speaking before checking (fixed 600ms
    // was too short for the slow rate and cut the sound off).
    const reveal = () => checkPracticeSpelling(item);
    if (letterU && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      let fired = false;
      const fire = (d) => { if (fired) return; fired = true; setTimeout(reveal, d); };
      letterU.addEventListener('end', () => fire(350));
      letterU.addEventListener('error', () => fire(150));
      setTimeout(() => fire(0), 4000); // safety cap if 'end' never fires
    } else {
      setTimeout(reveal, 600);
    }
  }
}

export function checkPracticeSpelling(item) {
  // Reconstruct spelled word from slots to retain space correctly
  const spelledWord = Array.from(nodes.spellingModalSlots.children).map(slot => {
    if (slot.dataset.isSpace) return ' ';
    return slot.textContent;
  }).join('');
  const contentBox = document.querySelector('.spelling-modal-content');

  if (spelledWord.toLowerCase() === item.word.toLowerCase()) {
    // Success
    state.isSpellingSuccess = true;
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
      if (state.currentPracticeItem === item && !state.isSpellingSuccess) {
        resetSpellingPractice(item);
      }
    }, 1500);
  }
}

export function closeSpellingPractice() {
  nodes.spellingModalOverlay.style.display = 'none';
  stopAllSpeech();
  state.currentPracticeItem = null;
  state.practiceSelectedLetters = [];
  const contentBox = document.querySelector('.spelling-modal-content');
  if (contentBox) {
    contentBox.classList.remove('shake');
    contentBox.classList.remove('success');
  }
}
