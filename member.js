// ============================================================
// BLOCK 0000: 설정 (CONFIG)
// ============================================================
const MEMBER_API_URL = 'https://script.google.com/macros/s/AKfycby9g0f27gyjUuHdnw9-tZxr8Qmhbdm_864Ons0Ai6h1z87LOf0nYZBdWlAiJ_lgnpyB/exec';
const STORAGE_KEY = 'sat_member_session';

// ============================================================
// BLOCK 0100: 상태 관리 (STATE) - 수정 완료
// ============================================================
let currentUser = null;
let currentToken = null;
let _memberInitialized = false;  // ← 이 줄 추가!

let memberUI = {
  statusBar: null,
  loginModal: null,
  registerModal: null,
  profileModal: null,
  adminModal: null
};

// ============================================================
// BLOCK 0200: 초기화 함수 (INIT) - 강제 실행 버전
// ============================================================
function initMemberSystem() {
  console.log('🔐 회원 시스템 초기화 중...');
  
  // DOM이 준비될 때까지 최대 3초 대기 (안전장치)
  let attempts = 0;
  const maxAttempts = 30; // 100ms * 30 = 3초
  
  function tryInit() {
    attempts++;
    console.log(`📌 초기화 시도 ${attempts}회`);
    
    // 1. 상태바 생성 시도
    createStatusBar();
    
    // 2. 상태바가 실제로 생성되었는지 확인
    const statusBar = document.getElementById('userStatusBar');
    if (statusBar) {
      console.log('✅ 상태바 생성 확인됨!');
      createModals();
      checkSession();
      return;
    }
    
    // 3. 아직 생성 안 되었고, 시도 횟수가 남았으면 재시도
    if (attempts < maxAttempts) {
      console.log(`⏳ 상태바 아직 안 보임, ${attempts}회 재시도 예정...`);
      setTimeout(tryInit, 100);
    } else {
      console.error('❌ 3초가 지나도 상태바가 생성되지 않았습니다.');
      // 마지막 수단: body 맨 앞에 직접 추가
      const bar = document.createElement('div');
      bar.id = 'userStatusBar';
      bar.style.cssText = 'background:#1a2a4a;padding:8px 20px;color:#fff;text-align:center;';
      bar.innerHTML = '⚠️ 회원 시스템 오류 - 새로고침 해주세요';
      document.body.insertBefore(bar, document.body.firstChild);
    }
  }
  
  // 바로 실행 (DOM이 준비되지 않았을 수 있으니 약간 지연)
  setTimeout(tryInit, 50);
}

// ============================================================
// BLOCK 0300: 상단 상태바 생성 (STATUS BAR) - 수정 완료
// ============================================================
function createStatusBar() {
  console.log('📍 createStatusBar 실행 중...');
  
  // 헤더 찾기 (없으면 body에 추가)
  const header = document.querySelector('.quiz-header');
  
  const bar = document.createElement('div');
  bar.id = 'userStatusBar';
  bar.style.cssText = `
    background: #1a2a4a;
    padding: 8px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    color: #fff;
    font-size: 14px;
    flex-wrap: wrap;
    gap: 10px;
    width: 100%;
    box-sizing: border-box;
  `;
  bar.innerHTML = `
    <div id="userInfo" style="display:flex;align-items:center;gap:10px;">
      <span>👤 <span id="userNameDisplay">비회원</span></span>
      <span style="font-size:12px;opacity:0.6;" id="userStatusDisplay"></span>
    </div>
    <div id="userActions">
      <button id="loginBtn" class="btn-sm" style="background:#f5a623;border:none;color:#fff;padding:6px 16px;border-radius:8px;cursor:pointer;font-weight:600;">로그인</button>
      <button id="registerBtn" class="btn-sm" style="background:transparent;border:1px solid #f5a623;color:#f5a623;padding:6px 16px;border-radius:8px;cursor:pointer;font-weight:600;margin-left:6px;">회원가입</button>
      <button id="logoutBtn" class="btn-sm" style="display:none;background:#e74c3c;border:none;color:#fff;padding:6px 16px;border-radius:8px;cursor:pointer;font-weight:600;margin-left:6px;">로그아웃</button>
      <button id="profileBtn" class="btn-sm" style="display:none;background:#3498db;border:none;color:#fff;padding:6px 16px;border-radius:8px;cursor:pointer;font-weight:600;margin-left:6px;">내 정보</button>
      <button id="adminBtn" class="btn-sm" style="display:none;background:#e67e22;border:none;color:#fff;padding:6px 16px;border-radius:8px;cursor:pointer;font-weight:600;margin-left:6px;">⚙️ 관리자</button>
    </div>
  `;

  // 헤더가 있으면 그 다음에, 없으면 body 맨 앞에 삽입
  if (header) {
    header.parentNode.insertBefore(bar, header.nextSibling);
    console.log('✅ 상태바를 헤더 다음에 삽입함');
  } else {
    document.body.insertBefore(bar, document.body.firstChild);
    console.log('✅ 상태바를 body 맨 앞에 삽입함');
  }

  // 버튼 이벤트 연결
  document.getElementById('loginBtn').addEventListener('click', showLoginModal);
  document.getElementById('registerBtn').addEventListener('click', showRegisterModal);
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('profileBtn').addEventListener('click', showProfileModal);
  document.getElementById('adminBtn').addEventListener('click', showAdminModal);
  
  memberUI.statusBar = bar;
  console.log('✅ createStatusBar 완료!');
}

// ============================================================
// BLOCK 0400: 모달 생성 (MODALS)
// ============================================================
function createModals() {
  // 로그인 모달
  const loginModal = createModal('loginModal', '로그인', `
    <div style="margin:15px 0;">
      <input type="email" id="loginEmail" placeholder="이메일" style="width:100%;padding:12px;margin-bottom:10px;border:2px solid #ddd;border-radius:8px;font-size:16px;">
      <input type="password" id="loginPin" placeholder="비밀번호(PIN)" style="width:100%;padding:12px;margin-bottom:10px;border:2px solid #ddd;border-radius:8px;font-size:16px;">
      <div id="loginError" style="color:#e74c3c;font-size:14px;margin-bottom:10px;display:none;"></div>
      <button id="loginSubmitBtn" style="width:100%;padding:14px;background:#f5a623;color:#fff;border:none;border-radius:8px;font-size:18px;font-weight:700;cursor:pointer;">로그인</button>
    </div>
  `);
  document.body.appendChild(loginModal);
  
  // 회원가입 모달
  const registerModal = createModal('registerModal', '회원가입', `
    <div style="margin:15px 0;">
      <input type="text" id="regName" placeholder="이름" style="width:100%;padding:12px;margin-bottom:10px;border:2px solid #ddd;border-radius:8px;font-size:16px;">
      <input type="email" id="regEmail" placeholder="이메일" style="width:100%;padding:12px;margin-bottom:10px;border:2px solid #ddd;border-radius:8px;font-size:16px;">
      <input type="password" id="regPin" placeholder="비밀번호(PIN) (4자리 숫자)" style="width:100%;padding:12px;margin-bottom:10px;border:2px solid #ddd;border-radius:8px;font-size:16px;">
      <input type="text" id="regMemo" placeholder="참고사항 (선택)" style="width:100%;padding:12px;margin-bottom:10px;border:2px solid #ddd;border-radius:8px;font-size:16px;">
      <div id="registerError" style="color:#e74c3c;font-size:14px;margin-bottom:10px;display:none;"></div>
      <button id="registerSubmitBtn" style="width:100%;padding:14px;background:#27ae60;color:#fff;border:none;border-radius:8px;font-size:18px;font-weight:700;cursor:pointer;">가입하기</button>
    </div>
  `);
  document.body.appendChild(registerModal);
  
  // 프로필 모달
  const profileModal = createModal('profileModal', '내 정보', `
    <div id="profileContent" style="margin:15px 0;line-height:1.8;">
      <p><strong>이름:</strong> <span id="profName"></span></p>
      <p><strong>이메일:</strong> <span id="profEmail"></span></p>
      <p><strong>결제 상태:</strong> <span id="profStatus"></span></p>
      <p><strong>만료일:</strong> <span id="profExpired"></span></p>
      <p><strong>권한:</strong> <span id="profType"></span></p>
      <hr style="margin:15px 0;">
      <div style="margin-top:10px;">
        <label style="font-weight:600;">새 비밀번호 (변경 시만 입력)</label>
        <input type="password" id="newPin" placeholder="새 PIN" style="width:100%;padding:12px;margin:8px 0;border:2px solid #ddd;border-radius:8px;font-size:16px;">
        <label style="font-weight:600;">새 이름</label>
        <input type="text" id="newName" placeholder="새 이름" style="width:100%;padding:12px;margin:8px 0;border:2px solid #ddd;border-radius:8px;font-size:16px;">
        <button id="updateProfileBtn" style="width:100%;padding:12px;background:#3498db;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:700;cursor:pointer;margin-top:8px;">정보 수정</button>
        <button id="deleteAccountBtn" style="width:100%;padding:12px;background:#e74c3c;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:700;cursor:pointer;margin-top:8px;">회원 탈퇴</button>
      </div>
      <div id="profileMessage" style="margin-top:10px;font-size:14px;display:none;"></div>
    </div>
  `);
  document.body.appendChild(profileModal);
  
  // 관리자 모달
  const adminModal = createModal('adminModal', '⚙️ 관리자 대시보드', `
    <div style="margin:15px 0;">
      <div style="display:flex;gap:10px;margin-bottom:15px;">
        <input type="text" id="adminSearch" placeholder="🔍 이메일 또는 이름 검색" style="flex:1;padding:10px;border:2px solid #ddd;border-radius:8px;font-size:14px;">
        <button id="adminSearchBtn" style="padding:10px 20px;background:#3498db;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;">검색</button>
        <button id="adminRefreshBtn" style="padding:10px 20px;background:#2ecc71;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;">🔄 새로고침</button>
      </div>
      <div id="adminUserList" style="max-height:400px;overflow-y:auto;border:1px solid #eee;border-radius:8px;padding:10px;background:#f8f9fa;">
        <p style="color:#999;">회원 목록을 불러오는 중...</p>
      </div>
    </div>
  `);
  document.body.appendChild(adminModal);
  
  // 모달 닫기 이벤트 (배경 클릭 시)
  document.querySelectorAll('.modal-overlay').forEach(el => {
    el.addEventListener('click', function(e) {
      if (e.target === this) this.style.display = 'none';
    });
  });
  
  // 버튼 이벤트 연결
  document.getElementById('loginSubmitBtn').addEventListener('click', handleLogin);
  document.getElementById('registerSubmitBtn').addEventListener('click', handleRegister);
  document.getElementById('updateProfileBtn').addEventListener('click', handleUpdateProfile);
  document.getElementById('deleteAccountBtn').addEventListener('click', handleDeleteAccount);
  document.getElementById('adminSearchBtn').addEventListener('click', loadAdminUsers);
  document.getElementById('adminRefreshBtn').addEventListener('click', loadAdminUsers);
  
  // Enter 키 지원
  document.getElementById('loginPin').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') document.getElementById('loginSubmitBtn').click();
  });
  document.getElementById('regPin').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') document.getElementById('registerSubmitBtn').click();
  });
}

// ============================================================
// BLOCK 0500: 모달 생성 헬퍼 (MODAL HELPER)
// ============================================================
function createModal(id, title, content) {
  const div = document.createElement('div');
  div.id = id;
  div.className = 'modal-overlay';
  div.style.cssText = `
    display: none;
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: rgba(0,0,0,0.6);
    z-index: 9999;
    justify-content: center;
    align-items: center;
    padding: 20px;
  `;
  div.innerHTML = `
    <div style="background:#fff;max-width:500px;width:100%;border-radius:20px;padding:30px;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-height:90vh;overflow-y:auto;position:relative;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <h2 style="margin:0;">${title}</h2>
        <button onclick="this.closest('.modal-overlay').style.display='none'" style="background:none;border:none;font-size:28px;cursor:pointer;color:#999;">&times;</button>
      </div>
      ${content}
    </div>
  `;
  return div;
}

// ============================================================
// BLOCK 0600: 세션 확인 (SESSION) - 수정 완료
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
        // verifyToken() 호출 제거 (로그인 직후에는 생략)
        // verifyToken();
        return;
      }
    } catch(e) {}
  }
  updateUI(false);
}

function verifyToken() {
  if (!currentToken) return;
  callAPI('profile', { token: currentToken })
    .then(res => {
      if (res.status === 'success') {
        currentUser = res.user;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: currentToken, user: currentUser }));
        updateUI(true);
        enableQuiz(true);
      } else {
        // 에러가 나도 로그아웃하지 않고, 그냥 현재 상태 유지
        console.warn('⚠️ 토큰 검증 실패, 하지만 로그인 상태는 유지합니다.');
      }
    })
    .catch(err => {
      // 네트워크 오류도 로그아웃하지 않음
      console.warn('⚠️ 토큰 검증 중 네트워크 오류:', err);
    });
}

// ============================================================
// BLOCK 0700: UI 업데이트 (UI UPDATE) - 디버깅 추가
// ============================================================
function updateUI(loggedIn) {
  console.log('🔄 updateUI 호출됨, loggedIn:', loggedIn, 'currentUser:', currentUser);
  
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const profileBtn = document.getElementById('profileBtn');
  const adminBtn = document.getElementById('adminBtn');
  const userName = document.getElementById('userNameDisplay');
  const userStatus = document.getElementById('userStatusDisplay');
  
  // 요소가 없으면 경고만 출력
  if (!loginBtn || !userName) {
    console.warn('⚠️ UI 요소를 찾을 수 없습니다.');
    return;
  }
  
  if (loggedIn && currentUser) {
    console.log('✅ 로그인 상태 UI 업데이트:', currentUser.name);
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
    profileBtn.style.display = 'inline-block';
    adminBtn.style.display = currentUser.account_type === 'admin' ? 'inline-block' : 'none';
    userName.textContent = currentUser.name || currentUser.email;
    userStatus.textContent = currentUser.payment_status === 'active' ? '✅ 구독중' : '⏳ ' + currentUser.payment_status;
    userStatus.style.color = currentUser.payment_status === 'active' ? '#2ecc71' : '#f39c12';
    enableQuiz(true);
  } else {
    console.log('❌ 비회원 상태 UI 업데이트');
    loginBtn.style.display = 'inline-block';
    registerBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'none';
    profileBtn.style.display = 'none';
    adminBtn.style.display = 'none';
    userName.textContent = '비회원';
    userStatus.textContent = '로그인이 필요합니다';
    userStatus.style.color = '#e74c3c';
    enableQuiz(false);
  }
}

// ============================================================
// BLOCK 0800: 퀴즈 활성화 (ENABLE QUIZ)
// ============================================================
function enableQuiz(enabled) {
  const startBtn = document.getElementById('startQuizBtn');
  const startInput = document.getElementById('startNumber');
  const setSelector = document.getElementById('setSelector');
  
  if (startBtn) {
    startBtn.disabled = !enabled;
    startBtn.style.opacity = enabled ? '1' : '0.5';
    startBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
    startBtn.title = enabled ? '' : '로그인 후 이용 가능합니다';
  }
  if (startInput) startInput.disabled = !enabled;
  if (setSelector) setSelector.disabled = !enabled;
}

// ============================================================
// BLOCK 0900: API 호출 (API CALL)
// ============================================================
function callAPI(action, params = {}) {
  const url = MEMBER_API_URL;
  const formData = new URLSearchParams();
  formData.append('action', action);
  Object.keys(params).forEach(key => {
    formData.append(key, params[key]);
  });
  
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString()
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'error') {
      throw new Error(data.message);
    }
    return data;
  });
}

// ============================================================
// BLOCK 1000: 로그인 (LOGIN)
// ============================================================
function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pin = document.getElementById('loginPin').value.trim();
  const errorEl = document.getElementById('loginError');
  
  if (!email || !pin) {
    errorEl.textContent = '이메일과 비밀번호를 모두 입력해주세요.';
    errorEl.style.display = 'block';
    return;
  }
  
  errorEl.style.display = 'none';
  const btn = document.getElementById('loginSubmitBtn');
  btn.textContent = '⏳ 로그인 중...';
  btn.disabled = true;
  
  callAPI('login', { email, pin })
    .then(res => {
      if (res.status === 'success') {
        currentToken = res.token;
        currentUser = res.user;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: currentToken, user: currentUser }));
        updateUI(true);
        document.getElementById('loginModal').style.display = 'none';
        enableQuiz(true);
        alert('✅ ' + currentUser.name + '님, 환영합니다!');
      }
    })
    .catch(err => {
      errorEl.textContent = err.message || '로그인 실패';
      errorEl.style.display = 'block';
    })
    .finally(() => {
      btn.textContent = '로그인';
      btn.disabled = false;
    });
}

// ============================================================
// BLOCK 1100: 회원가입 (REGISTER)
// ============================================================
function handleRegister() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pin = document.getElementById('regPin').value.trim();
  const memo = document.getElementById('regMemo').value.trim();
  const errorEl = document.getElementById('registerError');
  
  if (!name || !email || !pin) {
    errorEl.textContent = '이름, 이메일, 비밀번호는 필수입니다.';
    errorEl.style.display = 'block';
    return;
  }
  if (pin.length < 4) {
    errorEl.textContent = '비밀번호는 4자리 이상이어야 합니다.';
    errorEl.style.display = 'block';
    return;
  }
  
  errorEl.style.display = 'none';
  const btn = document.getElementById('registerSubmitBtn');
  btn.textContent = '⏳ 가입 중...';
  btn.disabled = true;
  
  callAPI('register', { name, email, pin, memo })
    .then(res => {
      if (res.status === 'success') {
        alert('✅ ' + res.message);
        document.getElementById('registerModal').style.display = 'none';
        showLoginModal();
      }
    })
    .catch(err => {
      errorEl.textContent = err.message || '회원가입 실패';
      errorEl.style.display = 'block';
    })
    .finally(() => {
      btn.textContent = '가입하기';
      btn.disabled = false;
    });
}

// ============================================================
// BLOCK 1200: 로그아웃 (LOGOUT)
// ============================================================
function logout() {
  if (confirm('로그아웃 하시겠습니까?')) {
    localStorage.removeItem(STORAGE_KEY);
    currentToken = null;
    currentUser = null;
    updateUI(false);
    document.querySelectorAll('.modal-overlay').forEach(el => el.style.display = 'none');
    alert('로그아웃 되었습니다.');
  }
}

// ============================================================
// BLOCK 1300: 프로필 (PROFILE)
// ============================================================
function showProfileModal() {
  if (!currentUser) return;
  const modal = document.getElementById('profileModal');
  document.getElementById('profName').textContent = currentUser.name;
  document.getElementById('profEmail').textContent = currentUser.email;
  document.getElementById('profStatus').textContent = currentUser.payment_status;
  document.getElementById('profExpired').textContent = currentUser.expired_date || '없음';
  document.getElementById('profType').textContent = currentUser.account_type === 'admin' ? '관리자' : '일반회원';
  document.getElementById('newPin').value = '';
  document.getElementById('newName').value = currentUser.name;
  document.getElementById('profileMessage').style.display = 'none';
  modal.style.display = 'flex';
}

function handleUpdateProfile() {
  const newPin = document.getElementById('newPin').value.trim();
  const newName = document.getElementById('newName').value.trim();
  const msgEl = document.getElementById('profileMessage');
  
  if (!newName && !newPin) {
    msgEl.textContent = '변경할 항목을 입력해주세요.';
    msgEl.style.color = '#e74c3c';
    msgEl.style.display = 'block';
    return;
  }
  
  const promises = [];
  if (newName && newName !== currentUser.name) {
    promises.push(callAPI('update', { token: currentToken, field: 'name', value: newName }));
  }
  if (newPin) {
    promises.push(callAPI('update', { token: currentToken, field: 'pin', value: newPin }));
  }
  
  if (promises.length === 0) {
    msgEl.textContent = '변경할 내용이 없습니다.';
    msgEl.style.color = '#f39c12';
    msgEl.style.display = 'block';
    return;
  }
  
  const btn = document.getElementById('updateProfileBtn');
  btn.textContent = '⏳ 저장 중...';
  btn.disabled = true;
  
  Promise.all(promises)
    .then(() => {
      msgEl.textContent = '✅ 정보가 수정되었습니다.';
      msgEl.style.color = '#27ae60';
      msgEl.style.display = 'block';
      return callAPI('profile', { token: currentToken });
    })
    .then(res => {
      if (res.status === 'success') {
        currentUser = res.user;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: currentToken, user: currentUser }));
        updateUI(true);
        document.getElementById('profName').textContent = currentUser.name;
      }
    })
    .catch(err => {
      msgEl.textContent = '❌ ' + err.message;
      msgEl.style.color = '#e74c3c';
      msgEl.style.display = 'block';
    })
    .finally(() => {
      btn.textContent = '정보 수정';
      btn.disabled = false;
    });
}

function handleDeleteAccount() {
  if (!confirm('정말로 탈퇴하시겠습니까? 모든 데이터가 삭제되지는 않지만 계정이 비활성화됩니다.')) return;
  if (!confirm('마지막 확인: 탈퇴하시겠습니까?')) return;
  
  const btn = document.getElementById('deleteAccountBtn');
  btn.textContent = '⏳ 처리 중...';
  btn.disabled = true;
  
  callAPI('delete', { token: currentToken })
    .then(res => {
      if (res.status === 'success') {
        alert('✅ 회원 탈퇴가 완료되었습니다.');
        logout();
        document.getElementById('profileModal').style.display = 'none';
      }
    })
    .catch(err => {
      alert('❌ ' + err.message);
    })
    .finally(() => {
      btn.textContent = '회원 탈퇴';
      btn.disabled = false;
    });
}

// ============================================================
// BLOCK 1400: 모달 표시 (SHOW MODALS)
// ============================================================
function showLoginModal() {
  document.getElementById('loginModal').style.display = 'flex';
  document.getElementById('loginEmail').focus();
  document.getElementById('loginError').style.display = 'none';
}

function showRegisterModal() {
  document.getElementById('registerModal').style.display = 'flex';
  document.getElementById('regName').focus();
  document.getElementById('registerError').style.display = 'none';
}

// ============================================================
// BLOCK 1500: 관리자 (ADMIN)
// ============================================================
function showAdminModal() {
  if (!currentUser || currentUser.account_type !== 'admin') {
    alert('관리자 권한이 필요합니다.');
    return;
  }
  document.getElementById('adminModal').style.display = 'flex';
  loadAdminUsers();
}

function loadAdminUsers() {
  const search = document.getElementById('adminSearch').value.trim();
  const listEl = document.getElementById('adminUserList');
  listEl.innerHTML = '<p>⏳ 로딩 중...</p>';
  
  callAPI('admin_list', { token: currentToken, search: search })
    .then(res => {
      if (res.status === 'success') {
        if (res.users.length === 0) {
          listEl.innerHTML = '<p style="color:#999;">검색 결과가 없습니다.</p>';
          return;
        }
        let html = '<table style="width:100%;border-collapse:collapse;font-size:13px;">';
        html += '<tr style="background:#2c3e50;color:#fff;">';
        html += '<th style="padding:8px;text-align:left;">#</th>';
        html += '<th style="padding:8px;text-align:left;">이름</th>';
        html += '<th style="padding:8px;text-align:left;">이메일</th>';
        html += '<th style="padding:8px;text-align:left;">상태</th>';
        html += '<th style="padding:8px;text-align:left;">만료일</th>';
        html += '<th style="padding:8px;text-align:center;">액션</th>';
        html += '</tr>';
        res.users.forEach((user, idx) => {
          const statusColor = user.payment_status === 'active' ? '#27ae60' : 
                             user.payment_status === 'suspended' ? '#e74c3c' : '#f39c12';
          html += `<tr style="border-bottom:1px solid #eee;">`;
          html += `<td style="padding:8px;">${idx+1}</td>`;
          html += `<td style="padding:8px;">${user.name}</td>`;
          html += `<td style="padding:8px;">${user.email}</td>`;
          html += `<td style="padding:8px;color:${statusColor};font-weight:600;">${user.payment_status}</td>`;
          html += `<td style="padding:8px;">${user.expired_date || '-'}</td>`;
          html += `<td style="padding:8px;text-align:center;">`;
          if (user.payment_status !== 'suspended') {
            html += `<button onclick="adminSuspend('${user.email}','suspend')" style="background:#e74c3c;color:#fff;border:none;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:11px;">정지</button>`;
          } else {
            html += `<button onclick="adminSuspend('${user.email}','activate')" style="background:#27ae60;color:#fff;border:none;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:11px;">활성화</button>`;
          }
          html += `</td>`;
          html += `</tr>`;
        });
        html += '</table>';
        listEl.innerHTML = html;
      }
    })
    .catch(err => {
      listEl.innerHTML = '<p style="color:#e74c3c;">❌ ' + err.message + '</p>';
    });
}

window.adminSuspend = function(email, action) {
  if (!confirm(`'${email}' 님을 ${action === 'suspend' ? '정지' : '활성화'}하시겠습니까?`)) return;
  
  callAPI('admin_suspend', { token: currentToken, target_email: email, action: action })
    .then(res => {
      if (res.status === 'success') {
        alert('✅ ' + res.message);
        loadAdminUsers();
      }
    })
    .catch(err => {
      alert('❌ ' + err.message);
    });
};

// ============================================================
// BLOCK 1600: 공개 함수 (PUBLIC FUNCTIONS)
// ============================================================
function isUserAuthorized() {
  if (!currentUser) return false;
  if (currentUser.payment_status !== 'active') {
    alert('⚠️ 구독 상태가 활성화되지 않았습니다. (' + currentUser.payment_status + ')');
    return false;
  }
  if (currentUser.expired_date) {
    const expired = new Date(currentUser.expired_date);
    const today = new Date();
    if (expired < today) {
      alert('⚠️ 구독이 만료되었습니다. (' + currentUser.expired_date + ')');
      return false;
    }
  }
  return true;
}

function getCurrentUser() {
  return currentUser;
}

// ============================================================
// BLOCK 1700: 전역 노출 (GLOBAL EXPOSE)
// ============================================================
window.initMemberSystem = initMemberSystem;
window.isUserAuthorized = isUserAuthorized;
window.getCurrentUser = getCurrentUser;
window.showLoginModal = showLoginModal;
window.showRegisterModal = showRegisterModal;

console.log('✅ member.js 로드 완료!');
console.log('🔗 API URL:', MEMBER_API_URL);
