import { state } from './state.js';
import { MOVE_DELAY } from './config.js';
import { scheduleUpdate, renderHUD } from './render.js';

export function playerAttack() {
  const now = performance.now();
  if (now - state.lastMoveTime < MOVE_DELAY) return;
  if (state.gameOver) return;

  const { x, y } = state.playerPosition;
  const ptile = state.gameMap[y][x];
  const player = ptile.creature;
  if (!player || player.type !== 'player') return;

  let hit = false;
  const adj = [
    { x, y: y - 1 }, { x, y: y + 1 },
    { x: x - 1, y }, { x: x + 1, y },
  ];
  for (const n of adj) {
    const t = state.gameMap[n.y]?.[n.x];
    const c = t?.creature;
    if (c?.type === 'enemy') {
      c.health -= player.attack;
      hit = true;
      if (c.health <= 0) {
        t.creature = null;
        if (c.id) state.enemies.delete(c.id);
      }
      scheduleUpdate(n.x, n.y);
    }
  }
  if (hit) {
    state.lastMoveTime = now;
    renderHUD();
  }
}
