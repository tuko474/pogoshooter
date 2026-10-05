// Экраны, управление и игровой цикл.
import { Game, type Input } from './game';
import { Renderer } from './render';
import { play, unlockAudio, isMuted, setMuted } from './audio';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const cv = $<HTMLCanvasElement>('c');
const startEl = $('start'), overEl = $('over'), pauseEl = $('pause');
const pauseBtn = $<HTMLButtonElement>('pauseBtn'), muteBtns = document.querySelectorAll<HTMLButtonElement>('.mute');

const input: Input = { holding: false, aimX: 300, keyDir: 0 };
const game = new Game(input, play);
const view = new Renderer(cv);

type State = 'menu' | 'play' | 'pause' | 'over';
let state: State = 'menu';
let best = 0;
try { best = Number(localStorage.getItem('pogo_best')) || 0; } catch { /* нет хранилища */ }

const ver = document.querySelector<HTMLMetaElement>('meta[name="app-version"]')?.content ?? 'dev';
$('ver').textContent = 'версия ' + ver;
const showBest = () => { $('bestMenu').textContent = best ? 'Рекорд: ' + best : ''; };
showBest();

function syncMute() { muteBtns.forEach(b => { b.textContent = isMuted() ? 'Звук: выкл' : 'Звук: вкл'; b.setAttribute('aria-pressed', String(!isMuted())); }); }
syncMute();
muteBtns.forEach(b => b.addEventListener('click', () => { setMuted(!isMuted()); syncMute(); }));

function setState(s: State) {
  state = s;
  startEl.hidden = s !== 'menu';
  pauseEl.hidden = s !== 'pause';
  pauseBtn.hidden = s !== 'play';
  if (s !== 'over') overEl.hidden = true;
  input.holding = false; keys.j = keys.l = keys.r = false; input.keyDir = 0;
}

function begin() { unlockAudio(); game.reset(); setState('play'); }

function finish() {
  setState('over');
  const nb = game.score > best;
  if (nb) { best = game.score; try { localStorage.setItem('pogo_best', String(best)); } catch { /* нет хранилища */ } }
  $('finalScore').textContent = String(game.score);
  $('finalInfo').textContent = 'Волна ' + game.wave + ' · ' + (nb ? 'новый рекорд!' : 'рекорд: ' + best);
  showBest();
  setTimeout(() => { if (state === 'over') overEl.hidden = false; }, 600);
}

$('go').addEventListener('click', begin);
$('again').addEventListener('click', begin);
$('toMenu').addEventListener('click', () => setState('menu'));
$('quit').addEventListener('click', () => setState('menu'));
$('resume').addEventListener('click', () => { unlockAudio(); setState('play'); });
pauseBtn.addEventListener('click', () => setState('pause'));

// касания: держишь — копится заряд, отпускаешь — прыжок в сторону пальца
cv.addEventListener('pointerdown', e => {
  if (state !== 'play') return;
  e.preventDefault(); unlockAudio();
  input.holding = true; input.aimX = view.toWorldX(e.clientX);
  try { cv.setPointerCapture(e.pointerId); } catch { /* ок */ }
});
cv.addEventListener('pointermove', e => { if (input.holding) input.aimX = view.toWorldX(e.clientX); });
addEventListener('pointerup', () => { input.holding = false; });
addEventListener('pointercancel', () => { input.holding = false; });

// клавиатура для проверки на компьютере
const keys = { j: false, l: false, r: false };
const sync = () => { input.keyDir = (keys.r ? 1 : 0) - (keys.l ? 1 : 0); input.holding = keys.j; };
const keyMap = (code: string): keyof typeof keys | null =>
  code === 'Space' || code === 'ArrowUp' || code === 'KeyW' ? 'j' : code === 'ArrowLeft' || code === 'KeyA' ? 'l' : code === 'ArrowRight' || code === 'KeyD' ? 'r' : null;
addEventListener('keydown', e => {
  if (e.code === 'Escape' || e.code === 'KeyP') { if (state === 'play') setState('pause'); else if (state === 'pause') setState('play'); return; }
  if (state !== 'play') return;
  const k = keyMap(e.code); if (!k) return;
  e.preventDefault(); unlockAudio(); keys[k] = true; sync();
});
addEventListener('keyup', e => { const k = keyMap(e.code); if (k) { keys[k] = false; sync(); } });

// свернул приложение — пауза
const autoPause = () => { if (state === 'play') setState('pause'); };
addEventListener('blur', autoPause);
document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });

let last = performance.now(), t = 0;
function frame(now: number) {
  const dt = Math.min(0.033, (now - last) / 1000); last = now; t += dt;
  if (state === 'play') {
    game.update(dt);
    if (game.over) finish();
  } else if (state === 'over') game.update(dt);
  view.draw(game, state !== 'menu', t);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
