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
    if (typeof data.score !== 'number' || data.score < 0) {
        errors.push("スコアが無効です");
    }

    return errors;
}

// スコア送信
async function submitScore(userName, score, kpm, mode, diff) {
    if (!isSupabaseConfigured()) {
        console.warn('Supabase is not configured');
        return { success: false, error: 'Configuration missing' };
    }

    const payload = {
        user_name: userName,
        score: score,
        kpm: kpm,
        mode: mode,
        difficulty: diff,
        created_at: new Date().toISOString()
    };

    const errors = validateScoreData(payload);
    if (errors.length > 0) {
        console.error('Validation errors:', errors);
        return { success: false, error: errors.join(', ') };
    }

    const url = `${SUPABASE_URL}/rest/v1/rankings`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        return { success: true };
    } catch (e) {
        console.error('Score submit error:', e);
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

        return data.map(entry => ({
            userName: entry.user_name || 'No Name',
            score: entry.score || 0,
            kpm: entry.kpm || 0,
            mode: entry.mode,
            difficulty: entry.difficulty,
            timestamp: entry.created_at
        }));
    } catch (e) {
        console.error('Fetch ranking error:', e);
        return [];
    }
}

// 単語データ取得（新規追加）
async function fetchWordsFromSupabase() {
    if (!isSupabaseConfigured()) return null;

    const url = `${SUPABASE_URL}/rest/v1/words?select=*`;

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
            console.warn('Failed to fetch words from Supabase');
            return null;
        }

        const data = await response.json();

        // アプリケーションの形式に変換 (DBのカラム名 -> アプリのプロパティ名)
        return data.map(item => ({
            jp: item.jp,
            kana: item.kana,
            isEnglish: item.is_english
        }));

    } catch (e) {
        console.error('Error fetching words:', e);
        return null;
    }
}