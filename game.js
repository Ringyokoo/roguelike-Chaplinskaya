const ROWS = 24;
const COLUMNS = 40;
const SIDE_INDENT = 1;
// const TILE_SIZE = 32;

const MIN_ROOM_SIZE = 3;
const MAX_ROOM_SIZE = 8;
const MIN_ROOMS = 5;
const MAX_ROOMS = 10;

const MIN_PATH_COUNT = 1;
const MAX_PATH_COUNT = 2;

const ITEM_TYPES = {

    HEALTH: 'health',
    SWORD: 'sword'
};

const CREATURE_TYPES = {
    PLAYER: 'player',
    ENEMY: 'enemy',
};

const HEALTH_COUNT = 10;
const SWORD_COUNT = 2;

const ENEMY_COUNT = 10;

let playerPosition = null;
let enemies = [];
let gameMapGlobal = [];

const fieldElement = document.querySelector('.field');

function createEmptyMap() {
    const map = new Array(ROWS);
    for (let y = 0; y < ROWS; y++) {
        map[y] = new Array(COLUMNS);
        for (let x = 0; x < COLUMNS; x++) {
            map[y][x] = {
                type: 'wall',
                x,
                y,
                // path: false
            };
        }
    }
    return map;
}


function randomInteger(min, max) {
    let rand = min + Math.random() * (max + 1 - min);
    return Math.floor(rand);
}

function checkCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.w &&
        obj1.x + obj1.w > obj2.x &&
        obj1.y < obj2.y + obj2.h &&
        obj1.y + obj1.h > obj2.y;
}


function getRange(coord, size) {
    let range = [];
    for (let i = 0; i < size; i++) {
        range.push(coord + i);
    }
    return range;
}

function paramRoom() {
    const w = randomInteger(MIN_ROOM_SIZE, MAX_ROOM_SIZE);
    const h = randomInteger(MIN_ROOM_SIZE, MAX_ROOM_SIZE);
    const x = randomInteger(SIDE_INDENT, COLUMNS - w - SIDE_INDENT);
    const y = randomInteger(SIDE_INDENT, ROWS - h - SIDE_INDENT);

    const crossPath = pathXRelevant.some(item => getRange(x, w).includes(item)) || pathYRelevant.some(item => getRange(y, h).includes(item));

    let room = {
        w: w,
        h: h,
        x: x,
        y: y,
        crossPath: crossPath,
    }

    return room;
}



let pathXRelevant = [];
let pathYRelevant = [];
function createPath(map, coord) {
    if (coord == 'x') {
        let x;
        do {
            x = randomInteger(SIDE_INDENT, COLUMNS - 1 - SIDE_INDENT);
            // -1 так как колонки от 0 д 40, в остальных случаях из-за высоты/ширины пропадает
        } while (pathXRelevant.includes(x));

        pathXRelevant.push(x);

        for (let j = SIDE_INDENT; j < ROWS - SIDE_INDENT; j++) {
            map[j][x].type = 'floor';
            map[j][x].path = true;
        }

    } else {
        let y;
        do {
            y = randomInteger(SIDE_INDENT, ROWS - 1 - SIDE_INDENT);

        } while (pathYRelevant.includes(y));
        pathYRelevant.push(y);

        for (let j = SIDE_INDENT; j < COLUMNS - SIDE_INDENT; j++) {
            map[y][j].type = 'floor';
            map[y][j].path = true;
        }
    }

}

function findRoom(cell) {
    return roomsRelevant.find(r =>
        cell.x >= r.x &&
        cell.x < r.x + r.w &&
        cell.y >= r.y &&
        cell.y < r.y + r.h
    );
}


let roomsRelevant = [];
function checkAvailable(map) {
    return roomsRelevant.filter(room => {
        const { x, y, w, h } = room;

        // верх/низ
        for (let i = x; i < x + w; i++) {
            if (map[y + h]?.[i]?.path || map[y - 1]?.[i]?.path || room.crossPath) {
                room.crossPath = true;
                return false;
            }
        }
        // лев/прав
        for (let j = y; j < y + h; j++) {
            if (map[j]?.[x + w]?.path || map[j]?.[x - 1]?.path || room.crossPath) {
                room.crossPath = true;
                return false;
            }
        }

        if (!room.set) room.set = new Set();

        // верх/низ
        for (let i = x; i < x + w; i++) {
            const down = map[y + h]?.[i];
            const up = map[y - 1]?.[i];
            const r1 = down && down.type === 'floor' ? findRoom(down) : null;
            const r2 = up && up.type === 'floor' ? findRoom(up) : null;
            if (r1) room.set.add(r1);
            if (r2) room.set.add(r2);
        }
        // лев/прав
        for (let j = y; j < y + h; j++) {
            const right = map[j]?.[x + w];
            const left = map[j]?.[x - 1];
            const r1 = right && right.type === 'floor' ? findRoom(right) : null;
            const r2 = left && left.type === 'floor' ? findRoom(left) : null;
            if (r1) room.set.add(r1);
            if (r2) room.set.add(r2);
        }

        return true;
    });
}


function pathToNonAvailable(map) {

    let nonAvailable;
    let notNearRoom;

    let c = 0;
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
        // console.log(notNearRoom, nearRoom, notNearRoom.length );
    } while (notNearRoom.length != 0 && c < 25);

}

function groupConnectedObjects(objects) {
    const visited = new Set();
    const result = [];

    for (const obj of objects) {
        if (visited.has(obj)) continue;

        // Находим все связанные объекты
        const connectedGroup = new Set();
        const queue = [obj];

        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current)) continue;

            visited.add(current);
            connectedGroup.add(current);

            for (const neighbor of current.set) {
                if (!visited.has(neighbor)) {
                    queue.push(neighbor);
                }
            }
        }

        // Выбираем представителя и модифицируем его сет
        const representative = Array.from(connectedGroup)[0];
        representative.set = connectedGroup;

        result.push(representative);
    }

    return result;
}



function pathToNonAvailableNearRoom(map) {
    let nonAvailable;
    let nearRoom;
    let nearRoomLast;
    let c = 0;

    do {
        nonAvailable = checkAvailable(map);

        nearRoomLast = nearRoom;
        nearRoom = nonAvailable.filter(item => item?.set?.size !== 0);

        if (nearRoom.length) {
            nearRoom.forEach((currentRoom, index) => {


                const setArray = Array.from(currentRoom.set || []);
                const hasCrossPath = setArray.some(setRoom => setRoom.crossPath === true);

                if (hasCrossPath) {
                    currentRoom.crossPath = true;

                }
            });
        }

        c++;

    } while (nearRoom.length != nearRoomLast?.length && c < 5);
    nearRoom = groupConnectedObjects(nearRoom);
    if (nearRoom.length) {

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
            console.log(nearRoom, nearRoom, nearRoom.length);
        } while (nearRoom.length != 0 && k < 25);

    }

}


// predicate(cell) -> true, если клетка подходит
function findNearest(map, room, predicate) {
    let minDistance = Infinity;
    let nearestCell = null;
    const { x, y, w, h } = room;

    for (let i = x; i < x + w; i++) {
        // вниз 
        for (let yy = y + h; yy < ROWS; yy++) {
            const cell = map[yy]?.[i];
            if (cell && predicate(cell)) {
                const dist = Math.abs(i - x) + Math.abs(yy - y);
                if (dist < minDistance) { minDistance = dist; nearestCell = { x: i, y: yy, coord: 'y' }; }
                break;
            }
        }
        // вверх
        for (let yy = y - 1; yy >= 0; yy--) {
            const cell = map[yy]?.[i];
            if (cell && predicate(cell)) {
                const dist = Math.abs(i - x) + Math.abs(yy - y);
                if (dist < minDistance) { minDistance = dist; nearestCell = { x: i, y: yy, coord: 'y' }; }
                break;
            }
        }
    }


    for (let j = y; j < y + h; j++) {
        // вправо 
        for (let xx = x + w; xx < COLUMNS; xx++) {
            const cell = map[j]?.[xx];
            if (cell && predicate(cell)) {
                const dist = Math.abs(xx - x) + Math.abs(j - y);
                if (dist < minDistance) { minDistance = dist; nearestCell = { x: xx, y: j, coord: 'x' }; }
                break;
            }
        }
        // влево
        for (let xx = x - 1; xx >= 0; xx--) {
            const cell = map[j]?.[xx];
            if (cell && predicate(cell)) {
                const dist = Math.abs(xx - x) + Math.abs(j - y);
                if (dist < minDistance) { minDistance = dist; nearestCell = { x: xx, y: j, coord: 'x' }; }
                break;
            }
        }
    }

    return nearestCell;
}

const neareastFloor = (map, room) => findNearest(map, room, c => c.type === 'floor');
const neareastPath = (map, room) => findNearest(map, room, c => c.path);

function createRoom(map) {
    let room, hasCollision, tries = 0;
    do {
        if (tries++ > 5000) return;
        room = paramRoom();
        hasCollision = roomsRelevant.some(el => checkCollision(room, el));
    } while (hasCollision);

    roomsRelevant.push(room);
    for (let y = room.y; y < room.y + room.h; y++) {
        for (let x = room.x; x < room.x + room.w; x++) {
            map[y][x].type = 'floor';
        }
    }
}

//-----------------------------------------------------------------------------------

// function createRoom(map) {

//     let room;
//     let hasCollision;

//     do {

//         room = paramRoom();
//         hasCollision = false;

//         for (const element of roomsRelevant) {
//             if (checkCollision(room, element)) {
//                 hasCollision = true;
//                 break;
//             }
//         }

//     } while (hasCollision);

//     roomsRelevant.push(room);

//     for (let i = room.y; i < room.y + room.h; i++) {
//         for (let j = room.x; j < room.x + room.w; j++) {
//             map[i][j].type = 'floor';
//         }
//     }
// }

function placeItems(map, itemType, count) {
    let placed = 0;
    const maxAttempts = 1000; // попыток //do while

    while (placed < count && maxAttempts > 0) {
        const x = randomInteger(SIDE_INDENT, COLUMNS - SIDE_INDENT - 1);
        const y = randomInteger(SIDE_INDENT, ROWS - SIDE_INDENT - 1);


        if (map[y][x].type === "floor" && !map[y][x].item && !map[y][x].creature) {
            map[y][x].item = itemType;
            placed++;
        }
    }

    if (placed < count) {
        console.warn(`Не удалось разместить все ${itemType}. Размещено: ${placed}/${count}`);
    }
}


function placePlayer(map) {
    let placed = false;
    let attempts = 0;

    while (!placed && attempts < 1000) {  //do while
        const x = randomInteger(SIDE_INDENT, COLUMNS - SIDE_INDENT - 1);
        const y = randomInteger(SIDE_INDENT, ROWS - SIDE_INDENT - 1);

        if (map[y][x].type === "floor" && !map[y][x].item && !map[y][x].creature) {
            map[y][x].creature = {
                type: CREATURE_TYPES.PLAYER,
                health: 100,
                maxHealth: PLAYER_MAX_HEALTH,
                attack: 10
            };
            playerPosition = { x, y };
            placed = true;
        }

        attempts++;
    }
}

function placeEnemies(map, count) {
    let placed = 0;
    let maxAttempts = count * 100;

    while (placed < count && maxAttempts > 0) { //do while
        const x = randomInteger(SIDE_INDENT, COLUMNS - SIDE_INDENT - 1);
        const y = randomInteger(SIDE_INDENT, ROWS - SIDE_INDENT - 1);

        const distanceToPlayer = playerPosition ?
            Math.sqrt(Math.pow(x - playerPosition.x, 2) + Math.pow(y - playerPosition.y, 2)) : 10;

        if (map[y][x].type === "floor" &&
            !map[y][x].item &&
            !map[y][x].creature &&
            distanceToPlayer > 5) {

            map[y][x].creature = {
                type: CREATURE_TYPES.ENEMY,
                health: 30,
                maxHealth: 30,
                attack: 20,
                id: `enemy_${Date.now()}_${Math.random()}`
            };
            placed++;
        }
        maxAttempts--;
    }
}



const MOVE_DELAY = 90; // мс
let lastMoveTime = 0;
const tileCache = new Map();
fieldElement.setAttribute('tabindex', '0');
fieldElement.setAttribute('role', 'application');
fieldElement.setAttribute('aria-label', 'Игровое поле');


function keyToDelta(e) {
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w' || k === 'ц') return { dx: 0, dy: -1 };
    if (k === 'arrowdown' || k === 's' || k === 'ы') return { dx: 0, dy: 1 };
    if (k === 'arrowleft' || k === 'a' || k === 'ф') return { dx: -1, dy: 0 };
    if (k === 'arrowright' || k === 'd' || k === 'в') return { dx: 1, dy: 0 };
    return null;
}

function renderMap(map) {
    gameMapGlobal = map;
    tileCache.clear();
    fieldElement.textContent = '';

    // Используем DocumentFragment для массовой вставки
    const frag = document.createDocumentFragment();

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLUMNS; x++) {
            const tile = map[y][x];
            const el = createTileElement(x, y, tile);

            frag.appendChild(el);

            if (tile.creature?.type === 'player') {
                playerPosition = { x, y };
            }
        }
    }

    fieldElement.appendChild(frag);
    //   console.log(fieldElement)
    fieldElement.focus();
}

function createTileElement(x, y, tile) {
    const el = document.createElement('div');
    el.className = tileClass(tile.type);
    el.dataset.x = x;
    el.dataset.y = y;

    tileCache.set(keyOf(x, y), el);

    if (tile.item) el.appendChild(makeChild('item', tile.item));
    if (tile.creature) el.appendChild(makeChild('creature', tile.creature.type));

    // добавим полоску HP
    el.appendChild(createHpBar(tile));

    return el;
}

function tileClass(type) {
    return `tile ${type}`;
}

function makeChild(kind, name) {
    const child = document.createElement('div');

    child.className = `${kind} ${name}`;
    return child;
}

function keyOf(x, y) {
    return `${x},${y}`;
}

function updateTile(x, y) {
    const el = tileCache.get(keyOf(x, y));
    if (!el) return;
    const tile = gameMapGlobal[y][x];

    const newClass = tileClass(tile.type);
    if (el.className !== newClass) el.className = newClass;

    while (el.firstChild) el.removeChild(el.firstChild);

    if (tile.item) el.appendChild(makeChild('item', tile.item));
    if (tile.creature) el.appendChild(makeChild('creature', tile.creature.type));
    el.appendChild(createHpBar(tile)); // всегда добавляем полоску
}



let pendingUpdates = []; // массив {x,y} для пачки
let rAFScheduled = false;

function scheduleUpdate(x, y) {
    pendingUpdates.push({ x, y });
    if (rAFScheduled) return;
    rAFScheduled = true;
    requestAnimationFrame(flushUpdates);
}

function flushUpdates() {
    // Убираем дубли
    const seen = new Set();
    for (let i = pendingUpdates.length - 1; i >= 0; i--) {
        const { x, y } = pendingUpdates[i];
        const k = keyOf(x, y);
        if (seen.has(k)) {
            pendingUpdates.splice(i, 1);
        } else {
            seen.add(k);
        }
    }

    // Обновляем целевые тайлы
    for (const { x, y } of pendingUpdates) updateTile(x, y);

    pendingUpdates = [];
    rAFScheduled = false;
}


function handleMovement(dx, dy) {
    const now = performance.now();
    if (now - lastMoveTime < MOVE_DELAY) return;
    if (gameOver) return;

    const fromX = playerPosition.x;
    const fromY = playerPosition.y;
    const nx = fromX + dx;
    const ny = fromY + dy;

    if (!canMoveTo(nx, ny)) return;

    // сохраняем объект игрока, чтобы не терять статы
    const playerObj = gameMapGlobal[fromY][fromX].creature;

    // снять со старого
    gameMapGlobal[fromY][fromX].creature = null;
    // поставить на новый
    gameMapGlobal[ny][nx].creature = playerObj;

    // батчим минимальные апдейты
    scheduleUpdate(fromX, fromY);
    scheduleUpdate(nx, ny);

    playerPosition = { x: nx, y: ny };
    lastMoveTime = now;

    // подбор предметов под ногами
    processPlayerPickup();
    renderHUD();

}


function canMoveTo(x, y) {
    if (x < 0 || x >= COLUMNS || y < 0 || y >= ROWS) return false;
    const tile = gameMapGlobal[y][x];
    // проходим только по полу и если никого нет
    return tile.type === 'floor' && !tile.creature;
}

// --- Combat & Items ---
const PLAYER_MAX_HEALTH = 100;
const HEAL_AMOUNT = 25;   // сколько лечит зелье
const SWORD_BONUS = 5;    // разовый бонус к удару за меч

function isInside(x, y) {
    return x >= 0 && x < COLUMNS && y >= 0 && y < ROWS;
}
function neighbors4(x, y) {
    return [
        { x, y: y - 1 },
        { x, y: y + 1 },
        { x: x - 1, y },
        { x: x + 1, y },
    ].filter(p => isInside(p.x, p.y));
}
function getEnemiesPositions() {
    const res = [];
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLUMNS; x++) {
            const c = gameMapGlobal[y][x].creature;
            if (c?.type === CREATURE_TYPES.ENEMY) res.push({ x, y });
        }
    }
    return res;
}

function processPlayerPickup() {
    const { x, y } = playerPosition;
    const tile = gameMapGlobal[y][x];
    const player = tile.creature; // уже стоит на тайле

    if (!player) return;

    if (tile.item === ITEM_TYPES.HEALTH) {
        player.health = Math.min(PLAYER_MAX_HEALTH, player.health + HEAL_AMOUNT);
        tile.item = null;
        scheduleUpdate(x, y);
        // console.log(`Лечимся на ${HEAL_AMOUNT}. HP=${player.health}`);
    } else if (tile.item === ITEM_TYPES.SWORD) {
        player.attack += SWORD_BONUS;
        tile.item = null;
        scheduleUpdate(x, y);
        // console.log(`Подняли меч. ATK=${player.attack}`);
    }
    renderHUD();
}

let gameOver = false;

const ENEMY_TICK_MS = 800; // частота шага врагов в мс
let enemyTimer = null;
let enemyStepping = false; // защита от наложений тиков
function startEnemyAI() {
    stopEnemyAI();
    enemyTimer = setInterval(() => {
        if (!gameOver) enemyStep();
    }, ENEMY_TICK_MS);

    // На всякий — пауза, если вкладка скрыта
    //   document.addEventListener('visibilitychange', () => {
    //     if (document.hidden) stopEnemyAI();
    //     else if (!gameOver) startEnemyAI();
    //   }, { once: true });
}

function stopEnemyAI() {
    if (enemyTimer) {
        clearInterval(enemyTimer);
        enemyTimer = null;
    }
}
function enemyStep() {
    if (enemyStepping || gameOver) return;
    enemyStepping = true;
    try {
        // === ДВИЖЕНИЕ ===
        const enemies = getEnemiesPositions();
        const reserved = new Set();
        const moved = [];
        const keyOfPos = (x, y) => `${x},${y}`;

        // Снимок позиции игрока для принятия решений
        const px = playerPosition?.x, py = playerPosition?.y;

        for (const { x, y } of enemies) {
            if (gameMapGlobal[y][x].creature?.type !== CREATURE_TYPES.ENEMY) continue;

            // Если враг уже рядом с игроком — не двигаем его в этом тике.
            // Он останется на месте и укусит в фазе атаки.
            const adjToPlayer = (typeof px === 'number') && (Math.abs(x - px) + Math.abs(y - py) === 1);
            if (adjToPlayer) {
                continue; // ← ключевая строка
            }

            // Кандидаты на движение (для НЕ-соседних)
            const candidates = [{ x, y }, ...neighbors4(x, y)];

            if (typeof px === 'number') {
                // тянемся к игроку, но без строевой подготовки
                candidates.sort((a, b) => (
                    (Math.abs(a.x - px) + Math.abs(a.y - py)) - (Math.abs(b.x - px) + Math.abs(b.y - py))
                ));
                if (Math.random() < 0.35) candidates.reverse();
            } else {
                candidates.sort(() => Math.random() - 0.5);
            }

            let movedTo = null;
            for (const d of candidates) {
                const dest = gameMapGlobal[d.y][d.x];
                const k = keyOfPos(d.x, d.y);
                if (dest.type === 'floor' && !dest.creature && !reserved.has(k)) {
                    movedTo = d;
                    reserved.add(k);
                    break;
                }
            }
            if (movedTo) moved.push({ from: { x, y }, to: movedTo });
        }


        // Применяем перемещения
        for (const m of moved) {
            const fromTile = gameMapGlobal[m.from.y][m.from.x];
            const toTile = gameMapGlobal[m.to.y][m.to.x];
            const enemyObj = fromTile.creature;
            if (enemyObj?.type === CREATURE_TYPES.ENEMY && !toTile.creature && toTile.type === 'floor') {
                fromTile.creature = null;
                toTile.creature = enemyObj;
                scheduleUpdate(m.from.x, m.from.y);
                scheduleUpdate(m.to.x, m.to.y);
            }
        }

        // === АТАКИ ПОСЛЕ ДВИЖЕНИЯ ===
        if (!playerPosition) { renderHUD(); return; }
        const p = playerPosition;
        const adj = neighbors4(p.x, p.y);
        let totalDamage = 0;
        for (const { x, y } of adj) {
            const c = gameMapGlobal[y][x].creature;
            if (c?.type === CREATURE_TYPES.ENEMY) totalDamage += c.attack;
        }
        if (totalDamage > 0) {
            const ptile = gameMapGlobal[p.y][p.x];
            if (ptile?.creature?.type === CREATURE_TYPES.PLAYER) {
                ptile.creature.health -= totalDamage;
                scheduleUpdate(p.x, p.y);
                if (ptile.creature.health <= 0) {
                    ptile.creature = null;
                    scheduleUpdate(p.x, p.y);
                    gameOver = true;
                    stopEnemyAI();
                    renderHUD();
                }
            }
        }
        renderHUD();
    } finally {
        enemyStepping = false;
    }
}



function playerAttack() {
    const now = performance.now();
    if (now - lastMoveTime < MOVE_DELAY) return;
    if (gameOver) return;

    const { x, y } = playerPosition;
    const ptile = gameMapGlobal[y][x];
    const player = ptile.creature;
    if (!player || player.type !== CREATURE_TYPES.PLAYER) return;

    let hit = false;

    for (const n of neighbors4(x, y)) {
        const t = gameMapGlobal[n.y][n.x];
        const c = t.creature;
        if (c?.type === CREATURE_TYPES.ENEMY) {
            c.health -= player.attack;
            hit = true;
            if (c.health <= 0) {
                t.creature = null; // враг умер
            }
            scheduleUpdate(n.x, n.y);
        }
    }

    if (hit) {
        lastMoveTime = now;
        renderHUD();
    }
}


function createHpBar(tile) {
    const bar = document.createElement('div');
    bar.className = 'hpbar';
    const fill = document.createElement('div');
    fill.className = 'hpbar-fill';
    // стартовая ширина
    const c = tile.creature;
    const pct = c ? Math.max(0, Math.min(100, Math.round((c.health / c.maxHealth) * 100))) : 0;
    fill.style.width = c ? pct + '%' : '0%';
    bar.appendChild(fill);
    return bar;
}


function renderHUD() {
    const hpFill = document.getElementById('hudHp');
    const hpText = document.getElementById('hudHpText');
    const atkText = document.getElementById('hudAtk');
    const hud = document.querySelector('.hud');

    let hp = 0;
    let maxHp = PLAYER_MAX_HEALTH || 100;
    let atk = 0;

    if (playerPosition) {
        const tile = gameMapGlobal[playerPosition.y]?.[playerPosition.x];
        const p = tile?.creature;
        if (p?.type === CREATURE_TYPES.PLAYER) {
            hp = Math.max(0, p.health ?? 0);
            maxHp = p.maxHealth ?? maxHp;
            atk = p.attack ?? 0;
        }
    }

    const pct = Math.max(0, Math.min(100, Math.round((hp / maxHp) * 100)));
    if (hpFill) hpFill.style.width = pct + '%';
    if (hpText) hpText.textContent = `${hp}/${maxHp}`;
    if (atkText) atkText.textContent = atk;

    // косметика "мертв"
    hud?.classList.toggle('hud--dead', hp <= 0);
}

// ==== Инициализация игры ====
function initGame() {
    const gameMap = createEmptyMap();
    // console.log('initGame');
    // Генерация карты
    for (let i = 0, n = randomInteger(MIN_PATH_COUNT, MAX_PATH_COUNT); i < n; i++) {
        createPath(gameMap, 'x');
    }
    for (let i = 0, n = randomInteger(MIN_PATH_COUNT, MAX_PATH_COUNT); i < n; i++) {
        createPath(gameMap, 'y');
    }
    for (let i = 0, n = randomInteger(MIN_ROOMS, MAX_ROOMS); i < n; i++) {
        createRoom(gameMap);
    }

    pathToNonAvailable(gameMap);
    pathToNonAvailableNearRoom(gameMap);
    //    console.log(gameMap);
    // Размещение сущностей
    placePlayer(gameMap);
    placeEnemies(gameMap, ENEMY_COUNT);
    placeItems(gameMap, ITEM_TYPES.HEALTH, HEALTH_COUNT);
    placeItems(gameMap, ITEM_TYPES.SWORD, SWORD_COUNT);

    renderMap(gameMap);
    renderHUD();
    startEnemyAI();
}

fieldElement.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        playerAttack();
        return;
    }
    const delta = keyToDelta(e);
    if (!delta) return;
    e.preventDefault();
    handleMovement(delta.dx, delta.dy);
});


// Автофокус при клике по полю
fieldElement.addEventListener('mousedown', () => fieldElement.focus());

// ==== Запуск ====
document.addEventListener('DOMContentLoaded', initGame);
