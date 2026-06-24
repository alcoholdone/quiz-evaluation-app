# 🎒 เกมคำศัพท์แสนสนุก & ระบบวัดผล (ป.1)

เว็บแอปฝึกคำศัพท์ภาษาอังกฤษพื้นฐานสำหรับนักเรียน ป.1 พร้อมโหมดฝึกสะกดคำ
เล่นเกมท้าทาย เขียนตามคำบอก และรายงานผลสำหรับผู้ปกครอง

เป็น **static site** ล้วน (HTML/CSS/JS) ไม่มี backend — ข้อมูลทั้งหมดเก็บใน
`localStorage` ของเครื่องผู้ใช้ ใช้ `speechSynthesis` ของเบราว์เซอร์อ่านออกเสียง
และโหลด Chart.js / Google Fonts ผ่าน CDN

## โครงสร้างไฟล์
- `index.html` — หน้าหลักและโครงสร้าง UI
- `style.css` — สไตล์ทั้งหมด
- `app.js` — ตรรกะแอป (เกม, การให้คะแนน, รายงาน, เสียง)
- `questions.js` — คลังคำศัพท์/คำถาม

## รันในเครื่อง (local)
เปิด `index.html` ตรงๆ ก็ได้ แต่แนะนำรันผ่าน static server เพื่อให้เสียงและ
fonts ทำงานครบ:
```bash
# Python 3
python3 -m http.server 8000
# แล้วเปิด http://localhost:8000
```

## Deploy ฟรี (เลือกอย่างใดอย่างหนึ่ง)

ทุกตัวฟรีและรองรับ static site นี้ได้ทันที ไม่ต้อง build:

### 1) GitHub Pages — แนะนำ (ใช้ git อยู่แล้ว)
1. สร้าง repo บน GitHub แล้ว push โค้ดขึ้นไป
2. ไปที่ repo → **Settings → Pages**
3. **Source**: เลือก `Deploy from a branch` → branch `main` → folder `/ (root)` → Save
4. รอสักครู่ จะได้ลิงก์ `https://<username>.github.io/<repo>/`

### 2) Cloudflare Pages / Netlify — ง่ายสุด (ลากวาง ไม่ต้องใช้ git)
- **Netlify Drop**: เข้า https://app.netlify.com/drop แล้วลากโฟลเดอร์โปรเจกต์ทั้งโฟลเดอร์ทิ้งลงไป → ได้ลิงก์ทันที
- **Cloudflare Pages**: https://pages.cloudflare.com → เชื่อม GitHub repo หรืออัปโหลดตรง

ทั้งสามเจ้าให้ HTTPS ฟรี (จำเป็นสำหรับ `speechSynthesis` บน iOS)

## ☁️ ระบบ Login + Sync ดาวข้ามเครื่อง (Firebase)

แอปนี้ซิงค์ความก้าวหน้า (ดาวสะสม, ประวัติ, รายงาน) ระหว่าง iPad ↔ คอม ผ่าน
Google sign-in + Firestore โดย **ไม่ต้องมี backend** — ถ้ายังไม่ตั้งค่า แอปจะทำงาน
แบบ offline ปกติ (เก็บข้อมูลในเครื่อง)

ไฟล์ที่เกี่ยวข้อง: `firebase-config.js` (ใส่ค่า), `sync.js` (เลเยอร์ซิงค์), `firestore.rules`

### ตั้งค่า Firebase (ครั้งเดียว ~5 นาที)
1. ไปที่ https://console.firebase.google.com → **Add project** (ปิด Google Analytics ได้)
2. **Authentication** → Get started → แท็บ Sign-in method → เปิด **Google** → Save
3. **Firestore Database** → Create database → เลือก region (เช่น `asia-southeast1`) → Production mode
4. แท็บ **Rules** → วางเนื้อหาจากไฟล์ `firestore.rules` → **Publish**
5. **Project settings (⚙️)** → ส่วน *Your apps* → กดไอคอน **Web `</>`** → ตั้งชื่อ →
   คัดลอกค่าใน `firebaseConfig` มาวางทับใน **`firebase-config.js`**
6. **Authentication → Settings → Authorized domains** → กด *Add domain* แล้วใส่โดเมนที่ deploy
   (เช่น `your-app.vercel.app`, `<username>.github.io`) — ไม่งั้น Google login จะถูกบล็อก

### วิธีใช้
- กดปุ่ม **"เข้าสู่ระบบ"** (มุมซ้ายบน) → ล็อกอินด้วยบัญชี Google ของคุณ
- จุดสีเขียว = ซิงค์อยู่ การเปลี่ยนแปลงจะ push ขึ้น cloud อัตโนมัติ
- เปิดอีกเครื่อง ล็อกอินบัญชีเดียวกัน → ข้อมูลตามมา; ถ้ามีอัปเดตระหว่างเล่นจะเด้ง toast ให้กดอัปเดต

> ⚠️ **ครั้งแรกที่เชื่อม 2 เครื่อง:** ให้ล็อกอินที่เครื่องที่ "มีความก้าวหน้ามากกว่า" ก่อน
> (ระบบ push ของเครื่องแรกขึ้น cloud) แล้วค่อยล็อกอินเครื่องที่สอง (จะดึงข้อมูลลงมาทับ)
> เพราะการซิงค์เป็นแบบ last-write-wins ทั้งก้อน ไม่ได้ merge ทีละรายการ

## หมายเหตุสำหรับการใช้บน iPad
- เพิ่มลงหน้าจอโฮม (Share → "เพิ่มไปยังหน้าจอโฮม") เพื่อเปิดแบบเต็มจอเหมือนแอป
- ต้องเปิดผ่าน **HTTPS** เสียงอ่านออกเสียงถึงจะทำงานบน Safari
- ข้อมูลความก้าวหน้าเก็บอยู่บนเครื่องเครื่องนั้น (localStorage) — เปลี่ยนเครื่อง/ล้างประวัติเบราว์เซอร์แล้วข้อมูลจะหาย
