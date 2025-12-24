// プロフィール管理
function loadProfile() {
    const saved = localStorage.getItem('neonTypeProfile');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error('Profile data corrupted:', e);
        }
    }
    return {
        username: '',
        hasPlayed: false
    };
}

function saveProfile(profile) {
    localStorage.setItem('neonTypeProfile', JSON.stringify(profile));
}

function markAsPlayed() {
    const profile = loadProfile();
    profile.hasPlayed = true;
    saveProfile(profile);
}

function saveUsername(name) {
    const profile = loadProfile();
    profile.username = name.trim();
    saveProfile(profile);
}

function getUsername() {
    const profile = loadProfile();
    return profile.username || '';
}

function hasPlayedBefore() {
    const profile = loadProfile();
    return profile.hasPlayed;
}

// プロフィール画面を表示
function showProfile() {
    document.getElementById('start-screen').classList.add('hidden');
    
    // プロフィールボタンを非表示
    const profileButton = document.getElementById('profile-button-top');
    if (profileButton) {
        profileButton.classList.add('hidden');
    }
    
    const profileScreen = document.getElementById('profile-screen');
    profileScreen.classList.remove('hidden');
    profileScreen.classList.add('modal-fade-in');
    profileScreen.style.display = 'flex';
    
    // プロフィール情報を表示
    updateProfileDisplay();
}

// プロフィール画面を非表示
function hideProfile() {
    const profileScreen = document.getElementById('profile-screen');
    const modalContent = profileScreen.querySelector('.modal-content');
    
    profileScreen.classList.remove('modal-fade-in');
    profileScreen.classList.add('modal-fade-out');
    if (modalContent) {
        modalContent.classList.add('modal-content-out');
    }
    
    setTimeout(() => {
        profileScreen.classList.add('hidden');
        profileScreen.classList.remove('modal-fade-out');
        profileScreen.style.display = 'none';
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

// プロフィール表示を更新
function updateProfileDisplay() {
    const profile = loadProfile();
    const achievements = loadAchievements();
    
    // ユーザー名表示
    document.getElementById('profile-username-display').textContent = profile.username || 'No Name';
    
    // 統計情報
    document.getElementById('profile-total-plays').textContent = achievements.stats.totalPlays || 0;
    document.getElementById('profile-total-chars').textContent = achievements.stats.totalChars || 0;
    
    // 称号一覧
    const achievementsList = document.getElementById('profile-achievements-list');
    achievementsList.innerHTML = '';
    
    const unlocked = getUnlockedAchievements();
    const allAchievements = Object.values(ACHIEVEMENTS);
    
    allAchievements.forEach(achievement => {
        const isUnlocked = unlocked.some(a => a.id === achievement.id);
        const div = document.createElement('div');
        div.className = `achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`;
        
        const icon = document.createElement('div');
        icon.className = 'achievement-icon';
        icon.textContent = isUnlocked ? achievement.icon : '🔒';
        
        const info = document.createElement('div');
        info.className = 'achievement-info';
        
        const name = document.createElement('div');
        name.className = 'achievement-name';
        name.textContent = achievement.name;
        
        const desc = document.createElement('div');
        desc.className = 'achievement-desc';
        desc.textContent = achievement.description;
        
        info.appendChild(name);
        info.appendChild(desc);
        div.appendChild(icon);
        div.appendChild(info);
        
        achievementsList.appendChild(div);
    });
}

// ユーザー名編集を開始
function startEditUsername() {
    const currentName = getUsername();
    document.getElementById('profile-username-input').value = currentName;
    document.getElementById('profile-username-display-section').classList.add('hidden');
    document.getElementById('profile-username-edit-section').classList.remove('hidden');
}

// ユーザー名編集をキャンセル
function cancelEditUsername() {
    document.getElementById('profile-username-display-section').classList.remove('hidden');
    document.getElementById('profile-username-edit-section').classList.add('hidden');
}

// ユーザー名を保存
function saveUsernameFromProfile() {
    const input = document.getElementById('profile-username-input');
    const newName = input.value.trim();
    
    if (newName.length === 0) {
        alert('名前を入力してください');
        return;
    }
    
    if (newName.length > 10) {
        alert('名前は10文字以内で入力してください');
        return;
    }
    
    saveUsername(newName);
    document.getElementById('profile-username-display').textContent = newName;
    cancelEditUsername();
}
