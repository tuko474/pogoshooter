// Правила игры без привязки к экрану: физика, враги, стрельба, волны.
import { W, GRAVITY, PLAYER, GUN, SCORE, WAVES, ENEMY, PLATFORMS, type Platform } from './config';

export type Sfx = 'jump' | 'bigjump' | 'shoot' | 'hit' | 'stomp' | 'hurt' | 'heart' | 'wave' | 'over';

export interface Player {
  x: number; y: number; vx: number; vy: number;
  charge: number; grounded: boolean; hp: number; inv: number;
  combo: number; squash: number; face: number;
}
export interface Enemy {
  type: 'w' | 'f'; x: number; y: number; vx: number; vy: number; r: number; hp: number;
  plat: Platform | null; flash: number; t: number; shotT: number; dead?: boolean;
}
export interface Bullet { x: number; y: number; vx: number; vy: number; life: number }
export interface Particle { x: number; y: number; vx: number; vy: number; life: number; col: string; size: number }
export interface Floater { x: number; y: number; txt: string; col: string; life: number }
export interface Heart { x: number; y: number; life: number }

export interface Input { holding: boolean; aimX: number; keyDir: number }

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

export const COLORS = {
  night: '#141a3a', dusk: '#2a2466', spring: '#3ee6b5', coral: '#ff6b4a', mustard: '#ffc93c',
  ink: '#f4f2ff', muted: '#a9a6d6', walker: '#b45cff', flyer: '#ff4f8b', plat: '#ffc93c', platDark: '#c7861c',
};

export class Game {
  p!: Player;
  enemies: Enemy[] = [];
  bullets: Bullet[] = [];
  eshots: Bullet[] = [];
  parts: Particle[] = [];
  floaters: Floater[] = [];
  hearts: Heart[] = [];
  score = 0; wave = 0; t = 0;
  bannerT = 0; shake = 0;
  over = false;
  private spawnQ: ('w' | 'f')[] = [];
  private spawnT = 0;
  private fireT = 0;

  constructor(private input: Input, private sfx: (s: Sfx) => void = () => {}) { this.reset(); }

  reset() {
    this.p = { x: 300, y: 860, vx: 0, vy: -400, charge: 0, grounded: false, hp: PLAYER.hp, inv: 0, combo: 0, squash: 0, face: 1 };
    this.enemies = []; this.bullets = []; this.eshots = []; this.parts = []; this.floaters = []; this.hearts = [];
    this.score = 0; this.wave = 0; this.t = 0; this.spawnQ = []; this.spawnT = 0;
    this.bannerT = 0; this.shake = 0; this.fireT = 0; this.over = false;
    this.nextWave();
  }

  bodyY() { return this.p.y - PLAYER.bodyOffset; }

  aimDir() {
    if (this.input.keyDir) return this.input.keyDir;
    return clamp((this.input.aimX - this.p.x) / 160, -1, 1);
  }

  launchVel(c: number) {
    return { vx: this.aimDir() * (PLAYER.sideMin + PLAYER.sideCharge * c), vy: -(PLAYER.jumpMin + PLAYER.jumpCharge * c) };
  }

  private nextWave() {
    this.wave++; this.bannerT = 1.8;
    const n = WAVES.baseCount + this.wave * WAVES.perWave;
    for (let i = 0; i < n; i++) {
      const fly = this.wave >= WAVES.flyersFrom && Math.random() < Math.min(0.25 + this.wave * 0.04, 0.5);
      this.spawnQ.push(fly ? 'f' : 'w');
    }
    this.spawnT = 1.2;
    if (this.wave > 1) this.sfx('wave');
  }

  private spawn(type: 'w' | 'f') {
    if (type === 'w') {
      const c = ENEMY.walker;
      this.enemies.push({ type, x: 40 + Math.random() * 520, y: -30, vx: (Math.random() < 0.5 ? -1 : 1) * (c.speed + this.wave * c.speedPerWave), vy: 0, r: c.r, hp: c.hp, plat: null, flash: 0, t: Math.random() * 9, shotT: 0 });
    } else {
      const side = Math.random() < 0.5;
      this.enemies.push({ type, x: side ? -20 : W + 20, y: 80 + Math.random() * 250, vx: 0, vy: 0, r: ENEMY.flyer.r, hp: ENEMY.flyer.hp, plat: null, flash: 0, t: Math.random() * 9, shotT: 2 + Math.random() * 2 });
    }
  }

  private burst(x: number, y: number, col: string, n: number, sp: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = sp * (0.3 + Math.random());
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, life: 0.5 + Math.random() * 0.4, col, size: 3 + Math.random() * 4 });
    }
  }

  private land(y: number) {
    const p = this.p;
    p.y = y; p.combo = 0; p.squash = 1;
    if (this.input.holding) { p.grounded = true; p.vy = 0; }
    else { p.vy = -PLAYER.smallBounce; p.vx *= 0.6; }
  }

  private hurt(fromX: number) {
    const p = this.p;
    if (p.inv > 0 || this.over) return;
    p.hp--; p.inv = PLAYER.invulnTime; this.shake = 12;
    p.vy = -520; p.vx = (p.x < fromX ? -1 : 1) * 320; p.grounded = false; p.charge = 0;
    this.burst(p.x, this.bodyY(), COLORS.coral, 18, 260);
    if (p.hp <= 0) { this.over = true; this.sfx('over'); } else this.sfx('hurt');
  }

  private enemyCY(e: Enemy) { return e.type === 'w' ? e.y - e.r : e.y; }

  private kill(e: Enemy, how: 'shot' | 'stomp') {
    e.dead = true;
    const pts = how === 'stomp' ? SCORE.stomp * Math.max(1, this.p.combo) : SCORE.shot;
    this.score += pts;
    const cy = this.enemyCY(e);
    this.floaters.push({ x: e.x, y: cy - 20, txt: (how === 'stomp' && this.p.combo > 1 ? '×' + this.p.combo + ' ' : '') + '+' + pts, col: how === 'stomp' ? COLORS.mustard : COLORS.ink, life: 1 });
    this.burst(e.x, cy, e.type === 'w' ? COLORS.walker : COLORS.flyer, how === 'stomp' ? 22 : 12, how === 'stomp' ? 340 : 220);
    if (Math.random() < WAVES.heartDropChance && this.p.hp < PLAYER.maxHp) this.hearts.push({ x: e.x, y: cy, life: 9 });
  }

  update(dt: number) {
    if (this.over) { this.tickFx(dt); return; }
    const p = this.p, inp = this.input;
    this.t += dt;
    if (this.bannerT > 0) this.bannerT -= dt;
    if (p.inv > 0) p.inv -= dt;
    if (p.squash > 0) p.squash = Math.max(0, p.squash - dt * 5);

    // волны
    if (this.spawnQ.length) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) { this.spawn(this.spawnQ.shift()!); this.spawnT = Math.max(0.35, 0.75 - this.wave * 0.03); }
    } else if (!this.enemies.length) this.nextWave();

    // игрок
    const dir = this.aimDir();
    if (Math.abs(dir) > 0.15) p.face = Math.sign(dir);
    if (p.grounded) {
      p.vx *= Math.pow(0.001, dt);
      p.charge = Math.min(1, p.charge + dt * PLAYER.chargeSpeed);
      if (!inp.holding) {
        const v = this.launchVel(p.charge);
        p.vx = v.vx; p.vy = v.vy; p.grounded = false;
        this.sfx(p.charge > 0.5 ? 'bigjump' : 'jump');
        p.charge = 0;
        this.burst(p.x, p.y, COLORS.spring, 8, 120);
      }
    } else {
      if (inp.holding || inp.keyDir) p.vx += dir * PLAYER.airSteer * dt;
      p.vx = clamp(p.vx, -PLAYER.maxVx, PLAYER.maxVx);
      p.vy = Math.min(p.vy + GRAVITY * dt, 1200);
      const prevY = p.y;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < 14) { p.x = 14; p.vx = Math.abs(p.vx) * 0.6; }
      if (p.x > W - 14) { p.x = W - 14; p.vx = -Math.abs(p.vx) * 0.6; }
      if (p.y < 60) { p.y = 60; p.vy = Math.max(p.vy, 0); }
      if (p.vy > 0) for (const pl of PLATFORMS) {
        if (prevY <= pl.y && p.y >= pl.y && p.x >= pl.x - 4 && p.x <= pl.x + pl.w + 4) { this.land(pl.y); break; }
      }
    }

    // автострельба по ближайшему врагу
    this.fireT -= dt;
    if (this.fireT <= 0) {
      let tgt: Enemy | null = null, bd = GUN.range;
      for (const e of this.enemies) {
        const d = Math.hypot(e.x - p.x, this.enemyCY(e) - this.bodyY());
        if (d < bd && e.y > 0) { bd = d; tgt = e; }
      }
      if (tgt) {
        const a = Math.atan2(this.enemyCY(tgt) - this.bodyY(), tgt.x - p.x);
        this.bullets.push({ x: p.x + Math.cos(a) * 20, y: this.bodyY() + Math.sin(a) * 20, vx: Math.cos(a) * GUN.bulletSpeed, vy: Math.sin(a) * GUN.bulletSpeed, life: 1 });
        if (!p.grounded) p.vx -= Math.cos(a) * GUN.recoil;
        this.fireT = GUN.cooldown;
        this.sfx('shoot');
      } else this.fireT = 0.1;
    }

    for (const b of this.bullets) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (Math.hypot(b.x - e.x, b.y - this.enemyCY(e)) < e.r + 5) {
          b.life = 0; e.hp--; e.flash = 0.12; this.burst(b.x, b.y, COLORS.ink, 4, 120);
          if (e.hp <= 0) this.kill(e, 'shot'); else this.sfx('hit');
          break;
        }
      }
    }
    this.bullets = this.bullets.filter(b => b.life > 0 && b.x > -20 && b.x < W + 20 && b.y > -20 && b.y < 920);

    // враги
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.t += dt; if (e.flash > 0) e.flash -= dt;
      if (e.type === 'w') {
        if (!e.plat) {
          const prevY = e.y; e.vy = Math.min(e.vy + GRAVITY * dt, 900); e.y += e.vy * dt;
          for (const pl of PLATFORMS) if (prevY <= pl.y && e.y >= pl.y && e.x >= pl.x && e.x <= pl.x + pl.w) { e.y = pl.y; e.vy = 0; e.plat = pl; break; }
        } else {
          e.x += e.vx * dt; const pl = e.plat;
          if (e.x < pl.x + e.r * 0.6) { e.x = pl.x + e.r * 0.6; e.vx = Math.abs(e.vx); }
          if (e.x > pl.x + pl.w - e.r * 0.6) { e.x = pl.x + pl.w - e.r * 0.6; e.vx = -Math.abs(e.vx); }
        }
      } else {
        const sp = ENEMY.flyer.speed + this.wave * ENEMY.flyer.speedPerWave;
        const a = Math.atan2(this.bodyY() - e.y, p.x - e.x);
        e.x += Math.cos(a) * sp * dt; e.y += Math.sin(a) * sp * dt + Math.sin(e.t * 3) * 40 * dt;
        if (this.wave >= WAVES.flyersShootFrom) {
          e.shotT -= dt;
          if (e.shotT <= 0) {
            e.shotT = 2.4 + Math.random() * 2;
            const s = ENEMY.flyer.shotSpeed;
            this.eshots.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 4 });
          }
        }
      }
      const ey = this.enemyCY(e);
      const feetD = Math.hypot(p.x - e.x, p.y - ey), bodyD = Math.hypot(p.x - e.x, this.bodyY() - ey);
      if (p.vy > 0 && !p.grounded && (feetD < e.r + 10 || (bodyD < e.r + 18 && p.y < ey + 4))) {
        p.combo++; this.kill(e, 'stomp');
        p.vy = -(inp.holding ? PLAYER.stompBounceHeld : PLAYER.stompBounce); this.shake = 7;
        this.sfx('stomp');
      } else if (bodyD < e.r + 16) this.hurt(e.x);
    }
    this.enemies = this.enemies.filter(e => !e.dead);

    for (const s of this.eshots) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (Math.hypot(s.x - p.x, s.y - this.bodyY()) < 22) { s.life = 0; this.hurt(s.x); }
    }
    this.eshots = this.eshots.filter(s => s.life > 0);

    for (const h of this.hearts) {
      h.life -= dt;
      if (Math.hypot(h.x - p.x, h.y - this.bodyY()) < 34 || Math.hypot(h.x - p.x, h.y - p.y) < 26) {
        h.life = 0; p.hp = Math.min(PLAYER.maxHp, p.hp + 1);
        this.floaters.push({ x: h.x, y: h.y - 20, txt: '+♥', col: COLORS.coral, life: 1 });
        this.sfx('heart');
      }
    }
    this.hearts = this.hearts.filter(h => h.life > 0);
    this.tickFx(dt);
  }

  private tickFx(dt: number) {
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 40);
    for (const q of this.parts) { q.vy += 900 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; }
    this.parts = this.parts.filter(q => q.life > 0);
    for (const f of this.floaters) { f.y -= 50 * dt; f.life -= dt; }
    this.floaters = this.floaters.filter(f => f.life > 0);
  }
}
