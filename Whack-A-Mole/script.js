// ---- settings ----
const TOTAL_ROUNDS = 60;
const ROUNDS_PER_STAGE = 10;
const MIN_DELAY = 500;
const MAX_DELAY = 2000;
const ROUND_TIME_LIMIT = 2000;
const STARTING_LIVES = 5;
const TOTAL_STAGES = TOTAL_ROUNDS / ROUNDS_PER_STAGE;

// Difficulty progression
const DIFFICULTY_FACTOR = 0.85;

// Mole size relative to the screen
const BASE_SIZE_RATIO = 0.14;
const MIN_MOLE_SIZE = 24;
const DUAL_MOLE_ROUNDS = 10;
const STYLE_RANKS = [
    'Dismal',
    'Crazy',
    'Badass',
    'Apocalyptic!',
    'Savage!',
    'Sick Skills!!',
    "Smokin' Sexy Style!!!"
];

// ---- game state ----
let score = 0;
let round = 0;
let lives = STARTING_LIVES;
let multiplier = 1;
let currentMoles = [];
let delayTimer = null;     
let roundTimer = null;
let state = 'idle';

const startBtn = document.getElementById('startBtn');
const scoreEl = document.getElementById('score');
const styleRankEl = document.getElementById('styleRank');
const roundsEl = document.getElementById('rounds');
const livesEl = document.getElementById('lives');
const messageEl = document.getElementById('message');
const stageEl = document.getElementById('stage');
const arena = document.getElementById('arena');
const arenaLabel = document.getElementById('arenaLabel');

function playHitSound() {
  const hitSound = new Audio('hit.mp3');
  hitSound.currentTime = 0;
  hitSound.play().catch(error => {
    console.log('Sound playback failed:', error);
  });
}

// global click listener
document.addEventListener('click', () => {
  playHitSound();
});

function updateStyleRank() {
  styleRankEl.textContent = 'Style: ' + STYLE_RANKS[multiplier - 1] + ' (' + multiplier + 'x)';
}

// picks a random whole number between min and max (inclusive)
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// returns the current stage based on the round
function getCurrentStage() {
    return Math.ceil(round / ROUNDS_PER_STAGE);
}

// calculates mole size based on screen dimensions and stage
function getMoleSize() {
    const stage = getCurrentStage();
    const screenSize = Math.min(
        window.innerWidth,
        window.innerHeight
    );

    const difficulty = Math.pow(
        DIFFICULTY_FACTOR,
        stage - 1
    );

    return Math.max(
        MIN_MOLE_SIZE,
        Math.round(screenSize * BASE_SIZE_RATIO * difficulty)
    );
}

// calculates how long the mole stays visible
function getRoundTimeLimit() {
    const stage = getCurrentStage();
    return Math.round(
        ROUND_TIME_LIMIT *
        Math.pow(DIFFICULTY_FACTOR, stage - 1)
    );
}

// updates the stage display
function updateStage() {
    const stage = getCurrentStage();
    stageEl.textContent =
        'Stage: ' + stage + ' / ' + TOTAL_STAGES;
}

// updates arena display
function updateArena() {

    const stage = getCurrentStage();

    // Stage 1 = 100%, Stage 6 = 40%
    const scale = Math.max(
        0.4,
        1 - (stage - 1) * 0.12
    );

    const width = window.innerWidth * 0.9 * scale;
    const height = window.innerHeight * 0.65 * scale;

    arena.style.width = width + 'px';
    arena.style.height = height + 'px';

    arenaLabel.textContent = 'STAGE ' + stage + ' ARENA';
}

// resets score/round counters and kicks off round 1
function startGame() {
  score = 0;
  round = 0;
  lives = STARTING_LIVES;
  multiplier = 1;
  scoreEl.textContent = 'Score: 0';
  updateStyleRank();
  roundsEl.textContent = 'Round: 0 / ' + TOTAL_ROUNDS;
  stageEl.textContent = 'Stage: 0 / ' + TOTAL_STAGES;
  livesEl.textContent = 'Lives: ' + lives;
  messageEl.textContent = '';
  startBtn.textContent = 'Start';
  startNextRound();
}

// begins one round: hides the start button and waits a random delay
// before showing the mole somewhere random on screen
function startNextRound() {
    round++;
    roundsEl.textContent =
        'Round: ' + round + ' / ' + TOTAL_ROUNDS;
    updateStage();
    state = 'waiting';
    startBtn.style.display = 'none';
    messageEl.textContent = '';
    const stage = getCurrentStage();
    const difficulty = Math.pow(
        DIFFICULTY_FACTOR,
        stage - 1
    );

    // mole appears faster in later stages
    const minDelay = Math.round(MIN_DELAY * difficulty);
    const maxDelay = Math.round(MAX_DELAY * difficulty);

    const delay = randomBetween(
        minDelay,
        Math.max(minDelay, maxDelay)
    );

    delayTimer = setTimeout(showMole, delay);
}

// creates one or two targets for the current round
function showMole() {
  const moleTypes = round <= DUAL_MOLE_ROUNDS
    ? ['positive', 'negative']
    : ['positive'];

  currentMoles = moleTypes.map((type, index) => {
    const size = getMoleSize();
    const maxX = window.innerWidth - size;
    const maxY = window.innerHeight - size;
    const regionWidth = window.innerWidth / moleTypes.length;
    const minX = moleTypes.length === 2
      ? Math.min(Math.max(0, maxX), Math.floor(index * regionWidth))
      : 0;
    const maxRegionX = moleTypes.length === 2
      ? Math.min(Math.max(0, maxX), Math.floor((index + 1) * regionWidth - size))
      : Math.max(0, maxX);
    const maxPositionX = Math.max(minX, maxRegionX);
    const x = randomBetween(minX, maxPositionX);
    const HUD_HEIGHT = 130;
    const y = randomBetween(HUD_HEIGHT, Math.max(HUD_HEIGHT, maxY));

    const mole = document.createElement('div');
    mole.className = 'mole ' + type;
    mole.dataset.scoreType = type;
    mole.setAttribute('aria-label', type + ' score mole');
    mole.style.width = size + 'px';
    mole.style.height = size + 'px';
    mole.style.left = x + 'px';
    mole.style.top = y + 'px';
    mole.addEventListener('click', () => whackMole(mole));
    document.body.appendChild(mole);
    return mole;
  });

  state = 'mole-visible';
  roundTimer = setTimeout(
    () => finishRound(true),
    getRoundTimeLimit()
  );
}

// applies a target's score and finishes the round after one hit
function whackMole(mole) {
  if (state !== 'mole-visible' || !currentMoles.includes(mole)) return;

  if (mole.dataset.scoreType === 'positive') {
    score += multiplier;
    multiplier = Math.min(multiplier + 1, STYLE_RANKS.length);
  } else {
    score -= 1;
    multiplier = Math.max(1, multiplier - 1);
  }
  scoreEl.textContent = 'Score: ' + score;
  updateStyleRank();

  finishRound(false);
}

function finishRound(timedOut, missed = false) {
  clearTimeout(roundTimer);
  if (timedOut || missed) {
    multiplier = 1;
    updateStyleRank();
  }
  currentMoles.forEach(mole => mole.remove());
  currentMoles = [];

  if (lives <= 0 || round >= TOTAL_ROUNDS) {
    endGame();
  } else {
    state = 'return';
    startBtn.style.display = 'inline-block';
    messageEl.textContent = missed
      ? 'Miss! Move your mouse back to Start for the next round.'
      : timedOut
        ? "Time's up! Move your mouse back to Start for the next round."
        : 'Move your mouse back to Start for the next round';
  }
}

// triggered when the mouse re-enters the start button between rounds
function onStartHover() {
  if (state === 'return') {
    startNextRound();
  }
}

function loseLife(){
  life--;
  livesEl.textContent = 'Lives: ' + life;

  if (life <= 0)
  {
    endGame();
  }
}
// stops the game immediately, clearing any pending mole and timer
function endGame() {
  state = 'ended';
  clearTimeout(delayTimer);
  clearTimeout(roundTimer);
  currentMoles.forEach(mole => mole.remove());
  currentMoles = [];
  startBtn.style.display = 'inline-block';
  startBtn.textContent = 'Play Again';
  messageEl.textContent = 'Game over! Final score: ' + score + ' / ' + round;
}

// a click outside every mole while targets are visible uses the round's attempt
document.addEventListener('click', (event) => {
  if (state !== 'mole-visible') return;
  if (event.target instanceof Element && event.target.closest('.mole')) return;

  lives--;
  livesEl.textContent = 'Lives: ' + lives;
  finishRound(false, true);
});

// clicking the start button either begins a new game (from idle/ended)
// or does nothing while a round is already in progress
startBtn.addEventListener('click', () => {
  if (state === 'idle' || state === 'ended') {
    startGame();
  }
});

// moving the mouse back onto the start button starts the next round
startBtn.addEventListener('mouseenter', onStartHover);

// pressing ESC ends the game early, from any state
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state !== 'idle' && state !== 'ended') {
    endGame();
  }
});