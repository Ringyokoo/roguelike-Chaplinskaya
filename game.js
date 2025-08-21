const ROWS = 24;
const COLUMNS = 40;
const SIDE_INDENT = 1;
// const TILE_SIZE = 32;

const MIN_ROOM_SIZE = 3;
const MAX_ROOM_SIZE = 8;
const MIN_ROOMS = 5;
const MAX_ROOMS = 10;

const MIN_PATH_COUNT = 2;
const MAX_PATH_COUNT = 3;

const fieldElement = document.querySelector('.field');

function createEmptyMap() {
    const map = [];
    for (let x = 0; x < ROWS; x++) {
        map[x] = [];
        for (let y = 0; y < COLUMNS; y++) {
            map[x][y] = {
                type: 'wall',
                x: x,
                y: y,
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


    //    console.log(pathXRelevant.some(item => getRange(room.x, room.w).includes(item)), room);

    return room;
}

let roomsRelevant = [];

function createRoom(map) {

    let room;
    let hasCollision;

    do {

        room = paramRoom();
        hasCollision = false;

        for (const element of roomsRelevant) {
            if (checkCollision(room, element)) {
                hasCollision = true;
                break;
            }
        }

    } while (hasCollision);

    roomsRelevant.push(room);

    for (let i = room.y; i < room.y + room.h; i++) {
        for (let j = room.x; j < room.x + room.w; j++) {
            map[i][j].type = 'floor';
        }
    }
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


function findRoom(obj) {
    const foundRoom = roomsRelevant.find(room =>
        obj.y >= room.x &&
        obj.y < room.x + room.w &&
        obj.x >= room.y &&
        obj.x < room.y + room.h
    );
    // console.log(obj, foundRoom);
    return foundRoom;
}

let roomNearWithOutPath = [];
function checkAvailable(map) {
    roomNearWithOutPath = [];
    return (roomsRelevant.filter(room => {
        const { x, y, w, h } = room;


        for (let i = x; i < x + w; i++) {
            // console.log(map[y + h]?.[i]?.path || map[y - 1]?.[i]?.path || map[y + h]?.[i]?.crossPath || map[y - 1]?.[i]?.crossPath)
            if (map[y + h]?.[i]?.path || map[y - 1]?.[i]?.path || map[y + h]?.[i]?.crossPath || map[y - 1]?.[i]?.crossPath || room.crossPath) {
                // console.log('jhjhjkkhs');
                room.crossPath = true;
                // console.log(room);
                return false;

            }

        }
        for (let i = y; i < y + h; i++) {
            if (map[i]?.[x + w]?.path || map[i]?.[x - 1]?.path || map[i]?.[x + w]?.crossPath || map[i]?.[x - 1]?.crossPath || room.crossPath) {
                // console.log('ouwiuwi')
                room.crossPath = true;
                // console.log(room);
                return false;
            }

        }
        if (!room.set) {
            room.set = new Set();
        }

        for (let i = x; i < x + w; i++) {
            if (map[y + h]?.[i]?.type === 'floor') {
                if (findRoom(map[y + h][i])) {
                    room.set.add(findRoom(map[y + h][i]));
                }

            }
            if (map[y - 1]?.[i]?.type === 'floor') {
                if (findRoom(map[y - 1][i])) {
                    room.set.add(findRoom(map[y - 1][i]));
                }


            }
        }

        for (let i = y; i < y + h; i++) {
            if (map[i]?.[x + w]?.type === 'floor') {
                if (findRoom(map[i][x + w])) {
                    room.set.add(findRoom(map[i][x + w]));
                }

            }
            if (map[i]?.[x - 1]?.type === 'floor') {
                if (findRoom(map[i][x - 1])) {
                    room.set.add(findRoom(map[i][x - 1]));
                }

            }
        }

        return true;
    }));


}


function pathToNonAvailable(map) {
    // let nonAvailable = checkAvailable(map);
    // nonAvailable = checkAvailable(map);
    let nonAvailable;
    let notNearRoom;
    // let nearRoom;
    let c = 0;
    do {
        nonAvailable = checkAvailable(map);


        notNearRoom = nonAvailable.filter(item => item?.set?.size == 0);
        // nearRoom = nonAvailable.filter(item => item?.set?.size !== 0);
        // [notNearRoomLast, nearRoomLast] = [notNearRoom, nearRoom];
        // console.log(notNearRoom, nearRoom);

        if (notNearRoom.length) {

            let neareastCell = findNearestFloor(map, notNearRoom[0]);
            // console.log(neareastCell);
            if (neareastCell.coord == 'y') {
                for (let j = Math.min(notNearRoom[0].y, neareastCell.y); j <= Math.max(notNearRoom[0].y, neareastCell.y); j++) {
                    // console.log(map[j][neareastCell.x]);
                    map[j][neareastCell.x].type = 'floor';
                    // console.log(map[j][neareastCell.x]);
                    if (map[j][neareastCell.x]?.path || map[j][neareastCell.x]?.crossPath) {

                        notNearRoom[0].crossPath = true;

                    }
                    else {
                        let foundRoom = findRoom(map[j][neareastCell.x]);
                        if (foundRoom && foundRoom !== notNearRoom[0]) {
                            if (!foundRoom.set) {
                                foundRoom.set = new Set();
                            }
                            notNearRoom[0].set.add(foundRoom);
                            // console.log(foundRoom, '2');
                            foundRoom.set.add(notNearRoom[0]);
                        }
                    }

                }
            } else {
                for (let j = Math.min(notNearRoom[0].x, neareastCell.x); j <= Math.max(notNearRoom[0].x, neareastCell.x); j++) {

                    map[neareastCell.y][j].type = 'floor';
                    // console.log(map[neareastCell.y][j]);
                    if (map[neareastCell.y][j]?.path || map[neareastCell.y][j]?.crossPath) {
                        notNearRoom[0].crossPath = true;

                    }
                    else {
                        let foundRoom = findRoom(map[neareastCell.y][j]);
                        if (foundRoom && foundRoom !== notNearRoom[0]) {
                            if (!foundRoom.set) {
                                foundRoom.set = new Set();
                            }
                            notNearRoom[0].set.add(foundRoom);
                            // console.log(foundRoom, '2');
                            foundRoom.set.add(notNearRoom[0]);
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
    // let notNearRoom;
    let nearRoom;
    let nearRoomLast;
    let c = 0;

    do {
        nonAvailable = checkAvailable(map);
        // notNearRoom = nonAvailable.filter(item => item?.set?.size == 0);
        nearRoomLast = nearRoom;
        nearRoom = nonAvailable.filter(item => item?.set?.size !== 0);

        if (nearRoom.length) {
            nearRoom.forEach((currentRoom, index) => {
                // console.log('=== ПРОВЕРКА КОМНАТЫ ' + index + ' ===');

                const setArray = Array.from(currentRoom.set || []);
                const hasCrossPath = setArray.some(setRoom => setRoom.crossPath === true);

                if (hasCrossPath) {
                    currentRoom.crossPath = true;
                    // console.log('Найден crossPath: true в комнате', index);
                }
            });
        }

        c++;
        // console.log(nearRoom, nearRoomLast, nearRoom.length, nearRoomLast?.length);
    } while (nearRoom.length != nearRoomLast?.length && c < 5);
    nearRoom = groupConnectedObjects(nearRoom);
    if (nearRoom.length) {
        
        let k = 0;
        do {
            nonAvailable = checkAvailable(map);


            nearRoom = nonAvailable.filter(item => item?.set?.size !== 0);
            nearRoom = groupConnectedObjects(nearRoom);

            if (nearRoom.length) {
               
                let neareastCell = findNearestPath(map, nearRoom[0]);
                
                if (neareastCell.coord == 'y') {
                    for (let j = Math.min(nearRoom[0].y, neareastCell.y); j <= Math.max(nearRoom[0].y, neareastCell.y); j++) {
                    
                        // console.log(map[j][neareastCell.x]);
                        map[j][neareastCell.x].type = 'floor';
                        // console.log(map[j][neareastCell.x]);

                        if (map[j][neareastCell.x]?.path || map[j][neareastCell.x]?.crossPath) {

                            nearRoom[0].crossPath = true;

                        }


                    }
                } else {
                    for (let j = Math.min(nearRoom[0].x, neareastCell.x); j <= Math.max(nearRoom[0].x, neareastCell.x); j++) {
                        map[neareastCell.y][j].type = 'floor';
                        // console.log(map[neareastCell.y][j]);
                        if (map[neareastCell.y][j]?.path || map[neareastCell.y][j]?.crossPath) {
                            nearRoom[0].crossPath = true;
                        }




                    }
                }



            }
            k++;
            console.log(nearRoom, nearRoom, nearRoom.length);
        } while (nearRoom.length != 0 && k < 25);

    }

}


//Not DRY
function findNearestFloor(map, room) {
    let minDistance = Infinity;
    let nearestCell = null;

    const { x, y, w, h } = room;

    //Поиск по Y вниз

    for (let i = x; i < x + w; i++) {
        for (let j = 0; j < ROWS - y - h; j++) {//Maybe 
            let fCountArr = y + h + j;
            // findMinDistance(fCountArr, i, x, y, map)
            if (map[fCountArr]?.[i]?.type === 'floor') {
                const distance = Math.abs(x - i) + Math.abs(y - fCountArr); //Maybe 

                if (distance && distance < minDistance) {
                    minDistance = distance;
                    nearestCell = { x: i, y: fCountArr, distance, coord: 'y' };//Maybe 
                }

            }
        }
        //верх
        for (let j = y - 1; j >= 0; j--) {
            // findMinDistance(j, i, x, y, map)
            if (map[j]?.[i]?.type === 'floor') {
                const distance = Math.abs(x - i) + Math.abs(y - j);

                if (distance && distance < minDistance) {
                    minDistance = distance;
                    nearestCell = { x: i, y: j, distance, coord: 'y' };
                }
                // nearestCell = { x, y };

            }
        }
    }

    //Поиск по X
    for (let i = y; i < y + h; i++) {
        for (let j = 0; j < COLUMNS - x - w; j++) {
            let fCountArr = x + w + j;
            //  findMinDistance(i, fCountArr, y, x, map)
            if (map[i]?.[fCountArr]?.type === 'floor') {
                const distance = Math.abs(y - i) + Math.abs(x - fCountArr); //Maybe 

                if (distance && distance < minDistance) {
                    minDistance = distance;
                    nearestCell = { x: fCountArr, y: i, distance, coord: 'x' };
                }

            }
        }
        for (let j = x - 1; j >= 0; j--) {
            // findMinDistance(i, j, y, x, map)
            if (map[i]?.[j]?.type === 'floor') {
                const distance = Math.abs(y - i) + Math.abs(x - j);

                if (distance && distance < minDistance) {
                    minDistance = distance;
                    nearestCell = { x: j, y: i, distance, coord: 'x' };
                }

            }
        }
    }


    return nearestCell;
}

function findNearestPath(map, room) {
    let minDistance = Infinity;
    let nearestCell = null;

    const { x, y, w, h } = room;

    //Поиск по Y вниз

    for (let i = x; i < x + w; i++) {
        for (let j = 0; j < ROWS - y - h; j++) {//Maybe 
            let fCountArr = y + h + j;
            // findMinDistance(fCountArr, i, x, y, map)
            if (map[fCountArr]?.[i]?.path || map[fCountArr]?.[i]?.crossPath) {
                const distance = Math.abs(x - i) + Math.abs(y - fCountArr); //Maybe 

                if (distance && distance < minDistance) {
                    minDistance = distance;
                    nearestCell = { x: i, y: fCountArr, distance, coord: 'y' };//Maybe 
                }

            }
        }
        //верх
        //верх
        for (let j = y - 1; j >= 0; j--) {
            // findMinDistance(j, i, x, y, map)
            if (map[j]?.[i]?.path || map[j]?.[i]?.crossPath) {
                const distance = Math.abs(x - i) + Math.abs(y - j);

                if (distance && distance < minDistance) {
                    minDistance = distance;
                    nearestCell = { x: i, y: j, distance, coord: 'y' };
                }
                // nearestCell = { x, y };

            }
        }
    }

    //Поиск по X
    for (let i = y; i < y + h; i++) {
        for (let j = 0; j < COLUMNS - x - w; j++) {
            let fCountArr = x + w + j;
            //  findMinDistance(i, fCountArr, y, x, map)
            if (map[i]?.[fCountArr]?.path || map[i]?.[fCountArr]?.crossPath) {
                const distance = Math.abs(y - i) + Math.abs(x - fCountArr); //Maybe 

                if (distance && distance < minDistance) {
                    minDistance = distance;
                    nearestCell = { x: fCountArr, y: i, distance, coord: 'x' };
                }

            }
        }
        for (let j = x - 1; j >= 0; j--) {
            // findMinDistance(i, j, y, x, map)
            if (map[i]?.[j]?.path || map[i]?.[j]?.crossPath) {
                const distance = Math.abs(y - i) + Math.abs(x - j);

                if (distance && distance < minDistance) {
                    minDistance = distance;
                    nearestCell = { x: j, y: i, distance, coord: 'x' };
                }

            }
        }
    }


    return nearestCell;
}




function renderMap(map) {

    fieldElement.innerHTML = '';

    for (let x = 0; x < ROWS; x++) {
        for (let y = 0; y < COLUMNS; y++) {

            const tileElement = document.createElement('div');
            tileElement.className = `tile ${map[x][y].type}`;

            fieldElement.appendChild(tileElement);
        }
    }
}


function initGame() {

    const gameMap = createEmptyMap();

    for (let i = 0; i < randomInteger(MIN_PATH_COUNT, MAX_PATH_COUNT); i++) {
        createPath(gameMap, 'x');
    }

    for (let i = 0; i < randomInteger(MIN_PATH_COUNT, MAX_PATH_COUNT); i++) {
        createPath(gameMap, 'y');
    }

    for (let i = 0; i < randomInteger(MIN_ROOMS, MAX_ROOMS); i++) {
        createRoom(gameMap);
    }

    pathToNonAvailable(gameMap)
    pathToNonAvailableNearRoom(gameMap)
    renderMap(gameMap);

    // console.log(roomsRelevant, pathXRelevant, pathYRelevant);


}

document.addEventListener('DOMContentLoaded', initGame);