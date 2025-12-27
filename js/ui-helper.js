// ========================================
// UI Helper Functions
// ========================================

// アニメーション関連の定数
const ANIMATION = {
    DURATION: 250,           // モーダルアニメーションの基本時間 (ms)
    MODAL_FADE: 300,         // モーダルフェード時間 (ms)
    TRANSITION_DELAY: 100    // 画面切り替え後の待機時間 (ms)
};

// 画面遷移状態管理
let isTransitioning = false;

/**
 * 画面遷移中かどうかをチェック
 * @returns {boolean}
 */
function checkTransitioning() {
    if (isTransitioning) {
        console.warn('Screen transition in progress, please wait...');
        return true;
    }
    return false;
}

/**
 * 画面遷移を開始
 */
function startTransition() {
    isTransitioning = true;
}

/**
 * 画面遷移を終了
 */
function endTransition() {
    isTransitioning = false;
}

/**
 * テキストを安全にエスケープ（XSS対策）
 * @param {string} text - エスケープするテキスト
 * @param {number} maxLength - 最大長（デフォルト: 100）
 * @returns {string} エスケープされたテキスト
 */
function sanitizeText(text, maxLength = 100) {
    if (typeof text !== 'string') return '';
    return text
        .replace(/[<>&"']/g, (char) => {
            const entities = {
                '<': '&lt;',
                '>': '&gt;',
                '&': '&amp;',
                '"': '&quot;',
                "'": '&#39;'
            };
            return entities[char] || char;
        })
        .substring(0, maxLength);
}

/**
 * 安全にDOM要素を作成
 * @param {string} tag - タグ名
 * @param {Object} options - オプション
 * @param {string} options.className - クラス名
 * @param {string} options.text - テキストコンテンツ
 * @param {Object} options.attrs - 属性オブジェクト
 * @returns {HTMLElement}
 */
function createSafeElement(tag, options = {}) {
    const element = document.createElement(tag);
    
    if (options.className) {
        element.className = options.className;
    }
    
    if (options.text) {
        element.textContent = options.text; // textContentを使用（XSS対策）
    }
    
    if (options.attrs) {
        Object.entries(options.attrs).forEach(([key, value]) => {
            // 危険な属性を除外
            if (!['onclick', 'onerror', 'onload'].includes(key.toLowerCase())) {
                element.setAttribute(key, value);
            }
        });
    }
    
    return element;
}

/**
 * モーダル表示の統一関数
 * @param {string} modalId - モーダルのID
 * @param {Function} onShow - 表示時のコールバック（オプション）
 */
function showModal(modalId, onShow = null) {
    // 他のモーダルを全て閉じる
    const allModals = [
        'start-screen', 'game-ui', 'result-screen', 'setup-screen',
        'settings-screen', 'ranking-screen', 'profile-screen',
        'online-battle-menu', 'create-room-screen', 'join-pin-screen',
        'lobby-screen'
    ];
    
    allModals.forEach(id => {
        const el = document.getElementById(id);
        if (el && id !== modalId) {
            el.classList.add('hidden');
            el.classList.remove('flex');
            el.style.display = 'none';
        }
    });
    
    // 指定されたモーダルを表示
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('modal-fade-in', 'flex');
        modal.style.display = 'flex';
        
        if (onShow) onShow();
    }
}

/**
 * モーダル非表示の統一関数
 * @param {string} modalId - モーダルのID
 * @param {string} nextModalId - 次に表示するモーダルのID（オプション）
 * @param {Function} onHide - 非表示時のコールバック（オプション）
 */
function hideModal(modalId, nextModalId = null, onHide = null) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    const modalContent = modal.querySelector('.modal-content');
    
    // アニメーション
    modal.classList.remove('modal-fade-in');
    modal.classList.add('modal-fade-out');
    if (modalContent) {
        modalContent.classList.add('modal-content-out');
    }
    
    // アニメーション完了後に非表示
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('modal-fade-out', 'flex');
        modal.style.display = 'none';
        
        if (modalContent) {
            modalContent.classList.remove('modal-content-out');
        }
        
        if (onHide) onHide();
        
        // 次のモーダルを表示
        if (nextModalId) {
            showModal(nextModalId);
        }
    }, ANIMATION.DURATION);
}

/**
 * DOM要素を安全に取得（存在チェック付き）
 * @param {string} id - 要素のID
 * @param {boolean} throwError - エラーをスローするか（デフォルト: false）
 * @returns {HTMLElement|null}
 */
function getSafeElement(id, throwError = false) {
    const element = document.getElementById(id);
    if (!element && throwError) {
        console.error(`Element not found: ${id}`);
    }
    return element;
}

/**
 * 複数のDOM要素を安全に取得
 * @param {string[]} ids - 要素のIDの配列
 * @returns {Object} IDをキーとした要素のオブジェクト
 */
function getSafeElements(ids) {
    const elements = {};
    ids.forEach(id => {
        elements[id] = getSafeElement(id);
    });
    return elements;
}

/**
 * 数値を安全にフォーマット
 * @param {number} value - フォーマットする数値
 * @param {number} decimals - 小数点以下の桁数（デフォルト: 0）
 * @returns {string}
 */
function formatNumber(value, decimals = 0) {
    if (typeof value !== 'number' || isNaN(value)) return '0';
    return value.toFixed(decimals);
}

/**
 * デバウンス関数
 * @param {Function} func - 実行する関数
 * @param {number} wait - 待機時間（ミリ秒）
 * @returns {Function}
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * スロットル関数
 * @param {Function} func - 実行する関数
 * @param {number} limit - 実行間隔（ミリ秒）
 * @returns {Function}
 */
function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ========================================
// 画面管理の統一化
// ========================================

/**
 * 全画面のIDリストと保持すべきクラス
 */
const SCREENS = {
    START: 'start-screen',
    GAME_MODE: 'game-mode-select-screen',
    SETUP: 'setup-screen',
    GAME: 'game-ui',
    RESULT: 'result-screen',
    SETTINGS: 'settings-screen',
    RANKING: 'ranking-screen',
    PROFILE: 'profile-screen',
    ONLINE_MENU: 'online-battle-menu',
    CREATE_ROOM: 'create-room-screen',
    JOIN_PIN: 'join-pin-screen',
    LOBBY: 'lobby-screen'
};

/**
 * 各画面で保持すべきクラスのマッピング
 * これらのクラスは画面の構造上必要なため、hideAllScreens()でも削除しない
 */
const SCREEN_PRESERVED_CLASSES = {
    'start-screen': ['flex', 'flex-col', 'items-center'],
    'game-ui': ['flex-col', 'items-center'],
    'result-screen': ['flex', 'flex-col', 'items-center', 'justify-center'],
    'ranking-screen': ['flex', 'flex-col', 'items-center', 'justify-center', 'backdrop-blur-sm'],
    'settings-screen': ['flex', 'flex-col', 'items-center', 'justify-center', 'backdrop-blur-sm'],
    'profile-screen': ['flex'],
    'game-mode-select-screen': ['flex', 'flex-col', 'items-center', 'justify-center'],
    'setup-screen': ['flex', 'flex-col', 'items-center', 'justify-center'],
    'online-battle-menu': ['flex', 'items-center', 'justify-center'],
    'create-room-screen': ['flex', 'items-center', 'justify-center'],
    'join-pin-screen': ['flex', 'items-center', 'justify-center'],
    'lobby-screen': ['flex', 'items-center', 'justify-center']
};

/**
 * 全ての画面を非表示にする
 */
function hideAllScreens() {
    Object.values(SCREENS).forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('hidden');
            
            // 各画面の保持すべきクラスを取得
            const preservedClasses = SCREEN_PRESERVED_CLASSES[id] || [];
            
            // flex、modal-fade系のクラスを削除（保持すべきクラスは除外）
            const classesToRemove = ['flex', 'flex-col', 'items-center', 'justify-center', 
                                     'modal-fade-in', 'modal-fade-out', 'backdrop-blur-sm'];
            
            classesToRemove.forEach(cls => {
                if (!preservedClasses.includes(cls)) {
                    el.classList.remove(cls);
                }
            });
            
            el.removeAttribute('style'); // インラインスタイルを削除
            
            // モーダルコンテンツのアニメーションクラスも削除
            const modalContent = el.querySelector('.modal-content');
            if (modalContent) {
                modalContent.classList.remove('modal-content-out');
            }
        }
    });
}

/**
 * 指定された画面を表示する
 * @param {string} screenId - 画面のID
 * @param {boolean} hideOthers - 他の画面を非表示にするか（デフォルト: true）
 */
function showScreen(screenId, hideOthers = true) {
    if (hideOthers) {
        hideAllScreens();
    }
    
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.remove('hidden');
        screen.classList.add('modal-fade-in');
        // インラインスタイルは使わない（CSSクラスで制御）
    }
}

/**
 * 指定された画面を非表示にする
 * @param {string} screenId - 画面のID
 */
function hideScreen(screenId) {
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.add('hidden');
        screen.classList.remove('flex', 'modal-fade-in', 'modal-fade-out');
        screen.removeAttribute('style');
        
        const modalContent = screen.querySelector('.modal-content');
        if (modalContent) {
            modalContent.classList.remove('modal-content-out');
        }
    }
}

/**
 * タイトル画面のスタイルを完全にリセット
 */
function resetStartScreenStyles() {
    const startScreen = document.getElementById('start-screen');
    if (startScreen) {
        startScreen.removeAttribute('style');
        startScreen.classList.remove('hidden');
    }
    
    // プロフィールボタンを表示
    updateProfileButtonVisibility();
    
    // bodyのスタイルもリセット
    document.body.removeAttribute('style');
}

/**
 * プロフィールボタンの表示制御を統一管理
 */
function updateProfileButtonVisibility() {
    const btn = document.getElementById('profile-button-top');
    if (!btn) return;
    
    // ゲームの状態に応じて表示/非表示
    const shouldShow = (
        typeof gameState !== 'undefined' && 
        gameState === 'title' && 
        typeof hasPlayedBefore === 'function' && 
        hasPlayedBefore()
    );
    
    if (shouldShow) {
        btn.classList.remove('hidden');
        btn.removeAttribute('style');
    } else {
        btn.classList.add('hidden');
    }
}

// ========================================
// DOM操作の安全性向上
// ========================================

/**
 * 複数のDOM要素を安全に取得し、キャッシュする
 * @param {string[]} ids - 要素のIDの配列
 * @returns {Object} IDをキーとした要素のオブジェクト
 */
function cacheMultipleElements(ids) {
    const cache = {};
    ids.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            cache[id] = element;
        } else {
            console.warn(`Element not found: ${id}`);
        }
    });
    return cache;
}

/**
 * 安全にテキストコンテンツを設定
 * @param {string} elementId - 要素のID
 * @param {string} text - 設定するテキスト
 * @param {string} fallback - 要素が見つからない場合のデフォルト値
 */
function safeSetText(elementId, text, fallback = '') {
    const element = getSafeElement(elementId);
    if (element) {
        element.textContent = text;
    } else if (fallback) {
        console.warn(`Could not set text for ${elementId}, using fallback`);
    }
}

/**
 * 安全にクラスを追加
 * @param {string} elementId - 要素のID
 * @param {...string} classes - 追加するクラス
 */
function safeAddClass(elementId, ...classes) {
    const element = getSafeElement(elementId);
    if (element) {
        element.classList.add(...classes);
    }
}

/**
 * 安全にクラスを削除
 * @param {string} elementId - 要素のID
 * @param {...string} classes - 削除するクラス
 */
function safeRemoveClass(elementId, ...classes) {
    const element = getSafeElement(elementId);
    if (element) {
        element.classList.remove(...classes);
    }
}
