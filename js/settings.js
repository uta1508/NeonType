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
                console.log(`Settings version mismatch (saved: ${data.version}, current: ${DATA_VERSION}), migrating...`);
                // バージョンアップ時の移行処理
                globalSettings = migrateSettings(data);
                saveGlobalSettings(); // 移行後のデータを保存
            }
        } catch(e) {
            console.error("Settings data corrupted:", e);
            // 破損している場合はデフォルトを使用
        }
    }
    soundManager.enabled = globalSettings.sound;
}

// 設定の移行処理
function migrateSettings(oldData) {
    const migrated = { ...globalSettings }; // デフォルトから開始
    
    // 旧バージョンの設定をマージ
    if (oldData.settings) {
        Object.keys(migrated).forEach(key => {
            if (key in oldData.settings) {
                migrated[key] = oldData.settings[key];
            }
        });
    }
    
    // バージョン固有の移行処理をここに追加
    // 例: if (oldData.version < 2) { ... }
    
    return migrated;
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
        if (typeof showNotification === 'function') {
            showNotification('リセットしました。', 'success');
        }
    }
}

// 設定画面表示
function showSettings() {
    // 統一関数で全画面を非表示
    if (typeof hideAllScreens === 'function') {
        hideAllScreens();
    }

    // プロフィールボタンを非表示
    if (typeof updateProfileButtonVisibility === 'function') {
        updateProfileButtonVisibility();
    }

    // 設定画面を表示
    const settingsScreen = document.getElementById('settings-screen');
    if (settingsScreen) {
        settingsScreen.classList.remove('hidden');
        settingsScreen.classList.add('modal-fade-in', 'flex');
        // インラインスタイルは使わない
    }
}

// 設定画面非表示
function hideSettings() {
    const settingsScreen = document.getElementById('settings-screen');
    if (!settingsScreen) return;
    
    const modalContent = settingsScreen.querySelector('.modal-content');

    // フェードアウトアニメーションを追加
    settingsScreen.classList.remove('modal-fade-in');
    settingsScreen.classList.add('modal-fade-out');
    if (modalContent) {
        modalContent.classList.add('modal-content-out');
    }

    // アニメーション終了後に非表示
    const duration = typeof ANIMATION !== 'undefined' ? ANIMATION.DURATION : 250;
    setTimeout(() => {
        if (typeof hideScreen === 'function') {
            hideScreen('settings-screen');
        } else {
            settingsScreen.classList.add('hidden');
            settingsScreen.classList.remove('modal-fade-out', 'flex');
            settingsScreen.removeAttribute('style');
            if (modalContent) {
                modalContent.classList.remove('modal-content-out');
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
