const VOCAB_UNITS = [
  {
    id: 'unit_1',
    title: 'Unit 1: Things for school',
    words: [
      { 
        word: 'Pen', 
        meaning: 'ปากกา', 
        image: '🖊️',
        explanation: '🖊️ Pen สะกดว่า P - E - N แปลว่า ปากกา ใช้สำหรับเขียนหนังสือจ้า',
        label: 'n'
      },
      { 
        word: 'Pencil', 
        meaning: 'ดินสอ', 
        image: '✏️',
        explanation: '✏️ Pencil สะกดว่า P - E - N - C - I - L แปลว่า ดินสอ เอาไว้ให้เด็กๆ วาดเขียนและลบได้ง่ายจ้า',
        label: 'n'
      },
      { 
        word: 'Bag', 
        meaning: 'กระเป๋า', 
        image: '🎒',
        explanation: '🎒 Bag สะกดว่า B - A - G แปลว่า กระเป๋า เอาไว้ใส่หนังสือและดินสอมาโรงเรียนจ้า',
        label: 'n'
      },
      { 
        word: 'Book', 
        meaning: 'หนังสือ', 
        image: '📖',
        explanation: '📖 Book สะกดว่า B - O - O - K แปลว่า หนังสือ มีเรื่องราวและรูปภาพแสนสนุกให้เราอ่านจ้า',
        label: 'n'
      },
      { 
        word: 'Desk', 
        meaning: 'โต๊ะเรียน', 
        image: `<svg viewBox="0 0 100 100" class="svg-icon" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="82" rx="35" ry="6" fill="#cbd5e1"/><rect x="25" y="45" width="8" height="35" rx="2" fill="#a16207"/><rect x="67" y="45" width="8" height="35" rx="2" fill="#a16207"/><rect x="18" y="38" width="64" height="15" rx="2" fill="#ca8a04"/><line x1="50" y1="38" x2="50" y2="53" stroke="#854d0e" stroke-width="2"/><circle cx="34" cy="45" r="3" fill="#854d0e"/><circle cx="66" cy="45" r="3" fill="#854d0e"/><rect x="18" y="45" width="10" height="40" rx="2" fill="#d97706"/><rect x="72" y="45" width="10" height="40" rx="2" fill="#d97706"/><rect x="10" y="28" width="80" height="12" rx="4" fill="#f59e0b"/><path d="M 15,34 Q 50,32 85,34" stroke="#d97706" stroke-width="2" fill="none" opacity="0.6"/></svg>`,
        explanation: '🏫 Desk สะกดว่า D - E - S - K แปลว่า โต๊ะเรียน เป็นโต๊ะที่มีลิ้นชักสำหรับทำกิจกรรมในห้องเรียนจ้า',
        label: 'n'
      },
      { 
        word: 'Chair', 
        meaning: 'เก้าอี้', 
        image: '🪑',
        explanation: '🪑 Chair สะกดว่า C - H - A - I - R แปลว่า เก้าอี้ เอาไว้ให้นั่งทำการบ้านและเรียนหนังสือจ้า',
        label: 'n'
      },
      {
        word: 'Ruler',
        meaning: 'ไม้บรรทัด',
        image: '📏',
        explanation: '📏 Ruler สะกดว่า R - U - L - E - R แปลว่า ไม้บรรทัด เอาไว้ขีดเส้นใต้คำตอบให้เป็นระเบียบเรียบร้อยจ้า',
        label: 'n'
      },
      {
        word: 'Eraser',
        meaning: 'ยางลบ',
        image: `<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 280 280" style="enable-background:new 0 0 280 280;" xml:space="preserve"><g><path style="fill:#26A6D1;" d="M183.679,4.634l91.683,91.683c6.178,6.178,6.178,16.207,0,22.385L118.695,275.359c-6.178,6.187-16.207,6.187-22.385,0L4.637,183.676c-6.178-6.178-6.178-16.198,0-22.376L161.295,4.634C167.482-1.545,177.501-1.545,183.679,4.634z"/><path style="fill:#E2574C;" d="M84.34,81.597L4.637,161.3c-6.178,6.178-6.178,16.198,0,22.376l91.683,91.683c6.178,6.187,16.207,6.187,22.385,0l79.703-79.694L84.34,81.597z"/><path style="fill:#CB4E44;" d="M40.585,125.352L4.637,161.3c-6.178,6.178-6.178,16.198,0,22.376l91.683,91.683c6.178,6.187,16.207,6.187,22.385,0l35.949-35.94L40.585,125.352z"/><path style="fill:#EAE5E4;" d="M20.416,145.548l114.041,114.041l-10.555,10.555L9.861,156.103L20.416,145.548z"/></g></svg>`,
        explanation: '🧽 Eraser สะกดว่า E - R - A - S - E - R แปลว่า ยางลบ เอาไว้ลบคำผิดจากดินสอให้สะอาดจ้า',
        label: 'n'
      },
      { 
        word: 'Map', 
        meaning: 'แผนที่', 
        image: '🗺️',
        explanation: '🗺️ Map สะกดว่า M - A - P แปลว่า แผนที่ เอาไว้ช่วยบอกทางไม่ให้หลงทางจ้า',
        label: 'n'
      },
      { 
        word: 'Marker', 
        meaning: 'ปากกาเมจิก / ปากกาไวท์บอร์ด', 
        image: `<svg viewBox="0 0 100 100" class="svg-icon" xmlns="http://www.w3.org/2000/svg"><g transform="rotate(-45 50 50)"><rect x="40" y="30" width="20" height="45" rx="2" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1"/><rect x="40" y="45" width="20" height="20" fill="#3b82f6"/><polygon points="43,30 57,30 55,22 45,22" fill="#64748b"/><polygon points="46,22 54,22 52,14 46,14" fill="#1d4ed8"/><rect x="38" y="75" width="24" height="15" rx="3" fill="#1e3a8a"/></g></svg>`,
        explanation: '🖊️ Marker สะกดว่า M - A - R - K - E - R แปลว่า ปากกาเมจิก / ปากกาไวท์บอร์ด ใช้สำหรับเขียนและวาดรูปจ้า',
        label: 'n'
      },
      { 
        word: 'Globe', 
        meaning: 'ลูกโลก', 
        image: '🌍',
        explanation: '🌍 Globe สะกดว่า G - L - O - B - E แปลว่า ลูกโลก เอาไว้ใช้ดูแผนที่และทวีปต่างๆ รอบโลกจ้า',
        label: 'n'
      },
      { 
        word: 'Table', 
        meaning: 'โต๊ะ', 
        image: `<svg viewBox="0 0 100 100" class="svg-icon" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="80" rx="30" ry="5" fill="#cbd5e1"/><rect x="28" y="45" width="6" height="35" rx="1" fill="#78350f"/><rect x="66" y="45" width="6" height="35" rx="1" fill="#78350f"/><rect x="20" y="38" width="60" height="8" rx="2" fill="#d97706"/></svg>`,
        explanation: '🪵 Table สะกดว่า T - A - B - L - E แปลว่า โต๊ะ เอาไว้สำหรับวางสิ่งของหรือทานอาหารร่วมกันจ้า',
        label: 'n'
      },
      { 
        word: 'Board', 
        meaning: 'กระดาน', 
        image: `<svg viewBox="0 0 100 100" class="svg-icon" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="25" width="70" height="50" rx="4" fill="#6b7280" opacity="0.1"/><rect x="15" y="25" width="70" height="50" rx="4" fill="#a16207"/><rect x="20" y="30" width="60" height="40" rx="2" fill="#14532d"/><path d="M 30,42 L 35,42 L 32,48 L 40,48" stroke="#fef08a" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M 45,45 L 55,45 M 48,50 L 58,50" stroke="#ffffff" stroke-width="2" stroke-linecap="round" fill="none"/><rect x="25" y="66" width="10" height="3" rx="1" fill="#f3f4f6"/></svg>`,
        explanation: '📋 Board สะกดว่า B - O - A - R - D แปลว่า กระดาน เอาไว้ให้คุณครูเขียนหนังสือให้เด็กๆ ดูจ้า',
        label: 'n'
      },
      { 
        word: 'Wastebasket', 
        meaning: 'ถังขยะ', 
        image: `<svg viewBox="0 0 100 100" class="svg-icon" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="82" rx="22" ry="5" fill="#cbd5e1"/><polygon points="32,35 68,35 62,80 38,80" fill="#94a3b8"/><ellipse cx="50" cy="35" rx="18" ry="4" fill="#64748b"/><line x1="37" y1="35" x2="41" y2="80" stroke="#475569" stroke-width="1.5"/><line x1="43" y1="35" x2="45" y2="80" stroke="#475569" stroke-width="1.5"/><line x1="50" y1="35" x2="50" y2="80" stroke="#475569" stroke-width="1.5"/><line x1="57" y1="35" x2="55" y2="80" stroke="#475569" stroke-width="1.5"/><line x1="63" y1="35" x2="59" y2="80" stroke="#475569" stroke-width="1.5"/><path d="M 42,33 Q 48,22 55,32 Q 62,28 65,34" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1"/></svg>`,
        explanation: '🗑️ Wastebasket สะกดว่า W - A - S - T - E - B - A - S - K - E - T แปลว่า ถังขยะ เอาไว้ทิ้งเศษขยะให้ห้องเรียนสะอาดจ้า',
        label: 'n'
      },
      {
        word: 'Poster',
        meaning: 'โปสเตอร์',
        image: '🖼️',
        explanation: '🖼️ Poster สะกดว่า P - O - S - T - E - R แปลว่า โปสเตอร์ เป็นแผ่นภาพขนาดใหญ่ใช้สำหรับติดฝาผนังเพื่อตกแต่งหรือให้ความรู้จ้า',
        label: 'n'
      },
      {
        word: 'Crayon',
        meaning: 'สีเทียน',
        image: '🖍️',
        explanation: '🖍️ Crayon สะกดว่า C - R - A - Y - O - N แปลว่า สีเทียน เอาไว้ใช้ระบายสีรูปภาพให้สวยงามจ้า',
        label: 'n'
      },
      {
        word: 'Listen',
        meaning: 'ฟัง',
        image: '🎧',
        explanation: '🎧 Listen สะกดว่า L - I - S - T - E - N แปลว่า ฟัง หรือตั้งใจฟังเสียงต่างๆ จ้า',
        label: 'v.i'
      },
      {
        word: 'Sing',
        meaning: 'ร้องเพลง',
        image: '🎤',
        explanation: '🎤 Sing สะกดว่า S - I - N - G แปลว่า ร้องเพลง ด้วยเสียงอันไพเราะจ้า',
        label: 'v.i'
      },
      {
        word: 'Act',
        meaning: 'แสดงท่าทาง',
        image: '🎭',
        explanation: '🎭 Act สะกดว่า A - C - T แปลว่า แสดงท่าทาง หรือทำกิจกรรมจ้า',
        label: 'v.i'
      },
      {
        word: 'Partner',
        meaning: 'คู่หู',
        image: '👥',
        explanation: '👥 Partner สะกดว่า P - A - R - T - N - E - R แปลว่า คู่หู หรือเพื่อนร่วมงานจ้า',
        label: 'n'
      },
      {
        word: 'Take out',
        meaning: 'หยิบออกไป',
        image: `<svg viewBox="0 0 100 100" class="svg-icon" xmlns="http://www.w3.org/2000/svg"><style>@keyframes handMove { 0% { transform: translateY(-15px); } 30% { transform: translateY(15px); } 40% { transform: translateY(15px); } 70% { transform: translateY(-12px); } 100% { transform: translateY(-15px); } } @keyframes itemMove { 0%, 30% { transform: translateY(0px); opacity: 0.6; } 40% { transform: translateY(0px); opacity: 1; } 70% { transform: translateY(-27px); opacity: 1; } 100% { transform: translateY(0px); opacity: 0.3; } } .animated-hand { animation: handMove 3.5s ease-in-out infinite; transform-origin: top center; } .animated-item { animation: itemMove 3.5s ease-in-out infinite; transform-origin: center; }</style><circle cx="50" cy="50" r="45" fill="#fff7ed" opacity="0.8"/><rect x="30" y="55" width="40" height="25" rx="3" fill="#fdbaf8" stroke="#d946ef" stroke-width="2" opacity="0.5"/><g class="animated-item"><rect x="46" y="50" width="8" height="22" rx="2" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1"/><polygon points="46,50 54,50 50,42" fill="#fbcfe8" stroke="#1d4ed8" stroke-width="1"/><rect x="46" y="68" width="8" height="4" fill="#ef4444"/></g><rect x="26" y="58" width="48" height="24" rx="4" fill="#f472b6" stroke="#db2777" stroke-width="2"/><line x1="32" y1="64" x2="68" y2="64" stroke="#db2777" stroke-width="1.5" stroke-dasharray="3 3"/><rect x="44" y="68" width="12" height="6" rx="1" fill="#db2777"/><g class="animated-hand"><path d="M 50,-5 L 50,30" stroke="#f59e0b" stroke-width="8" stroke-linecap="round"/><path d="M 50,-5 L 50,15" stroke="#10b981" stroke-width="10" stroke-linecap="round"/><path d="M 46,30 Q 42,32 45,36" fill="none" stroke="#d97706" stroke-width="3" stroke-linecap="round"/><path d="M 54,30 Q 58,32 55,36" fill="none" stroke="#d97706" stroke-width="3" stroke-linecap="round"/></g></svg>`,
        explanation: '📤 Take out สะกดว่า T - A - K - E - O - U - T แปลว่า หยิบออกไป เช่น หยิบหนังสือออกมาจากกระเป๋าจ้า',
        label: 'v.t'
      },
      {
        word: 'Open',
        meaning: 'เปิด',
        image: `<svg viewBox="0 0 100 100" class="svg-icon" xmlns="http://www.w3.org/2000/svg"><style>@keyframes bookOpenClose { 0%, 100% { transform: rotateY(0deg); } 50% { transform: rotateY(-40deg); } } .book-cover-left { transform-origin: right center; animation: bookOpenClose 3s ease-in-out infinite; perspective: 1000px; transform-style: preserve-3d; }</style><circle cx="50" cy="50" r="45" fill="#f0fdf4" opacity="0.8"/><rect x="48" y="20" width="4" height="60" rx="2" fill="#475569"/><path d="M 50,22 Q 65,20 80,25 L 80,77 Q 65,72 50,74 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/><g class="book-cover-left"><path d="M 50,22 Q 35,20 20,25 L 20,77 Q 35,72 50,74 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/><path d="M 50,20 Q 35,18 18,23 L 18,75 Q 35,70 50,72 Z" fill="#10b981" stroke="#047857" stroke-width="1.5"/></g><path d="M 50,20 Q 65,18 82,23 L 82,75 Q 65,70 50,72 Z" fill="#10b981" stroke="#047857" stroke-width="1.5" opacity="0.85"/><path d="M 55,35 Q 65,33 75,37" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/><path d="M 55,45 Q 65,43 75,47" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/></svg>`,
        explanation: '📖 Open สะกดว่า O - P - E - N แปลว่า เปิด เช่น เปิดสมุดหรือเปิดหนังสือจ้า',
        label: 'v.t'
      },
      {
        word: 'Close',
        meaning: 'ปิด',
        image: `<svg viewBox="0 0 100 100" class="svg-icon" xmlns="http://www.w3.org/2000/svg"><style>@keyframes bookClose { 0%, 100% { transform: rotateY(-40deg); } 50% { transform: rotateY(0deg); } } .book-cover-left { transform-origin: right center; animation: bookClose 3s ease-in-out infinite; perspective: 1000px; transform-style: preserve-3d; }</style><circle cx="50" cy="50" r="45" fill="#fef2f2" opacity="0.8"/><rect x="48" y="20" width="4" height="60" rx="2" fill="#475569"/><path d="M 50,22 Q 65,20 80,25 L 80,77 Q 65,72 50,74 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/><g class="book-cover-left"><path d="M 50,22 Q 35,20 20,25 L 20,77 Q 35,72 50,74 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/><path d="M 50,20 Q 35,18 18,23 L 18,75 Q 35,70 50,72 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="1.5"/></g><path d="M 50,20 Q 65,18 82,23 L 82,75 Q 65,70 50,72 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="1.5" opacity="0.85"/><path d="M 55,35 Q 65,33 75,37" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/><path d="M 55,45 Q 65,43 75,47" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/></svg>`,
        explanation: '📕 Close สะกดว่า C - L - O - S - E แปลว่า ปิด เช่น ปิดสมุดหรือปิดหนังสือจ้า',
        label: 'v.t'
      },
      {
        word: 'Put away',
        meaning: 'เก็บเข้าที่',
        image: `<svg viewBox="0 0 100 100" class="svg-icon" xmlns="http://www.w3.org/2000/svg"><style>@keyframes handMovePut { 0% { transform: translateY(-15px); } 30% { transform: translateY(15px); } 40% { transform: translateY(15px); } 70% { transform: translateY(15px); } 100% { transform: translateY(-15px); } } @keyframes itemMovePut { 0% { transform: translateY(-27px); opacity: 0.3; } 30% { transform: translateY(-27px); opacity: 1; } 60% { transform: translateY(0px); opacity: 1; } 70%, 100% { transform: translateY(0px); opacity: 0.3; } } .animated-hand-put { animation: handMovePut 3.5s ease-in-out infinite; transform-origin: top center; } .animated-item-put { animation: itemMovePut 3.5s ease-in-out infinite; transform-origin: center; }</style><circle cx="50" cy="50" r="45" fill="#f0f9ff" opacity="0.8"/><rect x="30" y="55" width="40" height="25" rx="3" fill="#fdbaf8" stroke="#d946ef" stroke-width="2" opacity="0.5"/><g class="animated-item-put"><rect x="46" y="50" width="8" height="22" rx="2" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1"/><polygon points="46,50 54,50 50,42" fill="#fbcfe8" stroke="#1d4ed8" stroke-width="1"/><rect x="46" y="68" width="8" height="4" fill="#ef4444"/></g><rect x="26" y="58" width="48" height="24" rx="4" fill="#f472b6" stroke="#db2777" stroke-width="2"/><line x1="32" y1="64" x2="68" y2="64" stroke="#db2777" stroke-width="1.5" stroke-dasharray="3 3"/><rect x="44" y="68" width="12" height="6" rx="1" fill="#db2777"/><g class="animated-hand-put"><path d="M 50,-5 L 50,30" stroke="#f59e0b" stroke-width="8" stroke-linecap="round"/><path d="M 50,-5 L 50,15" stroke="#10b981" stroke-width="10" stroke-linecap="round"/><path d="M 46,30 Q 42,32 45,36" fill="none" stroke="#d97706" stroke-width="3" stroke-linecap="round"/><path d="M 54,30 Q 58,32 55,36" fill="none" stroke="#d97706" stroke-width="3" stroke-linecap="round"/></g></svg>`,
        explanation: '📥 Put away สะกดว่า P - U - T - A - W - A - Y แปลว่า เก็บเข้าที่ เช่น เก็บหนังสือหรือสิ่งของเข้ากระเป๋าจ้า',
        label: 'v.t'
      },
      {
        word: 'Bird',
        meaning: 'นก',
        image: '🐦',
        explanation: '🐦 Bird สะกดว่า B - I - R - D แปลว่า นก บินไปมาบนท้องฟ้าจ้า',
        label: 'n'
      },
      {
        word: 'Ball',
        meaning: 'ลูกบอล',
        image: `<svg viewBox="0 0 100 100" class="svg-icon" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="ballShine" cx="30%" cy="30%" r="70%"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.6"/><stop offset="50%" stop-color="#ffffff" stop-opacity="0"/><stop offset="100%" stop-color="#000000" stop-opacity="0.4"/></radialGradient><linearGradient id="pentagonGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#1e293b"/><stop offset="100%" stop-color="#0f172a"/></linearGradient><linearGradient id="hexagonGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f8fafc"/><stop offset="100%" stop-color="#cbd5e1"/></linearGradient></defs><ellipse cx="50" cy="85" rx="35" ry="8" fill="#cbd5e1"/><circle cx="50" cy="50" r="40" fill="#94a3b8" stroke="#475569" stroke-width="2"/><g clip-path="url(#ballClip)"><clipPath id="ballClip"><circle cx="50" cy="50" r="39.5"/></clipPath><circle cx="50" cy="50" r="40" fill="url(#hexagonGrad)"/><polygon points="50,42 58,48 55,58 45,58 42,48" fill="url(#pentagonGrad)"/><line x1="50" y1="42" x2="50" y2="28" stroke="#475569" stroke-width="1.5"/><line x1="58" y1="48" x2="70" y2="44" stroke="#475569" stroke-width="1.5"/><line x1="55" y1="58" x2="62" y2="70" stroke="#475569" stroke-width="1.5"/><line x1="45" y1="58" x2="38" y2="70" stroke="#475569" stroke-width="1.5"/><line x1="42" y1="48" x2="30" y2="44" stroke="#475569" stroke-width="1.5"/><polygon points="50,28 42,22 45,12 55,12 58,22" fill="url(#pentagonGrad)"/><polygon points="70,44 78,42 85,50 82,60 73,58" fill="url(#pentagonGrad)"/><polygon points="62,70 65,78 57,86 48,84 52,75" fill="url(#pentagonGrad)"/><polygon points="38,70 35,78 27,82 18,74 24,66" fill="url(#pentagonGrad)"/><polygon points="30,44 22,42 15,50 18,60 27,58" fill="url(#pentagonGrad)"/><line x1="42" y1="22" x2="30" y2="28" stroke="#475569" stroke-width="1.5"/><line x1="58" y1="22" x2="70" y2="28" stroke="#475569" stroke-width="1.5"/><line x1="78" y1="42" x2="70" y2="28" stroke="#475569" stroke-width="1.5"/><line x1="82" y1="60" x2="90" y2="62" stroke="#475569" stroke-width="1.5"/><line x1="65" y1="78" x2="75" y2="74" stroke="#475569" stroke-width="1.5"/><line x1="35" y1="78" x2="25" y2="74" stroke="#475569" stroke-width="1.5"/><line x1="18" y1="74" x2="10" y2="70" stroke="#475569" stroke-width="1.5"/><line x1="22" y1="42" x2="30" y2="28" stroke="#475569" stroke-width="1.5"/><circle cx="50" cy="50" r="40" fill="url(#ballShine)"/></g></svg>`,
        explanation: '⚽ Ball สะกดว่า B - A - L - L แปลว่า ลูกบอล เอาไว้เตะหรือเล่นกีฬาแสนสนุกจ้า',
        label: 'n'
      },
      {
        word: 'Boy',
        meaning: 'เด็กผู้ชาย',
        image: '👦',
        explanation: '👦 Boy สะกดว่า B - O - Y แปลว่า เด็กผู้ชายจ้า',
        label: 'n'
      },
      {
        word: 'Peach',
        meaning: 'ลูกพีช',
        image: '🍑',
        explanation: '🍑 Peach สะกดว่า P - E - A - C - H แปลว่า ลูกพีช ผลไม้สีชมพูส้มแสนอร่อยจ้า',
        label: 'n'
      },
      {
        word: 'Open your book.',
        meaning: 'เปิดหนังสือของคุณ',
        image: `<svg viewBox="0 0 100 100" class="svg-icon" xmlns="http://www.w3.org/2000/svg"><style>@keyframes bookOpenCmd { 0%, 100% { transform: rotateY(0deg); } 50% { transform: rotateY(-40deg); } } .book-cmd-open { transform-origin: right center; animation: bookOpenCmd 3s ease-in-out infinite; perspective: 1000px; transform-style: preserve-3d; }</style><circle cx="50" cy="50" r="45" fill="#f0fdf4" opacity="0.8"/><rect x="48" y="20" width="4" height="60" rx="2" fill="#475569"/><path d="M 50,22 Q 65,20 80,25 L 80,77 Q 65,72 50,74 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/><g class="book-cmd-open"><path d="M 50,22 Q 35,20 20,25 L 20,77 Q 35,72 50,74 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/><path d="M 50,20 Q 35,18 18,23 L 18,75 Q 35,70 50,72 Z" fill="#10b981" stroke="#047857" stroke-width="1.5"/></g><path d="M 50,20 Q 65,18 82,23 L 82,75 Q 65,70 50,72 Z" fill="#10b981" stroke="#047857" stroke-width="1.5" opacity="0.85"/><path d="M 55,35 Q 65,33 75,37" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/><path d="M 55,45 Q 65,43 75,47" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/></svg>`,
        explanation: '📖 Open your book. แปลว่า เปิดหนังสือของคุณจ้า',
        type: 'command'
      },
      {
        word: 'Close your book.',
        meaning: 'ปิดหนังสือของคุณ',
        image: `<svg viewBox="0 0 100 100" class="svg-icon" xmlns="http://www.w3.org/2000/svg"><style>@keyframes bookCloseCmd { 0%, 100% { transform: rotateY(-40deg); } 50% { transform: rotateY(0deg); } } .book-cmd-close { transform-origin: right center; animation: bookCloseCmd 3s ease-in-out infinite; perspective: 1000px; transform-style: preserve-3d; }</style><circle cx="50" cy="50" r="45" fill="#fef2f2" opacity="0.8"/><rect x="48" y="20" width="4" height="60" rx="2" fill="#475569"/><path d="M 50,22 Q 65,20 80,25 L 80,77 Q 65,72 50,74 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/><g class="book-cmd-close"><path d="M 50,22 Q 35,20 20,25 L 20,77 Q 35,72 50,74 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/><path d="M 50,20 Q 35,18 18,23 L 18,75 Q 35,70 50,72 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="1.5"/></g><path d="M 50,20 Q 65,18 82,23 L 82,75 Q 65,70 50,72 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="1.5" opacity="0.85"/><path d="M 55,35 Q 65,33 75,37" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/><path d="M 55,45 Q 65,43 75,47" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/></svg>`,
        explanation: '📕 Close your book. แปลว่า ปิดหนังสือของคุณจ้า',
        type: 'command'
      },
      {
        word: 'Listen.',
        meaning: 'ฟัง',
        image: '🎧',
        explanation: '🎧 Listen. แปลว่า ฟัง หรือตั้งใจฟังเสียงต่างๆ จ้า',
        type: 'command'
      },
      {
        word: 'Look.',
        meaning: 'มองดู',
        image: '👀',
        explanation: '👀 Look. แปลว่า มองดูจ้า',
        type: 'command'
      }
    ]
  },
  {
    id: 'unit_2',
    title: 'Unit 2: Colors and shapes',
    words: [
      {
        word: 'Fine',
        meaning: 'สบายดี',
        image: '😊',
        explanation: '😊 Fine สะกดว่า F - I - N - E แปลว่า สบายดี หรือ ดีจ้า',
        label: 'adj'
      },
      {
        word: 'Great',
        meaning: 'ยอดเยี่ยม / ดีมาก',
        image: '👍',
        explanation: '👍 Great สะกดว่า G - R - E - A - T แปลว่า ยอดเยี่ยม หรือ ดีมากจ้า',
        label: 'adj'
      },
      {
        word: 'Color',
        meaning: 'สี',
        image: '🎨',
        explanation: '🎨 Color สะกดว่า C - O - L - O - R แปลว่า สี หรือ สีสันจ้า',
        label: 'n'
      },
      {
        word: 'Yellow',
        meaning: 'สีเหลือง',
        image: '💛',
        explanation: '💛 Yellow สะกดว่า Y - E - L - L - O - W แปลว่า สีเหลืองจ้า',
        label: 'n',
        isColor: true
      },
      {
        word: 'Blue',
        meaning: 'สีน้ำเงิน',
        image: '💙',
        explanation: '💙 Blue สะกดว่า B - L - U - E แปลว่า สีน้ำเงินจ้า',
        label: 'n',
        isColor: true
      },
      {
        word: 'Red',
        meaning: 'สีแดง',
        image: '❤️',
        explanation: '❤️ Red สะกดว่า R - E - D แปลว่า สีแดงจ้า',
        label: 'n',
        isColor: true
      },
      {
        word: 'Green',
        meaning: 'สีเขียว',
        image: '💚',
        explanation: '💚 Green สะกดว่า G - R - E - E - N แปลว่า สีเขียวจ้า',
        label: 'n',
        isColor: true
      },
      {
        word: 'Purple',
        meaning: 'สีม่วง',
        image: '💜',
        explanation: '💜 Purple สะกดว่า P - U - R - P - L - E แปลว่า สีม่วงจ้า',
        label: 'n',
        isColor: true
      },
      {
        word: 'Orange',
        meaning: 'สีส้ม',
        image: '🍊',
        explanation: '🍊 Orange สะกดว่า O - R - A - N - G - E แปลว่า สีส้มจ้า',
        label: 'n',
        isColor: true
      },
      {
        word: 'Brown',
        meaning: 'สีน้ำตาล',
        image: '🟫',
        explanation: '🤎 Brown สะกดว่า B - R - O - W - N แปลว่า สีน้ำตาลจ้า',
        label: 'n',
        isColor: true
      },
      {
        word: 'Pink',
        meaning: 'สีชมพู',
        image: '🌸',
        explanation: '🩷 Pink สะกดว่า P - I - N - K แปลว่า สีชมพูจ้า',
        label: 'n',
        isColor: true
      },
      {
        word: 'Black',
        meaning: 'สีดำ',
        image: '🎩',
        explanation: '🖤 Black สะกดว่า B - L - A - C - K แปลว่า สีดำจ้า',
        label: 'n',
        isColor: true
      },
      {
        word: 'White',
        meaning: 'สีขาว',
        image: '☁️',
        explanation: '🤍 White สะกดว่า W - H - I - T - E แปลว่า สีขาวจ้า',
        label: 'n',
        isColor: true
      },
      {
        word: 'Shape',
        meaning: 'รูปทรง',
        image: `<svg viewBox="0 0 100 100" class="svg-icon" xmlns="http://www.w3.org/2000/svg"><circle cx="28" cy="34" r="16" fill="#ef4444" stroke="#b91c1c" stroke-width="3"/><rect x="54" y="18" width="32" height="32" rx="4" fill="#3b82f6" stroke="#1d4ed8" stroke-width="3"/><polygon points="50,56 30,90 70,90" fill="#10b981" stroke="#047857" stroke-width="3"/></svg>`,
        explanation: '🔺 Shape สะกดว่า S - H - A - P - E แปลว่า รูปทรง เช่น วงกลม สี่เหลี่ยม และสามเหลี่ยมจ้า',
        label: 'n'
      },
      {
        word: 'Triangle',
        meaning: 'รูปสามเหลี่ยม',
        image: `<svg viewBox="0 0 100 100" class="svg-icon" xmlns="http://www.w3.org/2000/svg"><polygon points="50,15 15,80 85,80" fill="#10b981" stroke="#047857" stroke-width="4"/></svg>`,
        explanation: '🔺 Triangle สะกดว่า T - R - I - A - N - G - L - E แปลว่า สามเหลี่ยมจ้า',
        label: 'n',
        isShape: true
      },
      {
        word: 'Square',
        meaning: 'รูปสี่เหลี่ยมจัตุรัส',
        image: `<svg viewBox="0 0 100 100" class="svg-icon" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="15" width="70" height="70" rx="6" fill="#3b82f6" stroke="#1d4ed8" stroke-width="4"/></svg>`,
        explanation: '🟦 Square สะกดว่า S - Q - U - A - R - E แปลว่า สี่เหลี่ยมจัตุรัสจ้า',
        label: 'n',
        isShape: true
      },
      {
        word: 'Circle',
        meaning: 'รูปวงกลม',
        image: `<svg viewBox="0 0 100 100" class="svg-icon" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="35" fill="#ef4444" stroke="#b91c1c" stroke-width="4"/></svg>`,
        explanation: '🔴 Circle สะกดว่า C - I - R - C - L - E แปลว่า วงกลมจ้า',
        label: 'n',
        isShape: true
      },
      {
        word: 'Star',
        meaning: 'รูปดาว',
        image: `<svg viewBox="0 0 100 100" class="svg-icon" xmlns="http://www.w3.org/2000/svg"><polygon points="50,10 63,38 93,38 69,56 78,86 50,68 22,86 31,56 7,38 37,38" fill="#a855f7" stroke="#7e22ce" stroke-width="4"/></svg>`,
        explanation: '⭐ Star สะกดว่า S - T - A - R แปลว่า รูปดาวจ้า',
        label: 'n',
        isShape: true
      },
      {
        word: 'Diamond',
        meaning: 'รูปข้าวหลามตัด',
        image: `<svg viewBox="0 0 100 100" class="svg-icon" xmlns="http://www.w3.org/2000/svg"><polygon points="50,12 88,50 50,88 12,50" fill="#f59e0b" stroke="#d97706" stroke-width="4"/></svg>`,
        explanation: '🔶 Diamond สะกดว่า D - I - A - M - O - N - D แปลว่า รูปข้าวหลามตัด มีสี่มุมแหลมจ้า',
        label: 'n',
        isShape: true
      },
      {
        word: 'Heart',
        meaning: 'รูปหัวใจ',
        image: `<svg viewBox="0 0 100 100" class="svg-icon" xmlns="http://www.w3.org/2000/svg"><path d="M 50,30 C 50,30 42,10 25,10 C 10,10 10,28 10,28 C 10,45 35,68 50,85 C 65,68 90,45 90,28 C 90,28 90,10 75,10 C 58,10 50,30 50,30 Z" fill="#ec4899" stroke="#be185d" stroke-width="4"/></svg>`,
        explanation: '💖 Heart สะกดว่า H - E - A - R - T แปลว่า รูปหัวใจจ้า',
        label: 'n',
        isShape: true
      },
      {
        word: 'Oval',
        meaning: 'รูปวงรี',
        image: `<svg viewBox="0 0 100 100" class="svg-icon" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="50" rx="38" ry="26" fill="#b45309" stroke="#92400e" stroke-width="4"/></svg>`,
        explanation: '🥚 Oval สะกดว่า O - V - A - L แปลว่า รูปวงรี มีลักษณะกลมรีเหมือนไข่จ้า',
        label: 'n',
        isShape: true
      },
      {
        word: 'Rectangle',
        meaning: 'รูปสี่เหลี่ยมผืนผ้า',
        image: `<svg viewBox="0 0 100 100" class="svg-icon" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="25" width="80" height="50" rx="6" fill="#eab308" stroke="#ca8a04" stroke-width="4"/></svg>`,
        explanation: '🟨 Rectangle สะกดว่า R - E - C - T - A - N - G - L - E แปลว่า สี่เหลี่ยมผืนผ้าจ้า',
        label: 'n',
        isShape: true
      },
      {
        word: 'Pick up',
        meaning: 'หยิบขึ้น',
        image: '🤲',
        explanation: '🤲 Pick up สะกดว่า P - I - C - K - U - P แปลว่า หยิบขึ้น เช่น หยิบดินสอขึ้นมาจ้า',
        label: 'v.t'
      },
      {
        word: 'Draw',
        meaning: 'วาดรูป',
        image: '🖌️',
        explanation: '🖌️ Draw สะกดว่า D - R - A - W แปลว่า วาดรูป ใช้ดินสอหรือสีวาดภาพสวยๆ จ้า',
        label: 'v.t'
      },
      {
        word: 'Coat',
        meaning: 'เสื้อโค้ท',
        image: '🧥',
        explanation: '🧥 Coat สะกดว่า C - O - A - T แปลว่า เสื้อโค้ท เอาไว้ใส่กันหนาวจ้า',
        label: 'n',
        phonicsLetter: 'C'
      },
      {
        word: 'Girl',
        meaning: 'เด็กผู้หญิง',
        image: '👧',
        explanation: '👧 Girl สะกดว่า G - I - R - L แปลว่า เด็กผู้หญิงจ้า',
        label: 'n',
        phonicsLetter: 'G'
      },
      {
        word: 'Gate',
        meaning: 'ประตูรั้ว',
        image: `<svg viewBox="0 0 100 100" class="svg-icon" xmlns="http://www.w3.org/2000/svg"><rect x="18" y="28" width="6" height="58" rx="2" fill="#a16207"/><rect x="76" y="28" width="6" height="58" rx="2" fill="#a16207"/><rect x="24" y="38" width="52" height="6" fill="#ca8a04"/><rect x="24" y="55" width="52" height="6" fill="#ca8a04"/><rect x="24" y="72" width="52" height="6" fill="#ca8a04"/><line x1="24" y1="44" x2="76" y2="78" stroke="#ca8a04" stroke-width="5"/></svg>`,
        explanation: '🚪 Gate สะกดว่า G - A - T - E แปลว่า ประตูรั้ว เอาไว้เปิด-ปิดทางเข้าจ้า',
        label: 'n',
        phonicsLetter: 'G'
      },
      {
        word: 'Goat',
        meaning: 'แพะ',
        image: '🐐',
        explanation: '🐐 Goat สะกดว่า G - O - A - T แปลว่า แพะ ชอบกินหญ้าและร้องแบ๊ะๆ จ้า',
        label: 'n',
        phonicsLetter: 'G'
      }
    ]
  }
];
