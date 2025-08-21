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

// Глобальные переменные для состояния игры
let playerPosition = null;
let enemies = [];
let gameMapGlobal = [];

const fieldElement = document.querySelector('.field');

//-------------------------------------------

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

//-------------------------------------------

// function createEmptyMap() {
//     const map = [];
//     for (let x = 0; x < ROWS; x++) {
//         map[x] = [];
//         for (let y = 0; y < COLUMNS; y++) {
//             map[x][y] = {
//                 type: 'wall',
//                 x: x,
//                 y: y,
//             };
//         }
//     }
//     return map;
// }

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
//-------------------------------------------
function findRoom(cell) {
    return roomsRelevant.find(r =>
        cell.x >= r.x &&
        cell.x < r.x + r.w &&
        cell.y >= r.y &&
        cell.y < r.y + r.h
    );
}
//-------------------------------------------

// function findRoom(obj) {
//     const foundRoom = roomsRelevant.find(room =>
//         obj.y >= room.x &&
//         obj.y < room.x + room.w &&
//         obj.x >= room.y &&
//         obj.x < room.y + room.h
//     );
//     // console.log(obj, foundRoom);
//     return foundRoom;
// }



//-------------------------------------------
let roomsRelevant = [];
function checkAvailable(map) {
    return roomsRelevant.filter(room => {
        const { x, y, w, h } = room;

        // Контакт с путём по верх/низ
        for (let i = x; i < x + w; i++) {
            if (map[y + h]?.[i]?.path || map[y - 1]?.[i]?.path || room.crossPath) {
                room.crossPath = true;
                return false;
            }
        }
        // Контакт с путём по лев/прав
        for (let j = y; j < y + h; j++) {
            if (map[j]?.[x + w]?.path || map[j]?.[x - 1]?.path || room.crossPath) {
                room.crossPath = true;
                return false;
            }
        }

        if (!room.set) room.set = new Set();

        // соберём соседей по горизонтальным кромкам
        for (let i = x; i < x + w; i++) {
            const down = map[y + h]?.[i];
            const up = map[y - 1]?.[i];
            const r1 = down && down.type === 'floor' ? findRoom(down) : null;
            const r2 = up && up.type === 'floor' ? findRoom(up) : null;
            if (r1) room.set.add(r1);
            if (r2) room.set.add(r2);
        }
        // и по вертикальным кромкам
        for (let j = y; j < y + h; j++) {
            const right = map[j]?.[x + w];
            const left = map[j]?.[x - 1];
            const r1 = right && right.type === 'floor' ? findRoom(right) : null;
            const r2 = left && left.type === 'floor' ? findRoom(left) : null;
            if (r1) room.set.add(r1);
            if (r2) room.set.add(r2);
        }

        return true; // это комната пока недоступна — оставляем в списке
    });
}

//-------------------------------------------

// function checkAvailable(map) {

//     return (roomsRelevant.filter(room => {
//         const { x, y, w, h } = room;


//         for (let i = x; i < x + w; i++) {
//             if (map[y + h]?.[i]?.path || map[y - 1]?.[i]?.path || map[y + h]?.[i]?.crossPath || map[y - 1]?.[i]?.crossPath || room.crossPath) {
//                 room.crossPath = true;
//                 return false;

//             }

//         }
//         for (let i = y; i < y + h; i++) {
//             if (map[i]?.[x + w]?.path || map[i]?.[x - 1]?.path || map[i]?.[x + w]?.crossPath || map[i]?.[x - 1]?.crossPath || room.crossPath) {
//                 room.crossPath = true;
//                 return false;
//             }

//         }
//         if (!room.set) {
//             room.set = new Set();
//         }

//         for (let i = x; i < x + w; i++) {
//             if (map[y + h]?.[i]?.type === 'floor') {
//                 if (findRoom(map[y + h][i])) {
//                     room.set.add(findRoom(map[y + h][i]));
//                 }

//             }
//             if (map[y - 1]?.[i]?.type === 'floor') {
//                 if (findRoom(map[y - 1][i])) {
//                     room.set.add(findRoom(map[y - 1][i]));
//                 }


//             }
//         }

//         for (let i = y; i < y + h; i++) {
//             if (map[i]?.[x + w]?.type === 'floor') {
//                 if (findRoom(map[i][x + w])) {
//                     room.set.add(findRoom(map[i][x + w]));
//                 }

//             }
//             if (map[i]?.[x - 1]?.type === 'floor') {
//                 if (findRoom(map[i][x - 1])) {
//                     room.set.add(findRoom(map[i][x - 1]));
//                 }

//             }
//         }

//         return true;
//     }));
// }



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

            // let neareastCell = findNearestFloor(map, notNearRoom[0]);
            // // console.log(neareastCell);
            // if (neareastCell.coord == 'y') {
            //     for (let j = Math.min(notNearRoom[0].y, neareastCell.y); j <= Math.max(notNearRoom[0].y, neareastCell.y); j++) {
            //         // console.log(map[j][neareastCell.x]);
            //         map[j][neareastCell.x].type = 'floor';
            //         // console.log(map[j][neareastCell.x]);
            //         if (map[j][neareastCell.x]?.path || map[j][neareastCell.x]?.crossPath) {

            //             notNearRoom[0].crossPath = true;

            //         }
            //         else {
            //             let foundRoom = findRoom(map[j][neareastCell.x]);
            //             if (foundRoom && foundRoom !== notNearRoom[0]) {
            //                 if (!foundRoom.set) {
            //                     foundRoom.set = new Set();
            //                 }
            //                 notNearRoom[0].set.add(foundRoom);
            //                 // console.log(foundRoom, '2');
            //                 foundRoom.set.add(notNearRoom[0]);
            //             }
            //         }

            //     }
            // }

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

            // else {
            //     for (let j = Math.min(notNearRoom[0].x, neareastCell.x); j <= Math.max(notNearRoom[0].x, neareastCell.x); j++) {

            //         map[neareastCell.y][j].type = 'floor';
            //         // console.log(map[neareastCell.y][j]);
            //         if (map[neareastCell.y][j]?.path || map[neareastCell.y][j]?.crossPath) {
            //             notNearRoom[0].crossPath = true;

            //         }
            //         else {
            //             let foundRoom = findRoom(map[neareastCell.y][j]);
            //             if (foundRoom && foundRoom !== notNearRoom[0]) {
            //                 if (!foundRoom.set) {
            //                     foundRoom.set = new Set();
            //                 }
            //                 notNearRoom[0].set.add(foundRoom);
            //                 // console.log(foundRoom, '2');
            //                 foundRoom.set.add(notNearRoom[0]);
            //             }
            //         }

            //     }
            // }



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
    // let notNearRoom;
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


                // let neareastCell = findNearestPath(map, nearRoom[0]);

                // if (neareastCell.coord == 'y') {
                //     for (let j = Math.min(nearRoom[0].y, neareastCell.y); j <= Math.max(nearRoom[0].y, neareastCell.y); j++) {
                //         map[j][neareastCell.x].type = 'floor';

                //         if (map[j][neareastCell.x]?.path || map[j][neareastCell.x]?.crossPath) {

                //             nearRoom[0].crossPath = true;
                //             nearRoom[0].set.forEach(room => {
                //                 room.crossPath = true;
                //             })
                //         }
                //     }
                // } else {
                //     for (let j = Math.min(nearRoom[0].x, neareastCell.x); j <= Math.max(nearRoom[0].x, neareastCell.x); j++) {
                //         map[neareastCell.y][j].type = 'floor';
                //         // console.log(map[neareastCell.y][j]);
                //         if (map[neareastCell.y][j]?.path || map[neareastCell.y][j]?.crossPath) {
                //             nearRoom[0].crossPath = true;
                //             nearRoom[0].set.forEach(room => {
                //                 room.crossPath = true;
                //             })
                //         }

                //     }
                // }
            }
            k++;
            console.log(nearRoom, nearRoom, nearRoom.length);
        } while (nearRoom.length != 0 && k < 25);

    }

}

//-----------------------------------------------------------
// predicate(cell) -> true, если клетка подходит
function findNearest(map, room, predicate) {
    let minDistance = Infinity;
    let nearestCell = null;
    const { x, y, w, h } = room;

    // вертикальные лучи из нижней и верхней кромки
    for (let i = x; i < x + w; i++) {
        // вниз от нижней кромки
        for (let yy = y + h; yy < ROWS; yy++) {
            const cell = map[yy]?.[i];
            if (cell && predicate(cell)) {
                const dist = Math.abs(i - x) + Math.abs(yy - y);
                if (dist < minDistance) { minDistance = dist; nearestCell = { x: i, y: yy, coord: 'y' }; }
                break;
            }
        }
        // вверх от верхней кромки
        for (let yy = y - 1; yy >= 0; yy--) {
            const cell = map[yy]?.[i];
            if (cell && predicate(cell)) {
                const dist = Math.abs(i - x) + Math.abs(yy - y);
                if (dist < minDistance) { minDistance = dist; nearestCell = { x: i, y: yy, coord: 'y' }; }
                break;
            }
        }
    }

    // горизонтальные лучи из правой и левой кромки
    for (let j = y; j < y + h; j++) {
        // вправо от правой кромки
        for (let xx = x + w; xx < COLUMNS; xx++) {
            const cell = map[j]?.[xx];
            if (cell && predicate(cell)) {
                const dist = Math.abs(xx - x) + Math.abs(j - y);
                if (dist < minDistance) { minDistance = dist; nearestCell = { x: xx, y: j, coord: 'x' }; }
                break;
            }
        }
        // влево от левой кромки
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

// Обёртки вместо старых функций
const neareastFloor = (map, room) => findNearest(map, room, c => c.type === 'floor');
const neareastPath = (map, room) => findNearest(map, room, c => c.path);
//-----------------------------------------------------------


// function findNearestFloor(map, room) {
//     let minDistance = Infinity;
//     let nearestCell = null;

//     const { x, y, w, h } = room;

//     //Поиск по Y вниз

//     for (let i = x; i < x + w; i++) {
//         for (let j = 0; j < ROWS - y - h; j++) {//Maybe 
//             let fCountArr = y + h + j;
//             // findMinDistance(fCountArr, i, x, y, map)
//             if (map[fCountArr]?.[i]?.type === 'floor') {
//                 const distance = Math.abs(x - i) + Math.abs(y - fCountArr); //Maybe 

//                 if (distance && distance < minDistance) {
//                     minDistance = distance;
//                     nearestCell = { x: i, y: fCountArr, distance, coord: 'y' };//Maybe 
//                 }

//             }
//         }
//         //верх
//         for (let j = y - 1; j >= 0; j--) {
//             // findMinDistance(j, i, x, y, map)
//             if (map[j]?.[i]?.type === 'floor') {
//                 const distance = Math.abs(x - i) + Math.abs(y - j);

//                 if (distance && distance < minDistance) {
//                     minDistance = distance;
//                     nearestCell = { x: i, y: j, distance, coord: 'y' };
//                 }
//                 // nearestCell = { x, y };

//             }
//         }
//     }

//     //Поиск по X
//     for (let i = y; i < y + h; i++) {
//         for (let j = 0; j < COLUMNS - x - w; j++) {
//             let fCountArr = x + w + j;
//             //  findMinDistance(i, fCountArr, y, x, map)
//             if (map[i]?.[fCountArr]?.type === 'floor') {
//                 const distance = Math.abs(y - i) + Math.abs(x - fCountArr); //Maybe 

//                 if (distance && distance < minDistance) {
//                     minDistance = distance;
//                     nearestCell = { x: fCountArr, y: i, distance, coord: 'x' };
//                 }

//             }
//         }
//         for (let j = x - 1; j >= 0; j--) {
//             // findMinDistance(i, j, y, x, map)
//             if (map[i]?.[j]?.type === 'floor') {
//                 const distance = Math.abs(y - i) + Math.abs(x - j);

//                 if (distance && distance < minDistance) {
//                     minDistance = distance;
//                     nearestCell = { x: j, y: i, distance, coord: 'x' };
//                 }

//             }
//         }
//     }


//     return nearestCell;
// }

// function findNearestPath(map, room) {
//     let minDistance = Infinity;
//     let nearestCell = null;

//     const { x, y, w, h } = room;

//     //Поиск по Y вниз

//     for (let i = x; i < x + w; i++) {
//         for (let j = 0; j < ROWS - y - h; j++) {//Maybe 
//             let fCountArr = y + h + j;
//             // findMinDistance(fCountArr, i, x, y, map)
//             if (map[fCountArr]?.[i]?.path || map[fCountArr]?.[i]?.crossPath) {
//                 const distance = Math.abs(x - i) + Math.abs(y - fCountArr); //Maybe 

//                 if (distance && distance < minDistance) {
//                     minDistance = distance;
//                     nearestCell = { x: i, y: fCountArr, distance, coord: 'y' };//Maybe 
//                 }

//             }
//         }
//         //верх
//         //верх
//         for (let j = y - 1; j >= 0; j--) {
//             // findMinDistance(j, i, x, y, map)
//             if (map[j]?.[i]?.path || map[j]?.[i]?.crossPath) {
//                 const distance = Math.abs(x - i) + Math.abs(y - j);

//                 if (distance && distance < minDistance) {
//                     minDistance = distance;
//                     nearestCell = { x: i, y: j, distance, coord: 'y' };
//                 }
//                 // nearestCell = { x, y };

//             }
//         }
//     }

//     //Поиск по X
//     for (let i = y; i < y + h; i++) {
//         for (let j = 0; j < COLUMNS - x - w; j++) {
//             let fCountArr = x + w + j;
//             //  findMinDistance(i, fCountArr, y, x, map)
//             if (map[i]?.[fCountArr]?.path || map[i]?.[fCountArr]?.crossPath) {
//                 const distance = Math.abs(y - i) + Math.abs(x - fCountArr); //Maybe 

//                 if (distance && distance < minDistance) {
//                     minDistance = distance;
//                     nearestCell = { x: fCountArr, y: i, distance, coord: 'x' };
//                 }

//             }
//         }
//         for (let j = x - 1; j >= 0; j--) {
//             // findMinDistance(i, j, y, x, map)
//             if (map[i]?.[j]?.path || map[i]?.[j]?.crossPath) {
//                 const distance = Math.abs(y - i) + Math.abs(x - j);

//                 if (distance && distance < minDistance) {
//                     minDistance = distance;
//                     nearestCell = { x: j, y: i, distance, coord: 'x' };
//                 }

//             }
//         }
//     }


//     return nearestCell;
// }



//-----------------------------------------------------------------------------------

function createRoom(map) {
    let room, hasCollision, tries = 0;
    do {
        if (tries++ > 5000) return; // карта забита — ну всё, хватит
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
    const maxAttempts = 1000; // Чтобы избежать бесконечного цикла //do while

    while (placed < count && maxAttempts > 0) {
        const x = randomInteger(SIDE_INDENT, COLUMNS - SIDE_INDENT - 1);
        const y = randomInteger(SIDE_INDENT, ROWS - SIDE_INDENT - 1);

        // Проверяем, можно ли разместить предмет здесь
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
                type: "player",
                health: 100,
                attack: 10
            };
            playerPosition = { x, y }; // сохраняем позицию для быстрого доступа
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

        // // Проверяем расстояние до игрока
        const distanceToPlayer = playerPosition ?
            Math.sqrt(Math.pow(x - playerPosition.x, 2) + Math.pow(y - playerPosition.y, 2)) : 10;

        if (map[y][x].type === "floor" &&
            !map[y][x].item &&
            !map[y][x].creature &&
            distanceToPlayer > 5) {

            map[y][x].creature = {
                type: "enemy",
                health: 30,
                attack: 5,
                id: `enemy_${Date.now()}_${Math.random()}`
            };
            placed++;
        }
        maxAttempts--;
    }
}



const MOVE_DELAY = 90; // мс, можно крутить
let lastMoveTime = 0;
const tileCache = new Map();
fieldElement.setAttribute('tabindex', '0');
fieldElement.setAttribute('role', 'application');
fieldElement.setAttribute('aria-label', 'Игровое поле');


// Нормализуем нажатия клавиш (WASD + русская раскладка + стрелки)
function keyToDelta(e) {
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w' || k === 'ц') return { dx: 0, dy: -1 };
    if (k === 'arrowdown' || k === 's' || k === 'ы') return { dx: 0, dy: 1 };
    if (k === 'arrowleft' || k === 'a' || k === 'ф') return { dx: -1, dy: 0 };
    if (k === 'arrowright' || k === 'd' || k === 'в') return { dx: 1, dy: 0 };
    return null;
}
// ==== Рендер начальной карты ====
function renderMap(map) {
    gameMapGlobal = map;
    tileCache.clear();
    fieldElement.textContent = ''; // быстрее чем innerHTML = ''

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

    // Кладем в кэш до наполнения
    tileCache.set(keyOf(x, y), el);

    if (tile.item) {
        el.appendChild(makeChild('item', tile.item));
    }
    if (tile.creature) {
        el.appendChild(makeChild('creature', tile.creature.type));
    }
    return el;
}

function tileClass(type) {
    // Чуть дешевле, чем "tile ${type}", и легче патчить
    // .tile — базовый класс, .t-floor / .t-wall — модификаторы
    return `tile ${type}`;
}

function makeChild(kind, name) {
    const child = document.createElement('div');
    // .item.i-sword / .creature.c-orc / .creature.c-player
    child.className = `${kind} ${name}`;
    return child;
}

function keyOf(x, y) {
    return `${x},${y}`;
}

// ==== Точечное обновление тайла ====
function updateTile(x, y) {
    const el = tileCache.get(keyOf(x, y));
    if (!el) return;

    const tile = gameMapGlobal[y][x];

    // Обновляем класс плитки только при реальном изменении типа
    const newClass = tileClass(tile.type);
    if (el.className !== newClass) el.className = newClass;

    // Дешевле пересобрать 2-3 детей, чем городить сложный дифф
    // Но не трогаем сам элемент плитки
    // Удаляем всех детей:
    // вместо innerHTML='' используем removeChild в цикле для предсказуемости GC
    while (el.firstChild) el.removeChild(el.firstChild);

    if (tile.item) el.appendChild(makeChild('item', tile.item));
    if (tile.creature) el.appendChild(makeChild('creature', tile.creature.type));
}

// ==== Движение игрока с батчингом ====
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


    const nx = playerPosition.x + dx;
    const ny = playerPosition.y + dy;

    if (!canMoveTo(nx, ny)) return;
    lastMoveTime = now;
    // снимаем существо со старого тайла
    gameMapGlobal[playerPosition.y][playerPosition.x].creature = null;
    // ставим игрока на новый
    gameMapGlobal[ny][nx].creature = {
        type: 'player',
        health: 100,
        attack: 10
    };

    // Обновляем только два тайла, но через батч, чтобы сгладить серию ходов
    scheduleUpdate(playerPosition.x, playerPosition.y);
    scheduleUpdate(nx, ny);

    playerPosition = { x: nx, y: ny };
}

function canMoveTo(x, y) {
    if (x < 0 || x >= COLUMNS || y < 0 || y >= ROWS) return false;
    const tile = gameMapGlobal[y][x];
    // проходим только по полу и если никого нет
    return tile.type === 'floor' && !tile.creature;
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
}

// ==== События клавиатуры на самом поле ====
fieldElement.addEventListener('keydown', (e) => {
    // if (e.repeat) return;
    const delta = keyToDelta(e);
    if (!delta) return;
    e.preventDefault();
    handleMovement(delta.dx, delta.dy);
});

// Автофокус при клике по полю
fieldElement.addEventListener('mousedown', () => fieldElement.focus());

// ==== Запуск ====
document.addEventListener('DOMContentLoaded', initGame);
