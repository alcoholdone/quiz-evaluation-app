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

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, doc, getDoc, setDoc, onSnapshot, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const APP_PREFIX = "aura_kids_";
// meta keys อยู่ในเครื่องเท่านั้น ไม่ sync
const META_KEYS = new Set(["aura_kids_client_id", "aura_kids_last_sync_ms"]);
const PUSH_DEBOUNCE_MS = 1500;

const cfg = window.FIREBASE_CONFIG || {};
const configured = cfg.apiKey && !String(cfg.apiKey).startsWith("PASTE_");

// ---- per-browser id (เพื่อไม่ apply echo การเขียนของตัวเอง) -----------------
function clientId() {
  let id = localStorage.getItem("aura_kids_client_id");
  if (!id) {
    id = "c_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("aura_kids_client_id", id);
  }
  return id;
}
const CLIENT = clientId();

// ---- state ------------------------------------------------------------------
let db = null, auth = null, userDocRef = null, unsub = null;
let currentUser = null;
let skipHook = false;          // true ระหว่าง apply remote (กัน loop)
let pushTimer = null;
let initialPullDone = false;

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

function applyBlob(blob) {
  if (!blob) return;
  skipHook = true;
  try {
    // ลบ key เดิมที่ไม่มีใน remote (เคารพการลบจากอีกเครื่อง)
    const keep = new Set(Object.keys(blob));
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(APP_PREFIX) && !META_KEYS.has(k) && !keep.has(k)) toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
    // เขียนค่าจาก remote
    for (const [k, v] of Object.entries(blob)) localStorage.setItem(k, v);
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
  if (!currentUser || !userDocRef) return;
  const nowMs = Date.now();
  try {
    await setDoc(userDocRef, {
      blob: gatherBlob(),
      updatedAtMs: nowMs,
      updatedBy: CLIENT,
      updatedAt: serverTimestamp(),
    });
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
  if (!userDocRef) return;
  unsub = onSnapshot(userDocRef, (snap) => {
    if (!snap.exists()) {
      // ยังไม่เคยมีข้อมูลบน cloud → push ของเครื่องนี้ขึ้นไปเป็นชุดแรก
      pushNow();
      initialPullDone = true;
      return;
    }
    const data = snap.data();
    if (data.updatedBy === CLIENT) { initialPullDone = true; return; } // echo การเขียนของเราเอง

    const localLast = Number(localStorage.getItem("aura_kids_last_sync_ms") || 0);
    const isNewer = (data.updatedAtMs || 0) > localLast;

    if (!initialPullDone) {
      // ครั้งแรกหลัง login: ถ้า cloud ใหม่กว่า → ดึงลงมาแล้ว reload เพื่อ render ใหม่ทั้งหมด
      initialPullDone = true;
      if (isNewer) {
        applyBlob(data.blob);
        localStorage.setItem("aura_kids_last_sync_ms", String(data.updatedAtMs || Date.now()));
        setStatus("synced");
        location.reload();
      } else {
        // เครื่องนี้ใหม่กว่า/เท่ากัน → ดันของเราขึ้นไป
        schedulePush();
      }
      return;
    }

    // เปลี่ยนแปลงระหว่างใช้งานจากอีกเครื่อง → ถามก่อน ไม่ reload ทับงานที่กำลังเล่น
    if (isNewer) {
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
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ||
    window.matchMedia("(display-mode: standalone)").matches;
}

async function doSignIn() {
  const provider = new GoogleAuthProvider();
  try {
    if (isIOS()) await signInWithRedirect(auth, provider); // popup ไม่ค่อยเสถียรบน iOS/standalone
    else await signInWithPopup(auth, provider);
  } catch (e) {
    console.warn("[sync] popup sign-in failed, fallback to redirect", e);
    try { await signInWithRedirect(auth, provider); } catch (e2) { console.error(e2); setStatus("error"); }
  }
}

async function doSignOut() {
  if (unsub) { unsub(); unsub = null; }
  await signOut(auth);
}

// =============================================================================
//  init
// =============================================================================
function init() {
  installHook();
  buildUI();

  if (!configured) {
    setStatus("offline");
    setBar("☁️ โหมดออฟไลน์ (ยังไม่ได้ตั้งค่า cloud)", false);
    return;
  }

  const app = initializeApp(cfg);
  auth = getAuth(app);
  // เปิด offline cache ของ Firestore เพื่อให้ push ที่ค้างไว้ส่งเองเมื่อกลับมาออนไลน์
  try {
    db = initializeFirestore(app, { localCache: persistentLocalCache() });
  } catch {
    db = initializeFirestore(app, {});
  }

  getRedirectResult(auth).catch((e) => console.warn("[sync] redirect result", e));

  onAuthStateChanged(auth, (user) => {
    if (unsub) { unsub(); unsub = null; }
    currentUser = user;
    initialPullDone = false;
    if (user) {
      userDocRef = doc(db, "users", user.uid);
      const name = user.displayName || user.email || "ผู้ใช้";
      setBar(`☁️ ซิงค์อยู่ · ${name}`, true);
      setStatus("synced");
      subscribe();
    } else {
      userDocRef = null;
      setBar("☁️ เข้าสู่ระบบเพื่อซิงค์ดาวข้ามเครื่อง", false);
      setStatus("idle");
    }
  });
}

// =============================================================================
//  UI  (สร้างด้วย JS ทั้งหมด เพื่อไม่ต้องแก้ layout เดิม)
// =============================================================================
let barEl, btnEl, statusDot;

function buildUI() {
  const wrap = document.createElement("div");
  wrap.id = "cloud-sync-bar";
  wrap.innerHTML = `
    <span id="cs-dot" class="cs-dot"></span>
    <span id="cs-label">☁️</span>
    <button id="cs-btn" type="button">เข้าสู่ระบบ</button>`;
  document.body.appendChild(wrap);

  barEl = wrap.querySelector("#cs-label");
  btnEl = wrap.querySelector("#cs-btn");
  statusDot = wrap.querySelector("#cs-dot");

  btnEl.addEventListener("click", () => {
    if (!configured) {
      alert("ยังไม่ได้ตั้งค่า Firebase\n\nเปิดไฟล์ firebase-config.js แล้วใส่ค่าจาก Firebase Console ก่อน (ดูขั้นตอนใน README)");
      return;
    }
    if (currentUser) {
      if (confirm("ออกจากระบบ? ข้อมูลในเครื่องนี้ยังอยู่ครบ")) doSignOut();
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
  const colors = { synced: "#22c55e", idle: "#94a3b8", offline: "#94a3b8", error: "#ef4444" };
  statusDot.style.background = colors[s] || "#94a3b8";
}

function showUpdateToast(onApply) {
  let t = document.getElementById("cs-toast");
  if (t) t.remove();
  t = document.createElement("div");
  t.id = "cs-toast";
  t.innerHTML = `🔄 มีข้อมูลใหม่จากอีกเครื่อง <button type="button">อัปเดตเลย</button>`;
  document.body.appendChild(t);
  t.querySelector("button").addEventListener("click", onApply);
  setTimeout(() => { if (t) t.remove(); }, 15000);
}

// ---- go ----------------------------------------------------------------------
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
