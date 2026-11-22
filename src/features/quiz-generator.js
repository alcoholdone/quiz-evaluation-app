import { state } from '../state/store.js';
import { VOCAB_UNITS } from '../data/units.js';
import { getCustomVocabList, getWeakWordList } from '../services/storage.js';
import { SHAPE_COLOR_MAP, isConcreteNoun, isSpellable } from '../utils/word-helpers.js';

export function selectTargetWords() {
  const customWords = getCustomVocabList();
  const weakWordNames = getWeakWordList();
  const weakWords = state.VOCAB_LIST.filter(item => weakWordNames.includes(item.word));

  const targets = [];
  const isSelected = (item) => targets.some(t => t.word === item.word);
  const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

  const recentCount = Math.min(4, state.ORIGINAL_VOCAB_LIST.length);
  const recentWords = state.ORIGINAL_VOCAB_LIST.slice(-recentCount);
  for (const item of recentWords) {
    if (!isSelected(item)) {
      targets.push(item);
    }
  }

  const maxCustom = Math.min(customWords.length, Math.floor(state.quizQuestionCount * 0.3));
  const maxWeak = Math.min(weakWords.length, Math.floor(state.quizQuestionCount * 0.3));

  for (const item of shuffle(customWords).slice(0, maxCustom)) {
    if (!isSelected(item) && targets.length < state.quizQuestionCount) {
      targets.push(item);
    }
  }

  for (const item of shuffle(weakWords).slice(0, maxWeak)) {
    if (!isSelected(item) && targets.length < state.quizQuestionCount) {
      targets.push(item);
    }
  }

  const remaining = shuffle(state.VOCAB_LIST.filter(item => !isSelected(item)));
  for (const item of remaining) {
    if (targets.length >= state.quizQuestionCount) break;
    targets.push(item);
  }

  return shuffle(targets).slice(0, state.quizQuestionCount);
}

// GENERATE MIDTERM QUESTIONS DYNAMICALLY
export function generateMidtermQuestions() {
  const list = [];

  const unit1 = VOCAB_UNITS.find(u => u.id === 'unit_1');
  const unit2 = VOCAB_UNITS.find(u => u.id === 'unit_2');

  const allWords = [...(unit1 ? unit1.words : []), ...(unit2 ? unit2.words : [])];

  // 1. Vocabulary Questions (10 questions)
  const vocabCandidates = allWords.filter(w => w.type !== 'command' && !['fine', 'great', 'color', 'shape'].includes(w.word.toLowerCase()));
  const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
  const shuffledVocab = shuffle(vocabCandidates);
  const vocabTargets = shuffledVocab.slice(0, 10);

  const vocabTypes = ['audio', 'audio', 'audio', 'visual_word', 'visual_word', 'visual_word', 'thai_image', 'thai_image', 'spelling_scrambled', 'spelling_scrambled'];
  const shuffledVocabTypes = shuffle(vocabTypes);

  for (let i = 0; i < 10; i++) {
    const targetWord = vocabTargets[i] || allWords[i % allWords.length];
    let type = shuffledVocabTypes[i];

    if (type === 'spelling_scrambled' && !isSpellable(targetWord)) {
      type = 'visual_word';
    }

    let options = [targetWord];
    let remaining = allWords.filter(w => w.word !== targetWord.word && w.type !== 'command');
    remaining = shuffle(remaining);

    for (let o = 0; o < 3; o++) {
      if (remaining[o]) options.push(remaining[o]);
    }
    options = shuffle(options);

    let skill = 'Visual Matching';
    if (type === 'audio') skill = 'Listening';
    else if (type === 'visual_word') skill = 'Word Recognition';
    else if (type === 'spelling_scrambled') skill = 'Spelling & Phonics';

    list.push({
      id: i + 1,
      type: type,
      targetWord: targetWord,
      options: options,
      skill: skill
    });
  }

  // 2. Phonics Questions (4 questions: B, P, C, G)
  const phonicsLetters = ['B', 'P', 'C', 'G'];
  phonicsLetters.forEach((letter, index) => {
    // Prefer words explicitly tagged for this phonics sound (e.g. Cat/Cup/Car for C),
    // so we never pick a same-letter-but-different-sound word like "Chair" (/tʃ/) or
    // "Circle" (/s/) as the example for the hard C sound being taught.
    let letterTargets = allWords.filter(w => {
      const firstChar = w.word.charAt(0).toUpperCase();
      return (w.phonicsLetter === letter || firstChar === letter) && w.type !== 'command';
    });
    const taggedTargets = letterTargets.filter(w => w.phonicsLetter === letter);
    if (taggedTargets.length > 0) {
      letterTargets = taggedTargets;
    }

    if (letterTargets.length === 0) {
      if (letter === 'B') letterTargets = [{ word: 'Bird', meaning: 'นก', image: '🐦' }];
      else if (letter === 'P') letterTargets = [{ word: 'Peach', meaning: 'ลูกพีช', image: '🍑' }];
      else if (letter === 'C') letterTargets = [{ word: 'Coat', meaning: 'เสื้อโค้ท', image: '🧥' }];
      else if (letter === 'G') letterTargets = [{ word: 'Girl', meaning: 'เด็กผู้หญิง', image: '👧' }];
    }

    const targetWord = shuffle(letterTargets)[0];

    const wrongLetters = phonicsLetters.filter(l => l !== letter);
    const wrongOptions = [];
    wrongLetters.forEach(wl => {
      const alternatives = allWords.filter(w => w.word.charAt(0).toUpperCase() === wl && w.type !== 'command');
      if (alternatives.length > 0) {
        wrongOptions.push(shuffle(alternatives)[0]);
      } else {
        if (wl === 'B') wrongOptions.push({ word: 'Bird', meaning: 'นก', image: '🐦' });
        else if (wl === 'P') wrongOptions.push({ word: 'Peach', meaning: 'ลูกพีช', image: '🍑' });
        else if (wl === 'C') wrongOptions.push({ word: 'Coat', meaning: 'เสื้อโค้ท', image: '🧥' });
        else if (wl === 'G') wrongOptions.push({ word: 'Girl', meaning: 'เด็กผู้หญิง', image: '👧' });
      }
    });

    let options = [
      { ...targetWord, isCorrect: true },
      ...wrongOptions.map(wo => ({ ...wo, isCorrect: false }))
    ];
    options = shuffle(options);

    list.push({
      id: 10 + index + 1,
      type: 'phonics_midterm',
      phonicsLetter: letter,
      targetWord: targetWord,
      options: options,
      skill: 'Spelling & Phonics'
    });
  });

  // 3. Grammar Questions (7 questions)
  for (let gIdx = 1; gIdx <= 7; gIdx++) {
    let options = [];
    let questionText = '';
    let thaiQuestionText = '';
    let targetWord = { word: 'Grammar', meaning: 'ไวยากรณ์', image: '📝' };

    if (gIdx === 1) {
      questionText = "What's your name?";
      thaiQuestionText = "คุณชื่ออะไรจ๊ะ?";
      targetWord = { word: 'Name', meaning: 'ชื่อ', image: '👦', explanation: '👦 เมื่อมีคนถามว่า "What’s your name?" (คุณชื่ออะไร?) เราตอบว่า "My name is ___." (ฉันชื่อ ___) จ้า' };
      options = [
        { text: "My name is Jenny.", isCorrect: true, word: 'Name', meaning: 'ชื่อ' },
        { text: "It’s a pencil.", isCorrect: false, word: 'Pencil', meaning: 'ดินสอ' },
        { text: "I’m fine.", isCorrect: false, word: 'Fine', meaning: 'สบายดี' },
        { text: "No, it isn't.", isCorrect: false, word: 'No', meaning: 'ไม่ใช่' }
      ];
    } else if (gIdx === 2) {
      questionText = "How are you?";
      thaiQuestionText = "คุณสบายดีไหมจ๊ะ?";
      targetWord = { word: 'Fine', meaning: 'สบายดี', image: '😊', explanation: '😊 เมื่อมีคนถามว่า "How are you?" (คุณสบายดีไหม?) เราตอบว่า "I’m fine." (ฉันสบายดี) จ้า' };
      options = [
        { text: "I’m fine.", isCorrect: true, word: 'Fine', meaning: 'สบายดี' },
        { text: "My name is Bobby.", isCorrect: false, word: 'Name', meaning: 'ชื่อ' },
        { text: "It’s red.", isCorrect: false, word: 'Red', meaning: 'สีแดง' },
        { text: "Yes, it is.", isCorrect: false, word: 'Yes', meaning: 'ใช่แล้ว' }
      ];
    } else if (gIdx === 3) {
      const colors = allWords.filter(w => w.isColor);
      const targetColor = shuffle(colors)[0] || { word: 'Blue', meaning: 'สีน้ำเงิน', image: '💙' };
      const wordLower = targetColor.word.toLowerCase();

      questionText = "What color is this?";
      thaiQuestionText = "นี่คือสีอะไรจ๊ะ?";
      targetWord = targetColor;

      const otherColors = colors.filter(c => c.word !== targetColor.word);
      const wrongC1 = otherColors[0] || { word: 'Red' };

      options = [
        { text: `It’s ${wordLower}.`, isCorrect: true, word: targetColor.word, meaning: targetColor.meaning, image: targetColor.image },
        { text: `It’s a ${wordLower}.`, isCorrect: false, word: targetColor.word, meaning: targetColor.meaning, image: targetColor.image },
        { text: `It’s a circle.`, isCorrect: false, word: 'Circle', meaning: 'วงกลม' },
        { text: `It’s ${wrongC1.word.toLowerCase()}.`, isCorrect: false, word: wrongC1.word, meaning: wrongC1.meaning }
      ];
    } else if (gIdx === 4) {
      const shapes = allWords.filter(w => w.isShape);
      const colors = allWords.filter(w => w.isColor);

      const targetShape = shuffle(shapes)[0] || { word: 'Circle', meaning: 'รูปวงกลม', image: '🔴' };
      // The shape picture is drawn in a fixed color, so the correct answer must be
      // that exact color — not a random one.
      const shapeColorWord = SHAPE_COLOR_MAP[targetShape.word.toLowerCase()] || 'red';
      const targetColor = colors.find(c => c.word.toLowerCase() === shapeColorWord)
        || { word: shapeColorWord, meaning: 'สีแดง' };

      questionText = `This is a ${targetShape.word.toLowerCase()}. It’s _______.`;
      thaiQuestionText = `นี่คือ${targetShape.meaning} มันมีสี_______`;

      targetWord = {
        word: targetShape.word,
        meaning: `${targetShape.meaning} ${targetColor.meaning}`,
        image: targetShape.image,
        explanation: `🎨 รูปนี้คือ${targetShape.meaning} มี${targetColor.meaning} เราพูดว่า "This is a ${targetShape.word.toLowerCase()}. It’s ${targetColor.word.toLowerCase()}." จ้า`
      };

      const otherColors = shuffle(colors.filter(c => c.word.toLowerCase() !== targetColor.word.toLowerCase()));

      options = [
        { text: targetColor.word.toLowerCase(), isCorrect: true, word: targetColor.word, meaning: targetColor.meaning },
        { text: otherColors[0] ? otherColors[0].word.toLowerCase() : 'blue', isCorrect: false, word: otherColors[0] ? otherColors[0].word : 'blue' },
        { text: otherColors[1] ? otherColors[1].word.toLowerCase() : 'green', isCorrect: false, word: otherColors[1] ? otherColors[1].word : 'green' },
        { text: targetShape.word.toLowerCase(), isCorrect: false, word: targetShape.word }
      ];
    } else if (gIdx === 5) {
      const nouns = allWords.filter(w => isConcreteNoun(w));
      const targetNoun = shuffle(nouns)[0] || { word: 'Book', meaning: 'หนังสือ', image: '📖' };
      const wordLower = targetNoun.word.toLowerCase();

      const isAn = ['eraser'].includes(wordLower) || /^[aeiou]/i.test(wordLower);
      questionText = `Is this ${isAn ? 'an' : 'a'} ${wordLower}?`;
      thaiQuestionText = `นี่คือ${targetNoun.meaning}ใช่ไหม?`;
      targetWord = targetNoun;

      options = [
        { text: "Yes, it is.", isCorrect: true, word: targetNoun.word, meaning: targetNoun.meaning, image: targetNoun.image },
        { text: "No, it isn't.", isCorrect: false, word: targetNoun.word, meaning: targetNoun.meaning, image: targetNoun.image },
        { text: "Yes, I am.", isCorrect: false, word: 'Yes', meaning: 'ใช่' },
        { text: "No, I'm not.", isCorrect: false, word: 'No', meaning: 'ไม่ใช่' }
      ];
    } else if (gIdx === 6) {
      const nouns = allWords.filter(w => isConcreteNoun(w));
      const targetNoun = shuffle(nouns)[0] || { word: 'Pencil', meaning: 'ดินสอ', image: '✏️' };
      const targetNounLower = targetNoun.word.toLowerCase();

      const otherNouns = nouns.filter(w => w.word.toLowerCase() !== targetNounLower);
      const wrongNoun = shuffle(otherNouns)[0] || { word: 'Desk', meaning: 'โต๊ะเรียน' };
      const wrongNounLower = wrongNoun.word.toLowerCase();

      const isAn = ['eraser'].includes(wrongNounLower) || /^[aeiou]/i.test(wrongNounLower);
      questionText = `Is this ${isAn ? 'an' : 'a'} ${wrongNounLower}?`;
      thaiQuestionText = `นี่คือ${wrongNoun.meaning}ใช่ไหม?`;
      targetWord = targetNoun;

      options = [
        { text: "No, it isn't.", isCorrect: true, word: targetNoun.word, meaning: targetNoun.meaning, image: targetNoun.image },
        { text: "Yes, it is.", isCorrect: false, word: targetNoun.word, meaning: targetNoun.meaning, image: targetNoun.image },
        { text: "Yes, I am.", isCorrect: false, word: 'Yes', meaning: 'ใช่' },
        { text: "No, I'm not.", isCorrect: false, word: 'No', meaning: 'ไม่ใช่' }
      ];
    } else if (gIdx === 7) {
      // Unit 1 core structure: "What's this? It's a / an ___" (article practice).
      const nouns = allWords.filter(w => isConcreteNoun(w));
      const targetNoun = shuffle(nouns)[0] || { word: 'Pen', meaning: 'ปากกา', image: '🖊️' };
      const wordLower = targetNoun.word.toLowerCase();
      const isAn = ['eraser'].includes(wordLower) || /^[aeiou]/i.test(wordLower);
      const correctArticle = isAn ? 'an' : 'a';

      questionText = "What’s this?";
      thaiQuestionText = "นี่คืออะไรจ๊ะ?";
      targetWord = {
        word: targetNoun.word,
        meaning: targetNoun.meaning,
        image: targetNoun.image,
        explanation: targetNoun.explanation
          || `🔤 รูปนี้คือ${targetNoun.meaning} เราตอบว่า "It’s ${correctArticle} ${wordLower}." (ใช้ "an" หน้าคำที่ขึ้นต้นด้วยเสียงสระ a e i o u, นอกนั้นใช้ "a") จ้า`
      };

      const otherNouns = shuffle(nouns.filter(w => w.word.toLowerCase() !== wordLower));
      const wrongNoun = otherNouns[0] || { word: 'Book', meaning: 'หนังสือ' };
      const wrongNounLower = wrongNoun.word.toLowerCase();
      const wrongNounIsAn = ['eraser'].includes(wrongNounLower) || /^[aeiou]/i.test(wrongNounLower);

      options = [
        { text: `It’s ${correctArticle} ${wordLower}.`, isCorrect: true, word: targetNoun.word, meaning: targetNoun.meaning, image: targetNoun.image },
        { text: `It’s ${isAn ? 'a' : 'an'} ${wordLower}.`, isCorrect: false, word: targetNoun.word, meaning: targetNoun.meaning, image: targetNoun.image },
        { text: `It’s ${wrongNounIsAn ? 'an' : 'a'} ${wrongNounLower}.`, isCorrect: false, word: wrongNoun.word, meaning: wrongNoun.meaning },
        { text: "I’m fine.", isCorrect: false, word: 'Fine', meaning: 'สบายดี' }
      ];
    }

    options = shuffle(options);

    list.push({
      id: 14 + gIdx,
      type: 'grammar_midterm',
      targetWord: targetWord,
      questionText: questionText,
      thaiQuestionText: thaiQuestionText,
      options: options,
      skill: 'Sentence Q&A'
    });
  }

  return list;
}

// ============================================================
// GENERATE FINAL EXAM QUESTIONS (Unit 3 + Unit 4 — Let's Go 3)
// 29 questions: 8 Vocab · 3 Singular/Plural · 2 What's this ·
//               2 What are these · 3 How many · 3 Who's she/he ·
//               3 Is he/she · 2 Conversation · 3 Phonics
// ============================================================
export function generateFinalExamQuestions() {
  const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
  const list = [];
  let qId = 1;

  const unit3 = VOCAB_UNITS.find(u => u.id === 'unit_3');
  const unit4 = VOCAB_UNITS.find(u => u.id === 'unit_4');
  const allWords = [...(unit3 ? unit3.words : []), ...(unit4 ? unit4.words : [])];
  const vocabPool = allWords.filter(w => w.type !== 'command');

  const pCaseWord = unit3?.words.find(w => w.word.toLowerCase() === 'pencil case');
  const pencilCaseImg = pCaseWord ? pCaseWord.image : `<svg viewBox="0 0 100 100" class="svg-icon" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="30" width="70" height="40" rx="8" fill="#ec4899" stroke="#db2777" stroke-width="3"/><rect x="15" y="38" width="70" height="6" fill="#f472b6"/><circle cx="50" cy="50" r="6" fill="#f59e0b"/><line x1="18" y1="42" x2="82" y2="42" stroke="#db2777" stroke-width="1.5" stroke-dasharray="3 3"/><path d="M 25,30 Q 50,15 75,30" fill="none" stroke="#db2777" stroke-width="3" stroke-linecap="round"/></svg>`;

  // ── 1. VOCABULARY (8 questions: audio×3, visual_word×3, thai_image×2) ─────
  const vocabTargets = shuffle(vocabPool).slice(0, 8);
  const vocabTypePool = shuffle(['audio','audio','audio','visual_word','visual_word','visual_word','thai_image','thai_image']);
  for (let i = 0; i < 8; i++) {
    const tw = vocabTargets[i] || vocabPool[0];
    const type = vocabTypePool[i];
    let opts = [tw, ...shuffle(allWords.filter(w => w.word !== tw.word && w.type !== 'command')).slice(0, 3)];
    opts = shuffle(opts);
    list.push({
      id: qId++, type, targetWord: tw, options: opts,
      skill: type === 'audio' ? 'Listening' : type === 'visual_word' ? 'Word Recognition' : 'Visual Matching'
    });
  }

  // ── 2. SINGULAR → PLURAL (3 questions) ───────────────────────────────────
  const singPluralData = [
    { sg: 'a crayon',      pl: 'crayons',      img: '🖍️', meaning: 'สีเทียน' },
    { sg: 'a marker',      pl: 'markers',      img: '🖊️', meaning: 'ปากกาเมจิก' },
    { sg: 'a notebook',    pl: 'notebooks',    img: '📓', meaning: 'สมุด' },
    { sg: 'a pencil case', pl: 'pencil cases', img: pencilCaseImg, meaning: 'กล่องดินสอ' },
    { sg: 'a CD',          pl: 'CDs',          img: '💿', meaning: 'แผ่นซีดี' },
    { sg: 'a video game',  pl: 'video games',  img: '🎮', meaning: 'วีดีโอเกม' },
    { sg: 'a cell phone',  pl: 'cell phones',  img: '📱', meaning: 'โทรศัพท์' },
  ];
  shuffle(singPluralData).slice(0, 3).forEach(pair => {
    const wrongs = shuffle(singPluralData.filter(p => p.pl !== pair.pl)).slice(0, 3);
    const opts = shuffle([
      { text: pair.pl, isCorrect: true,  word: pair.pl, meaning: pair.meaning },
      ...wrongs.map(w => ({ text: w.pl, isCorrect: false, word: w.pl, meaning: w.meaning }))
    ]);
    list.push({
      id: qId++, type: 'grammar_midterm',
      targetWord: { word: pair.sg, meaning: pair.meaning, image: pair.img,
        explanation: `🔢 "${pair.sg}" = 1 อัน → หลายอัน = "${pair.pl}" จ้า` },
      questionText: `"${pair.sg}" → หลายอัน = ?`,
      thaiQuestionText: `เมื่อมีหลายอัน "${pair.meaning}" เราพูดว่าอะไร?`,
      options: opts, skill: 'Grammar: Singular/Plural'
    });
  });

  // ── 3. "WHAT'S THIS?" (2 questions) ──────────────────────────────────────
  const whatsThisPool = [
    { word: 'cell phone', meaning: 'โทรศัพท์',    img: '📱' },
    { word: 'computer',   meaning: 'คอมพิวเตอร์', img: '💻' },
    { word: 'CD',         meaning: 'แผ่นซีดี',    img: '💿' },
    { word: 'crayon',     meaning: 'สีเทียน',      img: '🖍️' },
    { word: 'notebook',   meaning: 'สมุด',          img: '📓' },
  ];
  shuffle(whatsThisPool).slice(0, 2).forEach(item => {
    const an = /^[aeiou]/i.test(item.word) ? 'an' : 'a';
    const corr = `It's ${an} ${item.word.toLowerCase()}.`;
    const others = shuffle(whatsThisPool.filter(t => t.word !== item.word));
    const an2 = /^[aeiou]/i.test(others[0].word) ? 'an' : 'a';
    const opts = shuffle([
      { text: corr, isCorrect: true, word: item.word, meaning: item.meaning, image: item.img },
      { text: `They're ${item.word.toLowerCase()}s.`, isCorrect: false, word: item.word, meaning: item.meaning },
      { text: `It's ${an === 'a' ? 'an' : 'a'} ${item.word.toLowerCase()}.`, isCorrect: false, word: item.word, meaning: item.meaning },
      { text: `It's ${an2} ${others[0].word.toLowerCase()}.`, isCorrect: false, word: others[0].word, meaning: others[0].meaning }
    ]);
    list.push({
      id: qId++, type: 'grammar_midterm',
      targetWord: { word: item.word, meaning: item.meaning, image: item.img },
      questionText: "What's this?", thaiQuestionText: "นี่คืออะไรจ๊ะ?",
      options: opts, skill: "Sentence Q&A: What's this?"
    });
  });

  // ── 4. "WHAT ARE THESE?" (2 questions) ───────────────────────────────────
  const whatAreThesePool = [
    { pl: 'CDs',          sg: 'CD',          meaning: 'แผ่นซีดี',    img: '💿' },
    { pl: 'video games',  sg: 'video game',  meaning: 'วีดีโอเกม',   img: '🎮' },
    { pl: 'notebooks',    sg: 'notebook',    meaning: 'สมุด',          img: '📓' },
    { pl: 'pencil cases', sg: 'pencil case', meaning: 'กล่องดินสอ',  img: pencilCaseImg },
    { pl: 'cell phones',  sg: 'cell phone',  meaning: 'โทรศัพท์',    img: '📱' },
  ];
  shuffle(whatAreThesePool).slice(0, 2).forEach(item => {
    const others = shuffle(whatAreThesePool.filter(t => t.pl !== item.pl));
    const opts = shuffle([
      { text: `They're ${item.pl.toLowerCase()}.`,     isCorrect: true,  word: item.pl,       meaning: item.meaning, image: item.img },
      { text: `It's a ${item.sg.toLowerCase()}.`,      isCorrect: false, word: item.sg,       meaning: item.meaning },
      { text: `They're ${item.sg.toLowerCase()}.`,     isCorrect: false, word: item.sg,       meaning: item.meaning },
      { text: `They're ${others[0].pl.toLowerCase()}.`,isCorrect: false, word: others[0].pl, meaning: others[0].meaning }
    ]);
    list.push({
      id: qId++, type: 'grammar_midterm',
      targetWord: { word: item.pl, meaning: item.meaning, image: item.img },
      questionText: "What are these?", thaiQuestionText: "พวกนี้คืออะไรจ๊ะ?",
      options: opts, skill: "Sentence Q&A: What are these?"
    });
  });

  // ── 5. "HOW MANY?" (3 questions: แสดงรูปภาพจริงซ้ำตามจำนวน) ─────────────
  const howManyPool = [
    { sg: 'crayon',   pl: 'crayons',  meaning: 'สีเทียน',    img: '🖍️' },
    { sg: 'marker',   pl: 'markers',  meaning: 'ปากกาเมจิก', img: '🖊️' },
    { sg: 'notebook', pl: 'notebooks',meaning: 'สมุด',         img: '📓' },
    { sg: 'CD',       pl: 'CDs',      meaning: 'แผ่นซีดี',   img: '💿' },
    { sg: 'pencil case', pl: 'pencil cases', meaning: 'กล่องดินสอ', img: pencilCaseImg }
  ];
  const numWords = ['One','Two','Three','Four'];
  const countVals = shuffle([1, 2, 3, 4]);
  shuffle(howManyPool).slice(0, 3).forEach((item, i) => {
    const count = countVals[i];
    const correct = count === 1 ? `One ${item.sg}.` : `${numWords[count - 1]} ${item.pl}.`;
    const w1 = count === 1 ? `One ${item.pl}.` : `One ${item.sg}.`;
    const w2 = `${numWords[(count % 4) + 1] || 'Two'} ${item.pl}.`;
    const w3 = count === 1 ? `Two ${item.pl}.` : `It's a ${item.sg}.`;
    const opts = shuffle([
      { text: correct, isCorrect: true,  word: item.sg, meaning: item.meaning },
      { text: w1,      isCorrect: false, word: item.sg, meaning: item.meaning },
      { text: w2,      isCorrect: false, word: item.sg, meaning: item.meaning },
      { text: w3,      isCorrect: false, word: item.sg, meaning: item.meaning }
    ]);

    // สร้างกล่องภาพที่แสดงรูปภาพซ้ำตามจำนวนจริง เช่น สีเทียน 3 แท่ง, แผ่นซีดี 2 แผ่น
    let itemsHtml = '';
    const isSvg = item.img.startsWith('<svg');
    for (let c = 0; c < count; c++) {
      if (isSvg) {
        itemsHtml += `<span style="display:inline-flex; align-items:center; justify-content:center; width:72px; height:72px; margin: 4px;">${item.img}</span>`;
      } else {
        itemsHtml += `<span style="display:inline-block; font-size: 60px; margin: 4px 8px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.12));">${item.img}</span>`;
      }
    }
    const repeatedVisual = `<div style="display:flex; justify-content:center; align-items:center; flex-wrap:wrap; gap:8px; padding: 10px 18px; background: #f8fafc; border-radius: 18px; border: 2px dashed #cbd5e1; margin: 8px 0; min-height: 85px;">${itemsHtml}</div>`;

    list.push({
      id: qId++, type: 'grammar_midterm',
      targetWord: {
        word: item.pl,
        meaning: item.meaning,
        image: repeatedVisual,
        explanation: `🔢 นับรูปภาพ ${item.meaning} ได้ทั้งหมด ${count} อัน → ตอบว่า "${correct}" จ้า`
      },
      questionText: `How many ${item.pl}?`,
      thaiQuestionText: `มีกี่${item.meaning}จ๊ะ? (นับรูปภาพในกรอบแล้วตอบ)`,
      options: opts,
      skill: 'Grammar: How many'
    });
  });

  // ── 6. "WHO'S SHE/HE?" (3 questions) ─────────────────────────────────────
  const familyPool = [
    { word: 'grandmother', meaning: 'คุณยาย/คุณย่า',  gender: 'she', img: '👵' },
    { word: 'grandfather', meaning: 'คุณตา/คุณปู่',   gender: 'he',  img: '👴' },
    { word: 'mother',      meaning: 'แม่',              gender: 'she', img: '👩' },
    { word: 'father',      meaning: 'พ่อ',              gender: 'he',  img: '👨' },
    { word: 'sister',      meaning: 'พี่สาว/น้องสาว', gender: 'she', img: '👧' },
    { word: 'brother',     meaning: 'พี่ชาย/น้องชาย', gender: 'he',  img: '👦' },
    { word: 'baby sister', meaning: 'น้องสาวคนเล็ก',  gender: 'she', img: '👶' },
    { word: 'baby brother',meaning: 'น้องชายคนเล็ก',  gender: 'he',  img: '👶' },
  ];
  shuffle(familyPool).slice(0, 3).forEach(member => {
    const pron = member.gender === 'she' ? "She's" : "He's";
    const wrongs = shuffle(familyPool.filter(m => m.word !== member.word)).slice(0, 3);
    const opts = shuffle([
      { text: `${pron} my ${member.word}.`, isCorrect: true, word: member.word, meaning: member.meaning, image: member.img },
      ...wrongs.map(w => {
        const wp = w.gender === 'she' ? "She's" : "He's";
        return { text: `${wp} my ${w.word}.`, isCorrect: false, word: w.word, meaning: w.meaning };
      })
    ]);
    list.push({
      id: qId++, type: 'grammar_midterm',
      targetWord: { word: member.word, meaning: member.meaning, image: member.img },
      questionText: `Who's ${member.gender === 'she' ? 'she' : 'he'}?`,
      thaiQuestionText: `${member.gender === 'she' ? 'เธอ' : 'เขา'}คือใครจ๊ะ? (${member.meaning})`,
      options: opts, skill: "Sentence Q&A: Who's she/he?"
    });
  });

  // ── 7. "IS HE/SHE ___?" YES/NO (3 questions) ─────────────────────────────
  const descPool = unit4
    ? unit4.words.filter(w => ['Tall','Short','Young','Old','Pretty','Handsome'].includes(w.word))
    : [];
  const yesNoScenarios = [
    { imgKey: 'Tall',     q: 'tall',     person: 'he',  isYes: true,  thaiQ: 'สูง' },
    { imgKey: 'Short',    q: 'short',    person: 'she', isYes: true,  thaiQ: 'เตี้ย' },
    { imgKey: 'Young',    q: 'old',      person: 'he',  isYes: false, thaiQ: 'อายุมาก' },
    { imgKey: 'Old',      q: 'young',    person: 'she', isYes: false, thaiQ: 'อายุน้อย' },
    { imgKey: 'Pretty',   q: 'pretty',   person: 'she', isYes: true,  thaiQ: 'สวย' },
    { imgKey: 'Handsome', q: 'handsome', person: 'he',  isYes: true,  thaiQ: 'หล่อ' },
  ];
  shuffle(yesNoScenarios).slice(0, 3).forEach(s => {
    const imgWord = descPool.find(w => w.word === s.imgKey)
      || { word: s.imgKey, meaning: s.thaiQ, image: '👤' };
    const p = s.person;
    const opts = shuffle([
      { text: `Yes, ${p} is.`,   isCorrect: s.isYes,  word: 'yes',   meaning: 'ใช่',    image: '✅' },
      { text: `No, ${p} isn't.`, isCorrect: !s.isYes, word: 'no',    meaning: 'ไม่ใช่', image: '❌' },
      { text: `Yes, I am.`,       isCorrect: false,    word: 'wrong', meaning: 'ผิด' },
      { text: `No, I'm not.`,     isCorrect: false,    word: 'wrong', meaning: 'ผิด' }
    ]);
    list.push({
      id: qId++, type: 'grammar_midterm',
      targetWord: {
        word: imgWord.word, meaning: imgWord.meaning, image: imgWord.image,
        explanation: `${s.isYes ? '✅' : '❌'} Is ${p} ${s.q}? ${s.isYes ? `Yes, ${p} is.` : `No, ${p} isn't.`} ดูรูปแล้วตอบให้ถูกจ้า`
      },
      questionText: `Is ${p} ${s.q}?`,
      thaiQuestionText: `${p === 'he' ? 'เขา' : 'เธอ'}${s.thaiQ}ไหมจ๊ะ? (ดูรูปแล้วเลือก)`,
      options: opts, skill: 'Yes/No Question'
    });
  });

  // ── 8. CONVERSATION (2 questions: Unit3 + Unit4) ──────────────────────────
  [
    {
      targetWord: { word: 'friend', meaning: 'เพื่อน', image: '🧑‍🤝‍🧑' },
      questionText: 'Hi, Mom! This is my friend, Sarah.',
      thaiQuestionText: 'สวัสดีแม่! นี่คือเพื่อนของผม ชื่อ Sarah',
      options: shuffle([
        { text: "It's nice to meet you, Sarah.", isCorrect: true,  word: 'meet',   meaning: 'ยินดีที่ได้รู้จัก' },
        { text: "How many crayons?",             isCorrect: false, word: 'how',    meaning: 'กี่อัน' },
        { text: "They're CDs.",                  isCorrect: false, word: 'CDs',    meaning: 'แผ่นซีดี' },
        { text: "Yes, he is.",                   isCorrect: false, word: 'yes',    meaning: 'ใช่' }
      ])
    },
    {
      targetWord: { word: 'meet', meaning: 'ยินดีที่ได้รู้จัก', image: '🤝' },
      questionText: "It's nice to meet you, Scott.",
      thaiQuestionText: 'ยินดีที่ได้รู้จักคุณ Scott จ้า',
      options: shuffle([
        { text: "It's nice to meet you, too.", isCorrect: true,  word: 'too',    meaning: 'เช่นกัน' },
        { text: "What's this?",               isCorrect: false, word: 'what',   meaning: 'อะไร' },
        { text: "She's my sister.",           isCorrect: false, word: 'sister', meaning: 'น้องสาว' },
        { text: "One crayon.",                isCorrect: false, word: 'one',    meaning: 'หนึ่ง' }
      ])
    }
  ].forEach(cq => {
    list.push({ id: qId++, type: 'grammar_midterm', ...cq, skill: 'Conversation' });
  });

  // ── 9. PHONICS: Dd, Tt, Aa (3 questions) ─────────────────────────────────
  [
    {
      phonicsLetter: 'D',
      targets:     [{ word: 'Desk', meaning: 'โต๊ะเรียน', image: '🏫' }, { word: 'Duck', meaning: 'เป็ด', image: '🦆' }, { word: 'Door', meaning: 'ประตู', image: '🚪' }],
      distractors: [{ word: 'Tiger', meaning: 'เสือ', image: '🐯' }, { word: 'Apple', meaning: 'แอปเปิ้ล', image: '🍎' }, { word: 'Cat', meaning: 'แมว', image: '🐱' }]
    },
    {
      phonicsLetter: 'T',
      targets:     [{ word: 'Tiger', meaning: 'เสือ', image: '🐯' }, { word: 'Two', meaning: 'สอง', image: '2️⃣' }, { word: 'Toys', meaning: 'ของเล่น', image: '🧸' }],
      distractors: [{ word: 'Duck', meaning: 'เป็ด', image: '🦆' }, { word: 'Apple', meaning: 'แอปเปิ้ล', image: '🍎' }, { word: 'Bag', meaning: 'กระเป๋า', image: '🎒' }]
    },
    {
      phonicsLetter: 'A',
      targets:     [{ word: 'Apple', meaning: 'แอปเปิ้ล', image: '🍎' }],
      distractors: [{ word: 'Tiger', meaning: 'เสือ', image: '🐯' }, { word: 'Duck', meaning: 'เป็ด', image: '🦆' }, { word: 'Door', meaning: 'ประตู', image: '🚪' }]
    }
  ].forEach(set => {
    const target = shuffle([...set.targets])[0];
    const opts = shuffle([
      { ...target, isCorrect: true },
      ...shuffle([...set.distractors]).slice(0, 3).map(d => ({ ...d, isCorrect: false }))
    ]);
    list.push({ id: qId++, type: 'phonics_midterm', phonicsLetter: set.phonicsLetter, targetWord: target, options: opts, skill: 'Phonics' });
  });

  return list;
}

// ============================================================
// GENERATE UNIT 5 CHAPTER EXAM QUESTIONS (Birthday and Toys)
// 20 questions: 5 Toys Vocab · 5 Adjectives & Opposites ·
//               4 Grammar (It's a/an + adj + noun) · 6 What is it? Q&A
// ============================================================
export const UNIT5_EXAM_TOY_WORDS = ['yo-yo', 'baseball', 'bat', 'kite', 'doll', 'car', 'robot', 'bicycle', 'jump rope', 'puzzle'];
export const UNIT5_EXAM_ADJ_WORDS = ['big', 'little', 'new', 'old', 'long', 'short', 'round', 'square'];

export function getUnit5ExamWords() {
  const unit5 = VOCAB_UNITS.find(u => u.id === 'unit_5');
  if (!unit5 || !unit5.words) return [];
  const examKeys = [...UNIT5_EXAM_TOY_WORDS, ...UNIT5_EXAM_ADJ_WORDS];
  const result = [];
  examKeys.forEach(key => {
    const found = unit5.words.find(w => w.word.trim().toLowerCase() === key);
    if (found) result.push(found);
  });
  return result;
}

export function generateUnit5ExamQuestions() {
  const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
  const articleFor = (adj) => (/^[aeiou]/i.test(adj) ? 'an' : 'a');
  const list = [];
  let qId = 1;

  const unit5 = VOCAB_UNITS.find(u => u.id === 'unit_5');
  const unit5Words = unit5 ? unit5.words : [];
  const getWordObj = (name, fallback) =>
    unit5Words.find(w => w.word.trim().toLowerCase() === name.toLowerCase()) || fallback;

  const toyPool = UNIT5_EXAM_TOY_WORDS
    .map(w => getWordObj(w, null))
    .filter(Boolean);
  const adjPool = UNIT5_EXAM_ADJ_WORDS
    .map(w => getWordObj(w, null))
    .filter(Boolean);

  // Visual card builder showing item + trait cue (Thai badge + subtle visual styling without leaking English adj)
  const ADJ_VISUAL_META = {
    big:    { badge: 'ขนาด: ใหญ่ ⬆️',       bg: '#eff6ff', border: '#3b82f6', color: '#1d4ed8', imgStyle: 'transform: scale(1.15);' },
    little: { badge: 'ขนาด: เล็ก ⬇️',       bg: '#fdf2f8', border: '#ec4899', color: '#be185d', imgStyle: 'transform: scale(0.68);' },
    new:    { badge: 'สภาพ: ใหม่ ✨',       bg: '#ecfdf5', border: '#10b981', color: '#047857', imgStyle: 'filter: drop-shadow(0 0 8px rgba(16,185,129,0.45));' },
    old:    { badge: 'สภาพ: เก่า 🕰️',       bg: '#fef3c7', border: '#d97706', color: '#92400e', imgStyle: 'filter: sepia(0.55) contrast(0.92); opacity: 0.88;' },
    long:   { badge: 'ความยาว: ยาว ↔️',     bg: '#eff6ff', border: '#2563eb', color: '#1e40af', imgStyle: 'transform: scaleX(1.22);' },
    short:  { badge: 'ความยาว: สั้น ✂️',    bg: '#fef2f2', border: '#ef4444', color: '#b91c1c', imgStyle: 'transform: scaleX(0.75);' },
    round:  { badge: 'รูปร่าง: กลม ⭕',      bg: '#fffbeb', border: '#f59e0b', color: '#b45309', imgStyle: 'border: 3px dashed #f59e0b; border-radius: 50%; padding: 6px;' },
    square: { badge: 'รูปร่าง: สี่เหลี่ยม 🟦', bg: '#eff6ff', border: '#2563eb', color: '#1d4ed8', imgStyle: 'border: 3px dashed #2563eb; border-radius: 10px; padding: 6px;' }
  };

  const buildTraitVisual = (imgContent, adjKey) => {
    const meta = ADJ_VISUAL_META[adjKey] || ADJ_VISUAL_META.big;
    const isSvg = typeof imgContent === 'string' && imgContent.trim().startsWith('<svg');
    const iconHtml = isSvg
      ? `<div class="u5-trait-visual" style="width: 128px; height: 128px; display: flex; align-items: center; justify-content: center; ${meta.imgStyle}">${imgContent}</div>`
      : `<div class="u5-trait-visual" style="font-size: 84px; line-height: 1; display: flex; align-items: center; justify-content: center; width: 128px; height: 128px; ${meta.imgStyle}">${imgContent}</div>`;
    return `<div style="display: flex; flex-direction: column; align-items: center; gap: 10px; margin: 6px 0 6px;">
      <div style="background: ${meta.bg}; border: 2px solid ${meta.border}; border-radius: 22px; padding: 16px 26px; display: flex; align-items: center; justify-content: center; min-width: 170px; min-height: 148px; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
        ${iconHtml}
      </div>
      <span style="display: inline-block; background: ${meta.bg}; color: ${meta.color}; border: 1.5px solid ${meta.border}; padding: 5px 16px; border-radius: 999px; font-size: 0.95rem; font-weight: 800;">
        🔍 ${meta.badge}
      </span>
    </div>`;
  };

  // ── PART 1: TOYS VOCABULARY (5 questions — 5 distinct toys) ──────────────
  const toyTargets = shuffle(toyPool).slice(0, 5);
  const toyTypes = shuffle(['audio', 'audio', 'visual_word', 'visual_word', 'thai_image']);
  for (let i = 0; i < 5; i++) {
    const tw = toyTargets[i] || toyPool[0];
    const type = toyTypes[i];
    const distractors = shuffle(toyPool.filter(w => w.word !== tw.word)).slice(0, 3);
    const opts = shuffle([tw, ...distractors]);
    list.push({
      id: qId++,
      type,
      targetWord: tw,
      options: opts,
      skill: type === 'audio' ? 'Listening' : type === 'visual_word' ? 'Word Recognition' : 'Visual Matching'
    });
  }

  // ── PART 2: ADJECTIVES & OPPOSITES (5 questions: 3 vocab + 2 opposites, no overlap) ─
  const adjTargets = shuffle(adjPool).slice(0, 3);
  const usedAdjVocabSet = new Set(adjTargets.map(w => w.word.trim().toLowerCase()));
  const adjTypes = shuffle(['visual_word', 'thai_image', 'audio']);
  for (let i = 0; i < 3; i++) {
    const tw = adjTargets[i] || adjPool[0];
    const type = adjTypes[i];
    const distractors = shuffle(adjPool.filter(w => w.word !== tw.word)).slice(0, 3);
    const opts = shuffle([tw, ...distractors]);
    list.push({
      id: qId++,
      type,
      targetWord: tw,
      options: opts,
      skill: 'Adjectives'
    });
  }

  const oppositePairs = [
    { a: 'big',   aTh: 'ใหญ่',   b: 'little', bTh: 'เล็ก' },
    { a: 'new',   aTh: 'ใหม่',   b: 'old',    bTh: 'เก่า' },
    { a: 'long',  aTh: 'ยาว',    b: 'short',  bTh: 'สั้น' },
    { a: 'round', aTh: 'กลม',    b: 'square', bTh: 'สี่เหลี่ยมจัตุรัส' }
  ];
  // Prefer pairs whose target answer hasn't just been asked in the 3 adj vocab questions
  const prioritizedPairs = [
    ...shuffle(oppositePairs.filter(p => !usedAdjVocabSet.has(p.a) || !usedAdjVocabSet.has(p.b))),
    ...shuffle(oppositePairs.filter(p => usedAdjVocabSet.has(p.a) && usedAdjVocabSet.has(p.b)))
  ].slice(0, 2);

  prioritizedPairs.forEach(pair => {
    // Pick direction so the answer word wasn't just asked in adj vocab when possible
    let flip = Math.random() < 0.5;
    if (usedAdjVocabSet.has(pair.b) && !usedAdjVocabSet.has(pair.a)) flip = true;
    else if (usedAdjVocabSet.has(pair.a) && !usedAdjVocabSet.has(pair.b)) flip = false;

    const fromWord = flip ? pair.b : pair.a;
    const fromTh   = flip ? pair.bTh : pair.aTh;
    const ansWord  = flip ? pair.a : pair.b;
    const ansTh    = flip ? pair.aTh : pair.bTh;
    const fromObj  = getWordObj(fromWord, { word: fromWord, meaning: fromTh, image: '🎨' });
    const otherAdjs = shuffle(UNIT5_EXAM_ADJ_WORDS.filter(w => w !== fromWord && w !== ansWord)).slice(0, 3);
    const opts = shuffle([
      { text: ansWord, isCorrect: true, word: ansWord, meaning: ansTh },
      ...otherAdjs.map(w => ({ text: w, isCorrect: false, word: w, meaning: getWordObj(w, { meaning: w }).meaning }))
    ]);
    list.push({
      id: qId++,
      type: 'grammar_midterm',
      targetWord: {
        word: ansWord,
        meaning: ansTh,
        image: fromObj.image,
        explanation: `🔄 คำตรงข้ามของ "${fromWord}" (${fromTh}) คือ "${ansWord}" (${ansTh}) จ้า`
      },
      questionText: `What is the opposite of "${fromWord}"?`,
      thaiQuestionText: `คำตรงข้ามกับคำว่า "${fromWord} (${fromTh})" คือคำว่าอะไร?`,
      options: opts,
      skill: 'Adjectives'
    });
  });

  // Track used (adj|noun) pairs & nouns across Part 3 and Part 4 to guarantee ZERO duplicate sentences
  const usedSentenceKeys = new Set();
  const usedPart3Nouns = new Set();

  // ── PART 3: GRAMMAR "It's a/an + adj + noun" (4 questions: 2 "an old" + 2 "a + adj") ─
  const anOldPool = [
    { adj: 'old', noun: 'car',     thai: 'รถยนต์ของเล่นเก่า' },
    { adj: 'old', noun: 'doll',    thai: 'ตุ๊กตาเก่า' },
    { adj: 'old', noun: 'bicycle', thai: 'รถจักรยานเก่า' },
    { adj: 'old', noun: 'robot',   thai: 'หุ่นยนต์เก่า' },
    { adj: 'old', noun: 'bat',     thai: 'ไม้ตีเบสบอลเก่า' }
  ];
  const anOldPrompts = [
    'Which sentence uses "a / an" correctly?',
    'Choose the correct sentence.'
  ];
  shuffle(anOldPool).slice(0, 2).forEach((item, idx) => {
    usedSentenceKeys.add(`${item.adj}|${item.noun}`);
    usedPart3Nouns.add(item.noun);
    const nounObj = getWordObj(item.noun, { word: item.noun, meaning: item.thai, image: '🚗' });
    const correctSent = `It's an old ${item.noun}.`;
    const opts = shuffle([
      { text: correctSent,                 isCorrect: true,  word: correctSent, meaning: item.thai },
      { text: `It's a old ${item.noun}.`,  isCorrect: false, word: `It's a old ${item.noun}.`,  meaning: 'ผิด article' },
      { text: `It's an ${item.noun} old.`, isCorrect: false, word: `It's an ${item.noun} old.`, meaning: 'ผิดลำดับคำ' },
      { text: `It's old a ${item.noun}.`,  isCorrect: false, word: `It's old a ${item.noun}.`,  meaning: 'ผิดโครงสร้าง' }
    ]);
    list.push({
      id: qId++,
      type: 'grammar_midterm',
      targetWord: {
        word: correctSent,
        meaning: item.thai,
        image: buildTraitVisual(nounObj.image, 'old'),
        explanation: `💡 คำว่า "old" ขึ้นต้นด้วยเสียงสระ (o) ต้องใช้ "an" นำหน้า → "${correctSent}" (${item.thai}) จ้า`
      },
      questionText: anOldPrompts[idx] || 'Choose the correct sentence.',
      thaiQuestionText: `เลือกประโยคที่ถูกต้องสำหรับ "${item.thai}" (สังเกต a / an นะจ๊ะ)`,
      options: opts,
      skill: 'Grammar: a/an + Adj'
    });
  });

  const aAdjPool = [
    { adj: 'big',    noun: 'robot',     thai: 'หุ่นยนต์ตัวใหญ่' },
    { adj: 'new',    noun: 'bicycle',   thai: 'รถจักรยานใหม่' },
    { adj: 'little', noun: 'doll',      thai: 'ตุ๊กตาตัวเล็ก' },
    { adj: 'long',   noun: 'jump rope', thai: 'เชือกกระโดดเส้นยาว' },
    { adj: 'short',  noun: 'bat',       thai: 'ไม้ตีเบสบอลอันสั้น' },
    { adj: 'round',  noun: 'baseball',  thai: 'ลูกเบสบอลทรงกลม' },
    { adj: 'square', noun: 'puzzle',    thai: 'ตัวต่อจิ๊กซอว์สี่เหลี่ยม' }
  ];
  const aAdjPrompts = [
    'Pick the right word order!',
    'Which sentence is correct?'
  ];
  const freshAAdj = shuffle(aAdjPool.filter(item => !usedPart3Nouns.has(item.noun)));
  const fallbackAAdj = shuffle(aAdjPool.filter(item => usedPart3Nouns.has(item.noun)));
  [...freshAAdj, ...fallbackAAdj].slice(0, 2).forEach((item, idx) => {
    usedSentenceKeys.add(`${item.adj}|${item.noun}`);
    usedPart3Nouns.add(item.noun);
    const nounObj = getWordObj(item.noun, { word: item.noun, meaning: item.thai, image: '🤖' });
    const correctSent = `It's a ${item.adj} ${item.noun}.`;
    const opts = shuffle([
      { text: correctSent,                        isCorrect: true,  word: correctSent, meaning: item.thai },
      { text: `It's an ${item.adj} ${item.noun}.`, isCorrect: false, word: `It's an ${item.adj} ${item.noun}.`, meaning: 'ผิด article' },
      { text: `It's a ${item.noun} ${item.adj}.`,  isCorrect: false, word: `It's a ${item.noun} ${item.adj}.`,  meaning: 'ผิดลำดับคำ' },
      { text: `It's ${item.adj} ${item.noun}.`,    isCorrect: false, word: `It's ${item.adj} ${item.noun}.`,    meaning: 'ลืม a' }
    ]);
    list.push({
      id: qId++,
      type: 'grammar_midterm',
      targetWord: {
        word: correctSent,
        meaning: item.thai,
        image: buildTraitVisual(nounObj.image, item.adj),
        explanation: `💡 ใช้โครงสร้าง It's a + คำคุณศัพท์ + คำนาม → "${correctSent}" (${item.thai}) จ้า`
      },
      questionText: aAdjPrompts[idx] || 'Which sentence is correct?',
      thaiQuestionText: `เลือกประโยคที่ถูกต้องสำหรับ "${item.thai}"`,
      options: opts,
      skill: 'Grammar: a/an + Adj'
    });
  });

  // ── PART 4: "WHAT IS IT?" DESCRIBING OBJECTS Q&A (6 unique scenarios, 0 overlap with Part 3) ─
  const getToyImg = (name, fallbackEmoji) => getWordObj(name, { image: fallbackEmoji }).image;

  const coreQaScenarios = [
    { adj: 'big',    opp: 'little', noun: 'bag',       altNoun: 'robot',     thai: 'กระเป๋าใบใหญ่',          img: '💼' },
    { adj: 'round',  opp: 'square', noun: 'yo-yo',     altNoun: 'kite',      thai: 'ลูกดิ่งโยโย่ทรงกลม',     img: getToyImg('yo-yo', '🪀') },
    { adj: 'old',    opp: 'new',    noun: 'kite',      altNoun: 'doll',      thai: 'ว่าวเก่า',               img: getToyImg('kite', '🪁') }
  ];
  const extraQaScenarios = [
    { adj: 'big',    opp: 'little', noun: 'robot',     altNoun: 'car',       thai: 'หุ่นยนต์ตัวใหญ่',        img: getToyImg('robot', '🤖') },
    { adj: 'long',   opp: 'short',  noun: 'jump rope', altNoun: 'bat',       thai: 'เชือกกระโดดเส้นยาว',     img: getToyImg('jump rope', '🪢') },
    { adj: 'square', opp: 'round',  noun: 'puzzle',    altNoun: 'baseball',  thai: 'ตัวต่อจิ๊กซอว์สี่เหลี่ยม', img: getToyImg('puzzle', '🧩') },
    { adj: 'new',    opp: 'old',    noun: 'car',       altNoun: 'bicycle',   thai: 'รถยนต์ของเล่นใหม่',      img: getToyImg('car', '🚗') },
    { adj: 'little', opp: 'big',    noun: 'doll',      altNoun: 'yo-yo',     thai: 'ตุ๊กตาตัวเล็ก',          img: getToyImg('doll', '🪆') },
    { adj: 'short',  opp: 'long',   noun: 'bat',       altNoun: 'jump rope', thai: 'ไม้ตีเบสบอลอันสั้น',     img: getToyImg('bat', '🏏') },
    { adj: 'round',  opp: 'square', noun: 'baseball',  altNoun: 'puzzle',    thai: 'ลูกเบสบอลทรงกลม',        img: getToyImg('baseball', '⚾') },
    { adj: 'new',    opp: 'old',    noun: 'bicycle',   altNoun: 'car',       thai: 'รถจักรยานใหม่',          img: getToyImg('bicycle', '🚲') }
  ];

  // Exclude any (adj|noun) already used in Part 3; prefer unused nouns first
  const availCore = shuffle(coreQaScenarios.filter(s => !usedSentenceKeys.has(`${s.adj}|${s.noun}`)));
  const availExtraUnusedNoun = shuffle(extraQaScenarios.filter(s => !usedSentenceKeys.has(`${s.adj}|${s.noun}`) && !usedPart3Nouns.has(s.noun)));
  const availExtraUsedNoun = shuffle(extraQaScenarios.filter(s => !usedSentenceKeys.has(`${s.adj}|${s.noun}`) && usedPart3Nouns.has(s.noun)));

  const selectedQa = [];
  const usedQaNouns = new Set();
  const tryAddQa = (pool, limit) => {
    for (const s of pool) {
      if (selectedQa.length >= limit) break;
      const key = `${s.adj}|${s.noun}`;
      if (usedSentenceKeys.has(key) || usedQaNouns.has(s.noun)) continue;
      usedSentenceKeys.add(key);
      usedQaNouns.add(s.noun);
      selectedQa.push(s);
    }
  };

  tryAddQa(availCore, 2);
  tryAddQa(availExtraUnusedNoun, 6);
  tryAddQa(availExtraUsedNoun, 6);
  tryAddQa(availCore, 6);

  shuffle(selectedQa).forEach(s => {
    const artCorrect = articleFor(s.adj);
    const artOpp     = articleFor(s.opp);
    const correctAns = `It's ${artCorrect} ${s.adj} ${s.noun}.`;
    const wrong1     = `It's ${artOpp} ${s.opp} ${s.noun}.`;
    const wrong2     = `It's ${artCorrect} ${s.adj} ${s.altNoun}.`;
    const wrong3     = s.adj === 'old'
      ? `It's a old ${s.noun}.`
      : `It's ${artOpp} ${s.opp} ${s.altNoun}.`;

    const opts = shuffle([
      { text: correctAns, isCorrect: true,  word: correctAns, meaning: s.thai },
      { text: wrong1,     isCorrect: false, word: wrong1,     meaning: 'ผิดคำคุณศัพท์' },
      { text: wrong2,     isCorrect: false, word: wrong2,     meaning: 'ผิดคำนาม' },
      { text: wrong3,     isCorrect: false, word: wrong3,     meaning: 'ผิดโครงสร้าง/คำศัพท์' }
    ]);

    list.push({
      id: qId++,
      type: 'grammar_midterm',
      targetWord: {
        word: correctAns,
        meaning: s.thai,
        image: buildTraitVisual(s.img, s.adj),
        explanation: `💬 What is it? → "${correctAns}" แปลว่า มันคือ${s.thai} จ้า`
      },
      questionText: 'What is it?',
      thaiQuestionText: 'นี่คืออะไร? (ดูภาพและลักษณะแล้วตอบให้ถูกต้อง)',
      options: opts,
      skill: 'Sentence Q&A'
    });
  });

  return list;
}

// GENERATE CHALLENGE QUESTIONS DYNAMICALLY
export function generateQuestions() {
  if (state.currentUnitId === 'midterm_prep') {
    return generateMidtermQuestions();
  }
  if (state.currentUnitId === 'final_exam_prep') {
    return generateFinalExamQuestions();
  }
  if (state.currentUnitId === 'unit5_exam') {
    return generateUnit5ExamQuestions();
  }

  const targets = selectTargetWords();
  const list = [];

  // Dynamically assign question types based on count
  const typesPool = state.selectedGameMode === 'qa'
    ? ['sentence_qa']
    : ['audio', 'visual_word', 'thai_image', 'spelling_scrambled', 'sentence_qa', 'grammar_an'];

  const questionTypes = [];
  for (let i = 0; i < state.quizQuestionCount; i++) {
    questionTypes.push(typesPool[i % typesPool.length]);
  }
  // Shuffle to randomize types (only if not QA mode since QA has only 1 type)
  if (state.selectedGameMode !== 'qa') {
    questionTypes.sort(() => Math.random() - 0.5);
  }

  const usedGrammarNouns = new Set();

  for (let i = 0; i < state.quizQuestionCount; i++) {
    const targetWord = targets[i] || state.VOCAB_LIST[i % state.VOCAB_LIST.length];
    let type = questionTypes[i];

    // Don't ask young learners to spell phrases, commands, or long words —
    // fall back to picking the written word from the picture instead.
    if (type === 'spelling_scrambled' && !isSpellable(targetWord)) {
      type = 'visual_word';
    }

    if (type === 'grammar_an') {
      // Fallback if the unit has no concrete nouns to frame with a/an
      if (!state.VOCAB_LIST.some(isConcreteNoun)) {
        type = 'visual_word';
      } else {
        // We only choose words that are concrete, picturable nouns (never repeating the same fallback noun)
        let targetNoun = targetWord;
        if (!isConcreteNoun(targetNoun) || usedGrammarNouns.has(targetNoun.word.toLowerCase())) {
          const concretePool = state.VOCAB_LIST.filter(w => isConcreteNoun(w) && !usedGrammarNouns.has(w.word.toLowerCase()));
          if (concretePool.length > 0) {
            targetNoun = concretePool[Math.floor(Math.random() * concretePool.length)];
          } else {
            targetNoun = state.VOCAB_LIST.find(isConcreteNoun) || targetWord;
          }
        }
        usedGrammarNouns.add(targetNoun.word.toLowerCase());

        const wordLower = targetNoun.word.toLowerCase();
        const isAn = ['eraser'].includes(wordLower) || /^[aeiou]/i.test(wordLower);

        const correctText = `It’s ${isAn ? 'an' : 'a'} ${wordLower}.`;
        const incorrectArticleText = `It’s ${isAn ? 'a' : 'an'} ${wordLower}.`;

        const otherNouns = state.VOCAB_LIST.filter(w => w.word.toLowerCase() !== wordLower && isConcreteNoun(w));
        otherNouns.sort(() => Math.random() - 0.5);

        const incorrectNoun1 = otherNouns[0] || { word: 'Pen', meaning: 'ปากกา', image: '🖊️' };
        const incorrectNoun2 = otherNouns[1] || { word: 'Pencil', meaning: 'ดินสอ', image: '✏️' };

        const isAn1 = ['eraser'].includes(incorrectNoun1.word.toLowerCase()) || /^[aeiou]/i.test(incorrectNoun1.word.toLowerCase());
        const isAn2 = ['eraser'].includes(incorrectNoun2.word.toLowerCase()) || /^[aeiou]/i.test(incorrectNoun2.word.toLowerCase());

        const options = [
          { isCorrect: true, text: correctText, word: targetNoun.word, meaning: targetNoun.meaning, image: targetNoun.image },
          { isCorrect: false, text: incorrectArticleText, word: targetNoun.word, meaning: targetNoun.meaning, image: targetNoun.image },
          { isCorrect: false, text: `It’s ${isAn1 ? 'an' : 'a'} ${incorrectNoun1.word.toLowerCase()}.`, word: incorrectNoun1.word, meaning: incorrectNoun1.meaning, image: incorrectNoun1.image },
          { isCorrect: false, text: `It’s ${isAn2 ? 'an' : 'a'} ${incorrectNoun2.word.toLowerCase()}.`, word: incorrectNoun2.word, meaning: incorrectNoun2.meaning, image: incorrectNoun2.image }
        ];

        options.sort(() => Math.random() - 0.5);

        list.push({
          id: i + 1,
          type: 'grammar_an',
          targetWord: targetNoun,
          options: options,
          skill: 'Sentence Q&A'
        });
        continue;
      }
    }

    if (type === 'sentence_qa') {
      // 50% chance to make it a Yes/No question
      const isYesNo = Math.random() < 0.5;
      const targetWordLower = targetWord.word.toLowerCase();

      // Yes/No "Is this a ___?" questions only make sense for concrete countable nouns
      if (isYesNo && isConcreteNoun(targetWord)) {
        const isYes = Math.random() < 0.5;
        let questionText = '';
        let thaiQuestionText = '';
        let correctAnswerText = '';
        let correctThaiText = '';
        let wrongAnswers = [];

        if (isYes) {
          if (['yellow', 'blue', 'red', 'green', 'purple', 'orange', 'brown', 'pink', 'black', 'white'].includes(targetWordLower)) {
            questionText = `Is this ${targetWordLower}?`;
            thaiQuestionText = `นี่คือ${targetWord.meaning}ใช่ไหม?`;
          } else {
            const isAn = ['eraser'].includes(targetWordLower) || /^[aeiou]/i.test(targetWordLower);
            questionText = `Is this ${isAn ? 'an' : 'a'} ${targetWordLower}?`;
            thaiQuestionText = `นี่คือ${targetWord.meaning}ใช่ไหม?`;
          }
          correctAnswerText = "Yes, it is.";
          correctThaiText = "ใช่แล้วจ้า";
          wrongAnswers = [
            { text: "No, it isn't.", thaiText: "ไม่ใช่จ้า", isCorrect: false },
            { text: "Yes, I am.", thaiText: "ใช่ ฉันเอง", isCorrect: false },
            { text: "No, I'm not.", thaiText: "ไม่ใช่ ฉันไม่ใช่", isCorrect: false }
          ];
        } else {
          // Choose a different noun for the question (image stays the target)
          const otherNouns = state.VOCAB_LIST.filter(w => w.word.toLowerCase() !== targetWordLower && isConcreteNoun(w));
          const wrongWordObj = otherNouns[Math.floor(Math.random() * otherNouns.length)] || { word: 'Book', meaning: 'หนังสือ' };
          const wrongWordLower = wrongWordObj.word.toLowerCase();

          if (['yellow', 'blue', 'red', 'green', 'purple', 'orange', 'brown', 'pink', 'black', 'white'].includes(wrongWordLower)) {
            questionText = `Is this ${wrongWordLower}?`;
            thaiQuestionText = `นี่คือ${wrongWordObj.meaning}ใช่ไหม?`;
          } else {
            const isAn = ['eraser'].includes(wrongWordLower) || /^[aeiou]/i.test(wrongWordLower);
            questionText = `Is this ${isAn ? 'an' : 'a'} ${wrongWordLower}?`;
            thaiQuestionText = `นี่คือ${wrongWordObj.meaning}ใช่ไหม?`;
          }
          correctAnswerText = "No, it isn't.";
          correctThaiText = "ไม่ใช่จ้า";
          wrongAnswers = [
            { text: "Yes, it is.", thaiText: "ใช่แล้วจ้า", isCorrect: false },
            { text: "Yes, I am.", thaiText: "ใช่ ฉันเอง", isCorrect: false },
            { text: "No, I'm not.", thaiText: "ไม่ใช่ ฉันไม่ใช่", isCorrect: false }
          ];
        }

        const options = [
          { text: correctAnswerText, thaiText: correctThaiText, isCorrect: true, word: targetWord.word, meaning: targetWord.meaning, image: targetWord.image },
          ...wrongAnswers.map(wa => ({ ...wa, word: targetWord.word, meaning: targetWord.meaning, image: targetWord.image }))
        ];
        options.sort(() => Math.random() - 0.5);

        list.push({
          id: i + 1,
          type: 'sentence_qa',
          isYesNo: true,
          targetWord: targetWord,
          questionText: questionText,
          thaiQuestionText: thaiQuestionText,
          options: options,
          skill: 'Sentence Q&A'
        });
        continue;
      }
    }

    // Generate options: correct word + 3 random ones
    let options = [targetWord];
    let remaining = state.VOCAB_LIST.filter(w => w.word !== targetWord.word);

    // Shuffle remaining and take 3
    remaining.sort(() => Math.random() - 0.5);
    for (let o = 0; o < 3; o++) {
      if (remaining[o]) {
        options.push(remaining[o]);
      }
    }

    // Shuffle final options
    options.sort(() => Math.random() - 0.5);

    // Skill categorization
    let skill = '';
    if (type === 'audio') skill = 'Listening';
    else if (type === 'visual_word') skill = 'Word Recognition';
    else if (type === 'spelling_scrambled') skill = 'Spelling & Phonics';
    else if (type === 'sentence_qa') skill = 'Sentence Q&A';
    else skill = 'Visual Matching';

    list.push({
      id: i + 1,
      type: type,
      targetWord: targetWord,
      options: options,
      skill: skill
    });
  }

  return list;
}
