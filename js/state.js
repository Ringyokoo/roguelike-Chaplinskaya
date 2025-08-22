export const state = {
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
