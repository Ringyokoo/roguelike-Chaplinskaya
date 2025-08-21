import { state } from './state.js';
import {
    SIDE_INDENT, COLUMNS, ROWS, PLAYER_MAX_HEALTH, CREATURE_TYPES
} from './config.js';
// import { CREATURE_TYPES } from './enums.js';
import { randomInteger } from './utils.js';

export function placePlayer(map) {
    let placed = false, attempts = 0;
    while (!placed && attempts < 1000) {
        const x = randomInteger(SIDE_INDENT, COLUMNS - SIDE_INDENT - 1);
        const y = randomInteger(SIDE_INDENT, ROWS - SIDE_INDENT - 1);
        const cell = map[y][x];
        if (cell.type === 'floor' && !cell.item && !cell.creature) {
            cell.creature = { type: CREATURE_TYPES.PLAYER, health: 100, maxHealth: PLAYER_MAX_HEALTH, attack: 10 };
            state.playerPosition = { x, y };
            placed = true;
        }
        attempts++;
    }
}

export function placeEnemies(map, count) {
    let placed = 0, attempts = count * 100;
    while (placed < count && attempts-- > 0) {
        const x = randomInteger(SIDE_INDENT, COLUMNS - SIDE_INDENT - 1);
        const y = randomInteger(SIDE_INDENT, ROWS - SIDE_INDENT - 1);
        const dist = state.playerPosition ? Math.hypot(x - state.playerPosition.x, y - state.playerPosition.y) : 10;
        const cell = map[y][x];
        if (cell.type === 'floor' && !cell.item && !cell.creature && dist > 5) {
            const enemy = {
                type: CREATURE_TYPES.ENEMY,
                health: 30, maxHealth: 30, attack: 20,
                id: `enemy_${Date.now()}_${Math.random()}`,
            };
            cell.creature = enemy;
            state.enemies.set(enemy.id, { x, y });
            placed++;
        }
    }
}
