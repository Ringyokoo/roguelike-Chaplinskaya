import { state } from './state.js';
import {
  MIN_ROOM_SIZE, MAX_ROOM_SIZE, SIDE_INDENT, COLUMNS, ROWS,
} from './config.js';
import { randomInteger, checkCollision, getRange } from './utils.js';

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

// generic nearest finder
export function findNearest(map, room, predicate, COLUMNS, ROWS) {
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
