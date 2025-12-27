// ========================================
// SeededRandom - 乱数シード同期用
// ========================================
class SeededRandom {
    constructor(seed) {
        this.x = 123456789;
        this.y = 362436069;
        this.z = 521288629;
        this.w = seed;
    }

    next() {
        let t = this.x ^ (this.x << 11);
        this.x = this.y;
        this.y = this.z;
        this.z = this.w;
        this.w = (this.w ^ (this.w >>> 19)) ^ (t ^ (t >>> 8));
        return (this.w >>> 0) / 4294967296;
    }
}

// ========================================
// Online Battle Manager
// ========================================
class OnlineBattleManager {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.currentRoom = null;
        this.channel = null;
        this.isHost = false;
        this.opponentScore = 0;
        this.roomCheckInterval = null;
        this.opponentMissed = false; // サドンデス用：相手がミスしたか
        this.iMissed = false; // サドンデス用：自分がミスしたか
        this.gameStarting = false; // ゲーム開始中フラグ（重複実行防止）
        this.opponentFinalScoreReceived = false; // 最終スコア受信フラグ
    }

    // Supabaseクライアントの初期化
    async init() {
        if (!window.supabase) {
            // CDN経由でSupabase SDKをロード
            await this.loadSupabaseSDK();
        }

        this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // 匿名ログイン
        await this.authenticateUser();
    }

    // Supabase SDK のロード
    async loadSupabaseSDK() {
        return new Promise((resolve, reject) => {
            if (window.supabase) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Supabase SDK'));
            document.head.appendChild(script);
        });
    }

    // ユーザー認証（匿名ログインの代わりに一時IDを使用）
    async authenticateUser() {
        // ローカルストレージから既存のユーザーIDを取得、なければ生成
        let userId = localStorage.getItem('temp_user_id');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('temp_user_id', userId);
        }

        this.currentUser = { id: userId };
    }

    // PINコード生成（6桁）
    generatePIN() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    // シード生成
    generateSeed() {
        return Math.floor(Math.random() * 2147483647);
    }

    // 部屋作成（HOST）
    async createRoom(gameMode, gameDifficulty, duration, isPublic = false) {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        const pin = this.generatePIN();
        const seed = this.generateSeed();
        const hostName = typeof getUsername === 'function' ? getUsername() : 'Host';

        const { data, error } = await this.supabase
            .from('match_rooms')
            .insert({
                pin: pin,
                is_public: isPublic,
                status: 'waiting',
                host_id: this.currentUser.id,
                host_name: hostName,
                game_mode: gameMode,
                game_difficulty: gameDifficulty,
                duration: duration,
                text_seed: seed,
                host_ready: false,
                guest_ready: false
            })
            .select()
            .single();

        if (error) {
            console.error('Room creation error:', error);
            throw error;
        }

        this.currentRoom = data;
        this.isHost = true;
        this.opponentScore = 0; // リセット
        this.opponentFinalScoreReceived = false; // リセット

        // Realtimeチャンネルのセットアップ
        await this.setupChannel(data.id);

        // 部屋の状態を監視
        this.startRoomMonitoring();

        return data;
    }

    // PINで部屋が存在するかチェック
    async checkRoomExists(pin) {
        try {
            const { data, error } = await this.supabase
                .from('match_rooms')
                .select('*')
                .eq('pin', pin)
                .eq('status', 'waiting')
                .single();

            if (error || !data) {
                return null;
            }

            return data;
        } catch (error) {
            console.error('Failed to check room existence:', error);
            return null;
        }
    }

    // PIN入力で部屋に参加
    async joinRoomByPIN(pin) {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        // PINで部屋を検索
        const { data, error } = await this.supabase
            .from('match_rooms')
            .select('*')
            .eq('pin', pin)
            .eq('status', 'waiting')
            .is('guest_id', null)
            .single();

        if (error || !data) {
            throw new Error('部屋が見つかりません');
        }

        // ゲストとして参加
        const guestName = typeof getUsername === 'function' ? getUsername() : 'Guest';

        const { data: updatedRoom, error: updateError } = await this.supabase
            .from('match_rooms')
            .update({
                guest_id: this.currentUser.id,
                guest_name: guestName
            })
            .eq('id', data.id)
            .select()
            .single();

        if (updateError) {
            console.error('Join room error:', updateError);
            throw updateError;
        }

        this.currentRoom = updatedRoom;
        this.isHost = false;
        this.opponentScore = 0; // リセット
        this.opponentFinalScoreReceived = false; // リセット

        // Realtimeチャンネルのセットアップ
        await this.setupChannel(updatedRoom.id);

        // 部屋の状態を監視
        this.startRoomMonitoring();

        return updatedRoom;
    }

    // ランダムマッチ
    async joinRandomRoom() {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        // Public かつ Waiting 状態の部屋を検索
        const { data, error } = await this.supabase
            .from('match_rooms')
            .select('*')
            .eq('is_public', true)
            .eq('status', 'waiting')
            .is('guest_id', null)
            .limit(1)
            .single();

        if (error || !data) {
            throw new Error('参加可能な部屋が見つかりません');
        }

        // 部屋に参加
        return await this.joinRoomByPIN(data.pin);
    }

    // Realtimeチャンネルのセットアップ
    async setupChannel(roomId) {
        const channelName = `room:${roomId}`; // より明確な命名

        // 既存のチャンネルがあれば削除
        if (this.channel) {
            await this.channel.unsubscribe();
            this.channel = null;
        }

        console.log('Setting up channel:', channelName);

        // チャンネルを作成（broadcast設定を明示的に有効化）
        this.channel = this.supabase.channel(channelName, {
            config: {
                broadcast: { self: true } // デバッグのため自分の送信も受信（ローカルで別途処理）
            }
        });

        // スコア更新イベント
        this.channel.on('broadcast', { event: 'score_update' }, (payload) => {
            // 自分の送信は無視
            if (payload.payload.userId === this.currentUser.id) return;

            this.opponentScore = payload.payload.score;
            this.updateOpponentScoreDisplay();
        });

        // 最終スコア受信イベント（ゲーム終了時）
        this.channel.on('broadcast', { event: 'final_score' }, (payload) => {
            // 自分の送信は無視
            if (payload.payload.userId === this.currentUser.id) return;

            console.log('📥 Received opponent final score:', payload.payload.score);
            this.opponentScore = payload.payload.score;
            this.opponentFinalScoreReceived = true;
            this.updateOpponentScoreDisplay();
        });

        // ゲーム終了イベント（後方互換性のため残す）
        this.channel.on('broadcast', { event: 'game_over' }, (payload) => {
            this.handleOpponentGameOver(payload.payload.finalScore);
        });

        // 一発勝負モードのミスイベント
        this.channel.on('broadcast', { event: 'sudden_death_miss' }, (payload) => {
            this.handleOpponentMiss();
        });

        // Emoji イベント
        this.channel.on('broadcast', { event: 'emoji' }, (payload) => {
            this.showEmoji(payload.payload.type);
        });

        // ゲーム開始同期イベント（GUEST用）
        this.channel.on('broadcast', { event: 'game_start' }, (payload) => {
            // GUEST側はこのイベントでゲーム開始
            if (!this.isHost && !this.gameStarting) {
                console.log('🎮 Guest received game_start signal');
                this.startOnlineGame();
            }
        });

        // 切断検知イベント
        this.channel.on('presence', { event: 'leave' }, (payload) => {
            console.log('Opponent left:', payload);
            this.handleOpponentDisconnect();
        });

        // Presenceトラッキングを有効化
        this.channel.on('presence', { event: 'sync' }, () => {
            const state = this.channel.presenceState();
            console.log('Presence state:', state);
        });

        // サブスクライブして完了を待つ
        return new Promise((resolve, reject) => {
            this.channel.subscribe(async (status) => {
                console.log('Channel subscribe status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Successfully subscribed to channel:', channelName);
                    // Presenceに自分を登録
                    await this.channel.track({
                        user_id: this.currentUser.id,
                        online_at: new Date().toISOString()
                    });
                    resolve();
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ Channel subscription error');
                    reject(new Error('Channel subscription failed'));
                } else if (status === 'TIMED_OUT') {
                    console.error('❌ Channel subscription timed out');
                    reject(new Error('Channel subscription timed out'));
                }
            });
        });
    }

    // 部屋の状態を監視（Realtimeを使用）
    async startRoomMonitoring() {
        if (!this.currentRoom) return;

        // 既存のポーリングをクリア
        if (this.roomCheckInterval) {
            clearInterval(this.roomCheckInterval);
            this.roomCheckInterval = null;
        }

        // Realtimeサブスクリプションを追加
        const roomChannel = this.supabase
            .channel(`room_updates:${this.currentRoom.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'match_rooms',
                    filter: `id=eq.${this.currentRoom.id}`
                },
                (payload) => this.handleRoomUpdate(payload.new)
            )
            .subscribe();

        // ロビー中は頻繁にポーリング（1秒ごと）
        this.roomCheckInterval = setInterval(async () => {
            if (!this.currentRoom) return;

            const { data, error } = await this.supabase
                .from('match_rooms')
                .select('*')
                .eq('id', this.currentRoom.id)
                .single();

            if (error) {
                // 部屋が削除された場合（HOSTが退出）
                if (error.code === 'PGRST116') {
                    this.handleHostLeft();
                }
                return;
            }

            if (!data) return;
            this.handleRoomUpdate(data);
        }, 1000); // 1秒ごとにポーリング（ロビー中のみ）
    }

    // 部屋更新ハンドラ（Realtimeとポーリングで共用）
    handleRoomUpdate(data) {
        if (!this.currentRoom) return;

        const oldRoom = this.currentRoom;
        this.currentRoom = data;

        // HOSTが変更された場合（自分がGUESTからHOSTに昇格）
        if (!this.isHost && data.host_id === this.currentUser.id) {
            this.promoteToHost();
        }

        // ゲスト参加を検知（Hostのみ）
        if (this.isHost && !oldRoom.guest_id && data.guest_id) {
            this.onGuestJoined();
        }

        // ゲスト退出を検知（Hostのみ）
        if (this.isHost && oldRoom.guest_id && !data.guest_id) {
            this.onGuestLeft();
            // HOSTのReady状態を解除
            if (data.host_ready) {
                this.toggleReady();
            }
        }

        // Ready状態の変化を検知
        if (oldRoom.host_ready !== data.host_ready || oldRoom.guest_ready !== data.guest_ready) {
            this.updateReadyStatus();
        }

        // 両者がReadyになったらゲーム開始
        if (data.host_ready && data.guest_ready && data.status === 'waiting') {
            this.startOnlineGame();
            return;
        }

        // ステータス変更を検知
        if (oldRoom.status !== data.status) {
            this.handleStatusChange(data.status);
        }
    }

    // ゲスト参加時の処理
    onGuestJoined() {
        console.log('Guest joined the room!');
        if (typeof updateLobbyUI === 'function') {
            updateLobbyUI();
        }
    }

    // ゲスト退出時の処理
    onGuestLeft() {
        console.log('Guest left the room!');
        if (typeof updateLobbyUI === 'function') {
            updateLobbyUI();
        }
    }

    // HOSTが退出した場合の処理
    handleHostLeft() {
        console.log('⚠️ Host left the room!');

        // 部屋が削除されたのでGUESTがHOSTに昇格
        if (!this.isHost && this.currentRoom) {
            this.promoteToHost();
        } else {
            // 既にHOSTの場合は何もしない
            console.log('Already host or no room');
        }
    }

    // GUESTをHOSTに昇格
    async promoteToHost() {
        console.log('🎖️ Promoting to HOST!');

        if (!this.currentRoom) return;

        // 通知を表示
        if (typeof showNotification === 'function') {
            showNotification('ホストが退出しました。あなたが新しいホストになりました。', 'warning');
        }

        // 古いPINを保持
        const oldPin = this.currentRoom.pin;

        // 新しい部屋を作成（同じ設定とPINで）
        try {
            const pin = oldPin; // 同じPINを使用
            const seed = this.generateSeed();
            const hostName = typeof getUsername === 'function' ? getUsername() : 'Host';

            const { data, error } = await this.supabase
                .from('match_rooms')
                .insert({
                    pin: pin,
                    is_public: this.currentRoom.is_public,
                    status: 'waiting',
                    host_id: this.currentUser.id,
                    host_name: hostName,
                    game_mode: this.currentRoom.game_mode,
                    game_difficulty: this.currentRoom.game_difficulty,
                    duration: this.currentRoom.duration,
                    text_seed: seed,
                    host_ready: false,
                    guest_ready: false
                })
                .select()
                .single();

            if (error) {
                console.error('Room creation error:', error);
                throw error;
            }

            this.currentRoom = data;
            this.isHost = true;
            this.opponentScore = 0;

            // Realtimeチャンネルのセットアップ
            await this.setupChannel(data.id);

            // 部屋の状態を監視
            this.startRoomMonitoring();

            console.log('✅ Created new room as host with same PIN:', data);

            // UIを更新
            if (typeof updateLobbyUI === 'function') {
                updateLobbyUI();
            }
        } catch (error) {
            console.error('Failed to promote to host:', error);
            // エラーの場合はロビーから退出
            if (typeof leaveLobby === 'function') {
                leaveLobby();
            }
        }
    }

    // Ready状態更新
    updateReadyStatus() {
        if (typeof updateLobbyUI === 'function') {
            updateLobbyUI();
        }
    }

    // Readyボタンを押す（トグル対応）
    async toggleReady() {
        if (!this.currentRoom) return;

        const updateField = this.isHost ? 'host_ready' : 'guest_ready';
        const currentReady = this.isHost ? this.currentRoom.host_ready : this.currentRoom.guest_ready;

        const { error } = await this.supabase
            .from('match_rooms')
            .update({ [updateField]: !currentReady })
            .eq('id', this.currentRoom.id);

        if (error) {
            console.error('Toggle ready error:', error);
        }
    }

    // オンラインゲーム開始
    async startOnlineGame() {
        // 重複実行防止
        if (this.gameStarting) {
            console.log('⚠️ Game already starting, ignoring duplicate call');
            return;
        }
        this.gameStarting = true;

        console.log('🎮 Host initiating game start');

        // UIに「ゲームを開始します...」と表示
        if (typeof showStartingGameMessage === 'function') {
            showStartingGameMessage();
        }

        // 0.3秒待機（短縮）
        await new Promise(resolve => setTimeout(resolve, 300));

        // ステータスを playing に変更（Host のみ）
        if (this.isHost) {
            const { error } = await this.supabase
                .from('match_rooms')
                .update({ status: 'playing' })
                .eq('id', this.currentRoom.id);

            if (error) {
                console.error('Failed to update room status:', error);
            }

            // Broadcastでゲーム開始を通知（同期開始のため）
            await this.channel.send({
                type: 'broadcast',
                event: 'game_start',
                payload: { timestamp: Date.now() }
            });
        }

        // 監視を停止
        if (this.roomCheckInterval) {
            clearInterval(this.roomCheckInterval);
            this.roomCheckInterval = null;
        }

        // 300ms待ってからゲーム画面へ遷移（同期のため）
        await new Promise(resolve => setTimeout(resolve, 300));

        // ゲーム画面へ遷移
        if (typeof startOnlineBattle === 'function') {
            console.log('🎮 Starting online battle');
            startOnlineBattle(this.currentRoom);
        }
    }

    // ステータス変更時の処理（使用しないが互換性のため残す）
    handleStatusChange(newStatus) {
        console.log('Room status changed:', newStatus);
        // Broadcast経由で同期するため、ここでは何もしない
    }

    // スコア送信
    async broadcastScore(score) {
        if (!this.channel) return;

        try {
            await this.channel.send({
                type: 'broadcast',
                event: 'score_update',
                payload: {
                    score,
                    userId: this.currentUser.id // 自分のIDを含める
                }
            });
        } catch (error) {
            console.error('Broadcast error:', error);
        }
    }

    // 最終スコア送信（ゲーム終了時）
    async broadcastFinalScore(finalScore) {
        if (!this.channel) return;

        console.log('📤 Broadcasting final score:', finalScore);

        await this.channel.send({
            type: 'broadcast',
            event: 'final_score',
            payload: {
                score: finalScore,
                userId: this.currentUser.id
            }
        });
    }

    // ゲーム終了通知（後方互換性のため残す）
    async broadcastGameOver(finalScore) {
        if (!this.channel) return;
        await this.channel.send({
            type: 'broadcast',
            event: 'game_over',
            payload: { finalScore }
        });
    }

    // 一発勝負モードのミス通知
    async broadcastSuddenDeathMiss() {
        if (!this.channel) return;
        console.log('💥 Broadcasting sudden death miss');
        await this.channel.send({
            type: 'broadcast',
            event: 'sudden_death_miss',
            payload: {}
        });
    }

    // Emoji送信
    async sendEmoji(type) {
        if (!this.channel) return;
        await this.channel.send({
            type: 'broadcast',
            event: 'emoji',
            payload: { type }
        });
    }

    // 対戦相手のスコア表示更新
    updateOpponentScoreDisplay() {
        const el = document.getElementById('opponent-score-display');
        if (el) {
            el.textContent = this.opponentScore;
        }
    }

    // 対戦相手のゲーム終了処理
    handleOpponentGameOver(finalScore) {
        // 必要に応じて処理を追加
    }

    // 対戦相手のミス処理（一発勝負モード）
    handleOpponentMiss() {
        console.log('💥 Opponent missed in sudden death mode!');
        this.opponentMissed = true;
        // game.jsのendGameを呼び出して強制終了
        if (typeof endGame === 'function') {
            endGame('FINISH');
        }
    }

    // 対戦相手が切断した場合の処理
    handleOpponentDisconnect() {
        console.log('⚠️ Opponent disconnected!');

        // ロビー中の切断
        if (this.currentRoom && this.currentRoom.status === 'waiting') {
            alert('対戦相手が退出しました。');
            leaveLobby();
        }

        // 対戦中の切断
        if (this.currentRoom && this.currentRoom.status === 'playing') {
            if (typeof endGame === 'function') {
                // 相手が切断した場合、自分の勝利として終了
                setTimeout(() => {
                    endGame('FINISH');
                    alert('対戦相手が切断しました。');
                }, 500);
            }
        }
    }

    // Emoji表示
    showEmoji(type) {
        const container = document.getElementById('emoji-display-container');
        if (!container) return;

        const emojiMap = {
            'fire': '🔥',
            'heart': '❤️',
            'clap': '👏',
            'laugh': '😂',
            'cool': '😎'
        };

        const emoji = document.createElement('div');
        emoji.textContent = emojiMap[type] || '👍';
        emoji.className = 'emoji-anim text-6xl absolute';
        emoji.style.left = '50%';
        emoji.style.top = '50%';
        container.appendChild(emoji);

        setTimeout(() => {
            if (emoji.parentNode) emoji.parentNode.removeChild(emoji);
        }, 2000);
    }

    // 部屋から退出
    async leaveRoom() {
        if (this.roomCheckInterval) {
            clearInterval(this.roomCheckInterval);
            this.roomCheckInterval = null;
        }

        if (this.channel) {
            await this.channel.unsubscribe();
            this.channel = null;
        }

        // 部屋の削除処理：人がいなくなった時点で削除
        if (this.currentRoom) {
            // ゲストがロビー中に退出：ゲスト情報をクリア
            if (!this.isHost && this.currentRoom.status === 'waiting') {
                await this.supabase
                    .from('match_rooms')
                    .update({
                        guest_id: null,
                        guest_name: null,
                        guest_ready: false
                    })
                    .eq('id', this.currentRoom.id);
            }
            // HOSTが退出：部屋を削除
            else if (this.isHost) {
                await this.supabase
                    .from('match_rooms')
                    .delete()
                    .eq('id', this.currentRoom.id);
                console.log('🗑️ Room deleted by host leaving');
            }
            // 対戦中に退出：部屋を削除
            else if (this.currentRoom.status === 'playing') {
                await this.supabase
                    .from('match_rooms')
                    .delete()
                    .eq('id', this.currentRoom.id);
                console.log('🗑️ Room deleted due to player leaving during match');
            }
        }

        this.currentRoom = null;
        this.isHost = false;
        this.opponentScore = 0;
        this.opponentMissed = false;
        this.iMissed = false;
        this.gameStarting = false; // フラグをリセット
        this.opponentFinalScoreReceived = false; // 最終スコア受信フラグをリセット
    }

    // 最終結果を保存
    async saveResult(myScore) {
        if (!this.currentRoom) return;

        // 不正対策：KPSチェックを含むスコア検証
        const validationResult = this.validateScore(myScore);

        // 不正なスコアの場合は0にする
        const finalScore = validationResult.isValid ? myScore : 0;

        if (!validationResult.isValid) {
            console.warn('⚠️ Invalid score detected:', validationResult.reason);
        }

        const updateData = this.isHost
            ? { host_score: finalScore }
            : { guest_score: finalScore };

        await this.supabase
            .from('match_rooms')
            .update(updateData)
            .eq('id', this.currentRoom.id);

        // 両者のスコアが揃ったら勝者を判定（Hostのみ）
        if (this.isHost) {
            // 少し待ってから勝者判定（Guestのスコアが保存されるのを待つ）
            setTimeout(() => {
                this.determineWinner();
            }, 2000);
        }
    }

    // スコア検証（不正対策）
    validateScore(score) {
        if (!this.currentRoom) {
            return { isValid: false, reason: 'No active room' };
        }

        // KPSに基づく最大スコアの計算
        // 1キー = 10点 + コンボボーナス
        // 人間の最大KPSは約8-10（世界トップレベルのタイピストで12程度）
        const maxKPS = 10;
        const duration = this.currentRoom.duration;
        const maxPossibleKeys = maxKPS * duration;

        // コンボボーナスも考慮（10コンボごとに+5点）
        // 最大コンボを想定: maxPossibleKeys
        const maxComboBonus = Math.floor(maxPossibleKeys / 10) * 5;
        const maxScorePerKey = 10 + maxComboBonus / maxPossibleKeys;
        const maxPossibleScore = Math.ceil(maxPossibleKeys * maxScorePerKey * 1.2); // 20%の余裕

        // スコアが物理的に不可能な場合
        if (score > maxPossibleScore) {
            return {
                isValid: false,
                reason: `Score ${score} exceeds maximum possible score ${maxPossibleScore} (max KPS: ${maxKPS}, duration: ${duration}s)`
            };
        }

        // 負のスコア
        if (score < 0) {
            return {
                isValid: false,
                reason: 'Negative score'
            };
        }

        // スコアが0なのに対戦していた場合も不正の可能性
        if (score === 0 && duration > 0) {
            console.warn('Score is 0 despite battle duration');
        }

        return { isValid: true };
    }

    // 勝者判定
    async determineWinner() {
        if (!this.currentRoom) return;

        const { data } = await this.supabase
            .from('match_rooms')
            .select('*')
            .eq('id', this.currentRoom.id)
            .single();

        if (!data || data.host_score === null || data.guest_score === null) return;

        const winnerId = data.host_score > data.guest_score
            ? data.host_id
            : data.guest_id;

        await this.supabase
            .from('match_rooms')
            .update({
                status: 'finished',
                winner_id: winnerId
            })
            .eq('id', this.currentRoom.id);

        console.log('Winner determined:', winnerId);
    }
}

// グローバルインスタンス
const onlineBattle = new OnlineBattleManager();