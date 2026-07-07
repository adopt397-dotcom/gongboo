// ============================================================
// member.js - 초간단 버전 (무조건 동작)
// ============================================================

const MEMBER_API_URL = 'https://script.google.com/macros/s/AKfycby9g0f27gyjUuHdnw9-tZxr8Qmhbdm_864Ons0Ai6h1z87LOf0nYZBdWlAiJ_lgnpyB/exec';
const STORAGE_KEY = 'sat_member_session';

let currentUser = null;
let currentToken = null;

// ============================================================
// 초기화 함수 (페이지 로드 시 실행)
// ============================================================
function initMemberSystem() {
  console.log('🔐 초간단 member.js 실행됨!');
  
  // 1. 상태바 강제 생성 (헤더 상관없이 body 맨 위에)
  const bar = document.createElement('div');
  bar.id = 'userStatusBar';
  bar.style.cssText = `
    background: #1a2a4a;
    padding: 10px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #fff;
    font-size: 14px;
    border-bottom: 2px solid #f5a623;
    width: 100%;
    box-sizing: border-box;
  `;
  bar.innerHTML = `
    <div>
      👤 <span id="userNameDisplay">비회원</span>
      <span id="userStatusDisplay" style="margin-left:10px;font-size:12px;color:#f39c12;">로그인이 필요합니다</span>
    </div>
    <div>
      <button id="loginBtn" style="background:#f5a623;border:none;color:#fff;padding:8px 20px;border-radius:8px;cursor:pointer;font-weight:600;">로그인</button>
      <button id="registerBtn" style="background:transparent;border:1px solid #f5a623;color:#f5a623;padding:8px 20px;border-radius:8px;cursor:pointer;font-weight:600;margin-left:8px;">회원가입</button>
      <button id="logoutBtn" style="display:none;background:#e74c3c;border:none;color:#fff;padding:8px 20px;border-radius:8px;cursor:pointer;font-weight:600;margin-left:8px;">로그아웃</button>
    </div>
  `;
  
  // body 맨 앞에 삽입 (무조건 보임)
  document.body.insertBefore(bar, document.body.firstChild);
  console.log('✅ 상태바 생성 완료! (body 맨 앞)');
  
  // 2. 버튼 이벤트 연결
  document.getElementById('loginBtn').addEventListener('click', function() {
    showLoginModal();
  });
  document.getElementById('registerBtn').addEventListener('click', function() {
    showRegisterModal();
  });
  document.getElementById('logoutBtn').addEventListener('click', function() {
    logout();
  });
  
  // 3. 저장된 세션 확인
  checkSession();
}

// ============================================================
// 세션 확인
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
// UI 업데이트
// ============================================================
function updateUI(loggedIn) {
  console.log('🔄 updateUI:', loggedIn);
  
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const userName = document.getElementById('userNameDisplay');
  const userStatus = document.getElementById('userStatusDisplay');
  
  if (loggedIn && currentUser) {
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
    userName.textContent = currentUser.name || currentUser.email;
    userStatus.textContent = '✅ 구독중';
    userStatus.style.color = '#2ecc71';
    enableQuiz(true);
  } else {
    loginBtn.style.display = 'inline-block';
    registerBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'none';
    userName.textContent = '비회원';
    userStatus.textContent = '로그인이 필요합니다';
    userStatus.style.color = '#f39c12';
    enableQuiz(false);
  }
}

// ============================================================
// 퀴즈 활성화
// ============================================================
function enableQuiz(enabled) {
  const startBtn = document.getElementById('startQuizBtn');
  if (startBtn) {
    startBtn.disabled = !enabled;
    startBtn.style.opacity = enabled ? '1' : '0.5';
    startBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
  }
}

// ============================================================
// API 호출
// ============================================================
function callAPI(action, params = {}) {
  const formData = new URLSearchParams();
  formData.append('action', action);
  Object.keys(params).forEach(key => formData.append(key, params[key]));
  
  return fetch(MEMBER_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString()
  }).then(res => res.json());
}

// ============================================================
// 로그인
// ============================================================
function showLoginModal() {
  // 간단한 프롬프트로 대체 (모달 대신)
  const email = prompt('이메일을 입력하세요:');
  if (!email) return;
  const pin = prompt('비밀번호(PIN)를 입력하세요:');
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
// 회원가입
// ============================================================
function showRegisterModal() {
  const name = prompt('이름을 입력하세요:');
  if (!name) return;
  const email = prompt('이메일을 입력하세요:');
  if (!email) return;
  const pin = prompt('비밀번호(PIN)를 입력하세요 (4자리 이상):');
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
// 로그아웃
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
// 외부 호출용 (main.js에서 사용)
// ============================================================
function isUserAuthorized() {
  if (!currentUser) return false;
  if (currentUser.payment_status !== 'active') {
    alert('⚠️ 구독 상태가 활성화되지 않았습니다.');
    return false;
  }
  return true;
}

function getCurrentUser() {
  return currentUser;
}

// ============================================================
// 전역 노출
// ============================================================
window.initMemberSystem = initMemberSystem;
window.isUserAuthorized = isUserAuthorized;
window.getCurrentUser = getCurrentUser;
window.showLoginModal = showLoginModal;
window.showRegisterModal = showRegisterModal;

console.log('✅ 초간단 member.js 로드 완료!');
