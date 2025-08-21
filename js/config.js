export const ROWS = 24;
export const COLUMNS = 40;
export const SIDE_INDENT = 1;

export const MIN_ROOM_SIZE = 3;
export const MAX_ROOM_SIZE = 8;
export const MIN_ROOMS = 5;
export const MAX_ROOMS = 10;

export const MIN_PATH_COUNT = 1;
export const MAX_PATH_COUNT = 2;

export const HEALTH_COUNT = 10;
export const SWORD_COUNT  = 2;
export const ENEMY_COUNT  = 10;

export const PLAYER_MAX_HEALTH = 100;
export const HEAL_AMOUNT  = 25;
export const SWORD_BONUS  = 5;

export const MOVE_DELAY = 90;     // мс
export const ENEMY_TICK_MS = 800; // мс

export const ENEMY_GRADIENT_RECALC_MS = 200; // как часто обновлять поле расстояний
export const BFS_MAX_DEPTH = 20; // радиус BFS для ИИ

export const ITEM_TYPES = {
  HEALTH: 'health',
  SWORD: 'sword',
};

export const CREATURE_TYPES = {
  PLAYER: 'player',
  ENEMY: 'enemy',
};
