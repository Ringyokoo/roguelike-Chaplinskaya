 const ROWS = 24;
 const COLUMNS = 40;
 const SIDE_INDENT = 1;

 const MIN_ROOM_SIZE = 3;
 const MAX_ROOM_SIZE = 8;
 const MIN_ROOMS = 5;
 const MAX_ROOMS = 10;

 const MIN_PATH_COUNT = 3;
 const MAX_PATH_COUNT = 5;

 const HEALTH_COUNT = 10;
 const SWORD_COUNT = 2;
 const ENEMY_COUNT = 10;

 const PLAYER_MAX_HEALTH = 100;
 const HEAL_AMOUNT = 25;
 const SWORD_BONUS = 5;

 const MOVE_DELAY = 90;     // мс
 const ENEMY_TICK_MS = 500; // мс

 const ENEMY_HEALTH = 30;
 const ENEMY_ATTACK = 10;
 const ENEMY_MAX_HEALTH = 30;
   const HURT_MS = 240;
  const ATTACK_MS = 360;

 const ITEM_TYPES = {
  HEALTH: 'health',
  SWORD: 'sword',
};

 const CREATURE_TYPES = {
  PLAYER: 'player',
  ENEMY: 'enemy',
};

 const state = {
    playerPosition: null,
    gameMap: [],
    roomsRelevant: [],
    pathXRelevant: [],
    pathYRelevant: [],
    //   enemyTimer: null,
    //   enemyStepping: false,
    enemyStepping: false,
    enemies: new Map(),   // id -> {x,y}
    gradient: null,       // поле расстояний до игрока (BFS)
    playerDir: 'down',
    playerAttacking: false,
    playerHurt: false,
    lastGradientTs: 0,
    playerMovedTs: 0,

    gameOver: false,
    lastMoveTime: 0,
    loop: { running: false, lastTs: 0, accEnemy: 0 },
    camera: { tx: 0, ty: 0 },
    // кеш DOM
    dom: {
        fieldElement: document.querySelector('.field'),
        hudHpFill: document.getElementById('hudHp'),
        hudHpText: document.getElementById('hudHpText'),
        hudAtk: document.getElementById('hudAtk'),
        hudRoot: document.querySelector('.hud'),
        viewport: document.querySelector('.viewport'),
    },
    // рендер-кеш
    tileCache: new Map(),
    tileParts: new Map(),      // ключ "x,y" -> { itemEl, creatureEl, hpBar, hpFill }
    pendingUpdates: [],
    rAFScheduled: false,
};

 const keyOf = (x, y) => `${x},${y}`;

 function randomInteger(min, max) {
  return Math.floor(min + Math.random() * (max + 1 - min));
}

 function checkCollision(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

 function getRange(coord, size) {
  const out = [];
  for (let i = 0; i < size; i++) out.push(coord + i);
  return out;
}

function openDialog() {
  // const d = state.dom.infoDialog;
  const d = document.getElementById('infoDiolog');
  if (!d) return;

  if (typeof d.showModal === 'function') {
    if (!d.open) d.showModal();
  } else {
    d.setAttribute('open', '');
  }
}

// function countEnemies() {
//   let n = 0;
//   const map = state.gameMap;
//   for (let y = 0; y < map.length; y++) {
//     const row = map[y];
//     for (let x = 0; x < row.length; x++) {
//       if (row[x].creature?.type === 'enemy') n++;
//     }
//   }
//   return n;
// }

 function checkEndConditions() {
  if (state.gameOver || getEnemiesPositions().length === 0) { //countEnemies() === 0
    openDialog();
    return;
  }
}

 function closeDialog() {
  const d = document.getElementById('infoDiolog');
  if (d?.open) d.close();
}

 function createEmptyMap() {
  const map = new Array(ROWS);
  for (let y = 0; y < ROWS; y++) {
    map[y] = new Array(COLUMNS);
    for (let x = 0; x < COLUMNS; x++) {
      map[y][x] = { type: 'wall', x, y /*, path:false*/ };
    }
  }
  return map;
}

 function createPath(map, coord) {
  if (coord === 'x') {
    let x;
    do { x = SIDE_INDENT + Math.floor(Math.random() * (COLUMNS - 2 * SIDE_INDENT)); }
    while (state.pathXRelevant.includes(x));

    state.pathXRelevant.push(x);
    for (let j = SIDE_INDENT; j < ROWS - SIDE_INDENT; j++) {
      map[j][x].type = 'floor';
      map[j][x].path = true;
    }
  } else {
    let y;
    do { y = SIDE_INDENT + Math.floor(Math.random() * (ROWS - 2 * SIDE_INDENT)); }
    while (state.pathYRelevant.includes(y));

    state.pathYRelevant.push(y);
    for (let j = SIDE_INDENT; j < COLUMNS - SIDE_INDENT; j++) {
      map[y][j].type = 'floor';
      map[y][j].path = true;
    }
  }
}



function neareastFloor(map, room) {
  return findNearest(map, room, c => c.type === 'floor');
}
function neareastPath(map, room) {
  return findNearest(map, room, c => c.path);
}


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
 function paramRoom() {
  const w = randomInteger(MIN_ROOM_SIZE, MAX_ROOM_SIZE);
  const h = randomInteger(MIN_ROOM_SIZE, MAX_ROOM_SIZE);
  const x = randomInteger(SIDE_INDENT, COLUMNS - w - SIDE_INDENT);
  const y = randomInteger(SIDE_INDENT, ROWS - h - SIDE_INDENT);

  const crossPath =
    state.pathXRelevant.some(item => getRange(x, w).includes(item)) ||
    state.pathYRelevant.some(item => getRange(y, h).includes(item));

  return { w, h, x, y, crossPath };
}

 function findRoom(cell) {
  return state.roomsRelevant.find(r =>
    cell.x >= r.x && cell.x < r.x + r.w && cell.y >= r.y && cell.y < r.y + r.h
  );
}

 function createRoom(map) {
  let room, hasCollision, tries = 0;
  do {
    if (tries++ > 5000) return;
    room = paramRoom();
    hasCollision = state.roomsRelevant.some(el => checkCollision(room, el));
  } while (hasCollision);

  state.roomsRelevant.push(room);
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      map[y][x].type = 'floor';
    }
  }
}

 function checkAvailable(map) {
  return state.roomsRelevant.filter(room => {
    const { x, y, w, h } = room;

    for (let i = x; i < x + w; i++) {
      if (map[y + h]?.[i]?.path || map[y - 1]?.[i]?.path || room.crossPath) {
        room.crossPath = true; return false;
      }
    }
    for (let j = y; j < y + h; j++) {
      if (map[j]?.[x + w]?.path || map[j]?.[x - 1]?.path || room.crossPath) {
        room.crossPath = true; return false;
      }
    }

    if (!room.set) room.set = new Set();

    for (let i = x; i < x + w; i++) {
      const down = map[y + h]?.[i], up = map[y - 1]?.[i];
      const r1 = down && down.type === 'floor' ? findRoom(down) : null;
      const r2 = up && up.type === 'floor' ? findRoom(up) : null;
      if (r1) room.set.add(r1);
      if (r2) room.set.add(r2);
    }
    for (let j = y; j < y + h; j++) {
      const right = map[j]?.[x + w], left = map[j]?.[x - 1];
      const r1 = right && right.type === 'floor' ? findRoom(right) : null;
      const r2 = left && left.type === 'floor' ? findRoom(left) : null;
      if (r1) room.set.add(r1);
      if (r2) room.set.add(r2);
    }
    return true;
  });
}

 function groupConnectedObjects(objects) {
  const visited = new Set();
  const result = [];
  for (const obj of objects) {
    if (visited.has(obj)) continue;
    const connected = new Set();
    const q = [obj];
    while (q.length) {
      const cur = q.shift();
      if (visited.has(cur)) continue;
      visited.add(cur);
      connected.add(cur);
      for (const nb of cur.set) if (!visited.has(nb)) q.push(nb);
    }
    const repr = Array.from(connected)[0];
    repr.set = connected;
    result.push(repr);
  }
  return result;
}

 function findNearest(map, room, predicate) {
  let minDistance = Infinity, nearestCell = null;
  const { x, y, w, h } = room;

  for (let i = x; i < x + w; i++) {
    for (let yy = y + h; yy < ROWS; yy++) {
      const cell = map[yy]?.[i];
      if (cell && predicate(cell)) {
        const dist = Math.abs(i - x) + Math.abs(yy - y);
        if (dist < minDistance) { minDistance = dist; nearestCell = { x: i, y: yy, coord: 'y' }; }
        break;
      }
    }
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
    for (let xx = x + w; xx < COLUMNS; xx++) {
      const cell = map[j]?.[xx];
      if (cell && predicate(cell)) {
        const dist = Math.abs(xx - x) + Math.abs(j - y);
        if (dist < minDistance) { minDistance = dist; nearestCell = { x: xx, y: j, coord: 'x' }; }
        break;
      }
    }
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

 function placeItems(map, itemType, count) {
    let placed = 0;
    let attempts = 1000;
    while (placed < count && attempts-- > 0) {
        const x = randomInteger(SIDE_INDENT, COLUMNS - SIDE_INDENT - 1);
        const y = randomInteger(SIDE_INDENT, ROWS - SIDE_INDENT - 1);
        const cell = map[y][x];
        if (cell.type === 'floor' && !cell.item && !cell.creature) {
            cell.item = itemType;
            placed++;
        }
    }
    if (placed < count) console.warn(`Не всё уместилось: ${placed}/${count}`);
}

 function placePlayer(map) {
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

 function placeEnemies(map, count) {
    let placed = 0, attempts = count * 100;
    while (placed < count && attempts-- > 0) {
        const x = randomInteger(SIDE_INDENT, COLUMNS - SIDE_INDENT - 1);
        const y = randomInteger(SIDE_INDENT, ROWS - SIDE_INDENT - 1);
        const dist = state.playerPosition ? Math.hypot(x - state.playerPosition.x, y - state.playerPosition.y) : 10;
        const cell = map[y][x];
        if (cell.type === 'floor' && !cell.item && !cell.creature && dist > 5) {
            const enemy = {
                type: CREATURE_TYPES.ENEMY,
                health: ENEMY_HEALTH,
                maxHealth: ENEMY_MAX_HEALTH,
                attack: ENEMY_ATTACK,
                id: `enemy_${Date.now()}_${Math.random()}`,
                dir: 'down',
                attacking: false,
            };
            cell.creature = enemy;
            state.enemies.set(enemy.id, { x, y });
            placed++;
        }
    }
}

function tileClass(type) { return `tile ${type}`; }
function makeChild(kind, name) {
    const div = document.createElement('div');
    div.className = `${kind} ${name}`;
    return div;
}

// Внешний вид игрока
 function applyPlayerAppearance(dir = state.playerDir) {
    const pos = state.playerPosition;
    if (!pos) return;
    const key = keyOf(pos.x, pos.y);
    const el = state.tileCache.get(key);
    if (!el) return;
    const parts = state.tileParts.get(key);
    if (!parts || !parts.creatureEl) return;
    const cls = ['creature', 'player', `dir-${dir}`];
    parts.creatureEl.className = cls.join(' ');
    if (state.playerAttacking) cls.push('attack');   // переключаемся на лист атаки
    parts.creatureEl.className = cls.join(' ');
    if (state.playerHurt) cls.push('hurt');
    parts.creatureEl.className = cls.join(' ');
}

 function applyEnemyAppearance(x, y) {
    const key = keyOf(x, y);
    const el = state.tileCache.get(key);
    const parts = state.tileParts.get(key);
    if (!el || !parts?.creatureEl) return;

    const c = state.gameMap[y][x]?.creature;
    if (!c || c.type !== 'enemy') return;

    const cls = ['creature', 'enemy', `dir-${c.dir}`];
    if (c.attacking) cls.push('attack');
    parts.creatureEl.className = cls.join(' ');
}

 function createHpBar(tile) {
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

 function createTileElement(x, y, tile) {
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
        // if (tile.creature.type === 'player') {
        // const cls = ['creature', 'player', `dir-${state.playerDir}`];
        // if (state.playerWalking) cls.push('walking');
        // parts.creatureEl.className = cls.join(' ');
        // }
    }
    state.tileParts.set(key, parts);
    return el;
}


 function updateTile(x, y) {
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
        // если это игрок — обновим классы под направление
        if (type === 'player') applyPlayerAppearance();
        if (type === 'enemy') applyEnemyAppearance(x,y);
    } else {
        if (parts.creatureEl) { parts.creatureEl.remove(); parts.creatureEl = null; }
        if (parts.hpBar) { parts.hpBar.remove(); parts.hpBar = null; parts.hpFill = null; }
    }

}

 function scheduleUpdate(x, y) {
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

 function renderMap(map) {
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

 function renderHUD() {
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

 function getEnemiesPositions() {
  const res = [];
  for (let y = 0; y < state.gameMap.length; y++) {
    for (let x = 0; x < state.gameMap[0].length; x++) {
      const c = state.gameMap[y][x].creature;
      if (c?.type === 'enemy') res.push({ x, y, enemy: c });
    }
  }
  return res;
}

 function startEnemyAI() {
  stopEnemyAI();
  state.enemyTimer = setInterval(() => {
    if (!state.gameOver) enemyStep();
  }, ENEMY_TICK_MS);
}

 function stopEnemyAI() {
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

 function enemyStep() {
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

state.lastAttackTime = 0;

 function playerAttack() {
    const now = performance.now();
    if (now - state.lastMoveTime < MOVE_DELAY) return;
     if (now - state.lastAttackTime < ATTACK_MS) return;
    if (state.gameOver) return;

     state.lastAttackTime = now;
    state.playerAttacking = true;
    applyPlayerAppearance(state.playerDir);

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

    // выключим визуал атаки
    setTimeout(() => {
        state.playerAttacking = false;
        applyPlayerAppearance(state.playerDir);
    }, ATTACK_MS);
}


const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function getTileSize() {
  const v = getComputedStyle(document.body).getPropertyValue('--tile-size').trim();
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 32;
}

function computeTransform() {
  const t = getTileSize();
  const mapW = COLUMNS * t;
  const mapH = ROWS * t;

  const vp = state.dom.viewport || state.dom.fieldElement.parentElement;
  if (!vp) return { tx: 0, ty: 0 };

  const vw = vp.clientWidth;
  const vh = vp.clientHeight;

  const p = state.playerPosition || { x: 0, y: 0 };
  const px = p.x * t + t / 2;
  const py = p.y * t + t / 2;

  // идеальный сдвиг, чтобы игрок был в центре
  let tx = Math.round(vw / 2 - px);
  let ty = Math.round(vh / 2 - py);

  // кромки карты: если карта меньше окна — центрируем карту,
  // если больше — не даём «пустым полям» появляться.
  if (mapW <= vw) {
    tx = Math.round((vw - mapW) / 2);
  } else {
    const minTx = vw - mapW, maxTx = 0;
    tx = clamp(tx, minTx, maxTx);
  }

  if (mapH <= vh) {
    ty = Math.round((vh - mapH) / 2);
  } else {
    const minTy = vh - mapH, maxTy = 0;
    ty = clamp(ty, minTy, maxTy);
  }

  return { tx, ty };
}

let raf = 0;
 function updateCamera() {
  const { tx, ty } = computeTransform();
  state.camera.tx = tx;
  state.camera.ty = ty;
  const f = state.dom.fieldElement;
  if (f) f.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
}

 function updateCameraRaf() {
  if (raf) return;
  raf = requestAnimationFrame(() => { raf = 0; updateCamera(); });
}

 function bindCamera() {
  // кешируем viewport (если есть)
  state.dom.viewport = document.querySelector('.viewport') || state.dom.fieldElement?.parentElement || null;

  // если обёртки нет — создадим на лету
  if (!state.dom.viewport && state.dom.fieldElement) {
    const vp = document.createElement('div');
    vp.className = 'viewport';
    const parent = state.dom.fieldElement.parentNode;
    parent.replaceChild(vp, state.dom.fieldElement);
    vp.appendChild(state.dom.fieldElement);
    state.dom.viewport = vp;
  }

  window.addEventListener('resize', updateCameraRaf);
  updateCamera();
}



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

 function attachInput(onRestart) {
    window.addEventListener('keydown', e => {
        if (isTextInputFocused()) return;
        if (state.gameOver && e.key.toLowerCase() !== 'r' && e.key.toLowerCase() !== 'к') return;
        if (e.code === 'Space') {  playerAttack(); return; } //e.preventDefault();
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

        const dir =
            delta.dx === 1 ? 'right' :
                delta.dx === -1 ? 'left' :
                    delta.dy === 1 ? 'down' : 'up';
        state.playerDir = dir;

        const playerObj = state.gameMap[fromY][fromX].creature;
        state.gameMap[fromY][fromX].creature = null;
        state.gameMap[ny][nx].creature = playerObj;

        scheduleUpdate(fromX, fromY);
        scheduleUpdate(nx, ny);

        state.playerPosition = { x: nx, y: ny };
        state.lastMoveTime = now;

        updateCameraRaf();

        processPlayerPickup();
        renderHUD();

    });


}

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
