// ============================================================
// 0000 - main.js 통합 코드 (SAT Quiz + 회원관리)
// ============================================================

// ============================================================
// 0050 - 회원관리 LANG 객체 (신규)
// ============================================================
var LANG = {
  // ... (기존 LANG 내용은 여기에 그대로 유지)
  // 기존 LANG 내용이 길어 생략, 실제 사용시 기존 LANG 유지
  
  // ===== 신규 회원관리 메시지 =====
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
// 0100 - 기존 LANG 객체 (그대로 유지)
// ============================================================
// (기존 LANG 내용을 여기에 붙여넣으세요)

// ============================================================
// 0200 - 기존 API URL
// ============================================================
var API_URL = "https://script.google.com/macros/s/AKfycbwYnCi7myER0R4djAV7CLW9Y1aTa-mjFSk_y_8vCD_p8vN78Sr5JeUB0WEqJR0_OTuG/exec";

// ============================================================
// 0250 - 회원관리 API URL & 상수 (신규)
// ============================================================
var ORIGINAL_API_URL = API_URL; // 기존 URL과 동일 사용
var MEMBER_API_URL = API_URL;   // 동일한 URL 사용
var SESSION_KEY = 'sat_user_session';
var CURRENT_USER = null;

// ============================================================
// 0300 - 기존 전역 변수
// ============================================================
// (기존 전역 변수 내용을 여기에 그대로 유지)
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
// 0350 - 회원관리 전역 변수 (신규)
// ============================================================
var SELECTED_SUBJECT = 'sat';
var SUBJECTS_LIST = [];
var SUBJECTS_LOADED = false;

// ============================================================
// 0400 - Splash 화면 관련 함수 (기존 유지)
// ============================================================
// (기존 Splash 함수들을 여기에 그대로 유지)

// ============================================================
// 0450 - 로그인/회원가입 UI 관련 함수 (신규)
// ============================================================

// 로그인 화면 표시
function showLoginScreen() {
  var loginHTML = `
    <div id="loginScreen" style="position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);z-index:9999;display:flex;justify-content:center;align-items:center;padding:20px;box-sizing:border-box;">
      <div style="background:white;padding:40px;border-radius:24px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
        <div style="text-align:center;margin-bottom:25px;">
          <div style="font-size:3rem;">📚</div>
          <h2 style="color:#1a1a2e;margin:10px 0 4px;">${LANG.loginTitle || '🔐 SAT 로그인'}</h2>
          <p style="color:#888;font-size:0.9rem;margin:0;">SAT & PSAT & AP Learning Platform</p>
        </div>
        <div style="margin-bottom:15px;">
          <input type="email" id="loginEmail" placeholder="${LANG.loginEmail || '이메일'}" 
            style="width:100%;padding:14px 16px;border:2px solid #ddd;border-radius:12px;font-size:16px;box-sizing:border-box;outline:none;transition:all 0.3s;"
            onfocus="this.style.borderColor='#f5a623'" onblur="this.style.borderColor='#ddd'">
        </div>
        <div style="margin-bottom:15px;">
          <input type="password" id="loginPin" placeholder="${LANG.loginPin || 'PIN (4자리 숫자)'}" maxlength="4"
            style="width:100%;padding:14px 16px;border:2px solid #ddd;border-radius:12px;font-size:16px;box-sizing:border-box;outline:none;transition:all 0.3s;"
            onfocus="this.style.borderColor='#f5a623'" onblur="this.style.borderColor='#ddd'"
            onkeypress="if(event.key==='Enter') handleLogin()">
        </div>
        <button id="loginBtn" onclick="handleLogin()" 
          style="width:100%;padding:16px;background:#f5a623;color:white;border:none;border-radius:12px;font-size:18px;font-weight:700;cursor:pointer;transition:all 0.3s;box-shadow:0 4px 16px rgba(245,166,35,0.3);"
          onmouseover="this.style.background='#e0941a'" onmouseout="this.style.background='#f5a623'">
          ${LANG.loginBtn || '로그인'}
        </button>
        <div id="loginMessage" style="margin-top:12px;text-align:center;font-size:14px;min-height:24px;color:#e74c3c;"></div>
        <div style="text-align:center;margin-top:16px;font-size:14px;color:#888;">
          <a href="#" onclick="showRegisterUI()" style="color:#3498db;text-decoration:none;font-weight:600;">${LANG.registerBtn || '회원가입'}</a>
          <span style="margin:0 12px;">|</span>
          <a href="#" onclick="alert('관리자에게 문의해주세요.')" style="color:#888;text-decoration:none;">PIN 찾기</a>
        </div>
        <div style="text-align:center;margin-top:10px;font-size:12px;color:#aaa;">
          체험 계정: student@gmail.com / 1234
        </div>
      </div>
    </div>
  `;
  
  // 기존 loginScreen 제거 후 추가
  var existing = document.getElementById('loginScreen');
  if (existing) existing.remove();
  
  var div = document.createElement('div');
  div.innerHTML = loginHTML;
  document.body.appendChild(div.firstElementChild);
}

// 로그인 처리
async function handleLogin() {
  var email = document.getElementById('loginEmail').value.trim();
  var pin = document.getElementById('loginPin').value.trim();
  var msg = document.getElementById('loginMessage');
  var btn = document.getElementById('loginBtn');
  
  if (!email || !pin) {
    msg.textContent = LANG.loginError || '이메일과 PIN을 입력해주세요.';
    msg.style.color = '#e74c3c';
    return;
  }
  
  msg.textContent = '⏳ 확인 중...';
  msg.style.color = '#f5a623';
  btn.disabled = true;
  btn.textContent = '⏳';
  
  try {
    var response = await fetch(MEMBER_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', email: email, pin: pin })
    });
    
    var result = await response.json();
    
    if (result.success) {
      // 로그인 성공
      CURRENT_USER = result.data;
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        email: email,
        name: result.data.name || email,
        payment_status: result.data.payment_status,
        access_subjects: result.data.access_subjects,
        timestamp: Date.now()
      }));
      
      // 로그인 화면 제거
      var loginScreen = document.getElementById('loginScreen');
      if (loginScreen) loginScreen.remove();
      
      // 과목 목록 로드 후 앱 시작
      await loadSubjects();
      startApp();
      
    } else {
      msg.textContent = result.message || LANG.loginFailed;
      msg.style.color = '#e74c3c';
      btn.disabled = false;
      btn.textContent = LANG.loginBtn || '로그인';
    }
    
  } catch(error) {
    msg.textContent = '⚠️ 서버 연결 오류: ' + error.message;
    msg.style.color = '#e74c3c';
    btn.disabled = false;
    btn.textContent = LANG.loginBtn || '로그인';
    console.error('Login error:', error);
  }
}

// 회원가입 UI 표시
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
      <input type="email" id="regEmail" placeholder="이메일" 
        style="width:100%;padding:14px 16px;border:2px solid #ddd;border-radius:12px;font-size:16px;box-sizing:border-box;outline:none;transition:all 0.3s;">
    </div>
    <div style="margin-bottom:12px;">
      <input type="text" id="regName" placeholder="이름 (선택)" 
        style="width:100%;padding:14px 16px;border:2px solid #ddd;border-radius:12px;font-size:16px;box-sizing:border-box;outline:none;transition:all 0.3s;">
    </div>
    <div style="margin-bottom:15px;">
      <input type="password" id="regPin" placeholder="PIN (4자리 숫자)" maxlength="4"
        style="width:100%;padding:14px 16px;border:2px solid #ddd;border-radius:12px;font-size:16px;box-sizing:border-box;outline:none;transition:all 0.3s;"
        onkeypress="if(event.key==='Enter') handleRegister()">
    </div>
    <button onclick="handleRegister()" 
      style="width:100%;padding:16px;background:#27ae60;color:white;border:none;border-radius:12px;font-size:18px;font-weight:700;cursor:pointer;transition:all 0.3s;box-shadow:0 4px 16px rgba(39,174,96,0.3);"
      onmouseover="this.style.background='#219a52'" onmouseout="this.style.background='#27ae60'">
      가입하기
    </button>
    <div id="regMessage" style="margin-top:12px;text-align:center;font-size:14px;min-height:24px;color:#e74c3c;"></div>
    <div style="text-align:center;margin-top:16px;font-size:14px;">
      <a href="#" onclick="showLoginScreen()" style="color:#3498db;text-decoration:none;font-weight:600;">← 로그인으로 돌아가기</a>
    </div>
  `;
}

// 회원가입 처리
async function handleRegister() {
  var email = document.getElementById('regEmail').value.trim();
  var name = document.getElementById('regName').value.trim();
  var pin = document.getElementById('regPin').value.trim();
  var msg = document.getElementById('regMessage');
  var btn = document.querySelector('#loginScreen button');
  
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
    var response = await fetch(MEMBER_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'register', 
        email: email, 
        pin: pin, 
        name: name || email 
      })
    });
    
    var result = await response.json();
    
    if (result.success) {
      msg.textContent = '✅ ' + result.message;
      msg.style.color = '#27ae60';
      setTimeout(function() {
        showLoginScreen();
      }, 1500);
    } else {
      msg.textContent = result.message || '회원가입 실패';
      msg.style.color = '#e74c3c';
      if (btn) btn.disabled = false;
    }
    
  } catch(error) {
    msg.textContent = '⚠️ 서버 오류: ' + error.message;
    msg.style.color = '#e74c3c';
    if (btn) btn.disabled = false;
    console.error('Register error:', error);
  }
}

// ============================================================
// 0500 - 기존 유틸리티 함수
// ============================================================
// (기존 escapeHtml, getAnswerLetter, hasRealChoices, randomizeChoicesOnly 등 유지)

// ============================================================
// 0550 - 회원관리 유틸리티 함수 (신규)
// ============================================================

// 자동 로그인 체크
function checkAutoLogin() {
  var session = localStorage.getItem(SESSION_KEY);
  if (!session) return false;
  
  try {
    var data = JSON.parse(session);
    // 7일 이내인지 확인
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

// 과목 목록 로드
async function loadSubjects() {
  if (SUBJECTS_LOADED) return SUBJECTS_LIST;
  
  try {
    var response = await fetch(MEMBER_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'subjects' })
    });
    
    var result = await response.json();
    
    if (result.success && result.data) {
      SUBJECTS_LIST = result.data;
      SUBJECTS_LOADED = true;
      return SUBJECTS_LIST;
    } else {
      console.warn('Failed to load subjects:', result.message);
      return [];
    }
  } catch(error) {
    console.error('Load subjects error:', error);
    return [];
  }
}

// 사용자 접근 가능 과목 필터링
function getAccessibleSubjects() {
  if (!CURRENT_USER || !CURRENT_USER.access_subjects) {
    return SUBJECTS_LIST;
  }
  
  try {
    var accessList = JSON.parse(CURRENT_USER.access_subjects);
    return SUBJECTS_LIST.filter(function(s) {
      return accessList.indexOf(s.subject) !== -1;
    });
  } catch(e) {
    return SUBJECTS_LIST;
  }
}

// 로그아웃
function logout() {
  if (confirm('로그아웃 하시겠습니까?')) {
    localStorage.removeItem(SESSION_KEY);
    CURRENT_USER = null;
    window.location.reload();
  }
}

// ============================================================
// 0600~1400 - 기존 기능 (숫자 블록 유지)
// ============================================================
// (기존 startAutoSave, goNext, goPrev, skipQuestion, submitSubjective,
//  showResults, showWrongAnswersList, startWrongOnlyReview,
//  타이머, 렌더링 함수 등 그대로 유지)

// ============================================================
// 1500 - startQuizWithNumber (수정: 과목 지원)
// ============================================================
async function startQuizWithNumber(uiStartNumber) {
  if (isNaN(uiStartNumber) || uiStartNumber < 1) uiStartNumber = 1;
  
  var subject = SELECTED_SUBJECT || 'sat';
  
  if (uiStartNumber > TOTAL_QUESTIONS) {
    console.log('Number ' + uiStartNumber + ' exceeds total ' + TOTAL_QUESTIONS + ', looping back to 1.');
    uiStartNumber = 1;
  }
  
  var setNumber = Math.ceil(uiStartNumber / QUESTIONS_PER_SET);
  var setStart = (setNumber - 1) * QUESTIONS_PER_SET + 1;
  var startNum = uiStartNumber;
  if (uiStartNumber < setStart || uiStartNumber > Math.min(setNumber * QUESTIONS_PER_SET, TOTAL_QUESTIONS)) {
    startNum = setStart;
  }
  
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
    alert(LANG.loadError + ' ' + err.message);
    console.error(err);
  }
}

// ============================================================
// 0850 - 회원 API 호출 함수 (신규)
// ============================================================

// API 호출 공통 함수 (토큰 포함)
async function callMemberAPI(action, data) {
  var payload = { action: action, data: data || {} };
  
  // 세션 토큰이 있으면 포함
  var session = localStorage.getItem(SESSION_KEY);
  if (session) {
    try {
      var sessionData = JSON.parse(session);
      payload.email = sessionData.email;
    } catch(e) {}
  }
  
  var response = await fetch(MEMBER_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  return await response.json();
}

// ============================================================
// 0900 - load50Questions (수정: 과목 지원)
// ============================================================
async function load50Questions(uiStartNumber, subject) {
  var subjectName = subject || 'sat';
  
  if (TOTAL_QUESTIONS === 0) await detectTotalQuestions(subjectName);
  
  try {
    var url = ORIGINAL_API_URL + '?start=' + uiStartNumber + '&limit=' + QUESTIONS_PER_SET + '&subject=' + subjectName;
    console.log('Requesting questions (direct):', url);
    
    var response = await fetch(url);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    
    var text = await response.text();
    if (text.trim().startsWith('<IDOCTYPE') || text.trim().startsWith('<html>')) {
      console.error('Received HTML. Check Apps Script deployment.');
      throw new Error('HTML response - check Apps Script URL');
    }
    
    var data = JSON.parse(text);
    var questionsData = [];
    
    if (Array.isArray(data)) {
      questionsData = data;
    } else if (data && typeof data === 'object') {
      if (Array.isArray(data.data)) questionsData = data.data;
      else if (Array.isArray(data.questions)) questionsData = data.questions;
      else if (Array.isArray(data.items)) questionsData = data.items;
      else {
        var keys = Object.keys(data);
        if (keys.length > 0) {
          questionsData = keys.map(function(key) {
            var item = data[key];
            if (typeof item === 'object' && item !== null) {
              item._key = key;
              return item;
            }
            return { question: String(item), answer: '1', _key: key };
          });
        }
      }
    }
    
    if (!Array.isArray(questionsData) || questionsData.length === 0) {
      throw new Error('No question data received');
    }
    
    var processed = [];
    for (var idx = 0; idx < questionsData.length; idx++) {
      try {
        var item = questionsData[idx];
        var parsed = item;
        if (typeof item === 'string') {
          try { parsed = JSON.parse(item); } catch(e) { parsed = { question: item, answer: '1' }; }
        }
        if (!parsed || typeof parsed !== 'object') {
          parsed = { question: String(item), answer: '1' };
        }
        
        var rawQuestion = parsed.Q || parsed.question || parsed.q || parsed.문제 || parsed.text || 'Question ' + (uiStartNumber + idx);
        var rawPassage = parsed.passage || parsed.P || parsed.p || parsed.지문 || '';
        var choices = {};
        choices['1'] = parsed['1'] || '';
        choices['2'] = parsed['2'] || '';
        choices['3'] = parsed['3'] || '';
        choices['4'] = parsed['4'] || '';
        
        var finalAnswer = '1';
        if (parsed.A !== undefined && parsed.A !== null && parsed.A !== "") {
          finalAnswer = String(parsed.A).trim();
        } else if (parsed.answer !== undefined && parsed.answer !== null && parsed.answer !== "") {
          finalAnswer = String(parsed.answer).trim();
        } else if (parsed.a !== undefined && parsed.a !== null && parsed.a !== "") {
          finalAnswer = String(parsed.a).trim();
        }
        
        var originalNumber = parsed.N || parsed.originalNumber || parsed.n || (uiStartNumber + idx);
        
        processed.push({
          N: originalNumber,
          question: rawQuestion,
          passage: rawPassage,
          choices: choices,
          answer: finalAnswer,
          explanation: parsed.explanation || parsed.E || parsed.e || 'No explanation available.',
          graphic: parsed.graphic || parsed.G || parsed.g || '',
          originalNumber: originalNumber,
          A: parsed.A || parsed.answer || ''
        });
        
      } catch(e) {
        console.warn('Parse error for item', idx, ':', e);
      }
    }
    
    if (processed.length === 0) throw new Error('No valid question data');
    return processed;
    
  } catch(err) {
    console.error('Load failed:', err);
    return [];
  }
}

// ============================================================
// 1600 - renderGraphic (기존 유지)
// ============================================================

// ============================================================
// 1700 - 회원관리 핵심 함수 (신규)
// ============================================================

// 앱 시작 (로그인 후)
function startApp() {
  // Setup 영역 표시
  var loginScreen = document.getElementById('loginScreen');
  if (loginScreen) loginScreen.remove();
  
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
  
  // subject 선택 드롭다운 추가
  addSubjectSelector();
  
  // 과목 선택 이벤트
  var subjectSelect = document.getElementById('subjectSelect');
  if (subjectSelect) {
    subjectSelect.addEventListener('change', function() {
      SELECTED_SUBJECT = this.value;
      updateSetSelectorForSubject(SELECTED_SUBJECT);
    });
  }
  
  initTimer();
  
  // 초기화
  (async function() {
    try {
      var totalQuestions = await detectTotalQuestions(SELECTED_SUBJECT || 'sat');
      if (totalQuestions === 0) {
        TOTAL_QUESTIONS = 720;
        localStorage.setItem(TOTAL_CACHE_KEY, String(TOTAL_QUESTIONS));
      }
      updateSetSelectorForSubject(SELECTED_SUBJECT || 'sat');
      
      // 저장된 진행 상황 확인
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
      } else {
        DOM.savedBadgeContainer.innerHTML = 
          '<div class="no-session">No saved session<small>Start a new lesson</small></div>';
      }
      
      attachEvents();
      
      DOM.setupSection.style.display = 'block';
      DOM.quizMain.style.display = 'none';
      
    } catch(e) {
      console.error('Initialization error:', e);
      showSplashError(e.message || 'Initialization failed');
    }
  })();
}

// 과목 선택 드롭다운 추가
function addSubjectSelector() {
  var setupSection = document.getElementById('setupSection');
  if (!setupSection) return;
  
  var cardsContainer = setupSection.querySelector('.cards-container');
  if (!cardsContainer) return;
  
  var cardNew = cardsContainer.querySelector('.card-new');
  if (!cardNew) return;
  
  // subject 드롭다운이 이미 있으면 스킵
  if (document.getElementById('subjectSelect')) return;
  
  var subjectDiv = document.createElement('div');
  subjectDiv.className = 'input-wrapper';
  subjectDiv.style.marginTop = '4px';
  
  var select = document.createElement('select');
  select.id = 'subjectSelect';
  select.style.cssText = 'width:100%;padding:14px 16px;font-size:16px;font-weight:600;border:2px solid #ddd;border-radius:12px;text-align:center;background:#f8f9fa;outline:none;transition:all .3s;color:#1a1a2e;cursor:pointer;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23666\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 16px center;';
  select.innerHTML = '<option value="">' + (LANG.loadingSubjects || '과목 로딩 중...') + '</option>';
  
  // 과목 목록 채우기
  populateSubjectSelect(select);
  
  subjectDiv.appendChild(select);
  
  // setSelector 앞에 삽입
  var setSelectorWrapper = cardNew.querySelector('.input-wrapper');
  if (setSelectorWrapper) {
    cardNew.insertBefore(subjectDiv, setSelectorWrapper);
  } else {
    cardNew.appendChild(subjectDiv);
  }
}

// 과목 선택 드롭다운 채우기
function populateSubjectSelect(select) {
  if (!select) return;
  
  var subjects = getAccessibleSubjects();
  
  if (!subjects || subjects.length === 0) {
    select.innerHTML = '<option value="sat">SAT (기본)</option>';
    return;
  }
  
  select.innerHTML = '';
  subjects.forEach(function(s) {
    var option = document.createElement('option');
    option.value = s.subject;
    option.textContent = s.display_name + ' (' + s.total_questions + '문제)';
    select.appendChild(option);
  });
  
  // 기본값: sat 또는 첫 번째 과목
  var defaultSubject = 'sat';
  var found = false;
  for (var i = 0; i < select.options.length; i++) {
    if (select.options[i].value === defaultSubject) {
      select.value = defaultSubject;
      found = true;
      break;
    }
  }
  if (!found && select.options.length > 0) {
    select.value = select.options[0].value;
  }
  
  SELECTED_SUBJECT = select.value || 'sat';
}

// 과목별 Set 선택기 업데이트
function updateSetSelectorForSubject(subject) {
  var setSelector = document.getElementById('setSelector');
  if (!setSelector) return;
  
  // 과목별 총 문제수 가져오기
  var totalQuestions = 0;
  var subjects = getAccessibleSubjects();
  for (var i = 0; i < subjects.length; i++) {
    if (subjects[i].subject === subject) {
      totalQuestions = subjects[i].total_questions || 0;
      break;
    }
  }
  
  if (totalQuestions === 0) totalQuestions = TOTAL_QUESTIONS || 720;
  
  var totalSets = Math.ceil(totalQuestions / QUESTIONS_PER_SET);
  
  // 기존 옵션 제거
  while (setSelector.options.length > 0) {
    setSelector.remove(0);
  }
  
  for (var i = 1; i <= totalSets; i++) {
    var start = (i - 1) * QUESTIONS_PER_SET + 1;
    var end = Math.min(i * QUESTIONS_PER_SET, totalQuestions);
    var option = document.createElement('option');
    option.value = i;
    option.textContent = 'Set ' + i + ' (Q' + start + '-' + end + ')';
    setSelector.appendChild(option);
  }
  
  // maxNumberDisplay 업데이트
  var maxStartNumber = Math.max(1, totalQuestions - QUESTIONS_PER_SET + 1);
  if (DOM.maxNumberDisplay) {
    DOM.maxNumberDisplay.innerText = maxStartNumber.toLocaleString();
  }
  if (DOM.startNumberInput) {
    DOM.startNumberInput.placeholder = '1 ~ ' + maxStartNumber.toLocaleString();
    DOM.startNumberInput.max = maxStartNumber;
  }
  
  if (setSelector.options.length > 0) {
    setSelector.value = '1';
  }
  if (DOM.startNumberInput) {
    DOM.startNumberInput.value = '1';
  }
}

// ============================================================
// 9900 - 기존 내보내기
// ============================================================
// (기존 window.xxx = xxx; export {...} 유지)

// ============================================================
// 9950 - 회원// ============================================================
// 9950 - 회원관리 내보내기 (신규)
// ============================================================
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.showRegisterUI = showRegisterUI;
window.showLoginScreen = showLoginScreen;
window.logout = logout;
window.loadSubjects = loadSubjects;
window.checkAutoLogin = checkAutoLogin;

// ============================================================
// 9999 - 최종 내보내기 (기존 + 회원관리)
// ============================================================

// 기존 함수들 export
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
  clearProgress
};

// 회원관리 함수들 export
export {
  handleLogin,
  handleRegister,
  showRegisterUI,
  showLoginScreen,
  logout,
  loadSubjects,
  checkAutoLogin,
  startApp
};

// ============================================================
// 파일 끝 (EOF)  ← 여기서 끝! 아무것도 없음
// ============================================================
