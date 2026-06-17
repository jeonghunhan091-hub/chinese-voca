let allWords = [];
let words = [];
let wrongWordsList = [];
let currentIndex = 0;

// 📌 [핵심] 사용자가 누른 성조들을 순서대로 저장하는 배열 (글자가 아니라 성조 정보만 따로 보관)
let appliedTones = []; 

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

fetch('data.json')
    .then(response => response.json())
    .then(data => {
        allWords = [...data];
        words = [...data];
        showWord();
    })
    .catch(error => console.error("데이터 로드 실패:", error));

function showWord() {
    if (currentIndex >= words.length) {
        chineseText.textContent = "학습 완료! 🎉";
        koreanText.style.display = "none";
        pinyinInput.style.display = "none";
        submitBtn.style.display = "none";
        toneButtons.style.display = "none";
        nextBtn.style.display = "none";
        shuffleBtn.style.display = "none";
        feedbackMsg.textContent = "";
        
        endButtons.style.display = "block";
        retryWrongBtn.style.display = wrongWordsList.length > 0 ? "inline-block" : "none";
        return;
    }

    const currentWord = words[currentIndex];
    chineseText.textContent = currentWord.chinese;
    koreanText.style.display = "none";
    
    // 새 단어로 넘어갈 때 성조 배열과 입력창 초기화
    appliedTones = [];
    pinyinInput.value = "";
    feedbackMsg.textContent = "";
    
    pinyinInput.disabled = false;
    pinyinInput.style.display = "inline-block";
    submitBtn.style.display = "inline-block";
    toneButtons.style.display = "flex";
    shuffleBtn.style.display = "inline-block";
    endButtons.style.display = "none";
    nextBtn.style.display = "none";
    pinyinInput.focus();
}

function removeTones(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s/g, '');
}

// 배열 섞기 함수 (피셔-예이츠 셔플 알고리즘)
function shuffleArray(array) {
    let shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// 📌 [핵심] 순수 텍스트(shengri)에 저장된 성조 배열([0, 3])을 결합해 화면에 뿌려주는 함수
function updateInputBox() {
    let raw = removeTones(pinyinInput.value).replace(/v/g, 'ü');
    let cursorPosition = pinyinInput.selectionStart; // 타이핑 중 커서가 뒤로 튕기는 것 방지
    let toneIndex = 0;
    
    // 모음 덩어리(음절)를 찾아서 순서대로 성조를 하나씩 입힘
    let newText = raw.replace(/[aeiouü]+/ig, (match) => {
        if (toneIndex < appliedTones.length) {
            let t = appliedTones[toneIndex];
            toneIndex++;
            if (t === 4) return match; // 5성(경성)은 기호 없음
            
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
    
    pinyinInput.value = newText;
    pinyinInput.setSelectionRange(cursorPosition, cursorPosition);
}

// 사용자가 키보드로 타이핑하거나 백스페이스로 글자를 지울 때 실시간으로 성조 재계산
pinyinInput.addEventListener('input', () => {
    let raw = removeTones(pinyinInput.value);
    let vowelMatch = raw.match(/[aeiouü]+/ig);
    let vowelCount = vowelMatch ? vowelMatch.length : 0;
    
    // 사용자가 글자를 지워서 음절 수가 줄어들면, 초과된 성조 데이터도 같이 삭제
    if (appliedTones.length > vowelCount) {
        appliedTones = appliedTones.slice(0, vowelCount);
    }
    updateInputBox();
});

// 성조 버튼 클릭 이벤트 (한자 개수만큼만 성조 입력 가능하도록 제한)
document.querySelectorAll('.tone-btn').forEach(btn => {
    if(btn.id === 'delete-btn') return;
    
    btn.addEventListener('click', () => {
        const tone = parseInt(btn.getAttribute('data-tone')) - 1; // 0=1성, 1=2성...
        const maxTones = words[currentIndex].chinese.length; // 현재 한자의 글자 수
        
        // 입력된 성조 개수가 한자 개수보다 작을 때만 추가 허용
        if (appliedTones.length < maxTones) {
            appliedTones.push(tone);
            updateInputBox();
            pinyinInput.focus();
        }
    });
});

// 📌 [핵심] 성조 지우기 버튼 (배열에서 맨 마지막에 넣은 성조만 뺌)
deleteBtn.addEventListener('click', () => {
    if (appliedTones.length > 0) {
        appliedTones.pop(); // 배열 맨 끝 데이터 날리기
        updateInputBox();
        pinyinInput.focus();
    }
});

function checkAnswer() {
    const currentWord = words[currentIndex];
    const userAnswer = pinyinInput.value.trim().toLowerCase().replace(/\s/g, '');
    const correctAnswer = currentWord.pinyin.toLowerCase().replace(/\s/g, '');

    if (userAnswer === correctAnswer) {
        feedbackMsg.textContent = "정답입니다! 👏";
        feedbackMsg.style.color = "green";
        correctAction(currentWord);
    } 
    else if (removeTones(userAnswer) === removeTones(correctAnswer)) {
        feedbackMsg.textContent = "성조 틀림! (정답: " + currentWord.pinyin + ")";
        feedbackMsg.style.color = "orange";
        addToWrongList(currentWord);
    } 
    else {
        feedbackMsg.textContent = "아예 틀림! (정답: " + currentWord.pinyin + ")";
        feedbackMsg.style.color = "red";
        addToWrongList(currentWord);
    }
}

function correctAction(currentWord) {
    koreanText.textContent = currentWord.korean;
    koreanText.style.display = "block";

    pinyinInput.disabled = true;
    submitBtn.style.display = "none";
    toneButtons.style.display = "none";
    nextBtn.style.display = "inline-block";
    nextBtn.focus();
}

function addToWrongList(word) {
    if (!wrongWordsList.includes(word)) {
        wrongWordsList.push(word);
        const li = document.createElement('li');
        li.innerHTML = `<strong>${word.chinese}</strong> (${word.pinyin}) : ${word.korean}`;
        wrongList.appendChild(li);
    }
    correctAction(word);
}

function restartQuiz(wordList) {
    words = [...wordList];
    wrongWordsList = [];
    wrongList.innerHTML = "";
    currentIndex = 0;
    showWord();
}

// 섞기 및 재시작 이벤트 연결
shuffleBtn.addEventListener('click', () => {
    words = shuffleArray([...allWords]); // 전체 데이터를 섞어서
    currentIndex = 0;                    // 처음부터 다시 시작
    showWord();
});

document.getElementById('restart-all-btn').addEventListener('click', () => restartQuiz(allWords));
document.getElementById('restart-random-btn').addEventListener('click', () => restartQuiz(shuffleArray([...allWords])));
document.getElementById('retry-wrong-btn').addEventListener('click', () => restartQuiz(wrongWordsList));

submitBtn.addEventListener('click', checkAnswer);
nextBtn.addEventListener('click', () => { currentIndex++; showWord(); });
pinyinInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') submitBtn.click(); });