import { state } from './state.js';
import { MOVE_DELAY } from './config.js';
import { scheduleUpdate, renderHUD } from './render.js';
import { playerAttack } from './combat.js';
import { applyPlayerAppearance } from './render.js';

function isTextInputFocused() {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName?.toLowerCase();
    const editable = el.getAttribute && el.getAttribute('contenteditable');
    return tag === 'input' || tag === 'textarea' || editable === 'true';
}

function keyToDelta(e) {
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w' || k === 'ц') return { dx: 0, dy: -1 };
    if (k === 'arrowdown' || k === 's' || k === 'ы') return { dx: 0, dy: 1 };
    if (k === 'arrowleft' || k === 'a' || k === 'ф') return { dx: -1, dy: 0 };
    if (k === 'arrowright' || k === 'd' || k === 'в') return { dx: 1, dy: 0 };
    return null;
}

function canMoveTo(x, y) {
    const row = state.gameMap[y];
    if (!row) return false;
    const tile = row[x];
    return !!tile && tile.type === 'floor' && !tile.creature;
}

function processPlayerPickup() {
    const { x, y } = state.playerPosition;
    const tile = state.gameMap[y][x];
    const player = tile.creature;
    if (!player) return;

    if (tile.item === 'health') {
        player.health = Math.min(player.maxHealth, player.health + 25);
        tile.item = null;
        scheduleUpdate(x, y);
    } else if (tile.item === 'sword') {
        player.attack += 5;
        tile.item = null;
        scheduleUpdate(x, y);
    }
    renderHUD();
}

export function attachInput(onRestart) {
    window.addEventListener('keydown', e => {
        if (isTextInputFocused()) return;
        if (state.gameOver && e.key.toLowerCase() !== 'r' && e.key.toLowerCase() !== 'к') return;
        if (e.code === 'Space') { e.preventDefault(); playerAttack(); return; }
        if (e.key.toLowerCase() === 'r' || e.key.toLowerCase() === 'к') { e.preventDefault(); onRestart?.(); return; }
        const delta = keyToDelta(e);
        if (!delta) return;
        e.preventDefault();
        const now = performance.now();
        if (now - state.lastMoveTime < MOVE_DELAY) return;
        if (state.gameOver) return;

        const fromX = state.playerPosition.x;
        const fromY = state.playerPosition.y;
        const nx = fromX + delta.dx;
        const ny = fromY + delta.dy;

        if (!canMoveTo(nx, ny)) return;

        // Направление для визуала
        const dir =
            delta.dx === 1 ? 'right' :
                delta.dx === -1 ? 'left' :
                    delta.dy === 1 ? 'down' : 'up';
        state.playerDir = dir;
        state.playerWalking = true;
        applyPlayerAppearance(dir, true);

        const playerObj = state.gameMap[fromY][fromX].creature;
        state.gameMap[fromY][fromX].creature = null;
        state.gameMap[ny][nx].creature = playerObj;

        scheduleUpdate(fromX, fromY);
        scheduleUpdate(nx, ny);

        state.playerPosition = { x: nx, y: ny };
        state.lastMoveTime = now;

        processPlayerPickup();
        renderHUD();

        // Остановим ходьбу после завершения шага
        setTimeout(() => {
            state.playerWalking = false;
            applyPlayerAppearance(state.playerDir, false);
        }, MOVE_DELAY);
    });

    // Автофокус по клику
    // field.addEventListener('mousedown', () => field.focus());
}
