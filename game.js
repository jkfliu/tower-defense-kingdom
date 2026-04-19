// ─── game.js ──────────────────────────────────────────────────────────────────
// Canvas setup, game state declarations, and the main game loop.
// All logic lives in the other modules loaded before this file.

// ─── Canvas setup ─────────────────────────────────────────────────────────────
const canvas = document.getElementById('canvas');
canvas.width  = W;
canvas.height = H;
const ctx = canvas.getContext('2d');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const cx = col => col * CELL + CELL / 2;   // cell-centre x
const cy = row => row * CELL + CELL / 2;   // cell-centre y
const pointInRect = (mx, my, r) => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;

// ─── Game state ───────────────────────────────────────────────────────────────
// Declared here; initialised (and reset) in initGame() in ui.js.
let path, pathSet, pathRenderSet;
let turrets, enemies, bullets, particles;
let wave, lives, score, gold, phase;
let spawnedCount, lastSpawnTime, lastFrame;
let paused    = false;
let debugMode = false;
let hoverCell = null;           // {row, col} under mouse, or null

// Campaign state
let currentLevel       = 0;
let campaignLoop       = 0;
let selectedDifficulty = 0;
let justCompletedLevel = 0; // which level was just beaten (for reveal animation)
let revealProgress     = 0; // 0→1 during 'reveal' phase

// UI state
let wavePreviewDismissed = false;
let confirmRestart       = '';     // 'level' | 'campaign' | ''

function wavesInLevel()    { return Math.min(currentLevel + 1, 5); }
function enemiesPerWave()  { return debugMode ? 1 : ENEMIES_PER_WAVE; }
function resetPopups()     {
  confirmRestart      = '';
  tierPopup           = null;
  popupHoverIdx       = -1;
  turretPopup         = null;
  turretPopupHoverIdx = -1;
}

// Map camera state (pan + zoom over the map image)
let mapCamX    = 0;      // world-space pan offset X
let mapCamY    = 0;      // world-space pan offset Y
let mapZoom    = 1.0;    // current zoom level
let mapDragging = false; // true while mouse is held for panning
let mapDragStartX = 0;
let mapDragStartY = 0;
let mapDragCamX   = 0;
let mapDragCamY   = 0;

// Preloaded map background image
const MAP_IMG = new Image();
MAP_IMG.src = 'map.jpg';

// Map popup state
let mapPopup = null; // { levelId } when level-select popup is open, else null

// Popup state
let tierPopup           = null; // { row, col, px, py } — new-turret popup
let popupHoverIdx       = -1;
let turretPopup         = null; // { turret, px, py }   — upgrade/sell popup
let turretPopupHoverIdx = -1;

// ─── Game loop ────────────────────────────────────────────────────────────────
function gameLoop(ts) {
  if (lastFrame === 0) lastFrame = ts;
  const dt = Math.min((ts - lastFrame) / 1000, 0.1);
  lastFrame = ts;

  if (phase === 'wave' && !paused) {
    if (spawnedCount < enemiesPerWave() && ts - lastSpawnTime >= SPAWN_MS) {
      enemies.push(makeEnemy());
      spawnedCount++;
      lastSpawnTime = ts;
    }

    updateEnemies(dt);
    updateTurrets(dt);
    updateBullets(dt);
    updateParticles(dt);

    if (lives <= 0) {
      phase = 'lose';
      bullets = [];
      setStartButton('', ['dimmed']);
      showOverlay('Defeated!', 'Try Again', `Score: ${score}`);
    } else if (spawnedCount >= enemiesPerWave() && enemies.length === 0 && particles.length === 0) {
      bullets = [];
      if (wave >= wavesInLevel()) {
        completeLevel();
      } else {
        phase = 'between';
        canvas.classList.add('placing');
        setStartButton(`Start Wave ${wave + 1}`);
        hideOverlay();
      }
    }
  }

  if (phase === 'map') {
    drawKingdomMap();
  } else if (phase === 'victory') {
    drawVictoryScreen();
  } else if (phase === 'reveal') {
    revealProgress = Math.min(1, revealProgress + dt / 2.2);
    drawRevealScreen();
  } else {
    render();
  }
  requestAnimationFrame(gameLoop);
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
initGame();
requestAnimationFrame(gameLoop);
