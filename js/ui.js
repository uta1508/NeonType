// セットアップ画面表示
function showSetup() {
    // 他の画面を全て非表示にする
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-ui').classList.add('hidden');
    document.getElementById('result-screen').classList.add('hidden');
    
    // プロフィールボタンを非表示
    const profileButton = document.getElementById('profile-button-top');
    if (profileButton) {
        profileButton.classList.add('hidden');
    }
    
    const setupScreen = document.getElementById('setup-screen');
    setupScreen.classList.remove('hidden');
    setupScreen.classList.add('modal-fade-in');
    setupScreen.style.display = 'flex';
}

// セットアップ画面非表示
function hideSetup() {
    const setupScreen = document.getElementById('setup-screen');
    const modalContent = setupScreen.querySelector('.modal-content');

    // アニメーション用クラス付与
    setupScreen.classList.remove('modal-fade-in');
    setupScreen.classList.add('modal-fade-out');
    if (modalContent) {
        modalContent.classList.add('modal-content-out');
    }

    // ★修正ポイント: transitionend を使用
    // アニメーションが終わったタイミングで1回だけ実行される関数を作成
    function onAnimationEnd() {
        setupScreen.classList.add('hidden');
        setupScreen.classList.remove('modal-fade-out');
        setupScreen.style.display = 'none';

        if (modalContent) {
            modalContent.classList.remove('modal-content-out');
        }

        // 他の画面制御
        document.getElementById('game-ui').classList.add('hidden');
        document.getElementById('result-screen').classList.add('hidden');
        document.getElementById('start-screen').classList.remove('hidden');

        // イベントリスナーを削除（掃除）
        setupScreen.removeEventListener('transitionend', onAnimationEnd);
    }

    // イベントリスナーを登録
    setupScreen.addEventListener('transitionend', onAnimationEnd);
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

// タイトル画面表示
function showTitle() {
    // タイマーのクリーンアップ
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    // カウントダウンのクリーンアップ
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    
    gameState = 'title';
    allowExtraN = false;
    
    // 全ての画面を非表示にする
    const gameUI = document.getElementById('game-ui');
    gameUI.classList.add('hidden');
    gameUI.style.display = 'none';
    
    const resultScreen = document.getElementById('result-screen');
    resultScreen.classList.add('hidden');
    resultScreen.style.display = 'none';
    
    const setupScreen = document.getElementById('setup-screen');
    setupScreen.classList.add('hidden');
    setupScreen.style.display = 'none';
    
    const rankingScreen = document.getElementById('ranking-screen');
    rankingScreen.classList.add('hidden');
    rankingScreen.style.display = 'none';
    
    const profileScreen = document.getElementById('profile-screen');
    profileScreen.classList.add('hidden');
    profileScreen.style.display = 'none';
    
    // スタート画面を表示
    const startScreen = document.getElementById('start-screen');
    startScreen.classList.remove('hidden');
    startScreen.style.display = '';
    
    // プロフィールボタンを表示（プレイ済みの場合）
    const profileButton = document.getElementById('profile-button-top');
    if (hasPlayedBefore() && profileButton) {
        profileButton.classList.remove('hidden');
    }
    
    updateHighScoreDisplay();
}

// ランキング画面表示
async function showRankingFromTitle() {
    if (currentSettings.mode !== 'practice') {
        rankingFilter.mode = currentSettings.mode;
        rankingFilter.difficulty = currentSettings.difficulty;
    }
    document.getElementById('start-screen').classList.add('hidden');
    
    // プロフィールボタンを非表示
    const profileButton = document.getElementById('profile-button-top');
    if (profileButton) {
        profileButton.classList.add('hidden');
    }
    
    const rankingScreen = document.getElementById('ranking-screen');
    rankingScreen.classList.remove('hidden');
    rankingScreen.classList.add('modal-fade-in');
    rankingScreen.style.display = 'flex';
    updateRankingTabUI();
    await updateRankingDisplay();
}

// ランキング画面非表示
function hideRanking() {
    const rankingScreen = document.getElementById('ranking-screen');
    const modalContent = rankingScreen.querySelector('.modal-content');
    
    // フェードアウトアニメーションを追加
    rankingScreen.classList.remove('modal-fade-in');
    rankingScreen.classList.add('modal-fade-out');
    if (modalContent) {
        modalContent.classList.add('modal-content-out');
    }
    
    // アニメーション終了後に非表示
    setTimeout(() => {
        rankingScreen.classList.add('hidden');
        rankingScreen.classList.remove('modal-fade-out');
        rankingScreen.style.display = 'none';
        if (modalContent) {
            modalContent.classList.remove('modal-content-out');
        }
        document.getElementById('start-screen').classList.remove('hidden');
        
        // プロフィールボタンを再表示
        const profileButton = document.getElementById('profile-button-top');
        if (hasPlayedBefore() && profileButton) {
            profileButton.classList.remove('hidden');
        }
    }, 250);
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

    if (isSupabaseConfigured()) {
        const durationSec = (Date.now() - startTime) / 1000;
        const kpm = durationSec > 0 ? Math.round((correctKeystrokes / durationSec) * 60) : 0;
        const result = await submitScore(name, score, kpm, currentSettings.mode, currentSettings.difficulty);
        if (result.success) {
            alert('スコアを送信しました！');
            document.getElementById('ranking-entry').classList.add('hidden');
        } else {
            alert(`送信に失敗しました: ${result.error || '不明なエラー'}`);
            btn.disabled = false;
            btn.textContent = '送信';
        }
    } else {
        alert('オンライン機能が無効です。API設定を確認してください。');
        btn.disabled = false;
        btn.textContent = '送信';
    }
}