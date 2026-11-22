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
try {
  const jsFiles = ['firebase-config.js', ...collectJsFiles('./src')];
  for (const file of jsFiles) {
    execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  }
  console.log(`✅ Syntax ถูกต้องทุกไฟล์! (${jsFiles.length} ไฟล์)\n`);
} catch (e) {
  console.error('❌ พบ Syntax Error ในโค้ด!');
  process.exit(1);
}

// 2. Mock Browser Environment สำหรับทดสอบ ES Modules
global.SpeechSynthesisUtterance = function (text) {
  this.text = text;
  this.addEventListener = () => {};
};

global.window = {
  __QUIZ_TEST_ENV__: true,
  addEventListener: () => {},
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

const mockEl = () => ({
  addEventListener: () => {},
  classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => true },
  style: { setProperty: () => {} },
  dataset: {},
  children: [],
  appendChild: () => {},
  innerHTML: '',
  textContent: '',
  setAttribute: () => {},
  getAttribute: () => null,
  querySelector: () => mockEl(),
  querySelectorAll: () => [],
  closest: () => mockEl(),
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 40 })
});

global.document = {
  readyState: 'complete',
  hidden: false,
  addEventListener: () => {},
  getElementById: () => mockEl(),
  querySelector: () => mockEl(),
  querySelectorAll: () => [],
  createElement: () => mockEl(),
  body: mockEl()
};

global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

async function runTests() {
  const [
    { VOCAB_UNITS },
    { state, initNodes },
    { initCustomVocabData, setCurrentTerm, loadUnitVocab },
    { startNewChallenge, renderQuestion },
    { initDictationStudyMode },
    { switchSpecialActivity }
  ] = await Promise.all([
    import('./src/data/units.js'),
    import('./src/state/store.js'),
    import('./src/features/catalog.js'),
    import('./src/features/game.js'),
    import('./src/features/dictation.js'),
    import('./src/features/special.js')
  ]);

  initNodes();
  initCustomVocabData();

  let allPassed = true;

  // 2.5 ทดสอบค่าเริ่มต้น (เทอม 2 -> Unit 5, Dictation r6)
  console.log('📅 กำลังทดสอบระบบแยกเทอม (Term 1 / Term 2)...');
  if (state.currentTerm !== 2 || state.currentUnitId !== 'unit_5' || state.selectedDictationRound !== 'r6') {
    console.error(`❌ ค่าเริ่มต้นไม่ถูกต้อง: term=${state.currentTerm}, unit=${state.currentUnitId}, dictation=${state.selectedDictationRound}`);
    allPassed = false;
  } else {
    console.log('✅ ค่าเริ่มต้นถูกต้อง: เทอม 2 (Unit 5 + Dictation ยูนิต 5)');
  }

  // ทดสอบสลับเป็นเทอม 1 และสลับกลับเทอม 2
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

  // ทดสอบโหลด Unit 6 และตรวจสอบว่าอยู่ในเทอม 2
  loadUnitVocab('unit_6');
  if (state.currentTerm !== 2 || state.currentUnitId !== 'unit_6' || state.ORIGINAL_VOCAB_LIST.length !== 4) {
    console.error(`❌ โหลด Unit 6 ไม่ถูกต้อง: term=${state.currentTerm}, unit=${state.currentUnitId}, count=${state.ORIGINAL_VOCAB_LIST ? state.ORIGINAL_VOCAB_LIST.length : 0}`);
    allPassed = false;
  } else {
    console.log(`✅ โหลด Unit 6 Outdoors สำเร็จ (อยู่ในเทอม 2 ครบ 4 คำหลัก, รวม ${VOCAB_UNITS.length} ยูนิต)\n`);
  }

  // 3. ทดสอบการสร้างข้อสอบและ Render ในแต่ละโหมด
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

  // 4. ทดสอบโหมดเขียนตามคำบอก (Dictation) โดยเฉพาะรอบที่ 6 (Unit 5: 8 คำ)
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

  // 5. ทดสอบโหมดแบบฝึกพิเศษ Unit 3 (Special Practice 1–4)
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

  if (allPassed) {
    console.log('\n🎉 ทุกโหมดผ่านการทดสอบ 100% พร้อมใช้งานบนเบราว์เซอร์ครับ!');
    process.exit(0);
  } else {
    console.log('\n⚠️ มีบางการทดสอบไม่ผ่าน กรุณาตรวจสอบรายละเอียดด้านบน');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('❌ Unhandled test error:', err);
  process.exit(1);
});
