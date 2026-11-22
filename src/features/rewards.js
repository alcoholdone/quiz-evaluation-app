import { state } from '../state/store.js';
import {
  getTotalStars,
  subtractStars,
  getExchangeRate,
  saveExchangeRate,
  getRedeemLog,
  saveRedeemLog
} from '../services/storage.js';
import { stopAllSpeech, speakTH, makeUtterance, playFeedbackSounds } from '../services/speech.js';

export function initStarsSystem() {
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
export function calculateStarsEarned(correctCount, totalQuestions) {
  if (!totalQuestions || totalQuestions <= 0) return 0;
  const ratio = correctCount / totalQuestions;
  if (ratio >= 1) return 3;
  if (ratio >= 0.8) return 2;
  if (ratio >= 0.5) return 1;
  return 0;
}

export function updateTotalStarsBadgeUI() {
  const countEl = document.getElementById('total-stars-count');
  if (countEl) {
    countEl.textContent = getTotalStars();
  }
}

// Confetti Particle Explosion
export function spawnStarConfetti(x, y, count = 30) {
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
export function celebrateStars() {
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
}

// Celebrate Quiz Results
export function celebrateQuizResult(correctCount, starsEarned) {
  // Center of screen confetti burst
  const x = window.innerWidth / 2;
  const y = window.innerHeight / 2 - 100;

  if (state.currentUnitId === 'midterm_prep') {
    // Grand celebration for midterm exam prep completion!
    spawnStarConfetti(x - 120, y, 25);
    spawnStarConfetti(x + 120, y, 25);
    setTimeout(() => spawnStarConfetti(x, y - 60, 35), 250);
    setTimeout(() => spawnStarConfetti(x, y, 20), 500);

    stopAllSpeech();
    playFeedbackSounds([
      makeUtterance('เย้! สอบจำลองกลางภาคสำเร็จแล้วค่ะ', 'th-TH', 1),
      makeUtterance(`น้องตอบถูก ${correctCount} จาก ${state.challengeQuestions.length} ข้อ และได้รับโบนัสดาวทองคำพิเศษ 20 ดวงสำหรับความพยายามสะสมไปเลยจ้า!`, 'th-TH', 1)
    ]);
    return;
  }

  if (state.currentUnitId === 'final_exam_prep') {
    // Grand celebration for final exam prep completion!
    spawnStarConfetti(x - 120, y, 30);
    spawnStarConfetti(x + 120, y, 30);
    setTimeout(() => spawnStarConfetti(x, y - 60, 40), 250);
    setTimeout(() => spawnStarConfetti(x, y, 25), 500);

    stopAllSpeech();
    playFeedbackSounds([
      makeUtterance('เย้! สอบจำลองปลายภาคสำเร็จแล้วค่ะ', 'th-TH', 1),
      makeUtterance(`น้องตอบถูก ${correctCount} จาก ${state.challengeQuestions.length} ข้อ และได้รับโบนัสดาวทองคำพิเศษ 25 ดวงยอดเยี่ยมที่สุดเลยจ้า!`, 'th-TH', 1)
    ]);
    return;
  }

  if (state.currentUnitId === 'unit5_exam') {
    // Grand celebration for Unit 5 chapter exam completion!
    spawnStarConfetti(x - 120, y, 25);
    spawnStarConfetti(x + 120, y, 25);
    setTimeout(() => spawnStarConfetti(x, y - 60, 35), 250);
    setTimeout(() => spawnStarConfetti(x, y, 20), 500);

    stopAllSpeech();
    playFeedbackSounds([
      makeUtterance('เย้! ทำข้อสอบท้ายบท Unit 5 สำเร็จแล้วค่ะ', 'th-TH', 1),
      makeUtterance(`น้องตอบถูก ${correctCount} จาก ${state.challengeQuestions.length} ข้อ และได้รับโบนัสดาวทองคำพิเศษ 20 ดวงเก่งมากเลยจ้า!`, 'th-TH', 1)
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

// Render the Reward Store
export function renderRewardsStore() {
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
export function makeParentalMathChallenge() {
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
export function verifyParentalAccess(reason) {
  const challenge = makeParentalMathChallenge();
  const input = prompt(`🔒 ${reason}\n\nให้คุณพ่อคุณแม่ช่วยตอบโจทย์เลขนี้เพื่อยืนยันค่ะ\n\n${challenge.text} = ?`);
  if (input === null) return false; // cancelled
  return parseInt(input, 10) === challenge.answer;
}

// Generate Parental Lock Math Question
export function generateParentLockQuestion() {
  const questionEl = document.getElementById('lock-question');
  if (!questionEl) return;

  // Random simple multiplication or addition
  const isMultiplication = Math.random() < 0.5;
  if (isMultiplication) {
    const a = 2 + Math.floor(Math.random() * 8); // 2 to 9
    const b = 3 + Math.floor(Math.random() * 7); // 3 to 9
    questionEl.textContent = `${a} x ${b} = ?`;
    state.currentParentLockAnswer = a * b;
  } else {
    const a = 11 + Math.floor(Math.random() * 30); // 11 to 40
    const b = 12 + Math.floor(Math.random() * 30); // 12 to 41
    questionEl.textContent = `${a} + ${b} = ?`;
    state.currentParentLockAnswer = a + b;
  }
}

export function updateRateDisplayText(rate) {
  const displayText = document.getElementById('rate-display-text');
  if (displayText) {
    displayText.textContent = `1 ดาว = ${rate} บาท`;
  }
}

export function updateRedeemPreview() {
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

export function handleRedeemSubmit() {
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
  if (parentAnswer !== state.currentParentLockAnswer) {
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
  updateTotalStarsBadgeUI();

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
    spawnStarConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 30);
  }

  stopAllSpeech();
  playFeedbackSounds([
    makeUtterance('ยินดีด้วยค่ะ แลกรางวัลสำเร็จแล้วนะจ๊ะ', 'th-TH', 1),
    makeUtterance(`น้องหักดาวทอง ${starsToRedeem} ดวง แลกเป็นเงินรางวัล ${amount} บาทสำเร็จแล้วจ้า คุณพ่อคุณแม่เตรียมรับรองและจ่ายเงินสดให้น้องด้วยนะจ๊ะ`, 'th-TH', 1)
  ]);
}

// Render Redemption History Table
export function renderRedeemHistoryTable() {
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
      <td data-label="วันที่-เวลา" style="padding: 10px; color: var(--text-muted); font-size: 0.85rem;">${item.dateTime}</td>
      <td data-label="ดาวที่แลก" style="padding: 10px; text-align: center; font-weight: 700; color: #d97706;">⭐ ${item.starsRedeemed} ดวง</td>
      <td data-label="เงินที่ได้รับ" style="padding: 10px; text-align: center; font-weight: 800; color: #16a34a;">${item.amountEarned} บาท</td>
      <td data-label="สถานะคุณแม่" style="padding: 10px; text-align: center;">
        <span class="${statusClass}" onclick="toggleRedeemPaidStatus(${idx})">${statusText}</span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Toggle paid status
export function toggleRedeemPaidStatus(idx) {
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
}
