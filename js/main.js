// /js/main.js
import {
  MIN_PATH_COUNT, MAX_PATH_COUNT,
  MIN_ROOMS, MAX_ROOMS,
  HEALTH_COUNT, SWORD_COUNT, ENEMY_COUNT,
  ENEMY_TICK_MS,
} from './config.js';

import { state } from './state.js';
import { createEmptyMap, createPath } from './map.js';
import { createRoom, checkAvailable, groupConnectedObjects, findNearest, findRoom } from './rooms.js';
import { placeItems, ITEM_TYPES } from './items.js';
import { placePlayer, placeEnemies } from './creatures.js';
import { renderMap, renderHUD } from './render.js';
import { attachInput } from './input.js';
import { enemyStep } from './ai.js';
import { randomInteger } from './utils.js';
import { COLUMNS, ROWS } from './config.js';

// ---- Локальные хелперы ------------------------------------------------------

function neareastFloor(map, room) {
  return findNearest(map, room, c => c.type === 'floor', COLUMNS, ROWS);
}
function neareastPath(map, room) {
  return findNearest(map, room, c => c.path, COLUMNS, ROWS);
}

// Тянем дорожку до комнат без соседей
function pathToNonAvailable(map) {
  let nonAvailable, notNearRoom, c = 0;
  do {
    nonAvailable = checkAvailable(map);
    notNearRoom = nonAvailable.filter(item => item?.set?.size == 0);
    if (notNearRoom.length) {
      const nc = neareastFloor(map, notNearRoom[0]);
      if (!nc) return;
      if (nc.coord === 'y') {
        for (let yy = Math.min(notNearRoom[0].y, nc.y); yy <= Math.max(notNearRoom[0].y, nc.y); yy++) {
          const cell = map[yy][nc.x];
          cell.type = 'floor';
          if (cell.path) {
            notNearRoom[0].crossPath = true;
          } else {
            const r = findRoom(cell);
            if (r && r !== notNearRoom[0]) {
              if (!r.set) r.set = new Set();
              notNearRoom[0].set.add(r);
              r.set.add(notNearRoom[0]);
            }
          }
        }
      } else {
        for (let xx = Math.min(notNearRoom[0].x, nc.x); xx <= Math.max(notNearRoom[0].x, nc.x); xx++) {
          const cell = map[nc.y][xx];
          cell.type = 'floor';
          if (cell.path) {
            notNearRoom[0].crossPath = true;
          } else {
            const r = findRoom(cell);
            if (r && r !== notNearRoom[0]) {
              if (!r.set) r.set = new Set();
              notNearRoom[0].set.add(r);
              r.set.add(notNearRoom[0]);
            }
          }
        }
      }
    }
    c++;
  } while (notNearRoom.length !== 0 && c < 25);
}

// Тянем к ближайшим ПУТЯМ для связанных групп
function pathToNonAvailableNearRoom(map) {
  let nonAvailable, nearRoom, nearRoomLast, c = 0;
  do {
    nonAvailable = checkAvailable(map);
    nearRoomLast = nearRoom;
    nearRoom = nonAvailable.filter(item => item?.set?.size !== 0);
    if (nearRoom.length) {
      nearRoom.forEach(cur => {
        const hasCross = Array.from(cur.set || []).some(setRoom => setRoom.crossPath === true);
        if (hasCross) cur.crossPath = true;
      });
    }
    c++;
  } while (nearRoom.length !== nearRoomLast?.length && c < 5);

  nearRoom = groupConnectedObjects(nearRoom);
  if (!nearRoom.length) return;

  let k = 0;
  do {
    nonAvailable = checkAvailable(map);
    nearRoom = nonAvailable.filter(item => item?.set?.size !== 0);
    nearRoom = groupConnectedObjects(nearRoom);
    if (nearRoom.length) {
      const nc = neareastPath(map, nearRoom[0]);
      if (!nc) return;
      if (nc.coord === 'y') {
        for (let yy = Math.min(nearRoom[0].y, nc.y); yy <= Math.max(nearRoom[0].y, nc.y); yy++) {
          const cell = map[yy][nc.x];
          cell.type = 'floor';
          if (cell.path) {
            nearRoom[0].crossPath = true;
            nearRoom[0].set.forEach(r => r.crossPath = true);
          }
        }
      } else {
        for (let xx = Math.min(nearRoom[0].x, nc.x); xx <= Math.max(nearRoom[0].x, nc.x); xx++) {
          const cell = map[nc.y][xx];
          cell.type = 'floor';
          if (cell.path) {
            nearRoom[0].crossPath = true;
            nearRoom[0].set.forEach(r => r.crossPath = true);
          }
        }
      }
    }
    k++;
  } while (nearRoom.length !== 0 && k < 25);
}

// ---- Инициализация/рестарт ---------------------------------------------------

function resetState() {
  state.playerPosition = null;
  state.gameMap = [];
  state.roomsRelevant = [];
  state.pathXRelevant = [];
  state.pathYRelevant = [];
  state.enemyStepping = false;
  state.enemies.clear();         // пункт (5)
  state.gameOver = false;        // пункт (9)
  state.lastMoveTime = 0;
  state.tileCache.clear();
  state.pendingUpdates = [];
  state.rAFScheduled = false;
  // цикл
  state.loop = state.loop || { running: false, lastTs: 0, accEnemy: 0 };
  state.loop.lastTs = 0;
  state.loop.accEnemy = 0;
}

function initGame() {
  resetState();

  const gameMap = createEmptyMap();

  for (let i = 0, n = randomInteger(MIN_PATH_COUNT, MAX_PATH_COUNT); i < n; i++) createPath(gameMap, 'x');
  for (let i = 0, n = randomInteger(MIN_PATH_COUNT, MAX_PATH_COUNT); i < n; i++) createPath(gameMap, 'y');
  for (let i = 0, n = randomInteger(MIN_ROOMS, MAX_ROOMS); i < n; i++) createRoom(gameMap);

  pathToNonAvailable(gameMap);
  pathToNonAvailableNearRoom(gameMap);

  placePlayer(gameMap);
  placeEnemies(gameMap, ENEMY_COUNT); // добавляет в state.enemies (п.5)
  placeItems(gameMap, ITEM_TYPES.HEALTH, HEALTH_COUNT);
  placeItems(gameMap, ITEM_TYPES.SWORD,  SWORD_COUNT);

  renderMap(gameMap);
  renderHUD();
}

// ---- Единый игровой цикл по пункту (4) --------------------------------------

function startGameLoop() {
  if (state.loop.running) return;
  state.loop.running = true;
  state.loop.lastTs = 0;
  state.loop.accEnemy = 0;

  const tick = (ts) => {
    const last = state.loop.lastTs || ts;
    const dt = ts - last;
    state.loop.lastTs = ts;

    if (!state.gameOver) {
      state.loop.accEnemy += dt;
      while (state.loop.accEnemy >= ENEMY_TICK_MS) {
        enemyStep();                // ИИ шагает внутри единого цикла
        state.loop.accEnemy -= ENEMY_TICK_MS;
      }
    }
    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

function restartGame() {
  initGame();
  // HUD уже обновится из initGame → renderHUD()
}

// ---- Старт --------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  initGame();
  attachInput(restartGame); // пункт (10): слушает window, R → рестарт (п.9)
  startGameLoop();          // пункт (4): единый rAF-цикл
});
