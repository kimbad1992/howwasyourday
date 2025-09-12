// Supabase 클라이언트 설정
const SUPABASE_URL = 'https://ottatvdwnqfvmrzqasla.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI_NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90dGF0dmR3bnFmdm1yenFhc2xhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjAyNTEsImV4cCI6MjA3MzIzNjI1MX0.rokmTsfAqmgtCAlxGrddFyRr_awnZCHKgRHeyreWPvc';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// HTML 요소 가져오기
const fastBtn = document.getElementById('fast-btn');
const slowBtn = document.getElementById('slow-btn');
const fastProgress = document.getElementById('fast-progress');
const slowProgress = document.getElementById('slow-progress');
const fastLabel = document.getElementById('fast-label');
const slowLabel = document.getElementById('slow-label');
const totalVotesTodayEl = document.getElementById('total-votes-today');
const sameChoiceCountEl = document.getElementById('same-choice-count');
const peakHourEl = document.getElementById('peak-hour');
const slowestDayEl = document.getElementById('slowest-day');
const fastestDayEl = document.getElementById('fastest-day');

let visitorId = '';

// KST 기준 오늘 날짜 ('YYYY-MM-DD')를 반환하는 함수
function getTodayKST() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
    const kst = new Date(utc + (9 * 60 * 60 * 1000));
    return kst.toISOString().split('T')[0];
}

// 1. 투표 결과 퍼센테이지 업데이트
async function updateResults() {
    const today = getTodayKST();
    const { count: fastVotes } = await supabaseClient.from('daily_votes').select('*', { count: 'exact', head: true }).eq('vote_date', today).eq('vote_choice', 'fast');
    const { count: slowVotes } = await supabaseClient.from('daily_votes').select('*', { count: 'exact', head: true }).eq('vote_date', today).eq('vote_choice', 'slow');

    const totalVotes = fastVotes + slowVotes;
    const fastPercent = totalVotes === 0 ? 0 : Math.round((fastVotes / totalVotes) * 100);
    const slowPercent = 100 - fastPercent;

    fastProgress.style.width = `${fastPercent}%`;
    slowProgress.style.width = `${slowPercent}%`;
    fastLabel.textContent = `빨리 갔다 ${fastPercent}%`;
    slowLabel.textContent = `늦게 갔다 ${slowPercent}%`;
}

// 2. 새로운 통계 정보 업데이트
async function updateStatistics(userChoice) {
    const today = getTodayKST();
    const { data: todayVotes, error: todayVotesError } = await supabaseClient.from('daily_votes').select('vote_choice, created_at').eq('vote_date', today);
    if (todayVotesError) {
        console.error("오늘의 투표 데이터를 가져오는 데 실패했습니다.", todayVotesError);
        return;
    }

    const totalVotesToday = todayVotes.length;
    totalVotesTodayEl.textContent = `오늘 총 ${totalVotesToday}명이 투표했어요.`;
    if(userChoice) {
        const sameChoiceCount = todayVotes.filter(v => v.vote_choice === userChoice).length;
        sameChoiceCountEl.textContent = `당신을 포함해 ${sameChoiceCount}명이 같은 생각을 했네요!`;
    } else {
        sameChoiceCountEl.textContent = '투표하고 다른 사람들의 생각을 확인해보세요!';
    }

    if (totalVotesToday > 0) {
        const hours = todayVotes.map(v => (new Date(v.created_at).getUTCHours() + 9) % 24);
        const hourCounts = hours.reduce((acc, hour) => {
            acc[hour] = (acc[hour] || 0) + 1;
            return acc;
        }, {});
        let maxVotes = 0, peakHour = -1;
        for (const hour in hourCounts) {
            if (hourCounts[hour] > maxVotes) {
                maxVotes = hourCounts[hour];
                peakHour = parseInt(hour, 10);
            }
        }
        peakHourEl.textContent = `현재까지 ${peakHour}시-${peakHour+1}시 사이에 가장 많이 투표했어요. ⏰`;
    } else {
        peakHourEl.textContent = '오늘의 첫 투표를 기다리고 있어요!';
    }

    const { data: allVotes, error: allVotesError } = await supabaseClient.from('daily_votes').select('vote_choice, vote_date');
    if(allVotesError) {
        console.error("전체 투표 데이터를 가져오는 데 실패했습니다.", allVotesError);
        return;
    }
    
    const weeklyStats = {};
    const dayOfWeekKR = ["일", "월", "화", "수", "목", "금", "토"];
    dayOfWeekKR.forEach(day => { weeklyStats[day] = { fast: 0, slow: 0, total: 0 }; });

    allVotes.forEach(vote => {
        const dayName = dayOfWeekKR[new Date(vote.vote_date).getUTCDay()];
        weeklyStats[dayName][vote.vote_choice]++;
        weeklyStats[dayName].total++;
    });

    let slowestDay = '', fastestDay = '';
    let maxSlowRatio = -1, maxFastRatio = -1;

    for (const day in weeklyStats) {
        const stats = weeklyStats[day];
        if (stats.total > 0) {
            const slowRatio = stats.slow / stats.total;
            const fastRatio = stats.fast / stats.total;
            if (slowRatio > maxSlowRatio) {
                maxSlowRatio = slowRatio;
                slowestDay = day;
            }
            if (fastRatio > maxFastRatio) {
                maxFastRatio = fastRatio;
                fastestDay = day;
            }
        }
    }
    
    if (slowestDay) slowestDayEl.textContent = `사람들은 ${slowestDay}요일이 가장 시간이 안 간다고 생각해요. 🐢`;
    if (fastestDay) fastestDayEl.textContent = `사람들은 ${fastestDay}요일이 가장 시간이 빨리 간다고 생각해요. 🚀`;
}

// 3. 투표 처리 함수
async function handleVote(choice) {
    if (!visitorId) {
        alert('고유 방문자 ID를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
        return;
    }
    const today = getTodayKST();
    const { data, error: checkError } = await supabaseClient.from('daily_votes').select('id').eq('visitor_id', visitorId).eq('vote_date', today);

    if (checkError) {
        alert('오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        console.error(checkError);
        return;
    }
    if (data.length > 0) {
        alert('오늘은 이미 투표하셨습니다. 🗳️');
        return;
    }

    const { error: insertError } = await supabaseClient.from('daily_votes').insert([{ visitor_id: visitorId, vote_date: today, vote_choice: choice }]);

    if (insertError) {
        alert('투표 기록 중 오류가 발생했습니다.');
        console.error(insertError);
    } else {
        alert('투표해주셔서 감사합니다!');
        disableButtons();
        await updateResults();
        await updateStatistics(choice);
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

// 파비콘을 가져와서 링크에 추가하는 함수
function fetchAndSetFavicons() {
    const links = document.querySelectorAll('#external-links a');
    links.forEach(link => {
        const domain = new URL(link.href).origin;
        const faviconUrl = `https://www.google.com/s2/favicons?sz=32&domain_url=${domain}`;
        const img = document.createElement('img');
        img.src = faviconUrl;
        img.className = 'favicon';
        img.alt = '';
        link.appendChild(img);
    });
}

// 4. 페이지가 로드될 때 실행되는 초기화 함수 (수정됨)
async function initialize() {
    // UI 관련 작업 먼저 실행
    fetchAndSetFavicons();
    
    try {
        // FingerprintJS로 방문자 ID 가져오기
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        visitorId = result.visitorId;

        // visitorId가 성공적으로 생성되었는지 확인
        if (visitorId) {
            // 오늘 이미 투표했는지 DB에서 확인
            const { data, error } = await supabaseClient
                .from('daily_votes')
                .select('vote_choice')
                .eq('visitor_id', visitorId)
                .eq('vote_date', getTodayKST());

            if (error) {
                console.error("투표 기록 확인 중 오류 발생", error);
            }

            // 투표 기록이 있으면 버튼 비활성화 및 통계 업데이트
            if (data && data.length > 0) {
                disableButtons();
                await updateStatistics(data[0].vote_choice);
            } else {
                // 투표 기록이 없으면 기본 통계만 보여주기
                await updateStatistics(null);
            }
        } else {
            // FingerprintJS ID 생성 실패 시
            await updateStatistics(null);
        }
    } catch (error) {
        console.error("FingerprintJS 초기화 중 오류 발생:", error);
        // 오류 발생 시에도 기본 통계는 보여주도록 처리
        await updateStatistics(null);
    }
    
    // 현재 투표 결과(%)는 항상 마지막에 불러오기
    await updateResults();
}

// 이벤트 리스너 연결
fastBtn.addEventListener('click', () => handleVote('fast'));
slowBtn.addEventListener('click', () => handleVote('slow'));

// 🚀 페이지 로딩 시작!
initialize();
    const fastPercent = totalVotes === 0 ? 0 : Math.round((fastVotes / totalVotes) * 100);
    const slowPercent = 100 - fastPercent;

    fastProgress.style.width = `${fastPercent}%`;
    slowProgress.style.width = `${slowPercent}%`;
    fastLabel.textContent = `빨리 갔다 ${fastPercent}%`;
    slowLabel.textContent = `늦게 갔다 ${slowPercent}%`;
}

// 2. 새로운 통계 정보 업데이트 (수정된 버전)
async function updateStatistics(userChoice) {
    // --- 오늘의 통계 ---
    const today = getTodayKST();
    const { data: todayVotes, error: todayVotesError } = await supabaseClient
        .from('daily_votes')
        .select('vote_choice, created_at')
        .eq('vote_date', today);

    if (todayVotesError) {
        console.error("오늘의 투표 데이터를 가져오는 데 실패했습니다.", todayVotesError);
        return;
    }

    // 1. 오늘 총 투표 수 & 나와 같은 선택
    const totalVotesToday = todayVotes.length;
    totalVotesTodayEl.textContent = `오늘 총 ${totalVotesToday}명이 투표했어요.`;

    if(userChoice) {
        const sameChoiceCount = todayVotes.filter(v => v.vote_choice === userChoice).length;
        sameChoiceCountEl.textContent = `당신을 포함해 ${sameChoiceCount}명이 같은 생각을 했네요!`;
    } else {
        sameChoiceCountEl.textContent = '투표하고 다른 사람들의 생각을 확인해보세요!';
    }

    // 2. 피크 타임 (KST 기준)
    if (totalVotesToday > 0) {
        // ✅ 바로 이 부분의 괄호 위치를 수정했습니다.
        const hours = todayVotes.map(v => (new Date(v.created_at).getUTCHours() + 9) % 24);

        const hourCounts = hours.reduce((acc, hour) => {
            acc[hour] = (acc[hour] || 0) + 1;
            return acc;
        }, {});

        let maxVotes = 0, peakHour = -1;
        for (const hour in hourCounts) {
            if (hourCounts[hour] > maxVotes) {
                maxVotes = hourCounts[hour];
                peakHour = parseInt(hour, 10);
            }
        }
        peakHourEl.textContent = `현재까지 ${peakHour}시-${peakHour+1}시 사이에 가장 많이 투표했어요. ⏰`;
    } else {
        peakHourEl.textContent = '오늘의 첫 투표를 기다리고 있어요!';
    }

    // --- 전체 기간 통계 ---
    const { data: allVotes, error: allVotesError } = await supabaseClient.from('daily_votes').select('vote_choice, vote_date');

    if(allVotesError) {
        console.error("전체 투표 데이터를 가져오는 데 실패했습니다.", allVotesError);
        return;
    }

    const weeklyStats = {};
    const dayOfWeekKR = ["일", "월", "화", "수", "목", "금", "토"];
    dayOfWeekKR.forEach(day => {
        weeklyStats[day] = { fast: 0, slow: 0, total: 0 };
    });

    allVotes.forEach(vote => {
        const dayName = dayOfWeekKR[new Date(vote.vote_date).getUTCDay()];
        weeklyStats[dayName][vote.vote_choice]++;
        weeklyStats[dayName].total++;
    });

    let slowestDay = '', fastestDay = '';
    let maxSlowRatio = -1, maxFastRatio = -1;

    for (const day in weeklyStats) {
        const stats = weeklyStats[day];
        if (stats.total > 0) {
            const slowRatio = stats.slow / stats.total;
            const fastRatio = stats.fast / stats.total;

            if (slowRatio > maxSlowRatio) {
                maxSlowRatio = slowRatio;
                slowestDay = day;
            }
            if (fastRatio > maxFastRatio) {
                maxFastRatio = fastRatio;
                fastestDay = day;
            }
        }
    }

    if (slowestDay) slowestDayEl.textContent = `사람들은 ${slowestDay}요일이 가장 시간이 안 간다고 생각해요. 🐢`;
    if (fastestDay) fastestDayEl.textContent = `사람들은 ${fastestDay}요일이 가장 시간이 빨리 간다고 생각해요. 🚀`;
}


// 3. 투표 처리 함수 (변경 없음)
async function handleVote(choice) {
    if (!visitorId) {
        alert('고유 방문자 ID를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
        return;
    }
    const today = getTodayKST();
    const { data, error: checkError } = await supabaseClient.from('daily_votes').select('id').eq('visitor_id', visitorId).eq('vote_date', today);

    if (checkError) {
        alert('오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        console.error(checkError);
        return;
    }
    if (data.length > 0) {
        alert('오늘은 이미 투표하셨습니다. 🗳️');
        return;
    }

    const { error: insertError } = await supabaseClient.from('daily_votes').insert([{ visitor_id: visitorId, vote_date: today, vote_choice: choice }]);

    if (insertError) {
        alert('투표 기록 중 오류가 발생했습니다.');
        console.error(insertError);
    } else {
        alert('투표해주셔서 감사합니다!');
        disableButtons();
        await updateResults();
        await updateStatistics(choice);
    }
}

// 투표 버튼 비활성화 함수 (변경 없음)
function disableButtons() {
    fastBtn.disabled = true;
    slowBtn.disabled = true;
    fastBtn.style.cursor = 'not-allowed';
    slowBtn.style.cursor = 'not-allowed';
    fastBtn.style.opacity = '0.6';
    slowBtn.style.opacity = '0.6';
}

// 4. 페이지 로드 시 실행 함수 (변경 없음)
async function initialize() {
    // ✅ 파비콘을 동적으로 추가하는 함수 호출
    fetchAndSetFavicons();

    const fp = await FingerprintJS.load();
    const result = await fp.get();
    visitorId = result.visitorId;

    const { data, error } = await supabaseClient.from('daily_votes').select('vote_choice').eq('visitor_id', visitorId).eq('vote_date', getTodayKST());

    if (error) console.error("투표 기록 확인 중 오류 발생", error);

    if (data && data.length > 0) {
        disableButtons();
        await updateStatistics(data[0].vote_choice);
    } else {
        await updateStatistics(null);
    }
    await updateResults();
}


// ✅ 파비콘을 가져와서 링크에 추가하는 새로운 함수
function fetchAndSetFavicons() {
    // external-links 영역 안의 모든 a 태그를 선택
    const links = document.querySelectorAll('#external-links a');

    links.forEach(link => {
        // 링크의 도메인을 추출 (예: https://www.google.com)
        const domain = new URL(link.href).origin;

        // Google의 S2 Converter API를 사용해 파비콘 이미지 URL 생성
        const faviconUrl = `https://www.google.com/s2/favicons?sz=32&domain_url=${domain}`;

        // img 태그 생성
        const img = document.createElement('img');
        img.src = faviconUrl;
        img.className = 'favicon';
        img.alt = ''; // 스크린 리더가 불필요하게 읽지 않도록

        // 링크의 맨 뒤에 생성된 이미지 태그 추가
        link.appendChild(img);
    });
}

// 이벤트 리스너 연결
fastBtn.addEventListener('click', () => handleVote('fast'));
slowBtn.addEventListener('click', () => handleVote('slow'));

// 🚀 페이지 로딩 시작!
initialize();
