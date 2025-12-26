// 称号システム
const ACHIEVEMENTS = {
    debut: {
        id: 'debut',
        name: 'ネオン・デビュー',
        description: 'プレイ回数 1回達成',
        icon: '🥉',
        color: '#cd7f32',
        rarity: 'bronze',
        check: (stats) => stats.totalPlays >= 1
    },
    beginner: {
        id: 'beginner',
        name: '駆け出しタイパー',
        description: 'スコア 10,000点 以上',
        icon: '🟢',
        color: '#10b981',
        rarity: 'common',
        check: (stats) => stats.lastScore >= 10000
    },
    speedster: {
        id: 'speedster',
        name: '電光石火',
        description: 'KPS 5.0以上',
        icon: '⚡',
        color: '#3b82f6',
        rarity: 'rare',
        check: (stats) => stats.lastKps >= 5.0
    },
    precision: {
        id: 'precision',
        name: '精密機械',
        description: 'ミス 0回 (Full Combo)',
        icon: '⚪',
        color: '#c0c0c0',
        rarity: 'rare',
        check: (stats) => stats.lastMisses === 0 && stats.lastScore > 0
    },
    combo_master: {
        id: 'combo_master',
        name: 'コンボマスター',
        description: '最大コンボ 200以上',
        icon: '🟡',
        color: '#eab308',
        rarity: 'rare',
        check: (stats) => stats.lastMaxCombo >= 200
    },
    zone: {
        id: 'zone',
        name: 'ゾーン突入',
        description: 'KPS 8.3以上',
        icon: '🔴',
        color: '#ef4444',
        rarity: 'epic',
        check: (stats) => stats.lastKps >= 8.3
    },
    veteran: {
        id: 'veteran',
        name: '不屈の心',
        description: 'プレイ回数 50回達成',
        icon: '🔩',
        color: '#6b7280',
        rarity: 'epic',
        check: (stats) => stats.totalPlays >= 50
    },
    marathon: {
        id: 'marathon',
        name: '10,000のキセキ',
        description: '累計 10,000文字入力',
        icon: '✨',
        color: '#fbbf24',
        rarity: 'epic',
        check: (stats) => stats.totalChars >= 10000
    },
    champion: {
        id: 'champion',
        name: 'ネオンの覇者',
        description: 'スコア 20,000点以上',
        icon: '🌈',
        color: 'linear-gradient(90deg, #f472b6, #a78bfa, #60a5fa)',
        rarity: 'legendary',
        check: (stats) => stats.lastScore >= 20000
    },
    godhand: {
        id: 'godhand',
        name: 'GOD HAND',
        description: 'スコア 25,000点以上 + ミス0',
        icon: '😇',
        color: '#ffffff',
        rarity: 'mythic',
        check: (stats) => stats.lastScore >= 25000 && stats.lastMisses === 0
    }
};

// 称号データの読み込み
function loadAchievements() {
    const saved = localStorage.getItem('neonTypeAchievements');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error('Achievement data corrupted:', e);
        }
    }
    return {
        unlocked: [],
        stats: {
            totalPlays: 0,
            totalChars: 0
        }
    };
}

// 称号データの保存
function saveAchievements(data) {
    localStorage.setItem('neonTypeAchievements', JSON.stringify(data));
}

// 新規獲得称号のチェック
function checkNewAchievements(gameStats) {
    const data = loadAchievements();
    const newUnlocks = [];
    
    // 統計情報を更新
    data.stats.totalPlays++;
    data.stats.totalChars += gameStats.totalChars;
    
    // 各称号をチェック
    const checkStats = {
        ...data.stats,
        lastScore: gameStats.score,
        lastKps: gameStats.kps,
        lastMisses: gameStats.misses,
        lastMaxCombo: gameStats.maxCombo
    };
    
    for (const [key, achievement] of Object.entries(ACHIEVEMENTS)) {
        if (!data.unlocked.includes(key) && achievement.check(checkStats)) {
            data.unlocked.push(key);
            newUnlocks.push(achievement);
        }
    }
    
    saveAchievements(data);
    return newUnlocks;
}

// 獲得済み称号の取得
function getUnlockedAchievements() {
    const data = loadAchievements();
    return data.unlocked.map(id => ACHIEVEMENTS[id]).filter(Boolean);
}

// 称号の進捗状況を取得
function getAchievementProgress(achievementId) {
    const data = loadAchievements();
    const achievement = ACHIEVEMENTS[achievementId];
    if (!achievement) return null;
    
    const stats = {
        ...data.stats,
        lastScore: 0,
        lastKps: 0,
        lastMisses: 999,
        lastMaxCombo: 0
    };
    
    return {
        unlocked: data.unlocked.includes(achievementId),
        achievement: achievement
    };
}
