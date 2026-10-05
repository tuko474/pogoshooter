// Весь баланс игры в одном месте. Меняй числа здесь — остальной код их подхватит.

export const W = 600; // ширина поля в игровых единицах
export const H = 900; // высота поля (портретная ориентация)
export const GRAVITY = 1500;

export const PLAYER = {
  hp: 3,
  maxHp: 5,
  smallBounce: 380, // автоподскок, если не держишь палец
  jumpMin: 440, // прыжок без заряда
  jumpCharge: 720, // добавка при полном заряде
  sideMin: 120, // горизонтальная скорость прыжка
  sideCharge: 340,
  chargeSpeed: 1.3, // доля заряда в секунду (1 = полный)
  airSteer: 520, // руление в воздухе
  maxVx: 470,
  stompBounce: 740, // отскок после стомпа
  stompBounceHeld: 920, // отскок, если держишь палец
  invulnTime: 1.3,
  bodyOffset: 48, // от кончика палки до центра тела
};

export const GUN = {
  cooldown: 0.3,
  range: 520,
  bulletSpeed: 780,
  recoil: 22, // отдача толкает игрока в воздухе
};

export const SCORE = {
  shot: 100,
  stomp: 200, // умножается на длину серии стомпов
};

export const WAVES = {
  baseCount: 3, // врагов в волне: baseCount + wave * perWave
  perWave: 2,
  flyersFrom: 2, // с какой волны появляются летуны
  flyersShootFrom: 3, // с какой волны летуны стреляют
  heartDropChance: 0.09,
};

export const ENEMY = {
  walker: { r: 22, hp: 2, speed: 55, speedPerWave: 6 },
  flyer: { r: 18, hp: 1, speed: 60, speedPerWave: 6, shotSpeed: 230 },
};

export interface Platform { x: number; y: number; w: number; ground?: boolean }

export const PLATFORMS: Platform[] = [
  { x: 0, y: 860, w: 600, ground: true },
  { x: 40, y: 700, w: 170 }, { x: 390, y: 700, w: 170 },
  { x: 200, y: 545, w: 200 },
  { x: 30, y: 390, w: 150 }, { x: 420, y: 390, w: 150 },
  { x: 215, y: 240, w: 170 },
];
