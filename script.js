let allWords = [];
let words = [];
let currentIndex = 0;
let wrongWordsList = [];
let appliedTones = []; 

let selectionMode = localStorage.getItem('chinese_voca_mode') || 'exclude';

// 📌 [핵심 수정] 두 모드의 데이터를 완전히 분리해서 따로 저장
let excludedWords = JSON.parse(localStorage.getItem('chinese_voca_excluded')) || [];
let includedWords = JSON.parse(localStorage.getItem('chinese_voca_included')) || [];

// 현재 모드에 맞는 배열을 가져오는 함수
function getCurrentList() {
    return selectionMode === 'exclude' ? excludedWords : includedWords;
}

// 현재 모드에 맞는 배열을 업데이트하고 로컬 스토리지에 저장하는 함수
function updateCurrentList(newList) {
    if (selectionMode === 'exclude') {
        excludedWords = newList;
        localStorage.setItem('chinese_voca_excluded', JSON.stringify(excludedWords));
    } else {
        includedWords = newList;
        localStorage.setItem('chinese_voca_included', JSON.stringify(includedWords));
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
const feedbackMsg = document.getElementById('feedback-msg');
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
    if (selectionMode === 'exclude') {
        modeExcludeBtn.classList.add('active');
        modeIncludeBtn.classList.remove('active');
    } else {
        modeIncludeBtn.classList.add('active');
        modeExcludeBtn.classList.remove('active');
    }
}

function renderSidebarList() {
    vocaListUI.innerHTML = "";
    let currentList = getCurrentList(); // 현재 모드에 맞는 배열 불러오기

    allWords.forEach((word, index) => {
        const li = document.createElement('li');
        const isChecked = currentList.includes(word.chinese);
        
        li.innerHTML = `
            <input type="checkbox" data-chinese="${word.chinese}" ${isChecked ? 'checked' : ''}>
            <span><span class="word-index">${index + 1}.</span> <strong>${word.chinese}</strong> (${word.pinyin}) - ${word.korean}</span>
        `;
        
        const checkbox = li.querySelector('input');
        checkbox.addEventListener('change', (e) => {
            let list = getCurrentList();
            if (e.target.checked) {
                if (!list.includes(word.chinese)) list.push(word.chinese);
                updateCurrentList(list);
            } else {
                let filteredList = list.filter(w => w !== word.chinese);
                updateCurrentList(filteredList);
            }
        });
        
        li.querySelector('span').addEventListener('click', () => { checkbox.click(); });
        vocaListUI.appendChild(li);
    });
}

function applyRangeSelection(isCheck) {
    let start = parseInt(rangeStart.value);
    let end = parseInt(rangeEnd.value);
    
    if (isNaN(start)) start = 1;
    if (isNaN(end)) end = allWords.length;
    
    if (start < 1) start = 1;
    if (end > allWords.length) end = allWords.length;
    if (start > end) { alert("시작 번호가 끝 번호보다 클 수 없습니다."); return; }

    let list = getCurrentList();
    for (let i = start - 1; i < end; i++) {
        const wordChinese = allWords[i].chinese;
        if (isCheck) {
            if (!list.includes(wordChinese)) list.push(wordChinese);
        } else {
            list = list.filter(w => w !== wordChinese);
        }
    }
    
    updateCurrentList(list);
    renderSidebarList(); 
}

rangeCheckBtn.addEventListener('click', () => applyRangeSelection(true));
rangeUncheckBtn.addEventListener('click', () => applyRangeSelection(false));


fetch('data.json')
    .then(response => response.json())
    .then(data => {
        allWords = [...data];
        rangeEnd.placeholder = allWords.length;

        updateModeUI();
        renderSidebarList();
        
        if (localStorage.getItem('chinese_voca_index') && localStorage.getItem('chinese_voca_active_words')) {
            words = JSON.parse(localStorage.getItem('chinese_voca_active_words'));
            currentIndex = parseInt(localStorage.getItem('chinese_voca_index'));
            if (localStorage.getItem('chinese_voca_wrong')) {
                wrongWordsList = JSON.parse(localStorage.getItem('chinese_voca_wrong'));
            }
            startTestUI();
        }
    })
    .catch(error => console.error("데이터 로드 실패:", error));


startTestBtn.addEventListener('click', () => {
    // 📌 [핵심] 시험 시작 시 현재 모드에 맞는 배열을 사용해 단어 필터링
    if (selectionMode === 'exclude') words = allWords.filter(w => !excludedWords.includes(w.chinese));
    else words = allWords.filter(w => includedWords.includes(w.chinese));

    if (words.length === 0) {
        alert("선택된 시험 단어가 없습니다! 설정을 확인해 주세요.");
        return;
    }

    currentIndex = 0;
    wrongWordsList = [];
    localStorage.setItem('chinese_voca_active_words', JSON.stringify(words));
    localStorage.removeItem('chinese_voca_index');
    localStorage.removeItem('chinese_voca_wrong');
    wrongList.innerHTML = "";

    startTestUI();
});

function startTestUI() {
    sidebar.style.display = "none";
    welcomeScreen.style.display = "none";
    
    backBtn.style.display = "inline-block";
    progressText.style.display = "inline-block";
    shuffleBtn.style.display = "inline-block";
    chineseText.style.display = "block";
    wrongContainer.style.display = "block";
    
    renderWrongListUI();
    showWord();
}

backBtn.addEventListener('click', () => {
    sidebar.style.display = "flex";
    welcomeScreen.style.display = "block";
    
    backBtn.style.display = "none";
    progressText.style.display = "none";
    shuffleBtn.style.display = "none";
    chineseText.style.display = "none";
    koreanText.style.display = "none";
    pinyinInput.style.display = "none";
    toneButtons.style.display = "none";
    submitBtn.style.display = "none";
    nextBtn.style.display = "none";
    endButtons.style.display = "none";
    wrongContainer.style.display = "none";
    feedbackMsg.textContent = "";
    
    localStorage.removeItem('chinese_voca_active_words');
    localStorage.removeItem('chinese_voca_index');
});

// 📌 [핵심] 모드를 바꿀 때마다 화면(체크박스)을 새로 그려줌
modeExcludeBtn.addEventListener('click', () => { 
    selectionMode = 'exclude'; 
    localStorage.setItem('chinese_voca_mode', selectionMode); 
    updateModeUI(); 
    renderSidebarList(); // 제외 모드 리스트 불러오기
});

modeIncludeBtn.addEventListener('click', () => { 
    selectionMode = 'include'; 
    localStorage.setItem('chinese_voca_mode', selectionMode); 
    updateModeUI(); 
    renderSidebarList(); // 포함 모드 리스트 불러오기
});

resetChecksBtn.addEventListener('click', () => { 
    if(confirm("현재 모드에서 체크한 내용을 모두 초기화하시겠습니까?")) { 
        updateCurrentList([]); // 현재 모드의 리스트만 비움
        renderSidebarList(); 
    } 
});


// --- 아래부터 시험 진행 로직 (이전과 완전히 동일) ---

function showWord() {
    localStorage.setItem('chinese_voca_index', currentIndex);

    if (currentIndex >= words.length) {
        chineseText.textContent = "학습 완료! 🎉";
        koreanText.style.display = "none"; pinyinInput.style.display = "none"; submitBtn.style.display = "none"; toneButtons.style.display = "none"; nextBtn.style.display = "none"; shuffleBtn.style.display = "none"; progressText.style.display = "none"; feedbackMsg.textContent = "";
        endButtons.style.display = "block";
        retryWrongBtn.style.display = wrongWordsList.length > 0 ? "inline-block" : "none";
        return;
    }

    const currentWord = words[currentIndex];
    chineseText.textContent = currentWord.chinese;
    koreanText.style.display = "none";
    progressText.textContent = `진행: ${currentIndex + 1} / ${words.length}`;
    
    appliedTones = [];
    pinyinInput.value = "";
    feedbackMsg.textContent = "";
    pinyinInput.disabled = false; pinyinInput.style.display = "inline-block"; submitBtn.style.display = "inline-block"; toneButtons.style.display = "flex"; endButtons.style.display = "none"; nextBtn.style.display = "none";
    pinyinInput.focus();
}

function removeTones(str) { return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s/g, ''); }

function shuffleArray(array) {
    let shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    return shuffled;
}

function updateInputBox() {
    let raw = removeTones(pinyinInput.value).replace(/v/g, 'ü');
    let cursorPosition = pinyinInput.selectionStart;
    let toneIndex = 0;
    
    let newText = raw.replace(/[aeiouü]+/ig, (match) => {
        if (toneIndex < appliedTones.length) {
            let t = appliedTones[toneIndex];
            toneIndex++;
            if (t === 4) return match;
            if (match.includes('a')) return match.replace('a', toneMarks['a'][t]); if (match.includes('e')) return match.replace('e', toneMarks['e'][t]); if (match.includes('o')) return match.replace('o', toneMarks['o'][t]); if (match.includes('iu')) return match.replace('u', toneMarks['u'][t]); if (match.includes('ui')) return match.replace('i', toneMarks['i'][t]); if (match.includes('i')) return match.replace('i', toneMarks['i'][t]); if (match.includes('u')) return match.replace('u', toneMarks['u'][t]); if (match.includes('ü')) return match.replace('ü', toneMarks['ü'][t]);
        }
        return match;
    });
    
    pinyinInput.value = newText;
    pinyinInput.setSelectionRange(cursorPosition, cursorPosition);
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
    const userAnswer = pinyinInput.value.trim().toLowerCase().replace(/\s/g, ''); const correctAnswer = currentWord.pinyin.toLowerCase().replace(/\s/g, '');

    if (userAnswer === correctAnswer) { feedbackMsg.textContent = "정답입니다! 👏"; feedbackMsg.style.color = "green"; correctAction(currentWord); } 
    else if (removeTones(userAnswer) === removeTones(correctAnswer)) { feedbackMsg.textContent = "성조 틀림! (정답: " + currentWord.pinyin + ")"; feedbackMsg.style.color = "orange"; addToWrongList(currentWord); } 
    else { feedbackMsg.textContent = "아예 틀림! (정답: " + currentWord.pinyin + ")"; feedbackMsg.style.color = "red"; addToWrongList(currentWord); }
}

function correctAction(currentWord) {
    koreanText.textContent = currentWord.korean; koreanText.style.display = "block"; pinyinInput.disabled = true; submitBtn.style.display = "none"; toneButtons.style.display = "none"; nextBtn.style.display = "inline-block"; nextBtn.focus();
}

function addToWrongList(word) {
    let alreadyExists = wrongWordsList.some(w => w.chinese === word.chinese);
    if (!alreadyExists) { wrongWordsList.push(word); localStorage.setItem('chinese_voca_wrong', JSON.stringify(wrongWordsList)); renderWrongListUI(); }
    correctAction(word);
}

function renderWrongListUI() {
    wrongList.innerHTML = ""; wrongWordsList.forEach(word => { const li = document.createElement('li'); li.innerHTML = `<strong>${word.chinese}</strong> (${word.pinyin}) : ${word.korean}`; wrongList.appendChild(li); });
}

function restartQuiz(wordList) {
    words = [...wordList]; wrongWordsList = []; localStorage.setItem('chinese_voca_active_words', JSON.stringify(words)); localStorage.removeItem('chinese_voca_index'); localStorage.removeItem('chinese_voca_wrong'); wrongList.innerHTML = ""; currentIndex = 0; progressText.style.display = "inline-block"; shuffleBtn.style.display = "inline-block"; chineseText.style.display = "block"; showWord();
}

shuffleBtn.addEventListener('click', () => { words = shuffleArray([...words]); currentIndex = 0; localStorage.setItem('chinese_voca_active_words', JSON.stringify(words)); localStorage.removeItem('chinese_voca_index'); showWord(); });
document.getElementById('restart-all-btn').addEventListener('click', () => restartQuiz(JSON.parse(localStorage.getItem('chinese_voca_active_words'))));
document.getElementById('restart-random-btn').addEventListener('click', () => restartQuiz(shuffleArray(JSON.parse(localStorage.getItem('chinese_voca_active_words')))));
document.getElementById('retry-wrong-btn').addEventListener('click', () => { words = [...wrongWordsList]; currentIndex = 0; progressText.style.display = "inline-block"; shuffleBtn.style.display = "inline-block"; chineseText.style.display = "block"; showWord(); });
submitBtn.addEventListener('click', checkAnswer); nextBtn.addEventListener('click', () => { currentIndex++; showWord(); }); pinyinInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') submitBtn.click(); });
