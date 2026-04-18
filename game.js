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

// ─── Game state ───────────────────────────────────────────────────────────────
// Declared here; initialised (and reset) in initGame() in ui.js.
let path, pathSet;
let turrets, enemies, bullets, particles;
let wave, lives, score, gold, phase;
let spawnedCount, lastSpawnTime, lastFrame;
let paused = false;
let hoverCell = null;           // {row, col} under mouse, or null

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
    if (spawnedCount < ENEMIES_PER_WAVE && ts - lastSpawnTime >= SPAWN_MS) {
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
      setStartButton('Start Game', ['dimmed']);
      showOverlay('Game Over', 'Play Again', `Score: ${score}`);
    } else if (spawnedCount >= ENEMIES_PER_WAVE && enemies.length === 0 && particles.length === 0) {
      bullets = [];
      if (wave >= TOTAL_WAVES) {
        phase = 'win';
        setStartButton('Start Game', ['dimmed']);
        showOverlay('You win!', 'Play Again', `Score: ${score}`);
      } else {
        phase = 'between';
        canvas.classList.add('placing');
        setStartButton(`Start Wave ${wave + 1}`);
        hideOverlay();
      }
    }
  }

  render();
  requestAnimationFrame(gameLoop);
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
initGame();
requestAnimationFrame(gameLoop);
