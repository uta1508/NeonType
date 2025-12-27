// 「ん」のあとのn入力を許容するためのフラグ
let allowExtraN = false;

// 入力候補ノードの初期化
function initPendingNode() {
    pendingNode = [];
    if (remainingKana.length === 0) return;

    const addPatterns = (kanaSub, consume, patternIndex = 0) => {
        const patterns = ROMAJI_MAP[kanaSub];
        if (patterns) {
            patterns.forEach((romaji, idx) => {
                // 最初の文字が x/l の場合のみ特殊扱い
                const isSpecial = romaji.length > 0 && (romaji[0] === 'x' || romaji[0] === 'l');

                // 「ん」の特殊処理
                if (kanaSub === 'ん') {
                    // 次の文字をチェック
                    const nextChar = remainingKana.length > 1 ? remainingKana[1] : null;

                    if (remainingKana.length === 1) {
                        // 単語の最後の「ん」は nn のみ
                        if (romaji === 'nn') {
                            pendingNode.push({
                                rem: romaji,
                                consume: consume,
                                originalLength: romaji.length,
                                isSpecial: isSpecial,
                                patternIndex: patternIndex + idx,
                                kana: kanaSub
                            });
                        }
                    } else if (nextChar === 'や' || nextChar === 'ゆ' || nextChar === 'よ') {
                        // 「ん」+や行は nn のみ（n だと「にゃ」「にゅ」「にょ」と誤認識される）
                        if (romaji === 'nn') {
                            pendingNode.push({
                                rem: romaji,
                                consume: consume,
                                originalLength: romaji.length,
                                isSpecial: isSpecial,
                                patternIndex: patternIndex + idx,
                                kana: kanaSub
                            });
                        }
                    } else {
                        // 途中の「ん」+その他の文字は n または nn
                        if (romaji === 'n' || romaji === 'nn') {
                            pendingNode.push({
                                rem: romaji,
                                consume: consume,
                                originalLength: romaji.length,
                                isSpecial: isSpecial,
                                patternIndex: patternIndex + idx,
                                kana: kanaSub
                            });
                        }
                    }
                } else {
                    // 通常の文字
                    pendingNode.push({
                        rem: romaji,
                        consume: consume,
                        originalLength: romaji.length,
                        isSpecial: isSpecial,
                        patternIndex: patternIndex + idx,
                        kana: kanaSub
                    });
                }
            });
        }
    };

    // 2文字マッチを優先
    let patternIndex = 0;
    if (remainingKana.length >= 2) {
        const char2 = remainingKana.substring(0, 2);
        addPatterns(char2, 2, patternIndex);
        if (ROMAJI_MAP[char2]) {
            patternIndex += ROMAJI_MAP[char2].length;
        }
    }

    // 1文字マッチ
    const char1 = remainingKana[0];
    addPatterns(char1, 1, patternIndex);

    // 特殊: 'っ' (促音)
    if (char1 === 'っ') {
        if (remainingKana.length >= 2) {
            const nextChar1 = remainingKana[1];
            const nextPatterns1 = ROMAJI_MAP[nextChar1];
            if (nextPatterns1) {
                nextPatterns1.forEach((p, idx) => {
                    const isSpecial = p.length > 0 && (p[0] === 'x' || p[0] === 'l');
                    pendingNode.push({
                        rem: p[0],
                        consume: 1,
                        originalLength: p.length,
                        isSpecial: isSpecial,
                        patternIndex: patternIndex + idx,
                        kana: 'っ'
                    });
                });
                patternIndex += nextPatterns1.length;
            }
            if (remainingKana.length >= 3) {
                const nextChar2 = remainingKana.substring(1, 3);
                const nextPatterns2 = ROMAJI_MAP[nextChar2];
                if (nextPatterns2) {
                    nextPatterns2.forEach((p, idx) => {
                        const isSpecial = p.length > 0 && (p[0] === 'x' || p[0] === 'l');
                        pendingNode.push({
                            rem: p[0],
                            consume: 1,
                            originalLength: p.length,
                            isSpecial: isSpecial,
                            patternIndex: patternIndex + idx,
                            kana: 'っ'
                        });
                    });
                }
            }
        }
    }
}

// 入力処理
function handleInput(e) {
    if (e.key === 'Escape') {
        allowExtraN = false;

        // オンライン対戦中はESCキー無効
        if (isOnlineBattle && (gameState === 'playing' || gameState === 'countdown')) {
            console.log('ESC disabled during online battle');
            return;
        }

        if (gameState === 'playing' || gameState === 'countdown') {
            // タイマーのクリーンアップ
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            // カウントダウンのクリーンアップ
            if (countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
            }
            // 待機画面に戻る
            prepareGame();
        } else if (gameState === 'ready') {
            // 待機中はタイトルに戻る
            showTitle();
        }
        return;
    }
    if (gameState === 'ready') {
        if (e.code === 'Space' || e.code === 'Enter') startCountdown();
        return;
    }
    if (gameState !== 'playing') return;
    if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;

    const inputKey = e.key.toLowerCase();
    totalKeystrokes++;
    let isCorrect = false;

    if (currentWord.isEnglish) {
        if (remainingKana.length > 0 && remainingKana[0] === inputKey) {
            isCorrect = true;
            remainingKana = remainingKana.substring(1);
            typedRomajiLog += inputKey;
        }
    } else {
        // 候補がない場合は初期化
        if (pendingNode.length === 0) {
            initPendingNode();
        }

        // 現在の候補から、入力キーで始まるものだけをフィルタリング
        let matchedNodes = [];
        for (const node of pendingNode) {
            if (node.rem.length > 0 && node.rem[0] === inputKey) {
                const newRem = node.rem.substring(1);
                matchedNodes.push({
                    rem: newRem,
                    consume: node.consume,
                    originalLength: node.originalLength,
                    isSpecial: node.isSpecial,
                    typedCount: (node.typedCount || 0) + 1,
                    patternIndex: node.patternIndex,
                    kana: node.kana
                });
            }
        }

        // マッチしなかったが、特例で許容される場合（「ん」確定後の追加入力 n）
        if (matchedNodes.length === 0 && allowExtraN && inputKey === 'n') {
            allowExtraN = false;
            typedRomajiLog += inputKey;
            correctKeystrokes++;
            combo++;
            if (combo > maxCombo) maxCombo = combo;
            const comboBonus = Math.floor(combo / 10) * 5;
            score += (10 + comboBonus);
            soundManager.playType();

            comboGauge++;

        // オンライン対戦中の場合、スコアをブロードキャスト
        if (typeof broadcastScoreUpdate === 'function') {
            broadcastScoreUpdate();
        }
            let reward = 0;
            if (comboGauge === COMBO_CHECKPOINTS[0]) reward = COMBO_REWARDS[0];
            else if (comboGauge === COMBO_CHECKPOINTS[1]) reward = COMBO_REWARDS[1];
            else if (comboGauge === COMBO_CHECKPOINTS[2]) reward = COMBO_REWARDS[2];
            else if (comboGauge === COMBO_CHECKPOINTS[3]) {
                reward = COMBO_REWARDS[3];
                comboGauge = 0;
            } else if (comboGauge > COMBO_CHECKPOINTS[3]) {
                comboGauge = 0;
            }
            if (reward > 0) {
                if (currentSettings.mode !== 'practice' && !isOnlineBattle) {
                    timeLeft += reward;
                    domCache.timeDisplay.textContent = timeLeft + 's';
                    showTimeBonus(reward);
                    soundManager.playBonus();
                }
            }
            updateComboGauge();
            updateWordDisplay();
            updateScoreDisplay();
            showFeedback(true);
            return;
        }

        // 通常マッチ時の処理
        if (matchedNodes.length > 0) {
            isCorrect = true;
            allowExtraN = false;
            typedRomajiLog += inputKey;

            // 完了した候補と未完了の候補を分離
            const completed = matchedNodes.filter(n => n.rem === '');
            const incomplete = matchedNodes.filter(n => n.rem !== '');

            if (completed.length > 0) {
                // いずれかの候補が完了した
                const bestMatch = completed.reduce((best, curr) =>
                    curr.consume > best.consume ? curr : best
                );

                remainingKana = remainingKana.substring(bestMatch.consume);
                pendingNode = [];

                if (remainingKana.length > 0) {
                    initPendingNode();
                }

                // 「ん」を n 1文字で確定させた場合、次の文字が n で始まらなければ追加入力 n を許容する
                if (bestMatch.kana === 'ん' && bestMatch.originalLength === 1) {
                    const nextStartsWithN = pendingNode.some(node => node.rem.startsWith('n'));
                    if (!nextStartsWithN) {
                        allowExtraN = true;
                    }
                }

            } else {
                // まだ完了していない
                const confirmed = incomplete.filter(n => n.typedCount >= 2);

                if (confirmed.length > 0) {
                    pendingNode = confirmed;
                } else {
                    pendingNode = incomplete;
                }
            }
        }
    }

    if (isCorrect) {
        correctKeystrokes++;
        combo++;
        if (combo > maxCombo) maxCombo = combo;
        const comboBonus = Math.floor(combo / 10) * 5;
        score += (10 + comboBonus);
        soundManager.playType();

        comboGauge++;
        let reward = 0;
        if (comboGauge === COMBO_CHECKPOINTS[0]) reward = COMBO_REWARDS[0];
        else if (comboGauge === COMBO_CHECKPOINTS[1]) reward = COMBO_REWARDS[1];
        else if (comboGauge === COMBO_CHECKPOINTS[2]) reward = COMBO_REWARDS[2];
        else if (comboGauge === COMBO_CHECKPOINTS[3]) {
            reward = COMBO_REWARDS[3];
            comboGauge = 0;
        } else if (comboGauge > COMBO_CHECKPOINTS[3]) {
            comboGauge = 0;
        }
        if (reward > 0) {
            if (currentSettings.mode !== 'practice' && !isOnlineBattle) {
                timeLeft += reward;
                domCache.timeDisplay.textContent = timeLeft + 's';
                showTimeBonus(reward);
                soundManager.playBonus();
            }
        }
        updateComboGauge();
        updateWordDisplay();
        updateScoreDisplay();
        showFeedback(true);

        // 単語完了チェック
        if (remainingKana.length === 0) {
            totalWordsTyped++;
            score += 50;
            updateScoreDisplay();
            domCache.wordJp.classList.add('scale-110', 'text-cyan-300');
            setTimeout(() => nextWord(), 100);
        }
    } else {
        combo = 0;
        comboGauge = 0;
        updateScoreDisplay();
        updateComboGauge(); // ゲージ更新をスコア表示の後に
        soundManager.playMiss();
        const container = document.querySelector('.bg-slate-800\\/50');
        if (container) {
            container.classList.remove('shake');
            void container.offsetWidth;
            container.classList.add('shake');
        }
        showFeedback(false);
        if (currentSettings.mode === 'sudden_death') {
            // オンライン対戦中の場合、ミスを通知
            if (isOnlineBattle && typeof onlineBattle !== 'undefined') {
                console.log('💥 [MISS] I missed! Broadcasting to opponent');
                onlineBattle.iMissed = true;
                if (onlineBattle.broadcastSuddenDeathMiss) {
                    // 先にブロードキャストしてから終了
                    onlineBattle.broadcastSuddenDeathMiss().then(() => {
                        setTimeout(() => endGame('GAME OVER'), 200);
                    }).catch(err => {
                        console.error('Failed to broadcast miss:', err);
                        setTimeout(() => endGame('GAME OVER'), 200);
                    });
                } else {
                    setTimeout(() => endGame('GAME OVER'), 200);
                }
            } else {
                setTimeout(() => endGame('GAME OVER'), 200);
            }
        }
    }
}

// 単語表示の更新
function updateWordDisplay() {
    const readingEl = domCache.wordReading;
    // ふりがな表示のロジック改善（長音記号を含む比較）
    const shouldShowFurigana = globalSettings.furigana &&
        currentWord.jp.replace(/ー/g, '') !== currentWord.kana.replace(/ー/g, '');

    if (shouldShowFurigana) {
        readingEl.textContent = currentWord.kana;
        readingEl.classList.remove('opacity-0');
    } else {
        readingEl.textContent = '';
        readingEl.classList.add('opacity-0');
    }
    domCache.wordJp.textContent = currentWord.jp;

    // 残りのローマ字表示を生成
    let displayRest = "";

    if (currentWord.isEnglish) {
        displayRest = remainingKana;
    } else {
        if (pendingNode.length > 0) {
            // 優先度を考慮して表示候補を選択
            const displayNode = selectBestDisplayNode(pendingNode);
            displayRest = displayNode.rem + getDisplayRomaji(remainingKana.substring(displayNode.consume));
        } else {
            displayRest = getDisplayRomaji(remainingKana);
        }
    }

    // 大文字変換（ローマ字のみ）
    let displayTyped = typedRomajiLog;
    if (globalSettings.uppercase) {
        displayTyped = displayTyped.toUpperCase();
        displayRest = displayRest.toUpperCase();
    }

    domCache.typedText.textContent = displayTyped;
    domCache.untypedText.textContent = displayRest;
}

// 最適な表示候補を選択
function selectBestDisplayNode(nodes) {
    return [...nodes].sort((a, b) => {
        // タイプ数が多い方を優先
        if ((a.typedCount || 0) !== (b.typedCount || 0))
            return (b.typedCount || 0) - (a.typedCount || 0);

        // 特殊文字(x/l)でない方を優先
        if (a.isSpecial !== b.isSpecial)
            return a.isSpecial ? 1 : -1;

        // パターンインデックスが小さい方を優先
        if (a.patternIndex !== b.patternIndex)
            return a.patternIndex - b.patternIndex;

        // 元の長さが短い方を優先
        if (a.originalLength !== b.originalLength)
            return a.originalLength - b.originalLength;

        // 残りが短い方を優先
        return a.rem.length - b.rem.length;
    })[0];
}

// 表示用ローマ字取得（優先ルートを固定表示）
function getDisplayRomaji(kanaText) {
    let result = "";
    let i = 0;

    while (i < kanaText.length) {
        let consumed = 0;
        let romaji = "";

        // 2文字の組み合わせを優先チェック
        if (i + 1 < kanaText.length) {
            const twoChar = kanaText.substring(i, i + 2);
            if (ROMAJI_MAP[twoChar]) {
                romaji = ROMAJI_MAP[twoChar][0];
                consumed = 2;
            }
        }

        // 2文字マッチがなければ1文字
        if (consumed === 0) {
            const oneChar = kanaText[i];

            // 特殊処理: 「っ」
            if (oneChar === 'っ' && i + 1 < kanaText.length) {
                const nextChar = kanaText[i + 1];
                const nextRomaji = getFirstConsonant(nextChar, kanaText.substring(i + 1));
                result += nextRomaji;
                consumed = 1;
            }
            // 特殊処理: 「ん」
            else if (oneChar === 'ん') {
                const nextChar = i + 1 < kanaText.length ? kanaText[i + 1] : null;

                if (i === kanaText.length - 1) {
                    romaji = 'nn';
                } else if (nextChar === 'や' || nextChar === 'ゆ' || nextChar === 'よ') {
                    romaji = 'nn';
                } else {
                    romaji = 'n';
                }
                consumed = 1;
            }
            // 通常の文字
            else if (ROMAJI_MAP[oneChar]) {
                romaji = ROMAJI_MAP[oneChar][0];
                consumed = 1;
            }
            // マッピングにない文字
            else {
                romaji = oneChar;
                consumed = 1;
            }
        }

        result += romaji;
        i += consumed;
    }

    return result;
}

// 最初の子音を取得（促音用）
function getFirstConsonant(kana, restKana) {
    // 2文字の組み合わせをチェック
    if (restKana.length >= 2) {
        const twoChar = restKana.substring(0, 2);
        if (ROMAJI_MAP[twoChar]) {
            return ROMAJI_MAP[twoChar][0][0];
        }
    }

    // 1文字
    if (ROMAJI_MAP[kana]) {
        return ROMAJI_MAP[kana][0][0];
    }

    return 'x';
}

// スコア表示の更新
function updateScoreDisplay() {
    domCache.scoreDisplay.textContent = score;
    domCache.comboDisplay.textContent = combo;
    if (combo > 0) {
        domCache.comboDisplay.classList.remove('scale-125', 'text-yellow-200');
        void domCache.comboDisplay.offsetWidth;
        domCache.comboDisplay.classList.add('scale-125', 'text-yellow-200');
        setTimeout(() => domCache.comboDisplay.classList.remove('scale-125', 'text-yellow-200'), 100);
    }
}

// フィードバック表示
function showFeedback(isCorrect) {
    if (!isCorrect) {
        document.body.style.backgroundColor = '#1f1212';
        setTimeout(() => document.body.style.backgroundColor = '#0f172a', 100);
    }
}
