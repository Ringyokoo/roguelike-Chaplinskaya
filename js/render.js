import { state } from './state.js';
import { PLAYER_MAX_HEALTH } from './config.js';
import { keyOf } from './utils.js';

function tileClass(type) { return `tile ${type}`; }
function makeChild(kind, name) {
    const div = document.createElement('div');
    div.className = `${kind} ${name}`;
    return div;
}

// Внешний вид игрока: только запись в DOM, источник истины — state
export function applyPlayerAppearance(dir = state.playerDir, walking = state.playerWalking) {
    const pos = state.playerPosition;
    if (!pos) return;
    const key = keyOf(pos.x, pos.y);
    const el = state.tileCache.get(key);
    if (!el) return;
    const parts = state.tileParts.get(key);
    if (!parts || !parts.creatureEl) return;
    const cls = ['creature', 'player', `dir-${dir}`];
    if (walking) cls.push('walking');
    parts.creatureEl.className = cls.join(' ');
}

export function createHpBar(tile) {
    const bar = document.createElement('div');
    bar.className = 'hpbar';
    const fill = document.createElement('div');
    fill.className = 'hpbar-fill';
    const c = tile.creature;
    const pct = c ? Math.max(0, Math.min(100, Math.round((c.health / c.maxHealth) * 100))) : 0;
    fill.style.width = c ? pct + '%' : '0%';
    bar.appendChild(fill);
    return bar;
}

export function createTileElement(x, y, tile) {
    const el = document.createElement('div');
    el.className = tileClass(tile.type);
    const key = keyOf(x, y);
    state.tileCache.set(key, el);
    const parts = { itemEl: null, creatureEl: null, hpBar: null, hpFill: null };

    if (tile.item) {
        parts.itemEl = makeChild('item', tile.item);
        el.appendChild(parts.itemEl);
    }
    if (tile.creature) {
        parts.creatureEl = makeChild('creature', tile.creature.type);
        el.appendChild(parts.creatureEl);
        const bar = createHpBar(tile);
        parts.hpBar = bar; parts.hpFill = bar.firstChild;
        el.appendChild(bar);
        // Если это игрок — сразу применим внешний вид из state
        if (tile.creature.type === 'player') {
            const cls = ['creature', 'player', `dir-${state.playerDir}`];
            if (state.playerWalking) cls.push('walking');
            parts.creatureEl.className = cls.join(' ');
        }
    }
    state.tileParts.set(key, parts);
    return el;
}


export function updateTile(x, y) {
    const key = keyOf(x, y);
    const el = state.tileCache.get(key);
    if (!el) return;
    const tile = state.gameMap[y][x];
    const newClass = tileClass(tile.type);
    if (el.className !== newClass) el.className = newClass;


    // дифф через state.tileParts (как мы уже сделали ранее)
    let parts = state.tileParts.get(key);
    if (!parts) { parts = { itemEl: null, creatureEl: null, hpBar: null, hpFill: null }; state.tileParts.set(key, parts); }
    // item
    if (tile.item) {
        if (!parts.itemEl) { parts.itemEl = makeChild('item', tile.item); el.appendChild(parts.itemEl); }
        else if (!parts.itemEl.classList.contains(tile.item)) parts.itemEl.className = `item ${tile.item}`;
    } else if (parts.itemEl) { parts.itemEl.remove(); parts.itemEl = null; }
    // creature + hpbar
    if (tile.creature) {
        const type = tile.creature.type;
        if (!parts.creatureEl) { parts.creatureEl = makeChild('creature', type); el.appendChild(parts.creatureEl); }
        else if (!parts.creatureEl.classList.contains(type)) parts.creatureEl.className = `creature ${type}`;
        const hpPct = Math.max(0, Math.min(100, Math.round((tile.creature.health / tile.creature.maxHealth) * 100)));
        if (!parts.hpBar) { const bar = createHpBar(tile); parts.hpBar = bar; parts.hpFill = bar.firstChild; el.appendChild(bar); }
        else if (parts.hpFill) { parts.hpFill.style.width = hpPct + '%'; }
        // если это игрок — обновим классы под направление/ходьбу
        if (type === 'player') applyPlayerAppearance();
    } else {
        if (parts.creatureEl) { parts.creatureEl.remove(); parts.creatureEl = null; }
        if (parts.hpBar) { parts.hpBar.remove(); parts.hpBar = null; parts.hpFill = null; }
    }

}

export function scheduleUpdate(x, y) {
    state.pendingUpdates.push({ x, y });
    if (state.rAFScheduled) return;
    state.rAFScheduled = true;
    requestAnimationFrame(flushUpdates);
}

function flushUpdates() {
    const seen = new Set();
    for (let i = state.pendingUpdates.length - 1; i >= 0; i--) {
        const { x, y } = state.pendingUpdates[i];
        const k = keyOf(x, y);
        if (seen.has(k)) state.pendingUpdates.splice(i, 1);
        else seen.add(k);
    }
    for (const { x, y } of state.pendingUpdates) updateTile(x, y);
    state.pendingUpdates = [];
    state.rAFScheduled = false;
}

export function renderMap(map) {
    state.gameMap = map;
    state.tileCache.clear();
    state.tileParts.clear();
    const field = state.dom.fieldElement;
    field.textContent = '';
    const frag = document.createDocumentFragment();
    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[0].length; x++) {
            const tile = map[y][x];
            const el = createTileElement(x, y, tile);
            if (tile.creature?.type === 'player') state.playerPosition = { x, y };
            frag.appendChild(el);
        }
    }
    field.appendChild(frag);
    field.setAttribute('tabindex', '0');
    field.setAttribute('role', 'application');
    field.setAttribute('aria-label', 'Игровое поле');
    field.focus();
}

export function renderHUD() {
    const hpFill = state.dom.hudHpFill;
    const hpText = state.dom.hudHpText;
    const atkText = state.dom.hudAtk;
    const hud = state.dom.hudRoot;

    let hp = 0, maxHp = PLAYER_MAX_HEALTH, atk = 0;
    if (state.playerPosition) {
        const tile = state.gameMap[state.playerPosition.y]?.[state.playerPosition.x];
        const p = tile?.creature;
        if (p?.type === 'player') {
            hp = Math.max(0, p.health ?? 0);
            maxHp = p.maxHealth ?? maxHp;
            atk = p.attack ?? 0;
        }
    }
    const pct = Math.max(0, Math.min(100, Math.round((hp / maxHp) * 100)));
    if (hpFill) hpFill.style.width = pct + '%';
    if (hpText) hpText.textContent = `${hp}/${maxHp}`;
    if (atkText) atkText.textContent = atk;
    hud?.classList.toggle('hud--dead', hp <= 0);
}

// export function applyPlayerAppearance(dir, walking) {
//   const { x, y } = state.playerPosition || {};
//   if (x == null) return;
//   const key = keyOf(x, y);
//   const el = state.tileCache.get(key);
//   if (!el) return;

//   // достаем кэш частей
//   let parts = state.tileParts.get(key);
//   if (!parts || !parts.creatureEl) return;

//   const cls = ['creature', 'player', `dir-${dir}`];
//   if (walking) cls.push('walking');
//   parts.creatureEl.className = cls.join(' ');
// }
