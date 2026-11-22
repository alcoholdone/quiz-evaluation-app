import { state, nodes, registerTimeout, clearScopedTimers } from '../state/store.js';
import { VOCAB_UNITS } from '../data/units.js';
import {
  DICTATION_ROUNDS,
  DICTATION_ROUND_TERM,
  DICTATION_ROUND_LABELS,
  DICTATION_ROUND_UNIT_MAP
} from '../data/dictation-rounds.js';
import { stopAllSpeech, speakEN, speakTH, spellAndSpeak } from '../services/speech.js';
import {
  getDictationHistory,
  saveDictationHistory,
  addWeakWord,
  removeWeakWord
} from '../services/storage.js';
import { renderTermSelectors, renderUnitSelectors } from './catalog.js';
import { escapeHTML, renderVisualHTML } from '../utils/sanitize.js';
import { shuffle, shuffleScrambled } from '../utils/shuffle.js';
import { isSeparatorChar } from '../utils/word-helpers.js';

export function updateDictationTermUI() {
  Object.keys(DICTATION_ROUNDS).forEach(r => {
    const btn = document.getElementById(`btn-dictation-${r}`);
    if (btn) {
      const roundTerm = DICTATION_ROUND_TERM[r] || 1;
      btn.style.display = roundTerm === state.currentTerm ? '' : 'none';
    }
  });
}

export function updateDictationRound(roundKey) {
  state.dictationSessionToken++;
  clearScopedTimers('dictation');
  state.selectedDictationRound = roundKey;
  const roundTerm = DICTATION_ROUND_TERM[roundKey] || 1;
  if (roundTerm !== state.currentTerm) {
    state.currentTerm = roundTerm;
    renderTermSelectors();
    renderUnitSelectors();
  }
  updateDictationTermUI();

  Object.keys(DICTATION_ROUNDS).forEach(r => {
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
  const roundLabel = DICTATION_ROUND_LABELS[roundKey] || 'รอบที่ 1';
  const roundWordCount = (DICTATION_ROUNDS[roundKey] || []).length || 5;
  const dictationDesc = document.querySelector('#dictation-start-screen p');
  if (dictationDesc) {
    dictationDesc.textContent = `มา${roundLabel} ฝึกเขียนตามคำบอก ${roundWordCount} คำแสนสนุกกันเถอะเด็กๆ! ฟังเสียงสะกดและพิมพ์ให้ถูกต้องเพื่อรับคะแนนนะจ๊ะ`;
  }
  const dictationGuideHeader = document.querySelector('.dictation-study-guide h3');
  if (dictationGuideHeader) {
    dictationGuideHeader.textContent = `📖 คำศัพท์เตรียมท่อง${roundLabel} (${roundWordCount} คำ)`;
  }

  initDictationStudyMode();
}

export function initDictationStudyMode() {
  // ค้นคำจาก "ทุกยูนิต" รวมกัน เพื่อให้แต่ละรอบ (เช่นรอบ Unit 2) หาคำเจอ
  // ไม่ว่าจะเลือกยูนิตไหนอยู่ในโหมดฝึก/เกม (dictation มีตัวเลือกรอบของตัวเอง)
  const allUnitWords = (typeof VOCAB_UNITS !== 'undefined' && VOCAB_UNITS.length)
    ? VOCAB_UNITS.flatMap(u => u.words || [])
    : [];
  const sourceList = allUnitWords.length > 0
    ? allUnitWords
    : ((state.VOCAB_LIST && state.VOCAB_LIST.length > 0) ? state.VOCAB_LIST : []);

  const roundWords = DICTATION_ROUNDS[state.selectedDictationRound] || DICTATION_ROUNDS.r1;
  const targetUnitId = DICTATION_ROUND_UNIT_MAP[state.selectedDictationRound];
  const targetUnit = (typeof VOCAB_UNITS !== 'undefined') ? VOCAB_UNITS.find(u => u.id === targetUnitId) : null;
  const primaryList = (targetUnit && targetUnit.words) ? targetUnit.words : [];

  state.dictationSessionList = [];
  const seen = new Set();
  roundWords.forEach(w => {
    const wLower = w.trim().toLowerCase();
    let item = primaryList.find(x => x.word.trim().toLowerCase() === wLower);
    if (!item) {
      item = sourceList.find(x => x.word.trim().toLowerCase() === wLower && !seen.has(x.word.toLowerCase()));
    }
    if (item && !seen.has(item.word.toLowerCase())) {
      seen.add(item.word.toLowerCase());
      state.dictationSessionList.push(item);
    }
  });

  // Fallback เพิ่มเติมหากไม่พบคำใดๆ เลย ป้องกันระบบขัดข้อง
  if (state.dictationSessionList.length === 0) {
    state.dictationSessionList = [
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
    state.dictationSessionList.forEach(item => {
      const card = document.createElement('div');
      card.className = 'dictation-preview-card';
      card.innerHTML = `
        <div class="dictation-preview-emoji">${renderVisualHTML(item.image, { trusted: !item.isCustom })}</div>
        <div class="dictation-preview-details">
          <div class="dictation-preview-word">${escapeHTML(item.word)}</div>
          <div class="dictation-preview-meaning">${escapeHTML(item.meaning)}</div>
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

export function showDictationStudyScreen() {
  state.dictationSessionToken++;
  clearScopedTimers('dictation');
  stopAllSpeech();
  if (nodes.dictationStartScreen) nodes.dictationStartScreen.style.display = 'block';
  if (nodes.dictationPlayArea) nodes.dictationPlayArea.style.display = 'none';
  if (nodes.dictationResultScreen) nodes.dictationResultScreen.style.display = 'none';
}

export function startDictationTest() {
  state.dictationSessionToken++;
  clearScopedTimers('dictation');
  stopAllSpeech();

  if (nodes.dictationStartScreen) nodes.dictationStartScreen.style.display = 'none';
  if (nodes.dictationPlayArea) nodes.dictationPlayArea.style.display = 'block';
  if (nodes.dictationResultScreen) nodes.dictationResultScreen.style.display = 'none';

  // สุ่มคำศัพท์เพื่อให้เด็กไม่ได้จำลำดับการทำแบบทดสอบ
  state.dictationSessionList = shuffle(state.dictationSessionList);
  state.currentDictationIndex = 0;
  state.dictationScore = 0;

  renderDictationQuestion();
}

export function renderDictationQuestion() {
  state.dictationSessionToken++;
  clearScopedTimers('dictation');
  stopAllSpeech();

  // อัปเดตข้อมูล UI ข้อปัจจุบัน
  const totalQuestions = state.dictationSessionList.length || 5;
  const currentNumNode = document.getElementById('current-dictation-num');
  const totalNumNode = document.getElementById('total-dictation-num');
  const currentScoreNode = document.getElementById('dictation-current-score');
  const progressBarNode = document.getElementById('dictation-progress-bar');

  if (currentNumNode) currentNumNode.textContent = state.currentDictationIndex + 1;
  if (totalNumNode) totalNumNode.textContent = totalQuestions;
  if (currentScoreNode) currentScoreNode.textContent = state.dictationScore;

  const progressPct = (state.currentDictationIndex / totalQuestions) * 100;
  if (progressBarNode) progressBarNode.style.width = `${progressPct}%`;

  // แสดงคำแปลไทยเพื่อบอกคำใบ้
  const currentItem = state.dictationSessionList[state.currentDictationIndex];
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

export function resetDictationSpelling(item) {
  if (!item) return;
  state.dictationSessionToken++;
  clearScopedTimers('dictation');
  stopAllSpeech();

  state.dictationSelectedLetters = [];

  if (nodes.dictationFeedback) {
    nodes.dictationFeedback.innerHTML = '';
  }

  const dictationBox = document.getElementById('dictationBox');
  if (dictationBox) {
    dictationBox.classList.remove('dictation-shake');
    dictationBox.classList.remove('dictation-bounce');
  }

  // สร้างช่องว่างสะกดคำ (Slots) รองรับทั้งเว้นวรรคและเครื่องหมายขีด (-)
  if (nodes.dictationSlots) {
    nodes.dictationSlots.innerHTML = '';
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
      nodes.dictationSlots.appendChild(slot);
    }
  }

  // สร้างปุ่มกดตัวอักษรแบบสุ่มสลับ (Scrambled Letters)
  if (nodes.dictationLetters) {
    nodes.dictationLetters.innerHTML = '';
    const correctLetters = item.word.split('').filter(c => !isSeparatorChar(c));
    const scrambled = shuffleScrambled(correctLetters);
    scrambled.forEach((letter) => {
      const btn = document.createElement('button');
      btn.className = 'letter-btn';
      btn.textContent = letter;
      btn.addEventListener('click', () => handleDictationLetterTap(letter, btn, item));
      nodes.dictationLetters.appendChild(btn);
    });
  }
}

export function handleDictationLetterTap(letter, btn, item) {
  if (btn.disabled) return;

  const sessionToken = state.dictationSessionToken;

  // เล่นเสียงอักษรทันที
  const letterU = speakEN(letter.toLowerCase(), 0.55);

  state.dictationSelectedLetters.push({ letter, btnEl: btn });
  btn.disabled = true;

  // เอาตัวอักษรไปใส่ในช่องว่างที่ว่างอยู่
  const unfilledSlots = Array.from(nodes.dictationSlots.children).filter(
    slot => slot.dataset.fixedChar === undefined && !slot.dataset.isSpace && !slot.classList.contains('filled')
  );

  if (unfilledSlots.length > 0) {
    const targetSlot = unfilledSlots[0];
    targetSlot.textContent = letter;
    targetSlot.classList.add('filled');
  }

  // ตรวจสอบจำนวนอักษรที่กดสะกดเรียง
  const correctLettersCount = item.word.split('').filter(c => !isSeparatorChar(c)).length;
  if (state.dictationSelectedLetters.length === correctLettersCount) {
    // รอให้เสียงตัวอักษรสุดท้ายเล่นจบก่อนค่อยเฉลย (เดิมหน่วงคงที่ 600ms ไม่พอ)
    const reveal = () => {
      if (state.dictationSessionToken !== sessionToken || state.activeTab !== 'dictation') return;
      checkDictationSpelling(item);
    };
    if (letterU && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      let fired = false;
      const fire = (d) => {
        if (fired) return;
        fired = true;
        registerTimeout('dictation', reveal, d);
      };
      letterU.addEventListener('end', () => fire(350));
      letterU.addEventListener('error', () => fire(150));
      registerTimeout('dictation', () => fire(0), 4000); // safety cap if 'end' never fires
    } else {
      registerTimeout('dictation', reveal, 600);
    }
  }
}

export function checkDictationSpelling(item) {
  const sessionToken = state.dictationSessionToken;
  // รวบรวมตัวอักษรจากกล่อง Slots เพื่อนำมารวมกันเป็นคำศัพท์
  const spelledWord = Array.from(nodes.dictationSlots.children).map(slot => {
    if (slot.dataset.fixedChar !== undefined) return slot.dataset.fixedChar;
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
    state.dictationScore++;
    const currentScoreNode = document.getElementById('dictation-current-score');
    if (currentScoreNode) currentScoreNode.textContent = state.dictationScore;

    if (dictationBox) dictationBox.classList.add('dictation-bounce');
    if (nodes.dictationFeedback) {
      nodes.dictationFeedback.innerHTML = `<span class="correct">🎉 เก่งมากจ้า! สะกดถูกต้อง</span>`;
    }

    if (visualClueNode) {
      visualClueNode.innerHTML = renderVisualHTML(item.image, { trusted: !item.isCustom });
    }

    speakEN(item.word, 0.8);
    removeWeakWord(item.word);
  } else {
    // สะกดผิด
    if (dictationBox) dictationBox.classList.add('dictation-shake');
    if (nodes.dictationFeedback) {
      nodes.dictationFeedback.innerHTML = `<span class="wrong" style="color: var(--danger);">❌ ยังไม่ถูกน้า ตัวสะกดคือ "${escapeHTML(item.word)}"</span>`;
    }

    if (visualClueNode) {
      visualClueNode.innerHTML = renderVisualHTML(item.image, { trusted: !item.isCustom });
    }

    // สะกดให้ฟังอย่างละเอียด
    spellAndSpeak(item, null, 0.8);
    addWeakWord(item.word);
  }

  // อัปเดต Progress Bar สำหรับข้อปัจจุบัน
  const totalQuestions = state.dictationSessionList.length || 5;
  const progressBarNode = document.getElementById('dictation-progress-bar');
  const progressPct = ((state.currentDictationIndex + 1) / totalQuestions) * 100;
  if (progressBarNode) progressBarNode.style.width = `${progressPct}%`;

  // หน่วงเวลา 4.2 วินาที ก่อนขยับข้อถัดไป เพื่อให้เด็กสังเกตคำสะกดเฉลยและฟังเสียงสะกดจนเสร็จสิ้น
  registerTimeout('dictation', () => {
    if (state.dictationSessionToken !== sessionToken || state.activeTab !== 'dictation') return;
    state.currentDictationIndex++;
    if (state.currentDictationIndex < totalQuestions) {
      renderDictationQuestion();
    } else {
      showDictationResults();
    }
  }, 4200);
}

export function playDictationAudio(slowMode = false) {
  const currentItem = state.dictationSessionList[state.currentDictationIndex];
  if (!currentItem) return;

  stopAllSpeech();

  if (slowMode) {
    // สะกดคำศัพท์ทีละตัวอักษรช้าๆ
    spellAndSpeak(currentItem, null, 0.45);
  } else {
    // ออกเสียงทั้งคำภาษาอังกฤษและตามด้วยความหมายไทยเป็นคำใบ้
    speakEN(currentItem.word, 0.75);
    registerTimeout('speech', () => {
      if (state.activeTab === 'dictation') {
        speakTH(currentItem.meaning);
      }
    }, 1200);
  }
}

export function showDictationResults() {
  stopAllSpeech();

  if (nodes.dictationPlayArea) nodes.dictationPlayArea.style.display = 'none';
  if (nodes.dictationResultScreen) nodes.dictationResultScreen.style.display = 'block';

  const totalQuestions = state.dictationSessionList.length || 5;
  const resultScoreNode = document.getElementById('dictation-result-score');
  const resultTotalNode = document.getElementById('dictation-result-total');
  if (resultScoreNode) resultScoreNode.textContent = state.dictationScore;
  if (resultTotalNode) resultTotalNode.textContent = totalQuestions;

  const roundLabel = DICTATION_ROUND_LABELS[state.selectedDictationRound] || 'รอบที่ 1';
  const resultDescNode = document.getElementById('dictation-result-desc');
  if (resultDescNode) {
    resultDescNode.textContent = `น้องทำแบบทดสอบเขียนตามคำบอก ${roundLabel} สำเร็จแล้ว`;
  }

  let msg = '';
  if (state.dictationScore === totalQuestions) {
    msg = 'ยอดเยี่ยมที่สุดเลยจ้า! สะกดเขียนคำถูกต้องครบถ้วนทุกข้อเลย 🏆🌟';
    speakTH('ยอดเยี่ยมที่สุดเลยจ้า สะกดเขียนคำถูกต้องครบถ้วนทุกข้อเลย');
  } else if (state.dictationScore >= Math.ceil(totalQuestions * 0.6)) {
    msg = 'ดีมากเลยจ้า! น้องตอบถูกส่วนใหญ่ ฝึกฝนอีกนิดจะเก่งมากยิ่งขึ้นนะจ๊ะ 👍';
    speakTH('ดีมากเลยจ้า น้องตอบถูกส่วนใหญ่ ฝึกฝนอีกนิดจะเก่งมากยิ่งขึ้นนะจ๊ะ');
  } else {
    msg = 'พยายามต่อไปน้าคนเก่ง! หมั่นกลับไปทบทวนสะกดคำศัพท์แล้วมาเล่นใหม่จ้า ✏️';
    speakTH('พยายามต่อไปน้าคนเก่ง หมั่นกลับไปทบทวนสะกดคำศัพท์แล้วมาเล่นใหม่จ้า');
  }

  const resultMsgNode = document.getElementById('dictation-result-message');
  if (resultMsgNode) resultMsgNode.textContent = msg;

  saveDictationHistory(state.dictationScore);
}

// เรนเดอร์รายการสถิติการเขียนตามคำบอกลงใน Dashboard
export function renderDictationHistoryInDashboard() {
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

    const totalQ = attempt.total || (attempt.round === 'r6' ? 8 : 5);
    let stars = '';
    for (let s = 0; s < totalQ; s++) {
      stars += s < attempt.score ? '⭐' : '☆';
    }

    const roundName = DICTATION_ROUND_LABELS[attempt.round] || 'รอบที่ 1';

    item.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">
        <span style="font-weight: 700; color: var(--dark-2); font-size: 0.95rem;">เขียนตามคำบอก ${escapeHTML(roundName)}</span>
        <span style="font-size: 0.75rem; color: var(--text-light);">${escapeHTML(attempt.date)} น.</span>
      </div>
      <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
        <span style="color: var(--accent-dark); font-weight: 700; font-size: 1.1rem; letter-spacing: 2px;">${stars}</span>
        <span style="font-size: 0.85rem; font-weight: 700; color: var(--primary-hover);">${Number(attempt.score) || 0} / ${totalQ} คะแนน</span>
      </div>
    `;
    listNode.appendChild(item);
  });
}
