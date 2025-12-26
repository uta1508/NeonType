// グローバル設定
let globalSettings = {
    furigana: true,
    uppercase: false,
    sound: true
};

// ゲーム設定
let currentSettings = {
    mode: 'normal',
    difficulty: 'normal'
};

// ランキング表示状態
let rankingFilter = {
    mode: 'normal',
    difficulty: 'normal'
};

// 設定の読み込み（バージョン管理付き）
function loadGlobalSettings() {
    const saved = localStorage.getItem('neonTypeGlobalSettings');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            if (data.version === DATA_VERSION) {
                globalSettings = { ...globalSettings, ...data.settings };
            } else {
                console.log('Settings version mismatch, using defaults');
            }
        } catch(e) {
            console.error("Settings data corrupted:", e);
        }
    }
    soundManager.enabled = globalSettings.sound;
}

// 設定の保存
function saveGlobalSettings() {
    localStorage.setItem('neonTypeGlobalSettings', JSON.stringify({
        version: DATA_VERSION,
        settings: globalSettings
    }));
    soundManager.enabled = globalSettings.sound;
}

// データリセット
function resetData() {
    if (confirm("ハイスコアと設定をリセットしますか？")) {
        localStorage.removeItem('neonTypeHighScore');
        localStorage.removeItem('neonTypeGlobalSettings');
        highScore = { score: 0, kpm: 0 };
        globalSettings = { furigana: true, uppercase: false, sound: true };
        updateHighScoreDisplay();
        updateSettingsUI();
        alert("リセットしました。");
    }
}

// 設定画面表示
function showSettings() {
    document.getElementById('start-screen').classList.add('hidden');

    // プロフィールボタンを非表示
    const profileButton = document.getElementById('profile-button-top');
    if (profileButton) {
        profileButton.classList.add('hidden');
    }

    const settingsScreen = document.getElementById('settings-screen');
    settingsScreen.classList.remove('hidden');
    settingsScreen.classList.add('modal-fade-in');
    settingsScreen.style.display = 'flex';
}

// 設定画面非表示
function hideSettings() {
    const settingsScreen = document.getElementById('settings-screen');
    const modalContent = settingsScreen.querySelector('.modal-content');

    // フェードアウトアニメーションを追加
    settingsScreen.classList.remove('modal-fade-in');
    settingsScreen.classList.add('modal-fade-out');
    if (modalContent) {
        modalContent.classList.add('modal-content-out');
    }

    // アニメーション終了後に非表示
    setTimeout(() => {
        settingsScreen.classList.add('hidden');
        settingsScreen.classList.remove('modal-fade-out');
        settingsScreen.style.display = 'none';
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

// 設定のトグル
function toggleGlobalSetting(key) {
    globalSettings[key] = !globalSettings[key];
    saveGlobalSettings();
    updateSettingsUI();
}

// 設定UIの更新
function updateSettingsUI() {
    const setToggle = (id, isActive) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        const thumb = btn.querySelector('div');
        if (isActive) {
            btn.classList.remove('bg-slate-600');
            btn.classList.add('bg-cyan-500');
            thumb.classList.remove('translate-x-0');
            thumb.classList.add('translate-x-8');
        } else {
            btn.classList.add('bg-slate-600');
            btn.classList.remove('bg-cyan-500');
            thumb.classList.add('translate-x-0');
            thumb.classList.remove('translate-x-8');
        }
    };

    setToggle('btn-furigana', globalSettings.furigana);
    setToggle('btn-uppercase', globalSettings.uppercase);
    setToggle('btn-sound', globalSettings.sound);
}
