const scopeSelect = document.getElementById('scope-select');
let currentScope = localStorage.getItem('chinese_voca_scope') || 'final';
scopeSelect.value = currentScope;

scopeSelect.addEventListener('change', (e) => {
    localStorage.setItem('chinese_voca_scope', e.target.value);
    location.reload(); 
});

const qmodeSelect = document.getElementById('qmode-select');
let questionMode = localStorage.getItem('chinese_voca_qmode') || 'zh-to-py';
qmodeSelect.value = questionMode;

// 📌 모드가 바뀌면 리스트를 새로 그려야 하므로 새로고침으로 깔끔하게 상태 리셋
qmodeSelect.addEventListener('change', (e) => {
    questionMode = e.target.value;
    localStorage.setItem('chinese_voca_qmode', questionMode);
    location.reload(); 
});

// 📌 [핵심 1] 일반 모드와 쪼개기 모드의 체크박스 저장 공간을 완벽히 분리
const modePrefix = questionMode === 'single-char' ? 'single' : 'normal';
function getStoreKey(keyName) {
    return `cv_${currentScope}_${modePrefix}_${keyName}`;
}

// 📌 [핵심 2] 원래 성조 복구 사전 (Tone Sandhi Fix)
// 합쳐지며 성조가 바뀌는 대표적인 글자들의 본래 성조를 입력해 둡니다. 
// 필요한 글자가 있다면 여기에 '한자': '원래병음' 형식으로 언제든 추가하면 됩니다!
const originalToneDictionary = {
    '一': 'yī', 
    '不': 'bù', 
    '很': 'hěn', 
    '好': 'hǎo', 
    '你': 'nǐ', 
    '我': 'wǒ', 
    '也': 'yě', 
    '老': 'lǎo', 
    '买': 'mǎi', 
    '水': 'shuǐ', 
    '果': 'guǒ',
    '小': 'xiǎo',
    '可': 'kě',
    '以': 'yǐ'
};

let allWords = [];
let displayWords = []; // 화면(사이드바)에 띄울 실제 단어 목록
let words = [];
let currentIndex = 0;
let wrongWordsList = [];
let appliedTones = []; 

let selectionMode = localStorage.getItem(getStoreKey('mode')) || 'exclude';
let excludedWords = JSON.parse(localStorage.getItem(getStoreKey('excluded'))) || [];
let includedWords = JSON.parse(localStorage.getItem(getStoreKey('included'))) || [];

function getCurrentList() { return selectionMode === 'exclude' ? excludedWords : includedWords; }

function updateCurrentList(newList) {
    if (selectionMode === 'exclude') {
        excludedWords = newList; localStorage.setItem(getStoreKey('excluded'), JSON.stringify(excludedWords));
    } else {
        includedWords = newList; localStorage.setItem(getStoreKey('included'), JSON.stringify(includedWords));
    }
}

const sidebar = document.getElementById('sidebar');
const vocaListUI = document.getElementById('voca-list');
const modeExcludeBtn = document.getElementById('mode-exclude-btn');
const modeIncludeBtn = document.getElementById('mode-include-btn');
const resetChecksBtn = document.getElementById('reset-checks-btn');
const startTestBtn = document.getElementById('start-test-btn');
const rangeStart = document.getElementById('range-start');
const rangeEnd = document.getElementById('range-end');
const rangeCheckBtn = document.getElementById('range-check-btn');
const rangeUncheckBtn = document.getElementById('range-uncheck-btn');
const welcomeScreen = document.getElementById('welcome-screen');
const backBtn = document.getElementById('back-btn');
const progressText = document.getElementById('progress-text');
const wrongContainer = document.getElementById('wrong-container');
const chineseText = document.getElementById('chinese-text');
const koreanText = document.getElementById('korean-text');
const pinyinInput = document.getElementById('pinyin-input');
const submitBtn = document.getElementById('submit-btn');
const nextBtn = document.getElementById('next-btn');
const forgotHanziBtn = document.getElementById('forgot-hanzi-btn');
const feedbackMsg = document.getElementById('feedback-msg');
const sourceInfoBox = document.getElementById('source-info-box');
const wrongList = document.getElementById('wrong-list');
const toneButtons = document.getElementById('tone-buttons');
const endButtons = document.getElementById('end-buttons');
const retryWrongBtn = document.getElementById('retry-wrong-btn');
const deleteBtn = document.getElementById('delete-btn');
const shuffleBtn = document.getElementById('shuffle-btn');

const toneMarks = {
    a: ['ā', 'á', 'ǎ', 'à'], e: ['ē', 'é', 'ě', 'è'], o: ['ō', 'ó', 'ǒ', 'ò'],
    i: ['ī', 'í', 'ǐ', 'ì'], u: ['ū', 'ú', 'ǔ', 'ù'], ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ']
};

function updateModeUI() {
    if (selectionMode === 'exclude') { modeExcludeBtn.classList.add('active'); modeIncludeBtn.classList.remove('active'); } 
    else { modeIncludeBtn.classList.add('active'); modeExcludeBtn.classList.remove('active'); }
}

// 📌 사이드바도 실제 출제될 배열(displayWords)을 기준으로 그리도록 변경
function renderSidebarList() {
    vocaListUI.innerHTML = ""; let currentList = getCurrentList();
    displayWords.forEach((word, index) => {
        const li = document.createElement('li');
        const isChecked = currentList.includes(word.chinese);
        li.innerHTML = `<input type="checkbox" data-chinese="${word.chinese}" ${isChecked ? 'checked' : ''}><span><span class="word-index">${index + 1}.</span> <strong>${word.chinese}</strong> (${word.pinyin}) - ${word.korean}</span>`;
        const checkbox = li.querySelector('input');
        checkbox.addEventListener('change', (e) => {
            let list = getCurrentList();
            if (e.target.checked) { if (!list.includes(word.chinese)) list.push(word.chinese); } 
            else { list = list.filter(w => w !== word.chinese); }
            updateCurrentList(list);
        });
        li.querySelector('span').addEventListener('click', () => { checkbox.click(); });
        vocaListUI.appendChild(li);
    });
}

function applyRangeSelection(isCheck) {
    let start = parseInt(rangeStart.value); let end = parseInt(rangeEnd.value);
    if (isNaN(start)) start = 1; if (isNaN(end)) end = displayWords.length;
    if (start < 1) start = 1; if (end > displayWords.length) end = displayWords.length;
    if (start > end) { alert("시작 번호가 끝 번호보다 클 수 없습니다."); return; }
    let list = getCurrentList();
    for (let i = start - 1; i < end; i++) {
        const wordChinese = displayWords[i].chinese;
        if (isCheck) { if (!list.includes(wordChinese)) list.push(wordChinese); } 
        else { list = list.filter(w => w !== wordChinese); }
    }
    updateCurrentList(list); renderSidebarList(); 
}

rangeCheckBtn.addEventListener('click', () => applyRangeSelection(true));
rangeUncheckBtn.addEventListener('click', () => applyRangeSelection(false));

function generateSingleCharWords(sourceWords) {
    const singleCharExcludes = new Set();
    sourceWords.forEach(w => { if (w.chinese.length === 1) singleCharExcludes.add(w.chinese); });

    const charMap = new Map();
    const syllableRegex = /([bpmfdtnlgkhjqxrzcsyw]*[aāáǎàeēéěèoōóǒòiīíǐìuūúǔùüǖǘǚǜ]+(?:ng|n|r)?)/ig;

    sourceWords.forEach(wordObj => {
        if (wordObj.chinese.length > 1) {
            let pinyinStr = wordObj.pinyin.replace(/['’`′]/g, '');
            let syllables = pinyinStr.includes(' ') ? pinyinStr.split(/\s+/) : (pinyinStr.match(syllableRegex) || []);

            if (syllables.length === wordObj.chinese.length) {
                for (let i = 0; i < wordObj.chinese.length; i++) {
                    let char = wordObj.chinese[i];
                    
                    // 📌 성조 복구 사전에 이 글자가 있다면 원래 성조를 덮어씌움! 없다면 잘라낸 병음 사용.
                    let py = originalToneDictionary[char] || syllables[i];

                    if (singleCharExcludes.has(char)) continue;

                    if (!charMap.has(char)) {
                        charMap.set(char, {
                            chinese: char,
                            pinyin: py.toLowerCase(),
                            korean: "", 
                            sources: [] 
                        });
                    }
                    
                    const entry = charMap.get(char);
                    if (!entry.sources.some(s => s.chinese === wordObj.chinese)) {
                        entry.sources.push(wordObj);
                    }
                }
            }
        }
    });
    
    let results = Array.from(charMap.values());
    // 사이드바에 어떤 단어에서 파생되었는지 보여주기 위해 korean 항목 업데이트
    results.forEach(entry => {
        entry.korean = "포함 단어: " + entry.sources.map(s => s.chinese).join(', ');
    });
    
    return results;
}

const jsonFileName = currentScope === 'midterm' ? 'midterm.json' : 'final.json';

fetch(jsonFileName)
    .then(response => response.json())
    .then(data => {
        allWords = data.map(item => {
            let rawKorean = item.korean || item.meaning; 
            let cleanKorean = rawKorean ? rawKorean.replace(/\s*\x5Bcite:\s*\d+\x5D/g, '') : '';
            return { chinese: item.chinese || item.word, pinyin: item.pinyin, korean: cleanKorean };
        });
        
        // 📌 [핵심 3] 시험 모드에 따라 사이드바에 그릴 데이터(displayWords)를 미리 세팅
        if (questionMode === 'single-char') {
            displayWords = generateSingleCharWords(allWords);
        } else {
            displayWords = [...allWords];
        }

        rangeEnd.placeholder = displayWords.length; updateModeUI(); renderSidebarList();
        
        if (localStorage.getItem(getStoreKey('index')) && localStorage.getItem(getStoreKey('active_words'))) {
            words = JSON.parse(localStorage.getItem(getStoreKey('active_words')));
            currentIndex = parseInt(localStorage.getItem(getStoreKey('index')));
            if (localStorage.getItem(getStoreKey('wrong'))) { wrongWordsList = JSON.parse(localStorage.getItem(getStoreKey('wrong'))); }
            startTestUI();
        }
    })
    .catch(error => { 
        console.error("데이터 로드 실패:", error); 
        vocaListUI.innerHTML = `<li style="color:red; text-align:center;">${jsonFileName} 파일을 찾을 수 없습니다!</li>`; 
    });


startTestBtn.addEventListener('click', () => {
    // 이제 화면에 보이는 리스트(displayWords)에서 바로 필터링해서 문제 배열(words) 완성!
    if (selectionMode === 'exclude') words = displayWords.filter(w => !excludedWords.includes(w.chinese));
    else words = displayWords.filter(w => includedWords.includes(w.chinese));

    if (words.length === 0) { alert("선택된 시험 단어가 없습니다! 설정을 확인해 주세요."); return; }

    currentIndex = 0; wrongWordsList = [];
    localStorage.setItem(getStoreKey('active_words'), JSON.stringify(words));
    localStorage.removeItem(getStoreKey('index')); localStorage.removeItem(getStoreKey('wrong'));
    wrongList.innerHTML = "";
    startTestUI();
});

function startTestUI() {
    sidebar.style.display = "none"; welcomeScreen.style.display = "none";
    backBtn.style.display = "inline-block"; progressText.style.display = "inline-block"; shuffleBtn.style.display = "inline-block";
    wrongContainer.style.display = "block"; renderWrongListUI(); showWord();
}

backBtn.addEventListener('click', () => {
    sidebar.style.display = "flex"; welcomeScreen.style.display = "block";
    backBtn.style.display = "none"; progressText.style.display = "none"; shuffleBtn.style.display = "none";
    chineseText.style.display = "none"; koreanText.style.display = "none"; 
    if(sourceInfoBox) sourceInfoBox.style.display = "none";
    pinyinInput.style.display = "none"; toneButtons.style.display = "none"; submitBtn.style.display = "none";
    nextBtn.style.display = "none"; forgotHanziBtn.style.display = "none"; endButtons.style.display = "none"; wrongContainer.style.display = "none";
    feedbackMsg.textContent = "";
    localStorage.removeItem(getStoreKey('active_words')); localStorage.removeItem(getStoreKey('index'));
});

modeExcludeBtn.addEventListener('click', () => { selectionMode = 'exclude'; localStorage.setItem(getStoreKey('mode'), selectionMode); updateModeUI(); renderSidebarList(); });
modeIncludeBtn.addEventListener('click', () => { selectionMode = 'include'; localStorage.setItem(getStoreKey('mode'), selectionMode); updateModeUI(); renderSidebarList(); });
resetChecksBtn.addEventListener('click', () => { if(confirm("현재 시험 범위에서 체크한 내용을 모두 초기화하시겠습니까?")) { updateCurrentList([]); renderSidebarList(); } });

function showWord() {
    localStorage.setItem(getStoreKey('index'), currentIndex);

    if (currentIndex >= words.length) {
        chineseText.textContent = "학습 완료! 🎉";
        koreanText.style.display = "none"; pinyinInput.style.display = "none"; submitBtn.style.display = "none"; toneButtons.style.display = "none"; 
        nextBtn.style.display = "none"; forgotHanziBtn.style.display = "none"; shuffleBtn.style.display = "none"; progressText.style.display = "none"; feedbackMsg.textContent = "";
        if(sourceInfoBox) sourceInfoBox.style.display = "none";
        endButtons.style.display = "block"; retryWrongBtn.style.display = wrongWordsList.length > 0 ? "inline-block" : "none";
        return;
    }

    const currentWord = words[currentIndex];
    if(sourceInfoBox) sourceInfoBox.style.display = "none"; 
    
    if (questionMode === 'ko-to-py') {
        koreanText.textContent = currentWord.korean;
        koreanText.style.display = "block";
        chineseText.style.display = "none";
    } else {
        chineseText.textContent = currentWord.chinese;
        chineseText.style.display = "block";
        koreanText.style.display = "none";
    }

    progressText.textContent = `진행: ${currentIndex + 1} / ${words.length}`;
    
    appliedTones = []; pinyinInput.value = ""; feedbackMsg.textContent = "";
    pinyinInput.disabled = false; pinyinInput.style.display = "inline-block"; submitBtn.style.display = "inline-block"; 
    toneButtons.style.display = "flex"; endButtons.style.display = "none"; 
    nextBtn.style.display = "none"; forgotHanziBtn.style.display = "none"; forgotHanziBtn.disabled = false;
    pinyinInput.focus();
}

function removeTones(str) { 
    return str.toLowerCase()
              .replace(/[āáǎà]/g, 'a').replace(/[ēéěè]/g, 'e').replace(/[ōóǒò]/g, 'o')
              .replace(/[īíǐì]/g, 'i').replace(/[ūúǔù]/g, 'u').replace(/[ǖǘǚǜ]/g, 'ü');
}

function shuffleArray(array) {
    let shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    return shuffled;
}

function updateInputBox() {
    let raw = removeTones(pinyinInput.value).replace(/v/g, 'ü').replace(/[’`′]/g, "'");
    let cursorPosition = pinyinInput.selectionStart;
    let toneIndex = 0;
    
    let newText = raw.replace(/[aeiouü]+/ig, (match) => {
        if (toneIndex < appliedTones.length) {
            let t = appliedTones[toneIndex];
            toneIndex++;
            if (t === 4) return match;
            if (match.includes('a')) return match.replace('a', toneMarks['a'][t]); 
            if (match.includes('e')) return match.replace('e', toneMarks['e'][t]); 
            if (match.includes('o')) return match.replace('o', toneMarks['o'][t]); 
            if (match.includes('iu')) return match.replace('u', toneMarks['u'][t]); 
            if (match.includes('ui')) return match.replace('i', toneMarks['i'][t]); 
            if (match.includes('i')) return match.replace('i', toneMarks['i'][t]); 
            if (match.includes('u')) return match.replace('u', toneMarks['u'][t]); 
            if (match.includes('ü')) return match.replace('ü', toneMarks['ü'][t]);
        }
        return match;
    });
    
    pinyinInput.value = newText; pinyinInput.setSelectionRange(cursorPosition, cursorPosition);
}

pinyinInput.addEventListener('input', () => {
    let raw = removeTones(pinyinInput.value); let vowelMatch = raw.match(/[aeiouü]+/ig); let vowelCount = vowelMatch ? vowelMatch.length : 0;
    if (appliedTones.length > vowelCount) appliedTones = appliedTones.slice(0, vowelCount);
    updateInputBox();
});

document.querySelectorAll('.tone-btn').forEach(btn => {
    if(btn.id === 'delete-btn') return;
    btn.addEventListener('click', () => {
        const tone = parseInt(btn.getAttribute('data-tone')) - 1; const maxTones = words[currentIndex].chinese.length;
        if (appliedTones.length < maxTones) { appliedTones.push(tone); updateInputBox(); pinyinInput.focus(); }
    });
});

deleteBtn.addEventListener('click', () => { if (appliedTones.length > 0) { appliedTones.pop(); updateInputBox(); pinyinInput.focus(); } });

function checkAnswer() {
    const currentWord = words[currentIndex];
    
    const userRaw = pinyinInput.value.trim().toLowerCase().replace(/\s/g, '').replace(/[’`′]/g, "'");
    const correctRaw = currentWord.pinyin.toLowerCase().replace(/\s/g, '').replace(/[’`′]/g, "'");

    const userAnswerTonesRemoved = removeTones(userRaw);
    const correctAnswerTonesRemoved = removeTones(correctRaw);

    if (userRaw === correctRaw) { 
        feedbackMsg.textContent = "정답입니다! 👏"; 
        feedbackMsg.style.color = "green"; 
        
        wrongWordsList = wrongWordsList.filter(w => w.chinese !== currentWord.chinese);
        localStorage.setItem(getStoreKey('wrong'), JSON.stringify(wrongWordsList));
        renderWrongListUI(); 
        correctAction(currentWord); 
    } 
    else if (userAnswerTonesRemoved === correctAnswerTonesRemoved) { 
        feedbackMsg.textContent = "성조 틀림! (정답: " + currentWord.pinyin + ")"; 
        feedbackMsg.style.color = "orange"; 
        forceAddWrong(currentWord); 
        correctAction(currentWord); 
    } 
    else { 
        feedbackMsg.textContent = "아예 틀림! (정답: " + currentWord.pinyin + ")"; 
        feedbackMsg.style.color = "red"; 
        forceAddWrong(currentWord); 
        correctAction(currentWord); 
    }
}

function correctAction(currentWord) {
    if (questionMode === 'ko-to-py') {
        chineseText.textContent = currentWord.chinese; chineseText.style.display = "block";
    } else if (questionMode === 'zh-to-py') {
        koreanText.textContent = currentWord.korean; koreanText.style.display = "block"; 
    } else if (questionMode === 'single-char') {
        koreanText.style.display = "none"; // 쪼개기 모드일 때는 별도 뜻을 숨김 (아래 박스에서 보여주니까)
    }
    
    if (questionMode === 'single-char' && currentWord.sources && sourceInfoBox) {
        let sourceHTML = "<strong>💡 이 글자가 포함된 단어:</strong><br><br>";
        sourceHTML += currentWord.sources.map(s => `• ${s.chinese} (${s.pinyin}) : ${s.korean}`).join('<br>');
        sourceInfoBox.innerHTML = sourceHTML;
        sourceInfoBox.style.display = "block";
    }

    pinyinInput.disabled = true; submitBtn.style.display = "none"; toneButtons.style.display = "none"; 
    
    nextBtn.style.display = "inline-block"; 
    forgotHanziBtn.style.display = "inline-block";
    nextBtn.focus();
}

function forceAddWrong(word) {
    let alreadyExists = wrongWordsList.some(w => w.chinese === word.chinese);
    if (!alreadyExists) { 
        wrongWordsList.push(word); 
        localStorage.setItem(getStoreKey('wrong'), JSON.stringify(wrongWordsList));
        renderWrongListUI(); 
    }
}

forgotHanziBtn.addEventListener('click', () => {
    forceAddWrong(words[currentIndex]);
    feedbackMsg.textContent = "한자 오답: 오답 노트에 추가되었습니다!";
    feedbackMsg.style.color = "#9C27B0";
    forgotHanziBtn.disabled = true; 
});

function renderWrongListUI() {
    wrongList.innerHTML = ""; 
    wrongWordsList.forEach(word => { 
        // 쪼개기 모드면 오답노트에 "포함 단어" 표시, 아니면 원래 뜻 표시
        let meaning = questionMode === 'single-char' ? word.korean : word.korean;
        const li = document.createElement('li'); 
        li.innerHTML = `<strong>${word.chinese}</strong> (${word.pinyin}) : ${meaning}`; 
        wrongList.appendChild(li); 
    });
}

function restartQuiz(wordList) {
    words = [...wordList]; wrongWordsList = []; localStorage.setItem(getStoreKey('active_words'), JSON.stringify(words)); localStorage.removeItem(getStoreKey('index')); localStorage.removeItem(getStoreKey('wrong')); wrongList.innerHTML = ""; currentIndex = 0; progressText.style.display = "inline-block"; shuffleBtn.style.display = "inline-block"; showWord();
}

shuffleBtn.addEventListener('click', () => { words = shuffleArray([...words]); currentIndex = 0; localStorage.setItem(getStoreKey('active_words'), JSON.stringify(words)); localStorage.removeItem(getStoreKey('index')); showWord(); });
document.getElementById('restart-all-btn').addEventListener('click', () => restartQuiz(JSON.parse(localStorage.getItem(getStoreKey('active_words')))));
document.getElementById('restart-random-btn').addEventListener('click', () => restartQuiz(shuffleArray(JSON.parse(localStorage.getItem(getStoreKey('active_words'))))));
document.getElementById('retry-wrong-btn').addEventListener('click', () => { 
    words = [...wrongWordsList]; currentIndex = 0; progressText.style.display = "inline-block"; shuffleBtn.style.display = "inline-block"; showWord(); 
});
submitBtn.addEventListener('click', checkAnswer); nextBtn.addEventListener('click', () => { currentIndex++; showWord(); }); pinyinInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') submitBtn.click(); });
