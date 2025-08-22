import {
    MIN_PATH_COUNT, MAX_PATH_COUNT,
    MIN_ROOMS, MAX_ROOMS,
    HEALTH_COUNT, SWORD_COUNT, ENEMY_COUNT,
    ENEMY_TICK_MS,
} from './config.js';

import { state } from './state.js';
import { createEmptyMap, createPath, createRoom, pathToNonAvailable, pathToNonAvailableNearRoom } from './map.js';
import { placeItems, ITEM_TYPES } from './items.js';
import { placePlayer, placeEnemies } from './creatures.js';
import { renderMap, renderHUD } from './render.js';
import { attachInput } from './input.js';
import { enemyStep } from './ai.js';
import { randomInteger } from './utils.js';
import { bindCamera, updateCamera } from './camera.js';
import { closeDialog } from './utils.js';



// ---- Инициализация/рестарт ---------------------------------------------------

function resetState() {
    closeDialog();
    state.playerPosition = null;
    state.gameMap = [];
    state.roomsRelevant = [];
    state.pathXRelevant = [];
    state.pathYRelevant = [];
    state.enemyStepping = false;
    state.enemies.clear();
    state.gameOver = false;
    state.lastMoveTime = 0;
    state.tileCache.clear();
    state.pendingUpdates = [];
    state.rAFScheduled = false;

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
    placeEnemies(gameMap, ENEMY_COUNT);
    placeItems(gameMap, ITEM_TYPES.HEALTH, HEALTH_COUNT);
    placeItems(gameMap, ITEM_TYPES.SWORD, SWORD_COUNT);

    renderMap(gameMap);
    renderHUD();
}

// ---- Единый игровой цикл --------------------------------------

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

}

document.addEventListener('DOMContentLoaded', () => {
    initGame();
    attachInput(restartGame);
    startGameLoop();          //  единый rAF-цикл
    bindCamera();
    updateCamera();
});
