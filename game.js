function buildProgressRing(percent) {
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;
    return `
        <div class="chapter-progress">
            <svg viewBox="0 0 44 44">
                <circle class="progress-track" cx="22" cy="22" r="${radius}" stroke-width="4" fill="none"/>
                <circle class="progress-value" cx="22" cy="22" r="${radius}" stroke-width="4" fill="none"
                        stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>
            </svg>
            <span class="progress-text-sm">${Math.round(percent)}%</span>
        </div>
    `;
}

function getSolvedInChapter(chapterNum) {
    const chapterStart = (chapterNum - 1) * LEVELS_PER_CHAPTER;
    let count = 0;
    for (let i = chapterStart; i < chapterStart + LEVELS_PER_CHAPTER; i++) {
        if (solvedLevels[i]) count++;
    }
    return count;
}

function isChapterUnlocked(chapterNum) {
    if (chapterNum === 1) return true;
    const prevChapterStart = (chapterNum - 2) * LEVELS_PER_CHAPTER;
    for (let i = prevChapterStart; i < prevChapterStart + LEVELS_PER_CHAPTER; i++) {
        if (!solvedLevels[i]) return false;
    }
    return true;
}

function renderChapters() {
    const chaptersGrid = document.getElementById('chapters-grid');
    if (!chaptersGrid) return;
    let html = '';
    for (let i = 1; i <= TOTAL_CHAPTERS; i++) {
        const isUnlocked = isChapterUnlocked(i);
        const solvedInChapter = getSolvedInChapter(i);
        const percent = (solvedInChapter / LEVELS_PER_CHAPTER) * 100;
        let stageText = "";
        if (i === 1) stageText = "مرحله ۱ تا ۱۵";
        else if (i === 2) stageText = "مرحله ۱۶ تا ۳۰";
        else if (i === 3) stageText = "مرحله ۳۱ تا ۴۵";
        else if (i === 4) stageText = "مرحله ۴۶ تا ۶۰";
        else if (i === 5) stageText = "مرحله ۶۱ تا ۷۵";
        else if (i === 6) stageText = "مرحله ۷۶ تا ۹۰";
        else if (i === 7) stageText = "مرحله ۹۱ تا ۱۰۵";
        else if (i === 8) stageText = "مرحله ۱۰۶ تا ۱۲۰";
        else if (i === 9) stageText = "مرحله ۱۲۱ تا ۱۳۵";
        if (isUnlocked) {
            html += `<div class="chapter-card" onclick="openChapter(${i})"><h3>فصل ${i}</h3><p>${stageText}</p>${buildProgressRing(percent)}</div>`;
        } else {
            html += `<div class="chapter-card locked"><h3>فصل ${i}</h3><p>${stageText}</p><span class="lock-icon">${ICONS.lock}</span></div>`;
        }
    }
    chaptersGrid.innerHTML = html;
}

function openChapter(chapterNum) {
    currentChapter = chapterNum;
    const title = document.getElementById('level-header-title');
    if (title) title.innerText = `فصل ${chapterNum}`;
    saveProgress();
    showScreen('levels-screen');
}

function renderLevels() {
    const levelsGrid = document.getElementById('levels-grid');
    if (!levelsGrid) return;
    levelsGrid.innerHTML = '';
    const chapterStart = (currentChapter - 1) * LEVELS_PER_CHAPTER + 1;
    const chapterEnd = currentChapter * LEVELS_PER_CHAPTER;
    for (let i = chapterStart; i <= chapterEnd; i++) {
        const levelDiv = document.createElement('div');
        levelDiv.className = 'level-card';
        if (i > unlockedLevels) {
            levelDiv.classList.add('locked');
            levelDiv.innerHTML = `<span>${i}</span><span class="lock-icon">${ICONS.lock}</span>`;
        } else {
            if (solvedLevels[i - 1]) {
                levelDiv.classList.add('completed');
                levelDiv.innerHTML = `<span>${i}</span><span class="level-completed-icon">${ICONS.check}</span>`;
            } else {
                levelDiv.classList.add('active-level');
                levelDiv.innerHTML = `<span>${i}</span>`;
            }
            levelDiv.onclick = () => startLevel(i - 1);
        }
        levelsGrid.appendChild(levelDiv);
    }
    const solvedInChapter = getSolvedInChapter(currentChapter);
    const progress = (solvedInChapter / LEVELS_PER_CHAPTER) * 100;
    const fill = document.getElementById('progress-fill');
    if (fill) fill.style.width = `${progress}%`;
    const ptext = document.getElementById('progress-text');
    if (ptext) ptext.innerText = `${solvedInChapter} از ${LEVELS_PER_CHAPTER} مرحله حل شده`;
}

function startLevel(index) {
    currentLevelIndex = index;
    removeHintUses = 0;
    const levelData = gameData[index];
    if (!levelData) return;
    const gameLevel = document.getElementById('game-level');
    if (gameLevel) gameLevel.innerText = `مرحله ${index + 1}`;
    const gameChapter = document.getElementById('game-chapter');
    if (gameChapter) gameChapter.innerText = `فصل ${Math.ceil((index + 1) / LEVELS_PER_CHAPTER)}`;
    const emojiContainer = document.getElementById('emoji-question');
    if (emojiContainer) emojiContainer.innerHTML = levelData.emojis.map(e => `<span>${e}</span>`).join('');
    currentWord = levelData.letters;
    currentGuess = new Array(currentWord.length).fill('');
    renderSlots();
    renderKeyboard();
    updateCoinsUI();
    saveProgress();
    showScreen('game-screen');
}

function renderSlots() {
    const slotsContainer = document.getElementById('answer-slots');
    if (!slotsContainer) return;
    slotsContainer.innerHTML = '';
    let row = document.createElement('div');
    row.className = 'word-row';
    currentWord.forEach((char, index) => {
        if (char === ' ') {
            slotsContainer.appendChild(row);
            row = document.createElement('div');
            row.className = 'word-row';
        } else {
            const slot = document.createElement('div');
            slot.className = 'slot';
            slot.innerText = currentGuess[index];
            slot.onclick = () => removeLetter(index);
            row.appendChild(slot);
        }
    });
    slotsContainer.appendChild(row);
}

function getAvailableLetters(wordArr) {
    let letters = wordArr.filter(c => c !== ' ');
    const extraPool = ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ح', 'ژ', 'چ', 'پ', 'گ', 'ک', 'م', 'ط', 'ظ', 'ذ', 'ز', 'ی', 'س', 'ش', 'ل', 'ت', 'ب'];
    let extraCount = 6;
    let shuffled = extraPool.sort(() => 0.5 - Math.random());
    for (let char of shuffled) {
        if (!letters.includes(char) && extraCount > 0) { letters.push(char); extraCount--; }
    }
    return letters.sort(() => 0.5 - Math.random());
}

function renderKeyboard() {
    const keyboard = document.getElementById('keyboard');
    if (!keyboard) return;
    keyboard.innerHTML = '';
    const keys = getAvailableLetters(currentWord);
    keys.forEach(key => {
        const btn = document.createElement('button');
        btn.className = 'key';
        btn.innerText = key;
        btn.onclick = () => handleKeyPress(key, btn);
        keyboard.appendChild(btn);
    });
}

function handleKeyPress(letter, btnElement) {
    let emptyIndex = -1;
    for (let i = 0; i < currentGuess.length; i++) {
        if (currentGuess[i] === '' && currentWord[i] !== ' ') { emptyIndex = i; break; }
    }
    if (emptyIndex !== -1) {
        currentGuess[emptyIndex] = letter;
        renderSlots();
        btnElement.classList.add('used');
        const allFilled = currentGuess.every((g, i) => g !== '' || currentWord[i] === ' ');
        if (allFilled) checkAnswer();
    }
}

function removeLetter(index) {
    if (currentGuess[index] !== '' && currentWord[index] !== ' ') {
        const letter = currentGuess[index];
        currentGuess[index] = '';
        renderSlots();
        document.querySelectorAll('.key').forEach(k => { if (k.innerText === letter) k.classList.remove('used'); });
    }
}

function checkAnswer() {
    const guessClean = currentGuess.join('').replace(/\s+/g, '');
    const answerClean = gameData[currentLevelIndex].answer.replace(/\s+/g, '');
    if (guessClean === answerClean) {
        if (!solvedLevels[currentLevelIndex]) { 
            currentCoins += 5; 
            solvedLevels[currentLevelIndex] = true; 
        }
        if (currentLevelIndex + 1 === unlockedLevels && unlockedLevels < TOTAL_LEVELS) unlockedLevels++;
        updateCoinsUI();
        saveProgress();

        if (currentName && !currentName.startsWith('Guest.')) {
            supabaseClient.from('profiles')
                .update({ solved_levels: Object.keys(solvedLevels).length })
                .eq('device_id', getDeviceId())
                .then();
        } else if (currentName) {
            supabaseClient.from('profiles')
                .update({ solved_levels: Object.keys(solvedLevels).length })
                .eq('device_id', getDeviceId())
                .then();
        }

        const correctEl = document.getElementById('correct-answer-text');
        if (correctEl) correctEl.innerText = gameData[currentLevelIndex].answer;
        const winModal = document.getElementById('win-modal');
        if (winModal) winModal.classList.add('active');
    } else {
        const board = document.querySelector('.emoji-board');
        if (board) board.classList.add('shake-anim');
        setTimeout(() => {
            if (board) board.classList.remove('shake-anim');
            currentGuess = new Array(currentWord.length).fill('');
            renderSlots();
            document.querySelectorAll('.key').forEach(k => k.classList.remove('used'));
        }, 400);
    }
}

function nextLevel() {
    const winModal = document.getElementById('win-modal');
    if (winModal) winModal.classList.remove('active');
    const chapterLastLevel = currentChapter * LEVELS_PER_CHAPTER - 1;
    if (currentLevelIndex === chapterLastLevel) {
        const ccModal = document.getElementById('chapter-complete-modal');
        if (ccModal) ccModal.classList.add('active');
        return;
    }
    if (currentLevelIndex < TOTAL_LEVELS - 1) startLevel(currentLevelIndex + 1);
    else showScreen('levels-screen');
}

function goToNextChapter() {
    const ccModal = document.getElementById('chapter-complete-modal');
    if (ccModal) ccModal.classList.remove('active');
    if (currentChapter < TOTAL_CHAPTERS) {
        currentChapter++;
        saveProgress();
        startLevel((currentChapter - 1) * LEVELS_PER_CHAPTER);
    }
}

function buyHint(type) {
    if (type === 'remove' && removeHintUses >= 3) return;
    let cost = 0;
    if (type === 'remove') cost = 25;
    if (type === 'letter') cost = 5;
    if (type === 'reveal') cost = 50;
    if (currentCoins >= cost) {
        currentCoins -= cost;
        updateCoinsUI();
        saveProgress();
        if (type === 'reveal') {
            currentGuess = [...currentWord];
            renderSlots();
            checkAnswer();
        } else if (type === 'letter') {
            let emptyIndex = -1;
            for (let i = 0; i < currentGuess.length; i++) {
                if (currentGuess[i] === '' && currentWord[i] !== ' ') { emptyIndex = i; break; }
            }
            if (emptyIndex !== -1) {
                const correctLetter = currentWord[emptyIndex];
                currentGuess[emptyIndex] = correctLetter;
                renderSlots();
                document.querySelectorAll('.key').forEach(k => { if (k.innerText === correctLetter) k.classList.add('used'); });
                const allFilled = currentGuess.every((g, i) => g !== '' || currentWord[i] === ' ');
                if (allFilled) checkAnswer();
            }
        } else if (type === 'remove') {
            removeHintUses++;
            const keys = document.querySelectorAll('.key:not(.used)');
            let removed = 0;
            keys.forEach(k => {
                if (removed < 2 && !currentWord.includes(k.innerText)) { k.classList.add('used'); removed++; }
            });
        }
    } else {
        const ncModal = document.getElementById('no-coin-modal');
        if (ncModal) ncModal.classList.add('active');
    }
}
