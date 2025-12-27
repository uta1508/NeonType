// ========================================
// Notification System (Toast)
// ========================================

const NotificationManager = {
    container: null,
    queue: [],
    isInitialized: false,

    init() {
        if (this.isInitialized) return;
        
        // 通知コンテナを作成
        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2';
        document.body.appendChild(this.container);
        
        this.isInitialized = true;
    },

    show(message, type = 'info', duration = 3000) {
        this.init();
        
        const notification = this.createNotification(message, type);
        this.container.appendChild(notification);
        
        // フェードイン
        setTimeout(() => {
            notification.classList.add('notification-show');
        }, 10);
        
        // 自動削除
        setTimeout(() => {
            this.remove(notification);
        }, duration);
        
        return notification;
    },

    createNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = 'notification max-w-sm p-4 rounded-lg shadow-lg border-2 notification-enter';
        
        // タイプ別のスタイル
        const styles = {
            success: 'bg-green-900/90 border-green-500 text-green-100',
            error: 'bg-red-900/90 border-red-500 text-red-100',
            warning: 'bg-yellow-900/90 border-yellow-500 text-yellow-100',
            info: 'bg-slate-800/90 border-cyan-500 text-cyan-100'
        };
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        notification.classList.add(...styles[type].split(' '));
        
        notification.innerHTML = `
            <div class="flex items-center gap-3">
                <i class="fas ${icons[type]} text-xl"></i>
                <p class="flex-1 font-medium">${this.escapeHtml(message)}</p>
                <button class="notification-close hover:opacity-70 transition-opacity">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // 閉じるボタン
        notification.querySelector('.notification-close').addEventListener('click', () => {
            this.remove(notification);
        });
        
        return notification;
    },

    remove(notification) {
        notification.classList.remove('notification-show');
        notification.classList.add('notification-exit');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // ショートカット
    success(message, duration) {
        return this.show(message, 'success', duration);
    },

    error(message, duration) {
        return this.show(message, 'error', duration);
    },

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    },

    info(message, duration) {
        return this.show(message, 'info', duration);
    }
};

// グローバルショートカット
function showNotification(message, type = 'info', duration = 3000) {
    return NotificationManager.show(message, type, duration);
}
