import { state, nodes } from '../state/store.js';
import { escapeHTML } from '../utils/escape.js';
import { getSentenceQA } from '../utils/word-helpers.js';
import { stopAllSpeech, speakEN, speakTH, spellAndSpeak } from '../services/speech.js';
import { getHistory, getReviewSnapshot, clearUnitHistory } from '../services/storage.js';
import { renderDictationHistoryInDashboard } from './dictation.js';
import { renderCustomVocabTable } from './vocab-manager.js';
import {
  calculateStarsEarned,
  updateTotalStarsBadgeUI,
  renderRewardsStore
} from './rewards.js';

// DASHBOARD SUBTAB SWITCHING
export function switchDashboardTab(subtabId) {
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
  const assessmentNotCompleted = (history.length === 0 && !state.hasCompletedAssessment);

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

export function clearHistoryData() {
  if (confirm('คุณต้องการล้างประวัติการประเมินผลทั้งหมดของ Unit นี้ใช่หรือไม่?')) {
    clearUnitHistory();
    renderDashboard();
  }
}

export function renderDashboard() {
  const history = getHistory();

  // Restore standard single player dashboard items
  const normalGrid = document.querySelector('.db-grid');
  const normalCharts = document.querySelector('.db-charts-row');
  const normalRec = document.getElementById('db-rec-wrapper');

  if (normalGrid) normalGrid.style.display = 'grid';
  if (normalCharts) normalCharts.style.display = 'grid';
  if (normalRec) normalRec.style.display = 'block';

  if (history.length === 0 && !state.hasCompletedAssessment) {
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

  if (state.challengeQuestions.length > 0) {
    state.challengeQuestions.forEach((q, idx) => {
      const ans = state.userAnswers[idx];
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
    totalSecondsSpent = state.questionTimeSpent.reduce((a, b) => a + b, 0);
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

  const totalQuestions = state.challengeQuestions.length > 0 ? state.challengeQuestions.length : (history[history.length - 1] && history[history.length - 1].questionsCount ? history[history.length - 1].questionsCount : 10);
  const scaledScore = Math.round((correctCount / totalQuestions) * 500);

  // Bug #2 Fix: Calculate incorrect and skipped counts separately
  let incorrectCount = 0;
  let skippedCount = 0;
  if (state.challengeQuestions.length > 0) {
    state.challengeQuestions.forEach((q, idx) => {
      const ans = state.userAnswers[idx];
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
    summary.textContent = `ยอดเยี่ยมที่สุดเลยจ้า! น้องสะกดและเข้าใจคำศัพท์ทั้งหมด ${state.ORIGINAL_VOCAB_LIST.length} คำหลักได้อย่างคล่องแคล่วว่องไว พร้อมเรียนรู้คำศัพท์ระดับที่สูงขึ้นแล้ว!`;
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

export function generateRecommendationsForParents(skills) {
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
export function renderEvaluationCharts(skills, history) {
  // Reset charts instances
  if (state.skillsChart) state.skillsChart.destroy();
  if (state.trendChart) state.trendChart.destroy();

  const listenPct = Math.round((skills.Listening.correct / skills.Listening.total) * 100) || 100;
  const wordPct = Math.round((skills["Word Recognition"].correct / skills["Word Recognition"].total) * 100) || 100;
  const matchPct = Math.round((skills["Visual Matching"].correct / skills["Visual Matching"].total) * 100) || 100;
  const spellingPct = skills["Spelling & Phonics"] ? Math.round((skills["Spelling & Phonics"].correct / skills["Spelling & Phonics"].total) * 100) : 100;
  const qaPct = skills["Sentence Q&A"] ? Math.round((skills["Sentence Q&A"].correct / skills["Sentence Q&A"].total) * 100) : 100;

  // 1. Radar chart of Skills
  const radarCtx = document.getElementById('skillsRadarChart').getContext('2d');
  state.skillsChart = new Chart(radarCtx, {
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

    state.trendChart = new Chart(lineCtx, {
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

    state.trendChart = new Chart(lineCtx, {
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
export function renderDetailedReview() {
  const container = document.getElementById('review-list-container');
  container.innerHTML = '';

  // Prefer the in-memory session; fall back to the persisted snapshot (e.g. after a reload)
  let questions = state.challengeQuestions;
  let answers = state.userAnswers;
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
      qText = `คำถามไวยากรณ์ (Grammar): เติมบทสนทนาและตอบคำถามไวยากรณ์ "${q.questionText}" ให้ถูกต้องตามหลักภาษา`;
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
            if (state.activeTab === 'dashboard') {
              speakEN(correctOpt.text, 0.8);
              setTimeout(() => {
                if (state.activeTab === 'dashboard') speakTH(correctOpt.thaiText);
              }, 1200);
            }
          }, 1800);
        } else {
          const qaData = getSentenceQA(q.targetWord);
          // Queue question
          speakEN(qaData.question, 0.85);
          // Queue answer after a short pause
          setTimeout(() => {
            if (state.activeTab === 'dashboard') {
              speakEN(qaData.answer, 0.8);
              setTimeout(() => {
                if (state.activeTab === 'dashboard') speakTH(qaData.thaiAnswer);
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
            if (state.activeTab === 'dashboard') {
              speakEN(correctOpt.text, 0.8);
              setTimeout(() => {
                if (state.activeTab === 'dashboard') speakTH(`มันคือ${q.targetWord.meaning}`);
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
