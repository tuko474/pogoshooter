// Отрисовка поля на Canvas 2D. Масштабирует игровое поле 600×900 под любой экран.
import { W, H, GRAVITY, PLATFORMS } from './config';
import { COLORS as C, type Game, type Enemy } from './game';

const FONT = 'Bungee, "Arial Black", Impact, sans-serif';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  S = 1; OX = 0; OY = 0; private DPR = 1;
  private stars = [...Array(70)].map(() => ({ x: Math.random() * W, y: Math.random() * 600, r: Math.random() * 1.6 + 0.3, p: Math.random() * 6 }));

  constructor(private cv: HTMLCanvasElement) {
    this.ctx = cv.getContext('2d')!;
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    this.DPR = Math.min(window.devicePixelRatio || 1, 2);
    const r = this.cv.getBoundingClientRect();
    this.cv.width = Math.round(r.width * this.DPR);
    this.cv.height = Math.round(r.height * this.DPR);
    this.S = Math.min(r.width / W, r.height / H);
    this.OX = (r.width - W * this.S) / 2;
    this.OY = (r.height - H * this.S) / 2;
  }

  toWorldX(clientX: number) {
    const r = this.cv.getBoundingClientRect();
    return (clientX - r.left - this.OX) / this.S;
  }

  draw(g: Game, playing: boolean, t: number) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = C.night; ctx.fillRect(0, 0, this.cv.width, this.cv.height);
    const sx = g.shake ? (Math.random() - 0.5) * g.shake : 0, sy = g.shake ? (Math.random() - 0.5) * g.shake : 0;
    ctx.setTransform(this.DPR * this.S, 0, 0, this.DPR * this.S, this.DPR * (this.OX + sx * this.S), this.DPR * (this.OY + sy * this.S));
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    this.bg(t); this.plats();
    if (playing) {
      for (const h of g.hearts) {
        ctx.globalAlpha = h.life < 2 ? (Math.sin(h.life * 20) > 0 ? 1 : 0.3) : 1;
        ctx.fillStyle = C.coral; this.heart(h.x, h.y - 10 + Math.sin(t * 4) * 4, 22); ctx.fill();
        ctx.globalAlpha = 1;
      }
      for (const e of g.enemies) this.enemy(e, g);
      ctx.fillStyle = C.mustard;
      for (const b of g.bullets) { ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, 7); ctx.fill(); }
      for (const s of g.eshots) {
        ctx.fillStyle = C.flyer; ctx.beginPath(); ctx.arc(s.x, s.y, 7, 0, 7); ctx.fill();
        ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(s.x, s.y, 3, 0, 7); ctx.fill();
      }
      this.trajectory(g); if (!g.over) this.player(g);
      for (const q of g.parts) { ctx.globalAlpha = Math.min(1, q.life * 2); ctx.fillStyle = q.col; ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size); }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '18px ' + FONT;
      for (const f of g.floaters) { ctx.globalAlpha = Math.min(1, f.life * 2); ctx.fillStyle = f.col; ctx.fillText(f.txt, f.x, f.y); }
      ctx.globalAlpha = 1;
      this.hud(g);
    }
    ctx.restore();
  }

  private rr(x: number, y: number, w: number, h: number, r: number) {
    const c = this.ctx;
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  private heart(x: number, y: number, s: number) {
    const c = this.ctx;
    c.beginPath(); c.moveTo(x, y + s * 0.35);
    c.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.35);
    c.bezierCurveTo(x - s * 0.5, y + s * 0.7, x, y + s * 0.85, x, y + s);
    c.bezierCurveTo(x, y + s * 0.85, x + s * 0.5, y + s * 0.7, x + s * 0.5, y + s * 0.35);
    c.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.35); c.closePath();
  }

  private bg(t: number) {
    const c = this.ctx;
    const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, C.night); gr.addColorStop(1, C.dusk);
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    for (const s of this.stars) { c.globalAlpha = 0.35 + 0.35 * Math.sin(t * 1.5 + s.p); c.fillStyle = C.ink; c.beginPath(); c.arc(s.x, s.y, s.r, 0, 7); c.fill(); }
    c.globalAlpha = 1;
    c.fillStyle = 'rgba(255,201,60,.13)'; c.beginPath(); c.arc(470, 150, 90, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,201,60,.22)'; c.beginPath(); c.arc(470, 150, 58, 0, 7); c.fill();
    c.fillStyle = 'rgba(10,12,34,.55)';
    const bl = [[0, 120], [50, 170], [95, 90], [140, 210], [200, 140], [250, 180], [310, 110], [360, 230], [420, 150], [470, 190], [530, 120], [570, 200]];
    for (const [x, h] of bl) c.fillRect(x, 860 - h, 52, h);
  }

  private plats() {
    const c = this.ctx;
    for (const p of PLATFORMS) {
      if (p.ground) {
        c.fillStyle = C.platDark; c.fillRect(0, p.y, W, H - p.y);
        c.fillStyle = C.plat; c.fillRect(0, p.y, W, 10);
        c.fillStyle = 'rgba(20,26,58,.25)';
        for (let x = -20; x < W; x += 34) { c.beginPath(); c.moveTo(x, p.y + 12); c.lineTo(x + 18, p.y + 12); c.lineTo(x + 40, H); c.lineTo(x + 22, H); c.fill(); }
        continue;
      }
      c.fillStyle = C.platDark; this.rr(p.x, p.y + 4, p.w, 16, 8); c.fill();
      c.fillStyle = C.plat; this.rr(p.x, p.y, p.w, 14, 7); c.fill();
      c.save(); this.rr(p.x, p.y, p.w, 14, 7); c.clip(); c.fillStyle = 'rgba(255,107,74,.55)';
      for (let x = p.x - 10; x < p.x + p.w; x += 22) { c.beginPath(); c.moveTo(x, p.y + 14); c.lineTo(x + 8, p.y); c.lineTo(x + 16, p.y); c.lineTo(x + 8, p.y + 14); c.fill(); }
      c.restore();
    }
  }

  private trajectory(g: Game) {
    const p = g.p, c = this.ctx;
    if (!p.grounded) return;
    const v = g.launchVel(p.charge);
    let x = p.x, y = p.y, vx = v.vx, vy = v.vy;
    c.fillStyle = C.spring;
    for (let i = 0; i < 26; i++) {
      for (let k = 0; k < 3; k++) { vy += GRAVITY * 0.016; x += vx * 0.016; y += vy * 0.016; if (x < 14 || x > W - 14) vx = -vx * 0.6; }
      c.globalAlpha = Math.max(0, 0.75 - i * 0.028); c.beginPath(); c.arc(x, y, 3.2, 0, 7); c.fill();
      if (vy > 0 && y > p.y) break;
    }
    c.globalAlpha = 1;
  }

  private player(g: Game) {
    const p = g.p, c = this.ctx;
    if (p.inv > 0 && Math.floor(p.inv * 14) % 2 === 0) return;
    const comp = p.grounded ? p.charge * 16 : p.squash * 8;
    const stick = 34 - comp, by = p.y - stick - 14;
    c.strokeStyle = C.muted; c.lineWidth = 3; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(p.x, p.y);
    const coils = 6;
    for (let i = 1; i <= coils; i++) c.lineTo(p.x + (i % 2 ? 7 : -7), p.y - (stick * i) / (coils + 1));
    c.lineTo(p.x, p.y - stick); c.stroke();
    c.fillStyle = C.ink; c.fillRect(p.x - 12, p.y - stick - 2, 24, 5);
    c.fillStyle = C.coral; c.beginPath(); c.arc(p.x, p.y, 4, 0, 7); c.fill();
    const sq = 1 + comp * 0.012;
    c.save(); c.translate(p.x, by); c.scale(sq, 1 / sq);
    c.fillStyle = C.spring; c.beginPath(); c.arc(0, 0, 18, 0, 7); c.fill();
    c.fillStyle = 'rgba(20,26,58,.18)'; c.beginPath(); c.arc(0, 4, 18, 0.2, Math.PI - 0.2); c.fill();
    c.fillStyle = C.night; c.beginPath(); c.arc(p.face * 5 - 4, -4, 3.2, 0, 7); c.arc(p.face * 5 + 5, -4, 3.2, 0, 7); c.fill();
    c.fillRect(p.face > 0 ? 12 : -24, 2, 12, 6);
    c.restore();
    if (p.grounded) {
      c.strokeStyle = p.charge >= 1 ? C.mustard : C.spring; c.lineWidth = 4;
      c.beginPath(); c.arc(p.x, by, 26, -Math.PI / 2, -Math.PI / 2 + p.charge * Math.PI * 2); c.stroke();
    }
  }

  private enemy(e: Enemy, g: Game) {
    const c = this.ctx, fl = e.flash > 0;
    if (e.type === 'w') {
      const cy = e.y - e.r, bob = Math.abs(Math.sin(e.t * 8)) * 3;
      c.fillStyle = fl ? C.ink : C.walker; c.beginPath(); c.ellipse(e.x, cy - bob, e.r, e.r - bob * 0.6, 0, 0, 7); c.fill();
      c.fillStyle = 'rgba(20,26,58,.25)'; c.fillRect(e.x - e.r + 4, cy - e.r * 0.55 - bob, e.r * 2 - 8, 5);
      const d = Math.sign(e.vx || 1);
      c.fillStyle = C.ink; c.beginPath(); c.arc(e.x + d * 7, cy - 4 - bob, 6, 0, 7); c.fill();
      c.fillStyle = C.night; c.beginPath(); c.arc(e.x + d * 9, cy - 4 - bob, 3, 0, 7); c.fill();
      if (e.hp < 2) { c.strokeStyle = C.night; c.lineWidth = 2; c.beginPath(); c.moveTo(e.x - 8, cy - 14); c.lineTo(e.x - 2, cy - 6); c.stroke(); }
    } else {
      const w = Math.sin(e.t * 20) * 8;
      c.fillStyle = 'rgba(244,242,255,.55)';
      c.beginPath(); c.ellipse(e.x - 16, e.y - 6, 12, 5 + w * 0.3, -0.5, 0, 7); c.ellipse(e.x + 16, e.y - 6, 12, 5 - w * 0.3, 0.5, 0, 7); c.fill();
      c.fillStyle = fl ? C.ink : C.flyer; c.beginPath(); c.arc(e.x, e.y, e.r, 0, 7); c.fill();
      c.fillStyle = C.night; c.beginPath(); c.arc(e.x, e.y - 1, 6, 0, 7); c.fill();
      c.fillStyle = C.mustard; c.beginPath(); c.arc(e.x + (g.p.x > e.x ? 2 : -2), e.y - 1, 2.5, 0, 7); c.fill();
    }
  }

  private hud(g: Game) {
    const c = this.ctx, p = g.p;
    c.textBaseline = 'top'; c.textAlign = 'left';
    c.font = '28px ' + FONT; c.fillStyle = C.ink; c.fillText(String(g.score).padStart(5, '0'), 18, 16);
    c.font = '14px ' + FONT; c.fillStyle = C.muted; c.fillText('ВОЛНА ' + g.wave, 20, 50);
    for (let i = 0; i < Math.max(3, p.hp); i++) { c.fillStyle = i < p.hp ? C.coral : 'rgba(169,166,214,.3)'; this.heart(W - 30 - i * 30, 18, 24); c.fill(); }
    if (p.combo > 1) { c.textAlign = 'center'; c.font = '22px ' + FONT; c.fillStyle = C.mustard; c.fillText('СТОМП ×' + p.combo, W / 2, 18); }
    if (g.bannerT > 0) {
      c.globalAlpha = Math.min(1, g.bannerT * 2); c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '54px ' + FONT;
      c.fillStyle = C.coral; c.fillText('ВОЛНА ' + g.wave, W / 2, H / 2 - 96);
      c.fillStyle = C.mustard; c.fillText('ВОЛНА ' + g.wave, W / 2, H / 2 - 100);
      c.globalAlpha = 1;
    }
  }
}
