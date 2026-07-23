// ============================================================
// BUN RUN: ESCAPE THE WOLF
// Built from the Week 2 platformer structure.
// The scrolling camera is adapted from the Week 6 world camera.
// ============================================================

const CANVAS_W = 800;
const CANVAS_H = 450;
const GRAVITY = 0.6;
const CAM_SMOOTHING = 0.1;
const INVINCIBLE_FRAMES = 75;
const WOLF_HIT_SLOW_FRAMES = 90;
const WOLF_RESTART_HITS = 3;
const WOLF_CHASE_START_DISTANCE = 140;
const DEBUG_PANEL_HEIGHT = 72;

const STATE_TITLE = "title";
const STATE_PLAY = "play";
const STATE_LEVEL_COMPLETE = "levelComplete";
const STATE_GAME_OVER = "gameOver";
const STATE_VICTORY = "victory";

let gameState = STATE_TITLE;
let currentLevel = 1;

let level1Data;
let level2Data;
let dayBackground;
let nightBackground;
let bunnySprite;
let wolfSprite;
let wolf;
let appleSound;
let backgroundMusic;
let startScreenSound;
let hitSound;
let loseSound;
let loseScreenSound;
let winSound;
let winScreenSound;
let debugPanelVisible = false;

let platforms = [];
let traps = [];
let exitBurrow;
let currentWorldWidth = 3000;

let camX = 0;
let levelMessageTimer = 0;

let player = {
  x: 90,
  y: 350,
  vx: 0,
  vy: 0,
  r: 20,

  speed: 0.55,
  maxSpeed: 4.5,
  jumpForce: -12,
  friction: 0.78,

  onGround: false,
  facing: 1,
  anim: 0,

  health: 3,
  maxHealth: 3,
  invincible: false,
  invincibleTimer: 0,
  slowTimer: 0
};

// ============================================================
// LOAD FILES
// ============================================================
function preload() {
  level1Data = loadJSON("data/level1.json");
  level2Data = loadJSON("data/level2.json");
  dayBackground = loadImage("assets/images/sunny_meadow.svg");
  nightBackground = loadImage("assets/images/moonlight_forest.svg");
  bunnySprite = loadImage("assets/images/bunny.svg");
  wolfSprite = loadImage("assets/images/wolf.svg");

  appleSound = loadSound("assets/audio/apple.mp3");
  backgroundMusic = loadSound("assets/audio/background.mp3");
  startScreenSound = loadSound("assets/audio/startscreen.mp3");
  hitSound = loadSound("assets/audio/hit.mp3");
  loseSound = loadSound("assets/audio/lose.mp3");
  loseScreenSound = loadSound("assets/audio/losescreen.mp3");
  winSound = loadSound("assets/audio/win.mp3");
  winScreenSound = loadSound("assets/audio/winscreen.mp3");
}

function playBackgroundMusic() {
  if (backgroundMusic && !backgroundMusic.isPlaying()) {
    backgroundMusic.setVolume(0.35);
    backgroundMusic.loop();
  }
}

function playStartScreenSound() {
  if (startScreenSound && !startScreenSound.isPlaying()) {
    startScreenSound.setVolume(0.4);
    startScreenSound.loop();
  }
}

function stopStartScreenSound() {
  if (startScreenSound && startScreenSound.isPlaying()) {
    startScreenSound.stop();
  }
}

function stopBackgroundMusic() {
  if (backgroundMusic && backgroundMusic.isPlaying()) {
    backgroundMusic.stop();
  }
}

function stopLoseScreenSound() {
  if (loseScreenSound && loseScreenSound.isPlaying()) {
    loseScreenSound.stop();
  }
}

function stopWinScreenSound() {
  if (winScreenSound && winScreenSound.isPlaying()) {
    winScreenSound.stop();
  }
}

function playAppleSound() {
  if (appleSound) {
    appleSound.play();
  }
}

function playHitSound() {
  if (hitSound) {
    hitSound.play();
  }
}

function playLoseSound() {
  if (loseSound) {
    loseSound.play();
  }
}

function playLoseScreenSound() {
  if (loseScreenSound && !loseScreenSound.isPlaying()) {
    loseScreenSound.setVolume(0.4);
    loseScreenSound.loop();
  }
}

function playWinSound() {
  if (winSound) {
    winSound.play();
  }
}

function playWinScreenSound() {
  if (winScreenSound) {
    if (!winScreenSound.isPlaying()) {
      winScreenSound.setVolume(0.4);
      winScreenSound.loop();
    }
  }
}

function goToLevel(levelNumber) {
  player.health = player.maxHealth;
  initializeLevel(levelNumber);
  stopStartScreenSound();
  stopWinScreenSound();
  stopLoseScreenSound();
  gameState = STATE_PLAY;
  playBackgroundMusic();
}

function goToStartScreen() {
  stopBackgroundMusic();
  stopStartScreenSound();
  stopWinScreenSound();
  stopLoseScreenSound();
  gameState = STATE_TITLE;
}

function goToWinScreen() {
  stopBackgroundMusic();
  stopStartScreenSound();
  stopLoseScreenSound();
  playWinScreenSound();
  gameState = STATE_VICTORY;
}

function goToLoseScreen() {
  stopBackgroundMusic();
  stopStartScreenSound();
  stopWinScreenSound();
  playLoseScreenSound();
  gameState = STATE_GAME_OVER;
}

// ============================================================
// SETUP
// ============================================================
function setup() {
  createCanvas(CANVAS_W, CANVAS_H);
  textFont("Open Sans");
  initializeLevel(1);
}

// ============================================================
// MAIN DRAW LOOP
// ============================================================
function draw() {
  if (gameState === STATE_TITLE) {
    stopBackgroundMusic();
    stopWinScreenSound();
    stopLoseScreenSound();
    playStartScreenSound();
    drawTitleScreen();
    drawDebugPanel();
    return;
  }

  stopStartScreenSound();

  if (gameState === STATE_LEVEL_COMPLETE) {
    stopBackgroundMusic();
    stopWinScreenSound();
    stopLoseScreenSound();
    drawLevelCompleteScreen();
    drawDebugPanel();
    return;
  }

  if (gameState === STATE_GAME_OVER) {
    stopBackgroundMusic();
    stopWinScreenSound();
    playLoseScreenSound();
    drawGameOverScreen();
    drawDebugPanel();
    return;
  }

  if (gameState === STATE_VICTORY) {
    stopBackgroundMusic();
    playWinScreenSound();
    stopLoseScreenSound();
    drawVictoryScreen();
    drawDebugPanel();
    return;
  }

  stopStartScreenSound();
  stopWinScreenSound();
  stopLoseScreenSound();
  playBackgroundMusic();
  drawGameplay();
  drawDebugPanel();
}

// ============================================================
// LEVEL SETUP
// ============================================================
function initializeLevel(levelNumber) {
  currentLevel = levelNumber;

  let sourceData;
  if (currentLevel === 1) {
    sourceData = level1Data;
  } else {
    sourceData = level2Data;
  }

  currentWorldWidth = sourceData.worldWidth;
  exitBurrow = copyObject(sourceData.exit);

  platforms = [];
  for (let i = 0; i < sourceData.platforms.length; i++) {
    let p = copyObject(sourceData.platforms[i]);

    p.startX = p.x;
    p.startY = p.y;
    p.falling = false;
    p.fallTimer = 0;
    p.moveDirection = 1;

    platforms.push(p);
  }

  traps = [];
  for (let i = 0; i < sourceData.traps.length; i++) {
    let trap = copyObject(sourceData.traps[i]);

    trap.startX = trap.x;
    trap.startY = trap.y;
    trap.active = false;
    trap.used = false;
    trap.vy = 0;

    traps.push(trap);
  }

  player.x = sourceData.start.x;
  player.y = sourceData.start.y;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.invincible = false;
  player.invincibleTimer = 0;
  player.slowTimer = 0;

  wolf = {
    x: sourceData.start.x - 220,
    y: sourceData.start.y,
    vx: 0,
    r: 30,
    speed: 3.6,
    hits: 0,
    chaseOffset: 120,
    startX: sourceData.start.x
  };

  camX = 0;
}

function copyObject(source) {
  return JSON.parse(JSON.stringify(source));
}

// ============================================================
// GAMEPLAY
// ============================================================
function drawGameplay() {
  drawLevelBackground();

  if (!debugPanelVisible) {
    handleInput();
    applyPhysics();
    updatePlatforms();
    resolvePlatformCollisions();
    updateTraps();
    updateWolf();
    checkTrapCollisions();
    checkWolfCollision();
    checkExitCollision();
    updateInvincibility();
    updateCamera();
  }

  push();
  translate(-camX, 0);

  drawPlatforms();
  drawTraps();
  drawWolf();
  drawExitBurrow();
  drawBunny();

  pop();

  drawHUD();
}

// ============================================================
// CAMERA — ADAPTED FROM WEEK 6
// ============================================================
function updateCamera() {
  let targetX = player.x - width * 0.35;

  targetX = constrain(
    targetX,
    0,
    max(0, currentWorldWidth - width)
  );

  camX = lerp(camX, targetX, CAM_SMOOTHING);
}

// The background stays fixed to the screen.
// This avoids stretching one picture across the entire level.
function drawLevelBackground() {
  if (currentLevel === 1) {
    if (dayBackground) {
      image(dayBackground, 0, 0, width, height);
    } else {
      background(170, 220, 145);
    }
  } else {
    if (nightBackground) {
      image(nightBackground, 0, 0, width, height);
    } else {
      background(35, 40, 70);
    }

    // Small moon overlay for Level 2.
    noStroke();
    fill(255, 250, 210, 220);
    ellipse(690, 80, 75);
  }
}

// ============================================================
// MOVEMENT — BASED ON WEEK 2
// ============================================================
function handleInput() {
  let slowFactor = player.slowTimer > 0 ? 0.55 : 1;

  if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) {
    player.vx -= player.speed * slowFactor;
    player.facing = -1;
  }

  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {
    player.vx += player.speed * slowFactor;
    player.facing = 1;
  }

  player.vx = constrain(
    player.vx,
    -player.maxSpeed * slowFactor,
    player.maxSpeed * slowFactor
  );

  let movingLeft = keyIsDown(LEFT_ARROW) || keyIsDown(65);
  let movingRight = keyIsDown(RIGHT_ARROW) || keyIsDown(68);

  if (!movingLeft && !movingRight) {
    player.vx *= player.friction;
  }

  if (player.slowTimer > 0) {
    player.slowTimer--;
  }
}

function keyPressed() {
  if (key === "e" || key === "E") {
    debugPanelVisible = !debugPanelVisible;
    return;
  }

  if (debugPanelVisible) {
    if (key === "1") {
      goToLevel(1);
      return;
    }

    if (key === "2") {
      goToLevel(2);
      return;
    }

    if (key === "s" || key === "S") {
      goToStartScreen();
      return;
    }

    if (key === "w" || key === "W") {
      goToWinScreen();
      return;
    }

    if (key === "o" || key === "O") {
      goToLoseScreen();
      return;
    }
  }

  let jumpPressed =
    keyCode === UP_ARROW ||
    key === "w" ||
    key === "W" ||
    key === " ";

  if (gameState === STATE_PLAY && jumpPressed && player.onGround) {
    player.vy = player.jumpForce;
    player.onGround = false;
  }

  if (gameState === STATE_TITLE && keyCode === ENTER) {
    player.health = player.maxHealth;
    goToLevel(1);
  }

  if (gameState === STATE_LEVEL_COMPLETE && keyCode === ENTER) {
    goToLevel(2);
  }

  if (
    (gameState === STATE_GAME_OVER ||
      gameState === STATE_VICTORY) &&
    (key === "r" || key === "R")
  ) {
    player.health = player.maxHealth;
    goToStartScreen();
  }

  if (gameState === STATE_PLAY && (key === "r" || key === "R")) {
    resetCurrentAttempt();
  }
}

function applyPhysics() {
  player.vy += GRAVITY;

  let previousX = player.x;
  let previousY = player.y;

  player.x += player.vx;
  player.y += player.vy;

  player.previousX = previousX;
  player.previousY = previousY;

  player.x = constrain(
    player.x,
    player.r,
    currentWorldWidth - player.r
  );

  if (player.y > height + 100) {
    loseHeart();
  }

  player.onGround = false;
}

// ============================================================
// PLATFORMS
// ============================================================
function updatePlatforms() {
  for (let i = 0; i < platforms.length; i++) {
    let p = platforms[i];

    if (p.type === "moving") {
      p.x += p.speed * p.moveDirection;

      if (p.x > p.startX + p.distance) {
        p.x = p.startX + p.distance;
        p.moveDirection = -1;
      }

      if (p.x < p.startX) {
        p.x = p.startX;
        p.moveDirection = 1;
      }
    }

    if (p.type === "falling" && p.falling) {
      p.fallTimer++;

      if (p.fallTimer > p.fallDelay) {
        p.y += 4;
      }
    }
  }
}

function resolvePlatformCollisions() {
  for (let i = 0; i < platforms.length; i++) {
    let p = platforms[i];

    let playerLeft = player.x - player.r;
    let playerRight = player.x + player.r;
    let playerTop = player.y - player.r;
    let playerBottom = player.y + player.r;
    let previousLeft = player.previousX - player.r;
    let previousRight = player.previousX + player.r;
    let previousTop = player.previousY - player.r;
    let previousBottom = player.previousY + player.r;

    let horizontalOverlap =
      playerRight > p.x &&
      playerLeft < p.x + p.w;

    let verticalOverlap =
      playerBottom > p.y &&
      playerTop < p.y + p.h;

    if (!horizontalOverlap || !verticalOverlap) {
      continue;
    }

    let hitFromTop = previousBottom <= p.y;
    let hitFromBottom = previousTop >= p.y + p.h;
    let hitFromLeft = previousRight <= p.x;
    let hitFromRight = previousLeft >= p.x + p.w;

    if (hitFromTop && player.vy >= 0) {
      player.y = p.y - player.r;
      player.vy = 0;
      player.onGround = true;

      if (p.type === "bounce") {
        player.vy = p.bounceStrength;
        player.onGround = false;
      }

      if (p.type === "falling") {
        p.falling = true;
      }
    } else if (hitFromBottom && player.vy < 0) {
      player.y = p.y + p.h + player.r;
      player.vy = 0;
    } else if (hitFromLeft && player.vx > 0) {
      player.x = p.x - player.r;
      player.vx = 0;
    } else if (hitFromRight && player.vx < 0) {
      player.x = p.x + p.w + player.r;
      player.vx = 0;
    } else {
      let distances = [
        { side: "top", value: abs(playerBottom - p.y) },
        { side: "bottom", value: abs(playerTop - (p.y + p.h)) },
        { side: "left", value: abs(playerRight - p.x) },
        { side: "right", value: abs(playerLeft - (p.x + p.w)) }
      ];

      distances.sort(function(a, b) {
        return a.value - b.value;
      });

      if (distances[0].side === "top") {
        player.y = p.y - player.r;
        player.vy = 0;
        player.onGround = true;
      } else if (distances[0].side === "bottom") {
        player.y = p.y + p.h + player.r;
        player.vy = 0;
      } else if (distances[0].side === "left") {
        player.x = p.x - player.r;
        player.vx = 0;
      } else {
        player.x = p.x + p.w + player.r;
        player.vx = 0;
      }
    }
  }
}

function drawPlatforms() {
  noStroke();

  for (let i = 0; i < platforms.length; i++) {
    let p = platforms[i];

    fill(116, 184, 83);

    rect(p.x, p.y, p.w, p.h, 6);

    // Dirt underneath the green platform top.
    if (p.type === "ground" || p.type === "normal") {
      fill(117, 76, 48);
      rect(p.x, p.y + 8, p.w, max(8, p.h - 8), 4);
      fill(116, 184, 83);
      rect(p.x, p.y, p.w, 10, 6);
    }
  }
}

function updateWolf() {
  if (!wolf || gameState !== STATE_PLAY) {
    return;
  }

  if (player.x - wolf.startX < WOLF_CHASE_START_DISTANCE) {
    wolf.vx = 0;
    wolf.y = lerp(wolf.y, player.y + 12, 0.06);
    return;
  }

  let targetX = player.x;
  let deltaX = targetX - wolf.x;
  let moveX = constrain(deltaX, -wolf.speed, wolf.speed);

  wolf.vx = lerp(wolf.vx, moveX, 0.18);
  wolf.x += wolf.vx;
  wolf.y = lerp(wolf.y, player.y + 12, 0.12);

  wolf.x = constrain(wolf.x, 0, currentWorldWidth);
}

function checkWolfCollision() {
  if (!wolf || gameState !== STATE_PLAY || player.invincible) {
    return;
  }

  let wolfLeft = wolf.x - wolf.r;
  let wolfRight = wolf.x + wolf.r;
  let wolfTop = wolf.y - wolf.r;
  let wolfBottom = wolf.y + wolf.r;

  let playerLeft = player.x - player.r;
  let playerRight = player.x + player.r;
  let playerTop = player.y - player.r;
  let playerBottom = player.y + player.r;

  let overlap =
    playerRight > wolfLeft &&
    playerLeft < wolfRight &&
    playerBottom > wolfTop &&
    playerTop < wolfBottom;

  if (overlap) {
    onWolfHit();
  }
}

function onWolfHit() {
  player.health--;
  player.invincible = true;
  player.invincibleTimer = INVINCIBLE_FRAMES;
  player.slowTimer = WOLF_HIT_SLOW_FRAMES;

  wolf.hits++;
  wolf.x = player.x - wolf.chaseOffset - 120;
  wolf.y = player.y + 10;
  wolf.vx = 0;

  if (player.health <= 0 || wolf.hits >= WOLF_RESTART_HITS) {
    playLoseSound();
    initializeLevel(currentLevel);
    player.health = player.maxHealth;
    wolf.hits = 0;
  }
}

function drawWolf() {
  if (!wolf) {
    return;
  }

  let facing = player.x >= wolf.x ? 1 : -1;

  push();
  translate(wolf.x, wolf.y);
  scale(facing, 1);

  if (wolfSprite) {
    imageMode(CENTER);
    image(wolfSprite, 0, 0, 130, 92);
    pop();
    return;
  }

  fill(80, 76, 86);
  stroke(35, 32, 40);
  strokeWeight(2);

  ellipse(0, 4, 58, 34);
  ellipse(18, -5, 34, 28);

  fill(64, 60, 70);
  noStroke();
  triangle(5, -18, 13, -40, 23, -15);
  triangle(26, -17, 31, -38, 39, -14);

  fill(232);
  ellipse(25, -6, 7, 7);

  fill(35);
  ellipse(27, -5, 2.5, 2.5);

  fill(236, 160, 90);
  triangle(36, 1, 50, 5, 36, 11);

  stroke(35, 32, 40);
  strokeWeight(3);
  line(-14, 18, -20, 30);
  line(-2, 18, -5, 31);
  line(11, 18, 10, 31);
  line(23, 18, 25, 31);

  pop();
}

// ============================================================
// LEVEL DEVIL-STYLE TRAPS
// ============================================================
function updateTraps() {
  for (let i = 0; i < traps.length; i++) {
    let trap = traps[i];

    if (
      !trap.used &&
      player.x >= trap.triggerX
    ) {
      trap.active = true;
    }

    if (trap.type === "rollingLog" && trap.active) {
      trap.x += trap.speed;
    }

    if (trap.type === "fallingBranch" && trap.active) {
      trap.vy += 0.45;
      trap.y += trap.vy;
    }
  }
}

function checkTrapCollisions() {
  if (player.invincible) {
    return;
  }

  for (let i = 0; i < traps.length; i++) {
    let trap = traps[i];

    if (trap.type === "hiddenSpikes" && !trap.active) {
      continue;
    }

    if (trap.type === "fakeStrawberry") {
      if (!trap.used && rectanglesOverlapPlayer(trap)) {
        player.vx = trap.push;
        player.vy = -4;
        trap.used = true;
        playAppleSound();
      }

      continue;
    }

    if (!trap.active) {
      continue;
    }

    if (rectanglesOverlapPlayer(trap)) {
      loseHeart();
      return;
    }
  }
}

function rectanglesOverlapPlayer(rectObject) {
  let playerLeft = player.x - player.r;
  let playerRight = player.x + player.r;
  let playerTop = player.y - player.r;
  let playerBottom = player.y + player.r;

  return (
    playerRight > rectObject.x &&
    playerLeft < rectObject.x + rectObject.w &&
    playerBottom > rectObject.y &&
    playerTop < rectObject.y + rectObject.h
  );
}

function drawTraps() {
  for (let i = 0; i < traps.length; i++) {
    let trap = traps[i];

    if (trap.type === "hiddenSpikes" && trap.active) {
      drawSpikes(trap);
    }

    if (trap.type === "fakeStrawberry" && !trap.used) {
      drawStrawberry(trap);
    }

    if (trap.type === "rollingLog") {
      drawRollingLog(trap);
    }

    if (trap.type === "fallingBranch") {
      drawBranch(trap);
    }
  }
}

function drawSpikes(trap) {
  fill(90);
  noStroke();

  let spikeCount = 5;
  let spikeWidth = trap.w / spikeCount;

  for (let i = 0; i < spikeCount; i++) {
    let left = trap.x + i * spikeWidth;

    triangle(
      left,
      trap.y + trap.h,
      left + spikeWidth / 2,
      trap.y,
      left + spikeWidth,
      trap.y + trap.h
    );
  }
}

function drawStrawberry(trap) {
  noStroke();
  fill(235, 65, 85);
  ellipse(
    trap.x + trap.w / 2,
    trap.y + trap.h / 2 + 2,
    trap.w,
    trap.h
  );

  fill(60, 155, 70);
  triangle(
    trap.x + 5,
    trap.y + 5,
    trap.x + trap.w / 2,
    trap.y - 4,
    trap.x + trap.w - 5,
    trap.y + 5
  );
}

function drawRollingLog(trap) {
  push();
  translate(trap.x + trap.w / 2, trap.y + trap.h / 2);

  fill(130, 78, 38);
  stroke(75, 42, 25);
  strokeWeight(2);
  rect(
    -trap.w / 2,
    -trap.h / 2,
    trap.w,
    trap.h,
    10
  );

  fill(185, 123, 65);
  ellipse(
    trap.w / 2 - 5,
    0,
    trap.h - 4,
    trap.h - 4
  );

  pop();
}

function drawBranch(trap) {
  fill(105, 65, 38);
  noStroke();
  rect(trap.x, trap.y, trap.w, trap.h, 8);

  triangle(
    trap.x + 25,
    trap.y + trap.h,
    trap.x + 45,
    trap.y + trap.h,
    trap.x + 34,
    trap.y + trap.h + 18
  );
}

// ============================================================
// DAMAGE AND RESET
// ============================================================
function loseHeart() {
  if (player.invincible || gameState !== STATE_PLAY) {
    return;
  }

  player.health--;
  playHitSound();

  if (player.health <= 0) {
    playLoseSound();
    stopBackgroundMusic();
    gameState = STATE_GAME_OVER;
    return;
  }

  resetCurrentAttempt();

  player.invincible = true;
  player.invincibleTimer = INVINCIBLE_FRAMES;
}

function resetCurrentAttempt() {
  let savedHealth = player.health;
  initializeLevel(currentLevel);
  player.health = savedHealth;
}

function updateInvincibility() {
  if (player.invincible) {
    player.invincibleTimer--;

    if (player.invincibleTimer <= 0) {
      player.invincible = false;
    }
  }
}

// ============================================================
// EXIT AND LEVEL CHANGE
// ============================================================
function checkExitCollision() {
  if (!rectanglesOverlapPlayer(exitBurrow)) {
    return;
  }

  if (currentLevel === 1) {
    playWinSound();
    stopBackgroundMusic();
    gameState = STATE_LEVEL_COMPLETE;
  } else {
    playWinScreenSound();
    stopBackgroundMusic();
    gameState = STATE_VICTORY;
  }
}

function drawExitBurrow() {
  let x = exitBurrow.x;
  let y = exitBurrow.y;
  let w = exitBurrow.w;
  let h = exitBurrow.h;

  noStroke();

  fill(82, 130, 58);
  ellipse(x + w / 2, y + 15, w + 35, 45);

  fill(126, 86, 54);
  rect(x, y + 20, w, h - 20, 18);

  fill(35, 28, 28);
  arc(
    x + w / 2,
    y + h,
    w * 0.65,
    h * 1.15,
    PI,
    TWO_PI
  );
}

// ============================================================
// BUNNY CHARACTER
// ============================================================
function drawBunny() {
  if (
    player.invincible &&
    floor(player.invincibleTimer / 5) % 2 === 0
  ) {
    return;
  }

  player.anim += 0.18;

  let bob = 0;
  if (abs(player.vx) > 0.2 && player.onGround) {
    bob = sin(player.anim) * 2;
  }

  push();
  translate(player.x, player.y + bob);
  scale(player.facing, 1);

  if (bunnySprite) {
    imageMode(CENTER);
    image(bunnySprite, 0, -6, 112, 102);
    pop();
    return;
  }

  noStroke();
  fill(250);
  ellipse(-17, 1, 12, 12);

  fill(250, 245, 240);
  stroke(90);
  strokeWeight(1.5);
  ellipse(0, 3, 34, 27);

  ellipse(-9, 15, 13, 7);
  ellipse(9, 15, 13, 7);

  ellipse(10, -12, 25, 24);

  ellipse(4, -31, 8, 25);
  ellipse(15, -32, 8, 26);

  noStroke();
  fill(255, 185, 195);
  ellipse(4, -31, 3, 16);
  ellipse(15, -32, 3, 17);

  fill(45);
  ellipse(16, -14, 4, 5);

  fill(245, 145, 155);
  ellipse(22, -9, 3, 3);
  ellipse(12, -6, 6, 4);

  fill(235, 105, 135);
  triangle(-2, -7, 12, -2, 1, 7);
  rect(-6, -7, 19, 5, 3);

  pop();
}

// ============================================================
// HUD AND SCREENS
// ============================================================
function drawHUD() {
  noStroke();
  fill(255, 245);
  rect(12, 12, 300, 74, 12);

  fill(45);
  textAlign(LEFT);
  textSize(15);
  text("Level " + currentLevel, 25, 35);

  text("Hearts:", 25, 60);
  for (let i = 0; i < player.maxHealth; i++) {
    if (i < player.health) {
      fill(235, 70, 95);
    } else {
      fill(170);
    }

    text("♥", 88 + i * 24, 60);
  }

  fill(45);
  textSize(12);
  text(
    "Move: A/D or arrows   Jump: W/Up/Space   R: reset",
    25,
    79
  );
}

function drawDebugPanel() {
  if (!debugPanelVisible) {
    return;
  }

  let panelY = height - DEBUG_PANEL_HEIGHT;

  noStroke();
  fill(20, 24, 38, 220);
  rect(0, panelY, width, DEBUG_PANEL_HEIGHT);

  fill(255);
  textAlign(LEFT);
  textSize(14);
  text("Debug Panel - press E to hide", 16, panelY + 20);

  textSize(12);
  text(
    "1: Level 1   2: Level 2   S: Start Screen   W: Win Screen   O: Lose/Restart Screen",
    16,
    panelY + 44
  );

  text(
    "Use these shortcuts only while the panel is visible.",
    16,
    panelY + 62
  );
}

function drawTitleScreen() {
  image(dayBackground, 0, 0, width, height);

  fill(255, 235);
  rect(120, 80, 560, 290, 24);

  textAlign(CENTER);
  fill(235, 90, 135);
  textSize(48);
  text("Bun Run", width / 2, 150);

  fill(50);
  textSize(24);
  text("Escape the Wolf", width / 2, 190);

  textSize(17);
  text(
    "Run to the burrow at the end of each level.\n" +
    "Watch out—the forest changes when you get close!",
    width / 2,
    245
  );

  textSize(15);
  text(
    "A/D or arrows to move • W/Up/Space to jump",
    width / 2,
    305
  );

  fill(235, 90, 135);
  textSize(20);
  text("Press Enter to Start", width / 2, 345);
}

function drawLevelCompleteScreen() {
  image(dayBackground, 0, 0, width, height);

  fill(20, 20, 40, 175);
  rect(0, 0, width, height);

  textAlign(CENTER);
  fill(255);
  textSize(42);
  text("Sunny Meadow Complete!", width / 2, 180);

  textSize(20);
  text(
    "The path continues into Moonlight Forest.",
    width / 2,
    230
  );

  textSize(18);
  text("Press Enter for Level 2", width / 2, 285);
}

function drawGameOverScreen() {
  image(nightBackground, 0, 0, width, height);

  fill(25, 15, 35, 190);
  rect(0, 0, width, height);

  textAlign(CENTER);
  fill(255);
  textSize(50);
  text("Game Over", width / 2, 190);

  textSize(20);
  text(
    "The bunny ran out of chances.",
    width / 2,
    235
  );

  textSize(17);
  text("Press R to restart", width / 2, 285);
}

function drawVictoryScreen() {
  image(dayBackground, 0, 0, width, height);

  fill(255, 240);
  rect(130, 100, 540, 250, 24);

  textAlign(CENTER);
  fill(235, 90, 135);
  textSize(48);
  text("You Escaped!", width / 2, 190);

  fill(45);
  textSize(20);
  text(
    "The bunny reached the final burrow safely.",
    width / 2,
    240
  );

  textSize(17);
  text("Press R to play again", width / 2, 295);
}
