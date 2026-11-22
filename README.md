# 🎒 เกมคำศัพท์แสนสนุก & ระบบวัดผล (ป.1)

เว็บแอปฝึกคำศัพท์ภาษาอังกฤษพื้นฐานสำหรับนักเรียน ป.1 พร้อมโหมดฝึกสะกดคำ
เล่นเกมท้าทาย เขียนตามคำบอก แบบฝึกพิเศษ Unit 3 และรายงานผลสำหรับผู้ปกครอง

เป็น **Zero-build static site** (HTML / Modular CSS / Native ES Modules) ไม่มี backend — ข้อมูลทั้งหมดเก็บใน
`localStorage` ของเครื่องผู้ใช้ ใช้ Web Speech API (`speechSynthesis`) อ่านออกเสียง
และ lazy-load Chart.js (`chart.js@4.4.8` พร้อม Subresource Integrity) และ Google Fonts ผ่าน CDN

## โครงสร้างไฟล์
- `index.html` — หน้าหลัก โครงสร้าง UI, CSP/Referrer headers และ native `<dialog>`
- `.nojekyll` — ให้ GitHub Pages เสิร์ฟไฟล์ static โดยตรง
- `css/` — สไตล์แยกตามหน้าที่ (สไตล์ Warm Classroom Workbook & Responsive)
  - `css/tokens.css`, `css/base.css`, `css/layout.css`, `css/components.css`, `css/features.css`, `css/responsive.css`
- `src/main.js` — จุดเริ่มต้นแอป (bootstrap & event listeners)
- `src/state/store.js` — State กลาง, `STORAGE_KEYS`, และ scoped timer registry
- `src/data/` — คลังคำศัพท์แยกบท (`unit1-school.js` – `unit6-outdoors.js`), metadata (`units.js`), และชุดเขียนตามคำบอก (`dictation-rounds.js`)
- `src/features/` — โมดูลแต่ละฟีเจอร์ (`catalog.js`, `learn.js`, `quiz-generator.js`, `game.js`, `dictation.js`, `special.js`, `dashboard.js`, `vocab-manager.js`, `rewards.js`, `navigation.js`)
- `src/services/` — บริการระบบ (`storage.js`, `speech.js`, `charts.js`, `sync.js`)
- `src/utils/` — ยูทิลิตี้ (`sanitize.js`, `shuffle.js`, `word-helpers.js`, `toast.js`)
- `firebase-config.js`, `firestore.rules` — ค่าตั้งค่าและกฎความปลอดภัย Firebase Cloud Sync
- `test-quiz.js` — ชุดทดสอบอัตโนมัติ (Syntax, Security/XSS, Regression & Game Modes)

## รันในเครื่อง (local)
แอปใช้ `<script type="module">` (Native ES Modules) จึงต้องเปิดผ่าน **HTTP static server** (ไม่ควรเปิดไฟล์ `index.html` ด้วย `file://` ตรงๆ):

```bash
# Python 3
python3 -m http.server 8000
# หรือ Node.js: npx serve .
# แล้วเปิด http://localhost:8000
```

## การทดสอบ (Automated Tests)
รันชุดทดสอบด้วย Node.js เพื่อตรวจสอบ syntax, inline handler audit, XSS/SVG sanitizer, category filter และชุดคำถามทุกโหมด:

```bash
node test-quiz.js
```

## Deploy ฟรี (เลือกอย่างใดอย่างหนึ่ง)

รองรับ static site นี้ได้ทันที ไม่ต้องมีขั้นตอน build:

### 1) GitHub Pages — แนะนำ (ใช้ git อยู่แล้ว)
1. Push โค้ดขึ้น GitHub repository
2. ไปที่ repo → **Settings → Pages**
3. **Source**: เลือก `Deploy from a branch` → branch `main` → folder `/ (root)` → Save
4. รอสักครู่ จะได้ลิงก์ `https://<username>.github.io/<repo>/` (ทุก path ในโปรเจกต์เป็น relative path รองรับ subpath ของ GitHub Pages)

### 2) Cloudflare Pages / Netlify — ง่ายสุด
- **Netlify Drop**: เข้า https://app.netlify.com/drop แล้วลากโฟลเดอร์โปรเจกต์ทั้งโฟลเดอร์วาง → ได้ลิงก์ทันที
- **Cloudflare Pages**: https://pages.cloudflare.com → เชื่อม GitHub repo หรืออัปโหลดตรง

ทั้งสามเจ้าให้ HTTPS ฟรี (จำเป็นสำหรับ `speechSynthesis` บน iOS)

## ☁️ ระบบ Login + Sync ดาวข้ามเครื่อง (Firebase)

แอปนี้ซิงค์ความก้าวหน้า (ดาวสะสม, ประวัติ, รายงาน) ระหว่าง iPad ↔ คอม ผ่าน
Google Sign-in + Firestore โดย **ไม่ต้องมี backend** — ถ้ายังไม่ตั้งค่าหรือออฟไลน์ แอปจะทำงาน
แบบ offline ปกติ (เก็บข้อมูลในเครื่อง)

ไฟล์ที่เกี่ยวข้อง: `firebase-config.js` (ใส่ค่า), `src/services/sync.js` (เลเยอร์ซิงค์), `firestore.rules`

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
- กดปุ่ม **"เข้าสู่ระบบ"** (แถบด้านบนซ้าย) → ล็อกอินด้วยบัญชี Google ของคุณ
- จุดสีเขียว = ซิงค์อยู่ การเปลี่ยนแปลงจะ push ขึ้น cloud อัตโนมัติ
- เปิดอีกเครื่อง ล็อกอินบัญชีเดียวกัน → ข้อมูลตามมา; ถ้ามีอัปเดตระหว่างเล่นจะเด้ง toast ให้กดอัปเดต

> ⚠️ **ครั้งแรกที่เชื่อม 2 เครื่อง:** ให้ล็อกอินที่เครื่องที่ "มีความก้าวหน้ามากกว่า" ก่อน
> (ระบบ push ของเครื่องแรกขึ้น cloud) แล้วค่อยล็อกอินเครื่องที่สอง (จะดึงข้อมูลลงมาทับ)
> เพราะการซิงค์เป็นแบบ last-write-wins ทั้งก้อน ไม่ได้ merge ทีละรายการ

### สิทธิ์การใช้งาน / logout
- **ยังไม่ล็อกอิน** → ใช้ได้แค่ **โหมดฝึกสะกดคำ** และซ่อนจำนวนดาวไว้; โหมดเกม/เขียนตามคำบอก/แบบฝึกพิเศษ/รายงานผล ต้องล็อกอินก่อน
- **logout** → ข้อมูลในเครื่องนี้จะถูก**ล้างออก** (สำรองไว้บน cloud แล้ว) เพื่อกันข้อมูลปนกับผู้ใช้คนอื่น — ล็อกอินใหม่แล้วข้อมูลกลับมาครบ

## หมายเหตุสำหรับการใช้บน iPad และมือถือ
- เพิ่มลงหน้าจอโฮม (Share → "เพิ่มไปยังหน้าจอโฮม") เพื่อเปิดแบบเต็มจอเหมือนแอป
- ต้องเปิดผ่าน **HTTPS** เสียงอ่านออกเสียงถึงจะทำงานบน Safari
- บนมือถือ (`<= 640px`) แถบโหมดจะย้ายเป็นแถบล่าง (Bottom Tab Bar), หน้าต่างฝึกสะกดคำเปิดเป็น Bottom Sheet และตารางจะเรียงเป็นการ์ดให้อ่านง่าย
- ข้อมูลความก้าวหน้าเก็บอยู่บนเครื่องเครื่องนั้น (`localStorage`) — หากต้องการย้ายข้ามเครื่องแนะนำให้เข้าสู่ระบบ Cloud Sync
