// Звуки генерируются кодом (без файлов) + виброотклик на телефоне.
import type { Sfx } from './game';

let ac: AudioContext | null = null;
let muted = false;
try { muted = localStorage.getItem('pogo_muted') === '1'; } catch { /* нет хранилища */ }

export function isMuted() { return muted; }
export function setMuted(m: boolean) {
  muted = m;
  try { localStorage.setItem('pogo_muted', m ? '1' : '0'); } catch { /* нет хранилища */ }
}

// звук можно включить только после касания экрана
export function unlockAudio() {
  if (!ac) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (Ctx) ac = new Ctx();
  }
  if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
}

function tone(f0: number, f1: number, dur: number, type: OscillatorType, vol: number) {
  if (!ac || muted) return;
  const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
}

function buzz(ms: number) { try { navigator.vibrate?.(ms); } catch { /* не поддерживается */ } }

export function play(s: Sfx) {
  switch (s) {
    case 'jump': tone(300, 520, 0.12, 'square', 0.05); break;
    case 'bigjump': tone(220, 900, 0.22, 'square', 0.07); break;
    case 'shoot': tone(900, 400, 0.05, 'triangle', 0.03); break;
    case 'hit': tone(500, 300, 0.06, 'square', 0.03); break;
    case 'stomp': tone(160, 60, 0.18, 'sawtooth', 0.12); tone(700, 1400, 0.1, 'square', 0.04); buzz(25); break;
    case 'hurt': tone(400, 90, 0.3, 'sawtooth', 0.1); buzz(80); break;
    case 'heart': tone(660, 1320, 0.18, 'sine', 0.08); break;
    case 'wave': tone(440, 880, 0.25, 'triangle', 0.06); break;
    case 'over': tone(400, 60, 0.7, 'sawtooth', 0.1); buzz(200); break;
  }
}
