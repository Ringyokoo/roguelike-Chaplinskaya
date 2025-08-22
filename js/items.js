import { SIDE_INDENT, COLUMNS, ROWS, ITEM_TYPES } from './config.js';
// import { ITEM_TYPES } from './enums.js';
import { randomInteger } from './utils.js';

export function placeItems(map, itemType, count) {
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

export { ITEM_TYPES }; 
