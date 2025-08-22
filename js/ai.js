import { state } from './state.js';
import { ENEMY_TICK_MS } from './config.js';
import { scheduleUpdate, renderHUD } from './render.js';
import { checkEndConditions } from './utils.js';
import { applyPlayerAppearance } from './render.js';

// Получаем позиции всех врагов
export function getEnemiesPositions() {
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

// Проверяем, может ли враг атаковать игрока
function canAttackPlayer(enemyX, enemyY) {
  if (!state.playerPosition) return false;

  const px = state.playerPosition.x;
  const py = state.playerPosition.y;

  // Проверяем соседние клетки вокруг игрока
  return (
    (enemyX === px && Math.abs(enemyY - py) === 1) ||
    (enemyY === py && Math.abs(enemyX - px) === 1)
  );
}

// Получаем возможные направления движения
function getPossibleDirections(x, y) {
  return [
    { x, y: y - 1 }, // вверх
    { x, y: y + 1 }, // вниз
    { x: x - 1, y }, // влево
    { x: x + 1, y }, // вправо
    { x, y }         // остаться на месте
  ].filter(pos => {
    // Проверяем, что клетка существует и доступна
    const tile = state.gameMap[pos.y]?.[pos.x];

    return tile && tile.type === 'floor' && !tile.creature;
  });
}


export function enemyStep() {
  if (state.enemyStepping || state.gameOver) return;
  state.enemyStepping = true;
  const attackers = [];
  try {
    const enemies = getEnemiesPositions();
    const reservedCells = new Set();

    // Сначала проверяем атаки
    let totalDamage = 0;

    if (state.playerPosition) {
      const px = state.playerPosition.x;
      const py = state.playerPosition.y;

      // Проверяем всех врагов вокруг игрока
      const adjacentPositions = [
        { x: px, y: py - 1 }, { x: px, y: py + 1 },
        { x: px - 1, y: py }, { x: px + 1, y: py }
      ];

      adjacentPositions.forEach(pos => {
        const enemy = state.gameMap[pos.y]?.[pos.x]?.creature;
        if (enemy?.type === 'enemy') {
          totalDamage += enemy.attack;

          const dx = px - pos.x, dy = py - pos.y;
          enemy.dir = (Math.abs(dx) >= Math.abs(dy))
            ? (dx > 0 ? 'right' : 'left')
            : (dy > 0 ? 'down' : 'up');
          enemy.attacking = true;
          attackers.push({ x: pos.x, y: pos.y, ref: enemy });
          scheduleUpdate(pos.x, pos.y);
        }
      });

      // Наносим урон игроку
      if (totalDamage > 0) {
        const playerTile = state.gameMap[py][px];
        if (playerTile?.creature?.type === 'player') {
          playerTile.creature.health -= totalDamage;
          scheduleUpdate(px, py);
          state.playerHurt = true;
          applyPlayerAppearance(state.playerDir);

          if (playerTile.creature.health <= 0) {
            playerTile.creature = null;
            state.gameOver = true;
            stopEnemyAI();
          }
        }
      }
    }

    // Затем двигаем врагов, которые не атакуют
    enemies.forEach(({ x, y }) => {
      // Если враг уже атакует игрока - пропускаем движение
      if (canAttackPlayer(x, y)) return;

      const possibleDirections = getPossibleDirections(x, y);
      if (possibleDirections.length === 0) return;

      // Случайное направление
      const randomDirection = possibleDirections[
        Math.floor(Math.random() * possibleDirections.length)
      ];

      const key = `${randomDirection.x},${randomDirection.y}`;

      // Проверяем, не занята ли клетка другим врагом в этом же ходе
      if (!reservedCells.has(key)) {
        reservedCells.add(key);

        let newDir;
        if (randomDirection.x > x) newDir = 'right';
        else if (randomDirection.x < x) newDir = 'left';
        else if (randomDirection.y > y) newDir = 'down';
        else if (randomDirection.y < y) newDir = 'up';
        else newDir = state.gameMap[y][x].creature.dir;


        // Перемещаем врага
        const fromTile = state.gameMap[y][x];
        const toTile = state.gameMap[randomDirection.y][randomDirection.x];
        const enemyObj = fromTile.creature;

        if (enemyObj && !toTile.creature) {
          fromTile.creature = null;
          enemyObj.dir = newDir;
          toTile.creature = enemyObj;
          scheduleUpdate(x, y);
          scheduleUpdate(randomDirection.x, randomDirection.y);
        }
      }
    });

    renderHUD();

  } finally {
    state.enemyStepping = false;
  }
  const HURT_MS = 240;
  const ATTACK_MS = 360;

  setTimeout(() => {
    state.playerHurt = false;
    applyPlayerAppearance(state.playerDir);
  }, HURT_MS);

  setTimeout(() => {
    for (const a of attackers) {
      const tile = state.gameMap[a.y]?.[a.x];
      if (tile?.creature === a.ref) {
        a.ref.attacking = false;
        scheduleUpdate(a.x, a.y);
      }
    }
  }, ATTACK_MS);

  checkEndConditions();
}