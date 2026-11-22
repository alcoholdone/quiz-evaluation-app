import { unit1 } from './unit1-school.js';
import { unit2 } from './unit2-colors.js';
import { unit3 } from './unit3-friends.js';
import { unit4 } from './unit4-family.js';
import { unit5 } from './unit5-toys.js';
import { unit6 } from './unit6-outdoors.js';

export const VOCAB_UNITS = [unit1, unit2, unit3, unit4, unit5, unit6];

// Total questions in exam simulations
export const EXAM_COUNTS = {
  midterm: 21,
  finalExam: 29,
  unit5Exam: 20
};

// Display metadata for Lesson Shelf tiles
export const UNIT_META = {
  unit_1: { icon: '✏️', code: 'Unit 1', titleEn: 'Things for school', titleTh: 'สิ่งของในโรงเรียน', accent: 'sage' },
  unit_2: { icon: '🎨', code: 'Unit 2', titleEn: 'Colors & shapes', titleTh: 'สีและรูปทรง', accent: 'cobalt' },
  unit_3: { icon: '🏫', code: 'Unit 3', titleEn: 'Friends & play', titleTh: 'เพื่อนและการเล่น', accent: 'plum', hasSpecial: true },
  unit_4: { icon: '👨‍👩‍👧‍👦', code: 'Unit 4', titleEn: 'Family', titleTh: 'ครอบครัวของฉัน', accent: 'coral' },
  unit_5: { icon: '🎂', code: 'Unit 5', titleEn: 'Birthday & Toys', titleTh: 'วันเกิดและของเล่น', accent: 'marigold' },
  unit_6: { icon: '🌳', code: 'Unit 6', titleEn: 'Outdoors', titleTh: 'กิจกรรมกลางแจ้ง', accent: 'sage' }
};

export const EXAM_PREP_CATALOG = [
  { id: 'midterm_prep', term: 1, icon: '🎓', title: 'ติวสอบกลางภาค', subtitle: 'Unit 1–2 + Phonics', count: EXAM_COUNTS.midterm, bonusStars: 20, theme: 'midterm' },
  { id: 'final_exam_prep', term: 1, icon: '🏆', title: 'ติวสอบปลายภาค', subtitle: 'Unit 3–4 + Grammar', count: EXAM_COUNTS.finalExam, bonusStars: 25, theme: 'final' },
  { id: 'unit5_exam', term: 2, icon: '🎯', title: 'สอบท้ายบท Unit 5', subtitle: "Toys + Adjectives + It's a/an", count: EXAM_COUNTS.unit5Exam, bonusStars: 20, theme: 'unit5' }
];
