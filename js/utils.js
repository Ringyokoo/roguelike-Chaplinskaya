import { state } from './state.js';
import { getEnemiesPositions } from './ai.js';

export const keyOf = (x, y) => `${x},${y}`;

export function randomInteger(min, max) {
  return Math.floor(min + Math.random() * (max + 1 - min));
}

export function checkCollision(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function getRange(coord, size) {
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

export function checkEndConditions() {
  if (state.gameOver || getEnemiesPositions().length === 0) { //countEnemies() === 0
    openDialog();
    return;
  }
}

export function closeDialog() {
  const d = document.getElementById('infoDiolog');
  if (d?.open) d.close();
}
