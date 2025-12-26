// 称号アンロック演出システム
let achievementQueue = [];
let currentAchievementIndex = 0;
let achievementUnlockActive = false;

// 称号アンロック演出の準備
function prepareAchievementUnlock(newAchievements) {
    achievementQueue = newAchievements;
    currentAchievementIndex = 0;
    achievementUnlockActive = true;
    
    // ボタンを非表示にして、NEXTテキストを表示
    hideResultButtons();
    showNextIndicator();
}

// NEXTインジケーターを表示
function showNextIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'achievement-next-indicator';
    indicator.className = 'achievement-next-indicator';
    indicator.innerHTML = '▶ NEXT <span class="blink">_</span>';
    document.getElementById('result-screen').appendChild(indicator);
}

// NEXTインジケーターを非表示
function hideNextIndicator() {
    const indicator = document.getElementById('achievement-next-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// 結果画面のボタンを非表示
function hideResultButtons() {
    const buttons = document.querySelector('#result-screen > .flex.gap-4');
    if (buttons) {
        buttons.style.display = 'none';
    }
}

// 結果画面のボタンを表示
function showResultButtons() {
    const buttons = document.querySelector('#result-screen > .flex.gap-4');
    if (buttons) {
        buttons.style.display = 'flex';
        buttons.classList.add('fade-in-slow');
    }
}

// 称号アンロック演出を表示
function showAchievementUnlock() {
    if (currentAchievementIndex >= achievementQueue.length) {
        // 全ての称号を表示し終えた
        finishAchievementUnlock();
        return;
    }
    
    const achievement = achievementQueue[currentAchievementIndex];
    hideNextIndicator();
    
    // SE再生（レア度によって音を変える）
    if (achievement.rarity === 'mythic' || achievement.rarity === 'legendary') {
        // 高レアはボーナス音を複数回
        soundManager.playBonus();
        setTimeout(() => soundManager.playBonus(), 150);
        setTimeout(() => soundManager.playBonus(), 300);
    } else {
        soundManager.playBonus();
    }
    
    // オーバーレイを作成
    const overlay = document.createElement('div');
    overlay.id = 'achievement-unlock-overlay';
    overlay.className = 'achievement-unlock-overlay';
    
    // 称号カードを作成
    const card = document.createElement('div');
    card.className = `achievement-unlock-card rarity-${achievement.rarity}`;
    
    // アイコン
    const icon = document.createElement('div');
    icon.className = 'achievement-unlock-icon';
    icon.textContent = achievement.icon;
    
    // タイトル
    const title = document.createElement('div');
    title.className = 'achievement-unlock-title';
    title.textContent = '称号獲得！';
    
    // 称号名
    const name = document.createElement('div');
    name.className = 'achievement-unlock-name';
    name.textContent = achievement.name;
    
    // 説明
    const desc = document.createElement('div');
    name.className = 'achievement-unlock-desc';
    desc.textContent = achievement.description;
    
    card.appendChild(icon);
    card.appendChild(title);
    card.appendChild(name);
    card.appendChild(desc);
    overlay.appendChild(card);
    
    // エフェクト
    const effects = createAchievementEffects(achievement.rarity);
    overlay.appendChild(effects);
    
    document.getElementById('result-screen').appendChild(overlay);
    
    // アニメーション開始
    requestAnimationFrame(() => {
        overlay.classList.add('active');
        card.classList.add('pop-in');
    });
    
    currentAchievementIndex++;
}

// 称号エフェクトを作成
function createAchievementEffects(rarity) {
    const container = document.createElement('div');
    container.className = 'achievement-effects';
    
    // 光の粒子エフェクト（全レア度）
    const particleCount = rarity === 'mythic' ? 30 : rarity === 'legendary' ? 20 : 10;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'light-particle';
        const angle = (Math.PI * 2 * i) / particleCount;
        const radius = 40 + Math.random() * 20;
        const startX = 50;
        const startY = 50;
        const endX = startX + Math.cos(angle) * radius;
        const endY = startY + Math.sin(angle) * radius;
        // 位置を中央に設定（transform: translate(-50%, -50%)で中央揃えされる）
        particle.style.left = startX + '%';
        particle.style.top = startY + '%';
        // 終点位置をCSS変数として設定（translateからの相対位置）
        particle.style.setProperty('--end-x', (endX - startX) + '%');
        particle.style.setProperty('--end-y', (endY - startY) + '%');
        particle.style.animationDelay = (i * 0.05) + 's';
        particle.style.animationDuration = (1 + Math.random() * 0.5) + 's';
        container.appendChild(particle);
    }
    
    // レア度別エフェクト
    if (rarity === 'legendary' || rarity === 'mythic') {
        // 紙吹雪エフェクト（増量）
        for (let i = 0; i < 100; i++) {
            const particle = document.createElement('div');
            particle.className = 'confetti';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 3 + 's';
            particle.style.animationDuration = (2 + Math.random() * 2) + 's';
            const hue = Math.random() * 360;
            particle.style.background = `hsl(${hue}, 70%, 60%)`;
            container.appendChild(particle);
        }
    }
    
    if (rarity === 'mythic') {
        // 神々しい光エフェクト
        const glow = document.createElement('div');
        glow.className = 'mythic-glow';
        container.appendChild(glow);
        
        // 追加のレインボーリングエフェクト
        for (let i = 0; i < 5; i++) {
            const ring = document.createElement('div');
            ring.className = 'rainbow-ring';
            ring.style.animationDelay = (i * 0.3) + 's';
            container.appendChild(ring);
        }
    }
    
    return container;
}

// 称号アンロック演出を終了
function finishAchievementUnlock() {
    achievementUnlockActive = false;
    
    // オーバーレイを削除
    const overlay = document.getElementById('achievement-unlock-overlay');
    if (overlay) {
        overlay.remove();
    }
    
    // 獲得した称号を表示
    displayUnlockedAchievements();
    
    // ボタンを表示
    showResultButtons();
}

// 獲得した称号を結果画面に表示
function displayUnlockedAchievements() {
    const container = document.getElementById('unlocked-achievements-display');
    if (!container) return;
    
    container.innerHTML = '';
    achievementQueue.forEach(achievement => {
        const badge = document.createElement('div');
        badge.className = 'achievement-badge';
        badge.title = `${achievement.name} - ${achievement.description}`;
        badge.textContent = achievement.icon;
        container.appendChild(badge);
    });
    
    if (achievementQueue.length > 0) {
        container.style.display = 'flex';
    }
}

// グローバルクリックイベントリスナー
document.addEventListener('click', (e) => {
    if (achievementUnlockActive && gameState === 'result') {
        const overlay = document.getElementById('achievement-unlock-overlay');
        if (overlay) {
            // 既に表示中の称号を削除
            overlay.remove();
        }
        // 次の称号を表示
        showAchievementUnlock();
    }
});

// キーボードイベントリスナー
document.addEventListener('keydown', (e) => {
    if (achievementUnlockActive && gameState === 'result') {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            const overlay = document.getElementById('achievement-unlock-overlay');
            if (overlay) {
                overlay.remove();
            }
            showAchievementUnlock();
        }
    }
});
