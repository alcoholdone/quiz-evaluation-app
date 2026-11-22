import { state, nodes, registerTimeout, clearScopedTimers } from '../state/store.js';
import { getSentenceQA, isSeparatorChar } from '../utils/word-helpers.js';
import { escapeHTML, renderVisualHTML } from '../utils/sanitize.js';
import { shuffleScrambled } from '../utils/shuffle.js';
import {
  stopAllSpeech, speakEN, speakTH, makeUtterance,
  playFeedbackSounds, getLastFeedbackUtterance
} from '../services/speech.js';
import {
  getWeakWordList, saveWeakWordList, saveHistory, saveReviewSnapshot, addStars
} from '../services/storage.js';
import { generateQuestions } from './quiz-generator.js';
import { switchTab } from './navigation.js';
import { calculateStarsEarned, updateTotalStarsBadgeUI, celebrateQuizResult } from './rewards.js';

let currentQuestionAnswered = false;

export function clearTransitionTimeout() {
  if (state.questionTransitionTimeout) {
    clearTimeout(state.questionTransitionTimeout);
    state.questionTransitionTimeout = null;
  }
  clearScopedTimers('game');
}

// START NEW GAME CHALLENGE
export function startNewChallenge() {
  clearTransitionTimeout();
  state.hasCompletedAssessment = false;

  // Generate questions and reset arrays
  state.challengeQuestions = generateQuestions();
  state.userAnswers = new Array(state.challengeQuestions.length).fill(null);
  state.questionTimeSpent = new Array(state.challengeQuestions.length).fill(0);
  state.currentQuestionIndex = 0;
  state.gameTotalSeconds = 0;
  state.questionStartTime = null;

  // Bug #3 Fix: Clear any existing timer before starting a new one
  if (state.gameTimerInterval) {
    clearInterval(state.gameTimerInterval);
    state.gameTimerInterval = null;
  }

  // Start clock
  startTimer();

  // Render first question
  renderQuestion(0);

  // Update view if not already game panel
  if (state.activeTab !== 'game') {
    switchTab('game');
  }
}

// TIMER ENGINE
export function startTimer() {
  state.questionStartTime = Date.now();
  state.gameTimerInterval = setInterval(() => {
    state.gameTotalSeconds++;

    // Render timer display
    const mm = Math.floor(state.gameTotalSeconds / 60).toString().padStart(2, '0');
    const ss = (state.gameTotalSeconds % 60).toString().padStart(2, '0');
    nodes.liveTimer.textContent = `⏱️ ${mm}:${ss}`;
  }, 1000);
}

export function pauseTimer() {
  if (state.gameTimerInterval) {
    clearInterval(state.gameTimerInterval);
    state.gameTimerInterval = null;
  }
  saveCurrentQuestionTime();
}

export function resumeTimer() {
  if (!state.gameTimerInterval && state.challengeQuestions.length > 0 && !state.hasCompletedAssessment) {
    state.questionStartTime = Date.now();
    startTimer();
  }
}

export function saveCurrentQuestionTime() {
  if (state.questionStartTime !== null && state.challengeQuestions.length > 0 && state.currentQuestionIndex < state.challengeQuestions.length) {
    const elapsed = Math.round((Date.now() - state.questionStartTime) / 1000);
    state.questionTimeSpent[state.currentQuestionIndex] += elapsed;
    state.questionStartTime = Date.now();
  }
}

// RENDER GAME QUESTION
export function renderQuestion(index) {
  clearTransitionTimeout();
  stopAllSpeech();

  saveCurrentQuestionTime();
  state.currentQuestionIndex = index;
  currentQuestionAnswered = false;

  if (nodes.btnSkip) {
    nodes.btnSkip.disabled = false;
  }

  const q = state.challengeQuestions[index];

  // Reset box styles
  nodes.gameBox.className = 'game-box';
  nodes.feedback.innerHTML = '';

  // Update counter & progress bar without detaching cached DOM nodes (Bug #12 fix)
  if (nodes.currentNum) nodes.currentNum.textContent = index + 1;
  if (nodes.totalNum) nodes.totalNum.textContent = state.challengeQuestions.length;
  const percent = ((index + 1) / state.challengeQuestions.length) * 100;
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
    registerTimeout('game', () => {
      if (state.activeTab === 'game' && state.currentQuestionIndex === index) {
        speakEN(q.targetWord.word, 0.8);
      }
    }, 400);

    // Options: Pictures + Thai meaning
    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.innerHTML = `
        <div class="option-img">${renderVisualHTML(opt.image, { trusted: !opt.isCustom })}</div>
        <div class="option-label">${escapeHTML(opt.meaning)}</div>
      `;
      btn.onclick = () => selectOption(opt, btn);
      nodes.optionsGrid.appendChild(btn);
    });

  } else if (q.type === 'visual_word') {
    nodes.gameModeTitle.innerHTML = '✏️ ภารกิจ: ดูภาพแล้วเลือกคำศัพท์ที่ถูกต้อง!';

    // Show image + meaning
    nodes.questionArea.innerHTML = `
      <div class="question-visual">${renderVisualHTML(q.targetWord.image, { trusted: !q.targetWord.isCustom })}</div>
      <div class="question-hint" style="font-size: 1rem; color: var(--text-muted); margin-top: 8px;">${escapeHTML(q.targetWord.meaning)}</div>
    `;

    // Options: English words
    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.innerHTML = `<div class="option-word-only">${escapeHTML(opt.word)}</div>`;
      btn.onclick = () => selectOption(opt, btn);
      nodes.optionsGrid.appendChild(btn);
    });

  } else if (q.type === 'spelling_scrambled') {
    // ======== NEW: SPELLING SCRAMBLED ========
    nodes.gameModeTitle.innerHTML = '🔤 ภารกิจ: ดูภาพแล้วเรียงตัวอักษรสะกดคำให้ถูกต้อง!';

    nodes.questionArea.innerHTML = `
      <div class="question-visual">${renderVisualHTML(q.targetWord.image, { trusted: !q.targetWord.isCustom })}</div>
      <div class="question-hint" style="font-size: 1rem; color: var(--text-muted); margin-top: 8px;">${escapeHTML(q.targetWord.meaning)}</div>
    `;

    // Auto speak the word so kids hear it
    registerTimeout('game', () => {
      if (state.activeTab === 'game' && state.currentQuestionIndex === index) {
        speakEN(q.targetWord.word, 0.7);
      }
    }, 500);

    const correctWord = q.targetWord.word;
    const correctLetters = correctWord.split('').filter(c => !isSeparatorChar(c));
    const scrambled = shuffleScrambled(correctLetters);

    let selectedLetters = [];

    // Build answer slots
    const slotsContainer = document.createElement('div');
    slotsContainer.className = 'spelling-slots-container';
    for (let i = 0; i < correctWord.length; i++) {
      const ch = correctWord[i];
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
        if (btn.disabled || currentQuestionAnswered || state.currentQuestionIndex !== index) return;

        selectedLetters.push({ letter, btnEl: btn });
        btn.disabled = true;

        // Find the next non-separator unfilled slot
        const unfilledSlots = Array.from(slotsContainer.children).filter(
          slot => slot.dataset.fixedChar === undefined && !slot.dataset.isSpace && !slot.classList.contains('filled')
        );
        if (unfilledSlots.length > 0) {
          const targetSlot = unfilledSlots[0];
          targetSlot.textContent = letter;
          targetSlot.classList.add('filled');
        }

        // Always speak the letter immediately
        const letterU = speakEN(letter.toLowerCase(), 0.55);

        // Check answer when all actual letters placed
        if (selectedLetters.length === correctLetters.length) {
          if (undoBtn) undoBtn.disabled = true;
          // Build full word including spaces/hyphens from slots to check
          const spelled = Array.from(slotsContainer.children).map(slot => {
            if (slot.dataset.fixedChar !== undefined) return slot.dataset.fixedChar;
            if (slot.dataset.isSpace) return ' ';
            return slot.textContent;
          }).join('');

          const reveal = () => {
            if (state.activeTab !== 'game' || state.currentQuestionIndex !== index || currentQuestionAnswered) return;
            selectOption({ word: spelled, meaning: q.targetWord.meaning, image: q.targetWord.image });
          };
          // Wait for the LAST letter to finish speaking before revealing, so its
          // sound isn't cut off. Fixed delay was too short for the slow rate.
          if (letterU && typeof window !== 'undefined' && 'speechSynthesis' in window) {
            let fired = false;
            const fire = (delay) => {
              if (fired) return;
              fired = true;
              registerTimeout('game', reveal, delay);
            };
            letterU.addEventListener('end', () => fire(350));
            letterU.addEventListener('error', () => fire(150));
            registerTimeout('game', () => fire(0), 4000); // safety cap if 'end' never fires
          } else {
            registerTimeout('game', reveal, 600);
          }
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

      // Find the last filled non-separator slot and clear it
      const filledSlots = Array.from(slotsContainer.children).filter(
        slot => slot.dataset.fixedChar === undefined && !slot.dataset.isSpace && slot.classList.contains('filled')
      );
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
    nodes.questionArea.innerHTML = `<div class="question-visual" style="font-size: 3rem; font-weight: 800; color: #1e3a8a;">${escapeHTML(q.targetWord.meaning)}</div>`;

    registerTimeout('game', () => {
      if (state.activeTab === 'game' && state.currentQuestionIndex === index) {
        speakTH(q.targetWord.meaning);
      }
    }, 400);

    // Options: Pictures + English words
    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.innerHTML = `
        <div class="option-img">${renderVisualHTML(opt.image, { trusted: !opt.isCustom })}</div>
        <div class="option-word-only" style="font-size: 1.2rem;">${escapeHTML(opt.word)}</div>
      `;
      btn.onclick = () => selectOption(opt, btn);
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
        <div class="question-visual" style="height:100px; font-size:75px; margin: 5px 0;">${renderVisualHTML(q.targetWord.image, { trusted: !q.targetWord.isCustom })}</div>
        <div class="chat-game-container">
          <div class="chat-row teacher-row">
            <div class="chat-avatar">👩‍🏫</div>
            <div class="chat-bubble teacher-bubble">
              ${escapeHTML(qaQuestion)}
              <button class="chat-speak-btn" type="button" id="btn-speak-question" title="ฟังคุณครูพูด">🔊</button>
              <div class="chat-translation">${escapeHTML(qaThaiQuestion)}</div>
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
    registerTimeout('game', () => {
      if (state.activeTab === 'game' && state.currentQuestionIndex === index) {
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
        <span class="option-word-only" style="font-size: 1.15rem; font-weight: 700;">${escapeHTML(optText)}</span>
      `;

      btn.onclick = () => {
        // Update student chat bubble
        const studentBubble = document.getElementById('student-chat-bubble');
        if (studentBubble) {
          studentBubble.classList.remove('empty-bubble');
          studentBubble.innerHTML = `
            ${escapeHTML(optText)}
            <div class="chat-translation">${escapeHTML(optThaiText)}</div>
          `;
        }
        selectOption(opt, btn);
      };

      nodes.optionsGrid.appendChild(btn);
    });
  } else if (q.type === 'grammar_an') {
    nodes.gameModeTitle.innerHTML = '✏️ ภารกิจ: เลือกประโยคไวยากรณ์ (a / an) ที่ถูกต้อง!';

    // Show image + question
    nodes.questionArea.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; width:100%;">
        <div class="question-visual" style="font-size: 4.5rem; margin-bottom: 8px;">${renderVisualHTML(q.targetWord.image, { trusted: !q.targetWord.isCustom })}</div>
        <div style="font-size: 1.4rem; font-weight: 700; color: var(--dark-2); margin-bottom: 4px;">What’s this?</div>
        <div class="question-hint" style="font-size: 0.95rem; color: var(--text-muted); font-weight: 600;">(คำแปล: ${escapeHTML(q.targetWord.meaning)})</div>
      </div>
    `;

    // Auto speak question
    registerTimeout('game', () => {
      if (state.activeTab === 'game' && state.currentQuestionIndex === index) {
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
        <span class="option-word-only" style="font-size: 1.15rem; font-weight: 700;">${escapeHTML(opt.text)}</span>
      `;

      btn.onclick = () => selectOption(opt, btn);
      nodes.optionsGrid.appendChild(btn);
    });
  } else if (q.type === 'phonics_midterm') {
    nodes.gameModeTitle.innerHTML = '🔤 ภารกิจ Phonics: เลือกคำศัพท์ที่ขึ้นต้นด้วยเสียงตัวอักษร!';

    nodes.questionArea.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; width:100%;">
        <div class="question-visual" style="font-size: 5rem; margin-bottom: 8px;">❓</div>
        <div style="font-size: 1.4rem; font-weight: 700; color: var(--dark-2); margin-bottom: 4px; text-align: center; max-width: 90%;">Which word starts with the "${escapeHTML(q.phonicsLetter.toLowerCase())}" sound?</div>
        <button class="play-btn" id="btn-speak-phonics" style="margin-top: 5px;">🔊 ฟังเสียงตัวอักษร</button>
      </div>
    `;

    const speakText = `Which word starts with the ${q.phonicsLetter.toLowerCase()} sound?`;
    document.getElementById('btn-speak-phonics').addEventListener('click', () => {
      stopAllSpeech();
      speakEN(speakText, 0.85);
    });

    registerTimeout('game', () => {
      if (state.activeTab === 'game' && state.currentQuestionIndex === index) {
        speakEN(speakText, 0.85);
      }
    }, 500);

    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';

      const imgHtml = `<div class="option-img">${renderVisualHTML(opt.image, { trusted: !opt.isCustom })}</div>`;
      btn.innerHTML = `
        ${imgHtml}
        <div class="option-word-only" style="font-size: 1.25rem; font-weight: 700; margin-top: 8px;">${escapeHTML(opt.word)}</div>
        <div class="option-label" style="font-size: 0.8rem; color: var(--text-muted);">${escapeHTML(opt.meaning)}</div>
      `;
      btn.onclick = () => selectOption(opt, btn);
      nodes.optionsGrid.appendChild(btn);
    });
  } else if (q.type === 'grammar_midterm') {
    nodes.gameModeTitle.innerHTML = '💬 ภารกิจ: เติมบทสนทนาและตอบคำถามไวยากรณ์ให้ถูกต้อง!';

    const renderedTargetVisual = renderVisualHTML(q.targetWord.image, { trusted: !q.targetWord.isCustom });
    let imgHtml = '';
    if (renderedTargetVisual.startsWith('<div')) {
      imgHtml = renderedTargetVisual;
    } else {
      imgHtml = `<div class="question-visual" style="min-height: 125px; margin: 8px 0;">${renderedTargetVisual}</div>`;
    }

    nodes.questionArea.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; width:100%;">
        ${imgHtml}
        <div class="chat-game-container" style="width: 100%; max-width: 450px; margin-top: 10px;">
          <div class="chat-row teacher-row" style="display: flex; gap: 8px; margin-bottom: 12px; justify-content: flex-start;">
            <div class="chat-avatar" style="font-size: 1.8rem;">👩‍🏫</div>
            <div class="chat-bubble teacher-bubble" style="background: #f1f5f9; border: 1.5px solid #cbd5e1; padding: 10px 14px; border-radius: 18px 18px 18px 4px; font-size: 1.05rem; font-weight: 700; color: var(--dark-3); position: relative;">
              ${escapeHTML(q.questionText)}
              <button class="chat-speak-btn" type="button" id="btn-speak-question" title="ฟังคุณครูพูด" style="background: none; border: none; font-size: 1.1rem; cursor: pointer; margin-left: 6px; padding: 0; vertical-align: middle;">🔊</button>
              <div class="chat-translation" style="font-size: 0.82rem; color: var(--text-muted); font-weight: 500; margin-top: 4px;">(${escapeHTML(q.thaiQuestionText)})</div>
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

    registerTimeout('game', () => {
      if (state.activeTab === 'game' && state.currentQuestionIndex === index) {
        speakEN(q.questionText, 0.85);
      }
    }, 500);

    nodes.optionsGrid.className = 'options-grid sentence-options';

    q.options.forEach((opt, optIdx) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';

      btn.innerHTML = `
        <span style="font-size:1.3rem; font-weight:bold; margin-right:12px; color:var(--primary-dark);">${String.fromCharCode(65 + optIdx)}.</span>
        <span class="option-word-only" style="font-size: 1.12rem; font-weight: 700;">${escapeHTML(opt.text)}</span>
      `;

      btn.onclick = () => {
        const studentBubble = document.getElementById('student-chat-bubble');
        if (studentBubble) {
          studentBubble.className = 'chat-bubble student-bubble';
          studentBubble.style.cssText = 'background: var(--primary-light); border: 1.5px solid var(--primary); padding: 10px 14px; border-radius: 18px 18px 4px 18px; font-size: 1.05rem; font-weight: 700; color: var(--primary-hover);';
          studentBubble.textContent = opt.text;
        }
        selectOption(opt, btn);
      };

      nodes.optionsGrid.appendChild(btn);
    });
  }
}

// SELECT ANSWER OPTION
export function selectOption(selectedOpt, clickedBtn) {
  if (currentQuestionAnswered || state.hasCompletedAssessment) return;
  currentQuestionAnswered = true;

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
    : (selectedOpt.word.toLowerCase() === state.challengeQuestions[state.currentQuestionIndex].targetWord.word.toLowerCase());

  // Record choice
  state.userAnswers[state.currentQuestionIndex] = selectedOpt;

  // Highlight the option the child actually chose (green if right, red if wrong).
  // This stays visible during feedback and resets by itself on the next question
  // because renderQuestion rebuilds the options grid — no sticky :hover involved.
  if (clickedBtn) {
    clickedBtn.classList.add('selected', isCorrect ? 'is-correct' : 'is-wrong');
  }

  // Reset classes
  nodes.gameBox.className = 'game-box';
  void nodes.gameBox.offsetWidth; // reflow

  const q = state.challengeQuestions[state.currentQuestionIndex];

  // On a wrong answer, also reveal the CORRECT option in green so the child sees
  // the right choice. Option buttons are appended in the same order as q.options.
  if (!isCorrect && Array.isArray(q.options)) {
    const optBtns = nodes.optionsGrid.querySelectorAll('.option-btn');
    if (optBtns.length) {
      let correctIdx = q.options.findIndex(o => o && o.isCorrect);
      if (correctIdx < 0 && q.targetWord && q.targetWord.word) {
        const target = q.targetWord.word.toLowerCase();
        correctIdx = q.options.findIndex(o => o && o.word && o.word.toLowerCase() === target);
      }
      if (correctIdx >= 0 && optBtns[correctIdx]) {
        optBtns[correctIdx].classList.add('is-correct', 'reveal-correct');
      }
    }
  }

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
        nodes.feedback.innerHTML = `<span class="wrong">❌ อ๊ะ.. ประโยคที่ถูกคือ <strong>${escapeHTML(correctOpt.text)}</strong> (${escapeHTML(correctOpt.thaiText)})</span>`;

        stopAllSpeech();
        playFeedbackSounds([
          makeUtterance('ลองใหม่อีกทีนะจ๊ะ', 'th-TH', 1),
          makeUtterance(correctOpt.text, 'en-US', 0.8),
          makeUtterance(correctOpt.thaiText, 'th-TH', 1)
        ]);
      } else {
        const qaData = getSentenceQA(q.targetWord);
        nodes.feedback.innerHTML = `<span class="wrong">❌ อ๊ะ.. ประโยคที่ถูกคือ <strong>${escapeHTML(qaData.answer)}</strong> (${escapeHTML(qaData.thaiAnswer)})</span>`;

        stopAllSpeech();
        playFeedbackSounds([
          makeUtterance('ลองใหม่อีกทีนะจ๊ะ', 'th-TH', 1),
          makeUtterance(qaData.answer, 'en-US', 0.8),
          makeUtterance(qaData.thaiAnswer, 'th-TH', 1)
        ]);
      }
    } else if (q.type === 'grammar_an' || q.type === 'grammar_midterm') {
      const correctOpt = q.options.find(o => o.isCorrect);
      nodes.feedback.innerHTML = `<span class="wrong">❌ อ๊ะ.. ประโยคที่ถูกคือ <strong>${escapeHTML(correctOpt.text)}</strong></span>`;

      stopAllSpeech();
      playFeedbackSounds([
        makeUtterance('ลองใหม่อีกทีนะจ๊ะ', 'th-TH', 1),
        makeUtterance(correctOpt.text, 'en-US', 0.8)
      ]);
    } else {
      nodes.feedback.innerHTML = `<span class="wrong">❌ อ๊ะ.. คำตอบที่ถูกคือ <strong>${escapeHTML(q.targetWord.word)}</strong> (${escapeHTML(q.targetWord.meaning)}) ลองพยายามใหม่ข้อถัดไปนะ</span>`;

      stopAllSpeech();
      playFeedbackSounds([makeUtterance('ลองใหม่อีกทีนะจ๊ะ', 'th-TH', 1)]);
    }
  }

  // Progress to next question AFTER the feedback finishes speaking, so long
  // sentences (e.g. the correct answer being read) aren't cut off mid-way.
  // Guard so it fires exactly once; a hard fallback prevents a hang if the
  // 'end' event never arrives (e.g. TTS blocked / unavailable).
  let advanced = false;
  const goNext = () => {
    if (advanced) return;
    advanced = true;
    clearTransitionTimeout();
    if (state.currentQuestionIndex < state.challengeQuestions.length - 1) {
      renderQuestion(state.currentQuestionIndex + 1);
    } else {
      submitAssessment();
    }
  };

  const lastU = getLastFeedbackUtterance();
  if (lastU && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const afterSpeech = (pauseMs) => () => {
      clearTransitionTimeout();
      state.questionTransitionTimeout = setTimeout(goNext, pauseMs);
    };
    lastU.addEventListener('end', afterSpeech(700));   // short beat after it finishes
    lastU.addEventListener('error', afterSpeech(400));
    state.questionTransitionTimeout = setTimeout(goNext, 8000); // safety cap
  } else {
    state.questionTransitionTimeout = setTimeout(goNext, 2000);
  }
}

// SKIP QUESTION
export function skipQuestion() {
  clearTransitionTimeout();
  stopAllSpeech();
  state.userAnswers[state.currentQuestionIndex] = null; // Mark as skipped

  if (state.currentQuestionIndex < state.challengeQuestions.length - 1) {
    renderQuestion(state.currentQuestionIndex + 1);
  } else {
    submitAssessment();
  }
}

// SUBMIT QUIZ ASSESSMENT & COMPLETE
export function submitAssessment() {
  pauseTimer();

  state.hasCompletedAssessment = true;

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

  state.challengeQuestions.forEach((q, idx) => {
    const ans = state.userAnswers[idx];
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
  const scaledScore = Math.round((correctCount / state.challengeQuestions.length) * 500);
  const totalSecondsSpent = state.questionTimeSpent.reduce((a, b) => a + b, 0);

  // Calculate Stars for this attempt (percentage-based so it works for any quiz length)
  const starsEarned = calculateStarsEarned(correctCount, state.challengeQuestions.length);

  // Add to total stars
  let finalStarsEarned = starsEarned;
  if (state.currentUnitId === 'midterm_prep') {
    finalStarsEarned += 20; // โบนัสเพิ่ม 20 ดาวพิเศษสำหรับการจำลองสอบกลางภาค ป.1!
  } else if (state.currentUnitId === 'final_exam_prep') {
    finalStarsEarned += 25; // โบนัสเพิ่ม 25 ดาวพิเศษสำหรับการจำลองสอบปลายภาค ป.1!
  } else if (state.currentUnitId === 'unit5_exam') {
    finalStarsEarned += 20; // โบนัสเพิ่ม 20 ดาวพิเศษสำหรับการสอบท้ายบท Unit 5!
  }
  addStars(finalStarsEarned);
  updateTotalStarsBadgeUI();

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
