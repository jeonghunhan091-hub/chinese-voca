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

qmodeSelect.addEventListener('change', (e) => {
    questionMode = e.target.value;
    localStorage.setItem('chinese_voca_qmode', questionMode);
    if (words.length > 0 && currentIndex < words.length) showWord(); 
});

function getStoreKey(keyName) { return `cv_${currentScope}_${keyName}`; }

let allWords = [];
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
const sourceInfoBox = document.getElementById('source-info-box'); // 📌 출처 박스
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

function renderSidebarList() {
    vocaListUI.innerHTML = ""; let currentList = getCurrentList();
    allWords.forEach((word, index) => {
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
    if (isNaN(start)) start = 1; if (isNaN(end)) end = allWords.length;
    if (start < 1) start = 1; if (end > allWords.length) end = allWords.length;
    if (start > end) { alert("시작 번호가 끝 번호보다 클 수 없습니다."); return; }
    let list = getCurrentList();
    for (let i = start - 1; i < end; i++) {
        const wordChinese = allWords[i].chinese;
        if (isCheck) { if (!list.includes(wordChinese)) list.push(wordChinese); } 
        else { list = list.filter(w => w !== wordChinese); }
    }
    updateCurrentList(list); renderSidebarList(); 
}

rangeCheckBtn.addEventListener('click', () => applyRangeSelection(true));
rangeUncheckBtn.addEventListener('click', () => applyRangeSelection(false));

const jsonFileName = currentScope === 'midterm' ? 'midterm.json' : 'final.json';

fetch(jsonFileName)
    .then(response => response.json())
    .then(data => {
        allWords = data.map(item => {
            let rawKorean = item.korean || item.meaning; 
            let cleanKorean = rawKorean ? rawKorean.replace(/\s*\/g, '') : '';
            return { chinese: item.chinese || item.word, pinyin: item.pinyin, korean: cleanKorean };
        });
        rangeEnd.placeholder = allWords.length; updateModeUI(); renderSidebarList();
        
        if (localStorage.getItem(getStoreKey('index')) && localStorage.getItem(getStoreKey('active_words'))) {
            words = JSON.parse(localStorage.getItem(getStoreKey('active_words')));
            currentIndex = parseInt(localStorage.getItem(getStoreKey('index')));
            if (localStorage.getItem(getStoreKey('wrong'))) { wrongWordsList = JSON.parse(localStorage.getItem(getStoreKey('wrong'))); }
            startTestUI();
        }
    })
    .catch(error => { console.error("데이터 로드 실패:", error); vocaListUI.innerHTML = `<li style="color:red; text-align:center;">${jsonFileName} 파일을 찾을 수 없습니다!</li>`; });

// 📌 [핵심 1] 다음절 단어를 한 글자씩 쪼개고, 1글자짜리 원본 단어는 필터링하는 마법의 함수
function generateSingleCharWords(sourceWords) {
    const singleCharExcludes = new Set();
    // 조건 2: 이미 단어장에 존재하는 1글자짜리 단어는 쪼개기 시험에서 아예 제외하기 위해 기록
    sourceWords.forEach(w => { if (w.chinese.length === 1) singleCharExcludes.add(w.chinese); });

    const charMap = new Map();
    const syllableRegex = /([bpmfdtnlgkhjqxrzcsyw]*[aāáǎàeēéěèoōóǒòiīíǐìuūúǔùüǖǘǚǜ]+(?:ng|n|r)?)/ig;

    sourceWords.forEach(wordObj => {
        if (wordObj.chinese.length > 1) {
            let pinyinStr = wordObj.pinyin.replace(/['’`′]/g, '');
            let syllables = pinyinStr.includes(' ') ? pinyinStr.split(/\s+/) : (pinyinStr.match(syllableRegex) || []);

            // 글자 수와 병음 음절 수가 똑같이 분리되었을 때만 작업 진행
            if (syllables.length === wordObj.chinese.length) {
                for (let i = 0; i < wordObj.chinese.length; i++) {
                    let char = wordObj.chinese[i];
                    let py = syllables[i];

                    // 조건 2 적용: 1글자로 이미 배운 단어면 패스
                    if (singleCharExcludes.has(char)) continue;

                    // 조건 3 적용: 처음 나오는 글자면 새로 등록 (중복 출제 방지)
                    if (!charMap.has(char)) {
                        charMap.set(char, {
                            chinese: char,
                            pinyin: py.toLowerCase(),
                            korean: "한 글자 병음 맞추기", // 단일 글자의 뜻은 모르므로 통일
                            sources: [] // 이 글자가 포함된 원래 단어들을 모아둘 배열
                        });
                    }
                    
                    // 조건 4를 위해 원본 단어 출처를 저장 (중복 저장 방지)
                    const entry = charMap.get(char);
                    if (!entry.sources.some(s => s.chinese === wordObj.chinese)) {
                        entry.sources.push(wordObj);
                    }
                }
            }
        }
    });
    
    return Array.from(charMap.values());
}

startTestBtn.addEventListener('click', () => {
    let selectedWords = [];
    if (selectionMode === 'exclude') selectedWords = allWords.filter(w => !excludedWords.includes(w.chinese));
    else selectedWords = allWords.filter(w => includedWords.includes(w.chinese));

    if (selectedWords.length === 0) { alert("선택된 시험 단어가 없습니다! 설정을 확인해 주세요."); return; }

    // 📌 [핵심 2] 쪼개기 모드일 경우 데이터를 가공해서 시험 배열로 세팅
    if (questionMode === 'single-char') {
        words = generateSingleCharWords(selectedWords);
        if (words.length === 0) {
            alert("조건에 맞는 한 글자 단어가 없습니다! (선택한 단어가 모두 1글자이거나 분리할 수 없음)");
            return;
        }
    } else {
        words = [...selectedWords];
    }

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
    chineseText.style.display = "none"; koreanText.style.display = "none"; sourceInfoBox.style.display = "none";
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
        sourceInfoBox.style.display = "none";
        endButtons.style.display = "block"; retryWrongBtn.style.display = wrongWordsList.length > 0 ? "inline-block" : "none";
        return;
    }

    const currentWord = words[currentIndex];
    sourceInfoBox.style.display = "none"; // 새 단어 넘어가면 출처 숨기기
    
    // 📌 [모드별 화면 텍스트 노출 분기]
    if (questionMode === 'ko-to-py') {
        koreanText.textContent = currentWord.korean; koreanText.style.display = "block"; chineseText.style.display = "none";
    } else {
        // zh-to-py 이거나 single-char 모드일 때
        chineseText.textContent = currentWord.chinese; chineseText.style.display = "block"; koreanText.style.display = "none";
    }

    progressText.textContent = `진행: ${currentIndex + 1} / ${words.length}`;
    appliedTones = []; pinyinInput.value = ""; feedbackMsg.textContent = "";
    pinyinInput.disabled = false; pinyinInput.style.display = "inline-block"; submitBtn.style.display = "inline-block"; toneButtons.style.display = "flex"; endButtons.style.display = "none"; nextBtn.style.display = "none"; forgotHanziBtn.style.display = "none"; forgotHanziBtn.disabled = false;
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
        feedbackMsg.textContent = "정답입니다! 👏"; feedbackMsg.style.color = "green"; 
        wrongWordsList = wrongWordsList.filter(w => w.chinese !== currentWord.chinese);
        localStorage.setItem(getStoreKey('wrong'), JSON.stringify(wrongWordsList));
        renderWrongListUI(); 
        correctAction(currentWord); 
    } 
    else if (userAnswerTonesRemoved === correctAnswerTonesRemoved) { 
        feedbackMsg.textContent = "성조 틀림! (정답: " + currentWord.pinyin + ")"; feedbackMsg.style.color = "orange"; 
        forceAddWrong(currentWord); correctAction(currentWord); 
    } 
    else { 
        feedbackMsg.textContent = "아예 틀림! (정답: " + currentWord.pinyin + ")"; feedbackMsg.style.color = "red"; 
        forceAddWrong(currentWord); correctAction(currentWord); 
    }
}

function correctAction(currentWord) {
    if (questionMode === 'ko-to-py') {
        chineseText.textContent = currentWord.chinese; chineseText.style.display = "block";
    } else if (questionMode === 'zh-to-py') {
        koreanText.textContent = currentWord.korean; koreanText.style.display = "block"; 
    }
    
    // 📌 [핵심 4] 한 글자 쪼개기 모드일 때만 출처 단어들을 표시해줌
    if (questionMode === 'single-char' && currentWord.sources) {
        let sourceHTML = "<strong>💡 이 글자가 포함된 단어:</strong><br><br>";
        sourceHTML += currentWord.sources.map(s => `• ${s.chinese} (${s.pinyin}) : ${s.korean}`).join('<br>');
        sourceInfoBox.innerHTML = sourceHTML;
        sourceInfoBox.style.display = "block";
    }

    pinyinInput.disabled = true; submitBtn.style.display = "none"; toneButtons.style.display = "none"; 
    nextBtn.style.display = "inline-block"; forgotHanziBtn.style.display = "inline-block"; nextBtn.focus();
}

function forceAddWrong(word) {
    let alreadyExists = wrongWordsList.some(w => w.chinese === word.chinese);
    if (!alreadyExists) { 
        wrongWordsList.push(word); localStorage.setItem(getStoreKey('wrong'), JSON.stringify(wrongWordsList)); renderWrongListUI(); 
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
        const li = document.createElement('li'); li.innerHTML = `<strong>${word.chinese}</strong> (${word.pinyin}) : ${word.korean}`; wrongList.appendChild(li); 
    });
}

function restartQuiz(wordList) {
    words = [...wordList]; wrongWordsList = []; localStorage.setItem(getStoreKey('active_words'), JSON.stringify(words)); localStorage.removeItem(getStoreKey('index')); localStorage.removeItem(getStoreKey('wrong')); wrongList.innerHTML = ""; currentIndex = 0; progressText.style.display = "inline-block"; shuffleBtn.style.display = "inline-block"; showWord();
}

shuffleBtn.addEventListener('click', () => { words = shuffleArray([...words]); currentIndex = 0; localStorage.setItem(getStoreKey('active_words'), JSON.stringify(words)); localStorage.removeItem(getStoreKey('index')); showWord(); });
document.getElementById('restart-all-btn').addEventListener('click', () => restartQuiz(JSON.parse(localStorage.getItem(getStoreKey('active_words')))));
document.getElementById('restart-random-btn').addEventListener('click', () => restartQuiz(shuffleArray(JSON.parse(localStorage.getItem(getStoreKey('active_words'))))));
document.getElementById('retry-wrong-btn').addEventListener('click', () => { words = [...wrongWordsList]; currentIndex = 0; progressText.style.display = "inline-block"; shuffleBtn.style.display = "inline-block"; showWord(); });
submitBtn.addEventListener('click', checkAnswer); nextBtn.addEventListener('click', () => { currentIndex++; showWord(); }); pinyinInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') submitBtn.click(); });
