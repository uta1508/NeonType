// Supabase 設定
// Anon Keyは公開前提の設計なので、ここに直接書いてOK
const SUPABASE_URL = "https://tfjyyagzxtigopnelfdz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmanl5YWd6eHRpZ29wbmVsZmR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1NTgyMjYsImV4cCI6MjA4MjEzNDIyNn0.yBHd07aouCRPu49epeQvUuCIQlSZYpAHUXGf2FhK23s";

// Supabaseクライアントの初期化チェック
function isSupabaseConfigured() {
    return SUPABASE_URL !== "YOUR_SUPABASE_URL" &&
        SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY" &&
        SUPABASE_URL &&
        SUPABASE_ANON_KEY;
}

// データバリデーション関数
function validateScoreData(data) {
    const errors = [];

    // 名前のチェック
    if (!data.user_name || typeof data.user_name !== 'string') {
        errors.push("名前が無効です");
    } else if (data.user_name.length > 10) {
        errors.push("名前は10文字以内で設定してください");
    }

    // スコアのチェック
    if (typeof data.score !== 'number' || data.score < 0 || data.score > 1000000) {
        errors.push("スコアの値が不正です");
    }

    // KPMのチェック
    if (data.kpm > 1200) { // KPS 20相当 (プロゲーマーレベル以上)
        errors.push("異常な入力速度が検出されました");
    }

    // モードと難易度のチェック（許可リスト）
    const validModes = ['normal', 'practice', 'survival']; // 必要に応じて追加
    const validDiffs = ['easy', 'normal', 'hard', 'lunatic']; // 必要に応じて追加

    if (!validModes.includes(data.mode)) {
        errors.push(`無効なモードです: ${data.mode}`);
    }
    if (!validDiffs.includes(data.difficulty)) {
        errors.push(`無効な難易度です: ${data.difficulty}`);
    }

    return errors;
}

// スコア送信
async function submitScore(userName, score, kpm, mode, diff) {
    if (!isSupabaseConfigured()) {
        console.warn('Supabase is not configured. Score not submitted.');
        return { success: false, error: 'Configuration missing' };
    }

    const url = `${SUPABASE_URL}/rest/v1/rankings`;

    // データベースのカラム名(スネークケース)に合わせてデータを構築
    const payload = {
        user_name: userName, // DBカラム: user_name
        score: score,        // DBカラム: score
        kpm: kpm,            // DBカラム: kpm
        mode: mode,          // DBカラム: mode
        difficulty: diff     // DBカラム: difficulty
    };

    // 送信前にバリデーションを実行
    const validationErrors = validateScoreData(payload);
    if (validationErrors.length > 0) {
        console.error("Validation failed:", validationErrors);
        return { success: false, error: validationErrors.join(', ') };
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Prefer': 'return=minimal' // レスポンスを最小限にする設定
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            const errorMsg = errorData.message || errorData.hint || 'Unknown error';
            console.error(`Failed to submit score: HTTP ${response.status}`, errorData);

            // 具体的なエラーコードに応じたメッセージ
            if (errorData.code === 'PGRST204') {
                throw new Error(`DBカラムが見つかりません: ${errorMsg}`);
            }
            if (errorData.code === '23514') { // Check Constraint Violation
                throw new Error(`データの値が制限範囲外です (不正なスコア等)`);
            }
            throw new Error(`HTTP ${response.status}: ${errorMsg}`);
        }

        console.log('Score submitted successfully');
        return { success: true };
    } catch (e) {
        console.error("Score submit error:", e);
        return { success: false, error: e.message };
    }
}

// ランキングデータ取得
async function fetchRankingData(mode, diff) {
    if (!isSupabaseConfigured()) {
        console.warn('Supabase is not configured');
        return [];
    }

    // クエリパラメータの構築
    // mode と difficulty でフィルタリングし、score の降順でソート、上位10件を取得
    const params = new URLSearchParams({
        mode: `eq.${mode}`,
        difficulty: `eq.${diff}`,
        order: 'score.desc',
        limit: '10'
    });

    const url = `${SUPABASE_URL}/rest/v1/rankings?${params.toString()}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        if (!response.ok) {
            console.warn(`Failed to fetch ranking: HTTP ${response.status}`);
            return [];
        }

        const data = await response.json();

        // データベースのカラム名(user_nameなど)をアプリ内で使いやすい形式(userNameなど)に変換して返す
        return data.map(entry => ({
            userName: entry.user_name || 'No Name',
            score: entry.score || 0,
            kpm: entry.kpm || 0,
            mode: entry.mode,
            difficulty: entry.difficulty,
            timestamp: entry.created_at ? new Date(entry.created_at).toLocaleString() : ''
        }));

    } catch (e) {
        console.error("Fetch ranking error:", e);
        return [];
    }
}
