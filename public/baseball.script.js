// HTML 요소 가져오기
const guessInput = document.getElementById('guess-input');
const guessBtn = document.getElementById('guess-btn');
const triesLeftEl = document.getElementById('tries-left');
const historyList = document.getElementById('history-list');
const gameOverMessage = document.getElementById('game-over-message');
const resultText = document.getElementById('result-text');
const restartBtn = document.getElementById('restart-btn');
const timerEl = document.getElementById('timer'); // ✅ 타이머 요소 추가
const giveUpBtn = document.getElementById('give-up-btn'); // ✅ 포기 버튼 요소 추가

// 게임 상태 변수
let answer;
let triesLeft;
let timerInterval = null; // ✅ 타이머의 interval ID를 저장할 변수
let elapsedSeconds = 0;   // ✅ 경과 시간을 초 단위로 저장할 변수

// ✅ 타이머 업데이트 함수
function updateTimer() {
    elapsedSeconds++;
    const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
    const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');
    timerEl.textContent = `${minutes}:${seconds}`;
}

// 게임 초기화 함수
function initializeGame() {
    // 1. 정답 생성 (중복 없는 4자리 숫자)
    const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    answer = [];
    for (let i = 0; i < 4; i++) {
        const index = Math.floor(Math.random() * numbers.length);
        answer.push(numbers.splice(index, 1)[0]);
    }
    // console.log('정답:', answer.join(''));

    // 2. 변수 및 UI 초기화
    triesLeft = 10;
    triesLeftEl.textContent = triesLeft;
    historyList.innerHTML = '';
    guessInput.value = '';
    guessInput.disabled = false;
    guessBtn.disabled = false;
    giveUpBtn.disabled = false; // ✅ 포기 버튼 활성화
    gameOverMessage.classList.add('hidden');

    // ✅ 3. 타이머 초기화 및 시작
    if (timerInterval) clearInterval(timerInterval); // 기존 타이머가 있으면 제거
    elapsedSeconds = 0;
    timerEl.textContent = '00:00';
    timerInterval = setInterval(updateTimer, 1000); // 1초마다 updateTimer 함수 실행

    guessInput.focus();
}

// 추측 처리 함수
function handleGuess() {
    const guessValue = guessInput.value;

    if (guessValue.length !== 4 || isNaN(guessValue)) {
        alert('네 자리 숫자를 정확히 입력해주세요.');
        return;
    }
    const guessArray = guessValue.split('').map(Number);
    if (new Set(guessArray).size !== 4) {
        alert('중복되지 않는 숫자를 입력해주세요.');
        return;
    }

    triesLeft--;
    triesLeftEl.textContent = triesLeft;

    let strikes = 0;
    let balls = 0;
    for (let i = 0; i < 4; i++) {
        if (guessArray[i] === answer[i]) {
            strikes++;
        } else if (answer.includes(guessArray[i])) {
            balls++;
        }
    }

    const resultItem = document.createElement('li');
    const guessSpan = document.createElement('span');
    guessSpan.className = 'guess';
    guessSpan.textContent = guessValue;

    const resultSpan = document.createElement('span');
    resultSpan.className = 'result';
    if (strikes === 0 && balls === 0) {
        resultSpan.innerHTML = '<span class="result-out">OUT</span>';
    } else {
        resultSpan.innerHTML = `<span class="result-strike">${strikes}S</span> <span class="result-ball">${balls}B</span>`;
    }

    resultItem.appendChild(guessSpan);
    resultItem.appendChild(resultSpan);
    historyList.prepend(resultItem);

    if (strikes === 4) {
        endGame(true); // 승리
    } else if (triesLeft === 0) {
        endGame(false); // 패배
    }

    guessInput.value = '';
    guessInput.focus();
}

// ✅ 포기 처리 함수
function handleGiveUp() {
    endGame(false); // '패배'로 게임을 종료시켜 정답을 보여줌
}

// 게임 종료 함수
function endGame(isWin) {
    clearInterval(timerInterval); // ✅ 게임이 끝나면 타이머 정지
    guessInput.disabled = true;
    guessBtn.disabled = true;
    giveUpBtn.disabled = true; // ✅ 포기 버튼 비활성화

    if (isWin) {
        // ✅ 승리 시 걸린 시간 표시
        resultText.textContent = `🎉 정답입니다! (${timerEl.textContent} 소요) 🎉`;
    } else {
        // ✅ 패배 또는 포기 시 정답 표시
        resultText.textContent = `😥 아쉽네요... 정답은 ${answer.join('')} 였습니다.`;
    }
    gameOverMessage.classList.remove('hidden');
}

// 이벤트 리스너 연결
guessBtn.addEventListener('click', handleGuess);
giveUpBtn.addEventListener('click', handleGiveUp); // ✅ 포기 버튼 이벤트 리스너
guessInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        handleGuess();
    }
});
restartBtn.addEventListener('click', initializeGame);

// 🚀 게임 시작!
initializeGame();