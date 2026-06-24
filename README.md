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

## หมายเหตุสำหรับการใช้บน iPad
- เพิ่มลงหน้าจอโฮม (Share → "เพิ่มไปยังหน้าจอโฮม") เพื่อเปิดแบบเต็มจอเหมือนแอป
- ต้องเปิดผ่าน **HTTPS** เสียงอ่านออกเสียงถึงจะทำงานบน Safari
- ข้อมูลความก้าวหน้าเก็บอยู่บนเครื่องเครื่องนั้น (localStorage) — เปลี่ยนเครื่อง/ล้างประวัติเบราว์เซอร์แล้วข้อมูลจะหาย
