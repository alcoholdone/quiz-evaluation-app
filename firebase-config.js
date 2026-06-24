// =============================================================================
//  Firebase config  —  แก้ค่าตรงนี้หลังสร้างโปรเจกต์ Firebase (ดูขั้นตอนใน README)
// =============================================================================
//  ⚠️ ค่าพวกนี้ "ไม่ใช่ความลับ" — apiKey ของ Firebase ฝั่ง client เปิดเผยได้ปกติ
//     ความปลอดภัยมาจาก Google Sign-in + Firestore Security Rules ไม่ใช่การซ่อน key
//     จึง commit ขึ้น git ได้เลย
//
//  วิธีเอาค่า: Firebase Console → Project settings (⚙️) → ส่วน "Your apps" →
//             เลือก Web app (</>) → คัดลอกค่าใน firebaseConfig มาวางทับด้านล่าง
//
//  ตราบใดที่ยังเป็น "PASTE_..." ระบบ sync จะปิดอยู่ และแอปจะทำงานแบบ offline
//  (เก็บข้อมูลในเครื่องเหมือนเดิม) ไม่มี error
// =============================================================================

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyA6HluvWKezq0QJcGATsAkkioZOWY-lOY8",
  authDomain: "quiz-evaluation-app.firebaseapp.com",
  projectId: "quiz-evaluation-app",
  storageBucket: "quiz-evaluation-app.firebasestorage.app",
  messagingSenderId: "642874051095",
  appId: "1:642874051095:web:9a93999ee7a2a1fc87ea52",
  measurementId: "G-HFP22V29WK"
};
