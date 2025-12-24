// ゲーム状態
let gameState = 'title';
let score = 0;
let combo = 0;
let maxCombo = 0;
let timeLeft = 60;
let totalWordsTyped = 0;
let totalKeystrokes = 0;
let correctKeystrokes = 0;
let timerInterval = null;
let countdownInterval = null;
let startTime = 0;
let highScore = { score: 0, kpm: 0 };
let currentWord = null;
let remainingKana = "";
let typedRomajiLog = "";
let pendingNode = [];
let wordDeck = [];
let comboGauge = 0;
let filteredWordCache = null;

// 定数
const COMBO_GAUGE_MAX = 150;
const COMBO_CHECKPOINTS = [30, 60, 100, 150];
const COMBO_REWARDS = [1, 1, 2, 3];
const MAX_RANKING_ENTRIES = 300;

// DOM要素のキャッシュ
const domCache = {};

// 初期化
function initGame() {
    document.addEventListener('keydown', handleInput);
    cacheDOM();
    loadHighScore();
    loadGlobalSettings();
    updateHighScoreDisplay();
    updateSettingsUI();
}

// DOM要素をキャッシュ
function cacheDOM() {
    domCache.scoreDisplay = document.getElementById('score-display');
    domCache.comboDisplay = document.getElementById('combo-display');
    domCache.timeDisplay = document.getElementById('time-display');
    domCache.timeBar = document.getElementById('time-bar');
    domCache.wordJp = document.getElementById('word-jp');
    domCache.wordReading = document.getElementById('word-reading');
    domCache.typedText = document.getElementById('typed-text');
    domCache.untypedText = document.getElementById('untyped-text');
    domCache.comboGaugeBar = document.getElementById('combo-gauge-bar');
    domCache.comboBonusNext = document.getElementById('combo-bonus-next');
    domCache.bonusContainer = document.getElementById('bonus-container');
    domCache.gameHud = document.getElementById('game-hud');
    domCache.gameArea = document.getElementById('game-area');
    domCache.readyOverlay = document.getElementById('ready-overlay');
    domCache.countdownDisplay = document.getElementById('countdown-display');
}

// ハイスコアの読み込み（バージョン管理・KPM->KPS互換性対応付き）
function loadHighScore() {
    const saved = localStorage.getItem('neonTypeHighScore');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            if (data.version === DATA_VERSION) {
                let loadedScore = data.highScore || { score: 0, kps: 0 };
                // KPMからKPSへの後方互換性対応
                if (loadedScore.kpm !== undefined) {
                    loadedScore.kps = parseFloat((loadedScore.kpm / 60).toFixed(2));
                    delete loadedScore.kpm;
                }
                highScore = loadedScore;
            } else {
                console.log('Data version mismatch, resetting high score');
                highScore = { score: 0, kps: 0 };
            }
        } catch(e) {
            console.error("Save data corrupted:", e);
            highScore = { score: 0, kps: 0 };
        }
    } else {
        highScore = { score: 0, kps: 0 };
    }
}

// ハイスコアの保存
function saveHighScore(newScore, newKps) {
    if (currentSettings.mode === 'practice') return;
    let updated = false;
    if (newScore > (highScore.score || 0)) {
        highScore.score = newScore;
        updated = true;
        document.getElementById('new-record-score').classList.remove('hidden');
    }
    if (newKps > (highScore.kps || 0)) {
        highScore.kps = newKps;
        updated = true;
        document.getElementById('new-record-kps').classList.remove('hidden');
    }
    if (updated) {
        localStorage.setItem('neonTypeHighScore', JSON.stringify({
            version: DATA_VERSION,
            highScore: highScore
        }));
        updateHighScoreDisplay();
    }
}

// ハイスコア表示の更新
function updateHighScoreDisplay() {
    document.getElementById('best-score').textContent = highScore.score || 0;
    document.getElementById('best-kps').textContent = highScore.kps || 0;
}

// 単語のフィルタリング（キャッシュ付き）
function filterWords() {
    if (filteredWordCache) return filteredWordCache;
    
    const config = difficultyConfig[currentSettings.difficulty];
    filteredWordCache = rawWordList.filter(word => {
        const len = word.kana.length;
        return len >= config.min && len <= config.max;
    });
    
    if (filteredWordCache.length === 0) {
        filteredWordCache = [...rawWordList];
    }
    
    return filteredWordCache;
}

// デッキのシャッフル
function shuffleDeck() {
    for (let i = wordDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [wordDeck[i], wordDeck[j]] = [wordDeck[j], wordDeck[i]];
    }
}

// ゲームの準備
function prepareGame() {
    // タイマーのクリーンアップ
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    soundManager.init();
    const diffConfig = difficultyConfig[currentSettings.difficulty];
    const modeInfo = modeConfig[currentSettings.mode];

    document.getElementById('current-mode-display').textContent = `MODE: ${modeInfo.label}`;
    document.getElementById('current-diff-display').textContent = `DIFF: ${diffConfig.label}`;
    timeLeft = diffConfig.time;
    gameState = 'ready';
    score = 0;
    combo = 0;
    maxCombo = 0;
    totalWordsTyped = 0;
    totalKeystrokes = 0;
    correctKeystrokes = 0;
    comboGauge = 0;
    filteredWordCache = null;
    updateComboGauge();

    const filteredWords = filterWords();
    wordDeck = [...filteredWords];
    shuffleDeck();

    document.getElementById('new-record-score').classList.add('hidden');
    document.getElementById('new-record-kpm').classList.add('hidden');
    document.getElementById('ranking-entry').classList.add('hidden');
    document.getElementById('btn-submit-score').disabled = false;
    document.getElementById('btn-submit-score').textContent = '送信';
    domCache.scoreDisplay.textContent = '0';
    domCache.comboDisplay.textContent = '0';

    if (currentSettings.mode === 'practice') {
        domCache.timeDisplay.textContent = '∞';
        domCache.timeBar.style.width = '100%';
        domCache.timeBar.classList.remove('bg-red-500');
        domCache.timeBar.classList.add('bg-green-400');
    } else {
        domCache.timeDisplay.textContent = timeLeft + 's';
        domCache.timeBar.style.width = '100%';
        domCache.timeBar.classList.remove('bg-red-500');
        domCache.timeBar.classList.add('bg-cyan-400');
    }

    // 他の画面を全て非表示にする
    const setupScreen = document.getElementById('setup-screen');
    setupScreen.classList.add('hidden');
    setupScreen.style.display = 'none';
    
    const resultScreen = document.getElementById('result-screen');
    resultScreen.classList.add('hidden');
    resultScreen.style.display = 'none';
    
    const startScreen = document.getElementById('start-screen');
    startScreen.classList.add('hidden');
    
    // ゲームUIを表示
    const gameUI = document.getElementById('game-ui');
    gameUI.classList.remove('hidden');
    gameUI.style.display = 'flex';
    
    domCache.readyOverlay.classList.remove('hidden');
    document.getElementById('ready-message').classList.remove('hidden');
    domCache.countdownDisplay.classList.add('hidden');
    // 待機状態は全体にブラーをかける
    domCache.gameHud.classList.add('blur-sm');
    domCache.gameArea.classList.add('blur-sm');

    nextWord();
}

// カウントダウン開始
function startCountdown() {
    gameState = 'countdown';
    document.getElementById('ready-message').classList.add('hidden');
    domCache.countdownDisplay.classList.remove('hidden');
    let count = 3;
    domCache.countdownDisplay.textContent = count;
    
    // 前のカウントダウンがあればクリア
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    
    countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
            domCache.countdownDisplay.textContent = count;
            domCache.countdownDisplay.classList.remove('count-anim');
            void domCache.countdownDisplay.offsetWidth;
            domCache.countdownDisplay.classList.add('count-anim');
            soundManager.playType();
        } else if (count === 0) {
            domCache.countdownDisplay.textContent = 'GO!';
            domCache.countdownDisplay.classList.remove('count-anim');
            void domCache.countdownDisplay.offsetWidth;
            domCache.countdownDisplay.classList.add('count-anim');
            domCache.countdownDisplay.classList.add('text-cyan-400');
            domCache.countdownDisplay.classList.remove('text-yellow-400');
            soundManager.playBonus();
            // GO!表示時にブラーを解除
            domCache.gameHud.classList.remove('blur-sm');
            domCache.gameArea.classList.remove('blur-sm');
        } else {
            clearInterval(countdownInterval);
            countdownInterval = null;
            // GO!表示後にoverlayを非表示
            domCache.readyOverlay.classList.add('hidden');
            domCache.countdownDisplay.classList.remove('text-cyan-400');
            domCache.countdownDisplay.classList.add('text-yellow-400');
            startGameLogic();
        }
    }, 800);
}

// ゲームロジック開始
function startGameLogic() {
    gameState = 'playing';
    startTime = Date.now();
    startTimer();
}

// タイマー開始
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    if (currentSettings.mode === 'practice') return;
    const initialMaxTime = difficultyConfig[currentSettings.difficulty].time;
    timerInterval = setInterval(() => {
        timeLeft--;
        domCache.timeDisplay.textContent = timeLeft + 's';
        const percentage = (timeLeft / initialMaxTime) * 100;
        domCache.timeBar.style.width = percentage + '%';
        if (timeLeft <= 10) {
            domCache.timeBar.classList.remove('bg-cyan-400');
            domCache.timeBar.classList.add('bg-red-500');
        } else {
            domCache.timeBar.classList.add('bg-cyan-400');
            domCache.timeBar.classList.remove('bg-red-500');
        }
        if (timeLeft <= 0) endGame('TIME UP!');
    }, 1000);
}

// ゲーム終了
function endGame(title = 'FINISH', canSubmit = true) {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    gameState = 'result';
    const durationSec = (Date.now() - startTime) / 1000;
    const kps = durationSec > 0 ? (correctKeystrokes / durationSec).toFixed(2) : 0;
    const accuracy = totalKeystrokes > 0 ? Math.round((correctKeystrokes / totalKeystrokes) * 100) : 0;
    saveHighScore(score, parseFloat(kps));
    document.getElementById('result-title').textContent = title;
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-combo').textContent = maxCombo;
    document.getElementById('final-keys').textContent = correctKeystrokes;
    document.getElementById('final-accuracy').textContent = accuracy + '%';
    document.getElementById('final-kps').textContent = kps;
    if (currentSettings.mode !== 'practice' && canSubmit) {
        document.getElementById('ranking-entry').classList.remove('hidden');
    } else {
        document.getElementById('ranking-entry').classList.add('hidden');
    }
    // ゲームUIを非表示
    const gameUI = document.getElementById('game-ui');
    gameUI.classList.add('hidden');
    gameUI.style.display = 'none';
    
    // 他の画面も確実に非表示
    const setupScreen = document.getElementById('setup-screen');
    setupScreen.classList.add('hidden');
    setupScreen.style.display = 'none';
    
    const startScreen = document.getElementById('start-screen');
    startScreen.classList.add('hidden');
    
    // 結果画面を表示
    const resultScreen = document.getElementById('result-screen');
    resultScreen.classList.remove('hidden');
    resultScreen.style.display = 'flex';
}

// 次の単語
function nextWord() {
    if (wordDeck.length === 0) {
        wordDeck = [...filterWords()];
        shuffleDeck();
    }
    currentWord = wordDeck.pop();
    remainingKana = currentWord.kana;
    typedRomajiLog = "";
    pendingNode = [];
    updateWordDisplay();
    domCache.wordJp.classList.remove('scale-110', 'text-cyan-300');
    void domCache.wordJp.offsetWidth;
}

// コンボゲージ更新
function updateComboGauge() {
    const percentage = Math.min((comboGauge / COMBO_GAUGE_MAX) * 100, 100);
    domCache.comboGaugeBar.style.width = `${percentage}%`;
    let nextBonus = 0;
    if (comboGauge < COMBO_CHECKPOINTS[0]) nextBonus = COMBO_REWARDS[0];
    else if (comboGauge < COMBO_CHECKPOINTS[1]) nextBonus = COMBO_REWARDS[1];
    else if (comboGauge < COMBO_CHECKPOINTS[2]) nextBonus = COMBO_REWARDS[2];
    else nextBonus = COMBO_REWARDS[3];
    domCache.comboBonusNext.textContent = `NEXT: +${nextBonus}s`;
}

// 時間ボーナス表示
function showTimeBonus(seconds) {
    if (currentSettings.mode === 'practice') return;
    const el = document.createElement('div');
    el.textContent = `+${seconds}s`;
    el.className = 'bonus-anim text-3xl';
    const left = 50 + (Math.random() * 40 - 20);
    el.style.left = `${left}%`;
    el.style.top = '50%';
    domCache.bonusContainer.appendChild(el);
    setTimeout(() => { 
        if (domCache.bonusContainer.contains(el)) {
            domCache.bonusContainer.removeChild(el);
        }
    }, 1000);
}
