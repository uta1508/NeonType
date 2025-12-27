// ゲームモード選択画面表示
function showGameModeSelect() {
    // 統一関数で全画面を非表示
    if (typeof hideAllScreens === 'function') {
        hideAllScreens();
    }
    
    // プロフィールボタンを非表示
    if (typeof updateProfileButtonVisibility === 'function') {
        updateProfileButtonVisibility();
    }
    
    // ゲームモード選択画面を表示
    const modeSelectScreen = document.getElementById('game-mode-select-screen');
    if (modeSelectScreen) {
        modeSelectScreen.classList.remove('hidden');
        modeSelectScreen.classList.add('modal-fade-in', 'flex');
        // インラインスタイルは使わない
    }
}

// ゲームモード選択画面非表示
function hideGameModeSelect() {
    const modeSelectScreen = document.getElementById('game-mode-select-screen');
    if (!modeSelectScreen) return;
    
    const modalContent = modeSelectScreen.querySelector('.modal-content');

    // アニメーション用クラス付与
    modeSelectScreen.classList.remove('modal-fade-in');
    modeSelectScreen.classList.add('modal-fade-out');
    if (modalContent) {
        modalContent.classList.add('modal-content-out');
    }

    // アニメーション完了後に非表示（onceオプションで自動削除）
    modeSelectScreen.addEventListener('transitionend', function onAnimationEnd() {
        if (typeof hideScreen === 'function') {
            hideScreen('game-mode-select-screen');
        } else {
            modeSelectScreen.classList.add('hidden');
            modeSelectScreen.classList.remove('modal-fade-out', 'flex');
            modeSelectScreen.removeAttribute('style');
            if (modalContent) {
                modalContent.classList.remove('modal-content-out');
            }
        }
        
        if (typeof resetStartScreenStyles === 'function') {
            resetStartScreenStyles();
        }
    }, { once: true }); // onceオプションで自動的にリスナ削除
}

// ゲームモード選択
 function selectGameMode(mode) {
    console.log('Selected game mode:', mode);
    
    if (mode === 'solo') {
        // 一人で遊ぶ：セットアップ画面へ
        hideGameModeSelect();
        setTimeout(() => {
            showSetup();
        }, typeof ANIMATION !== 'undefined' ? ANIMATION.MODAL_FADE : 300);
    } else if (mode === 'friend') {
        // 友達と対戦：オンラインバトルメニューへ
        hideGameModeSelect();
        setTimeout(() => {
            if (typeof showOnlineBattleMenu === 'function') {
                showOnlineBattleMenu();
            }
        }, typeof ANIMATION !== 'undefined' ? ANIMATION.MODAL_FADE : 300);
    }
}

// Coming Soon通知
function showComingSoon(featureName) {
    if (typeof showNotification === 'function') {
        showNotification(`${featureName}は現在開発中です。お楽しみに！`, 'info', 3000);
    } else {
        alert(`${featureName}は現在開発中です。お楽しみに！`);
    }
}

// セットアップ画面表示
function showSetup() {
    // 統一関数で全画面を非表示
    if (typeof hideAllScreens === 'function') {
        hideAllScreens();
    }
    
    // プロフィールボタンを非表示
    if (typeof updateProfileButtonVisibility === 'function') {
        updateProfileButtonVisibility();
    }
    
    // セットアップ画面を表示
    const setupScreen = document.getElementById('setup-screen');
    if (setupScreen) {
        setupScreen.classList.remove('hidden');
        setupScreen.classList.add('modal-fade-in', 'flex');
        // インラインスタイルは使わない
    }
}

// セットアップ画面非表示（ゲームモード選択画面に戻る）
function hideSetup() {
    const setupScreen = document.getElementById('setup-screen');
    if (!setupScreen) return;
    
    const modalContent = setupScreen.querySelector('.modal-content');

    // アニメーション用クラス付与
    setupScreen.classList.remove('modal-fade-in');
    setupScreen.classList.add('modal-fade-out');
    if (modalContent) {
        modalContent.classList.add('modal-content-out');
    }

    // アニメーション完了後にゲームモード選択画面を表示
    const duration = typeof ANIMATION !== 'undefined' ? ANIMATION.DURATION : 250;
    setTimeout(() => {
        if (typeof hideScreen === 'function') {
            hideScreen('setup-screen');
        } else {
            setupScreen.classList.add('hidden');
            setupScreen.classList.remove('modal-fade-out', 'flex');
            setupScreen.removeAttribute('style');
            if (modalContent) {
                modalContent.classList.remove('modal-content-out');
            }
        }
        
        // ゲームモード選択画面を表示
        if (typeof showScreen === 'function') {
            showScreen('game-mode-select-screen');
        } else {
            const gameModeSelect = document.getElementById('game-mode-select-screen');
            if (gameModeSelect) {
                gameModeSelect.classList.remove('hidden');
                gameModeSelect.classList.add('modal-fade-in', 'flex');
            }
        }
    }, duration);
}

// モード選択
function selectMode(mode) {
    currentSettings.mode = mode;
    document.querySelectorAll('[id^="mode-"]').forEach(el => el.classList.remove('selected'));
    document.getElementById(`mode-${mode}`).classList.add('selected');
}

// 難易度選択
function selectDifficulty(diff) {
    currentSettings.difficulty = diff;
    document.querySelectorAll('[id^="diff-"]').forEach(el => el.classList.remove('selected'));
    document.getElementById(`diff-${diff}`).classList.add('selected');
}

// start-screenのスタイルを完全にリセットするヘルパー関数
function resetStartScreenStyles() {
    const startScreen = document.getElementById('start-screen');
    if (!startScreen) return;
    
    // 全てのインラインスタイルをクリア
    startScreen.removeAttribute('style');
    
    // hiddenクラスだけを削除（他の必要なクラスは保持）
    startScreen.classList.remove('hidden');
    
    // プロフィールボタンを表示
    const profileButton = document.getElementById('profile-button-top');
    if (profileButton) {
        profileButton.classList.remove('hidden');
        profileButton.style.display = '';
    }
    
    // bodyのスタイルもリセット
    document.body.removeAttribute('style');
}

// タイトル画面表示
function showTitle() {
    // タイマーのクリーンアップ（集約関数を使用）
    if (typeof cleanupTimers === 'function') {
        cleanupTimers();
    }
    
    gameState = 'title';
    allowExtraN = false;
    
    // オンライン対戦フラグをリセット
    if (typeof setOnlineBattleMode === 'function') {
        setOnlineBattleMode(false);
    }
    
    // オンライン対戦関連のクリーンアップ
    if (typeof stopScoreBroadcast === 'function') {
        stopScoreBroadcast();
    }
    
    if (typeof disableUnloadWarning === 'function') {
        disableUnloadWarning();
    }
    
    if (typeof onlineBattle !== 'undefined' && onlineBattle.leaveRoom) {
        onlineBattle.leaveRoom();
    }
    
    // 全画面を非表示（統一管理関数を使用）
    if (typeof hideAllScreens === 'function') {
        hideAllScreens();
    }
    
    // オンライン結果画面を削除
    const onlineResultScreen = document.getElementById('online-result-screen');
    if (onlineResultScreen) {
        onlineResultScreen.remove();
    }
    
    // 対戦相手スコア表示を削除
    const opponentScoreContainer = document.getElementById('opponent-score-container');
    if (opponentScoreContainer) {
        opponentScoreContainer.remove();
    }
    
    // リザルト画面の「もう一度遊ぶ」ボタンを元に戻す
    const playAgainBtn = document.querySelector('#result-screen .flex.gap-4 button:first-child');
    if (playAgainBtn) {
        playAgainBtn.onclick = null;
        playAgainBtn.setAttribute('onclick', 'prepareGame()');
    }
    
    // スタート画面を完全にリセットして表示
    resetStartScreenStyles();
    
    updateHighScoreDisplay();
}

// ランキング画面表示
async function showRankingFromTitle() {
    if (currentSettings.mode !== 'practice') {
        rankingFilter.mode = currentSettings.mode;
        rankingFilter.difficulty = currentSettings.difficulty;
    }
    
    // 統一関数で全画面を非表示
    if (typeof hideAllScreens === 'function') {
        hideAllScreens();
    }
    
    // プロフィールボタンを非表示
    if (typeof updateProfileButtonVisibility === 'function') {
        updateProfileButtonVisibility();
    }
    
    // ランキング画面を表示
    const rankingScreen = document.getElementById('ranking-screen');
    if (rankingScreen) {
        rankingScreen.classList.remove('hidden');
        rankingScreen.classList.add('modal-fade-in', 'flex');
        // インラインスタイルは使わない
    }
    
    updateRankingTabUI();
    await updateRankingDisplay();
}

// ランキング画面非表示
function hideRanking() {
    const rankingScreen = document.getElementById('ranking-screen');
    if (!rankingScreen) return;
    
    const modalContent = rankingScreen.querySelector('.modal-content');
    
    // フェードアウトアニメーションを追加
    rankingScreen.classList.remove('modal-fade-in');
    rankingScreen.classList.add('modal-fade-out');
    if (modalContent) {
        modalContent.classList.add('modal-content-out');
    }
    
    // アニメーション終了後に非表示
    const duration = typeof ANIMATION !== 'undefined' ? ANIMATION.DURATION : 250;
    setTimeout(() => {
        if (typeof hideScreen === 'function') {
            hideScreen('ranking-screen');
        } else {
            rankingScreen.classList.add('hidden');
            rankingScreen.classList.remove('modal-fade-out', 'flex');
            rankingScreen.removeAttribute('style');
            if (modalContent) {
                modalContent.classList.remove('modal-content-out');
            }
        }
        
        if (typeof resetStartScreenStyles === 'function') {
            resetStartScreenStyles();
        }
    }, duration);
}

// ランキングタブ変更
async function changeRankingTab(type, value) {
    if (type === 'mode') rankingFilter.mode = value;
    if (type === 'diff') rankingFilter.difficulty = value;
    updateRankingTabUI();
    await updateRankingDisplay();
}

// ランキングタブUIの更新
function updateRankingTabUI() {
    ['normal', 'sudden_death'].forEach(m => {
        const el = document.getElementById(`rank-tab-mode-${m}`);
        el.className = rankingFilter.mode === m
            ? "flex-1 py-1 text-xs font-bold rounded text-white bg-slate-700"
            : "flex-1 py-1 text-xs font-bold rounded text-slate-400 hover:bg-slate-800";
    });
    ['easy', 'normal', 'hard'].forEach(d => {
        const el = document.getElementById(`rank-tab-diff-${d}`);
        el.className = rankingFilter.difficulty === d
            ? "flex-1 py-1 text-xs font-bold rounded text-white bg-slate-700"
            : "flex-1 py-1 text-xs font-bold rounded text-slate-400 hover:bg-slate-800";
    });
}

// ランキング表示の更新
async function updateRankingDisplay() {
    const listEl = document.getElementById('ranking-list');
    listEl.innerHTML = '<div class="text-center text-slate-500 py-10"><i class="fas fa-circle-notch fa-spin mr-2"></i>読み込み中...</div>';

    if (!isSupabaseConfigured()) {
        listEl.innerHTML = '<div class="text-center text-red-400 py-10 text-sm">Supabaseが設定されていません。<br>api.jsを確認してください。</div>';
        return;
    }

    try {
        const data = await fetchRankingData(rankingFilter.mode, rankingFilter.difficulty);

        if (data.length === 0) {
        listEl.innerHTML = '<div class="text-center text-slate-500 py-10">まだ記録がありません</div>';
    } else {
        listEl.innerHTML = '';
        data.forEach((entry, index) => {
            const el = document.createElement('div');
            el.className = 'rank-item grid grid-cols-12 gap-4 text-base text-slate-300 py-3 px-2 border-b border-slate-700/50 items-center hover:bg-slate-700/30 transition-colors rounded';
            let rankColor = 'text-slate-400';
            let iconClass = null;
            if (index === 0) {
                rankColor = 'text-yellow-400';
                iconClass = 'fas fa-crown mr-1';
            } else if (index === 1) {
                rankColor = 'text-slate-300';
                iconClass = 'fas fa-medal mr-1';
            } else if (index === 2) {
                rankColor = 'text-amber-600';
                iconClass = 'fas fa-medal mr-1';
            }

            // XSS対策の強化 (textContent を全面的に使用)
            const safeName = sanitizeText(entry.userName || 'No Name');
            const safeScore = sanitizeText(String(entry.score || 0));

            const rankDiv = document.createElement('div');
            rankDiv.className = `col-span-2 text-center font-bold ${rankColor} text-xl`;

            if (iconClass) {
                const icon = document.createElement('i');
                icon.className = iconClass;
                rankDiv.appendChild(icon);
            }
            rankDiv.appendChild(document.createTextNode(String(index + 1)));

            const nameDiv = document.createElement('div');
            nameDiv.className = 'col-span-6 truncate font-medium';
            nameDiv.textContent = safeName;

            const scoreDiv = document.createElement('div');
            scoreDiv.className = 'col-span-4 text-right font-mono text-cyan-400 font-bold text-lg';
            scoreDiv.textContent = safeScore;

            el.appendChild(rankDiv);
            el.appendChild(nameDiv);
            el.appendChild(scoreDiv);
            listEl.appendChild(el);
        });
    }
    } catch (error) {
        console.error('Failed to fetch ranking:', error);
        listEl.innerHTML = '<div class="text-center text-red-400 py-10 text-sm">ランキングの取得に失敗しました</div>';
    }
}

// テキストサニタイズ関数
function sanitizeText(text) {
    if (typeof text !== 'string') return '';
    return text.replace(/[<>&"']/g, (char) => {
        const entities = {
            '<': '&lt;',
            '>': '&gt;',
            '&': '&amp;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return entities[char] || char;
    }).substring(0, 100); // 最大長制限も追加
}

// スコア送信
async function submitScoreData() {
    const nameInput = document.getElementById('player-name-input');
    const btn = document.getElementById('btn-submit-score');
    const name = nameInput.value.trim() || 'No Name';
    btn.disabled = true;
    btn.textContent = '送信中...';
    
    // ユーザー名を保存
    if (name && name !== 'No Name') {
        saveUsername(name);
    }

    // 4000以下のスコアは送信できない
    if (score < 4000) {
        showNotification('4000点以上のスコアが必要です', 'warning');
        btn.disabled = false;
        btn.textContent = '送信';
        return;
    }

    if (isSupabaseConfigured()) {
        const durationSec = (Date.now() - startTime) / 1000;
        const kpm = durationSec > 0 ? Math.round((correctKeystrokes / durationSec) * 60) : 0;
        const result = await submitScore(name, score, kpm, currentSettings.mode, currentSettings.difficulty);
        if (result.success) {
            showNotification('スコアを送信しました！', 'success');
            document.getElementById('ranking-entry').classList.add('hidden');
        } else {
            showNotification(`送信に失敗しました: ${result.error || '不明なエラー'}`, 'error');
            btn.disabled = false;
            btn.textContent = '送信';
        }
    } else {
        showNotification('オンライン機能が無効です。API設定を確認してください。', 'warning');
        btn.disabled = false;
        btn.textContent = '送信';
    }
}
