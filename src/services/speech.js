import { registerTimeout, clearScopedTimers } from '../state/store.js';
import { isSeparatorChar } from '../utils/word-helpers.js';

// TEXT TO SPEECH (TTS) ENGINE
let currentSpeechToken = null;
let lastCancelTime = 0;
let activeUtterances = [];
// Last utterance queued by playFeedbackSounds — used to advance to the next
// question only AFTER the feedback finishes speaking (not on a fixed timer).
let lastFeedbackUtterance = null;
let speechKeepAliveTimer = null;
let speechInitialized = false;

export function getLastFeedbackUtterance() {
  return lastFeedbackUtterance;
}

export function initSpeechEngine() {
  if (speechInitialized) return;
  speechInitialized = true;

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  // Preload voices early so they are ready on first click (Chrome loads async)
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    window.speechSynthesis.getVoices();
  });

  // Chrome bug recovery: when the tab is hidden Chrome pauses the speech engine
  // and frequently leaves it "stuck paused" so the next speak() is silent.
  // Cancelling on hide gives us a clean slate (the app re-speaks on interaction).
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
  });

  // Autoplay unlock: Chrome only allows speech once the page has had a user
  // gesture. Auto-read prompts (fired from setTimeout) get blocked until then.
  // On the very first interaction we speak a silent utterance to "unlock" the
  // engine, so every later auto-read works without a fresh click.
  let speechPrimed = false;
  const primeSpeech = () => {
    if (speechPrimed) return;
    speechPrimed = true;
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    window.speechSynthesis.resume();
    window.speechSynthesis.speak(u);
  };
  ['pointerdown', 'touchstart', 'keydown'].forEach(evt => {
    window.addEventListener(evt, primeSpeech, { once: true, capture: true });
  });
}

// Keepalive: while speech is active, periodically resume() to recover the engine
// from Chrome's "stuck paused" state and to refresh its internal ~15s timeout.
// Runs only while there is active/queued speech, then stops itself.
export function startSpeechKeepAlive() {
  if (speechKeepAliveTimer || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  speechKeepAliveTimer = setInterval(() => {
    const synth = window.speechSynthesis;
    if (synth.speaking || synth.pending) {
      synth.resume(); // no-op if already running; clears a stuck pause otherwise
    } else {
      clearInterval(speechKeepAliveTimer);
      speechKeepAliveTimer = null;
    }
  }, 5000);
}

export function resetCardSpeechHighlight(cardElement) {
  if (!cardElement) return;
  cardElement.querySelectorAll('.spell-char').forEach(c => {
    c.className = 'spell-char manual-letter-btn';
  });
  const wordNode = cardElement.querySelector('.word');
  if (wordNode) wordNode.classList.remove('highlight-word');
  const meaningNode = cardElement.querySelector('.meaning');
  if (meaningNode) meaningNode.classList.remove('highlight-meaning');
}

export function stopAllSpeech() {
  currentSpeechToken = null;
  clearScopedTimers('speech');
  activeUtterances = []; // Clear references to prevent GC leaks or stuck speech
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    // Only cancel when there is active speech — unconditional cancel breaks Chrome's engine
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
      lastCancelTime = Date.now();
    }
  }
  if (typeof document !== 'undefined') {
    document.querySelectorAll('.vocab-card').forEach(c => {
      c.classList.remove('speaking');
      resetCardSpeechHighlight(c);
    });
  }
}

export function getVoice(langPrefix) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find(v => v.lang.startsWith(langPrefix) && v.localService)
    || voices.find(v => v.lang.startsWith(langPrefix))
    || null;
}

export function makeUtterance(text, lang, rate = 1) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  const voice = getVoice(lang.slice(0, 2));
  if (voice) u.voice = voice;

  // Prevent Garbage Collection in Chrome by keeping a reference
  activeUtterances.push(u);

  u.addEventListener('end', () => {
    activeUtterances = activeUtterances.filter(item => item !== u);
  });
  u.addEventListener('error', () => {
    activeUtterances = activeUtterances.filter(item => item !== u);
  });

  return u;
}

// Voice test / reset — recovers the app's speech state and tells the user when
// the problem is Chrome-level (stuck engine / empty voice list) vs. just paused.
export function testAndResetVoice() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    alert('เบราว์เซอร์นี้ไม่รองรับระบบเสียงพูด กรุณาใช้ Google Chrome เวอร์ชันล่าสุดนะคะ');
    return;
  }

  const synth = window.speechSynthesis;

  // 1) Clear any stuck/queued state and wake the engine
  stopAllSpeech();
  synth.cancel();
  synth.resume();

  // 2) Re-request the voice list (Chrome loads it lazily and sometimes drops it)
  const voices = synth.getVoices();

  // 3) Empty voice list == Chrome's speech engine is dead. JS can't revive it.
  if (!voices || voices.length === 0) {
    alert('🔇 ระบบเสียงของ Chrome ค้างอยู่ (ไม่พบเสียงพูดในระบบ)\n\nวิธีแก้ที่เร็วที่สุด:\nกด Cmd + Q เพื่อปิด Chrome ให้สนิท แล้วเปิดขึ้นมาใหม่\n(ไม่ต้องรีสตาร์ทเครื่องนะคะ)');
    return;
  }

  // 4) Voices exist → play a short test in both languages
  const btn = document.getElementById('btn-voice-test');
  if (btn) {
    btn.style.transform = 'scale(1.15)';
    setTimeout(() => { btn.style.transform = ''; }, 250);
  }
  playFeedbackSounds([
    makeUtterance('Hello!', 'en-US', 0.9),
    makeUtterance('ระบบเสียงพร้อมใช้งานแล้วจ้า', 'th-TH', 1)
  ]);
}

export function speakEN(text, rate = 0.8) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  // Always resume before speaking to fix Chrome's engine getting stuck
  window.speechSynthesis.resume();
  const u = makeUtterance(text, 'en-US', rate);
  window.speechSynthesis.speak(u);
  startSpeechKeepAlive();
  return u; // let callers wait for this letter/word to finish before advancing
}

export function speakTH(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  // Always resume before speaking to fix Chrome's engine getting stuck
  window.speechSynthesis.resume();
  window.speechSynthesis.speak(makeUtterance(text, 'th-TH', 1));
  startSpeechKeepAlive();
}

// Play feedback sounds after stopAllSpeech — handles Chrome's post-cancel delay
export function playFeedbackSounds(utterances) {
  lastFeedbackUtterance = utterances.length ? utterances[utterances.length - 1] : null;
  if (!utterances.length || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const doSpeak = () => {
    window.speechSynthesis.resume();
    utterances.forEach(u => window.speechSynthesis.speak(u));
    startSpeechKeepAlive();
  };
  const sinceCancel = Date.now() - lastCancelTime;
  if (sinceCancel < 200) {
    setTimeout(doSpeak, 80);
  } else {
    doSpeak();
  }
}

// SPELL AND SPEAK VOCABULARY (LEARN MODE)
//
// Chrome: calling speak() immediately after cancel() causes silence — needs ~80ms delay.
//   On first click there is no cancel, so delay = 0 and it speaks right away.
//   On subsequent clicks (previous speech was canceled), delay = 80ms.
//   By then Safari has already "unlocked" speech on the first call, so setTimeout works there too.
//
// Safari: onend of the last utterance sometimes does not fire.
//   A fallback timer based on estimated word length cleans up the card state.
export function spellAndSpeak(item, cardElement = null, rate = 0.8) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    alert('อุปกรณ์ของคุณไม่รองรับระบบสังเคราะห์เสียงพูดภาษาอังกฤษครับ');
    return;
  }

  const token = Symbol('speech');
  stopAllSpeech();
  currentSpeechToken = token;

  if (cardElement) {
    cardElement.classList.add('speaking');
    resetCardSpeechHighlight(cardElement);
  }

  // Safari fix: fallback cleanup if onend never fires (last utterance bug)
  const letterCount = item.word.split('').filter(c => !isSeparatorChar(c)).length;
  const estimatedMs = Math.round((letterCount * 700 + 2200) / (rate || 0.8));
  let cleanupTimer = registerTimeout('speech', () => {
    if (currentSpeechToken === token && cardElement) {
      resetCardSpeechHighlight(cardElement);
      cardElement.classList.remove('speaking');
    }
  }, estimatedMs);

  function queueAll() {
    if (currentSpeechToken !== token) {
      clearTimeout(cleanupTimer);
      return;
    }
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    startSpeechKeepAlive();

    if (item.type === 'command') {
      // Speak the command full sentence slowly/normally
      const wordU = makeUtterance(item.word, 'en-US', rate);
      wordU.onstart = () => {
        if (currentSpeechToken !== token) { window.speechSynthesis.cancel(); return; }
        if (cardElement) {
          const wordNode = cardElement.querySelector('.word');
          if (wordNode) wordNode.classList.add('highlight-word');
        }
      };
      wordU.onend = () => {
        if (cardElement) {
          const wordNode = cardElement.querySelector('.word');
          if (wordNode) wordNode.classList.remove('highlight-word');
          const meaningNode = cardElement.querySelector('.meaning');
          if (meaningNode) meaningNode.classList.add('highlight-meaning');
        }
      };
      window.speechSynthesis.speak(wordU);

      // Queue Thai meaning
      const thU = makeUtterance(item.meaning, 'th-TH', 1);
      thU.onend = () => {
        clearTimeout(cleanupTimer);
        if (currentSpeechToken === token && cardElement) {
          resetCardSpeechHighlight(cardElement);
          cardElement.classList.remove('speaking');
        }
      };
      window.speechSynthesis.speak(thU);
    } else {
      // Queue each letter
      item.word.split('').forEach((letter, i) => {
        if (isSeparatorChar(letter)) return;
        const charNode = cardElement ? cardElement.querySelector(`.spell-char[data-index="${i}"]`) : null;
        const u = makeUtterance(letter.toLowerCase(), 'en-US', rate * 0.7);
        u.onstart = () => {
          if (currentSpeechToken !== token) { window.speechSynthesis.cancel(); return; }
          if (charNode) charNode.classList.add('active-letter');
        };
        u.onend = () => {
          if (charNode) {
            charNode.classList.remove('active-letter');
            charNode.classList.add('done-letter');
          }
        };
        window.speechSynthesis.speak(u);
      });

      // Queue full word
      const wordU = makeUtterance(item.word, 'en-US', rate);
      wordU.onstart = () => {
        if (currentSpeechToken !== token) { window.speechSynthesis.cancel(); return; }
        if (cardElement) {
          const wordNode = cardElement.querySelector('.word');
          if (wordNode) wordNode.classList.add('highlight-word');
        }
      };
      wordU.onend = () => {
        if (cardElement) {
          const wordNode = cardElement.querySelector('.word');
          if (wordNode) wordNode.classList.remove('highlight-word');
          const meaningNode = cardElement.querySelector('.meaning');
          if (meaningNode) meaningNode.classList.add('highlight-meaning');
        }
      };
      window.speechSynthesis.speak(wordU);

      // Queue Thai meaning — onend here is the primary cleanup path
      const thU = makeUtterance(item.meaning, 'th-TH', 1);
      thU.onend = () => {
        clearTimeout(cleanupTimer);
        if (currentSpeechToken === token && cardElement) {
          resetCardSpeechHighlight(cardElement);
          cardElement.classList.remove('speaking');
        }
      };
      window.speechSynthesis.speak(thU);
    }
  }

  // Chrome: after cancel(), needs ~80ms before speak() works again.
  // First click has no prior cancel (lastCancelTime = 0), so sinceCancel is huge → no delay.
  const sinceCancel = Date.now() - lastCancelTime;
  if (sinceCancel < 200) {
    registerTimeout('speech', queueAll, 80);
  } else {
    queueAll();
  }
}
