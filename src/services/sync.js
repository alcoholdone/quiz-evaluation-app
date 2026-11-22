// =============================================================================
//  Cloud Sync  —  Google Sign-in + Firestore
// =============================================================================
//  ทำงานเป็นเลเยอร์แยก ไม่แตะตรรกะเกมเดิม:
//   - ดักทุกการเขียน localStorage ที่ key ขึ้นต้น "aura_kids_"  →  push ขึ้น Firestore
//   - ฟังการเปลี่ยนแปลงจากอีกเครื่อง (onSnapshot)  →  เด้ง toast ให้กดอัปเดต
//   - ข้อมูลทั้งหมดเก็บเป็นก้อนเดียวใน doc: users/{uid}
//
//  source of truth ของ "การเล่นเกม" ยังคงเป็น localStorage เหมือนเดิม
//  Firestore เป็นแค่ "ท่อ sync" เท่านั้น  →  เล่น offline ได้ปกติ
// =============================================================================

const FIREBASE_VERSION = "10.12.0";
const APP_PREFIX = "aura_kids_";
// meta keys อยู่ในเครื่องเท่านั้น ไม่ sync
const META_KEYS = new Set(["aura_kids_client_id", "aura_kids_last_sync_ms"]);
const PUSH_DEBOUNCE_MS = 1500;

// แท็บที่ต้องล็อกอินก่อนถึงใช้ได้ (โหมดฝึกสะกดคำ = tab-learn เปิดให้เล่นได้เลย)
export const LOCKED_TABS = ["tab-game", "tab-dictation", "tab-special", "tab-dashboard"];

function getFirebaseConfig() {
  const cfg = (typeof window !== "undefined" && window.FIREBASE_CONFIG) || {};
  const configured = Boolean(cfg.apiKey && !String(cfg.apiKey).startsWith("PASTE_"));
  return { cfg, configured };
}

// ---- per-browser id (เพื่อไม่ apply echo การเขียนของตัวเอง) -----------------
function clientId() {
  if (typeof localStorage === "undefined") return "c_test";
  let id = localStorage.getItem("aura_kids_client_id");
  if (!id) {
    id = "c_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("aura_kids_client_id", id);
  }
  return id;
}

// ---- state ------------------------------------------------------------------
let fbApp = null;
let fbAuth = null;
let fbFirestore = null;
let db = null, auth = null, userDocRef = null, unsub = null;
let currentUser = null;
let skipHook = false;          // true ระหว่าง apply remote (กัน loop)
let pushTimer = null;
let initialPullDone = false;
let cloudBlobStr = null;       // เนื้อหา blob ล่าสุดที่รู้ว่าอยู่บน cloud (stable JSON) — ใช้กัน push ซ้ำ
let clientToken = null;

// =============================================================================
//  localStorage blob helpers
// =============================================================================
function gatherBlob() {
  const blob = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(APP_PREFIX) && !META_KEYS.has(k)) {
      blob[k] = localStorage.getItem(k);
    }
  }
  return blob;
}

// JSON ที่ key เรียงคงที่ → ใช้เทียบ "เนื้อหาเหมือนกันไหม" ข้ามเครื่องได้ (กันลำดับ key ต่างกัน)
function stableStringify(obj) {
  const out = {};
  for (const k of Object.keys(obj).sort((a, b) => a.localeCompare(b))) out[k] = obj[k];
  return JSON.stringify(out);
}

export function applyBlob(blob) {
  if (!blob || typeof blob !== "object" || Array.isArray(blob)) return;

  // Allowlist: ยอมรับเฉพาะ key ที่ขึ้นต้น "aura_kids_", ไม่อยู่ใน META_KEYS, และค่าเป็น string
  const safeEntries = Object.entries(blob).filter(
    ([k, v]) => typeof k === "string" && k.startsWith(APP_PREFIX) && !META_KEYS.has(k) && typeof v === "string"
  );

  skipHook = true;
  try {
    // ลบ key เดิมที่ไม่มีใน remote (เคารพการลบจากอีกเครื่อง)
    const keep = new Set(safeEntries.map(([k]) => k));
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(APP_PREFIX) && !META_KEYS.has(k) && !keep.has(k)) toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
    // เขียนค่าที่ผ่านการตรวจสอบแล้วจาก remote
    for (const [k, v] of safeEntries) localStorage.setItem(k, v);
  } finally {
    skipHook = false;
  }
}

// =============================================================================
//  push  (debounced)
// =============================================================================
function schedulePush() {
  if (!currentUser || !userDocRef) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(pushNow, PUSH_DEBOUNCE_MS);
}

async function pushNow() {
  if (!currentUser || !userDocRef || !fbFirestore) return;
  const nowMs = Date.now();
  try {
    const localStr = stableStringify(gatherBlob());
    if (localStr === cloudBlobStr) { setStatus("synced"); return; } // เนื้อหาตรงกับ cloud แล้ว → ไม่ต้องเขียนซ้ำ
    await fbFirestore.setDoc(userDocRef, {
      blob: JSON.parse(localStr),
      updatedAtMs: nowMs,
      updatedBy: clientToken || clientId(),
      updatedAt: fbFirestore.serverTimestamp(),
    });
    cloudBlobStr = localStr;
    localStorage.setItem("aura_kids_last_sync_ms", String(nowMs));
    setStatus("synced");
  } catch (e) {
    console.warn("[sync] push failed", e);
    setStatus("error");
  }
}

// =============================================================================
//  localStorage write hook
// =============================================================================
function installHook() {
  const _set = localStorage.setItem.bind(localStorage);
  const _remove = localStorage.removeItem.bind(localStorage);
  const _clear = localStorage.clear.bind(localStorage);

  localStorage.setItem = function (k, v) {
    _set(k, v);
    if (!skipHook && typeof k === "string" && k.startsWith(APP_PREFIX) && !META_KEYS.has(k)) schedulePush();
  };
  localStorage.removeItem = function (k) {
    _remove(k);
    if (!skipHook && typeof k === "string" && k.startsWith(APP_PREFIX) && !META_KEYS.has(k)) schedulePush();
  };
  localStorage.clear = function () {
    _clear();
    if (!skipHook) schedulePush();
  };
}

// =============================================================================
//  realtime subscription
// =============================================================================
function subscribe() {
  if (!userDocRef || !fbFirestore) return;
  unsub = fbFirestore.onSnapshot(userDocRef, (snap) => {
    if (!snap.exists()) {
      // ยังไม่เคยมีข้อมูลบน cloud → push ของเครื่องนี้ขึ้นไปเป็นชุดแรก
      cloudBlobStr = null;
      pushNow();
      initialPullDone = true;
      return;
    }

    const data = snap.data();
    const remoteStr = stableStringify(data.blob || {});
    cloudBlobStr = remoteStr;                       // server บอกว่าตอนนี้ cloud มีอะไร
    const localStr = stableStringify(gatherBlob());

    // ✅ กุญแจกัน loop: ถ้าเนื้อหาตรงกันอยู่แล้ว = sync สมบูรณ์ ไม่ต้องทำอะไร
    // (ไม่ push, ไม่เด้ง toast) แม้ timestamp/updatedBy จะต่างกันก็ตาม
    if (remoteStr === localStr) {
      initialPullDone = true;
      setStatus("synced");
      return;
    }

    // เนื้อหาต่างกันจริง → ตัดสินจากเวลาว่าใครใหม่กว่า
    const localLast = Number(localStorage.getItem("aura_kids_last_sync_ms") || 0);
    const remoteNewer = (data.updatedAtMs || 0) > localLast;

    if (!initialPullDone) {
      // ครั้งแรกหลัง login
      initialPullDone = true;
      if (remoteNewer) {
        applyBlob(data.blob);
        localStorage.setItem("aura_kids_last_sync_ms", String(data.updatedAtMs || Date.now()));
        setStatus("synced");
        location.reload();
      } else {
        schedulePush(); // เครื่องนี้ใหม่กว่า → ดันขึ้น (pushNow จะเขียนเพราะเนื้อหาต่างจริง)
      }
      return;
    }

    // เปลี่ยนแปลงระหว่างใช้งานจากอีกเครื่อง → ถามก่อน ไม่ reload ทับงานที่กำลังเล่น
    if (remoteNewer) {
      showUpdateToast(() => {
        applyBlob(data.blob);
        localStorage.setItem("aura_kids_last_sync_ms", String(data.updatedAtMs || Date.now()));
        location.reload();
      });
    }
  }, (err) => {
    console.warn("[sync] snapshot error", err);
    setStatus("error");
  });
}

// =============================================================================
//  Auth
// =============================================================================
// แปลง error code ของ Firebase เป็นข้อความไทยที่ช่วยแก้ปัญหาได้
function explainAuthError(e) {
  const code = e?.code || "";
  const map = {
    "auth/unauthorized-domain":
      "โดเมนนี้ยังไม่ได้รับอนุญาต\n\nไปที่ Firebase Console → Authentication → Settings → Authorized domains แล้วเพิ่มโดเมนของเว็บนี้:\n" + location.hostname,
    "auth/operation-not-allowed":
      "ยังไม่ได้เปิด Google sign-in\n\nไปที่ Firebase Console → Authentication → Sign-in method → เปิด Google",
    "auth/popup-blocked": "เบราว์เซอร์บล็อก popup — กำลังลองวิธี redirect แทน...",
    "auth/popup-closed-by-user": "คุณปิดหน้าต่างล็อกอินก่อนเสร็จ ลองกดใหม่อีกครั้ง",
    "auth/cancelled-popup-request": "",
    "auth/network-request-failed": "เชื่อมต่อเน็ตไม่ได้ ลองเช็กสัญญาณแล้วกดใหม่",
  };
  if (code in map) return map[code];
  return `เข้าสู่ระบบไม่สำเร็จ\n\n${code || e?.message || e}`;
}

function reportAuthError(e) {
  console.warn("[sync] auth error", e);
  setStatus("error");
  const msg = explainAuthError(e);
  if (msg) alert(msg);
}

async function doSignIn() {
  if (!auth || !fbAuth) {
    alert("ไม่สามารถเชื่อมต่อระบบเข้าสู่ระบบได้ในขณะนี้ (โหมดออฟไลน์)");
    return;
  }
  const provider = new fbAuth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  // popup-first ทุกแพลตฟอร์ม: เสถียรกว่า redirect บน iOS/Safari (ITP บล็อก storage ข้ามโดเมน
  // ทำให้ redirect กลับมาแล้ว auth หาย → เด้งให้ล็อกอินวนไป)
  try {
    await fbAuth.signInWithPopup(auth, provider);
  } catch (e) {
    const code = e?.code || "";
    const popupIssue = ["auth/popup-blocked", "auth/operation-not-supported-in-this-environment",
      "auth/cancelled-popup-request"].includes(code);
    if (popupIssue) {
      try { await fbAuth.signInWithRedirect(auth, provider); return; } catch (e2) { reportAuthError(e2); return; }
    }
    reportAuthError(e); // unauthorized-domain / operation-not-allowed ฯลฯ → แจ้งสาเหตุชัดๆ
  }
}

// ลบข้อมูลแอปในเครื่อง (เก็บ client_id ไว้) — ใช้ตอน logout เพื่อไม่ให้ข้อมูล
// ของคนก่อนค้างไปปนกับ user คนใหม่ และเพื่อซ่อนดาวเมื่อไม่ได้ล็อกอิน
function clearLocalAppData() {
  skipHook = true; // ⚠️ สำคัญ: กันไม่ให้การลบนี้ไป trigger push ค่าว่างทับ cloud
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(APP_PREFIX) && k !== "aura_kids_client_id") keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } finally {
    skipHook = false;
  }
  cloudBlobStr = null;
}

async function doSignOut() {
  // หยุดฟัง + ยกเลิก push ที่ค้าง ก่อนลบข้อมูล เพื่อไม่ให้ค่าว่างถูกส่งขึ้น cloud
  if (unsub) { unsub(); unsub = null; }
  if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
  clearLocalAppData();
  try {
    if (auth && fbAuth) {
      await fbAuth.signOut(auth);
    }
  } finally {
    location.reload(); // โหลดใหม่ให้ UI กลับเป็นสถานะเปล่า (ดาวหาย, แท็บล็อก)
  }
}

// =============================================================================
//  init
// =============================================================================
async function init() {
  clientToken = clientId();
  installHook();
  buildUI();
  installTabGate();
  updateTabLocks(); // ล็อกไว้ก่อนจนกว่า auth จะยืนยันว่าล็อกอินอยู่

  const { cfg, configured } = getFirebaseConfig();
  if (!configured) {
    setStatus("offline");
    setBar("☁️ โหมดออฟไลน์ (ยังไม่ได้ตั้งค่า cloud)", false);
    return;
  }

  try {
    const [appMod, authMod, fsMod] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`),
    ]);
    fbApp = appMod;
    fbAuth = authMod;
    fbFirestore = fsMod;
  } catch (err) {
    console.warn("[sync] offline / firebase load failed", err);
    setStatus("offline");
    setBar("☁️ โหมดออฟไลน์ (ไม่สามารถเชื่อม cloud ได้)", false);
    return;
  }

  const app = fbApp.initializeApp(cfg);
  auth = fbAuth.getAuth(app);
  // เปิด offline cache ของ Firestore เพื่อให้ push ที่ค้างไว้ส่งเองเมื่อกลับมาออนไลน์
  try {
    db = fbFirestore.initializeFirestore(app, { localCache: fbFirestore.persistentLocalCache() });
  } catch {
    db = fbFirestore.initializeFirestore(app, {});
  }

  fbAuth.getRedirectResult(auth).catch((e) => reportAuthError(e));

  fbAuth.onAuthStateChanged(auth, (user) => {
    if (unsub) { unsub(); unsub = null; }
    currentUser = user;
    initialPullDone = false;
    if (user) {
      userDocRef = fbFirestore.doc(db, "users", user.uid);
      const name = user.displayName || user.email || "ผู้ใช้";
      setBar(`☁️ ซิงค์อยู่ · ${name}`, true);
      setStatus("synced");
      subscribe();
    } else {
      userDocRef = null;
      setBar("☁️ เข้าสู่ระบบเพื่อซิงค์ดาวข้ามเครื่อง", false);
      setStatus("idle");
    }
    updateTabLocks();
  });
}

// =============================================================================
//  Feature gate — ยังไม่ล็อกอิน = ใช้ได้แค่ "โหมดฝึกสะกดคำ"
//  ทำงานนอก app: ดักคลิกแท็บที่ล็อกในช่วง capture เพื่อบล็อกก่อน handler เดิม
// =============================================================================
function tabLocked() {
  const { configured } = getFirebaseConfig();
  return configured && !currentUser; // offline build (ไม่ตั้งค่า cloud) = ไม่ล็อกอะไร
}

function gateClickHandler(e) {
  if (!tabLocked()) return; // ล็อกอินแล้ว/offline → ปล่อยผ่านไป switchTab เดิม
  e.stopImmediatePropagation();
  e.preventDefault();
  showSignInPrompt();
}

function installTabGate() {
  LOCKED_TABS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", gateClickHandler, true); // capture = รันก่อน listener ของ app
  });
}

function updateTabLocks() {
  const locked = tabLocked();
  LOCKED_TABS.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle("cs-locked", locked);
    el.setAttribute("aria-disabled", locked ? "true" : "false");
  });
  // ซ่อนป้ายดาวสะสมเมื่อยังไม่ล็อกอิน
  const badge = document.getElementById("total-stars-badge");
  if (badge) badge.style.display = locked ? "none" : "flex";
  // ถ้าเพิ่ง logout ขณะอยู่บนแท็บที่ล็อก → เด้งกลับมาโหมดฝึกสะกดคำ
  if (locked) {
    const active = document.querySelector(".tab-btn.active");
    if (active && LOCKED_TABS.includes(active.id)) {
      if (typeof window !== "undefined" && typeof window.dispatchEvent === "function" && typeof CustomEvent === "function") {
        window.dispatchEvent(new CustomEvent("aura:switch-tab", { detail: { tab: "learn" } }));
      } else if (typeof window.switchTab === "function") {
        window.switchTab("learn");
      }
    }
  }
}

function showSignInPrompt() {
  let t = document.getElementById("cs-toast");
  if (t) t.remove();
  t = document.createElement("div");
  t.id = "cs-toast";
  t.innerHTML = `🔒 เข้าสู่ระบบเพื่อใช้โหมดนี้ <button type="button">เข้าสู่ระบบ</button>`;
  document.body.appendChild(t);
  t.querySelector("button").addEventListener("click", () => { t.remove(); doSignIn(); });
  setTimeout(() => { if (t?.parentNode) t.remove(); }, 8000);
}

// =============================================================================
//  UI  (สร้างด้วย JS ทั้งหมด เพื่อไม่ต้องแก้ layout เดิม)
// =============================================================================
let barEl, btnEl, statusDot;

function buildUI() {
  const wrap = document.createElement("div");
  wrap.id = "cloud-sync-bar";
  wrap.innerHTML = `
    <span id="cs-dot" class="cs-dot" data-status="idle"></span>
    <span id="cs-label">☁️</span>
    <button id="cs-btn" type="button">เข้าสู่ระบบ</button>`;
  const mountTarget = document.getElementById("cloud-sync-slot") || document.body;
  mountTarget.appendChild(wrap);

  barEl = wrap.querySelector("#cs-label");
  btnEl = wrap.querySelector("#cs-btn");
  statusDot = wrap.querySelector("#cs-dot");

  btnEl.addEventListener("click", () => {
    const { configured } = getFirebaseConfig();
    if (!configured) {
      alert("ยังไม่ได้ตั้งค่า Firebase\n\nเปิดไฟล์ firebase-config.js แล้วใส่ค่าจาก Firebase Console ก่อน (ดูขั้นตอนใน README)");
      return;
    }
    if (currentUser) {
      if (confirm("ออกจากระบบ?\n\nข้อมูลถูกสำรองไว้บน cloud แล้ว และจะถูกล้างออกจากเครื่องนี้ — ล็อกอินใหม่เมื่อไหร่ข้อมูลจะกลับมาครบ")) doSignOut();
    } else {
      doSignIn();
    }
  });
}

function setBar(text, signedIn) {
  if (!barEl) return;
  barEl.textContent = text;
  btnEl.textContent = signedIn ? "ออกจากระบบ" : "เข้าสู่ระบบ";
}

function setStatus(s) {
  if (!statusDot) return;
  if (statusDot.dataset) {
    statusDot.dataset.status = s || "idle";
  }
}

function showUpdateToast(onApply) {
  let t = document.getElementById("cs-toast");
  if (t) t.remove();
  t = document.createElement("div");
  t.id = "cs-toast";
  t.innerHTML = `🔄 มีข้อมูลใหม่จากอีกเครื่อง <button type="button">อัปเดตเลย</button>`;
  document.body.appendChild(t);
  t.querySelector("button").addEventListener("click", onApply);
  // ไม่หายเอง: ค้างไว้จนกว่าจะกด "อัปเดตเลย" เพื่อไม่ให้พลาดข้อมูลใหม่จากอีกเครื่อง
}

// ---- go ----------------------------------------------------------------------
if (typeof document !== "undefined" && typeof window !== "undefined" && !window.__QUIZ_TEST_ENV__) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}
