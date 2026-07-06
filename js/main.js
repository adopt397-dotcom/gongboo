// ============================================================
// 0000 - main.js 통합 (SAT Quiz + 회원관리)
// ============================================================

// ============================================================
// 0050 - 회원관리 LANG
// ============================================================
var LANG = {
  loginTitle: "🔐 SAT 로그인",
  loginEmail: "이메일",
  loginPin: "PIN (4자리 숫자)",
  loginBtn: "로그인",
  registerBtn: "회원가입",
  loginError: "이메일과 PIN을 입력해주세요.",
  loginFailed: "이메일 또는 PIN이 일치하지 않습니다.",
  registerSuccess: "회원가입이 완료되었습니다.",
  registerFailed: "회원가입에 실패했습니다.",
  alreadyRegistered: "이미 등록된 이메일입니다.",
  paymentRequired: "💳 결제가 필요합니다.",
  paymentExpired: "❌ 결제가 만료되었습니다.",
  paymentPending: "⏳ 관리자 승인 대기 중입니다.",
  accessDenied: "🚫 접근 권한이 없습니다.",
  selectSubject: "과목 선택",
  loadingSubjects: "과목 로딩 중...",
  noSubjects: "등록된 과목이 없습니다."
};

// ============================================================
// 0100 - 기존 LANG (생략 가능 - 필요시 병합)
// ============================================================

// ============================================================
// 0200 - API URL
// ============================================================
var API_URL = "https://script.google.com/macros/s/AKfycbwYnCi7myER0R4djAV7CLW9Y1aTa-mjFSk_y_8vcD_p8vN78Sr5JeUB0WEqJR0_OTuG/exec";
var ORIGINAL_API_URL = API_URL;
var MEMBER_API_URL = API_URL;

// ============================================================
// 0250 - 회원관리 상수
// ============================================================
var SESSION_KEY = 'sat_user_session';
var CURRENT_USER = null;
var SELECTED_SUBJECT = 'sat';
var SUBJECTS_LIST = [];
var SUBJECTS_LOADED = false;

// ============================================================
// 0300 - 기존 전역 변수
// ============================================================
var STORAGE_KEY = 'quiz_progress_main';
var TOTAL_CACHE_KEY = 'quiz_total_questions';
var QUESTIONS_PER_SET = 120;
var TOTAL_QUESTIONS = 0;
var masterQuestions = [];
var currentQuestions = [];
var userAnswers = [];
var currentIndex = 0;
var correctCount = 0;
var isReviewMode = false;
var originalQuestions = [];
var currentStartNumber = 1;
var autoSaveInterval = null;
var chartInstances = {};
var DOM = {};

// ============================================================
// 0400 - Splash 화면 함수
// ============================================================
function updateSplash(percent, text) {
  var bar = document.getElementById('splashBar');
  var status = document.getElementById('splashStatus');
  if (bar) bar.style.width = Math.min(100, percent) + '%';
  if (status) status.textContent = text || 'Loading...';
}
function showSplashError(msg) {
  var errorEl = document.getElementById('splashError');
  var retryBtn = document.getElementById('splashRetry');
  if (errorEl) { errorEl.style.display = 'block'; errorEl.textContent = '⚠️ ' + msg; }
  if (retryBtn) retryBtn.style.display = 'inline-block';
}
function hideSplash() {
  var overlay = document.getElementById('splashOverlay');
  if (overlay) {
    overlay.style.opacity = '0';
    setTimeout(function() {
      overlay.style.display = 'none';
      document.getElementById('mainContainer').style.display = 'block';
    }, 500);
  }
}

// ============================================================
// 0450 - 로그인/회원가입 UI
// ============================================================
function showLoginScreen() {
  var loginHTML = `
    <div id="loginScreen" style="position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);z-index:9999;display:flex;justify-content:center;align-items:center;padding:20px;box-sizing:border-box;">
      <div style="background:white;padding:40px;border-radius:24px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
        <div style="text-align:center;margin-bottom:25px;">
          <div style="font-size:3rem;">📚</div>
          <h2 style="color:#1a1a2e;margin:10px 0 4px;">${LANG.loginTitle}</h2>
          <p style="color:#888;font-size:0.9rem;margin:0;">SAT & PSAT & AP Learning Platform</p>
        </div>
        <div style="margin-bottom:15px;">
          <input type="email" id="loginEmail" placeholder="${LANG.loginEmail}" style="width:100%;padding:14px 16px;border:2px solid #ddd;border-radius:12px;font-size:16px;box-sizing:border-box;outline:none;">
        </div>
        <div style="margin-bottom:15px;">
          <input type="password" id="loginPin" placeholder="${LANG.loginPin}" maxlength="4" style="width:100%;padding:14px 16px;border:2px solid #ddd;border-radius:12px;font-size:16px;box-sizing:border-box;outline:none;" onkeypress="if(event.key==='Enter') handleLogin()">
        </div>
        <button id="loginBtn" onclick="handleLogin()" style="width:100%;padding:16px;background:#f5a623;color:white;border:none;border-radius:12px;font-size:18px;font-weight:700;cursor:pointer;">${LANG.loginBtn}</button>
        <div id="loginMessage" style="margin-top:12px;text-align:center;font-size:14px;min-height:24px;color:#e74c3c;"></div>
        <div style="text-align:center;margin-top:16px;font-size:14px;color:#888;">
          <a href="#" onclick="showRegisterUI()" style="color:#3498db;text-decoration:none;font-weight:600;">${LANG.registerBtn}</a>
          <span style="margin:0 12px;">|</span>
          <a href="#" onclick="alert('관리자에게 문의해주세요.')" style="color:#888;text-decoration:none;">PIN 찾기</a>
        </div>
        <div style="text-align:center;margin-top:10px;font-size:12px;color:#aaa;">체험 계정: student@gmail.com / 1234</div>
      </div>
    </div>
  `;
  var existing = document.getElementById('loginScreen');
  if (existing) existing.remove();
  var div = document.createElement('div');
  div.innerHTML = loginHTML;
  document.body.appendChild(div.firstElementChild);
}

async function handleLogin() {
  var email = document.getElementById('loginEmail').value.trim();
  var pin = document.getElementById('loginPin').value.trim();
  var msg = document.getElementById('loginMessage');
  var btn = document.getElementById('loginBtn');
  if (!email || !pin) {
    msg.textContent = LANG.loginError;
    return;
  }
  msg.textContent = '⏳ 확인 중...';
  msg.style.color = '#f5a623';
  btn.disabled = true;
  try {
    var res = await fetch(MEMBER_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'login', email, pin }) });
    var result = await res.json();
    if (result.success) {
      CURRENT_USER = result.data;
      localStorage.setItem(SESSION_KEY, JSON.stringify({ email, name: result.data.name || email, payment_status: result.data.payment_status, access_subjects: result.data.access_subjects, timestamp: Date.now() }));
      var loginScreen = document.getElementById('loginScreen');
      if (loginScreen) loginScreen.remove();
      await loadSubjects();
      startApp();
    } else {
      msg.textContent = result.message || LANG.loginFailed;
      msg.style.color = '#e74c3c';
      btn.disabled = false;
    }
  } catch (e) {
    msg.textContent = '⚠️ 서버 연결 오류';
    msg.style.color = '#e74c3c';
    btn.disabled = false;
  }
}

function showRegisterUI() {
  var loginScreen = document.getElementById('loginScreen');
  if (!loginScreen) return;
  var content = loginScreen.querySelector('div > div');
  if (!content) return;
  content.innerHTML = `
    <div style="text-align:center;margin-bottom:25px;">
      <div style="font-size:3rem;">📝</div>
      <h2 style="color:#1a1a2e;margin:10px 0 4px;">회원가입</h2>
      <p style="color:#888;font-size:0.9rem;margin:0;">간단히 가입하고 시작하세요</p>
    </div>
    <div style="margin-bottom:12px;">
      <input type="email" id="regEmail" placeholder="이메일" style="width:100%;padding:14px 16px;border:2px solid #ddd;border-radius:12px;font-size:16px;box-sizing:border-box;outline:none;">
    </div>
    <div style="margin-bottom:12px;">
      <input type="text" id="regName" placeholder="이름 (선택)" style="width:100%;padding:14px 16px;border:2px solid #ddd;border-radius:12px;font-size:16px;box-sizing:border-box;outline:none;">
    </div>
    <div style="margin-bottom:15px;">
      <input type="password" id="regPin" placeholder="PIN (4자리 숫자)" maxlength="4" style="width:100%;padding:14px 16px;border:2px solid #ddd;border-radius:12px;font-size:16px;box-sizing:border-box;outline:none;" onkeypress="if(event.key==='Enter') handleRegister()">
    </div>
    <button onclick="handleRegister()" style="width:100%;padding:16px;background:#27ae60;color:white;border:none;border-radius:12px;font-size:18px;font-weight:700;cursor:pointer;">가입하기</button>
    <div id="regMessage" style="margin-top:12px;text-align:center;font-size:14px;min-height:24px;color:#e74c3c;"></div>
    <div style="text-align:center;margin-top:16px;font-size:14px;">
      <a href="#" onclick="showLoginScreen()" style="color:#3498db;text-decoration:none;font-weight:600;">← 로그인으로 돌아가기</a>
    </div>
  `;
}

async function handleRegister() {
  var email = document.getElementById('regEmail').value.trim();
  var name = document.getElementById('regName').value.trim();
  var pin = document.getElementById('regPin').value.trim();
  var msg = document.getElementById('regMessage');
  var btn = document.querySelector('#loginScreen button');
  if (!email || !pin) { msg.textContent = '이메일과 PIN은 필수입니다.'; return; }
  if (pin.length !== 4 || isNaN(pin)) { msg.textContent = 'PIN은 4자리 숫자여야 합니다.'; return; }
  msg.textContent = '⏳ 처리 중...';
  if (btn) btn.disabled = true;
  try {
    var res = await fetch(MEMBER_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'register', email, pin, name: name || email }) });
    var result = await res.json();
    if (result.success) {
      msg.textContent = '✅ ' + result.message;
      msg.style.color = '#27ae60';
      setTimeout(showLoginScreen, 1500);
    } else {
      msg.textContent = result.message || LANG.registerFailed;
      msg.style.color = '#e74c3c';
      if (btn) btn.disabled = false;
    }
  } catch (e) {
    msg.textContent = '⚠️ 서버 오류';
    if (btn) btn.disabled = false;
  }
}

// ============================================================
// 0500 - 유틸리티 함수
// ============================================================
function escapeHtml(str) { if (!str) return ''; return String(str).replace(/[&<>]/g, function(m) { return m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;'; }); }
function getAnswerLetter(num) { var n = parseInt(num); if (isNaN(n)) return num; var letters = {1:'A',2:'B',3:'C',4:'D'}; return letters[n] || num; }
function getValidChoiceKeys(choices) { return Object.keys(choices).filter(function(key) { var v = choices[key]; if (typeof v === 'string') return v && v.trim() !== ""; return v !== null && v !== undefined && v !== ""; }).sort(function(a,b) { return Number(a) - Number(b); }); }
function hasRealChoices(q) { if (!q || !q.choices) return false; return Object.values(q.choices).some(function(v) { if (!v || typeof v !== 'string') return false; var t = v.trim(); return t !== "" && t.toLowerCase() !== 'no options' && t !== 'No options'; }); }
function isSubjectiveQuestion(q) { return !hasRealChoices(q); }
function randomizeChoicesOnly(q) {
  if (!q || !q.choices || !hasRealChoices(q)) return q;
  try {
    var entries = Object.entries(q.choices).filter(function(item) { var v = item[1]; if (typeof v === 'string') return v && v.trim() !== ""; return v !== null && v !== undefined && v !== ""; }).map(function(item) { return { k: parseInt(item[0]), v: String(item[1]) }; });
    var shuffled = entries.slice();
    for (var i = shuffled.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var temp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = temp; }
    var newChoices = {}; shuffled.forEach(function(c, idx) { newChoices[idx + 1] = c.v; });
    var originalAns = parseInt(q.answer);
    var correctIdx = shuffled.findIndex(function(c) { return c.k == originalAns; });
    return { ...q, choices: newChoices, answer: (correctIdx + 1).toString() };
  } catch(e) { return q; }
}

// ============================================================
// 0550 - 회원관리 유틸리티
// ============================================================
// ============================================================
// 0550 - loadSubjects (GET 요청 테스트)
// ============================================================
async function loadSubjects() {
  console.log("🔍 loadSubjects 시작");

  if (SUBJECTS_LOADED) {
    console.log("✅ loadSubjects: 이미 로드됨 (캐시 사용)");
    return SUBJECTS_LIST;
  }

  try {
    // 🔥 URL 직접 지정
    const url = "https://script.google.com/macros/s/AKfycbwYnCi7myER0R4djAV7CLW9Y1aTa-mjFSk_y_8vcD_p8vN78Sr5JeUB0WEqJR0_OTuG/exec";
    console.log("🔍 fetch URL:", url);

    // 🔥 POST 대신 GET으로 테스트 (파라미터는 URL에 추가)
    const response = await fetch(url + "?action=subjects", {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    console.log("✅ response 상태:", response.status);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("✅ loadSubjects 결과:", result);

    if (result.success && result.data) {
      SUBJECTS_LIST = result.data;
      SUBJECTS_LOADED = true;
      return SUBJECTS_LIST;
    } else {
      console.warn("⚠️ loadSubjects: 응답 실패", result.message);
      return [];
    }

  } catch (e) {
    console.error("❌ loadSubjects 오류:", e);
    throw e;
  }
}

// ============================================================
// 0555 - checkAutoLogin (신규)
// ============================================================
// ============================================================
// 0555 - checkAutoLogin (신규)
// ============================================================
function checkAutoLogin() {
  var session = localStorage.getItem(SESSION_KEY);
  if (!session) return false;
  try {
    var data = JSON.parse(session);
    if (Date.now() - data.timestamp < 7 * 24 * 60 * 60 * 1000) {
      CURRENT_USER = {
        email: data.email,
        name: data.name || data.email,
        payment_status: data.payment_status,
        access_subjects: data.access_subjects
      };
      return true;
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch(e) {
    localStorage.removeItem(SESSION_KEY);
  }
  return false;
}

// ============================================================
// 0556 - logout (신규)
// ============================================================
function logout() {
  if (confirm('로그아웃 하시겠습니까?')) {
    localStorage.removeItem(SESSION_KEY);
    CURRENT_USER = null;
    window.location.reload();
  }
}


// ============================================================
// 0600 - 자동저장
// ============================================================
function startAutoSave() { if (autoSaveInterval) clearInterval(autoSaveInterval); autoSaveInterval = setInterval(saveProgress, 5000); }

// ============================================================
// 0700 - saveProgress / loadProgress / clearProgress
// ============================================================
function saveProgress() {
  try {
    var data = { currentQuestions, userAnswers, currentIndex, correctCount, currentStartNumber, isReviewMode, masterQuestions, originalQuestions, timestamp: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch(e) {}
}
function loadProgress() {
  try { var raw = localStorage.getItem(STORAGE_KEY); if (!raw) return null; var data = JSON.parse(raw); if (data && data.currentQuestions && data.currentQuestions.length > 0) return data; return null; } catch(e) { return null; }
}
function clearProgress() { localStorage.removeItem(STORAGE_KEY); }

// ============================================================
// 0800 - 퀴즈 네비게이션
// ============================================================
function goNext() { if (currentIndex < currentQuestions.length - 1) { currentIndex++; renderCurrentQuestion(); window.scrollTo({ top: 0, behavior: 'smooth' }); } }
function goPrev() { if (currentIndex > 0) { currentIndex--; renderCurrentQuestion(); window.scrollTo({ top: 0, behavior: 'smooth' }); } }
function skipQuestion() {
  if (userAnswers[currentIndex] === null || userAnswers[currentIndex] === undefined) { userAnswers[currentIndex] = -1; saveProgress(); }
  if (currentIndex < currentQuestions.length - 1) { currentIndex++; renderCurrentQuestion(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
}
function submitSubjective() {
  var input = document.getElementById('subjectiveInput');
  if (!input) return;
  var userAnswer = input.value.trim();
  if (!userAnswer) { alert('답을 입력해주세요.'); return; }
  var q = currentQuestions[currentIndex];
  var correctAnswer = q.A && q.A !== '' ? String(q.A).trim() : (q.answer && q.answer !== '' && q.answer !== '0' ? String(q.answer).trim() : userAnswer);
  var isCorrect = (userAnswer === correctAnswer) || (parseFloat(userAnswer) === parseFloat(correctAnswer));
  userAnswers[currentIndex] = userAnswer;
  if (isCorrect) correctCount++;
  saveProgress();
  renderCurrentQuestion();
}

// ============================================================
// 0900 - 결과 및 리뷰
// ============================================================
function getWrongSkippedUnansweredIndices() {
  var result = [];
  for (var i = 0; i < currentQuestions.length; i++) {
    var q = currentQuestions[i]; var ans = userAnswers[i]; var isUnanswered = (ans === null || ans === undefined); var isSkipped = (ans === -1);
    var isSubjective = isSubjectiveQuestion(q);
    var isIncorrect = false;
    if (!isUnanswered && !isSkipped) {
      if (isSubjective) { var correctAns = q.A || q.answer || ''; isIncorrect = !(String(ans).trim() === String(correctAns).trim()); }
      else { isIncorrect = (ans !== parseInt(q.answer)); }
    }
    if (isUnanswered || isSkipped || isIncorrect) result.push(i);
  }
  return result;
}

function showResults() {
  saveProgress();
  var answeredCount = userAnswers.filter(function(a) { return a !== null && a !== undefined && a !== -1; }).length;
  var accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
  DOM.correctCountSpan.innerHTML = correctCount + ' / ' + answeredCount;
  DOM.accuracyRateSpan.innerHTML = accuracy + '%';
  var gridHtml = '<div style="display:grid;grid-template-columns:repeat(10,1fr);gap:6px;">';
  for (var i = 0; i < currentQuestions.length; i++) {
    var ans = userAnswers[i];
    var isCorrect = (ans !== null && ans !== undefined && ans !== -1 && ans === parseInt(currentQuestions[i].answer));
    var isSkipped = (ans === -1);
    var isUnanswered = (ans === null || ans === undefined);
    var statusClass = isCorrect ? 'correct' : isSkipped ? 'skipped' : isUnanswered ? 'unanswered' : 'incorrect';
    gridHtml += '<div class="result-item ' + statusClass + '" data-qidx="' + i + '">' + (i + 1) + '</div>';
  }
  gridHtml += '</div>';
  DOM.resultGrid.innerHTML = gridHtml;
  DOM.resultGrid.querySelectorAll('.result-item[data-qidx]').forEach(function(el) {
    el.addEventListener('click', function() { var idx = parseInt(el.getAttribute('data-qidx')); currentIndex = idx; DOM.resultModal.style.display = 'none'; renderCurrentQuestion(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  });
  DOM.resultModal.style.display = 'flex';
}

function showWrongAnswersList() {
  var wrongItems = [];
  for (var i = 0; i < currentQuestions.length; i++) {
    var q = currentQuestions[i]; var ans = userAnswers[i]; var isSkipped = (ans === -1); var isUnanswered = (ans === null || ans === undefined);
    var isSubjective = isSubjectiveQuestion(q);
    var isIncorrect = false;
    if (!isSkipped && !isUnanswered) {
      if (isSubjective) { var correctAns = q.A || q.answer || ''; isIncorrect = !(String(ans).trim() === String(correctAns).trim()); }
      else { isIncorrect = (ans !== parseInt(q.answer)); }
    }
    if (isSkipped || isIncorrect || isUnanswered) {
      var actualNumber = q.originalNumber || (currentStartNumber + i);
      wrongItems.push({ idx: i, actualNumber: actualNumber, q: q, ans: ans, isSkipped: isSkipped, isUnanswered: isUnanswered, isSubjective: isSubjective });
    }
  }
  if (wrongItems.length === 0) { alert('🎉 모든 문제를 맞추셨습니다!'); return; }
  var html = '<p style="margin-bottom:15px;padding:10px;background:#f0f0f0;border-radius:8px;text-align:center;">리뷰 문제: <strong>' + wrongItems.length + '</strong>개</p>';
  wrongItems.forEach(function(item) {
    var statusText = item.isSkipped ? 'SKIPPED' : (item.isUnanswered ? 'UNANSWERED' : 'WRONG');
    var statusColor = item.isSkipped ? '#f39c12' : (item.isUnanswered ? '#6c757d' : '#e74c3c');
    var userAnswerDisplay = (item.ans === null || item.ans === undefined || item.ans === -1) ? '---' : String(item.ans);
    var correctAnswerDisplay = (item.isSubjective) ? (item.q.A || item.q.answer || '---') : getAnswerLetter(item.q.answer);
    html += '<div class="wrong-item" style="border-left:5px solid ' + statusColor + ';padding:16px;margin-bottom:14px;background:#fff;border-radius:12px;border:2px solid #eee;">' +
      '<div style="font-weight:bold;margin-bottom:10px;">Question ' + (item.idx + 1) + ' (Original #' + item.actualNumber + ') <span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;margin-left:8px;background:' + statusColor + ';color:#fff;">' + statusText + '</span></div>' +
      '<div style="margin-bottom:12px;"><strong>' + escapeHtml(item.q.question) + '</strong></div>' +
      '<div style="margin-top:12px;padding:10px;background:#f8f9fa;border-radius:8px;"><strong>내 답:</strong> ' + escapeHtml(String(userAnswerDisplay)) + '<br><strong>정답:</strong> ' + escapeHtml(String(correctAnswerDisplay)) + '</div>' +
      '<div style="margin-top:12px;padding:10px;background:#e8f4fc;border-radius:8px;"><strong>해설</strong><br>' + escapeHtml(item.q.explanation || '해설이 없습니다.') + '</div></div>';
  });
  DOM.wrongListDiv.innerHTML = html;
  DOM.wrongModal.style.display = 'flex';
}

function startWrongOnlyReview() {
  var indices = getWrongSkippedUnansweredIndices();
  if (indices.length === 0) { alert('🎉 모든 문제를 맞추셨습니다!'); return; }
  var reviewQuestions = indices.map(function(idx) { return currentQuestions[idx]; });
  currentQuestions = reviewQuestions.slice();
  userAnswers = new Array(currentQuestions.length).fill(null);
  correctCount = 0;
  currentIndex = 0;
  isReviewMode = true;
  DOM.reviewBanner.style.display = 'block';
  DOM.reviewBanner.innerHTML = '<span>Review Mode: ' + currentQuestions.length + ' questions</span><button id="exitReviewBtn" class="exit-review-btn">EXIT REVIEW</button>';
  document.getElementById('exitReviewBtn').addEventListener('click', function() { clearProgress(); window.location.reload(); });
  DOM.wrongModal.style.display = 'none';
  DOM.resultModal.style.display = 'none';
  renderCurrentQuestion();
  saveProgress();
}

// ============================================================
// 1000 - 타이머
// ============================================================
var timerSeconds = 134 * 60;
var timerInterval = null;
var timerRunning = false;
var timerPaused = false;

function formatTimer(seconds) {
  var hrs = Math.floor(seconds / 3600);
  var mins = Math.floor((seconds % 3600) / 60);
  var secs = seconds % 60;
  return String(hrs).padStart(2, '0') + ':' + String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
}

function updateTimerDisplay() {
  var display = document.getElementById('timerDisplay');
  if (display) {
    display.textContent = formatTimer(timerSeconds);
    if (timerSeconds < 300) display.classList.add('warning');
    else display.classList.remove('warning');
  }
}

function startTimer() {
  if (timerInterval) return;
  timerRunning = true;
  timerPaused = false;
  var btn = document.getElementById('timerPauseBtn');
  if (btn) btn.textContent = 'Pause';
  timerInterval = setInterval(function() {
    if (timerSeconds > 0) { timerSeconds--; updateTimerDisplay(); if (timerSeconds === 0) { clearInterval(timerInterval); timerInterval = null; timerRunning = false; alert('⏰ 시간이 종료되었습니다!'); } }
  }, 1000);
}

function pauseTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; timerRunning = false; timerPaused = true; var btn = document.getElementById('timerPauseBtn'); if (btn) btn.textContent = 'Resume'; }
  else if (timerPaused) { startTimer(); }
}

function resetTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  timerSeconds = 134 * 60;
  timerRunning = false;
  timerPaused = false;
  var btn = document.getElementById('timerPauseBtn');
  if (btn) btn.textContent = 'Pause';
  updateTimerDisplay();
}

function initTimer() {
  updateTimerDisplay();
  var pauseBtn = document.getElementById('timerPauseBtn');
  var resetBtn = document.getElementById('timerResetBtn');
  if (pauseBtn) pauseBtn.addEventListener('click', pauseTimer);
  if (resetBtn) resetBtn.addEventListener('click', function() { if (confirm('타이머를 초기화하시겠습니까?')) resetTimer(); });
}

// ============================================================
// 1100 - 렌더링 함수
// ============================================================
function renderCurrentQuestion() {
  if (!currentQuestions.length || currentIndex >= currentQuestions.length) {
    DOM.questionContainer.innerHTML = '<div style="padding:40px;text-align:center;color:red;">❌ 문제를 불러올 수 없습니다.</div>';
    return;
  }
  var q = currentQuestions[currentIndex];
  if (!q) {
    DOM.questionContainer.innerHTML = '<div style="padding:40px;text-align:center;color:red;">❌ 유효하지 않은 문제입니다.</div>';
    return;
  }
  var answered = userAnswers[currentIndex];
  updateProgressDisplay();
  var actualNumber = q.originalNumber || (currentStartNumber + currentIndex);
  var headerText = 'Question ' + (currentIndex + 1) + ' / ' + currentQuestions.length + ' (Original #' + actualNumber + ')';
  if (isReviewMode) headerText = 'Review Question ' + (currentIndex + 1) + ' / ' + currentQuestions.length + ' (Original #' + actualNumber + ')';
  var hasChoices = hasRealChoices(q);
  var isSubjective = !hasChoices;
  var passageHtml = '';
  var displayPassage = q.passage || '';
  if (displayPassage && displayPassage.trim() && displayPassage.trim() !== 'No passage.') {
    passageHtml = '<div style="background:#f8f9fa;padding:15px;border-radius:8px;margin:10px 0;border:1px solid #dee2e6;"><div style="white-space:pre-wrap;font-size:15px;line-height:1.7;">' + escapeHtml(displayPassage) + '</div></div>';
  }
  if (isSubjective) {
    renderSubjectiveQuestion(q, answered, headerText, passageHtml);
    return;
  }
  var validKeys = getValidChoiceKeys(q.choices);
  var originalAnswerKey = String(q.answer);
  var originalAnswerText = q.choices[originalAnswerKey] || '';
  var actualAnswerKey = null;
  for (var i = 0; i < validKeys.length; i++) { var key = validKeys[i]; if (q.choices[key] == originalAnswerText) { actualAnswerKey = key; break; } }
  var displayAnswer = actualAnswerKey != null ? validKeys.indexOf(actualAnswerKey) + 1 : parseInt(originalAnswerKey);
  var html = '<div class="question-card"><div class="q-num">' + headerText + '</div>' + passageHtml + renderGraphic(q.graphic) + '<div class="question-text math-content">' + (q.question || 'No question text') + '</div><div class="choices">';
  for (var i = 0; i < validKeys.length; i++) {
    var key = validKeys[i];
    var choiceText = q.choices[key] || '';
    var letter = String.fromCharCode(64 + parseInt(key));
    var isAnswered = (answered !== null && answered !== undefined && answered !== -1);
    var isCorrect = isAnswered && (parseInt(answered) === parseInt(displayAnswer)) && (parseInt(key) === parseInt(answered));
    var isWrong = isAnswered && (parseInt(answered) !== parseInt(displayAnswer)) && (parseInt(key) === parseInt(answered));
    var isDisabled = isAnswered ? 'disabled' : '';
    var extraClass = isCorrect ? 'correct' : (isWrong ? 'incorrect' : '');
    html += '<div class="choice ' + extraClass + ' ' + isDisabled + '" data-choice="' + key + '">' +
      '<div class="choice-letter">' + letter + '</div>' +
      '<div style="flex:1;">' + choiceText + '</div>' +
      (isCorrect ? ' ✅' : '') + (isWrong ? ' ❌' : '') +
      '</div>';
  }
  html += '</div></div>';
  DOM.questionContainer.innerHTML = html;
  if (window.MathJax && MathJax.typesetPromise) { MathJax.typesetPromise([DOM.questionContainer]).catch(console.warn); }
  var choiceEls = DOM.questionContainer.querySelectorAll('.choice:not(.disabled)');
  choiceEls.forEach(function(el) {
    el.addEventListener('click', function() {
      var choice = parseInt(el.getAttribute('data-choice'));
      if (isNaN(choice)) return;
      userAnswers[currentIndex] = choice;
      if (choice === displayAnswer) correctCount++;
      saveProgress();
      renderCurrentQuestion();
      showExplanation();
    });
  });
  if (answered !== null && answered !== undefined && answered !== -1) showExplanation();
  else DOM.explanationBox.classList.remove('show');
  var isLastQuestion = (currentIndex >= currentQuestions.length - 1);
  if (isLastQuestion) {
    DOM.nextBtn.style.display = 'none';
    DOM.submitBtn.style.display = 'inline-block';
    DOM.submitBtn.innerHTML = 'SUBMIT (Enter)';
    var isAnswered = (answered !== null && answered !== undefined && answered !== -1);
    DOM.submitBtn.disabled = !isAnswered;
    DOM.submitBtn.style.background = isAnswered ? '#27ae60' : '#95a5a6';
  } else {
    DOM.nextBtn.style.display = 'inline-block';
    DOM.nextBtn.innerHTML = 'NEXT (N) ▶';
    DOM.submitBtn.style.display = 'none';
  }
  DOM.prevBtn.disabled = (currentIndex === 0);
}

function renderSubjectiveQuestion(q, answered, headerText, passageHtml) {
  var isAnswered = (answered !== null && answered !== undefined && answered !== -1);
  if (!isAnswered) { DOM.explanationBox.classList.remove('show'); DOM.explanationText.innerHTML = ''; }
  var correctAnswerText = q.A && q.A !== '' ? String(q.A).trim() : (q.answer && q.answer !== '' && q.answer !== '0' ? String(q.answer).trim() : '정답 정보 없음');
  var html = '<div class="question-card"><div class="q-num">' + headerText + '</div>' + passageHtml + renderGraphic(q.graphic) + '<div class="question-text math-content">' + (q.question || 'No question text') + '</div>';
  if (isAnswered) {
    var userAns = String(answered).trim();
    var isCorrect = (userAns === correctAnswerText) || (parseFloat(userAns) === parseFloat(correctAnswerText));
    var statusColor = isCorrect ? '#27ae60' : '#e74c3c';
    html += '<div style="margin-top:15px;padding:15px;background:#f8f9fa;border-radius:8px;border-left:4px solid #666;"><div style="font-size:14px;color:#666;">내 답: <strong>' + escapeHtml(userAns) + '</strong></div></div>' +
      '<div style="margin-top:10px;padding:12px;background:' + statusColor + ';color:#fff;border-radius:8px;font-weight:700;">정답: ' + escapeHtml(correctAnswerText) + '</div>' +
      '<div style="margin-top:12px;padding:15px;background:#e8f4fc;border-radius:8px;"><strong>해설</strong><p style="margin-top:8px;">' + escapeHtml(q.explanation || '해설이 없습니다.') + '</p></div>';
  } else {
    html += '<div class="subjective-input-group"><input type="text" id="subjectiveInput" placeholder="답을 입력하세요" onkeypress="if(event.key===\'Enter\') submitSubjective()"><button onclick="submitSubjective()">제출</button></div>';
  }
  html += '</div>';
  DOM.questionContainer.innerHTML = html;
  if (window.MathJax && MathJax.typesetPromise) { MathJax.typesetPromise([DOM.questionContainer]).catch(console.warn); }
  var isLastQuestion = (currentIndex >= currentQuestions.length - 1);
  if (isLastQuestion) {
    DOM.nextBtn.style.display = 'none';
    DOM.submitBtn.style.display = 'inline-block';
    DOM.submitBtn.innerHTML = 'SUBMIT (Enter)';
    var isAnswered2 = (userAnswers[currentIndex] !== null && userAnswers[currentIndex] !== undefined && userAnswers[currentIndex] !== -1);
    DOM.submitBtn.disabled = isAnswered2;
    DOM.submitBtn.style.background = isAnswered2 ? '#27ae60' : '#95a5a6';
  } else {
    DOM.nextBtn.style.display = 'inline-block';
    DOM.nextBtn.innerHTML = 'NEXT (N) ▶';
    DOM.submitBtn.style.display = 'none';
  }
  DOM.prevBtn.disabled = (currentIndex === 0);
}

function showExplanation() {
  var q = currentQuestions[currentIndex];
  var ans = userAnswers[currentIndex];
  if (!q || ans == null || ans == undefined || ans == -1) { DOM.explanationBox.classList.remove('show'); return; }
  var hasChoices = hasRealChoices(q);
  if (!hasChoices) {
    var correctAns = q.A && q.A !== '' ? String(q.A).trim() : (q.answer && q.answer !== '' && q.answer !== '0' ? String(q.answer).trim() : '정답 정보 없음');
    var userAns = String(ans).trim();
    var isCorrect = (userAns === correctAns) || (parseFloat(userAns) === parseFloat(correctAns));
    var statusColor = isCorrect ? '#27ae60' : '#e74c3c';
    DOM.explanationText.innerHTML = '<div style="background:' + statusColor + ';color:white;padding:8px 16px;border-radius:6px;display:inline-block;font-weight:700;margin-bottom:15px;">정답: ' + escapeHtml(correctAns) + '</div><div style="margin-top:8px;font-size:14px;color:#555;">내 답: <strong>' + escapeHtml(userAns) + '</strong></div><p style="margin-top:12px;" class="math-content">' + escapeHtml(q.explanation || '해설이 없습니다.') + '</p>';
    DOM.explanationBox.classList.add('show');
    if (window.MathJax && MathJax.typesetPromise) { MathJax.typesetPromise([DOM.explanationText]).catch(console.warn); }
    return;
  }
  var validKeys = getValidChoiceKeys(q.choices);
  var originalAnswerKey = String(q.answer);
  var originalAnswerText = q.choices[originalAnswerKey] || '';
  var actualAnswerKey = null;
  for (var i = 0; i < validKeys.length; i++) { var key = validKeys[i]; if (q.choices[key] === originalAnswerText) { actualAnswerKey = key; break; } }
  var displayAnswerIndex = actualAnswerKey !== null ? validKeys.indexOf(actualAnswerKey) + 1 : parseInt(originalAnswerKey);
  var userAnswerLetter = getAnswerLetter(ans);
  var correctAnswerLetter = getAnswerLetter(displayAnswerIndex);
  var isCorrect = (ans === displayAnswerIndex);
  var statusColor = isCorrect ? '#27ae60' : '#e74c3c';
  DOM.explanationText.innerHTML = '<div style="background:' + statusColor + ';color:white;padding:8px 16px;border-radius:6px;display:inline-block;font-weight:700;margin-bottom:15px;">정답: ' + correctAnswerLetter + '</div><div style="margin-top:8px;font-size:14px;color:#555;">내 답: <strong>' + userAnswerLetter + '</strong></div><p style="margin-top:12px;" class="math-content">' + escapeHtml(q.explanation || '해설이 없습니다.') + '</p>';
  DOM.explanationBox.classList.add('show');
  if (window.MathJax && MathJax.typesetPromise) { MathJax.typesetPromise([DOM.explanationText]).catch(console.warn); }
}

// ============================================================
// 1200 - Keyboard Events
// ============================================================
function attachKeyboardEvents() {
  document.addEventListener('keydown', function(event) {
    var key = event.key;
    if (key === 'p' || key === 'P') { event.preventDefault(); if (currentIndex > 0) goPrev(); return; }
    if (key === 'n' || key === 'N') { event.preventDefault(); if (currentIndex < currentQuestions.length - 1) goNext(); return; }
    if (key === 's' || key === 'S' || key === 'A') { event.preventDefault(); skipQuestion(); return; }
    if (key === 'Enter' && currentIndex >= currentQuestions.length - 1 && DOM.submitBtn && DOM.submitBtn.style.display !== 'none') {
      var isAnswered = (userAnswers[currentIndex] !== null && userAnswers[currentIndex] !== undefined && userAnswers[currentIndex] !== -1);
      if (isAnswered) { event.preventDefault(); showResults(); }
      return;
    }
    if (key === 'ArrowLeft') { event.preventDefault(); if (currentIndex > 0) goPrev(); return; }
    if (key === 'ArrowRight') { event.preventDefault(); if (currentIndex < currentQuestions.length - 1) goNext(); return; }
  });
}

// ============================================================
// 1300 - attachEvents & resume
// ============================================================
function attachEvents() {
  var continueBtn = document.getElementById('progressContinueBtn');
  if (continueBtn) {
    continueBtn.addEventListener('click', function() {
      var modal = document.getElementById('progressModal');
      var savedData = modal.getAttribute('data-saved');
      if (savedData) { var saved = JSON.parse(savedData); modal.style.display = 'none'; resumeProgress(saved); }
    });
  }
  var cancelBtn = document.getElementById('progressCancelBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', function() {
      var modal = document.getElementById('progressModal');
      modal.style.display = 'none';
      clearProgress();
      var startNum = parseInt(document.getElementById('startNumber').value) || 1;
      startQuizWithNumber(startNum);
    });
  }
  DOM.startQuizBtn.addEventListener('click', function() {
    var startNum = parseInt(DOM.startNumberInput.value);
    if (isNaN(startNum) || DOM.startNumberInput.value === "") startNum = 1;
    if (startNum < 1) startNum = 1;
    if (startNum > TOTAL_QUESTIONS) startNum = TOTAL_QUESTIONS;
    clearProgress();
    startQuizWithNumber(startNum);
  });
  DOM.startNumberInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') { e.preventDefault(); DOM.startQuizBtn.click(); } });
  DOM.prevBtn.addEventListener('click', goPrev);
  DOM.nextBtn.addEventListener('click', goNext);
  DOM.skipBtn.addEventListener('click', skipQuestion);
  DOM.submitBtn.addEventListener('click', showResults);
  DOM.quitBtn.addEventListener('click', function() { saveProgress(); if (confirm('메인으로 돌아갑니다. 진행 상황은 저장됩니다.')) window.location.reload(); });
  DOM.retryAllBtn.addEventListener('click', function() { clearProgress(); DOM.resultModal.style.display = 'none'; startQuizWithNumber(currentStartNumber); });
  DOM.reviewWrongBtn.addEventListener('click', function() { DOM.resultModal.style.display = 'none'; showWrongAnswersList(); });
  DOM.closeModalBtn.addEventListener('click', function() { DOM.resultModal.style.display = 'none'; });
  DOM.closeWrongBtn.addEventListener('click', function() { DOM.wrongModal.style.display = 'none'; });
  DOM.retryWrongFromReviewBtn.addEventListener('click', startWrongOnlyReview);
  document.getElementById('splashRetry').addEventListener('click', function() { document.getElementById('splashError').style.display = 'none'; document.getElementById('splashRetry').style.display = 'none'; document.getElementById('splashStatus').textContent = 'Retrying...'; initialize(); });
  attachKeyboardEvents();
}

function showProgressModal(saved) {
  var answered = saved.userAnswers.filter(function(a) { return a !== null && a !== -1; }).length;
  var total = saved.currentQuestions.length;
  var progress = saved.currentIndex + 1;
  var body = document.getElementById('progressModalBody');
  body.innerHTML = '<div style="padding:10px 0;"><p style="font-size:22px;font-weight:700;color:#2c3e50;text-align:center;margin-bottom:10px;">📊 Resume Session</p><div style="background:#f8f9fa;border-radius:12px;padding:16px 20px;margin:15px 0;"><div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Progress</span><strong>' + progress + ' / ' + total + '</strong></div><div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Answered</span><strong>' + answered + ' / ' + total + '</strong></div><div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Correct</span><strong>' + (saved.correctCount || 0) + '</strong></div></div><p style="font-size:13px;color:#999;text-align:center;margin-top:10px;">Click <strong>"Continue"</strong> to resume. Click <strong>"Start Fresh"</strong> to begin again.</p></div>';
  document.getElementById('progressModal').setAttribute('data-saved', JSON.stringify(saved));
  document.getElementById('progressModal').style.display = 'flex';
}

function resumeProgress(saved) {
  currentQuestions = saved.currentQuestions;
  userAnswers = saved.userAnswers;
  currentIndex = saved.currentIndex || 0;
  correctCount = saved.correctCount || 0;
  currentStartNumber = saved.currentStartNumber || 1;
  isReviewMode = saved.isReviewMode || false;
  if (saved.masterQuestions) masterQuestions = saved.masterQuestions;
  if (saved.originalQuestions) originalQuestions = saved.originalQuestions;
  startAutoSave();
  DOM.setupSection.style.display = 'none';
  DOM.quizMain.style.display = 'block';
  if (DOM.quizContent) DOM.quizContent.style.display = 'block';
  if (DOM.progressArea) DOM.progressArea.style.display = 'flex';
  if (isReviewMode) {
    DOM.reviewBanner.style.display = 'block';
    DOM.reviewBanner.innerHTML = '<span>Review Mode: ' + currentQuestions.length + ' questions</span><button id="exitReviewBtn" class="exit-review-btn">EXIT REVIEW</button>';
    document.getElementById('exitReviewBtn').addEventListener('click', function() { clearProgress(); window.location.reload(); });
  }
  renderCurrentQuestion();
}


// ============================================================
// 1350 - addSubjectSelector (신규 추가)
// ============================================================
function addSubjectSelector() {
  var setupSection = document.getElementById('setupSection');
  if (!setupSection) return;
  
  var cardsContainer = setupSection.querySelector('.cards-container');
  if (!cardsContainer) return;
  
  var cardNew = cardsContainer.querySelector('.card-new');
  if (!cardNew) return;
  
  // 이미 존재하면 추가하지 않음
  if (document.getElementById('subjectSelect')) return;
  
  var subjectDiv = document.createElement('div');
  subjectDiv.className = 'input-wrapper';
  subjectDiv.style.marginTop = '4px';
  
  var select = document.createElement('select');
  select.id = 'subjectSelect';
  select.style.cssText = 'width:100%;padding:12px 14px;font-size:15px;font-weight:600;border:2px solid #ddd;border-radius:12px;text-align:center;background:#f8f9fa;outline:none;color:#1a1a2e;cursor:pointer;';
  select.innerHTML = '<option value="">과목 로딩 중...</option>';
  
  // 과목 목록 채우기 (나중에 loadSubjects 후 업데이트)
  subjectDiv.appendChild(select);
  
  // setSelector 위에 삽입
  var setSelectorWrapper = cardNew.querySelector('.input-wrapper');
  if (setSelectorWrapper) {
    cardNew.insertBefore(subjectDiv, setSelectorWrapper);
  } else {
    cardNew.appendChild(subjectDiv);
  }
}
// ============================================================
// 1400 - initialize
// ============================================================
// ============================================================
// 1400 - initialize (최종)
// ============================================================
async function initialize() {
  console.log("🚀 initialize 시작");

  try {
    // 1. DOM 연결
    DOM.setupSection = document.getElementById('setupSection');
    DOM.quizMain = document.getElementById('quizMain');
    DOM.quizContent = document.getElementById('quizContent');
    DOM.startNumberInput = document.getElementById('startNumber');
    DOM.startQuizBtn = document.getElementById('startQuizBtn');
    DOM.maxNumberSpan = document.getElementById('maxNumber');
    DOM.progressText = document.getElementById('progressText');
    DOM.quizProgressBar = document.getElementById('quizProgressBar');
    DOM.questionContainer = document.getElementById('questionContainer');
    DOM.explanationBox = document.getElementById('explanationBox');
    DOM.explanationText = document.getElementById('explanationText');
    DOM.prevBtn = document.getElementById('prevBtn');
    DOM.nextBtn = document.getElementById('nextBtn');
    DOM.skipBtn = document.getElementById('skipBtn');
    DOM.submitBtn = document.getElementById('submitBtn');
    DOM.quitBtn = document.getElementById('quitBtn');
    DOM.resultModal = document.getElementById('resultModal');
    DOM.correctCountSpan = document.getElementById('correctCount');
    DOM.accuracyRateSpan = document.getElementById('accuracyRate');
    DOM.resultGrid = document.getElementById('resultGrid');
    DOM.retryAllBtn = document.getElementById('retryAllBtn');
    DOM.reviewWrongBtn = document.getElementById('reviewWrongBtn');
    DOM.closeModalBtn = document.getElementById('closeModalBtn');
    DOM.wrongModal = document.getElementById('wrongModal');
    DOM.wrongListDiv = document.getElementById('wrongList');
    DOM.closeWrongBtn = document.getElementById('closeWrongBtn');
    DOM.retryWrongFromReviewBtn = document.getElementById('retryWrongFromReviewBtn');
    DOM.reviewBanner = document.getElementById('reviewBanner');
    DOM.savedBadgeContainer = document.getElementById('savedBadgeContainer');
    DOM.loadNextContainer = document.getElementById('loadNextContainer');
    DOM.mainContainer = document.getElementById('mainContainer');
    DOM.maxNumberDisplay = document.getElementById('maxNumberDisplay');
    DOM.setSelector = document.getElementById('setSelector');
    DOM.progressArea = document.querySelector('.progress-area');
    if (!DOM.progressArea) DOM.progressArea = document.getElementById('progressArea');

    console.log("✅ DOM 연결 완료");

   // 2. 과목 선택 이벤트 (HTML에 이미 존재하는 subjectSelect 사용)
var subjectSelect = document.getElementById('subjectSelect');
if (subjectSelect) {
  subjectSelect.addEventListener('change', function() {
    SELECTED_SUBJECT = this.value;
    updateSetSelectorForSubject(SELECTED_SUBJECT);
  });
  console.log("✅ 과목 선택 이벤트 연결 완료");
} else {
  console.log("ℹ️ subjectSelect 요소가 없습니다 (과목 선택 기능 생략)");
}
    // 3. 타이머 초기화
    initTimer();
    updateSplash(10, '서버 연결 중...');
    console.log("✅ 타이머 초기화 완료");

    // 4. 과목 목록 로드
    console.log("🔍 loadSubjects 호출 시작");
    await loadSubjects();
    console.log("✅ loadSubjects 완료");

    // 5. 총 문제수 확인
    console.log("🔍 detectTotalQuestions 호출 시작");
    await detectTotalQuestions(SELECTED_SUBJECT || 'sat');
    console.log("✅ detectTotalQuestions 완료: " + TOTAL_QUESTIONS);

    // 6. Set 선택기 업데이트
    updateSetSelectorForSubject(SELECTED_SUBJECT || 'sat');
    console.log("✅ Set 선택기 업데이트 완료");

    // 7. 저장된 진행 상황 확인
    var saved = loadProgress();
    if (saved && saved.currentQuestions && saved.currentQuestions.length > 0) {
      var answered = saved.userAnswers.filter(function(a) { return a !== null && a !== -1; }).length;
      var timeStr = new Date(saved.timestamp).toLocaleString();
      DOM.savedBadgeContainer.innerHTML =
        '<div class="resume-badge" id="resumeBadge">' +
          '<div class="count">' + answered + ' / ' + saved.currentQuestions.length + ' answered</div>' +
          '<div class="time">' + timeStr + '</div>' +
          '<div class="hint">Click to resume</div>' +
        '</div>';
      var resumeBadge = document.getElementById('resumeBadge');
      if (resumeBadge) {
        resumeBadge.addEventListener('click', function(e) {
          e.stopPropagation();
          var savedData = loadProgress();
          if (savedData) showProgressModal(savedData);
        });
      }
      var resumeCard = document.getElementById('resumeCard');
      if (resumeCard) {
        var newCard = resumeCard.cloneNode(true);
        resumeCard.parentNode.replaceChild(newCard, resumeCard);
        newCard.addEventListener('click', function() {
          var savedData = loadProgress();
          if (savedData) showProgressModal(savedData);
        });
      }
    } else {
      DOM.savedBadgeContainer.innerHTML = '<div class="no-session">No saved session<small>Start a new lesson</small></div>';
    }
    console.log("✅ 진행 상황 확인 완료");

    // 8. 이벤트 연결
    attachEvents();
    console.log("✅ 이벤트 연결 완료");

    // 9. 스플래시 숨기기
    updateSplash(100, 'Ready!');
    console.log("✅ 스플래시 100%");

    // 10. 로그인 화면 표시
    var loginScreen = document.getElementById('loginScreen');
    if (loginScreen) {
      loginScreen.style.display = 'flex';
      console.log("✅ 로그인 화면 표시");
    } else {
      console.warn('⚠️ loginScreen 요소를 찾을 수 없음');
    }

    // 11. 스플래시 제거
    var overlay = document.getElementById('splashOverlay');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(function() {
        overlay.style.display = 'none';
        var main = document.getElementById('mainContainer');
        if (main) main.style.display = 'block';
        console.log("✅ 스플래시 제거 완료");
      }, 500);
    }

    console.log("🎉 initialize 완료");

  } catch (e) {
    console.error("❌ initialize 오류:", e);
    console.error(e.stack);

    // 오류 시에도 로그인 화면은 표시
    var loginScreen = document.getElementById('loginScreen');
    if (loginScreen) {
      loginScreen.style.display = 'flex';
    }
    var overlay = document.getElementById('splashOverlay');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(function() {
        overlay.style.display = 'none';
        var main = document.getElementById('mainContainer');
        if (main) main.style.display = 'block';
      }, 500);
    }
  }
}

// ============================================================
// 1500 - startQuizWithNumber
// ============================================================
async function startQuizWithNumber(uiStartNumber) {
  if (isNaN(uiStartNumber) || uiStartNumber < 1) uiStartNumber = 1;
  var subject = SELECTED_SUBJECT || 'sat';
  if (uiStartNumber > TOTAL_QUESTIONS) { uiStartNumber = 1; }
  var setNumber = Math.ceil(uiStartNumber / QUESTIONS_PER_SET);
  var setStart = (setNumber - 1) * QUESTIONS_PER_SET + 1;
  var startNum = uiStartNumber;
  if (uiStartNumber < setStart || uiStartNumber > Math.min(setNumber * QUESTIONS_PER_SET, TOTAL_QUESTIONS)) { startNum = setStart; }
  currentStartNumber = startNum;
  var overlay = showLoadingOverlay('Loading ' + QUESTIONS_PER_SET + ' questions from ' + startNum + '...');
  try {
    var questions = await load50Questions(startNum, subject);
    if (questions.length === 0) throw new Error('No question data received');
    masterQuestions = questions.slice();
    currentQuestions = masterQuestions.map(function(q) { return randomizeChoicesOnly(q); });
    userAnswers = new Array(currentQuestions.length).fill(null);
    correctCount = 0;
    currentIndex = 0;
    isReviewMode = false;
    startAutoSave();
    hideLoadingOverlay();
    DOM.setupSection.style.display = 'none';
    DOM.quizMain.style.display = 'block';
    if (DOM.quizContent) DOM.quizContent.style.display = 'block';
    if (DOM.progressArea) DOM.progressArea.style.display = 'flex';
    renderCurrentQuestion();
    resetTimer();
    startTimer();
  } catch(err) {
    hideLoadingOverlay();
    alert('❌ 문제를 불러오지 못했습니다: ' + err.message);
    console.error(err);
  }
}

function showLoadingOverlay(text) {
  var overlay = document.createElement('div');
  overlay.id = 'loadingOverlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9998;display:flex;flex-direction:column;justify-content:center;align-items:center;color:#fff;font-size:18px;';
  overlay.innerHTML = '<div style="font-size:40px;margin-bottom:20px;">⏳</div><div>' + (text || 'Loading...') + '</div>';
  document.body.appendChild(overlay);
  return overlay;
}

function hideLoadingOverlay() {
  var overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.remove();
}

// ============================================================
// 1600 - load50Questions & detectTotalQuestions
// ============================================================
async function load50Questions(uiStartNumber, subject) {
  var subjectName = subject || 'sat';
  if (TOTAL_QUESTIONS === 0) await detectTotalQuestions(subjectName);
  try {
    var url = ORIGINAL_API_URL + '?start=' + uiStartNumber + '&limit=' + QUESTIONS_PER_SET + '&subject=' + subjectName;
    var response = await fetch(url);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    var text = await response.text();
    if (text.trim().startsWith('<IDOCTYPE') || text.trim().startsWith('<html>')) {
      throw new Error('HTML response - check Apps Script URL');
    }
    var data = JSON.parse(text);
    var questionsData = [];
    if (Array.isArray(data)) questionsData = data;
    else if (data && typeof data === 'object') {
      if (Array.isArray(data.data)) questionsData = data.data;
      else if (Array.isArray(data.questions)) questionsData = data.questions;
      else if (Array.isArray(data.items)) questionsData = data.items;
      else {
        var keys = Object.keys(data);
        if (keys.length > 0) {
          questionsData = keys.map(function(key) {
            var item = data[key];
            if (typeof item === 'object' && item !== null) { item._key = key; return item; }
            return { question: String(item), answer: '1', _key: key };
          });
        }
      }
    }
    if (!Array.isArray(questionsData) || questionsData.length === 0) throw new Error('No question data received');
    var processed = [];
    for (var idx = 0; idx < questionsData.length; idx++) {
      try {
        var item = questionsData[idx];
        var parsed = item;
        if (typeof item === 'string') {
          try { parsed = JSON.parse(item); } catch(e) { parsed = { question: item, answer: '1' }; }
        }
        if (!parsed || typeof parsed !== 'object') parsed = { question: String(item), answer: '1' };
        var rawQuestion = parsed.Q || parsed.question || parsed.q || parsed.문제 || parsed.text || 'Question ' + (uiStartNumber + idx);
        var rawPassage = parsed.passage || parsed.P || parsed.p || parsed.지문 || '';
        var choices = {};
        choices['1'] = parsed['1'] || '';
        choices['2'] = parsed['2'] || '';
        choices['3'] = parsed['3'] || '';
        choices['4'] = parsed['4'] || '';
        var finalAnswer = '1';
        if (parsed.A !== undefined && parsed.A !== null && parsed.A !== "") finalAnswer = String(parsed.A).trim();
        else if (parsed.answer !== undefined && parsed.answer !== null && parsed.answer !== "") finalAnswer = String(parsed.answer).trim();
        else if (parsed.a !== undefined && parsed.a !== null && parsed.a !== "") finalAnswer = String(parsed.a).trim();
        var originalNumber = parsed.N || parsed.originalNumber || parsed.n || (uiStartNumber + idx);
        processed.push({ N: originalNumber, question: rawQuestion, passage: rawPassage, choices: choices, answer: finalAnswer, explanation: parsed.explanation || parsed.E || parsed.e || 'No explanation available.', graphic: parsed.graphic || parsed.G || parsed.g || '', originalNumber: originalNumber, A: parsed.A || parsed.answer || '' });
      } catch(e) { console.warn('Parse error for item', idx, ':', e); }
    }
    if (processed.length === 0) throw new Error('No valid question data');
    return processed;
  } catch(err) { console.error('Load failed:', err); return []; }
}

async function detectTotalQuestions(subject) {
  subject = subject || 'sat';
  try {
    var cached = localStorage.getItem(TOTAL_CACHE_KEY);
    if (cached) { var parsed = parseInt(cached); if (!isNaN(parsed) && parsed > 0) { TOTAL_QUESTIONS = parsed; return parsed; } }
    var url = ORIGINAL_API_URL + '?total=true&subject=' + subject;
    var response = await fetch(url);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    var data = await response.json();
    if (data && typeof data === 'object' && data.total !== undefined) { TOTAL_QUESTIONS = parseInt(data.total) || 0; }
    else { var keys = Object.keys(data); if (keys.length > 0) { TOTAL_QUESTIONS = keys.length; } }
    if (TOTAL_QUESTIONS === 0) TOTAL_QUESTIONS = 720;
    localStorage.setItem(TOTAL_CACHE_KEY, String(TOTAL_QUESTIONS));
    return TOTAL_QUESTIONS;
  } catch(e) { console.warn('Could not detect total, using fallback: 720'); TOTAL_QUESTIONS = 720; localStorage.setItem(TOTAL_CACHE_KEY, String(TOTAL_QUESTIONS)); return TOTAL_QUESTIONS; }
}

// ============================================================
// 1700 - renderGraphic (최소 버전 - 기능 유지)
// ============================================================
function renderGraphic(jsonData) {
  if (!jsonData || jsonData.trim() == "") return "";
  var data = jsonData.trim();
  if (data.startsWith("\"") && data.endsWith("\"")) data = data.slice(1, -1);
  data = data.replace(/\"/g, "");
  var parsedData = null;
  try { parsedData = JSON.parse(data); } catch(e) { return '<div style="padding:10px;color:#999;text-align:center;">📊 그래프 데이터 오류</div>'; }
  if (!parsedData || typeof parsedData !== 'object') return '<div style="padding:10px;color:#999;text-align:center;">📊 데이터 없음</div>';
  var chartId = 'chart_' + Math.random().toString(36).substr(2, 9);
  var html = '<div style="margin:15px 0;padding:15px;background:#f8f9fa;border-radius:8px;border:1px solid #e9ecef;"><canvas id="' + chartId + '" style="max-height:400px;width:100%;"></canvas></div>';
  if (parsedData.type === 'table' && parsedData.headers && parsedData.rows) {
    var h = '<div style="margin:15px 0;overflow-x:auto;background:white;border-radius:8px;border:1px solid #ddd;"><table style="width:100%;border-collapse:collapse;text-align:center;font-size:14px;">';
    h += '<thead><tr style="background:#3498db;color:white;">';
    parsedData.headers.forEach(function(hd) { h += '<th style="padding:10px 14px;border:1px solid #2980b9;font-weight:bold;">' + escapeHtml(hd) + '</th>'; });
    h += '</tr></thead><tbody>';
    parsedData.rows.forEach(function(row, ri) { h += '<tr style="background:' + (ri % 2 == 0 ? '#fff' : '#f8f9fa') + ';">'; row.forEach(function(cell) { h += '<td style="padding:8px 14px;border:1px solid #ddd;">' + escapeHtml(cell) + '</td>'; }); h += '</tr>'; });
    h += '</tbody></table></div>';
    return h;
  }
  setTimeout(function() {
    var ctx = document.getElementById(chartId);
    if (!ctx) return;
    if (window._chartInstances && window._chartInstances[chartId]) { window._chartInstances[chartId].destroy(); }
    if (!window._chartInstances) window._chartInstances = {};
    var colors = ['#3498db', '#e74c3c', '#27ae60', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#2c3e50', '#7f8c8d', '#16a085'];
    if (parsedData.type === 'bar' || parsedData.type === 'histogram') {
      var labels = parsedData.labels || [];
      var datasets = [];
      if (parsedData.series && Array.isArray(parsedData.series)) {
        datasets = parsedData.series.map(function(s, i) { return { label: s.name || 'Series ' + (i+1), data: s.data || [], backgroundColor: colors[i % colors.length] + '80', borderColor: colors[i % colors.length], borderWidth: 2 }; });
      } else if (parsedData.values) {
        datasets = [{ label: parsedData.label || 'Data', data: parsedData.values, backgroundColor: '#3498db80', borderColor: '#3498db', borderWidth: 2 }];
      }
      if (datasets.length > 0) {
        var cc = { type: 'bar', data: { labels: labels, datasets: datasets }, options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: parsedData.title || 'Chart', font: { size: 16, weight: 'bold' } }, legend: { position: 'bottom' } }, scales: { x: { grid: { color: '#e0e0e0' } }, y: { beginAtZero: true, grid: { color: '#e0e0e0' } } } } };
        var canvas = document.getElementById(chartId);
        if (canvas) { canvas.parentElement.style.height = '400px'; window._chartInstances[chartId] = new Chart(canvas, cc); }
      }
    } else if (parsedData.type === 'pie' && parsedData.labels && parsedData.values) {
      var cc = { type: 'pie', data: { labels: parsedData.labels, datasets: [{ data: parsedData.values, backgroundColor: parsedData.colors || ['#3498db','#e74c3c','#27ae60','#f39c12','#9b59b6','#1abc9c'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: parsedData.title || 'Pie Chart', font: { size: 16, weight: 'bold' } }, legend: { position: 'bottom' } } } };
      var canvas = document.getElementById(chartId);
      if (canvas) { canvas.parentElement.style.height = '400px'; window._chartInstances[chartId] = new Chart(canvas, cc); }
    }
  }, 100);
  return html;
}

// ============================================================
// 1800 - startApp (로그인 후 실행)
// ============================================================
function startApp() {
  var loginScreen = document.getElementById('loginScreen');
  if (loginScreen) loginScreen.remove();
  initialize();
}

// ============================================================
// 1900 - updateProgressDisplay
// ============================================================
function updateProgressDisplay() {
  if (!DOM.progressText || !DOM.quizProgressBar) return;
  var total = currentQuestions.length || 1;
  var current = Math.min(currentIndex + 1, total);
  DOM.progressText.textContent = current + ' / ' + total;
  var percent = (current / total) * 100;
  DOM.quizProgressBar.style.width = Math.min(percent, 100) + '%';
}

// ============================================================
// 9900 - 내보내기 (기존 + 회원관리)
// ============================================================

// window 객체에 노출
window.initialize = initialize;
window.startQuizWithNumber = startQuizWithNumber;
window.renderGraphic = renderGraphic;
window.renderCurrentQuestion = renderCurrentQuestion;
window.showExplanation = showExplanation;
window.goNext = goNext;
window.goPrev = goPrev;
window.skipQuestion = skipQuestion;
window.submitSubjective = submitSubjective;
window.showResults = showResults;
window.showWrongAnswersList = showWrongAnswersList;
window.startWrongOnlyReview = startWrongOnlyReview;
window.saveProgress = saveProgress;
window.loadProgress = loadProgress;
window.clearProgress = clearProgress;

window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.showRegisterUI = showRegisterUI;
window.showLoginScreen = showLoginScreen;
window.logout = logout;
window.loadSubjects = loadSubjects;
window.checkAutoLogin = checkAutoLogin;
window.startApp = startApp;

// ES Module export
export {
  initialize,
  startQuizWithNumber,
  renderGraphic,
  renderCurrentQuestion,
  showExplanation,
  goNext,
  goPrev,
  skipQuestion,
  submitSubjective,
  showResults,
  showWrongAnswersList,
  startWrongOnlyReview,
  saveProgress,
  loadProgress,
  handleLogin,
  handleRegister,
  showRegisterUI,
  showLoginScreen,
  logout,
  loadSubjects,
  checkAutoLogin,
  startApp
};

console.log("✅ main.js loaded with exports");
