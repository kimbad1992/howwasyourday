// Supabase 클라이언트 설정 (✅ 변수 이름 변경!)
const SUPABASE_URL = 'https://ottatvdwnqfvmrzqasla.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90dGF0dmR3bnFmdm1yenFhc2xhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjAyNTEsImV4cCI6MjA3MzIzNjI1MX0.rokmTsfAqmgtCAlxGrddFyRr_awnZCHKgRHeyreWPvc';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// HTML 요소 가져오기
const fastBtn = document.getElementById('fast-btn');
const slowBtn = document.getElementById('slow-btn');
const fastProgress = document.getElementById('fast-progress');
const slowProgress = document.getElementById('slow-progress');
const fastLabel = document.getElementById('fast-label');
const slowLabel = document.getElementById('slow-label');

let visitorId = ''; // 방문자 ID를 저장할 변수

// KST 기준 오늘 날짜 ('YYYY-MM-DD')를 반환하는 함수
function getTodayKST() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
    const kst = new Date(utc + (9 * 60 * 60 * 1000));
    return kst.toISOString().split('T')[0];
}

// 1. 투표 결과 퍼센테이지를 화면에 업데이트하는 함수
async function updateResults() {
    const today = getTodayKST();

    // 오늘 날짜의 'fast' 투표 수 세기 (✅ supabaseClient로 변경)
    const { count: fastVotes, error: fastError } = await supabaseClient
        .from('daily_votes')
        .select('*', { count: 'exact', head: true })
        .eq('vote_date', today)
        .eq('vote_choice', 'fast');

    // 오늘 날짜의 'slow' 투표 수 세기 (✅ supabaseClient로 변경)
    const { count: slowVotes, error: slowError } = await supabaseClient
        .from('daily_votes')
        .select('*', { count: 'exact', head: true })
        .eq('vote_date', today)
        .eq('vote_choice', 'slow');
        
    if (fastError || slowError) {
        console.error('결과를 불러오는 데 실패했습니다.', fastError || slowError);
        return;
    }

    const totalVotes = fastVotes + slowVotes;
    const fastPercent = totalVotes === 0 ? 0 : Math.round((fastVotes / totalVotes) * 100);
    const slowPercent = 100 - fastPercent;

    fastProgress.style.width = `${fastPercent}%`;
    slowProgress.style.width = `${slowPercent}%`;
    fastLabel.textContent = `빨리 갔다 ${fastPercent}%`;
    slowLabel.textContent = `늦게 갔다 ${slowPercent}%`;
}

// 2. 투표를 처리하는 메인 함수
async function handleVote(choice) {
    if (!visitorId) {
        alert('고유 방문자 ID를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
        return;
    }

    const today = getTodayKST();

    // 이 방문자가 오늘 이미 투표했는지 확인 (✅ supabaseClient로 변경)
    const { data, error: checkError } = await supabaseClient
        .from('daily_votes')
        .select('id')
        .eq('visitor_id', visitorId)
        .eq('vote_date', today);

    if (checkError) {
        alert('오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        console.error(checkError);
        return;
    }

    if (data.length > 0) {
        alert('오늘은 이미 투표하셨습니다. 🗳️');
        return;
    }

    // 투표 기록을 데이터베이스에 삽입 (✅ supabaseClient로 변경)
    const { error: insertError } = await supabaseClient
        .from('daily_votes')
        .insert([{ 
            visitor_id: visitorId, 
            vote_date: today, 
            vote_choice: choice 
        }]);

    if (insertError) {
        alert('투표 기록 중 오류가 발생했습니다.');
        console.error(insertError);
    } else {
        alert('투표해주셔서 감사합니다!');
        disableButtons();
        updateResults(); // 투표 후 즉시 결과 업데이트
    }
}

// 투표 버튼 비활성화 함수
function disableButtons() {
    fastBtn.disabled = true;
    slowBtn.disabled = true;
    fastBtn.style.cursor = 'not-allowed';
    slowBtn.style.cursor = 'not-allowed';
    fastBtn.style.opacity = '0.6';
    slowBtn.style.opacity = '0.6';
}

// 3. 페이지가 로드될 때 실행되는 초기화 함수
async function initialize() {
    // FingerprintJS를 이용해 방문자 ID 가져오기
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    visitorId = result.visitorId;
    console.log('Your visitor ID:', visitorId);

    // 오늘 이미 투표했는지 확인하고 투표했다면 버튼 비활성화 (✅ supabaseClient로 변경)
    const { data } = await supabaseClient
        .from('daily_votes')
        .select('id')
        .eq('visitor_id', visitorId)
        .eq('vote_date', getTodayKST());

    if (data && data.length > 0) {
        disableButtons();
    }
    
    // 현재 투표 결과 불러오기
    updateResults();
}

// 이벤트 리스너 연결
fastBtn.addEventListener('click', () => handleVote('fast'));
slowBtn.addEventListener('click', () => handleVote('slow'));

// 🚀 페이지 로딩 시작!
initialize();