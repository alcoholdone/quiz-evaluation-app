const fs = require('fs');

// 1. ตรวจสอบ Syntax เบื้องต้น
console.log('🔍 กำลังตรวจสอบ Syntax ของไฟล์ JS...');
try {
  require('child_process').execSync('node -c app.js && node -c questions.js', { stdio: 'inherit' });
  console.log('✅ Syntax ถูกต้องทุกไฟล์!\n');
} catch (e) {
  console.error('❌ พบ Syntax Error ในโค้ด!');
  process.exit(1);
}

// 2. Mock Browser Environment สำหรับทดสอบ Logic In-Memory
const questionsCode = fs.readFileSync('./questions.js', 'utf8').replace('const VOCAB_UNITS =', 'global.VOCAB_UNITS =');
const appCode = fs.readFileSync('./app.js', 'utf8')
  .replace('let challengeQuestions =', 'global.challengeQuestions =')
  .replace('let dictationSessionList =', 'global.dictationSessionList =')
  .replace('let selectedDictationRound =', 'global.selectedDictationRound =')
  .replace('let currentTerm =', 'global.currentTerm =')
  .replace('let currentUnitId =', 'global.currentUnitId =');

global.SpeechSynthesisUtterance = function(text) {
  this.text = text;
};

global.window = {
  addEventListener: () => {},
  innerWidth: 1024,
  innerHeight: 768,
  speechSynthesis: {
    resume: () => {},
    speak: () => {},
    getVoices: () => [],
    addEventListener: () => {}
  }
};

const mockEl = () => ({
  addEventListener: () => {},
  classList: { add: () => {}, remove: () => {}, contains: () => true },
  style: { setProperty: () => {} },
  dataset: {},
  appendChild: () => {},
  innerHTML: '',
  textContent: '',
  setAttribute: () => {},
  querySelector: () => mockEl(),
  querySelectorAll: () => [],
  closest: () => mockEl()
});

global.document = {
  addEventListener: () => {},
  getElementById: () => mockEl(),
  querySelector: () => mockEl(),
  querySelectorAll: () => [],
  createElement: () => mockEl(),
  body: mockEl()
};
global.localStorage = { getItem: () => null, setItem: () => {} };

eval(questionsCode);
eval(appCode);

let allPassed = true;

// 2.5 ทดสอบค่าเริ่มต้น (เทอม 2 -> Unit 5, Dictation r6)
console.log('📅 กำลังทดสอบระบบแยกเทอม (Term 1 / Term 2)...');
if (currentTerm !== 2 || currentUnitId !== 'unit_5' || selectedDictationRound !== 'r6') {
  console.error(`❌ ค่าเริ่มต้นไม่ถูกต้อง: term=${currentTerm}, unit=${currentUnitId}, dictation=${selectedDictationRound}`);
  allPassed = false;
} else {
  console.log('✅ ค่าเริ่มต้นถูกต้อง: เทอม 2 (Unit 5 + Dictation ยูนิต 5)');
}

// ทดสอบสลับเป็นเทอม 1 และสลับกลับเทอม 2
setCurrentTerm(1);
if (currentTerm !== 1 || currentUnitId !== 'unit_1' || selectedDictationRound !== 'r1') {
  console.error(`❌ สลับเป็นเทอม 1 ไม่ถูกต้อง: term=${currentTerm}, unit=${currentUnitId}, dictation=${selectedDictationRound}`);
  allPassed = false;
} else {
  console.log('✅ สลับเป็นเทอม 1 ผ่านฉลุย! (unit_1 + dictation r1)');
}

setCurrentTerm(2);
if (currentTerm !== 2 || currentUnitId !== 'unit_5' || selectedDictationRound !== 'r6') {
  console.error(`❌ สลับกลับเทอม 2 ไม่ถูกต้อง: term=${currentTerm}, unit=${currentUnitId}, dictation=${selectedDictationRound}`);
  allPassed = false;
} else {
  console.log('✅ สลับกลับเทอม 2 ผ่านฉลุย! (unit_5 + dictation r6)\n');
}

// 3. ทดสอบการสร้างข้อสอบและ Render ในแต่ละโหมด
console.log('🎮 กำลังทดสอบฟังก์ชันสร้างข้อสอบและการทำงานของแต่ละโหมด...');
const testUnits = [
  { id: 'unit_1', expected: 10, name: 'Unit 1: Things for school' },
  { id: 'unit_2', expected: 10, name: 'Unit 2: Colors & Shapes' },
  { id: 'unit_3', expected: 10, name: 'Unit 3: At the Store' },
  { id: 'unit_4', expected: 10, name: 'Unit 4: People at Home' },
  { id: 'unit_5', expected: 10, name: 'Unit 5: Birthday and Toys' },
  { id: 'midterm_prep', expected: 21, name: '🎓 เตรียมสอบกลางภาค (Let\'s Go 1 Unit 1-2)' },
  { id: 'final_exam_prep', expected: 29, name: '🌟 เตรียมสอบปลายภาค (Let\'s Go 3 Unit 3-4)' },
  { id: 'unit5_exam', expected: 20, name: '🎯 สอบท้ายบท Unit 5 (Birthday and Toys)' }
];

testUnits.forEach(u => {
  try {
    loadUnitVocab(u.id);
    startNewChallenge();
    const qs = challengeQuestions;
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
  selectedDictationRound = 'r6';
  initDictationStudyMode();
  if (dictationSessionList.length !== 8) {
    console.error(`❌ Dictation Unit 5 (r6): ได้ ${dictationSessionList.length} คำ (คาดหวัง 8 คำ)`);
    allPassed = false;
  } else {
    console.log(`✅ Dictation Unit 5 (r6) โหลดคำศัพท์ครบ 8 คำ: ${dictationSessionList.map(w => w.word).join(', ')}`);
  }
} catch (err) {
  console.error('❌ Dictation Unit 5 พบ Error:', err.message);
  allPassed = false;
}

if (allPassed) {
  console.log('\n🎉 ทุกโหมดผ่านการทดสอบ 100% พร้อมใช้งานบนเบราว์เซอร์ครับ!');
  process.exit(0);
} else {
  console.log('\n⚠️ มีบางการทดสอบไม่ผ่าน กรุณาตรวจสอบรายละเอียดด้านบน');
  process.exit(1);
}
