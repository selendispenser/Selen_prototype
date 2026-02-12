// [1] 초기 설정
const KAKAO_KEY = '9693a2be8ecf395d39691e85a32bc174'; // 본인의 키 입력
let members = [];

// 카카오 초기화
if (!Kakao.isInitialized()) {
    Kakao.init(KAKAO_KEY);
}

// [2] 데이터 로드 로직 (비교 연산 포함)
async function initData() {
    const savedData = localStorage.getItem('guild_db');
    
    if (savedData) {
        members = JSON.parse(savedData);
        render();
    } else {
        await forceSyncWithJSON(false); // 저장된 게 없으면 JSON에서 새로 가져옴
    }
}

// JSON 파일과 동기화하는 핵심 로직
async function forceSyncWithJSON(isManual = true) {
    if (isManual && !confirm("체크 상태가 초기화되고 JSON 파일 명단으로 업데이트됩니다. 진행할까요?")) return;

    try {
        // members.json과 people_member.json을 병렬로 호출
        const [resMembers, resExclude] = await Promise.all([
            fetch('member.json').then(res => res.json()),
            fetch('people_member.json').then(res => res.json()).catch(() => []) // 파일 없으면 빈 배열 처리
        ]);

        const excludeSet = new Set(resExclude);
        
        // 비교 로직: excludeSet에 이름이 있으면 checked = false
        members = resMembers.map(name => ({
            name: name,
            checked: !excludeSet.has(name)
        }));

        save();
        render();
        if(isManual) alert("동기화 완료!");
    } catch (error) {
        console.error("데이터 로딩 실패:", error);
        alert("JSON 파일을 확인해주세요.");
    }
}

// [3] 기능 함수들
function render() {
    const listContainer = document.getElementById('memberList');
    listContainer.innerHTML = '';

    members.forEach((m, i) => {
        const row = document.createElement('div');
        row.className = 'member-row';
        row.innerHTML = `
            <input type="checkbox" id="chk-${i}" ${m.checked ? 'checked' : ''}>
            <span>${m.name}</span>
            <button onclick="removeMember(${i})" style="color:#cbd5e1; border:none; background:none; cursor:pointer;">&times;</button>
        `;
        
        // 체크박스 상태 변경 이벤트
        row.querySelector('input').addEventListener('change', (e) => {
            members[i].checked = e.target.checked;
            updateStats();
            save();
        });
        
        listContainer.appendChild(row);
    });
    updateStats();
}

function addMember() {
    const input = document.getElementById('nameInput');
    const name = input.value.trim();
    if (name) {
        members.push({ name, checked: true });
        input.value = '';
        render();
        save();
    }
}

function removeMember(i) {
    members.splice(i, 1);
    render();
    save();
}

function toggleAll(status) {
    members.forEach(m => m.checked = status);
    render();
    save();
}

function updateStats() {
    const count = members.filter(m => m.checked).length;
    document.getElementById('statText').innerText = `참여 예정: ${count}명`;
}

function save() {
    localStorage.setItem('guild_db', JSON.stringify(members));
}

// [4] 추첨 및 공유
function draw() {
    const pool = members.filter(m => m.checked).map(m => m.name);
    if (pool.length < 2) return alert('추첨을 위해 최소 2명을 체크해주세요.');

    // Fisher-Yates Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const winners = pool.slice(0, 2);

    document.getElementById('winnerNames').innerText = winners.join(', ');
    document.getElementById('result-display').style.display = 'block';
    document.getElementById('kakaoBtn').style.display = 'block';

    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
}
function share() {
    const winners = document.getElementById('winnerNames').innerText;
    const currentUrl = window.location.href; // 현재 접속 중인 전체 주소
    
    // 이미지 절대 경로 생성
    const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
    const fullImageUrl = baseUrl + 'assets/checked.png';

    Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
            title: '🔥 이번 주 길드 이벤트 당첨자 🔥',
            description: `축하합니다! 당첨자: ${winners}`,
            imageUrl: fullImageUrl,
            link: {
                mobileWebUrl: currentUrl, // 모바일용 주소
                webUrl: currentUrl        // PC용 주소 (이게 있어야 PC 카톡에서 열림)
            }
        },
        buttons: [
            {
                title: '결과 확인하기',
                link: {
                    mobileWebUrl: currentUrl,
                    webUrl: currentUrl
                }
            }
        ]
    });
}

// 초기 실행
initData();