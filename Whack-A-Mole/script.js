// ---- settings ----
const TOTAL_ROUNDS = 60;
const ROUNDS_PER_STAGE = 10;
const MIN_DELAY = 500;
const MAX_DELAY = 2000;
const ROUND_TIME_LIMIT = 2000;
const STARTING_LIVES = 5;
const TOTAL_STAGES = TOTAL_ROUNDS / ROUNDS_PER_STAGE;
const FINAL_ARENA_SCALE = 0.4;

// Difficulty progression
const DIFFICULTY_FACTOR = 0.85;

// Mole size relative to the screen
const BASE_SIZE_RATIO = 0.14;
const MIN_MOLE_SIZE = 24;
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
let resolveTimer = null;
let delayRemaining = 0;
let delayStartedAt = 0;
let roundTimeTotal = 0;
let pointerX = null;
let pointerY = null;
let pointerInCenter = false;
let centerZoneStageColor = '#32834a';

const startBtn = document.getElementById('startBtn');
const scoreEl = document.getElementById('score');
const styleRankEl = document.getElementById('styleRank');
const roundsEl = document.getElementById('rounds');
const livesEl = document.getElementById('lives');
const messageEl = document.getElementById('message');
const arena = document.getElementById('arena');
const arenaLabel = document.getElementById('arenaLabel');
const centerZone = document.getElementById('centerZone');
const stageTransition = document.getElementById('stageTransition');
const transitionTitle = document.getElementById('transitionTitle');
const transitionMessage = document.getElementById('transitionMessage');
const countdownEl = document.getElementById('countdown');
const timerProgress = document.getElementById('roundTimerProgress');
const timerBar = document.getElementById('roundTimer');

function setCenterZoneVisible(visible) {
    centerZone.style.opacity = visible ? '1' : '0';
}

function updateCenterZoneColor() {
    const color = pointerInCenter ? centerZoneStageColor : '#d32f2f';
    centerZone.style.borderColor = color;
    centerZone.style.backgroundColor = hexToRGBA(color, 0.15);
}

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

// updates arena display
function updateArena(stage = getCurrentStage()) {
    const stageProgress = (stage - 1) / (TOTAL_STAGES - 1);
    const scale = Math.pow(FINAL_ARENA_SCALE, stageProgress);
    const top = 55 - stageProgress * 5;

    const width = window.innerWidth * 0.9 * scale;
    const height = window.innerHeight * 0.8 * scale;
    arena.style.width = width + 'px';
    arena.style.height = height + 'px';
    arena.style.top = top + '%';

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
    centerZoneStageColor = color;
    pointerInCenter = pointerIsInCenterZone();
    updateCenterZoneColor();
}

// convert HEX color to RGBA
function hexToRGBA(hex, opacity) {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function startDelayTimer() {
    if (!pointerInCenter || delayTimer !== null) return;

    delayStartedAt = performance.now();
    delayTimer = setTimeout(() => {
        delayTimer = null;
        delayRemaining = 0;
        showMole();
    }, delayRemaining);
}

function startRoundTimer() {
    if (roundTimer !== null) return;

    timerProgress.style.transition = 'none';
    timerProgress.style.width = '100%';
    timerProgress.offsetWidth;
    timerProgress.style.transition =
        `width ${roundTimeTotal}ms linear`;
    timerProgress.style.width = '0%';
    roundTimer = setTimeout(() => finishRound(true), roundTimeTotal);
}

function pauseSpawnDelay() {
    const now = performance.now();

    if (delayTimer !== null) {
        delayRemaining = Math.max(0, delayRemaining - (now - delayStartedAt));
        clearTimeout(delayTimer);
        delayTimer = null;
    }
}

function pointerIsInCenterZone() {
    const rect = centerZone.getBoundingClientRect();
    const radius = Math.min(rect.width, rect.height) / 2;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    return pointerX !== null &&
        Math.hypot(pointerX - centerX, pointerY - centerY) <= radius;
}

function updateCenterGate() {
    const wasInCenter = pointerInCenter;
    pointerInCenter = pointerIsInCenterZone();
    updateCenterZoneColor();

    if (!pointerInCenter) {
        pauseSpawnDelay();
        if (state === 'waiting') {
            messageEl.textContent =
                'Return the pointer to the center circle to continue.';
        }
        return;
    }

    if (!wasInCenter && state === 'waiting-to-start') {
        startNextRound();
    } else if (state === 'waiting') {
        messageEl.textContent = '';
        startDelayTimer();
    } else if (state === 'mole-visible') {
        messageEl.textContent = '';
        startRoundTimer();
    }
}

function startStageTransition(stage) {
    clearInterval(countdownTimer);
    clearTimeout(transitionTimeout);
    state = 'transition';
    startBtn.style.display = 'none';
    setCenterZoneVisible(true);
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
            transitionTimeout = setTimeout(() => {
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
    livesEl.textContent = 'Lives: ' + lives;
    messageEl.textContent = '';
    startBtn.textContent = 'Start';
    startBtn.style.display = 'inline-block';
    startStageTransition(1);
}

// begins one round: hides the start button and waits a random delay
// before showing the mole somewhere random on screen
function startNextRound() {
    pointerInCenter = pointerIsInCenterZone();
    if (!pointerInCenter) {
        state = 'waiting-to-start';
        setCenterZoneVisible(true);
        messageEl.textContent = 'Move the pointer to the center circle to continue.';
        return;
    }

    round++;
    roundsEl.textContent =
        'Round: ' + round + ' / ' + TOTAL_ROUNDS;
    updateArena();
    state = 'waiting';
    startBtn.style.display = 'none';
    setCenterZoneVisible(true);
    messageEl.textContent = '';

    const stage = getCurrentStage();
    const difficulty = Math.pow(
        DIFFICULTY_FACTOR,
        stage - 1
    );

    const minDelay = Math.round(MIN_DELAY * difficulty);
    const maxDelay = Math.round(MAX_DELAY * difficulty);
    delayRemaining = randomBetween(
        minDelay,
        Math.max(minDelay, maxDelay)
    );
    startDelayTimer();
}

// creates both green and red moles in every round
// and ensures they appear inside the arena
// creates green and red moles at random, non-overlapping positions
function showMole() {
    if (state !== 'waiting' || !pointerInCenter) return;

    setCenterZoneVisible(false);
    const moleTypes = ['positive', 'negative'];
    const arenaRect = arena.getBoundingClientRect();
    const size = getMoleSize();

    currentMoles = [];

    moleTypes.forEach((type) => {
        let x;
        let y;
        let attempts = 0;
        let overlapping;

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

                return (
                    Math.abs(x - existingX) < size &&
                    Math.abs(y - existingY) < size
                );
            });

            attempts++;
        } while (overlapping && attempts < 100);

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
        currentMoles.push(mole);
    });
    state = 'mole-visible';

    // start the timer progress bar
    roundTimeTotal = getRoundTimeLimit();
    timerBar.style.display = 'block';
    startRoundTimer();
}

function showScorePopup(text, x, y, type) {
    const popup = document.createElement('div');

    popup.className = 'score-popup ' + type;
    popup.textContent = text;
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
    document.body.appendChild(popup);

    popup.addEventListener('animationend', () => {
        popup.remove();
    });
}

// applies a target's score and finishes the round after one hit
function whackMole(mole) {
    if (state !== 'mole-visible' || !currentMoles.includes(mole)) {
        return;
    }

    state = 'resolving';

    clearTimeout(roundTimer);
    roundTimer = null;
    playHitSound();

    const rect = mole.getBoundingClientRect();
    currentMoles.forEach((currentMole) => {
        if (currentMole !== mole) currentMole.remove();
    });
    currentMoles = [];

    if (mole.dataset.scoreType === 'positive') {
        const pointsEarned = multiplier;

        score += pointsEarned;
        showScorePopup(
            '+' + pointsEarned,
            rect.left + rect.width / 2,
            rect.top,
            'positive'
        );
        multiplier = Math.min(multiplier + 1, STYLE_RANKS.length);

    } else {
        score -= 1;
        showScorePopup(
            '-1',
            rect.left + rect.width / 2,
            rect.top,
            'negative'
        );
        multiplier = Math.max(1, multiplier - 1);
    }

    scoreEl.textContent = 'Score: ' + score;
    updateStyleRank();
    mole.classList.add('hit');
    mole.addEventListener('animationend', () => mole.remove(), { once: true });
    finishRound(false);
}

function finishRound(timedOut, missed = false) {
    clearTimeout(roundTimer);
    roundTimer = null;
    clearTimeout(resolveTimer);
    resolveTimer = null;

    timerBar.style.display = 'none';
    timerProgress.style.transition = 'none';
    timerProgress.style.width = '100%';

    if (timedOut || missed) {
        multiplier = 1;
        updateStyleRank();
    }

    currentMoles.forEach(mole => mole.remove());
    currentMoles = [];
    setCenterZoneVisible(true);

    // Game over
    if (lives <= 0 || round >= TOTAL_ROUNDS) {
        endGame();
        return;
    }

    // End of a stage: show Start button
    if (round % ROUNDS_PER_STAGE === 0) {
    state = 'stage-complete';
    setCenterZoneVisible(false);
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
  delayTimer = null;
  clearTimeout(roundTimer);
  roundTimer = null;
  currentMoles.forEach(mole => mole.remove());
  currentMoles = [];
  setCenterZoneVisible(false);
  startBtn.style.display = 'inline-block';
  startBtn.textContent = 'Play Again';
  messageEl.textContent = 'Game over! Final score: ' + score;
  clearInterval(countdownTimer);
  clearTimeout(transitionTimeout);
  stageTransition.style.display = 'none';
  clearTimeout(resolveTimer);
  timerBar.style.display = 'none';
  arena.classList.remove('miss');
}

document.addEventListener('pointermove', (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    updateCenterGate();
});

document.documentElement.addEventListener('pointerleave', () => {
    pointerX = null;
    pointerY = null;
    updateCenterGate();
});

window.addEventListener('blur', () => {
    pointerX = null;
    pointerY = null;
    updateCenterGate();
});

window.addEventListener('resize', updateCenterGate);

// a click outside every mole while targets are visible uses the round's attempt
document.addEventListener('click', (event) => {
    if (state !== 'mole-visible') return;

    if (
        event.target instanceof Element &&
        event.target.closest('.mole')
    ) {
        return;
    }
    state = 'resolving';
    clearTimeout(roundTimer);
    lives--;
    livesEl.textContent = 'Lives: ' + lives;

    // Show MISS animation near the center of the arena
    const arenaRect = arena.getBoundingClientRect();

    showScorePopup(
        'MISS!',
        arenaRect.left + arenaRect.width / 2,
        arenaRect.top + arenaRect.height / 2,
        'missed'
    );

    arena.classList.remove('miss');
    arena.offsetWidth;
    arena.classList.add('miss');

    resolveTimer = setTimeout(() => {
        arena.classList.remove('miss');
        finishRound(false, true);
    }, 250);
});

// clicking the start button either begins a new game (from idle/ended)
// or does nothing while a round is already in progress
startBtn.addEventListener('click', (event) => {
    const centerRect = centerZone.getBoundingClientRect();
    pointerX = centerRect.left + centerRect.width / 2;
    pointerY = centerRect.top + centerRect.height / 2;
    updateCenterGate();

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