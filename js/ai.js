import { state } from './state.js';
import { ENEMY_TICK_MS } from './config.js';
import { scheduleUpdate, renderHUD } from './render.js';

function getEnemiesPositions() {
  const res = [];
  for (let y = 0; y < state.gameMap.length; y++) {
    for (let x = 0; x < state.gameMap[0].length; x++) {
      const c = state.gameMap[y][x].creature;
      if (c?.type === 'enemy') res.push({ x, y });
    }
  }
  return res;
}

export function startEnemyAI() {
  stopEnemyAI();
  state.enemyTimer = setInterval(() => {
    if (!state.gameOver) enemyStep();
  }, ENEMY_TICK_MS);
}

export function stopEnemyAI() {
  if (state.enemyTimer) {
    clearInterval(state.enemyTimer);
    state.enemyTimer = null;
  }
}

export function enemyStep() {
  if (state.enemyStepping || state.gameOver) return;
  state.enemyStepping = true;
  try {
    const enemies = getEnemiesPositions();
    const reserved = new Set();
    const moved = [];
    const keyOfPos = (x, y) => `${x},${y}`;
    const px = state.playerPosition?.x, py = state.playerPosition?.y;

    for (const { x, y } of enemies) {
      if (state.gameMap[y][x].creature?.type !== 'enemy') continue;

      const adjToPlayer = (typeof px === 'number') && (Math.abs(x - px) + Math.abs(y - py) === 1);
      if (adjToPlayer) continue;

      const candidates = [{ x, y },
        { x, y: y - 1 }, { x, y: y + 1 },
        { x: x - 1, y }, { x: x + 1, y },
      ];

      if (typeof px === 'number') {
        candidates.sort((a, b) =>
          (Math.abs(a.x - px) + Math.abs(a.y - py)) -
          (Math.abs(b.x - px) + Math.abs(b.y - py))
        );
        if (Math.random() < 0.35) candidates.reverse();
      } else {
        candidates.sort(() => Math.random() - 0.5);
      }

      let movedTo = null;
      for (const d of candidates) {
        const dest = state.gameMap[d.y]?.[d.x];
        const k = keyOfPos(d.x, d.y);
        if (dest && dest.type === 'floor' && !dest.creature && !reserved.has(k)) {
          movedTo = d; reserved.add(k); break;
        }
      }
      if (movedTo) moved.push({ from: { x, y }, to: movedTo });
    }

    for (const m of moved) {
      const fromTile = state.gameMap[m.from.y][m.from.x];
      const toTile = state.gameMap[m.to.y][m.to.x];
      const enemyObj = fromTile.creature;
      if (enemyObj?.type === 'enemy' && !toTile.creature && toTile.type === 'floor') {
        fromTile.creature = null;
        toTile.creature = enemyObj;
        scheduleUpdate(m.from.x, m.from.y);
        scheduleUpdate(m.to.x, m.to.y);
      }
    }

    if (!state.playerPosition) { renderHUD(); return; }
    const p = state.playerPosition;
    const adj = [
      { x: p.x, y: p.y - 1 }, { x: p.x, y: p.y + 1 },
      { x: p.x - 1, y: p.y }, { x: p.x + 1, y: p.y },
    ];
    let totalDamage = 0;
    for (const { x, y } of adj) {
      const c = state.gameMap[y]?.[x]?.creature;
      if (c?.type === 'enemy') totalDamage += c.attack;
    }
    if (totalDamage > 0) {
      const ptile = state.gameMap[p.y][p.x];
      if (ptile?.creature?.type === 'player') {
        ptile.creature.health -= totalDamage;
        scheduleUpdate(p.x, p.y);
        if (ptile.creature.health <= 0) {
          ptile.creature = null;
          scheduleUpdate(p.x, p.y);
          state.gameOver = true;
          stopEnemyAI();
          renderHUD();
        }
      }
    }
    renderHUD();
  } finally {
    state.enemyStepping = false;
  }
}
