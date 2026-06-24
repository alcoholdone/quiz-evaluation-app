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
  apiKey: "PASTE_API_KEY",
  authDomain: "PASTE_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_PROJECT_ID",
  storageBucket: "PASTE_PROJECT_ID.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID",
};
