const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function collectJsFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectJsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results.sort();
}

// 1. ตรวจสอบ Syntax เบื้องต้นของทุกไฟล์ใน src/ และ firebase-config.js
console.log('🔍 กำลังตรวจสอบ Syntax ของไฟล์ JS...');
const jsFiles = ['firebase-config.js', ...collectJsFiles('./src')];
try {
  for (const file of jsFiles) {
    execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  }
  console.log(`✅ Syntax ถูกต้องทุกไฟล์! (${jsFiles.length} ไฟล์)\n`);
} catch (e) {
  console.error('❌ พบ Syntax Error ในโค้ด!');
  process.exit(1);
}

// 2. ตรวจสอบว่าไม่มี inline onclick= / onsubmit= ใน index.html และ src/
console.log('🛡️ กำลังตรวจสอบความสะอาดจาก inline event handlers...');
const htmlSource = fs.readFileSync('./index.html', 'utf8');
if (/\bon(?:click|submit|load|error)=/i.test(htmlSource)) {
  console.error('❌ พบ inline event handler ใน index.html!');
  process.exit(1);
}
for (const file of collectJsFiles('./src')) {
  if (file === path.join('src', 'utils', 'sanitize.js')) continue;
  const content = fs.readFileSync(file, 'utf8');
  if (/\bonclick=|\bonsubmit=/i.test(content)) {
    console.error(`❌ พบ inline onclick=/onsubmit= ใน ${file}!`);
    process.exit(1);
  }
}
console.log('✅ ไม่พบ inline onclick=/onsubmit= ใน index.html และ src/\n');

// 3. Mock Browser Environment สำหรับทดสอบ ES Modules
function createMockEl(tagName = 'div', id = '') {
  const classes = new Set();
  const listeners = new Map();
  const attributes = new Map();
  const el = {
    tagName: tagName.toUpperCase(),
    id,
    open: false,
    children: [],
    dataset: {},
    style: { setProperty: () => {} },
    _innerHTML: '',
    get innerHTML() {
      return el._innerHTML;
    },
    set innerHTML(val) {
      el._innerHTML = String(val ?? '');
      if (el._innerHTML === '') el.children.length = 0;
    },
    textContent: '',
    disabled: false,
    _className: '',
    get className() {
      return Array.from(classes).join(' ');
    },
    set className(val) {
      classes.clear();
      String(val || '').split(/\s+/).filter(Boolean).forEach(c => classes.add(c));
    },
    classList: {
      add: (...names) => names.forEach(n => classes.add(n)),
      remove: (...names) => names.forEach(n => classes.delete(n)),
      toggle: (name, force) => {
        if (force === undefined) {
          if (classes.has(name)) classes.delete(name);
          else classes.add(name);
        } else if (force) {
          classes.add(name);
        } else {
          classes.delete(name);
        }
      },
      contains: (name) => classes.has(name)
    },
    addEventListener: (evt, fn) => {
      if (!listeners.has(evt)) listeners.set(evt, []);
      listeners.get(evt).push(fn);
    },
    dispatchMockEvent: (evt, payload = {}) => {
      for (const fn of (listeners.get(evt) || [])) {
        fn(payload);
      }
    },
    showModal: () => {
      el.open = true;
    },
    close: () => {
      if (el.open) {
        el.open = false;
        el.dispatchMockEvent('close', {});
      }
    },
    appendChild: (child) => {
      el.children.push(child);
      if (el.tagName === 'HEAD' && child && child.tagName === 'SCRIPT') {
        queueMicrotask(() => child.dispatchMockEvent('error', {}));
      }
      return child;
    },
    setAttribute: (k, v) => {
      attributes.set(String(k), String(v));
    },
    getAttribute: (k) => (attributes.has(String(k)) ? attributes.get(String(k)) : null),
    removeAttribute: (k) => {
      attributes.delete(String(k));
    },
    remove: () => {},
    querySelector: () => createMockEl(),
    querySelectorAll: () => [],
    closest: () => createMockEl(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 40, right: 100, bottom: 40 })
  };
  return el;
}

const elementsById = new Map();
function getMockById(id) {
  if (!elementsById.has(id)) {
    elementsById.set(id, createMockEl('div', id));
  }
  return elementsById.get(id);
}

// Match initial active classes in index.html
getMockById('quiz-length-10').classList.add('active');
getMockById('game-mode-mixed').classList.add('active');

const localStore = new Map();
global.localStorage = {
  get length() {
    return localStore.size;
  },
  key: (i) => Array.from(localStore.keys())[i] ?? null,
  getItem: (k) => (localStore.has(k) ? localStore.get(k) : null),
  setItem: (k, v) => {
    localStore.set(String(k), String(v));
  },
  removeItem: (k) => {
    localStore.delete(String(k));
  },
  clear: () => {
    localStore.clear();
  }
};

global.SpeechSynthesisUtterance = function (text) {
  this.text = text;
  this.addEventListener = () => {};
};

global.window = {
  __QUIZ_TEST_ENV__: true,
  addEventListener: () => {},
  dispatchEvent: () => {},
  innerWidth: 1024,
  innerHeight: 768,
  speechSynthesis: {
    resume: () => {},
    cancel: () => {},
    speak: () => {},
    getVoices: () => [],
    addEventListener: () => {}
  }
};

global.confirm = () => true;
global.alert = () => {};

global.document = {
  readyState: 'complete',
  hidden: false,
  head: createMockEl('head'),
  body: createMockEl('body'),
  addEventListener: () => {},
  getElementById: (id) => getMockById(id),
  querySelector: () => createMockEl(),
  querySelectorAll: () => [],
  createElement: (tag) => createMockEl(tag)
};

async function runTests() {
  const [
    { VOCAB_UNITS, UNIT_META, EXAM_PREP_CATALOG },
    { state, initNodes, clearAllScopedTimers },
    { initCustomVocabData, setCurrentTerm, loadUnitVocab },
    { startNewChallenge, renderQuestion },
    { initDictationStudyMode, resetDictationSpelling },
    { switchSpecialActivity },
    {
      resetSpellingPractice,
      getWordCategory,
      setLearnCategoryFilter,
      openSpellingPractice,
      closeSpellingPractice,
      initSpellingDialogEvents
    },
    { calcSkillPct, generateRecommendationsForParents, renderEvaluationCharts, clearHistoryData },
    { escapeHTML, sanitizeSVG, sanitizeCustomImage, renderVisualHTML },
    { shuffle, shuffleScrambled },
    { getSentenceQA },
    { saveWeakWordList },
    { showToast },
    { LOCKED_TABS, applyBlob }
  ] = await Promise.all([
    import('./src/data/units.js'),
    import('./src/state/store.js'),
    import('./src/features/catalog.js'),
    import('./src/features/game.js'),
    import('./src/features/dictation.js'),
    import('./src/features/special.js'),
    import('./src/features/learn.js'),
    import('./src/features/dashboard.js'),
    import('./src/utils/sanitize.js'),
    import('./src/utils/shuffle.js'),
    import('./src/utils/word-helpers.js'),
    import('./src/services/storage.js'),
    import('./src/utils/toast.js'),
    import('./src/services/sync.js')
  ]);

  initNodes();
  initCustomVocabData();

  let allPassed = true;
  const assert = (cond, msg) => {
    if (!cond) {
      console.error(`❌ ${msg}`);
      allPassed = false;
    }
  };

  // ==========================================================
  // A. ทดสอบ Security & XSS Sanitizer
  // ==========================================================
  console.log('🔐 กำลังทดสอบระบบ Sanitizer & Security...');
  const xssSvg1 = sanitizeSVG('<svg onload="alert(1)"><script>alert(2)</script><circle cx="10" cy="10" r="5" fill="red"/></svg>');
  assert(
    xssSvg1.includes('<circle') && !/onload/i.test(xssSvg1) && !/<script/i.test(xssSvg1),
    `SVG sanitizer failed on <script>/onload: ${xssSvg1}`
  );

  const xssSvg2 = sanitizeSVG('<svg><foreignObject><body onload="alert(1)">xss</body></foreignObject><rect width="10" height="10"/></svg>');
  assert(
    xssSvg2.includes('<rect') && !/foreignObject/i.test(xssSvg2) && !/<body/i.test(xssSvg2),
    `SVG sanitizer failed on <foreignObject>: ${xssSvg2}`
  );

  const xssSvg3 = sanitizeSVG('<svg><a href="javascript:alert(1)"><rect width="10" height="10"/></a></svg>');
  assert(
    !/<a[\s>]/i.test(xssSvg3) && !/javascript:/i.test(xssSvg3),
    `SVG sanitizer failed on <a href="javascript:">: ${xssSvg3}`
  );

  const badImg = sanitizeCustomImage('<img src=x onerror=alert(1)>');
  assert(badImg.ok === false, 'sanitizeCustomImage should reject <img> XSS payload');

  const escapedImg = renderVisualHTML('<img src=x onerror=alert(1)>', { trusted: false });
  assert(escapedImg.startsWith('&lt;img') && !escapedImg.includes('<img'), `renderVisualHTML should escape HTML: ${escapedImg}`);

  const goodEmoji = sanitizeCustomImage('🐱');
  assert(goodEmoji.ok === true && goodEmoji.value === '🐱', 'sanitizeCustomImage should allow plain emoji');

  const trustedAnimatedSvg = '<svg viewBox="0 0 100 100"><style>.x{}</style><circle cx="50" cy="50" r="10"/></svg>';
  assert(renderVisualHTML(trustedAnimatedSvg, { trusted: true }) === trustedAnimatedSvg, 'Trusted built-in SVG must be preserved');
  assert(escapeHTML(`<b title="'x'">&`) === '&lt;b title=&quot;&#39;x&#39;&quot;&gt;&amp;', 'escapeHTML check failed');

  // Bug #10 & Cloud Blob allowlist
  assert(LOCKED_TABS.includes('tab-special'), 'sync.js LOCKED_TABS must include tab-special');
  localStore.clear();
  applyBlob({
    'aura_kids_total_stars_v1': '15',
    'evil_key': 'pwned',
    'aura_kids_client_id': 'hijack',
    'aura_kids_bad_type': { nested: true }
  });
  assert(localStore.get('aura_kids_total_stars_v1') === '15', 'applyBlob should store valid aura_kids_ string');
  assert(!localStore.has('evil_key'), 'applyBlob must reject non-prefixed keys');
  assert(!localStore.has('aura_kids_client_id'), 'applyBlob must protect META_KEYS');
  assert(!localStore.has('aura_kids_bad_type'), 'applyBlob must reject non-string values');
  console.log('✅ Security & Sanitizer ผ่านครบทุกกรณี!\n');

  // ==========================================================
  // B. ทดสอบระบบแยกเทอม & Bugfixes (#1, #2, #3, #6, #9, #11, #13, #14)
  // ==========================================================
  console.log('📅 กำลังทดสอบระบบแยกเทอม (Term 1 / Term 2) และ Bugfixes...');
  if (state.currentTerm !== 2 || state.currentUnitId !== 'unit_5' || state.selectedDictationRound !== 'r6') {
    console.error(`❌ ค่าเริ่มต้นไม่ถูกต้อง: term=${state.currentTerm}, unit=${state.currentUnitId}, dictation=${state.selectedDictationRound}`);
    allPassed = false;
  } else {
    console.log('✅ ค่าเริ่มต้นถูกต้อง: เทอม 2 (Unit 5 + Dictation ยูนิต 5)');
  }

  // Bug #6: ป้ายเทอม 2 ต้องรวม Unit 6
  const termBtns = getMockById('learn-term-selector').children;
  const term2Btn = termBtns.find(b => b.dataset && b.dataset.term === '2');
  assert(term2Btn && term2Btn.textContent.includes('Unit 5–6'), `Term 2 label should include Unit 5–6, got: ${term2Btn?.textContent}`);

  // สลับเป็นเทอม 1 และสลับกลับเทอม 2
  setCurrentTerm(1);
  if (state.currentTerm !== 1 || state.currentUnitId !== 'unit_1' || state.selectedDictationRound !== 'r1') {
    console.error(`❌ สลับเป็นเทอม 1 ไม่ถูกต้อง: term=${state.currentTerm}, unit=${state.currentUnitId}, dictation=${state.selectedDictationRound}`);
    allPassed = false;
  } else {
    console.log('✅ สลับเป็นเทอม 1 ผ่านฉลุย! (unit_1 + dictation r1)');
  }

  setCurrentTerm(2);
  if (state.currentTerm !== 2 || state.currentUnitId !== 'unit_5' || state.selectedDictationRound !== 'r6') {
    console.error(`❌ สลับกลับเทอม 2 ไม่ถูกต้อง: term=${state.currentTerm}, unit=${state.currentUnitId}, dictation=${state.selectedDictationRound}`);
    allPassed = false;
  } else {
    console.log('✅ สลับกลับเทอม 2 ผ่านฉลุย! (unit_5 + dictation r6)');
  }

  // ทดสอบโหลด Unit 6 และตรวจสอบ Bug #1 (Cross-Unit Reset)
  loadUnitVocab('unit_5');
  startNewChallenge();
  assert(state.challengeQuestions.length === 10, 'Expected unit_5 challenge to have 10 questions');
  state.hasCompletedAssessment = true;
  loadUnitVocab('unit_6');
  assert(state.challengeQuestions.length === 0 && state.hasCompletedAssessment === false, 'Bug #1: loadUnitVocab must reset previous unit challenge state');
  if (state.currentTerm !== 2 || state.currentUnitId !== 'unit_6' || state.ORIGINAL_VOCAB_LIST.length !== 8) {
    console.error(`❌ โหลด Unit 6 ไม่ถูกต้อง: term=${state.currentTerm}, unit=${state.currentUnitId}, count=${state.ORIGINAL_VOCAB_LIST ? state.ORIGINAL_VOCAB_LIST.length : 0}`);
    allPassed = false;
  } else {
    console.log(`✅ โหลด Unit 6 + Cross-Unit State Reset สำเร็จ (รวม ${VOCAB_UNITS.length} ยูนิต)`);
  }

  // Bug #2 & #11: Radar / Recommendations Math + Offline Chart.js
  assert(calcSkillPct({ total: 4, correct: 0 }) === 0, 'Bug #2: 0/4 must return 0%, not 100%');
  assert(calcSkillPct({ total: 0, correct: 0 }) === null, 'Bug #2: 0/0 must return null, not NaN');
  const mockSkills = {
    Listening: { total: 4, correct: 0 },
    "Word Recognition": { total: 0, correct: 0 },
    "Visual Matching": { total: 2, correct: 2 },
    "Spelling & Phonics": { total: 0, correct: 0 },
    "Sentence Q&A": { total: 0, correct: 0 }
  };
  generateRecommendationsForParents(mockSkills);
  const recHtml = getMockById('rec-body-content').innerHTML;
  assert(recHtml.includes('0%') && !recHtml.includes('NaN'), `Bug #2: recommendations must flag 0% without NaN: ${recHtml}`);
  global.Chart = undefined;
  await renderEvaluationCharts(mockSkills, []);
  const insightHtml = getMockById('skills-insight-text').innerHTML;
  assert(insightHtml.includes('0%') && !insightHtml.includes('NaN'), `Bug #2/#11: insight must report 0% offline without NaN: ${insightHtml}`);

  // Bug #3: clearHistoryData
  state.hasCompletedAssessment = true;
  state.challengeQuestions = [{ id: 1 }];
  clearHistoryData();
  assert(state.hasCompletedAssessment === false && state.challengeQuestions.length === 0, 'Bug #3: clearHistoryData must reset in-memory state');

  // Bug #9: Hyphenated word Yo-yo in Spelling Modal & Dictation
  const yoyo = { word: 'Yo-yo', meaning: 'ลูกดิ่งโยโย่', image: '🪀' };
  resetSpellingPractice(yoyo);
  const spSlots = getMockById('spelling-modal-slots').children;
  const spLetters = getMockById('spelling-modal-letters').children;
  assert(spSlots.length === 5 && spSlots[2].dataset.fixedChar === '-', 'Bug #9: Spelling modal must keep hyphen as fixed slot');
  assert(spLetters.length === 4 && !spLetters.some(b => b.textContent === '-'), 'Bug #9: Spelling modal must not emit hyphen letter tile');

  resetDictationSpelling(yoyo);
  const dicSlots = getMockById('dictation-slots').children;
  const dicLetters = getMockById('dictation-letters').children;
  assert(dicSlots.length === 5 && dicSlots[2].dataset.fixedChar === '-', 'Bug #9: Dictation must keep hyphen as fixed slot');
  assert(dicLetters.length === 4 && !dicLetters.some(b => b.textContent === '-'), 'Bug #9: Dictation must not emit hyphen letter tile');

  // Bug #13: Fisher-Yates & Scrambled guarantees
  for (let i = 0; i < 30; i++) {
    assert(shuffleScrambled(['C', 'a', 't']).join('') !== 'Cat', 'Bug #13: shuffleScrambled must not return unscrambled Cat');
  }
  assert(shuffle([1, 2, 3]).sort().join(',') === '1,2,3', 'shuffle must preserve all elements');

  // Bug #14: Sentence Q&A grammar for adjectives/verbs/family
  assert(!getSentenceQA({ word: 'Tall', meaning: 'สูง', label: 'adj' }).answer.includes('a tall'), 'Bug #14: Tall must not use article a');
  assert(getSentenceQA({ word: 'Mother', meaning: 'แม่', label: 'n' }).answer === 'She’s my mother.', 'Bug #14: Mother QA check');
  assert(getSentenceQA({ word: 'Big', meaning: 'ใหญ่', label: 'adj' }).answer === 'It’s big.', 'Bug #14: Big QA check');
  assert(getSentenceQA({ word: 'Ride', meaning: 'ขี่', label: 'v' }).answer === 'I can ride.', 'Bug #14: Ride QA check');
  console.log('✅ Bugfixes ทั้งหมด (#1, #2, #3, #6, #9, #10, #11, #13, #14) ผ่านฉลุย!\n');

  // ==========================================================
  // C. ทดสอบการสร้างข้อสอบและ Render ในแต่ละโหมด (9 Units/Exams)
  // ==========================================================
  console.log('🎮 กำลังทดสอบฟังก์ชันสร้างข้อสอบและการทำงานของแต่ละโหมด...');
  const testUnits = [
    { id: 'unit_1', expected: 10, name: 'Unit 1: Things for school' },
    { id: 'unit_2', expected: 10, name: 'Unit 2: Colors & Shapes' },
    { id: 'unit_3', expected: 10, name: 'Unit 3: At the Store' },
    { id: 'unit_4', expected: 10, name: 'Unit 4: People at Home' },
    { id: 'unit_5', expected: 10, name: 'Unit 5: Birthday and Toys' },
    { id: 'unit_6', expected: 10, name: 'Unit 6: Outdoors' },
    { id: 'midterm_prep', expected: 21, name: '🎓 เตรียมสอบกลางภาค (Let\'s Go 1 Unit 1-2)' },
    { id: 'final_exam_prep', expected: 29, name: '🌟 เตรียมสอบปลายภาค (Let\'s Go 3 Unit 3-4)' },
    { id: 'unit5_exam', expected: 20, name: '🎯 สอบท้ายบท Unit 5 (Birthday and Toys)' }
  ];

  testUnits.forEach(u => {
    try {
      loadUnitVocab(u.id);
      startNewChallenge();
      const qs = state.challengeQuestions;
      if (qs.length !== u.expected) {
        console.error(`❌ ${u.name}: ได้ ${qs.length} ข้อ (คาดหวัง ${u.expected} ข้อ)`);
        allPassed = false;
        return;
      }

      // ตรวจสอบไม่ให้มีประโยคคำตอบซ้ำกันในข้อสอบ Unit 5 Exam
      if (u.id === 'unit5_exam') {
        const sentTargets = qs
          .filter(q => q.skill === 'Grammar: a/an + Adj' || q.skill === 'Sentence Q&A')
          .map(q => q.targetWord.word.toLowerCase());
        if (new Set(sentTargets).size !== sentTargets.length) {
          console.error(`❌ ${u.name}: พบประโยคซ้ำในชุดข้อสอบ!`, sentTargets);
          allPassed = false;
          return;
        }
      }

      // ทดสอบ Render ข้อสอบทุกข้อว่าไม่มี Error
      for (let i = 0; i < qs.length; i++) {
        renderQuestion(i);
      }

      console.log(`✅ ${u.name} ผ่านฉลุย! (สร้างและ Render ครบ ${qs.length}/${u.expected} ข้อ)`);
    } catch (err) {
      console.error(`❌ ${u.name} พบ Error:`, err.message);
      allPassed = false;
    }
  });

  // ==========================================================
  // D. ทดสอบโหมดเขียนตามคำบอก (Dictation)
  // ==========================================================
  console.log('\n📝 กำลังทดสอบโหมดเขียนตามคำบอก (Dictation)...');
  try {
    state.selectedDictationRound = 'r6';
    initDictationStudyMode();
    if (state.dictationSessionList.length !== 8) {
      console.error(`❌ Dictation Unit 5 (r6): ได้ ${state.dictationSessionList.length} คำ (คาดหวัง 8 คำ)`);
      allPassed = false;
    } else {
      console.log(`✅ Dictation Unit 5 (r6) โหลดคำศัพท์ครบ 8 คำ: ${state.dictationSessionList.map(w => w.word).join(', ')}`);
    }
  } catch (err) {
    console.error('❌ Dictation Unit 5 พบ Error:', err.message);
    allPassed = false;
  }

  // ==========================================================
  // E. ทดสอบโหมดแบบฝึกพิเศษ Unit 3 (Special Practice 1–4)
  // ==========================================================
  console.log('\n⭐ กำลังทดสอบโหมดแบบฝึกพิเศษ Unit 3 (Special Practice)...');
  try {
    const expectedTotals = { 1: 7, 2: 7, 3: 8, 4: 6 };
    for (const act of [1, 2, 3, 4]) {
      switchSpecialActivity(act);
      if (state.spQuestions.length !== expectedTotals[act] || state.spTotal !== expectedTotals[act]) {
        console.error(`❌ Special Activity ${act}: ได้ ${state.spQuestions.length} ข้อ (คาดหวัง ${expectedTotals[act]} ข้อ)`);
        allPassed = false;
      } else {
        console.log(`✅ Special Activity ${act} ผ่านฉลุย! (${state.spTotal} ข้อ)`);
      }
    }
  } catch (err) {
    console.error('❌ Special Practice พบ Error:', err.message);
    allPassed = false;
  }

  // ==========================================================
  // F. ทดสอบ Phase 3 Architecture, Lesson Shelf, Category Filter & Native <dialog>
  // ==========================================================
  console.log('\n🎨 กำลังทดสอบ Phase 3 UI Architecture, Lesson Shelf, Category Filter และ Native <dialog>...');
  const expectedCssFiles = [
    'css/tokens.css',
    'css/base.css',
    'css/layout.css',
    'css/components.css',
    'css/features.css',
    'css/responsive.css'
  ];
  for (const cssFile of expectedCssFiles) {
    assert(fs.existsSync(cssFile), `Missing modular stylesheet: ${cssFile}`);
    assert(htmlSource.includes(`href="${cssFile}"`), `index.html missing link to ${cssFile}`);
  }
  assert(!fs.existsSync('style.css'), 'Obsolete root style.css should be deleted');

  // Verify native <dialog>, light-dismiss closedby="any", and zero .bubble blobs
  assert(
    /<dialog\b[^>]*id="spelling-practice-modal"[^>]*closedby="any"[^>]*aria-labelledby="spelling-modal-title"/i.test(htmlSource),
    'index.html must use native <dialog id="spelling-practice-modal" closedby="any" aria-labelledby="spelling-modal-title">'
  );
  assert(!/role="dialog"|aria-modal=/i.test(htmlSource), 'Native <dialog> must not duplicate role="dialog" or aria-modal');
  assert(!/<div class="bubble/i.test(htmlSource), 'Decorative .bubble blobs should be removed from index.html');

  // Verify zero style.cssText in catalog.js and dictation.js
  assert(!/cssText/.test(fs.readFileSync('src/features/catalog.js', 'utf8')), 'catalog.js must not assign style.cssText');
  assert(!/cssText/.test(fs.readFileSync('src/features/dictation.js', 'utf8')), 'dictation.js must not assign style.cssText');

  // Verify UNIT_META and EXAM_PREP_CATALOG completeness
  VOCAB_UNITS.forEach(u => {
    assert(Boolean(UNIT_META[u.id]), `UNIT_META missing entry for ${u.id}`);
  });
  const examIds = EXAM_PREP_CATALOG.map(e => e.id);
  assert(
    examIds.includes('midterm_prep') && examIds.includes('final_exam_prep') && examIds.includes('unit5_exam'),
    'EXAM_PREP_CATALOG must cover midterm_prep, final_exam_prep, unit5_exam'
  );

  // Verify word category classifier & filter pills
  assert(getWordCategory({ word: 'Bag', label: 'n' }) === 'noun', 'getWordCategory failed for noun');
  assert(getWordCategory({ word: 'Open', label: 'v.t' }) === 'verb', 'getWordCategory failed for v.t');
  assert(getWordCategory({ word: 'Sing', label: 'v.i' }) === 'verb', 'getWordCategory failed for v.i');
  assert(getWordCategory({ word: 'Run', label: 'v' }) === 'verb', 'getWordCategory failed for v');
  assert(getWordCategory({ word: 'Big', label: 'adj' }) === 'adj', 'getWordCategory failed for adj');
  assert(getWordCategory({ word: 'Stand up', type: 'command' }) === 'command', 'getWordCategory failed for command');
  assert(getWordCategory({ word: "Here you are", label: 'phrase' }) === 'command', 'getWordCategory failed for phrase');
  assert(getWordCategory({ word: 'Custom' }) === 'other', 'getWordCategory failed for custom/unlabeled');

  loadUnitVocab('unit_5');
  setLearnCategoryFilter('adj');
  const adjCards = getMockById('vocabGrid').children;
  assert(adjCards.length === 8, `Unit 5 adj filter expected 8 cards, got ${adjCards.length}`);

  saveWeakWordList(['Kite', 'Robot']);
  setLearnCategoryFilter('weak');
  const weakCards = getMockById('vocabGrid').children;
  assert(weakCards.length === 2, `Unit 5 weak filter expected 2 cards, got ${weakCards.length}`);
  saveWeakWordList([]);
  setLearnCategoryFilter('all');

  // Verify native <dialog> lifecycle
  initSpellingDialogEvents();
  const modalEl = getMockById('spelling-practice-modal');
  openSpellingPractice(yoyo);
  assert(modalEl.open === true && state.currentPracticeItem === yoyo, 'openSpellingPractice must open <dialog> and set item');
  closeSpellingPractice();
  assert(modalEl.open === false && state.currentPracticeItem === null, 'closeSpellingPractice must close <dialog> and clear item');

  // Verify toast helper
  const toastEl = showToast('ทดสอบการแจ้งเตือน', 'success');
  assert(
    toastEl && toastEl.className.includes('app-toast--success') && getMockById('app-toast-region').children.length >= 1,
    'showToast must append styled toast element into #app-toast-region'
  );
  console.log('✅ Phase 3 UX/UI Architecture, Lesson Shelf, Category Filter & Native <dialog> ผ่านครบทุกกรณี!');

  // Clear any pending scoped timers/intervals from tests so Node exits immediately
  clearAllScopedTimers();
  if (state.gameTimerInterval) {
    clearInterval(state.gameTimerInterval);
    state.gameTimerInterval = null;
  }

  testsCompleted = true;

  if (allPassed) {
    console.log('\n🎉 ทุกโหมดและ Security/Bug Regression Tests ผ่านการทดสอบ 100%!');
    process.exit(0);
  } else {
    console.log('\n⚠️ มีบางการทดสอบไม่ผ่าน กรุณาตรวจสอบรายละเอียดด้านบน');
    process.exit(1);
  }
}

let testsCompleted = false;
process.on('beforeExit', () => {
  if (!testsCompleted) {
    console.error('❌ Test runner exited early before completing all tests!');
    process.exit(1);
  }
});

runTests().catch(err => {
  console.error('❌ Unhandled test error:', err);
  process.exit(1);
});
