// ============================================================
// member.js - Tilda 최적화 최종 버전
// ============================================================

const MEMBER_API_URL = 'https://script.google.com/macros/s/AKfycbxPJQR4jrL0aOwqugPV03L0uSaGQ7M4Ofb-uYKWT-PVrQhLcsCi4xFtgjinmBMXG_uQ6A/exec';
const STORAGE_KEY = 'sat_member_session';

let currentUser = null;
let currentToken = null;
let isInitialized = false;

// ============================================================
// 1. 초기화 (무조건 body 맨 앞에 상태바 생성)
// ============================================================
function initMemberSystem() {
  if (isInitialized) {
    console.log('ℹ️ 이미 초기화됨');
    return;
  }
  isInitialized = true;
  
  console.log('🔐 최종 버전 member.js 실행');

  // 1) 상태바를 body 맨 앞에 강제 삽입 (헤더 무시)
  const existingBar = document.getElementById('userStatusBar');
  if (existingBar) existingBar.remove();

  const bar = document.createElement('div');
  bar.id = 'userStatusBar';
  bar.style.cssText = `
    position: relative;
    z-index: 9999;
    background: #1a2a4a;
    padding: 10px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #fff;
    font-size: 14px;
    border-bottom: 3px solid #f5a623;
    width: 100%;
    box-sizing: border-box;
    font-family: 'Segoe UI', sans-serif;
  `;
  bar.innerHTML = `
    <div>
      👤 <span id="userNameDisplay" style="font-weight:600;">비회원</span>
      <span id="userStatusDisplay" style="margin-left:12px;font-size:12px;color:#f39c12;">로그인이 필요합니다</span>
    </div>
    <div>
      <button id="loginBtn" style="background:#f5a623;border:none;color:#fff;padding:8px 20px;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;">로그인</button>
      <button id="registerBtn" style="background:transparent;border:1px solid #f5a623;color:#f5a623;padding:8px 20px;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;margin-left:8px;">회원가입</button>
      <button id="logoutBtn" style="display:none;background:#e74c3c;border:none;color:#fff;padding:8px 20px;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;margin-left:8px;">로그아웃</button>
    </div>
  `;

  // body 맨 앞에 삽입 (무조건 보임)
  document.body.insertBefore(bar, document.body.firstChild);
  console.log('✅ 상태바 생성 완료 (body 맨 앞)');

  // 2) 버튼 이벤트 연결
  document.getElementById('loginBtn').addEventListener('click', showLoginModal);
  document.getElementById('registerBtn').addEventListener('click', showRegisterModal);
  document.getElementById('logoutBtn').addEventListener('click', logout);

  // 3) 저장된 세션 복원
  checkSession();
}

// ============================================================
// 2. 세션 복원
// ============================================================
function checkSession() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.token && data.user) {
        currentToken = data.token;
        currentUser = data.user;
        updateUI(true);
        console.log('✅ 세션 복원:', currentUser.name);
        return;
      }
    } catch(e) {}
  }
  updateUI(false);
}

// ============================================================
// 3. UI 업데이트 (버튼/이름/상태)
// ============================================================
function updateUI(loggedIn) {
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const userName = document.getElementById('userNameDisplay');
  const userStatus = document.getElementById('userStatusDisplay');

  if (!loginBtn) {
    console.warn('⚠️ UI 요소 없음 - 아직 DOM 준비 안 됨');
    return;
  }

  if (loggedIn && currentUser) {
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
    userName.textContent = currentUser.name || currentUser.email;
    userStatus.textContent = '✅ 구독중';
    userStatus.style.color = '#2ecc71';
    enableQuiz(true);
    console.log('✅ 로그인 UI 적용됨');
  } else {
    loginBtn.style.display = 'inline-block';
    registerBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'none';
    userName.textContent = '비회원';
    userStatus.textContent = '로그인이 필요합니다';
    userStatus.style.color = '#f39c12';
    enableQuiz(false);
    console.log('❌ 비회원 UI 적용됨');
  }
}

// ============================================================
// 4. START 버튼 활성화/비활성화
// ============================================================
function enableQuiz(enabled) {
  const startBtn = document.getElementById('startQuizBtn');
  if (startBtn) {
    startBtn.disabled = !enabled;
    startBtn.style.opacity = enabled ? '1' : '0.5';
    startBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
    startBtn.title = enabled ? '' : '로그인 후 이용 가능';
  }
}

// ============================================================
// 5. API 호출 (JSON 방식 - 수정 완료)
// ============================================================
function callAPI(action, params = {}) {
  const url = MEMBER_API_URL;
  
  console.log('📤 API 요청:', action, params);

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...params })
  })
  .then(res => {
    if (!res.ok) {
      throw new Error('HTTP 오류: ' + res.status);
    }
    return res.json();
  })
  .then(data => {
    console.log('📥 API 응답:', data);
    if (data.status === 'error') {
      throw new Error(data.message || '서버 오류');
    }
    return data;
  })
  .catch(err => {
    console.error('🔥 API 호출 실패:', err);
    alert('❌ 서버 통신 오류: ' + err.message);
    throw err;
  });
}

// ============================================================
// 6. 로그인 (프롬프트 방식 - 모달 대비 간단함)
// ============================================================
function showLoginModal() {
  const email = prompt('📧 이메일을 입력하세요:');
  if (!email) return;
  const pin = prompt('🔑 비밀번호(PIN)를 입력하세요:');
  if (!pin) return;

  callAPI('login', { email, pin })
    .then(res => {
      if (res.status === 'success') {
        currentToken = res.token;
        currentUser = res.user;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: currentToken, user: currentUser }));
        updateUI(true);
        alert('✅ ' + currentUser.name + '님, 환영합니다!');
      } else {
        alert('❌ ' + (res.message || '로그인 실패'));
      }
    })
    .catch(err => {
      alert('❌ 오류: ' + err.message);
    });
}

// ============================================================
// 7. 회원가입 (프롬프트 방식)
// ============================================================
function showRegisterModal() {
  const name = prompt('📝 이름을 입력하세요:');
  if (!name) return;
  const email = prompt('📧 이메일을 입력하세요:');
  if (!email) return;
  const pin = prompt('🔑 비밀번호(PIN)를 입력하세요 (4자리 이상):');
  if (!pin || pin.length < 4) {
    alert('비밀번호는 4자리 이상이어야 합니다.');
    return;
  }

  callAPI('register', { name, email, pin })
    .then(res => {
      if (res.status === 'success') {
        alert('✅ ' + res.message);
        showLoginModal();
      } else {
        alert('❌ ' + (res.message || '회원가입 실패'));
      }
    })
    .catch(err => {
      alert('❌ 오류: ' + err.message);
    });
}

// ============================================================
// 8. 로그아웃
// ============================================================
function logout() {
  if (!confirm('로그아웃 하시겠습니까?')) return;
  localStorage.removeItem(STORAGE_KEY);
  currentToken = null;
  currentUser = null;
  updateUI(false);
  alert('로그아웃 되었습니다.');
}

// ============================================================
// 9. main.js에서 사용할 공개 함수
// ============================================================
function isUserAuthorized() {
  if (!currentUser) {
    alert('⚠️ 로그인이 필요합니다.');
    return false;
  }
  if (currentUser.payment_status !== 'active') {
    alert('⚠️ 구독 상태가 활성화되지 않았습니다.');
    return false;
  }
  if (currentUser.expired_date) {
    const expired = new Date(currentUser.expired_date);
    if (expired < new Date()) {
      alert('⚠️ 구독이 만료되었습니다.');
      return false;
    }
  }
  return true;
}

function getCurrentUser() {
  return currentUser;
}

// ============================================================
// 10. 전역 노출
// ============================================================
window.initMemberSystem = initMemberSystem;
window.isUserAuthorized = isUserAuthorized;
window.getCurrentUser = getCurrentUser;
window.showLoginModal = showLoginModal;
window.showRegisterModal = showRegisterModal;

console.log('✅ 최종 member.js 로드 완료!');
