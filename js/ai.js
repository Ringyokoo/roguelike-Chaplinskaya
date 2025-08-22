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
      if (c?.type === 'enemy') res.push({ x, y, enemy: c });
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
    { x, y: y - 1, dir: 'up' },    // вверх
    { x, y: y + 1, dir: 'down' },  // вниз
    { x: x - 1, y, dir: 'left' },  // влево
    { x: x + 1, y, dir: 'right' }  // вправо
  ].filter(pos => {
    // Проверяем, что клетка существует и доступна
    const tile = state.gameMap[pos.y]?.[pos.x];
    return tile && tile.type === 'floor' && !tile.creature;
  });
}

// Получаем следующую позицию в направлении
function getNextPositionInDirection(x, y, direction) {
  let nextX = x, nextY = y;
  
  switch (direction) {
    case 'up': nextY = y - 1; break;
    case 'down': nextY = y + 1; break;
    case 'left': nextX = x - 1; break;
    case 'right': nextX = x + 1; break;
  }
  
  return { x: nextX, y: nextY, dir: direction };
}

// Проверяем, можно ли двигаться в текущем направлении
function canMoveInDirection(x, y, direction) {
  const nextPos = getNextPositionInDirection(x, y, direction);
  const tile = state.gameMap[nextPos.y]?.[nextPos.x];
  return tile && tile.type === 'floor' && !tile.creature;
}

// Направление с преоритетом текущего
function getSmartDirection(x, y, enemy) {
  const possibleDirections = getPossibleDirections(x, y);
  if (possibleDirections.length === 0) return null;

  // С вероятностью текущее направление продолжаем
  if (enemy.currentDirection && canMoveInDirection(x, y, enemy.currentDirection)) {

    if (Math.random() < 0.7) {
      return enemy.currentDirection;
    }
  }

  // Иначе выбираем новое направление
  const randomIndex = Math.floor(Math.random() * possibleDirections.length);
  return possibleDirections[randomIndex].dir;
}


function getDirectionTowardsPlayer(x, y, playerX, playerY) {
  const dx = playerX - x;
  const dy = playerY - y;
  
  // Движение по длинному катету
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  } else {
    return dy > 0 ? 'down' : 'up';
  }
}


function getEnemyDirection(x, y, enemy) {
  if (!state.playerPosition) {
    return getSmartDirection(x, y, enemy);
  }

  const px = state.playerPosition.x;
  const py = state.playerPosition.y;
  const distance = Math.abs(px - x) + Math.abs(py - y);

  // Попыткка приблизиться
  if (distance <= 6) {
    const desiredDirection = getDirectionTowardsPlayer(x, y, px, py);
    
    if (canMoveInDirection(x, y, desiredDirection)) {
      return desiredDirection;
    }
  }

  // Иначе обычное поведение
  return getSmartDirection(x, y, enemy);
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

    // Двигаем врагов
    enemies.forEach(({ x, y, enemy }) => {
      if (canAttackPlayer(x, y)) return;

      const direction = getEnemyDirection(x, y, enemy);
      if (!direction) return;

      const nextPosition = getNextPositionInDirection(x, y, direction);
      const key = `${nextPosition.x},${nextPosition.y}`;

      // Проверяем, не занята ли клетка другим врагом в этом же ходе
      if (!reservedCells.has(key)) {
        reservedCells.add(key);

        // Перемещаем врага
        const fromTile = state.gameMap[y][x];
        const toTile = state.gameMap[nextPosition.y][nextPosition.x];
        const enemyObj = fromTile.creature;

        if (enemyObj && !toTile.creature) {
          fromTile.creature = null;
          enemyObj.dir = direction;
          enemyObj.currentDirection = direction; // Сохраняем направление
          toTile.creature = enemyObj;
          scheduleUpdate(x, y);
          scheduleUpdate(nextPosition.x, nextPosition.y);
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