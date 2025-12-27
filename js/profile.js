// ========================================
// プロフィール画面 (新デザイン)
// ========================================

// テキストのHTMLエスケープ
function sanitizeText(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ユーザーネーム管理
function getUsername() {
    return localStorage.getItem('neonTypeUsername') || '';
}

function saveUsername(name) {
    localStorage.setItem('neonTypeUsername', name);
}

// プレイ記録があるかチェック
function hasPlayedBefore() {
    const stats = getPlayerStats();
    return stats.totalPlays > 0;
}

// プレイヤー統計の取得
function getPlayerStats() {
    const saved = localStorage.getItem('neonTypePlayerStats');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch(e) {
            console.error('Failed to load player stats:', e);
        }
    }

    return {
        totalPlays: 0,
        totalKeys: 0,
        totalPlayTime: 0,
        bestScore: 0,
        bestKPS: 0,
        averageAccuracy: 0,
        // オンライン対戦統計
        onlineBattles: 0,
        onlineWins: 0,
        onlineLosses: 0,
        onlineBestScore: 0,
        onlineBestKPS: 0,
        currentStreak: 0,
        bestStreak: 0,
        bestOpponent: '',
        // レベルシステム
        level: 1,
        xp: 0,
        xpToNextLevel: 100
    };
}

// プレイヤー統計の保存
function savePlayerStats(stats) {
    localStorage.setItem('neonTypePlayerStats', JSON.stringify(stats));
}

// ゲーム終了時に統計を更新
function updatePlayerStats(gameData) {
    const stats = getPlayerStats();

    stats.totalPlays++;
    stats.totalKeys += gameData.totalKeys || 0;
    stats.totalPlayTime += gameData.playTime || 0;

    if (gameData.score > stats.bestScore) {
        stats.bestScore = gameData.score;
    }

    if (gameData.kps > stats.bestKPS) {
        stats.bestKPS = gameData.kps;
    }

    // 平均精度の更新
    stats.averageAccuracy = Math.round(
        ((stats.averageAccuracy * (stats.totalPlays - 1)) + gameData.accuracy) / stats.totalPlays
    );

    // XP加算とレベルアップ
    const xpGained = Math.floor(gameData.score / 10);
    stats.xp += xpGained;

    while (stats.xp >= stats.xpToNextLevel) {
        stats.xp -= stats.xpToNextLevel;
        stats.level++;
        stats.xpToNextLevel = Math.floor(stats.xpToNextLevel * 1.5);

        // レベルアップ通知
        if (typeof showNotification !== 'undefined') {
            showNotification(`🎉 レベルアップ！Lv.${stats.level}に到達しました！`, 'success', 4000);
        }
    }

    savePlayerStats(stats);
    return stats;
}

// オンライン対戦結果を更新
function updateOnlineStats(result) {
    const stats = getPlayerStats();

    stats.onlineBattles++;

    if (result.isWin) {
        stats.onlineWins++;
        stats.currentStreak++;
        if (stats.currentStreak > stats.bestStreak) {
            stats.bestStreak = stats.currentStreak;
        }
    } else {
        stats.onlineLosses++;
        stats.currentStreak = 0;
    }

    if (result.score > stats.onlineBestScore) {
        stats.onlineBestScore = result.score;
    }

    if (result.kps > stats.onlineBestKPS) {
        stats.onlineBestKPS = result.kps;
    }

    // オンラインバトルのハイスコアを全体のベストスコアにも反映
    if (result.score > stats.bestScore) {
        stats.bestScore = result.score;
    }

    if (result.kps > stats.bestKPS) {
        stats.bestKPS = result.kps;
    }

    if (result.opponentName) {
        stats.bestOpponent = result.opponentName;
    }

    // オンライン対戦もXP獲得
    const xpGained = result.isWin ? 50 : 25;
    stats.xp += xpGained;

    while (stats.xp >= stats.xpToNextLevel) {
        stats.xp -= stats.xpToNextLevel;
        stats.level++;
        stats.xpToNextLevel = Math.floor(stats.xpToNextLevel * 1.5);

        if (typeof showNotification !== 'undefined') {
            showNotification(`🎉 レベルアップ！Lv.${stats.level}に到達しました！`, 'success', 4000);
        }
    }

    savePlayerStats(stats);
    return stats;
}

// プロフィール画面を表示
function showProfile() {
    const username = getUsername() || 'No Name';
    const stats = getPlayerStats();
    const achievements = typeof getAllAchievements === 'function' ? getAllAchievements() : [];
    const unlockedAchievements = achievements.filter(a => a.unlocked);

    // 統一関数で全画面を非表示
    if (typeof hideAllScreens === 'function') {
        hideAllScreens();
    }

    const profileScreen = document.getElementById('profile-screen');
    if (!profileScreen) {
        console.error('profile-screen not found!');
        return;
    }

    // プロフィール画面のHTML生成
    profileScreen.innerHTML = `
        <div class="w-full h-full flex flex-col">
            <!-- 固定ヘッダー -->
            <div class="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 px-6 py-4">
                <div class="w-full max-w-6xl mx-auto flex justify-between items-center">
                    <button onclick="hideProfile()" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-all flex items-center gap-2 shadow-lg">
                        <i class="fas fa-arrow-left"></i> 戻る
                    </button>
                    <button onclick="startEditUsername()" class="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-all flex items-center gap-2 shadow-lg">
                        <i class="fas fa-edit"></i> 編集
                    </button>
                </div>
            </div>
            
            <!-- スクロール可能なコンテンツ -->
            <div class="flex-1 overflow-y-auto">
                <div class="w-full max-w-6xl mx-auto p-6">
            <!-- プレイヤーカード -->
            <div class="profile-card-enter mb-6" style="animation-delay: 0.1s">
                <div class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border-2 border-cyan-500 p-6 shadow-xl profile-card-glow">
                    <div class="flex items-center gap-6">
                        <!-- アバター -->
                        <div class="profile-avatar relative">
                            <div class="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-4xl font-bold text-white shadow-lg">
                                ${username.charAt(0).toUpperCase()}
                            </div>
                            <div class="absolute -bottom-2 -right-2 bg-yellow-500 text-slate-900 rounded-full w-10 h-10 flex items-center justify-center font-bold text-sm border-4 border-slate-900 level-badge">
                                ${stats.level}
                            </div>
                        </div>
                        
                        <!-- プレイヤー情報 -->
                        <div class="flex-1">
                            <h2 class="text-3xl font-bold text-white mb-2">${sanitizeText(username)}</h2>
                            <div class="flex items-center gap-2 text-yellow-400 mb-3">
                                <i class="fas fa-trophy"></i>
                                <span class="text-sm font-bold">
                                    ${unlockedAchievements.length > 0 ? unlockedAchievements[0].name : 'タイピング初心者'}
                                </span>
                            </div>
                            
                            <!-- レベルゲージ -->
                            <div class="mb-2">
                                <div class="flex justify-between text-xs text-slate-400 mb-1">
                                    <span>Level ${stats.level}</span>
                                    <span class="xp-counter">${stats.xp} / ${stats.xpToNextLevel} XP</span>
                                </div>
                                <div class="h-3 bg-slate-700 rounded-full overflow-hidden border border-slate-600">
                                    <div class="xp-bar h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-1000 ease-out" style="width: 0%"></div>
                                </div>
                            </div>
                            <p class="text-xs text-slate-400">
                                次のレベルまであと <span class="text-cyan-400 font-bold">${stats.xpToNextLevel - stats.xp} XP</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 統計カード（4つ） -->
            <div class="grid grid-cols-4 gap-4 mb-6">
                <div class="profile-card-enter stat-card" style="animation-delay: 0.2s">
                    <div class="bg-slate-800 rounded-xl p-4 border-2 border-slate-700 hover:border-yellow-500 transition-all hover:scale-105 hover:shadow-lg hover:shadow-yellow-500/30">
                        <div class="text-4xl mb-2">💯</div>
                        <div class="text-xs text-slate-400 uppercase mb-1">Best Score</div>
                        <div class="stat-number text-2xl font-bold text-yellow-400 mono">0</div>
                        <div class="text-xs text-slate-500">Personal Best</div>
                    </div>
                </div>
                
                <div class="profile-card-enter stat-card" style="animation-delay: 0.3s">
                    <div class="bg-slate-800 rounded-xl p-4 border-2 border-slate-700 hover:border-cyan-500 transition-all hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/30">
                        <div class="text-4xl mb-2">⚡</div>
                        <div class="text-xs text-slate-400 uppercase mb-1">Best KPS</div>
                        <div class="stat-number text-2xl font-bold text-cyan-400 mono" style="min-width: 4ch;">0</div>
                        <div class="text-xs text-slate-500">Keys Per Second</div>
                    </div>
                </div>
                
                <div class="profile-card-enter stat-card" style="animation-delay: 0.4s">
                    <div class="bg-slate-800 rounded-xl p-4 border-2 border-slate-700 hover:border-green-500 transition-all hover:scale-105 hover:shadow-lg hover:shadow-green-500/30">
                        <div class="text-4xl mb-2">🎯</div>
                        <div class="text-xs text-slate-400 uppercase mb-1">Accuracy</div>
                        <div class="stat-number text-2xl font-bold text-green-400 mono">0%</div>
                        <div class="text-xs text-slate-500">Average</div>
                    </div>
                </div>
                
                <div class="profile-card-enter stat-card" style="animation-delay: 0.5s">
                    <div class="bg-slate-800 rounded-xl p-4 border-2 border-slate-700 hover:border-orange-500 transition-all hover:scale-105 hover:shadow-lg hover:shadow-orange-500/30">
                        <div class="text-4xl mb-2">🔥</div>
                        <div class="text-xs text-slate-400 uppercase mb-1">Streak</div>
                        <div class="stat-number text-2xl font-bold text-orange-400 mono">0</div>
                        <div class="text-xs text-slate-500">Best Win Streak</div>
                    </div>
                </div>
            </div>
            
            <!-- メイン統計（2カラム） -->
            <div class="grid md:grid-cols-2 gap-6 mb-6">
                <!-- ソロプレイ統計 -->
                <div class="profile-card-enter" style="animation-delay: 0.6s">
                    <div class="bg-slate-800 rounded-xl border-2 border-cyan-500 p-6 h-full stats-card">
                        <h3 class="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
                            <i class="fas fa-chart-line"></i>
                            CAREER STATS
                        </h3>
                        <div class="space-y-4">
                            <div class="stat-row flex justify-between items-center">
                                <div class="text-slate-400 text-sm">Total Plays</div>
                                <div class="stat-number text-2xl font-bold text-white mono">0</div>
                            </div>
                            <div class="stat-row flex justify-between items-center">
                                <div class="text-slate-400 text-sm">Total Keys</div>
                                <div class="stat-number text-2xl font-bold text-cyan-400 mono">0</div>
                            </div>
                            <div class="stat-row flex justify-between items-center">
                                <div class="text-slate-400 text-sm">Play Time</div>
                                <div class="stat-number text-2xl font-bold text-purple-400 mono">0h 0m</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- オンライン対戦統計 -->
                <div class="profile-card-enter" style="animation-delay: 0.7s">
                    <div class="bg-slate-800 rounded-xl border-2 border-purple-500 p-6 h-full stats-card">
                        <h3 class="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                            <i class="fas fa-users"></i>
                            ONLINE BATTLE
                        </h3>
                        <div class="space-y-4">
                            <div class="stat-row flex justify-between items-center">
                                <div class="text-slate-400 text-sm">Total Matches</div>
                                <div class="stat-number text-2xl font-bold text-white mono">0</div>
                            </div>
                            <div class="stat-row">
                                <div class="flex justify-between items-start mb-2">
                                    <div class="text-slate-400 text-sm">Win Rate</div>
                                    <div class="text-right">
                                        <div class="winrate-number text-2xl font-bold mono leading-none mb-1">0%</div>
                                        <div class="text-xs text-slate-400">
                                            <span class="text-green-400 font-bold win-count">0</span>W / 
                                            <span class="text-red-400 font-bold loss-count">0</span>L
                                        </div>
                                    </div>
                                </div>
                                <div class="h-2 bg-slate-700 rounded-full overflow-hidden border border-slate-600">
                                    <div class="winrate-bar h-full bg-gradient-to-r from-green-500 to-cyan-500 transition-all duration-1000" style="width: 0%"></div>
                                </div>
                            </div>
                            <div class="stat-row flex justify-between items-center">
                                <div class="text-slate-400 text-sm">Best Opponent</div>
                                <div class="text-lg font-bold text-pink-400 best-opponent">-</div>
                            </div>
                            <div class="stat-row flex justify-between items-center">
                                <div class="text-slate-400 text-sm flex items-center gap-2">
                                    Longest Streak 
                                    <span class="text-orange-400">🔥</span>
                                </div>
                                <div class="stat-number text-2xl font-bold text-orange-400 mono">0</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 称号セクション -->
            <div class="profile-card-enter" style="animation-delay: 0.8s">
                <div class="bg-slate-800 rounded-xl border-2 border-yellow-500 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold text-yellow-400 flex items-center gap-2">
                            <i class="fas fa-medal"></i>
                            ACHIEVEMENTS <span class="text-slate-400 text-sm">(${unlockedAchievements.length}/${achievements.length})</span>
                        </h3>
                        <button onclick="showAllAchievements()" class="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                            全て見る <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                    <div id="recent-achievements" class="flex flex-wrap gap-3">
                        ${unlockedAchievements.length === 0
        ? '<p class="text-slate-500 text-sm">まだ称号を獲得していません</p>'
        : ''
    }
                    </div>
                </div>
            </div>
            </div>
        </div>
        
        <!-- ユーザー名編集モーダル -->
        <div id="username-edit-modal" class="hidden fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div class="bg-slate-800 p-8 rounded-xl border-2 border-cyan-500 max-w-md w-full mx-4 modal-content">
                <h2 class="text-2xl font-bold text-cyan-400 mb-4">ユーザー名を変更</h2>
                <input type="text" id="username-edit-input" maxlength="10" placeholder="新しい名前を入力"
                       class="w-full bg-slate-900 border-2 border-slate-600 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-cyan-500 mb-6">
                <div class="flex gap-3">
                    <button onclick="cancelEditUsername()" class="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-all">
                        キャンセル
                    </button>
                    <button onclick="saveUsernameFromProfile()" class="flex-1 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-all">
                        保存
                    </button>
                </div>
            </div>
        </div>
    `;

    profileScreen.classList.remove('hidden');
    profileScreen.classList.add('flex');
    // インラインスタイルは使わない

    // アニメーションで数値を更新
    setTimeout(() => {
        animateStats(stats, unlockedAchievements);
    }, 100);
}

// 統計をアニメーション付きで表示
function animateStats(stats, achievements) {
    // XPバー
    const xpBar = document.querySelector('.xp-bar');
    if (xpBar) {
        const percentage = (stats.xp / stats.xpToNextLevel) * 100;
        setTimeout(() => {
            xpBar.style.width = percentage + '%';
        }, 500);
    }

    // 統計数値のカウントアップ（各カードの stat-number を個別に取得）
    const statCards = document.querySelectorAll('.stat-card');
    if (statCards[0]) {
        const num = statCards[0].querySelector('.stat-number');
        if (num) animateNumber(num, stats.bestScore, 1500, 0);
    }
    if (statCards[1]) {
        const num = statCards[1].querySelector('.stat-number');
        if (num) animateNumber(num, stats.bestKPS, 1500, 1);
    }
    if (statCards[2]) {
        const num = statCards[2].querySelector('.stat-number');
        if (num) {
            animateNumber(num, stats.averageAccuracy, 1500, 0);
            setTimeout(() => {
                num.textContent = stats.averageAccuracy + '%';
            }, 1500);
        }
    }
    if (statCards[3]) {
        const num = statCards[3].querySelector('.stat-number');
        if (num) {
            animateNumber(num, stats.bestStreak, 1500, 0);
        }
    }

    // CAREER STATS セクション
    const statsCards = document.querySelectorAll('.stats-card');
    if (statsCards[0]) {
        const rows = statsCards[0].querySelectorAll('.stat-row .stat-number');
        if (rows[0]) animateNumber(rows[0], stats.totalPlays, 2000, 0);
        if (rows[1]) animateNumber(rows[1], stats.totalKeys, 2000, 0);
        if (rows[2]) {
            const hours = Math.floor(stats.totalPlayTime / 3600);
            const minutes = Math.floor((stats.totalPlayTime % 3600) / 60);
            rows[2].textContent = `${hours}h ${minutes}m`;
        }
    }

    // ONLINE BATTLE セクション
    if (statsCards[1]) {
        const rows = statsCards[1].querySelectorAll('.stat-row');
        if (rows[0]) {
            const num = rows[0].querySelector('.stat-number');
            if (num) animateNumber(num, stats.onlineBattles, 2000, 0);
        }
    }

    // Win Rate
    const winRate = stats.onlineBattles > 0
        ? Math.round((stats.onlineWins / stats.onlineBattles) * 100)
        : 0;

    const winRateNumber = document.querySelector('.winrate-number');
    if (winRateNumber) {
        animateNumber(winRateNumber, winRate, 2000, 0);
        setTimeout(() => {
            winRateNumber.textContent = winRate + '%';
        }, 2000);

        // 勝率に応じて色を変更
        winRateNumber.classList.remove('text-yellow-400', 'text-cyan-400', 'text-red-400');
        if (winRate >= 70) {
            winRateNumber.classList.add('text-yellow-400');
        } else if (winRate >= 50) {
            winRateNumber.classList.add('text-cyan-400');
        } else {
            winRateNumber.classList.add('text-red-400');
        }
    }

    const winRateBar = document.querySelector('.winrate-bar');
    if (winRateBar) {
        setTimeout(() => {
            winRateBar.style.width = winRate + '%';
        }, 500);
    }

    // 勝敗数
    const winCount = document.querySelector('.win-count');
    const lossCount = document.querySelector('.loss-count');
    if (winCount) animateNumber(winCount, stats.onlineWins, 2000, 0);
    if (lossCount) animateNumber(lossCount, stats.onlineLosses, 2000, 0);

    // Best Opponent
    const bestOpponent = document.querySelector('.best-opponent');
    if (bestOpponent) {
        bestOpponent.textContent = stats.bestOpponent || '-';
    }

    // Longest Streak (ONLINE BATTLE セクションの最後の stat-row)
    const onlineStatsCard = statsCards[1];
    if (onlineStatsCard) {
        const streakRows = onlineStatsCard.querySelectorAll('.stat-row');
        if (streakRows.length >= 4) {
            const streakNum = streakRows[3].querySelector('.stat-number');
            if (streakNum) {
                animateNumber(streakNum, stats.bestStreak, 2000, 0);
            }
        }
    }

    // 称号バッジを表示
    displayRecentAchievements(achievements);
}

// 数値をカウントアップアニメーション
function animateNumber(element, target, duration = 1500, decimals = 0) {
    if (typeof element === 'string') {
        element = document.querySelector(element);
    }
    if (!element) return;

    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // イージング関数（ease-out）
        const easeProgress = 1 - Math.pow(1 - progress, 3);

        const current = start + (target - start) * easeProgress;

        if (decimals > 0) {
            element.textContent = current.toFixed(decimals);
        } else {
            element.textContent = Math.floor(current).toString();
        }

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            if (decimals > 0) {
                element.textContent = target.toFixed(decimals);
            } else {
                element.textContent = target.toString();
            }
        }
    }

    requestAnimationFrame(update);
}

// 最近獲得した称号を表示
function displayRecentAchievements(achievements) {
    const container = document.getElementById('recent-achievements');
    if (!container) return;

    const unlocked = achievements.filter(a => a.unlocked).slice(0, 6);

    container.innerHTML = '';

    unlocked.forEach((achievement, index) => {
        const badge = document.createElement('div');
        badge.className = 'achievement-badge-profile';
        badge.style.animationDelay = `${0.9 + index * 0.1}s`;
        badge.innerHTML = `
            <div class="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-3xl border-4 border-slate-800 hover:scale-110 transition-transform cursor-help shadow-lg"
                 title="${achievement.name}: ${achievement.description}">
                ${achievement.icon}
            </div>
        `;
        container.appendChild(badge);
    });
}

// ユーザー名編集開始
function startEditUsername() {
    const modal = document.getElementById('username-edit-modal');
    const input = document.getElementById('username-edit-input');

    if (modal && input) {
        input.value = getUsername();
        modal.classList.remove('hidden');
        setTimeout(() => input.focus(), 100);
    }
}

// ユーザー名編集キャンセル
function cancelEditUsername() {
    const modal = document.getElementById('username-edit-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// ユーザー名保存
function saveUsernameFromProfile() {
    const input = document.getElementById('username-edit-input');
    if (!input) return;

    const newName = input.value.trim();

    if (newName.length === 0) {
        if (typeof showNotification !== 'undefined') {
            showNotification('名前を入力してください', 'warning');
        } else {
            alert('名前を入力してください');
        }
        return;
    }

    if (newName.length > 10) {
        if (typeof showNotification !== 'undefined') {
            showNotification('名前は10文字以内で入力してください', 'warning');
        } else {
            alert('名前は10文字以内で入力してください');
        }
        return;
    }

    saveUsername(newName);
    cancelEditUsername();

    if (typeof showNotification !== 'undefined') {
        showNotification('ユーザー名を更新しました', 'success');
    }

    // プロフィール画面を再描画
    showProfile();
}

// プロフィール画面を閉じる
function hideProfile() {
    // プロフィール画面を非表示
    if (typeof hideScreen === 'function') {
        hideScreen('profile-screen');
    } else {
        const profileScreen = document.getElementById('profile-screen');
        if (profileScreen) {
            profileScreen.classList.add('hidden');
            profileScreen.classList.remove('flex');
            profileScreen.removeAttribute('style');
        }
    }

    // スタート画面をリセットして表示
    if (typeof resetStartScreenStyles === 'function') {
        resetStartScreenStyles();
    }

    // プロフィールボタンの表示制御
    if (typeof updateProfileButtonVisibility === 'function') {
        updateProfileButtonVisibility();
    }
}

// 全ての称号を表示（既存のモーダルを使用）
function showAllAchievements() {
    // 既存のprofile.jsの関数を呼び出す想定
    hideProfile();

    // 少し待ってから既存のプロフィール画面を表示
    setTimeout(() => {
        const oldProfileScreen = document.getElementById('profile-screen-old');
        if (oldProfileScreen) {
            // 既存のプロフィール画面があればそれを表示
        } else {
            // なければ通知
            if (typeof showNotification !== 'undefined') {
                showNotification('称号一覧機能は開発中です', 'info');
            }
        }
    }, 300);
}
