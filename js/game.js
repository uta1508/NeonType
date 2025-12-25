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

// 使用する単語リスト
let activeWordList = (typeof rawWordList !== 'undefined') ? [...rawWordList] : [];

// 定数
const COMBO_GAUGE_MAX = 150;
const COMBO_CHECKPOINTS = [30, 60, 100, 150];
const COMBO_REWARDS = [1, 1, 2, 3];
const MAX_RANKING_ENTRIES = 300;

// DOM要素のキャッシュ
const domCache = {};

// 初期化
async function initGame() {
    document.addEventListener('keydown', handleInput);
    cacheDOM();

    // 設定読み込み
    if (typeof loadGlobalSettings === 'function') {
        loadGlobalSettings();
        updateSettingsUI();
    }

    // ハイスコア読み込みと表示
    loadHighScore();

    // 単語データの取得（非同期）
    await prepareWordList();
}

// 単語リストの準備（Supabaseから取得）
async function prepareWordList() {
    if (typeof fetchWordsFromSupabase === 'function') {
        const remoteWords = await fetchWordsFromSupabase();
        if (remoteWords && remoteWords.length > 0) {
            console.log(`Loaded ${remoteWords.length} words from Supabase`);
            activeWordList = remoteWords;
        } else {
            console.log("Using default word list");
        }
    }
}

// DOM要素をキャッシュ
function cacheDOM() {
    domCache.scoreDisplay = document.getElementById('score-display');
    domCache.comboDisplay = document.getElementById('combo-display');
    domCache.timeDisplay = document.getElementById('time-display');
    domCache.timeBar = document.getElementById('time-bar');
    domCache.comboGaugeBar = document.getElementById('combo-gauge-bar');
    domCache.comboBonusNext = document.getElementById('combo-bonus-next');
    domCache.wordJp = document.getElementById('word-jp');
    domCache.typedText = document.getElementById('typed-text');
    domCache.untypedText = document.getElementById('untyped-text');
    domCache.wordReading = document.getElementById('word-reading');
}

// --- High Score Functions ---
function loadHighScore() {
    const saved = localStorage.getItem('neonTypeHighScore');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // データの整合性チェック
            if (parsed && typeof parsed.score === 'number') {
                highScore = parsed;
            }
        } catch(e) {
            console.error("Save data corrupted", e);
            // 読み込み失敗時はリセットしない（既存のメモリ上の値を維持するか、安全のため初期値にするかは設計次第だが、ここではエラーログのみ）
        }
    }
    // 読み込み直後に表示を更新
    updateHighScoreDisplay();
}

function saveHighScore(newScore, newKpm) {
    let updated = false;
    // 練習モードのスコアは保存しない
    if (currentSettings.mode === 'practice') return;

    if (newScore > highScore.score) {
        highScore.score = newScore;
        updated = true;
        const el = document.getElementById('new-record-score');
        if (el) el.classList.remove('hidden');
    }
    if (newKpm > highScore.kpm) {
        highScore.kpm = newKpm;
        updated = true;
        const el = document.getElementById('new-record-kpm');
        if (el) el.classList.remove('hidden');
    }

    if (updated) {
        localStorage.setItem('neonTypeHighScore', JSON.stringify(highScore));
        updateHighScoreDisplay();
    }
}

function updateHighScoreDisplay() {
    const scoreEl = document.getElementById('best-score');
    const kpmEl = document.getElementById('best-kpm');
    // 要素が存在する場合のみ更新
    if (scoreEl) scoreEl.textContent = highScore.score;
    if (kpmEl) kpmEl.textContent = highScore.kpm;
}

// ゲーム開始準備（スタートボタン押下時）
function prepareGame() {
    // タイマー重複防止
    if (timerInterval) clearInterval(timerInterval);
    if (countdownInterval) clearInterval(countdownInterval);

    // サウンド初期化
    if (typeof soundManager !== 'undefined') {
        soundManager.init();
    }

    // 設定の適用
    const diffConfig = difficultyConfig[currentSettings.difficulty];
    const modeInfo = modeConfig[currentSettings.mode];

    const modeDisplay = document.getElementById('current-mode-display');
    if (modeDisplay) modeDisplay.textContent = `MODE: ${modeInfo.label}`;

    const diffDisplay = document.getElementById('current-diff-display');
    if (diffDisplay) diffDisplay.textContent = `DIFF: ${diffConfig.label}`;

    timeLeft = diffConfig.time;

    gameState = 'ready';
    score = 0;
    combo = 0;
    maxCombo = 0;
    totalWordsTyped = 0;
    totalKeystrokes = 0;
    correctKeystrokes = 0;

    comboGauge = 0;
    updateComboGauge();

    // デッキ作成
    const filteredWords = filterWords();
    if (filteredWords.length === 0) {
        wordDeck = [...activeWordList];
    } else {
        wordDeck = [...filteredWords];
    }
    shuffleDeck();

    // UIリセット（nullチェック付き）
    const newRecordScore = document.getElementById('new-record-score');
    if (newRecordScore) newRecordScore.classList.add('hidden');

    const newRecordKpm = document.getElementById('new-record-kpm');
    if (newRecordKpm) newRecordKpm.classList.add('hidden');

    const rankingEntry = document.getElementById('ranking-entry');
    if (rankingEntry) rankingEntry.classList.add('hidden');

    const submitBtn = document.getElementById('btn-submit-score');
    if(submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '送信';
    }

    updateScoreDisplay();

    // 時間表示リセット
    if (domCache.timeDisplay && domCache.timeBar) {
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
    }

    // 画面切り替え処理

    // 1. セットアップ画面を閉じる（強制的に非表示にする）
    // アニメーション完了を待たずに即座に閉じることで不具合を防ぐ
    const setupScreen = document.getElementById('setup-screen');
    if (setupScreen) {
        setupScreen.classList.remove('modal-fade-in'); // アニメーションクラス削除
        setupScreen.classList.add('hidden');
        setupScreen.style.display = 'none';

        // モーダルの中身のリセットも念のため
        const modalContent = setupScreen.querySelector('.modal-content');
        if(modalContent) modalContent.classList.remove('modal-content-out');
    }

    // 2. スタート画面を閉じる
    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.classList.add('hidden');

    // 3. リザルト画面を閉じる
    const resultScreen = document.getElementById('result-screen');
    if (resultScreen) resultScreen.classList.add('hidden');

    // 4. ゲーム画面を表示
    const gameUI = document.getElementById('game-ui');
    if (gameUI) {
        gameUI.classList.remove('hidden');
        gameUI.classList.add('flex');
    }

    // 5. レディ画面（カウントダウン前）を表示
    const readyOverlay = document.getElementById('ready-overlay');
    if (readyOverlay) readyOverlay.classList.remove('hidden');

    const readyMessage = document.getElementById('ready-message');
    if (readyMessage) readyMessage.classList.remove('hidden');

    const countdownDisplay = document.getElementById('countdown-display');
    if (countdownDisplay) countdownDisplay.classList.add('hidden');

    const gameHud = document.getElementById('game-hud');
    if (gameHud) gameHud.classList.add('blur-sm');

    const gameArea = document.getElementById('game-area');
    if (gameArea) gameArea.classList.add('blur-sm');

    nextWord();
}

// 単語フィルタリング
function filterWords() {
    const config = difficultyConfig[currentSettings.difficulty];
    return activeWordList.filter(word => {
        const len = word.kana.length;
        return len >= config.min && len <= config.max;
    });
}

// デッキシャッフル
function shuffleDeck() {
    for (let i = wordDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [wordDeck[i], wordDeck[j]] = [wordDeck[j], wordDeck[i]];
    }
}

// カウントダウン開始
function startCountdown() {
    gameState = 'countdown';
    const readyMsg = document.getElementById('ready-message');
    if (readyMsg) readyMsg.classList.add('hidden');

    const cdDisplay = document.getElementById('countdown-display');
    if (cdDisplay) cdDisplay.classList.remove('hidden');

    let count = 3;
    if (cdDisplay) cdDisplay.textContent = count;

    if (typeof soundManager !== 'undefined') soundManager.playType();

    // 既存のカウントダウンがあれば消す
    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
            if (cdDisplay) {
                cdDisplay.textContent = count;
                cdDisplay.classList.remove('count-anim');
                void cdDisplay.offsetWidth;
                cdDisplay.classList.add('count-anim');
            }
            if (typeof soundManager !== 'undefined') soundManager.playType();
        } else if (count === 0) {
            if (cdDisplay) {
                cdDisplay.textContent = 'GO!';
                cdDisplay.classList.remove('count-anim');
                void cdDisplay.offsetWidth;
                cdDisplay.classList.add('count-anim');
                cdDisplay.classList.add('text-cyan-400');
                cdDisplay.classList.remove('text-yellow-400');
            }
            if (typeof soundManager !== 'undefined') soundManager.playBonus();
        } else {
            clearInterval(countdownInterval);
            countdownInterval = null;

            const readyOverlay = document.getElementById('ready-overlay');
            if (readyOverlay) readyOverlay.classList.add('hidden');

            const gameHud = document.getElementById('game-hud');
            if (gameHud) gameHud.classList.remove('blur-sm');

            const gameArea = document.getElementById('game-area');
            if (gameArea) gameArea.classList.remove('blur-sm');

            // リセット用
            if (cdDisplay) {
                cdDisplay.classList.remove('text-cyan-400');
                cdDisplay.classList.add('text-yellow-400');
            }

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

    if (currentSettings.mode === 'practice') {
        return;
    }

    const initialMaxTime = difficultyConfig[currentSettings.difficulty].time;

    timerInterval = setInterval(() => {
        timeLeft--;
        if (domCache.timeDisplay) domCache.timeDisplay.textContent = timeLeft + 's';

        let percentage = (timeLeft / initialMaxTime) * 100;
        if (percentage > 100) percentage = 100;

        if (domCache.timeBar) {
            domCache.timeBar.style.width = percentage + '%';

            if (timeLeft <= 10) {
                domCache.timeBar.classList.remove('bg-cyan-400');
                domCache.timeBar.classList.add('bg-red-500');
            } else {
                domCache.timeBar.classList.add('bg-cyan-400');
                domCache.timeBar.classList.remove('bg-red-500');
            }
        }

        if (timeLeft <= 0) endGame('FINISH');
    }, 1000);
}

// ゲーム終了
function endGame(title = 'FINISH', canSubmit = true) {
    if (timerInterval) clearInterval(timerInterval);
    if (countdownInterval) clearInterval(countdownInterval);

    gameState = 'result';

    const durationSec = (Date.now() - startTime) / 1000;
    const kpm = durationSec > 0 ? Math.round((correctKeystrokes / durationSec) * 60) : 0;
    const accuracy = totalKeystrokes > 0
        ? Math.round((correctKeystrokes / totalKeystrokes) * 100)
        : 0;

    // 統計データ作成
    const gameStats = {
        score: score,
        kps: durationSec > 0 ? (correctKeystrokes / durationSec) : 0,
        misses: totalKeystrokes - correctKeystrokes,
        maxCombo: maxCombo,
        totalChars: totalWordsTyped
    };

    saveHighScore(score, kpm);

    // 称号チェック
    let newAchievements = [];
    if (typeof checkNewAchievements === 'function') {
        newAchievements = checkNewAchievements(gameStats);
    }

    const resultTitle = document.getElementById('result-title');
    if (resultTitle) resultTitle.textContent = title;

    const finalScore = document.getElementById('final-score');
    if (finalScore) finalScore.textContent = score;

    const finalCombo = document.getElementById('final-combo');
    if (finalCombo) finalCombo.textContent = maxCombo;

    const finalKeys = document.getElementById('final-keys');
    if (finalKeys) finalKeys.textContent = correctKeystrokes;

    const finalAccuracy = document.getElementById('final-accuracy');
    if (finalAccuracy) finalAccuracy.textContent = accuracy + '%';

    const finalKpm = document.getElementById('final-kpm');
    if (finalKpm) finalKpm.textContent = kpm;

    // 送信フォーム制御
    const rankingEntry = document.getElementById('ranking-entry');
    if (rankingEntry) {
        if (currentSettings.mode !== 'practice' && canSubmit) {
            rankingEntry.classList.remove('hidden');
            // 名前入力欄に保存された名前を入れる
            const nameInput = document.getElementById('player-name-input');
            if (nameInput && typeof getUsername === 'function') {
                nameInput.value = getUsername();
            }
        } else {
            rankingEntry.classList.add('hidden');
        }
    }

    const gameUI = document.getElementById('game-ui');
    if (gameUI) gameUI.classList.add('hidden');

    const resultScreen = document.getElementById('result-screen');
    if (resultScreen) {
        resultScreen.classList.remove('hidden');
        resultScreen.classList.add('flex');
    }

    // 称号演出がある場合は開始
    if (newAchievements.length > 0 && typeof prepareAchievementUnlock === 'function') {
        prepareAchievementUnlock(newAchievements);
        showAchievementUnlock();
    } else {
        if (typeof showResultButtons === 'function') {
            showResultButtons();
        }
    }
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

    if (domCache.wordJp) {
        domCache.wordJp.classList.remove('scale-110', 'text-cyan-300');
        void domCache.wordJp.offsetWidth;
    }
}

// コンボゲージ更新
function updateComboGauge() {
    if (!domCache.comboGaugeBar) return;

    const percentage = Math.min((comboGauge / COMBO_GAUGE_MAX) * 100, 100);
    domCache.comboGaugeBar.style.width = `${percentage}%`;
    let nextBonus = 0;
    if (comboGauge < COMBO_CHECKPOINTS[0]) nextBonus = COMBO_REWARDS[0];
    else if (comboGauge < COMBO_CHECKPOINTS[1]) nextBonus = COMBO_REWARDS[1];
    else if (comboGauge < COMBO_CHECKPOINTS[2]) nextBonus = COMBO_REWARDS[2];
    else nextBonus = COMBO_REWARDS[3];

    if (domCache.comboBonusNext) {
        domCache.comboBonusNext.textContent = `NEXT: +${nextBonus}s`;
    }
}

// 時間ボーナス表示
function showTimeBonus(seconds) {
    if (currentSettings.mode === 'practice') return;
    const container = document.getElementById('bonus-container');
    if (!container) return;

    const el = document.createElement('div');
    el.textContent = `+${seconds}s`;
    el.className = 'bonus-anim text-3xl';
    const left = 50 + (Math.random() * 40 - 20);
    el.style.left = `${left}%`;
    el.style.top = '50%';
    container.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 1000);
}

// タイトルへ戻る
function showTitle() {
    gameState = 'title';

    // 確実にハイスコア表示を更新
    loadHighScore();

    const gameUI = document.getElementById('game-ui');
    if (gameUI) gameUI.classList.add('hidden');

    const resultScreen = document.getElementById('result-screen');
    if (resultScreen) resultScreen.classList.add('hidden');

    const setupScreen = document.getElementById('setup-screen');
    if (setupScreen) setupScreen.classList.add('hidden');

    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.classList.remove('hidden');

    // プロフィールボタンを再表示
    const profileButton = document.getElementById('profile-button-top');
    if (typeof hasPlayedBefore === 'function' && hasPlayedBefore() && profileButton) {
        profileButton.classList.remove('hidden');
    }
}

// 入力ハンドラ
function handleInput(e) {
    // Esc Key
    if (e.key === 'Escape') {
        if (gameState === 'playing' || gameState === 'countdown') {
            if (timerInterval) clearInterval(timerInterval);
            if (countdownInterval) clearInterval(countdownInterval);
            prepareGame(); // Reset to ready screen
        } else if (gameState === 'ready') {
            showTitle(); // Back to title
        }
        return;
    }

    // Ready Screen Input (Space or Enter)
    if (gameState === 'ready') {
        if (e.code === 'Space' || e.code === 'Enter') {
            startCountdown();
        }
        return;
    }

    if (gameState !== 'playing') return;

    if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;

    const inputKey = e.key.toLowerCase();
    totalKeystrokes++;

    if (typeof processInput === 'function') {
        processInput(e);
    }
}