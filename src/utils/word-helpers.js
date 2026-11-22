// Each shape's drawn SVG fill is a fixed color, so the "This is a ___. It's ___"
// answer must match the picture the child actually sees.
export const SHAPE_COLOR_MAP = {
  circle: 'red',
  square: 'blue',
  triangle: 'green',
  rectangle: 'yellow',
  star: 'purple',
  heart: 'pink',
  diamond: 'orange',
  oval: 'brown'
};

// --- Word classification helpers (single source of truth) ---
// Words that are NOT singular countable nouns: action verbs, adjectives,
// greetings and colors. They must never get "a/an" or "Is this a ___?" framing.
export const NON_NOUN_WORDS = ['sing', 'act', 'listen', 'look', 'open', 'close', 'fine', 'great', 'take out', 'put away', 'pick up', 'draw', 'play', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'yellow', 'blue', 'red', 'green', 'purple', 'orange', 'brown', 'pink', 'black', 'white', 'point', 'find', 'count', 'how many', 'tall', 'short', 'young', 'old', 'pretty', 'handsome', 'say', 'read', 'write', 'ask', 'answer', 'big', 'little', 'new', 'long', 'round', 'square', 'ride', 'throw', 'catch', 'sunny', 'rainy', 'windy'];

// "color" and "shape" ARE nouns, but they are abstract category headers whose
// picture is a generic icon — so we never frame them as "Is this a ___?" /
// "It's a ___" or use them as a picture quiz target.
export const CATEGORY_NOUNS = ['color', 'shape', 'birthday', 'year', 'weather'];

// True for any noun (used to decide part-of-speech style behavior).
export function isNounWord(item) {
  if (!item || item.type === 'command') return false;
  if (item.label && item.label !== 'n') return false;
  return !NON_NOUN_WORDS.includes(item.word.trim().toLowerCase());
}

// True only for a concrete, picturable singular countable noun — the kind we can
// safely point at and ask "What's this? It's a ___" / "Is this a ___?".
export function isConcreteNoun(item) {
  if (!isNounWord(item)) return false;
  return !CATEGORY_NOUNS.includes(item.word.trim().toLowerCase());
}

// A word is suitable for the letter-arranging spelling game only if it is a
// single, purely alphabetic word. Long nouns (e.g. "Wastebasket") are fine, but
// phrases and commands with spaces/punctuation are not (e.g. "Open your book.",
// "Take out") — those would force the child to place a "." or space tile.
export function isSpellable(item) {
  if (!item || item.type === 'command') return false;
  const w = item.word.trim();
  return !/[^a-zA-Z]/.test(w); // letters only (rejects spaces, periods, etc.)
}

// GET SENTENCE Q&A HIERARCHY
export function getSentenceQA(item) {
  const word = item.word.trim();
  const wordLower = word.toLowerCase();

  // Nouns that take "an" (vowel sound)
  const nounsAn = ['eraser'];

  // Nouns that take "a" (consonant sound)
  const nounsA = [
    'pen', 'pencil', 'bag', 'book', 'desk', 'chair', 'ruler', 'map', 'marker',
    'globe', 'table', 'board', 'wastebasket', 'poster', 'crayon', 'ball', 'bird', 'peach',
    'notebook', 'pencil case'
  ];

  if (item.type === 'command') {
    return {
      question: "What does the teacher say?",
      answer: item.word,
      thaiQuestion: "คุณครูพูดว่าอะไร?",
      thaiAnswer: item.meaning
    };
  }

  if (nounsAn.includes(wordLower)) {
    return {
      question: "What’s this?",
      answer: `It’s an ${wordLower}.`,
      thaiQuestion: "นี่คืออะไร?",
      thaiAnswer: `มันคือ${item.meaning}`
    };
  } else if (nounsA.includes(wordLower)) {
    return {
      question: "What’s this?",
      answer: `It’s a ${wordLower}.`,
      thaiQuestion: "นี่คืออะไร?",
      thaiAnswer: `มันคือ${item.meaning}`
    };
  } else if (wordLower === 'boy') {
    return {
      question: "Who’s he?",
      answer: "He’s a boy.",
      thaiQuestion: "เขาคือใคร?",
      thaiAnswer: "เขาคือเด็กผู้ชาย"
    };
  } else if (wordLower === 'partner') {
    return {
      question: "Who’s this?",
      answer: "This is my partner.",
      thaiQuestion: "นี่คือใคร?",
      thaiAnswer: "นี่คือคู่หูของฉัน"
    };
  } else if (wordLower === 'friend') {
    return {
      question: "Who’s this?",
      answer: "This is my friend.",
      thaiQuestion: "นี่คือใคร?",
      thaiAnswer: "นี่คือเพื่อนของฉัน"
    };
  } else if (wordLower === 'play') {
    return {
      question: "What should we do now?",
      answer: "Let’s play.",
      thaiQuestion: "พวกเราควรทำอะไรตอนนี้?",
      thaiAnswer: "ไปเล่นกันเถอะ"
    };
  } else if (wordLower === 'cd') {
    return {
      question: "What's this?",
      answer: "It's a CD.",
      thaiQuestion: "นี่คืออะไร?",
      thaiAnswer: "มันคือแผ่นซีดี"
    };
  } else if (wordLower === 'video game') {
    return {
      question: "What's this?",
      answer: "It's a video game.",
      thaiQuestion: "นี่คืออะไร?",
      thaiAnswer: "มันคือวีดีโอเกม"
    };
  } else if (['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'].includes(wordLower)) {
    return {
      question: "How many?",
      answer: word,
      thaiQuestion: "มีจำนวนเท่าไหร่?",
      thaiAnswer: item.meaning
    };
  } else if (['open', 'close'].includes(wordLower)) {
    return {
      question: `Please ${wordLower} the book.`,
      answer: `I ${wordLower} the book.`,
      thaiQuestion: `กรุณา${item.meaning}หนังสือ`,
      thaiAnswer: `ฉัน${item.meaning}หนังสือ`
    };
  } else if (wordLower === 'take out') {
    return {
      question: "Please take out your pencil.",
      answer: "I take out my pencil.",
      thaiQuestion: "กรุณาหยิบดินสอของคุณออกมา",
      thaiAnswer: "ฉันหยิบดินสอของฉันออกมา"
    };
  } else if (wordLower === 'put away') {
    return {
      question: "Please put away your pencil.",
      answer: "I put away my pencil.",
      thaiQuestion: "กรุณาเก็บดินสอของคุณเข้าที่",
      thaiAnswer: "ฉันเก็บดินสอของฉันเข้าที่"
    };
  } else if (wordLower === 'listen') {
    return {
      question: "What should we do now?",
      answer: "Let’s listen.",
      thaiQuestion: "พวกเราควรทำอะไรตอนนี้?",
      thaiAnswer: "ไปฟังกันเถอะ"
    };
  } else if (wordLower === 'sing') {
    return {
      question: "What should we do now?",
      answer: "Let’s sing.",
      thaiQuestion: "พวกเราควรทำอะไรตอนนี้?",
      thaiAnswer: "ไปร้องเพลงกันเถอะ"
    };
  } else if (wordLower === 'act') {
    return {
      question: "What should we do now?",
      answer: "Let’s act.",
      thaiQuestion: "พวกเราควรทำอะไรตอนนี้?",
      thaiAnswer: "ไปแสดงท่าทางกันเถอะ"
    };
  } else if (wordLower === 'fine') {
    return {
      question: "How are you?",
      answer: "I’m fine.",
      thaiQuestion: "คุณสบายดีไหม?",
      thaiAnswer: "ฉันสบายดี"
    };
  } else if (wordLower === 'great') {
    return {
      question: "How are you?",
      answer: "I’m great.",
      thaiQuestion: "คุณสบายดีไหม?",
      thaiAnswer: "ฉันสบายดีมาก"
    };
  } else if (wordLower === 'color') {
    return {
      question: "What’s this?",
      answer: "It’s a color.",
      thaiQuestion: "นี่คืออะไร?",
      thaiAnswer: "มันคือสี"
    };
  } else if (['yellow', 'blue', 'red', 'green', 'purple', 'orange', 'brown', 'pink', 'black', 'white'].includes(wordLower)) {
    return {
      question: "What color is this?",
      answer: `It’s ${wordLower}.`,
      thaiQuestion: "นี่คือสีอะไร?",
      thaiAnswer: `มันคือ${item.meaning}`
    };
  } else if (['sunny', 'rainy', 'windy', 'cloudy', 'snowy'].includes(wordLower)) {
    return {
      question: "How’s the weather?",
      answer: `It’s ${wordLower}.`,
      thaiQuestion: "สภาพอากาศเป็นอย่างไร?",
      thaiAnswer: `มัน${item.meaning}`
    };
  } else if (wordLower === 'weather') {
    return {
      question: "What’s this?",
      answer: "It’s the weather.",
      thaiQuestion: "นี่คืออะไร?",
      thaiAnswer: "มันคือสภาพอากาศ"
    };
  } else {
    // Default fallback based on vowel detection
    const isVowel = /^[aeiou]/i.test(wordLower);
    return {
      question: "What’s this?",
      answer: `It’s ${isVowel ? 'an' : 'a'} ${wordLower}.`,
      thaiQuestion: "นี่คืออะไร?",
      thaiAnswer: `มันคือ${item.meaning}`
    };
  }
}
