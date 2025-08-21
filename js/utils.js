import { COLUMNS, ROWS } from './config.js';

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

export function isInside(x, y) {
  return x >= 0 && x < COLUMNS && y >= 0 && y < ROWS;
}

export function neighbors4(x, y) {
  return [
    { x, y: y - 1 },
    { x, y: y + 1 },
    { x: x - 1, y },
    { x: x + 1, y },
  ].filter(p => isInside(p.x, p.y));
}
