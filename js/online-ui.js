// オンライン対戦用カウントダウン
function startOnlineCountdown() {
    // 入力フィールドを無効化
    const inputField = document.getElementById('typing-input');
    if (inputField) {
        inputField.disabled = true;
        inputField.blur();
    }

    // カウントダウンオーバーレイを作成
    const overlay = document.createElement('div');
    overlay.id = 'online-countdown-overlay';
    overlay.className = 'fixed inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm';
    overlay.style.zIndex = '9999';
    overlay.innerHTML = `
        <div id="online-countdown-text" class="text-9xl font-bold text-cyan-400" style="text-shadow: 0 0 30px rgba(34, 211, 238, 0.8);">
            Ready?
        </div>
    `;
    document.body.appendChild(overlay);

    const countdownText = document.getElementById('online-countdown-text');
    const countdown = ['Ready?', '3', '2', '1', 'Go!'];
    let index = 0;

    const showNext = () => {
        console.log('[COUNTDOWN DEBUG] index:', index, 'countdown.length:', countdown.length);

        if (index >= countdown.length) {
            console.log('[COUNTDOWN DEBUG] Countdown complete, removing overlay');
            overlay.remove();
            startOnlineGame();
            return;
        }

        const text = countdown[index];
        console.log('[COUNTDOWN DEBUG] Showing text:', text);
        if (countdownText) {
            // アニメーションをリセット
            countdownText.style.animation = 'none';
            countdownText.offsetHeight; // reflow

            if (text === 'Go!') {
                countdownText.className = 'text-9xl font-bold text-green-400';
                countdownText.style.textShadow = '0 0 40px rgba(34, 197, 94, 0.9)';
                countdownText.style.animation = 'countdownPulse 0.8s ease-out';
            } else if (text === 'Ready?') {
                countdownText.className = 'text-9xl font-bold text-cyan-400';
                countdownText.style.textShadow = '0 0 30px rgba(34, 211, 238, 0.8)';
                countdownText.style.animation = 'countdownPulse 0.8s ease-out';
            } else {
                countdownText.className = 'text-9xl font-bold text-yellow-400';
                countdownText.style.textShadow = '0 0 30px rgba(250, 204, 21, 0.8)';
                countdownText.style.animation = 'countdownPulse 0.8s ease-out';
            }

            countdownText.textContent = text;
        }

        // サウンド
        if (typeof soundManager !== 'undefined') {
            if (text === 'Go!') {
                soundManager.playBonus();
            } else if (text !== 'Ready?') {
                soundManager.playType();
            }
        }

        index++;
        const delay = text === 'Ready?' ? 1200 : 800;
        setTimeout(showNext, delay);
    };

    // 最初のカウントダウンを開始
    showNext();
}

// オンラインゲーム実際の開始
function startOnlineGame() {
    gameState = 'playing';
    startTime = Date.now();
    startTimer();

    // 入力フィールドを有効化してフォーカス
    const inputField = document.getElementById('typing-input');
    if (inputField) {
        inputField.disabled = false;
        inputField.focus();
    }

    // スコアの定期送信を開始
    if (typeof startScoreBroadcast === 'function') {
        startScoreBroadcast();
    }
}

// PINコードをクリップボードにコピー
async function copyPinToClipboard(pin) {
    try {
        await navigator.clipboard.writeText(pin);
        if (typeof showNotification === 'function') {
            showNotification(`PINコードをコピーしました: ${pin}`, 'success');
        }
    } catch (error) {
        console.error('Failed to copy PIN:', error);
        if (typeof showNotification === 'function') {
            showNotification('PINコードのコピーに失敗しました', 'error');
        }
    }
}

// ゲーム開始メッセージを表示
function showStartingGameMessage() {
    // Readyボタンを更新
    const readyBtn = document.getElementById('lobby-ready-btn');
    if (readyBtn) {
        readyBtn.disabled = true;
        readyBtn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            ゲームを開始します...
        `;
        readyBtn.classList.remove('bg-green-600', 'hover:bg-green-500', 'bg-yellow-600', 'hover:bg-yellow-500');
        readyBtn.classList.add('bg-blue-600', 'cursor-wait');
    }
}
// ========================================
// Online Battle UI Functions
// ========================================

// Fisher-Yatesシャッフル（シード付き）
function seededShuffle(array, rng) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

let currentOnlineSettings = {
    mode: 'normal',
    difficulty: 'normal',
    duration: 60,
    isPublic: false
};

// オンライン対戦初期化
async function initOnlineBattle() {
    try {
        await onlineBattle.init();
        console.log('Online Battle initialized successfully');
    } catch (error) {
        console.error('Failed to initialize online battle:', error);
        if (typeof showNotification === 'function') {
            showNotification('オンライン対戦の初期化に失敗しました。ページをリロードしてください。', 'error', 5000);
        }
    }
}

// オンラインバトルメニュー表示
function showOnlineBattleMenu() {
    // 初回のみ初期化
    if (!onlineBattle.currentUser) {
        initOnlineBattle().then(() => {
            checkUsernameAndShowMenu();
        });
    } else {
        checkUsernameAndShowMenu();
    }
}

// ユーザーネームをチェックしてメニュー表示
function checkUsernameAndShowMenu() {
    const username = getUsername();
    if (!username || username === '') {
        showUsernameInputDialog();
    } else {
        showOnlineBattleMenuScreen();
    }
}

// ユーザーネーム入力ダイアログを表示
function showUsernameInputDialog() {
    const dialog = document.createElement('div');
    dialog.id = 'username-input-dialog';
    dialog.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-sm';
    dialog.innerHTML = `
        <div class="bg-slate-800 p-8 rounded-xl border-2 border-purple-500 max-w-md w-full mx-4">
            <h2 class="text-3xl font-bold text-purple-400 mb-4">
                <i class="fas fa-user-circle mr-2"></i>ユーザーネーム設定
            </h2>
            <p class="text-slate-300 mb-6">オンライン対戦で表示される名前を設定してください。</p>
            <input type="text" id="username-dialog-input" maxlength="10" 
                   placeholder="名前を入力 (10文字以内)" 
                   class="w-full bg-slate-900 border-2 border-slate-600 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-purple-500 mb-6">
            <div class="flex gap-3">
                <button onclick="cancelUsernameDialog()" 
                        class="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-all">
                    キャンセル
                </button>
                <button onclick="confirmUsernameDialog()" 
                        class="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-all">
                    決定
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);

    // フォーカスを当てる
    setTimeout(() => {
        const input = document.getElementById('username-dialog-input');
        if (input) input.focus();
    }, 100);

    // Enterキーで決定
    const input = document.getElementById('username-dialog-input');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') confirmUsernameDialog();
        });
    }
}

// ユーザーネームダイアログをキャンセル
function cancelUsernameDialog() {
    const dialog = document.getElementById('username-input-dialog');
    if (dialog) dialog.remove();
    // タイトル画面に戻る
    const startScreen = document.getElementById('start-screen');
    if (startScreen) {
        startScreen.classList.remove('hidden');
        startScreen.style.display = '';
    }
}

// ユーザーネームダイアログを確定
function confirmUsernameDialog() {
    const input = document.getElementById('username-dialog-input');
    if (!input) return;

    const username = input.value.trim();
    if (username.length === 0) {
        if (typeof showNotification === 'function') {
            showNotification('名前を入力してください', 'warning');
        }
        return;
    }

    if (username.length > 10) {
        if (typeof showNotification === 'function') {
            showNotification('名前は10文字以内で入力してください', 'warning');
        }
        return;
    }

    // ユーザー名を保存
    saveUsername(username);

    // ダイアログを閉じる
    const dialog = document.getElementById('username-input-dialog');
    if (dialog) dialog.remove();

    // メニュー画面を表示
    showOnlineBattleMenuScreen();
}

function showOnlineBattleMenuScreen() {
    // 統一関数で全画面を非表示
    if (typeof hideAllScreens === 'function') {
        hideAllScreens();
    }

    // オンラインバトルメニューを表示
    const menuScreen = document.getElementById('online-battle-menu');
    if (menuScreen) {
        menuScreen.classList.remove('hidden');
        menuScreen.classList.add('flex');
        // インラインスタイルは使わない
    }
}

// オンラインバトルメニューを閉じる（ゲームモード選択画面に戻る）
function hideOnlineBattleMenu() {
    // オンラインメニューを非表示
    if (typeof hideScreen === 'function') {
        hideScreen('online-battle-menu');
    } else {
        const menuScreen = document.getElementById('online-battle-menu');
        if (menuScreen) {
            menuScreen.classList.add('hidden');
            menuScreen.classList.remove('flex');
            menuScreen.removeAttribute('style');
        }
    }

    // ゲームモード選択画面を表示
    if (typeof showScreen === 'function') {
        showScreen('game-mode-select-screen');
    } else {
        const gameModeSelect = document.getElementById('game-mode-select-screen');
        if (gameModeSelect) {
            gameModeSelect.classList.remove('hidden', 'modal-fade-out');
            gameModeSelect.classList.add('modal-fade-in', 'flex');
        }
    }
}

// 部屋作成画面表示
function showCreateRoom() {
    const menuScreen = document.getElementById('online-battle-menu');
    if (menuScreen) menuScreen.classList.add('hidden');

    const createScreen = document.getElementById('create-room-screen');
    if (createScreen) {
        createScreen.classList.remove('hidden');
        createScreen.classList.add('flex');
    }

    // デフォルト設定の選択状態を反映
    selectOnlineMode('normal');
    selectOnlineDifficulty('normal');
    selectOnlineDuration(60);
}

// 部屋作成画面を閉じる
function hideCreateRoom() {
    if (typeof hideScreen === 'function') {
        hideScreen('create-room-screen');
    } else {
        const createScreen = document.getElementById('create-room-screen');
        if (createScreen) {
            createScreen.classList.add('hidden');
            createScreen.classList.remove('flex');
            createScreen.removeAttribute('style');
        }
    }

    showOnlineBattleMenuScreen();
}

// オンラインモード選択
function selectOnlineMode(mode) {
    currentOnlineSettings.mode = mode;

    // UIの選択状態を更新
    ['normal', 'sudden_death'].forEach(m => {
        const el = document.getElementById(`online-mode-${m}`);
        if (el) {
            if (m === mode) {
                el.classList.add('selected', 'border-cyan-500');
                el.classList.remove('border-slate-700');
            } else {
                el.classList.remove('selected', 'border-cyan-500');
                el.classList.add('border-slate-700');
            }
        }
    });
}

// オンライン難易度選択
function selectOnlineDifficulty(diff) {
    currentOnlineSettings.difficulty = diff;

    // UIの選択状態を更新
    ['easy', 'normal', 'hard'].forEach(d => {
        const el = document.getElementById(`online-diff-${d}`);
        if (el) {
            if (d === diff) {
                el.classList.add('selected', 'border-yellow-500');
                el.classList.remove('border-slate-700');
            } else {
                el.classList.remove('selected', 'border-yellow-500');
                el.classList.add('border-slate-700');
            }
        }
    });
}

// オンライン制限時間選択
function selectOnlineDuration(duration) {
    currentOnlineSettings.duration = duration;

    // UIの選択状態を更新
    [30, 60, 90, 120].forEach(d => {
        const el = document.getElementById(`online-duration-${d}`);
        if (el) {
            if (d === duration) {
                el.classList.add('selected', 'border-green-500');
                el.classList.remove('border-slate-700');
            } else {
                el.classList.remove('selected', 'border-green-500');
                el.classList.add('border-slate-700');
            }
        }
    });
}

// プライバシー設定トグル
function togglePrivacy() {
    currentOnlineSettings.isPublic = !currentOnlineSettings.isPublic;

    const btn = document.getElementById('btn-privacy');
    const label = document.getElementById('privacy-label');

    if (currentOnlineSettings.isPublic) {
        if (btn) btn.classList.add('bg-green-500');
        if (label) label.textContent = 'Public (誰でも参加可)';
    } else {
        if (btn) btn.classList.remove('bg-green-500');
        if (label) label.textContent = 'Private (PINで参加)';
    }
}

// 部屋作成確定
async function createRoomConfirm() {
    try {
        const room = await onlineBattle.createRoom(
            currentOnlineSettings.mode,
            currentOnlineSettings.difficulty,
            currentOnlineSettings.duration,
            currentOnlineSettings.isPublic
        );

        console.log('Room created:', room);

        // 部屋作成画面を閉じる
        hideCreateRoom();

        // ロビー画面を表示
        showLobby();
    } catch (error) {
        console.error('Failed to create room:', error);
        alert('部屋の作成に失敗しました: ' + error.message);
    }
}

// PIN入力画面表示
function showJoinByPIN() {
    const menuScreen = document.getElementById('online-battle-menu');
    if (menuScreen) menuScreen.classList.add('hidden');

    const pinScreen = document.getElementById('join-pin-screen');
    if (pinScreen) {
        pinScreen.classList.remove('hidden');
        pinScreen.classList.add('flex');
    }

    // PINフィールドをクリア
    const pinInput = document.getElementById('pin-input');
    if (pinInput) {
        pinInput.value = '';
        pinInput.focus();
    }

    const pinError = document.getElementById('pin-error');
    if (pinError) pinError.classList.add('hidden');
}

// PIN入力画面を閉じる
function hideJoinByPIN() {
    if (typeof hideScreen === 'function') {
        hideScreen('join-pin-screen');
    } else {
        const pinScreen = document.getElementById('join-pin-screen');
        if (pinScreen) {
            pinScreen.classList.add('hidden');
            pinScreen.classList.remove('flex');
            pinScreen.removeAttribute('style');
        }
    }

    showOnlineBattleMenuScreen();
}

// PIN入力で参加
async function joinRoomByPINConfirm() {
    const pinInput = document.getElementById('pin-input');
    const pinError = document.getElementById('pin-error');

    if (!pinInput) return;

    const pin = pinInput.value.trim();

    if (pin.length !== 6) {
        if (pinError) {
            pinError.textContent = '6桁のPINを入力してください';
            pinError.classList.remove('hidden');
        }
        return;
    }

    try {
        const room = await onlineBattle.joinRoomByPIN(pin);
        console.log('Joined room:', room);

        // PIN入力画面を閉じる
        hideJoinByPIN();

        // ロビー画面を表示
        showLobby();
    } catch (error) {
        console.error('Failed to join room:', error);
        if (pinError) {
            pinError.textContent = error.message || '部屋への参加に失敗しました';
            pinError.classList.remove('hidden');
        }
    }
}

// ランダムマッチ
async function joinRandomMatch() {
    try {
        const room = await onlineBattle.joinRandomRoom();
        console.log('Joined random room:', room);

        // メニュー画面を閉じる
        hideOnlineBattleMenu();

        // ロビー画面を表示
        showLobby();
    } catch (error) {
        console.error('Failed to join random match:', error);
        alert('参加可能な部屋が見つかりませんでした。部屋を作成してください。');
    }
}

// ロビー画面表示
function showLobby() {
    const lobbyScreen = document.getElementById('lobby-screen');
    if (!lobbyScreen) return;

    lobbyScreen.classList.remove('hidden');
    lobbyScreen.classList.add('flex');

    // ロビーに入ったらリロード警告を有効化
    enableUnloadWarning();

    updateLobbyUI();
}

// ロビーUI更新
function updateLobbyUI() {
    const room = onlineBattle.currentRoom;
    if (!room) return;

    // PINコード表示
    const pinDisplay = document.getElementById('lobby-pin-display');
    if (pinDisplay) {
        pinDisplay.textContent = room.pin;
        // クリックイベントを追加
        pinDisplay.style.cursor = 'pointer';
        pinDisplay.onclick = () => copyPinToClipboard(room.pin);
    }

    // ゲーム設定表示
    const modeDisplay = document.getElementById('lobby-mode-display');
    if (modeDisplay) {
        modeDisplay.textContent = modeConfig[room.game_mode]?.label || room.game_mode;
    }

    const diffDisplay = document.getElementById('lobby-diff-display');
    if (diffDisplay) {
        diffDisplay.textContent = difficultyConfig[room.game_difficulty]?.label || room.game_difficulty;
    }

    const durationDisplay = document.getElementById('lobby-duration-display');
    if (durationDisplay) durationDisplay.textContent = room.duration + 's';

    // 自分のユーザーネームを表示
    const myUsername = getUsername() || 'You';

    // HOSTカードの名前を更新
    const hostNameEl = document.querySelector('#lobby-host-card .text-xl.font-bold.text-white');
    if (hostNameEl) {
        if (onlineBattle.isHost) {
            // 自分がHOSTの場合は自分の名前
            hostNameEl.textContent = myUsername;
        } else {
            // 自分がGUESTの場合はHOSTの名前を表示
            hostNameEl.textContent = room.host_name || 'Host';
        }
    }

    // ゲスト表示
    const guestName = document.getElementById('lobby-guest-name');
    if (guestName) {
        if (room.guest_id) {
            if (onlineBattle.isHost) {
                // 自分がHOSTの場合はGUESTの名前を表示
                guestName.textContent = room.guest_name || 'Guest';
            } else {
                // 自分がGUESTの場合は自分の名前
                guestName.textContent = myUsername;
            }
        } else {
            guestName.textContent = '待機中...';
        }
    }

    // Ready状態表示
    const hostReady = document.getElementById('lobby-host-ready');
    const guestReady = document.getElementById('lobby-guest-ready');

    if (onlineBattle.isHost) {
        if (hostReady) {
            if (room.host_ready) {
                hostReady.classList.remove('hidden');
            } else {
                hostReady.classList.add('hidden');
            }
        }
        if (guestReady) {
            if (room.guest_ready) {
                guestReady.classList.remove('hidden');
            } else {
                guestReady.classList.add('hidden');
            }
        }
    } else {
        if (guestReady) {
            if (room.guest_ready) {
                guestReady.classList.remove('hidden');
            } else {
                guestReady.classList.add('hidden');
            }
        }
        if (hostReady) {
            if (room.host_ready) {
                hostReady.classList.remove('hidden');
            } else {
                hostReady.classList.add('hidden');
            }
        }
    }

    // Readyボタンの状態
    const readyBtn = document.getElementById('lobby-ready-btn');
    const isReady = onlineBattle.isHost ? room.host_ready : room.guest_ready;
    const hasOpponent = room.guest_id !== null;

    if (readyBtn) {
        // 対戦相手がいない場合はボタンを無効化
        if (!hasOpponent) {
            readyBtn.disabled = true;
            readyBtn.textContent = 'READY (対戦相手を待っています...)';
            readyBtn.classList.remove('bg-green-600', 'hover:bg-green-500', 'bg-yellow-600', 'hover:bg-yellow-500');
            readyBtn.classList.add('bg-slate-600', 'cursor-not-allowed', 'opacity-50');
        } else {
            readyBtn.disabled = false;
            readyBtn.classList.remove('cursor-not-allowed', 'opacity-50');

            if (isReady) {
                readyBtn.textContent = 'READY ✓ (クリックで解除)';
                readyBtn.classList.remove('bg-green-600', 'hover:bg-green-500');
                readyBtn.classList.add('bg-yellow-600', 'hover:bg-yellow-500');
            } else {
                readyBtn.textContent = 'READY';
                readyBtn.classList.add('bg-green-600', 'hover:bg-green-500');
                readyBtn.classList.remove('bg-yellow-600', 'hover:bg-yellow-500', 'bg-slate-600');
            }
        }
    }
}

// Ready切り替え
async function toggleReady() {
    const room = onlineBattle.currentRoom;
    if (!room) return;

    // 対戦相手がいない場合は何もしない
    if (!room.guest_id) {
        return;
    }

    await onlineBattle.toggleReady();
}

// ロビーから退出
async function leaveLobby() {
    // 確認ダイアログを表示
    const confirmed = confirm('本当に部屋から退出しますか？');
    if (!confirmed) return;

    await onlineBattle.leaveRoom();

    // リロード警告を解除
    disableUnloadWarning();

    const lobbyScreen = document.getElementById('lobby-screen');
    if (lobbyScreen) {
        lobbyScreen.classList.add('hidden');
        lobbyScreen.classList.remove('flex');
    }

    showOnlineBattleMenuScreen();
}

// ロビーでEmoji送信
async function sendEmojiInLobby(type) {
    await onlineBattle.sendEmoji(type);
}

// オンライン対戦開始
function startOnlineBattle(room) {
    // リロード警告を設定
    enableUnloadWarning();

    // サドンデス用のフラグをリセット
    if (onlineBattle) {
        onlineBattle.iMissed = false;
        onlineBattle.opponentMissed = false;
    }

    // 全画面を非表示（統一管理関数を使用）
    if (typeof hideAllScreens === 'function') {
        hideAllScreens();
    }

    // Ready画面を確実に非表示（重要: シングルプレイ用の画面を隠す）
    const readyOverlay = document.getElementById('ready-overlay');
    if (readyOverlay) {
        readyOverlay.classList.add('hidden');
        readyOverlay.style.display = 'none';
    }

    // プロフィールボタンを非表示
    if (typeof updateProfileButtonVisibility === 'function') {
        updateProfileButtonVisibility();
    }

    // ゲームHUDとエリアのぼかしを解除
    const gameHud = document.getElementById('game-hud');
    if (gameHud) {
        gameHud.classList.remove('blur-sm');
    }

    const gameArea = document.getElementById('game-area');
    if (gameArea) {
        gameArea.classList.remove('blur-sm');
    }

    // オンライン対戦時はコンボゲージを非表示
    const comboGaugeBar = document.getElementById('combo-gauge-bar');
    if (comboGaugeBar && comboGaugeBar.parentElement && comboGaugeBar.parentElement.parentElement) {
        comboGaugeBar.parentElement.parentElement.style.display = 'none';
    }

    // ゲーム設定を適用
    currentSettings.mode = room.game_mode;
    currentSettings.difficulty = room.game_difficulty;

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

    // 制限時間を設定
    timeLeft = room.duration;

    // ゲーム状態をリセット（オンライン対戦は'ready'をスキップ）
    gameState = 'countdown'; // 'ready'ではなく'countdown'に設定
    score = 0;
    combo = 0;
    maxCombo = 0;
    totalWordsTyped = 0;
    totalKeystrokes = 0;
    correctKeystrokes = 0;
    comboGauge = 0;

    updateComboGauge();
    updateScoreDisplay();

    // シードを使って単語リストをシャッフル
    const rng = new SeededRandom(room.text_seed);
    const filteredWords = filterWords();
    const sourceWords = filteredWords.length > 0 ? [...filteredWords] : [...activeWordList];

    // Fisher-Yatesシャッフル（確実に同じ順序になる）
    wordDeck = seededShuffle(sourceWords, rng);

    // 時間表示リセット
    if (domCache.timeDisplay && domCache.timeBar) {
        domCache.timeDisplay.textContent = timeLeft + 's';
        domCache.timeBar.style.width = '100%';
        domCache.timeBar.classList.remove('bg-red-500');
        domCache.timeBar.classList.add('bg-cyan-400');
    }

    // ゲーム画面表示
    const gameUI = document.getElementById('game-ui');
    if (gameUI) {
        gameUI.classList.remove('hidden');
        gameUI.classList.add('flex');
        // インラインスタイルは使わない（CSSで制御）
    }

    // オンライン対戦用のスコア表示を追加
    addOpponentScoreDisplay();

    nextWord();

    // オンライン対戦フラグを設定
    if (typeof setOnlineBattleMode === 'function') {
        setOnlineBattleMode(true);
    }

    // カウントダウンを開始（ゲーム画面表示後）
    console.log('[HOST DEBUG] Starting countdown after game UI setup');
    setTimeout(() => {
        console.log('[HOST DEBUG] Calling startOnlineCountdown()');
        startOnlineCountdown();
    }, 300); // 800msから300msに短縮
}

// 対戦相手のスコア表示を追加
function addOpponentScoreDisplay() {
    // 既に存在する場合は削除
    const existing = document.getElementById('opponent-score-container');
    if (existing) existing.remove();

    const scoreDisplay = document.getElementById('score-display');
    if (!scoreDisplay || !scoreDisplay.parentElement) return;

    const container = document.createElement('div');
    container.id = 'opponent-score-container';
    container.className = 'text-center w-24';
    container.innerHTML = `
        <p class="text-xs text-slate-400 uppercase tracking-widest">対戦相手</p>
        <p id="opponent-score-display" class="text-3xl font-bold text-pink-400 mono">0</p>
    `;

    scoreDisplay.parentElement.parentElement.appendChild(container);

    // スコアをリセット
    onlineBattle.opponentScore = 0;
}

// オンライン対戦のスコア更新を送信（game.jsから呼ばれる）
let lastBroadcastTime = 0;
let scoreUpdateInterval = null;

function broadcastScoreUpdate() {
    if (onlineBattle.channel && onlineBattle.currentRoom) {
        onlineBattle.broadcastScore(score);
    }
}

// オンライン対戦開始時に定期送信を開始
function startScoreBroadcast() {
    // 既存のインターバルをクリア
    if (scoreUpdateInterval) {
        clearInterval(scoreUpdateInterval);
    }

    // ネットワーク負荷対策：0.5秒ごとにスコアを送信（100msから500msに変更）
    // ただし、スコアが変わったときのみ送信（無駄な通信を削減）
    let lastSentScore = -1;
    scoreUpdateInterval = setInterval(() => {
        if (isOnlineBattle && onlineBattle.channel && onlineBattle.currentRoom) {
            // スコアが変わっている場合のみ送信
            if (score !== lastSentScore) {
                onlineBattle.broadcastScore(score);
                lastSentScore = score;
            }
        }
    }, 500);
}

// オンライン対戦終了時に定期送信を停止
function stopScoreBroadcast() {
    if (scoreUpdateInterval) {
        clearInterval(scoreUpdateInterval);
        scoreUpdateInterval = null;
    }
}

// オンライン対戦終了処理
async function endOnlineBattle() {
    console.log('🏁 Game ended, synchronizing final scores...');

    // スコアの定期送信を停止
    if (typeof stopScoreBroadcast === 'function') {
        stopScoreBroadcast();
    }

    if (onlineBattle.currentRoom) {
        // 最終スコアを送信（game_overイベントを使用）
        console.log('📊 Broadcasting final score:', score);
        await onlineBattle.broadcastFinalScore(score);

        // 相手の最終スコアを受信するまで待機（3秒タイムアウト）
        const startWaitTime = Date.now();
        const maxWaitTime = 3000; // 3秒

        while (!onlineBattle.opponentFinalScoreReceived && (Date.now() - startWaitTime) < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (onlineBattle.opponentFinalScoreReceived) {
            console.log('✅ Received opponent final score:', onlineBattle.opponentScore);
        } else {
            console.warn('⚠️ Timeout waiting for opponent final score, using last known score');
        }

        // データベースに結果を保存
        await onlineBattle.saveResult(score);
    }

    // リロード警告を解除
    disableUnloadWarning();
}

// オンライン対戦専用リザルト画面を表示
function showOnlineBattleResult(myScore, opponentScore) {
    // ゲーム画面を非表示
    const gameUI = document.getElementById('game-ui');
    if (gameUI) {
        gameUI.classList.add('hidden');
        gameUI.classList.remove('flex');
        gameUI.style.display = 'none';
    }

    // 既存のオンライン結果画面があれば削除
    let resultScreen = document.getElementById('online-result-screen');
    if (resultScreen) resultScreen.remove();

    // 新しいオンライン結果画面を作成
    resultScreen = document.createElement('div');
    resultScreen.id = 'online-result-screen';
    resultScreen.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95';

    // サドンデスモードの場合はミスの有無で勝敗判定
    const isSuddenDeath = onlineBattle.currentRoom && onlineBattle.currentRoom.game_mode === 'sudden_death';

    let winner, winnerText, winnerColor, resultContent;

    if (isSuddenDeath) {
        // サドンデスモード：ミスしたかどうかで判定
        const iMissed = onlineBattle.iMissed;
        const opponentMissed = onlineBattle.opponentMissed;

        if (iMissed && !opponentMissed) {
            winner = 'OPPONENT';
            winnerText = 'YOU LOSE...';
            winnerColor = 'text-pink-400';
        } else if (!iMissed && opponentMissed) {
            winner = 'YOU';
            winnerText = 'YOU WIN!';
            winnerColor = 'text-cyan-400';
        } else if (iMissed && opponentMissed) {
            winner = 'DRAW';
            winnerText = 'DRAW!';
            winnerColor = 'text-yellow-400';
        } else {
            // 両者ミスなし（時間切れ）
            winner = 'DRAW';
            winnerText = 'TIME UP - DRAW!';
            winnerColor = 'text-yellow-400';
        }

        // サドンデス用のシンプルな表示
        resultContent = `
            <div class="flex justify-center items-center gap-16 mb-12">
                <!-- YOU -->
                <div class="score-reveal opacity-0" style="animation-delay: 0.2s">
                    <p class="text-2xl text-slate-400 uppercase tracking-widest mb-4">YOU</p>
                    <div class="w-40 h-40 rounded-full flex items-center justify-center mb-4 ${
            iMissed
                ? 'bg-red-500/20 border-4 border-red-500'
                : 'bg-green-500/20 border-4 border-green-500'
        }">
                        <i class="fas ${
            iMissed
                ? 'fa-times text-red-400 text-7xl'
                : 'fa-check text-green-400 text-7xl'
        }"></i>
                    </div>
                    <div class="text-3xl font-bold ${
            iMissed ? 'text-red-400' : 'text-green-400'
        }">
                        ${iMissed ? 'MISS' : 'PERFECT'}
                    </div>
                </div>
                
                <!-- VS -->
                <div class="text-5xl font-bold text-slate-600">
                    VS
                </div>
                
                <!-- OPPONENT -->
                <div class="score-reveal opacity-0" style="animation-delay: 0.4s">
                    <p class="text-2xl text-slate-400 uppercase tracking-widest mb-4">OPPONENT</p>
                    <div class="w-40 h-40 rounded-full flex items-center justify-center mb-4 ${
            opponentMissed
                ? 'bg-red-500/20 border-4 border-red-500'
                : 'bg-green-500/20 border-4 border-green-500'
        }">
                        <i class="fas ${
            opponentMissed
                ? 'fa-times text-red-400 text-7xl'
                : 'fa-check text-green-400 text-7xl'
        }"></i>
                    </div>
                    <div class="text-3xl font-bold ${
            opponentMissed ? 'text-red-400' : 'text-green-400'
        }">
                        ${opponentMissed ? 'MISS' : 'PERFECT'}
                    </div>
                </div>
            </div>
        `;
    } else {
        // 通常モード：スコアで判定
        if (myScore > opponentScore) {
            winner = 'YOU';
            winnerText = 'YOU WIN!';
            winnerColor = 'text-cyan-400';
        } else if (myScore < opponentScore) {
            winner = 'OPPONENT';
            winnerText = 'YOU LOSE...';
            winnerColor = 'text-pink-400';
        } else {
            winner = 'DRAW';
            winnerText = 'DRAW!';
            winnerColor = 'text-yellow-400';
        }

        // 通常モード用のスコア表示
        resultContent = `
            <div class="flex justify-center items-center gap-12 mb-12">
                <div class="score-reveal text-center opacity-0" style="animation-delay: 0.2s">
                    <p class="text-xl text-cyan-400 mb-2">YOU</p>
                    <p class="text-6xl font-bold text-white mono">${myScore}</p>
                </div>
                <div class="text-4xl text-slate-500">VS</div>
                <div class="score-reveal text-center opacity-0" style="animation-delay: 0.4s">
                    <p class="text-xl text-pink-400 mb-2">OPPONENT</p>
                    <p class="text-6xl font-bold text-white mono">${opponentScore}</p>
                </div>
            </div>
        `;
    }

    resultScreen.innerHTML = `
        <div class="text-center max-w-2xl px-8">
            <!-- FINISH! 表示 -->
            <div id="finish-text" class="text-8xl font-bold text-cyan-400 mb-8 opacity-0">
                FINISH!
            </div>

            <!-- バトルリザルト -->
            <div id="battle-result-container" class="hidden">
                <h2 class="text-6xl font-bold ${winnerColor} mb-12 winner-text">${winnerText}</h2>
                
                <!-- 結果表示 -->
                ${resultContent}

                <!-- NEXT ボタン -->
                <button id="online-next-btn" 
                        class="next-btn-appear px-12 py-4 bg-cyan-600 hover:bg-cyan-500 text-white text-2xl font-bold rounded-lg transition-all opacity-0"
                        style="animation-delay: 1.5s">
                    NEXT <i class="fas fa-arrow-right ml-2"></i>
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(resultScreen);

    // アニメーション開始
    setTimeout(() => {
        const finishText = document.getElementById('finish-text');
        if (finishText) {
            finishText.style.animation = 'finishPop 0.8s ease-out forwards';
        }
    }, 100);

    // ドラムロール音（もしあれば）
    if (typeof soundManager !== 'undefined') {
        soundManager.playBonus();
    }

    // 2秒後にバトルリザルトを表示
    setTimeout(() => {
        const finishText = document.getElementById('finish-text');
        if (finishText) finishText.classList.add('hidden');

        const battleResult = document.getElementById('battle-result-container');
        if (battleResult) battleResult.classList.remove('hidden');

        // 勝者音
        if (typeof soundManager !== 'undefined') {
            if (winner === 'YOU') {
                soundManager.playBonus();
            }
        }
    }, 2000);

    // NEXTボタンのクリックイベント
    setTimeout(() => {
        const nextBtn = document.getElementById('online-next-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                resultScreen.remove();
                // 通常のリザルト画面へ（スコア送信なし）
                if (typeof showNormalResultAfterOnline === 'function') {
                    showNormalResultAfterOnline();
                }
            });
        }
    }, 2100);
}

// オンライン対戦後の通常リザルト画面表示
function showNormalResultAfterOnline() {
    // オンラインリザルト画面を削除
    const onlineResultScreen = document.getElementById('online-result-screen');
    if (onlineResultScreen) {
        onlineResultScreen.remove();
    }

    // オンライン対戦フラグをリセット
    if (typeof setOnlineBattleMode === 'function') {
        setOnlineBattleMode(false);
    }

    // 全画面を非表示（統一管理関数を使用）
    if (typeof hideAllScreens === 'function') {
        hideAllScreens();
    }

    // オンライン対戦統計を更新
    const durationSec = (Date.now() - startTime) / 1000;
    const kps = durationSec > 0 ? (correctKeystrokes / durationSec) : 0;

    // 勝敗判定
    const myScore = score;
    const opponentScore = onlineBattle.opponentScore || 0;
    const isWin = myScore > opponentScore;
    const opponentName = onlineBattle.currentRoom ?
        (onlineBattle.isHost ? onlineBattle.currentRoom.guest_name : onlineBattle.currentRoom.host_name) : '';

    // オンライン統計を更新
    if (typeof updateOnlineStats === 'function') {
        updateOnlineStats({
            score: myScore,
            kps: kps,
            isWin: isWin,
            opponentName: opponentName
        });
    }

    // 部屋から退出
    if (typeof onlineBattle !== 'undefined' && onlineBattle.leaveRoom) {
        onlineBattle.leaveRoom();
    }

    // 通常のリザルト画面を表示
    const kpm = durationSec > 0 ? Math.round((correctKeystrokes / durationSec) * 60) : 0;
    const accuracy = totalKeystrokes > 0
        ? Math.round((correctKeystrokes / totalKeystrokes) * 100)
        : 0;

    // リザルトに値を設定
    const finalScore = document.getElementById('final-score');
    if (finalScore) finalScore.textContent = myScore;

    const finalCombo = document.getElementById('final-combo');
    if (finalCombo) finalCombo.textContent = maxCombo;

    const finalKeys = document.getElementById('final-keys');
    if (finalKeys) finalKeys.textContent = correctKeystrokes;

    const finalAccuracy = document.getElementById('final-accuracy');
    if (finalAccuracy) finalAccuracy.textContent = accuracy + '%';

    const finalKpm = document.getElementById('final-kpm');
    if (finalKpm) finalKpm.textContent = kps.toFixed(2);

    // スコア送信フォームは非表示（オンライン対戦のため）
    const rankingEntry = document.getElementById('ranking-entry');
    if (rankingEntry) rankingEntry.classList.add('hidden');

    const resultTitle = document.getElementById('result-title');
    if (resultTitle) resultTitle.textContent = 'FINISH';

    // リザルト画面を表示
    const resultScreen = document.getElementById('result-screen');
    if (resultScreen) {
        resultScreen.classList.remove('hidden');
        resultScreen.classList.add('flex');
        // インラインスタイルは使わない
    }

    // コンボゲージを再表示
    const comboGaugeBar = document.getElementById('combo-gauge-bar');
    if (comboGaugeBar && comboGaugeBar.parentElement && comboGaugeBar.parentElement.parentElement) {
        comboGaugeBar.parentElement.parentElement.style.display = '';
    }

    // リザルトボタンを表示
    if (typeof showResultButtons === 'function') {
        showResultButtons();
    }

    // 「もう一度遊ぶ」ボタンをロビーに戻るように変更（ホストが存在する場合）
    const playAgainBtn = document.querySelector('#result-screen .flex.gap-4 button:first-child');
    if (playAgainBtn) {
        // onclick属性を削除
        playAgainBtn.removeAttribute('onclick');
        // 新しいイベントリスナを追加
        playAgainBtn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();

            // 通常のリザルト画面を閉じる
            const resultScreen = document.getElementById('result-screen');
            if (resultScreen) {
                resultScreen.classList.add('hidden');
                resultScreen.classList.remove('flex');
                resultScreen.style.display = 'none';
            }

            // 元の部屋に再参加を試みる
            await returnToLobbyAfterBattle();
        };
    }
}

// 公開設定トグル
function toggleRoomPublic() {
    currentOnlineSettings.isPublic = !currentOnlineSettings.isPublic;

    const btn = document.getElementById('btn-room-public');
    if (!btn) return;

    const toggle = btn.querySelector('div');

    if (currentOnlineSettings.isPublic) {
        btn.classList.add('bg-green-500');
        btn.classList.remove('bg-slate-600');
        if (toggle) {
            toggle.classList.add('translate-x-8');
        }
    } else {
        btn.classList.remove('bg-green-500');
        btn.classList.add('bg-slate-600');
        if (toggle) {
            toggle.classList.remove('translate-x-8');
        }
    }
}

// 対戦履歴表示（未実装）
function showBattleHistory() {
    alert('対戦履歴機能は開発中です。\n\n今後のアップデートで実装予定：\n- 過去の対戦結果一覧\n- 勝率・敗率統計\n- 対戦相手の記録');
}

// オンラインバトルメニューからランキングを表示
function showRankingFromOnlineMenu() {
    // オンラインバトルメニューを閉じる
    const menuScreen = document.getElementById('online-battle-menu');
    if (menuScreen) {
        menuScreen.classList.add('hidden');
        menuScreen.classList.remove('flex');
        menuScreen.style.display = 'none';
    }

    // ランキング画面を表示
    const rankingScreen = document.getElementById('ranking-screen');
    if (rankingScreen) {
        rankingScreen.classList.remove('hidden');
        rankingScreen.classList.add('modal-fade-in', 'flex');
        rankingScreen.style.display = 'flex';
    }

    // ランキングデータを更新
    if (typeof updateRankingTabUI === 'function') updateRankingTabUI();
    if (typeof updateRankingDisplay === 'function') updateRankingDisplay();
}

// ランキングからオンラインバトルメニューに戻る
function backToOnlineMenuFromRanking() {
    const rankingScreen = document.getElementById('ranking-screen');
    if (rankingScreen) {
        rankingScreen.classList.add('hidden');
        rankingScreen.classList.remove('modal-fade-in', 'flex');
        rankingScreen.style.display = 'none';
    }

    // オンラインバトルメニューを表示
    showOnlineBattleMenuScreen();
}

// リロード警告を有効化
function enableUnloadWarning() {
    window.addEventListener('beforeunload', handleBeforeUnload);
}

// リロード警告を無効化
function disableUnloadWarning() {
    window.removeEventListener('beforeunload', handleBeforeUnload);
}

// beforeunloadイベントハンドラ
function handleBeforeUnload(e) {
    e.preventDefault();
    // Chromeではカスタムメッセージは表示されないが、returnValueを設定する必要がある
    e.returnValue = '';
    return '';
}

// 対戦終了後にロビーに戻る
async function returnToLobbyAfterBattle() {
    const previousRoomPin = onlineBattle.currentRoom ? onlineBattle.currentRoom.pin : null;
    const wasHost = onlineBattle.isHost;

    // 現在の部屋から退出
    await onlineBattle.leaveRoom();

    // ホストだった場合は新しい部屋を作成してロビーへ
    if (wasHost) {
        try {
            // 同じ設定で新しい部屋を作成
            await onlineBattle.createRoom(
                currentOnlineSettings.mode,
                currentOnlineSettings.difficulty,
                currentOnlineSettings.duration,
                currentOnlineSettings.isPublic
            );

            // ロビーを表示
            showLobby();

            if (typeof showNotification === 'function') {
                showNotification('新しい部屋を作成しました', 'success');
            }
        } catch (error) {
            console.error('Failed to create new room:', error);
            if (typeof showNotification === 'function') {
                showNotification('部屋の作成に失敗しました', 'error');
            }
            showOnlineBattleMenuScreen();
        }
    } else {
        // ゲストだった場合は元の部屋に再参加を試みる
        if (previousRoomPin) {
            try {
                const room = await onlineBattle.checkRoomExists(previousRoomPin);

                if (room) {
                    // 部屋がまだ存在する場合は再参加
                    await onlineBattle.joinRoomByPIN(previousRoomPin);
                    showLobby();

                    if (typeof showNotification === 'function') {
                        showNotification('ロビーに戻りました', 'success');
                    }
                } else {
                    // 部屋が存在しない（ホストが退出済み）
                    if (typeof showNotification === 'function') {
                        showNotification('ホストが退出していたため参加できませんでした', 'error');
                    }
                    showOnlineBattleMenuScreen();
                }
            } catch (error) {
                console.error('Failed to rejoin room:', error);
                if (typeof showNotification === 'function') {
                    showNotification('ホストが退出していたため参加できませんでした', 'error');
                }
                showOnlineBattleMenuScreen();
            }
        } else {
            // PINがない場合はメニューに戻る
            showOnlineBattleMenuScreen();
        }
    }
}