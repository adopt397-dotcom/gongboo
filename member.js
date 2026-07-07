// ============================================================
// member.js - 회원관리 전담 (main.js 완전 분리)
// ============================================================

// ============================================================
// 0100 - 환경 설정 (GAS URL)
// ============================================================
const MEMBER_API_URL = "https://script.google.com/macros/s/AKfycby9g0f27gyjUuHdnw9-tZxr8Qmhbdm_864Ons0Ai6h1z87LOf0nYZBdWlAiJ_lgnpyB/exec";
const SESSION_KEY = 'sat_user_session';

// ============================================================
// 0200 - DOM 요소 캐싱
// ============================================================
let loginScreen = document.getElementById('loginScreen');
let setupSection = document.getElementById('setupSection');
let mainContainer = document.getElementById('mainContainer');
let splashOverlay = document.getElementById('splashOverlay');

// ============================================================
// 0300 - 화면 제어 함수
// ============================================================
function showLoginScreen() {
    if (loginScreen) loginScreen.style.display = 'flex';
    if (setupSection) setupSection.style.display = 'none';
    if (splashOverlay) {
        splashOverlay.style.opacity = '0';
        setTimeout(() => { splashOverlay.style.display = 'none'; }, 500);
    }
    if (mainContainer) mainContainer.style.display = 'block';
}

function showQuizApp() {
    if (loginScreen) loginScreen.style.display = 'none';
    if (setupSection) setupSection.style.display = 'block';
    if (splashOverlay) {
        splashOverlay.style.opacity = '0';
        setTimeout(() => { splashOverlay.style.display = 'none'; }, 500);
    }
    if (mainContainer) mainContainer.style.display = 'block';
    // main.js의 initialize 호출
    if (typeof window.initialize === 'function') {
        console.log("✅ member.js가 main.js initialize 실행");
        window.initialize();
    } else {
        console.warn("⚠️ window.initialize 없음 (main.js 로드 확인 필요)");
    }
}

// ============================================================
// 0400 - 세션 관리
// ============================================================
function checkAutoLogin() {
    try {
        const session = localStorage.getItem(SESSION_KEY);
        if (!session) return false;
        const data = JSON.parse(session);
        if (Date.now() - data.timestamp < 7 * 24 * 60 * 60 * 1000) {
            return data;
        } else {
            localStorage.removeItem(SESSION_KEY);
        }
    } catch(e) {
        localStorage.removeItem(SESSION_KEY);
    }
    return false;
}

function saveSession(email, name, payment_status, access_subjects) {
    const data = {
        email: email,
        name: name || email,
        payment_status: payment_status || 'active',
        access_subjects: access_subjects || '["sat"]',
        timestamp: Date.now()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    return data;
}

function logout() {
    if (confirm('로그아웃 하시겠습니까?')) {
        localStorage.removeItem(SESSION_KEY);
        window.location.reload();
    }
}

// ============================================================
// 0500 - 로그인 처리 (headers 제거 -> preflight 방지)
// ============================================================
async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const pin = document.getElementById('loginPin').value.trim();
    const msg = document.getElementById('loginMessage');
    const btn = document.getElementById('loginBtn');

    if (!email || !pin) {
        msg.textContent = '이메일과 PIN을 입력해주세요.';
        msg.style.color = '#e74c3c';
        return;
    }

    msg.textContent = '⏳ 확인 중...';
    msg.style.color = '#f5a623';
    btn.disabled = true;

    try {
        const response = await fetch(MEMBER_API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'login', email, pin })
        });

        const result = await response.json();

        if (result.success) {
            const user = result.data;
            saveSession(email, user.name, user.payment_status, user.access_subjects);
            msg.textContent = '✅ 로그인 성공!';
            msg.style.color = '#27ae60';
            showQuizApp();
        } else {
            msg.textContent = result.message || '이메일 또는 PIN이 일치하지 않습니다.';
            msg.style.color = '#e74c3c';
            btn.disabled = false;
        }
    } catch (error) {
        console.error("Login error:", error);
        msg.textContent = '⚠️ 서버 연결 오류: ' + error.message;
        msg.style.color = '#e74c3c';
        btn.disabled = false;
    }
}

// ============================================================
// 0600 - 회원가입 처리 (headers 제거 -> preflight 방지)
// ============================================================
function showRegisterUI() {
    const loginScreen = document.getElementById('loginScreen');
    if (!loginScreen) return;
    const content = loginScreen.querySelector('div > div');
    if (!content) return;

    content.innerHTML = `
        <div style="text-align:center;font-size:3rem;margin-bottom:10px;">📝</div>
        <h2 style="text-align:center;color:#1a1a2e;margin:10px 0 4px;">회원가입</h2>
        <p style="text-align:center;color:#888;font-size:0.9rem;margin-bottom:25px;">간단히 가입하고 시작하세요</p>
        <input type="email" id="regEmail" placeholder="이메일" style="width:100%;padding:14px 16px;border:2px solid #ddd;border-radius:12px;font-size:16px;box-sizing:border-box;outline:none;margin-bottom:12px;">
        <input type="text" id="regName" placeholder="이름 (선택)" style="width:100%;padding:14px 16px;border:2px solid #ddd;border-radius:12px;font-size:16px;box-sizing:border-box;outline:none;margin-bottom:12px;">
        <input type="password" id="regPin" placeholder="PIN (4자리 숫자)" maxlength="4" style="width:100%;padding:14px 16px;border:2px solid #ddd;border-radius:12px;font-size:16px;box-sizing:border-box;outline:none;margin-bottom:12px;" onkeypress="if(event.key==='Enter') handleRegister()">
        <button onclick="handleRegister()" style="width:100%;padding:16px;background:#27ae60;color:white;border:none;border-radius:12px;font-size:18px;font-weight:700;cursor:pointer;">가입하기</button>
        <div id="regMessage" style="margin-top:12px;text-align:center;font-size:14px;min-height:24px;color:#e74c3c;"></div>
        <div style="text-align:center;margin-top:16px;font-size:14px;">
            <a href="#" onclick="location.reload()" style="color:#3498db;text-decoration:none;font-weight:600;">← 로그인으로 돌아가기</a>
        </div>
    `;
}

async function handleRegister() {
    const email = document.getElementById('regEmail').value.trim();
    const name = document.getElementById('regName').value.trim();
    const pin = document.getElementById('regPin').value.trim();
    const msg = document.getElementById('regMessage');
    const btn = document.querySelector('#loginScreen button');

    if (!email || !pin) {
        msg.textContent = '이메일과 PIN은 필수입니다.';
        msg.style.color = '#e74c3c';
        return;
    }
    if (pin.length !== 4 || isNaN(pin)) {
        msg.textContent = 'PIN은 4자리 숫자여야 합니다.';
        msg.style.color = '#e74c3c';
        return;
    }

    msg.textContent = '⏳ 처리 중...';
    msg.style.color = '#f5a623';
    if (btn) btn.disabled = true;

    try {
        const response = await fetch(MEMBER_API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'register', email, pin, name: name || email })
        });

        const result = await response.json();

        if (result.success) {
            msg.textContent = '✅ ' + result.message;
            msg.style.color = '#27ae60';
            setTimeout(() => { location.reload(); }, 1500);
        } else {
            msg.textContent = result.message || '회원가입에 실패했습니다.';
            msg.style.color = '#e74c3c';
            if (btn) btn.disabled = false;
        }
    } catch (error) {
        console.error("Register error:", error);
        msg.textContent = '⚠️ 서버 오류: ' + error.message;
        msg.style.color = '#e74c3c';
        if (btn) btn.disabled = false;
    }
}

// ============================================================
// 0700 - 전역(window) 노출 (HTML onclick에서 사용)
// ============================================================
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.showRegisterUI = showRegisterUI;
window.logout = logout;

// ============================================================
// 0800 - 초기화 (페이지 로드 시 실행)
// ============================================================
function initMember() {
    console.log("🚀 member.js 초기화 시작");

    loginScreen = document.getElementById('loginScreen');
    setupSection = document.getElementById('setupSection');
    mainContainer = document.getElementById('mainContainer');
    splashOverlay = document.getElementById('splashOverlay');

    const session = checkAutoLogin();

    if (session) {
        console.log("✅ 자동 로그인 성공:", session.email);
        if (typeof window.initialize === 'function') {
            showQuizApp();
        } else {
            setTimeout(() => {
                if (typeof window.initialize === 'function') {
                    showQuizApp();
                } else {
                    console.warn("⚠️ main.js 로드 실패, 로그인 화면 표시");
                    showLoginScreen();
                }
            }, 1000);
        }
    } else {
        console.log("🔐 비로그인 상태, 로그인 화면 표시");
        if (!loginScreen) {
            const div = document.createElement('div');
            div.id = 'loginScreen';
            div.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);z-index:9999;display:flex;justify-content:center;align-items:center;padding:20px;box-sizing:border-box;';
            div.innerHTML = `
                <div style="background:white;padding:40px;border-radius:24px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
                    <div style="text-align:center;font-size:3rem;margin-bottom:10px;">📚</div>
                    <h2 style="text-align:center;color:#1a1a2e;margin:10px 0 4px;">🔐 SAT 로그인</h2>
                    <p style="text-align:center;color:#888;font-size:0.9rem;margin-bottom:25px;">SAT & PSAT & AP Learning Platform</p>
                    <input type="email" id="loginEmail" placeholder="이메일" style="width:100%;padding:14px 16px;border:2px solid #ddd;border-radius:12px;font-size:16px;box-sizing:border-box;outline:none;margin-bottom:12px;">
                    <input type="password" id="loginPin" placeholder="PIN (4자리 숫자)" maxlength="4" style="width:100%;padding:14px 16px;border:2px solid #ddd;border-radius:12px;font-size:16px;box-sizing:border-box;outline:none;margin-bottom:12px;" onkeypress="if(event.key==='Enter') handleLogin()">
                    <button id="loginBtn" onclick="handleLogin()" style="width:100%;padding:16px;background:#f5a623;color:white;border:none;border-radius:12px;font-size:18px;font-weight:700;cursor:pointer;">로그인</button>
                    <div id="loginMessage" style="margin-top:12px;text-align:center;font-size:14px;min-height:24px;color:#e74c3c;"></div>
                    <div style="text-align:center;margin-top:16px;font-size:14px;color:#888;">
                        <a href="#" onclick="showRegisterUI()" style="color:#3498db;text-decoration:none;font-weight:600;">회원가입</a>
                        <span style="margin:0 12px;color:#ddd;">|</span>
                        <a href="#" onclick="alert('관리자에게 문의해주세요.')" style="color:#888;text-decoration:none;">PIN 찾기</a>
                    </div>
                    <div style="text-align:center;margin-top:10px;font-size:12px;color:#aaa;">체험 계정: student@gmail.com / 1234</div>
                </div>
            `;
            document.body.appendChild(div);
            loginScreen = div;
        }
        showLoginScreen();
    }
}

// ============================================================
// 0900 - DOM 준비 후 실행
// ============================================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMember);
} else {
    initMember();
}

console.log("✅ member.js 로드 완료");
