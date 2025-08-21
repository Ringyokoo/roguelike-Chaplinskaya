import { ROWS, COLUMNS, SIDE_INDENT } from './config.js';
import { state } from './state.js';

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
    do { x = SIDE_INDENT + Math.floor(Math.random() * (COLUMNS - 2*SIDE_INDENT)); }
    while (state.pathXRelevant.includes(x));

    state.pathXRelevant.push(x);
    for (let j = SIDE_INDENT; j < ROWS - SIDE_INDENT; j++) {
      map[j][x].type = 'floor';
      map[j][x].path = true;
    }
  } else {
    let y;
    do { y = SIDE_INDENT + Math.floor(Math.random() * (ROWS - 2*SIDE_INDENT)); }
    while (state.pathYRelevant.includes(y));

    state.pathYRelevant.push(y);
    for (let j = SIDE_INDENT; j < COLUMNS - SIDE_INDENT; j++) {
      map[y][j].type = 'floor';
      map[y][j].path = true;
    }
  }
}
