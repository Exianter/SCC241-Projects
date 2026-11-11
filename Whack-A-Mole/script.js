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
let countdownTimer = null;
let transitionTimeout = null;

const startBtn = document.getElementById('startBtn');
const scoreEl = document.getElementById('score');
const styleRankEl = document.getElementById('styleRank');
const roundsEl = document.getElementById('rounds');
const livesEl = document.getElementById('lives');
const messageEl = document.getElementById('message');
const stageEl = document.getElementById('stage');
const arena = document.getElementById('arena');
const arenaLabel = document.getElementById('arenaLabel');
const stageTransition = document.getElementById('stageTransition');
const transitionTitle = document.getElementById('transitionTitle');
const transitionMessage = document.getElementById('transitionMessage');
const countdownEl = document.getElementById('countdown');

function playHitSound() {
  const hitSound = new Audio('hit.mp3');
  hitSound.currentTime = 0;
  hitSound.play().catch(error => {
    console.log('Sound playback failed:', error);
  });
}

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
function updateArena(stage = getCurrentStage()) {
  
    // Arena gets smaller every stage
    const scale = Math.max(
        0.4,
        1 - (stage - 1) * 0.12
    );

    const width = window.innerWidth * 0.9 * scale;
    const height = window.innerHeight * 0.65 * scale;
    arena.style.width = width + 'px';
    arena.style.height = height + 'px';

    // Stage colors
    const stageColors = [
        '#32834a', // Stage 1 - Green
        '#91a832', // Stage 2 - Yellow-green
        '#d5a126', // Stage 3 - Yellow
        '#e67e22', // Stage 4 - Orange
        '#d64b36', // Stage 5 - Red-orange
        '#a51f35'  // Stage 6 - Dark red
    ];
    const color = stageColors[stage - 1];
    arena.style.borderColor = color;
    arena.style.backgroundColor =
        hexToRGBA(color, 0.08);
    arenaLabel.style.color = color;
    arenaLabel.textContent =
        'STAGE ' + stage + ' ARENA';
}

// convert HEX color to RGBA
function hexToRGBA(hex, opacity) {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function startStageTransition(stage) {
    clearInterval(countdownTimer);
    clearTimeout(transitionTimeout);
    state = 'transition';
    startBtn.style.display = 'none';
    updateArena(stage);
    const stageColors = [
        '#32834a',
        '#91a832',
        '#d5a126',
        '#e67e22',
        '#d64b36',
        '#a51f35'
    ];

    transitionTitle.textContent = 'STAGE ' + stage;
    transitionTitle.style.color = stageColors[stage - 1];
    transitionMessage.textContent = 'GET READY!';
    stageTransition.style.display = 'flex';
    let countdown = 3;
    countdownEl.textContent = countdown;
    countdownTimer = setInterval(() => {
        countdown--;
        
        if (countdown > 0) {
            countdownEl.textContent = countdown;
        } else {
            clearInterval(countdownTimer);
            countdownEl.textContent = 'GO!';
            setTimeout(() => {
              if (state !== 'transition') return;
              
              stageTransition.style.display = 'none';
              startNextRound();
            }, 700);
        }
    }, 1000);
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
    stageEl.textContent = 'Stage: 1 / ' + TOTAL_STAGES;
    livesEl.textContent = 'Lives: ' + lives;
    messageEl.textContent = '';
    startBtn.textContent = 'Start';
    startBtn.style.display = 'inline-block';
    startStageTransition(1);
}

// begins one round: hides the start button and waits a random delay
// before showing the mole somewhere random on screen
function startNextRound() {
    round++;
    roundsEl.textContent =
        'Round: ' + round + ' / ' + TOTAL_ROUNDS;
    updateStage();
    updateArena();
    state = 'waiting';
    startBtn.style.display = 'none';
    messageEl.textContent = '';

    const stage = getCurrentStage();
    const difficulty = Math.pow(
        DIFFICULTY_FACTOR,
        stage - 1
    );

    const minDelay = Math.round(MIN_DELAY * difficulty);
    const maxDelay = Math.round(MAX_DELAY * difficulty);
    const delay = randomBetween(
        minDelay,
        Math.max(minDelay, maxDelay)
    );
    delayTimer = setTimeout(showMole, delay);
}

// creates both green and red moles in every round
// and ensures they appear inside the arena
// Creates green and red moles at random, non-overlapping positions
function showMole() {
    const moleTypes = ['positive', 'negative'];
    const arenaRect = arena.getBoundingClientRect();
    const size = getMoleSize();
    currentMoles = [];

    moleTypes.forEach((type) => {
        let x;
        let y;
        let attempts = 0;
        let overlapping;

        // keep generating positions until the mole does not overlap
        do {
            x = randomBetween(
                Math.ceil(arenaRect.left),
                Math.floor(arenaRect.right - size)
            );

            y = randomBetween(
                Math.ceil(arenaRect.top),
                Math.floor(arenaRect.bottom - size)
            );

            overlapping = currentMoles.some((existingMole) => {
                const existingX = parseFloat(existingMole.style.left);
                const existingY = parseFloat(existingMole.style.top);
                const distanceX = Math.abs(x - existingX);
                const distanceY = Math.abs(y - existingY);
                return distanceX < size && distanceY < size;
            });
            attempts++;
        } while (overlapping && attempts < 100);
        const mole = document.createElement('div');
        mole.className = 'mole ' + type;
        mole.dataset.scoreType = type;

        mole.setAttribute(
            'aria-label',
            type + ' score mole'
        );

        mole.style.width = size + 'px';
        mole.style.height = size + 'px';
        mole.style.left = x + 'px';
        mole.style.top = y + 'px';
        mole.addEventListener('click', () => whackMole(mole));
        document.body.appendChild(mole);
        currentMoles.push(mole);
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
    playHitSound();

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

    // Game over
    if (lives <= 0 || round >= TOTAL_ROUNDS) {
        endGame();
        return;
    }

    // End of a stage: show Start button
    if (round % ROUNDS_PER_STAGE === 0) {
    state = 'stage-complete';
    startBtn.style.display = 'inline-block';
    startBtn.textContent = 'Start Stage ' + (getCurrentStage() + 1);
    messageEl.textContent =
        'Stage ' + getCurrentStage() +
        ' completed! Click Start to enter Stage ' +
        (getCurrentStage() + 1) + '.';
    return;
}

    // Continue automatically within the same stage
    messageEl.textContent = '';
    startNextRound();
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
  clearInterval(countdownTimer);
  clearTimeout(transitionTimeout);
  stageTransition.style.display = 'none';
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
    else if (state === 'stage-complete') {
        const nextStage = getCurrentStage() + 1;
        startStageTransition(nextStage);
    }
});

// pressing ESC ends the game early, from any state
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state !== 'idle' && state !== 'ended') {
    endGame();
  }
});