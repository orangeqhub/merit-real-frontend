const STORAGE_KEY = 'merit.walletSoundPrefs';

const DEFAULTS = {
  walletSoundsEnabled: true,
  muteAllSounds: false,
};

function readPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

let prefs = readPrefs();
let unlocked = false;
let audioCtx = null;

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function getWalletSoundPrefs() {
  return { ...prefs };
}

export function setWalletSoundPrefs(next) {
  prefs = { ...prefs, ...next };
  persist();
  return prefs;
}

export function unlockWalletAudio() {
  if (unlocked) return;
  unlocked = true;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx || new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch {
    // ignore
  }
}

function beep(freq = 880, duration = 0.12, type = 'sine', gainValue = 0.04) {
  if (!unlocked || prefs.muteAllSounds || !prefs.walletSoundsEnabled) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx || new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = gainValue;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    osc.start(now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.stop(now + duration + 0.02);
  } catch {
    // ignore autoplay / audio errors
  }
}

export function playWalletSound(kind) {
  if (!unlocked) return;
  switch (kind) {
    case 'commission_credited':
      beep(880, 0.1);
      setTimeout(() => beep(1175, 0.12), 90);
      break;
    case 'redemption_approved':
      beep(740, 0.12);
      setTimeout(() => beep(988, 0.14), 100);
      break;
    case 'redemption_rejected':
      beep(420, 0.18, 'triangle', 0.05);
      break;
    case 'settlement_completed':
      beep(660, 0.1);
      setTimeout(() => beep(880, 0.1), 90);
      setTimeout(() => beep(1175, 0.14), 180);
      break;
    default:
      beep(800, 0.1);
  }
}
