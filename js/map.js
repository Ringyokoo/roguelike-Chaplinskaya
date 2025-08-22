import { state } from './state.js';
import {
  MIN_ROOM_SIZE, MAX_ROOM_SIZE, SIDE_INDENT, COLUMNS, ROWS,
} from './config.js';
import { randomInteger, checkCollision, getRange } from './utils.js';

export function createEmptyMap() {
  const map = new Array(ROWS);
  for (let y = 0; y < ROWS; y++) {
    map[y] = new Array(COLUMNS);
    for (let x = 0; x < COLUMNS; x++) {
      map[y][x] = { type: 'wall', x, y /*, path:false*/ };
    }
  }
  return map;
}

export function createPath(map, coord) {
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


export function pathToNonAvailable(map) {
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

export function pathToNonAvailableNearRoom(map) {
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
export function paramRoom() {
  const w = randomInteger(MIN_ROOM_SIZE, MAX_ROOM_SIZE);
  const h = randomInteger(MIN_ROOM_SIZE, MAX_ROOM_SIZE);
  const x = randomInteger(SIDE_INDENT, COLUMNS - w - SIDE_INDENT);
  const y = randomInteger(SIDE_INDENT, ROWS - h - SIDE_INDENT);

  const crossPath =
    state.pathXRelevant.some(item => getRange(x, w).includes(item)) ||
    state.pathYRelevant.some(item => getRange(y, h).includes(item));

  return { w, h, x, y, crossPath };
}

export function findRoom(cell) {
  return state.roomsRelevant.find(r =>
    cell.x >= r.x && cell.x < r.x + r.w && cell.y >= r.y && cell.y < r.y + r.h
  );
}

export function createRoom(map) {
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

export function checkAvailable(map) {
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

export function groupConnectedObjects(objects) {
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

export function findNearest(map, room, predicate) {
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

