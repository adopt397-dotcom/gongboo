// ============================================================
// 0000 - main.js 통합 (SAT Quiz + 회원관리)
// ============================================================

// ============================================================
// 0100 - LANG (원본 유지)
// ============================================================
var LANG = {
  enterNumber: "Enter Starting Number",
  enterSub: "Enter the question number to begin",
  rangeInfo: "Range: 1 ~ ",
  startBtn: "▶ START",
  freshHint: "Enter a number and click START to begin a new session or click Resume above to continue where you left off",
  resumeTitle: "Resume from where you left off",
  resumeDetail: "{answered}/{total} answered · {time}",
  resumeHint: "Click to continue your previous session",
  qPrefix: "Question",
  of: "/",
  originalPrefix: "(Original #",
  originalSuffix: ")",
  prevBtn: "◀ PREV",
  skipBtn: "SKIP",
  nextBtn: "NEXT ▶",
  submitBtn: "SUBMIT",
  quitBtn: "✕ QUIT",
  reviewModePrefix: "Review Mode: ",
  reviewModeSuffix: " questions (Wrong/Skipped/Unanswered)",
  exitReview: "EXIT REVIEW",
  resultTitle: "📊 RESULT",
  correctLabel: "✅ CORRECT",
  accuracyLabel: "🎯 ACCURACY",
  resultClickLabel: "Results (Click to move)",
  retryBtn: "🔄 RETRY",
  reviewBtn: "📝 REVIEW",
  closeBtn: "✕ CLOSE",
  reviewModalTitle: "📝 REVIEW",
  reviewModalSubtitle: "Wrong / Skipped / Unanswered",
  retryWrongOnlyBtn: "🔄 RETRY WRONG ONLY",
  reviewQuestions: "Review Questions:",
  wrongCount: "Wrong:",
  skippedCount: "Skipped:",
  unansweredCount: "Unanswered:",
  questionPrefix: "Question",
  originalPrefixShort: "(Original #)",
  statusWrong: "WRONG",
  statusSkipped: "SKIPPED",
  statusUnanswered: "UNANSWERED",
  statusNotAnswered: "Status: You did not answer this question.",
  correctAnswerLabel: "Correct Answer:",
  explanationLabel: "Explanation",
  yourAnswerLabel: "(YOUR ANSWER)",
  correctAnswer: "CORRECT! Answer:",
  wrongAnswer: "WRONG. Answer:",
  noExplanation: "No explanation available.",
  loadError: "Failed to load questions:",
  allCorrect: "Congratulations! All correct!",
  perfectReview: "Perfect! No questions to review!",
  confirmExit: "Return to main menu. Progress will not be saved.",
  reviewModeQuestionPrefix: "Review Question",
  loading: "Loading...",
  loadingQuestions: "Loading questions from",
  rangeText: "Range: 1 ~ "
};

// ============================================================
// 0200 - API URL (새 GAS URL 적용)
// ============================================================
var API_URL = "https://script.google.com/macros/s/AKfycby9g0f27gyjUuHdnw9-tZxr8Qmhbdm_864Ons0Ai6h1z87LOf0nYZBdWlAiJ_lgnpyB/exec";
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
// 0300 - 기존 전역 변수 (원본 유지)
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
// 0400 - Splash 화면 함수 (원본 유지)
// ============================================================
function updateSplash(percent, text) {
  var bar = document.getElementById('splashBar');
  var status = document.getElementById('splashStatus');
  if (bar) bar.style.width = Math.min(100, percent) + '%';
  if (status) status.textContent = text || 'Loading...';
  console.log('Splash: ' + percent + '% - ' + text);
}

function showSplashError(msg) {
  var errorEl = document.getElementById('splashError');
  var retryBtn = document.getElementById('splashRetry');
  if (errorEl) { errorEl.style.display = 'block'; errorEl.textContent = '▲' + msg; }
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
          <h2 style="color:#1a1a2e;margin:10px 0 4px;">🔐 SAT 로그인</h2>
          <p style="color:#888;font-size:0.9rem;margin:0;">SAT & PSAT & AP Learning Platform</p>
        </div>
        <div style="margin-bottom:15px;">
          <input type="email" id="loginEmail" placeholder="이메일" style="width:100%;padding:14px 16px;border:2px solid #ddd;border-radius:12px;font-size:16px;box-sizing:border-box;outline:none;">
        </div>
        <div style="margin-bottom:15px;">
          <input type="password" id="loginPin" placeholder="PIN (4자리 숫자)" maxlength="4" style="width:100%;padding:14px 16px;border:2px solid #ddd;border-radius:12px;font-size:16px;box-sizing:border-box;outline:none;" onkeypress="if(event.key==='Enter') handleLogin()">
        </div>
        <button id="loginBtn" onclick="handleLogin()" style="width:100%;padding:16px;background:#f5a623;color:white;border:none;border-radius:12px;font-size:18px;font-weight:700;cursor:pointer;">로그인</button>
        <div id="loginMessage" style="margin-top:12px;text-align:center;font-size:14px;min-height:24px;color:#e74c3c;"></div>
        <div style="text-align:center;margin-top:16px;font-size:14px;color:#888;">
          <a href="#" onclick="showRegisterUI()" style="color:#3498db;text-decoration:none;font-weight:600;">회원가입</a>
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
    msg.textContent = '이메일과 PIN을 입력해주세요.';
    return;
  }
  msg.textContent = '⏳ 확인 중...';
  msg.style.color = '#f5a623';
  btn.disabled = true;
  try {
    var res = await fetch(MEMBER_API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'login', email, pin })
    });
    var result = await res.json();
    if (result.success) {
      CURRENT_USER = result.data;
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        email: email,
        name: result.data.name || email,
        payment_status: result.data.payment_status,
        access_subjects: result.data.access_subjects,
        timestamp: Date.now()
      }));
      var loginScreen = document.getElementById('loginScreen');
      if (loginScreen) loginScreen.remove();
      await loadSubjects();
      startApp();
    } else {
      msg.textContent = result.message || '이메일 또는 PIN이 일치하지 않습니다.';
      msg.style.color = '#e74c3c';
      btn.disabled = false;
    }
  } catch (e) {
    console.error("❌ handleLogin 오류:", e);
    msg.textContent = '⚠️ 서버 오류: ' + e.message;
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
    var res = await fetch(MEMBER_API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'register', email, pin, name: name || email })
    });
    var result = await res.json();
    if (result.success) {
      msg.textContent = '✅ ' + result.message;
      msg.style.color = '#27ae60';
      setTimeout(showLoginScreen, 1500);
    } else {
      msg.textContent = result.message || '회원가입에 실패했습니다.';
      msg.style.color = '#e74c3c';
      if (btn) btn.disabled = false;
    }
  } catch (e) {
    console.error("❌ handleRegister 오류:", e);
    msg.textContent = '⚠️ 서버 오류: ' + e.message;
    if (btn) btn.disabled = false;
  }
}

// ============================================================
// 0500 - 유틸리티 함수 (원본 유지)
// ============================================================
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  if (typeof str !== 'string') str = String(str);
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function getAnswerLetter(num) {
  var n = parseInt(num);
  if (isNaN(n)) return num;
  var letters = {1:'A',2:'B',3:'C',4:'D'};
  return letters[n] || num;
}

function getValidChoiceKeys(choices) {
  return Object.keys(choices).filter(function(key) {
    var val = choices[key];
    if (typeof val === 'string') return val && val.trim() !== "";
    return val !== null && val !== undefined && val !== "";
  }).sort(function(a, b) { return Number(a) - Number(b); });
}

function hasRealChoices(q) {
  if (!q || !q.choices) return false;
  return Object.values(q.choices).some(function(v) {
    if (!v || typeof v !== 'string') return false;
    var trimmed = v.trim();
    return trimmed !== "" && trimmed.toLowerCase() !== 'no options' && trimmed.toLowerCase() !== 'no options.' && trimmed !== 'No options';
  });
}

function isSubjectiveQuestion(q) {
  if (!q || !q.choices) return true;
  return !hasRealChoices(q);
}

function randomizeChoicesOnly(q) {
  if (!q || !q.choices) return q;
  if (!hasRealChoices(q)) return q;
  try {
    var validEntries = Object.entries(q.choices).filter(function(item) {
      var k = item[0], v = item[1];
      if (typeof v === 'string') return v && v.trim() !== "";
      return v !== null && v !== undefined && v !== "";
    }).map(function(item) {
      var k = item[0], v = item[1];
      return { k: parseInt(k), v: String(v) };
    });
    var shuffled = validEntries.slice();
    for (var i = shuffled.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }
    var newChoices = {};
    shuffled.forEach(function(c, idx) { newChoices[idx + 1] = c.v; });
    var originalAns = parseInt(q.answer);
    var correctIdx = shuffled.findIndex(function(c) { return c.k == originalAns; });
    return {
      ...q,
      choices: newChoices,
      answer: (correctIdx + 1).toString()
    };
  } catch(e) {
    console.error("Randomize error:", e);
    return q;
  }
}

// ============================================================
// 0550 - loadSubjects
// ============================================================
async function loadSubjects() {
  console.log("🔍 loadSubjects 시작");

  if (SUBJECTS_LOADED) {
    console.log("✅ loadSubjects: 이미 로드됨 (캐시 사용)");
    return SUBJECTS_LIST;
  }

  try {
    const response = await fetch(MEMBER_API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'subjects' })
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
// 0555 - getAccessibleSubjects
// ============================================================
function getAccessibleSubjects() {
  if (!CURRENT_USER || !CURRENT_USER.access_subjects) {
    return SUBJECTS_LIST;
  }

  try {
    var accessList = JSON.parse(CURRENT_USER.access_subjects);
    return SUBJECTS_LIST.filter(function(s) {
      return accessList.indexOf(s.subject) !== -1;
    });
  } catch (e) {
    return SUBJECTS_LIST;
  }
}

// ============================================================
// 0556 - checkAutoLogin
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
// 0557 - logout
// ============================================================
function logout() {
  if (confirm('로그아웃 하시겠습니까?')) {
    localStorage.removeItem(SESSION_KEY);
    CURRENT_USER = null;
    window.location.reload();
  }
}

// ============================================================
// 0600 - startAutoSave (원본 유지)
// ============================================================
function startAutoSave() {
  if (autoSaveInterval) clearInterval(autoSaveInterval);
  autoSaveInterval = setInterval(function() {
    saveProgress();
  }, 5000);
}

// ============================================================
// 0700 - saveProgress / loadProgress / clearProgress (원본 유지)
// ============================================================
function saveProgress() {
  try {
    var data = {
      currentQuestions: currentQuestions,
      userAnswers: userAnswers,
      currentIndex: currentIndex,
      correctCount: correctCount,
      currentStartNumber: currentStartNumber,
      isReviewMode: isReviewMode,
      masterQuestions: masterQuestions,
      originalQuestions: originalQuestions,
      timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch(e) {}
}

function loadProgress() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    var data = JSON.parse(raw);
    if (data && data.currentQuestions && data.currentQuestions.length > 0) return data;
    return null;
  } catch(e) {
    return null;
  }
}

function clearProgress() {
  localStorage.removeItem(STORAGE_KEY);
}

// ============================================================
// 0800 - 퀴즈 네비게이션 (원본 유지)
// ============================================================
function goNext() {
  if (currentIndex < currentQuestions.length - 1) {
    currentIndex++;
    renderCurrentQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function goPrev() {
  if (currentIndex > 0) {
    currentIndex--;
    renderCurrentQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function skipQuestion() {
  if (userAnswers[currentIndex] === null || userAnswers[currentIndex] === undefined) {
    userAnswers[currentIndex] = -1;
    saveProgress();
  }
  if (currentIndex < currentQuestions.length - 1) {
    currentIndex++;
    renderCurrentQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function submitSubjective() {
  var input = document.getElementById('subjectiveInput');
  if (!input) return;
  var userAnswer = input.value.trim();
  if (userAnswer === "") {
    alert('Please enter your answer.');
    return;
  }
  var q = currentQuestions[currentIndex];
  var correctAnswer = '';
  if (q.A && q.A !== '') {
    correctAnswer = String(q.A).trim();
  } else if (q.answer && q.answer !== '' && q.answer !== '0') {
    correctAnswer = String(q.answer).trim();
  } else {
    correctAnswer = userAnswer;
  }
  var isCorrect = (userAnswer === correctAnswer) || (parseFloat(userAnswer) === parseFloat(correctAnswer));
  userAnswers[currentIndex] = userAnswer;
  if (isCorrect) correctCount++;
  saveProgress();
  renderCurrentQuestion();
}

// ============================================================
// 0900 - 결과 및 리뷰 (원본 유지)
// ============================================================
function getWrongSkippedUnansweredIndices() {
  var result = [];
  for (var i = 0; i < currentQuestions.length; i++) {
    var q = currentQuestions[i];
    var ans = userAnswers[i];
    var isUnanswered = (ans === null || ans === undefined);
    var isSkipped = (ans === -1);
    var isSubjective = isSubjectiveQuestion(q);
    var isIncorrect = false;
    if (!isUnanswered && !isSkipped) {
      if (isSubjective) {
        var correctAns = q.A || q.answer || '';
        isIncorrect = !(String(ans).trim() === String(correctAns).trim());
      } else {
        isIncorrect = (ans !== parseInt(q.answer));
      }
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
    el.addEventListener('click', function() {
      var idx = parseInt(el.getAttribute('data-qidx'));
      currentIndex = idx;
      DOM.resultModal.style.display = 'none';
      renderCurrentQuestion();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  DOM.resultModal.style.display = 'flex';
}

function showWrongAnswersList() {
  var wrongItems = [];
  for (var i = 0; i < currentQuestions.length; i++) {
    var q = currentQuestions[i];
    var ans = userAnswers[i];
    var isSkipped = (ans === -1);
    var isUnanswered = (ans === null || ans === undefined);
    var isSubjective = isSubjectiveQuestion(q);
    var isIncorrect = false;
    if (!isSkipped && !isUnanswered) {
      if (isSubjective) {
        var correctAns = q.A || q.answer || '';
        isIncorrect = !(String(ans).trim() === String(correctAns).trim());
      } else {
        isIncorrect = (ans !== parseInt(q.answer));
      }
    }
    if (isSkipped || isIncorrect || isUnanswered) {
      var actualNumber = q.originalNumber || (currentStartNumber + i);
      wrongItems.push({
        idx: i,
        actualNumber: actualNumber,
        q: q,
        ans: ans,
        isSkipped: isSkipped,
        isUnanswered: isUnanswered,
        isSubjective: isSubjective
      });
    }
  }

  if (wrongItems.length === 0) {
    alert(LANG.allCorrect);
    return;
  }

  var html = '<p style="margin-bottom:15px;padding:10px;background:#f0f0f0;border-radius:8px;text-align:center;">' +
    LANG.reviewQuestions + '<strong>' + wrongItems.length + '</strong><br>' +
    LANG.wrongCount + ' ' + wrongItems.filter(function(w) { return !w.isSkipped && !w.isUnanswered; }).length +
    ' | ' + LANG.skippedCount + ' ' + wrongItems.filter(function(w) { return w.isSkipped; }).length +
    ' | ' + LANG.unansweredCount + ' ' + wrongItems.filter(function(w) { return w.isUnanswered; }).length +
    '</p>';

  wrongItems.forEach(function(item) {
    var statusText = item.isSkipped ? LANG.statusSkipped : (item.isUnanswered ? LANG.statusUnanswered : LANG.statusWrong);
    var statusColor = item.isSkipped ? '#f39c12' : (item.isUnanswered ? '#6c757d' : '#e74c3c');
    var userAnswerDisplay = (item.ans === null || item.ans === undefined || item.ans === -1) ? '---' : String(item.ans);
    var correctAnswerDisplay = (item.isSubjective) ? (item.q.A || item.q.answer || '---') : getAnswerLetter(item.q.answer);

    html += '<div class="wrong-item" style="border-left:5px solid ' + statusColor + '">' +
      '<div style="font-weight:bold;margin-bottom:10px;">' +
      'Question ' + (item.idx + 1) + ' (Original #' + item.actualNumber + ')' +
      '<span class="status-badge" style="background:' + statusColor + ';">' + statusText + '</span>' +
      (item.isSubjective ? ' (Subjective)' : '') +
      '</div>' +
      '<div style="margin-bottom:12px;"><strong>' + escapeHtml(item.q.question) + '</strong></div>' +
      '<div style="margin-top:12px;padding:10px;background:#f8f9fa;border-radius:8px;">' +
      '<strong>Your answer:</strong> ' + escapeHtml(String(userAnswerDisplay)) +
      '<br><strong>Correct answer:</strong> ' + escapeHtml(String(correctAnswerDisplay)) +
      '</div>' +
      '<div style="margin-top:12px;padding:10px;background:#e8f4fc;border-radius:8px;">' +
      '<strong>Explanation</strong><br>' + escapeHtml(item.q.explanation || LANG.noExplanation) +
      '</div>' +
      '</div>';
  });

  DOM.wrongListDiv.innerHTML = html;
  DOM.wrongModal.style.display = 'flex';
}

function startWrongOnlyReview() {
  var indices = getWrongSkippedUnansweredIndices();
  if (indices.length === 0) {
    alert(LANG.allCorrect);
    return;
  }
  var reviewQuestions = indices.map(function(idx) {
    return currentQuestions[idx];
  });
  currentQuestions = reviewQuestions.slice();
  userAnswers = new Array(currentQuestions.length).fill(null);
  correctCount = 0;
  currentIndex = 0;
  isReviewMode = true;

  DOM.reviewBanner.style.display = 'block';
  DOM.reviewBanner.innerHTML = '<span>Review Mode: ' + currentQuestions.length + ' questions</span>' +
    '<button id="exitReviewBtn" class="exit-review-btn">EXIT REVIEW</button>';

  document.getElementById('exitReviewBtn').addEventListener('click', function() {
    clearProgress();
    window.location.reload();
  });

  DOM.wrongModal.style.display = 'none';
  DOM.resultModal.style.display = 'none';
  renderCurrentQuestion();
  saveProgress();
}

// ============================================================
// 1000 - 타이머 (원본 유지)
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
    if (timerSeconds < 300) {
      display.classList.add('warning');
    } else {
      display.classList.remove('warning');
    }
  }
}

function startTimer() {
  if (timerInterval) return;
  timerRunning = true;
  timerPaused = false;
  var btn = document.getElementById('timerPauseBtn');
  if (btn) btn.textContent = 'Pause';
  timerInterval = setInterval(function() {
    if (timerSeconds > 0) {
      timerSeconds--;
      updateTimerDisplay();
      if (timerSeconds === 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        timerRunning = false;
        alert('Time is up!');
      }
    }
  }, 1000);
}

function pauseTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
    timerPaused = true;
    var btn = document.getElementById('timerPauseBtn');
    if (btn) btn.textContent = 'Resume';
  } else if (timerPaused) {
    startTimer();
  }
}

function resetTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
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
  if (resetBtn) resetBtn.addEventListener('click', function() {
    if (confirm('Reset timer?')) resetTimer();
  });
}

// ============================================================
// 1100 - 렌더링 함수 (원본 유지)
// ============================================================
function renderCurrentQuestion() {
  console.log('renderCurrentQuestion START');
  if (!currentQuestions.length || currentIndex >= currentQuestions.length) {
    DOM.questionContainer.innerHTML = '<div style="padding:40px;text-align:center;color:red;">Error: Cannot load question</div>';
    return;
  }
  var q = currentQuestions[currentIndex];
  if (!q) {
    DOM.questionContainer.innerHTML = '<div style="padding:40px;text-align:center;color:red;">Error: Invalid question data</div>';
    return;
  }

  console.log('Current question:', q);
  console.log('q.question (raw LaTeX):', q.question);
  console.log('q.choices:', q.choices);

  var answered = userAnswers[currentIndex];
  updateProgressDisplay();

  var actualNumber = q.originalNumber || (currentStartNumber + currentIndex);
  var headerText = LANG.qPrefix + ' ' + (currentIndex + 1) + ' ' + LANG.of + ' ' + currentQuestions.length + ' ' + LANG.originalPrefix + actualNumber + LANG.originalSuffix;
  if (isReviewMode) {
    headerText = LANG.reviewModeQuestionPrefix + ' ' + (currentIndex + 1) + ' ' + LANG.of + ' ' + currentQuestions.length + ' ' + LANG.originalPrefix + actualNumber + LANG.originalSuffix;
  }

  var hasChoices = hasRealChoices(q);
  var isSubjective = !hasChoices;

  var passageHtml = '';
  var displayPassage = q.passage || '';
  if (displayPassage && displayPassage.trim() != '' && displayPassage.trim() != 'No passage.') {
    passageHtml = '<div style="background:#f8f9fa;padding:15px;border-radius:8px;margin:10px 0;border:1px solid #dee2e6;">' +
      '<div style="white-space:pre-wrap;font-size:15px;line-height:1.7;">' +
      escapeHtml(displayPassage) + '</div>' +
      '</div>';
  }

  if (isSubjective) {
    renderSubjectiveQuestion(q, answered, headerText, passageHtml);
    return;
  }

  var validKeys = getValidChoiceKeys(q.choices);
  var originalAnswerKey = String(q.answer);
  var originalAnswerText = q.choices[originalAnswerKey] || '';
  var actualAnswerKey = null;
  for (var i = 0; i < validKeys.length; i++) {
    var key = validKeys[i];
    if (q.choices[key] == originalAnswerText) {
      actualAnswerKey = key;
      break;
    }
  }
  var displayAnswer = actualAnswerKey != null ? validKeys.indexOf(actualAnswerKey) + 1 : parseInt(originalAnswerKey);

  // ★★★ MathJax로 LaTeX 렌더링 ★★★
  if (window.MathJax && MathJax.typesetPromise) {
    MathJax.typesetPromise([DOM.questionContainer])
      .then(function() {
        console.log('✅ MathJax rendering complete');
      })
      .catch(function(err) {
        console.warn('⚠️ MathJax rendering error:', err);
      });
  } else {
    console.warn('⚠️ MathJax not available. LaTeX will not render.');
  }

  var html = '<div class="question-card">' +
    '<div class="q-num">' + headerText + '</div>' +
    passageHtml +
    renderGraphic(q.graphic) +
    '<div class="question-text math-content">' + (q.question || 'No question text') + '</div>' +
    '<div class="choices">';

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

  if (answered !== null && answered !== undefined && answered !== -1) {
    showExplanation();
  } else {
    DOM.explanationBox.classList.remove('show');
  }

  var isLastQuestion = (currentIndex >= currentQuestions.length - 1);
  if (isLastQuestion) {
    DOM.nextBtn.style.display = 'none';
    DOM.submitBtn.style.display = 'inline-block';
    DOM.submitBtn.innerHTML = 'SUBMIT (Enter)';
    var isAnswered = (answered !== null && answered !== undefined && answered !== -1);
    DOM.submitBtn.disabled = !isAnswered;
    DOM.submitBtn.style.background = isAnswered ? '#27ae60' : '#95a5a6';
    DOM.submitBtn.style.color = isAnswered ? 'white' : '#666';
  } else {
    DOM.nextBtn.style.display = 'inline-block';
    DOM.nextBtn.innerHTML = 'NEXT (N)';
    DOM.submitBtn.style.display = 'none';
  }
  DOM.prevBtn.disabled = (currentIndex === 0);
}

function renderSubjectiveQuestion(q, answered, headerText, passageHtml) {
  var isAnswered = (answered !== null && answered !== undefined && answered !== -1);
  if (!isAnswered) {
    DOM.explanationBox.classList.remove('show');
    DOM.explanationText.innerHTML = '';
  }

  var correctAnswerText = '';
  if (q.A && q.A !== '') {
    correctAnswerText = String(q.A).trim();
  } else if (q.answer && q.answer !== '' && q.answer !== '0') {
    correctAnswerText = String(q.answer).trim();
  } else {
    correctAnswerText = 'Answer not available';
  }

  var questionDisplay = q.question || 'No question text';

  var html = '<div class="question-card">' +
    '<div class="q-num">' + headerText + '</div>' +
    passageHtml +
    renderGraphic(q.graphic) +
    '<div class="question-text math-content">' + questionDisplay + '</div>';

  if (isAnswered) {
    var userAns = String(answered).trim();
    var isCorrect = (userAns === correctAnswerText) || (parseFloat(userAns) === parseFloat(correctAnswerText));
    var statusColor = isCorrect ? '#27ae60' : '#e74c3c';

    html += '<div style="margin-top:15px;padding:15px;background:#f8f9fa;border-radius:8px;border-left:4px solid #666;">' +
      '<div style="font-size:14px;color:#666;">Your answer: <strong>' + escapeHtml(userAns) + '</strong></div>' +
      '</div>' +
      '<div class="subjective-result" style="background:' + statusColor + ';padding:12px;border-radius:8px;color:white;font-weight:700;margin-top:10px;">' +
      'Answer: ' + escapeHtml(correctAnswerText) +
      '</div>' +
      '<div class="subjective-explanation" style="margin-top:12px;padding:15px;background:#e8f4fc;border-radius:8px;">' +
      '<strong>Explanation</strong>' +
      '<p style="margin-top:8px;">' + escapeHtml(q.explanation || 'No explanation available.') + '</p>' +
      '</div>';
  } else {
    html += '<div class="subjective-input-group">' +
      '<input type="text" id="subjectiveInput" placeholder="Enter your answer" onkeypress="if(event.key===\'Enter\') submitSubjective()">' +
      '<button onclick="submitSubjective()">Submit</button>' +
      '</div>';
  }

  html += '</div></div>';
  DOM.questionContainer.innerHTML = html;

  if (window.MathJax && MathJax.typesetPromise) {
    MathJax.typesetPromise([DOM.questionContainer]).catch(console.warn);
  }

  var isLastQuestion = (currentIndex >= currentQuestions.length - 1);
  if (isLastQuestion) {
    DOM.nextBtn.style.display = 'none';
    DOM.submitBtn.style.display = 'inline-block';
    DOM.submitBtn.innerHTML = 'SUBMIT (Enter)';
    var isAnswered2 = (userAnswers[currentIndex] !== null && userAnswers[currentIndex] !== undefined && userAnswers[currentIndex] !== -1);
    DOM.submitBtn.disabled = !isAnswered2;
    DOM.submitBtn.style.background = isAnswered2 ? '#27ae60' : '#95a5a6';
    DOM.submitBtn.style.color = isAnswered2 ? 'white' : '#666';
  } else {
    DOM.nextBtn.style.display = 'inline-block';
    DOM.nextBtn.innerHTML = 'NEXT (N)';
    DOM.submitBtn.style.display = 'none';
  }
  DOM.prevBtn.disabled = (currentIndex === 0);
}

function showExplanation() {
  var q = currentQuestions[currentIndex];
  var ans = userAnswers[currentIndex];
  if (!q || ans == null || ans == undefined || ans == -1) {
    DOM.explanationBox.classList.remove('show');
    return;
  }

  var hasChoices = hasRealChoices(q);
  if (!hasChoices) {
    var correctAns = '';
    if (q.A && q.A != '') {
      correctAns = String(q.A).trim();
    } else if (q.answer && q.answer != '' && q.answer != '0') {
      correctAns = String(q.answer).trim();
    } else {
      correctAns = 'Answer not available';
    }
    var userAns = String(ans).trim();
    var isCorrect = (userAns === correctAns) || (parseFloat(userAns) === parseFloat(correctAns));
    var statusColor = isCorrect ? '#27ae60' : '#e74c3c';

    var explanationText = q.explanation || LANG.noExplanation;

    DOM.explanationText.innerHTML =
      '<div style="background:' + statusColor + ';color:white;padding:8px 16px;border-radius:6px;display:inline-block;font-weight:700;margin-bottom:15px;">' +
      'Answer: ' + escapeHtml(correctAns) +
      '</div>' +
      '<div style="margin-top:8px;font-size:14px;color:#555;">' +
      'Your answer: <strong>' + escapeHtml(userAns) + '</strong>' +
      '</div>' +
      '<p style="margin-top:12px;" class="math-content">' + escapeHtml(explanationText) + '</p>';
    DOM.explanationBox.classList.add('show');

    if (window.MathJax && MathJax.typesetPromise) {
      MathJax.typesetPromise([DOM.explanationText]).catch(console.warn);
    }
    return;
  }

  var validKeys = getValidChoiceKeys(q.choices);
  var originalAnswerKey = String(q.answer);
  var originalAnswerText = q.choices[originalAnswerKey] || '';
  var actualAnswerKey = null;
  for (var i = 0; i < validKeys.length; i++) {
    var key = validKeys[i];
    if (q.choices[key] === originalAnswerText) {
      actualAnswerKey = key;
      break;
    }
  }
  var displayAnswerIndex = actualAnswerKey !== null ? validKeys.indexOf(actualAnswerKey) + 1 : parseInt(originalAnswerKey);
  var userAnswerLetter = getAnswerLetter(ans);
  var correctAnswerLetter = getAnswerLetter(displayAnswerIndex);
  var isCorrect = (ans === displayAnswerIndex);
  var statusColor = isCorrect ? '#27ae60' : '#e74c3c';

  var explanationText = q.explanation || LANG.noExplanation;

  DOM.explanationText.innerHTML =
    '<div style="background:' + statusColor + ';color:white;padding:8px 16px;border-radius:6px;display:inline-block;font-weight:700;margin-bottom:15px;">' +
    'Answer: ' + correctAnswerLetter +
    '</div>' +
    '<div style="margin-top:8px;font-size:14px;color:#555;">' +
    'Your answer: <strong>' + userAnswerLetter + '</strong>' +
    '</div>' +
    '<p style="margin-top:12px;" class="math-content">' + escapeHtml(explanationText) + '</p>';
  DOM.explanationBox.classList.add('show');

  if (window.MathJax && MathJax.typesetPromise) {
    MathJax.typesetPromise([DOM.explanationText]).catch(console.warn);
  }
}

// ============================================================
// 1200 - Keyboard Events (원본 유지)
// ============================================================
function attachKeyboardEvents() {
  document.addEventListener('keydown', function(event) {
    var key = event.key;
    if (key === 'p' || key === 'P') {
      event.preventDefault();
      if (currentIndex > 0) goPrev();
      return;
    }
    if (key === 'n' || key === 'N') {
      event.preventDefault();
      if (currentIndex < currentQuestions.length - 1) goNext();
      return;
    }
    if (key === 's' || key === 'S' || key === 'A') {
      event.preventDefault();
      skipQuestion();
      return;
    }
    if (key === 'Enter') {
      if (currentIndex >= currentQuestions.length - 1 && DOM.submitBtn && DOM.submitBtn.style.display !== 'none') {
        var isAnswered = (userAnswers[currentIndex] !== null && userAnswers[currentIndex] !== undefined && userAnswers[currentIndex] !== -1);
        if (isAnswered) {
          event.preventDefault();
          showResults();
        }
      }
      return;
    }
    if (key === 'ArrowLeft') {
      event.preventDefault();
      if (currentIndex > 0) goPrev();
      return;
    }
    if (key === 'ArrowRight') {
      event.preventDefault();
      if (currentIndex < currentQuestions.length - 1) goNext();
      return;
    }
  });
}

// ============================================================
// 1300 - attachEvents & resume (원본 유지)
// ============================================================
function attachEvents() {
  var continueBtn = document.getElementById('progressContinueBtn');
  if (continueBtn) {
    continueBtn.addEventListener('click', function() {
      var modal = document.getElementById('progressModal');
      var savedData = modal.getAttribute('data-saved');
      if (savedData) {
        var saved = JSON.parse(savedData);
        modal.style.display = 'none';
        resumeProgress(saved);
      }
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

  DOM.startNumberInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      DOM.startQuizBtn.click();
    }
  });

  DOM.prevBtn.addEventListener('click', goPrev);
  DOM.nextBtn.addEventListener('click', goNext);
  DOM.skipBtn.addEventListener('click', skipQuestion);
  DOM.submitBtn.addEventListener('click', showResults);

  DOM.quitBtn.addEventListener('click', function() {
    saveProgress();
    if (confirm(LANG.confirmExit)) window.location.reload();
  });

  DOM.retryAllBtn.addEventListener('click', function() {
    clearProgress();
    DOM.resultModal.style.display = 'none';
    startQuizWithNumber(currentStartNumber);
  });

  DOM.reviewWrongBtn.addEventListener('click', function() {
    DOM.resultModal.style.display = 'none';
    showWrongAnswersList();
  });

  DOM.closeModalBtn.addEventListener('click', function() {
    DOM.resultModal.style.display = 'none';
  });

  DOM.closeWrongBtn.addEventListener('click', function() {
    DOM.wrongModal.style.display = 'none';
  });

  DOM.retryWrongFromReviewBtn.addEventListener('click', startWrongOnlyReview);

  document.getElementById('splashRetry').addEventListener('click', function() {
    document.getElementById('splashError').style.display = 'none';
    document.getElementById('splashRetry').style.display = 'none';
    document.getElementById('splashStatus').textContent = 'Retrying...';
    initialize();
  });

  attachKeyboardEvents();
}

function showProgressModal(saved) {
  var answered = saved.userAnswers.filter(function(a) { return a !== null && a !== -1; }).length;
  var total = saved.currentQuestions.length;
  var progress = saved.currentIndex + 1;

  var body = document.getElementById('progressModalBody');
  body.innerHTML = '<div style="padding:10px 0;">' +
    '<p style="font-size:22px;font-weight:700;color:#2c3e50;text-align:center;margin-bottom:10px;">📊 Resume Session</p>' +
    '<div style="background:#f8f9fa;border-radius:12px;padding:16px 20px;margin:15px 0;">' +
    '<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Progress</span><strong>' + progress + ' / ' + total + '</strong></div>' +
    '<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Answered</span><strong>' + answered + ' / ' + total + '</strong></div>' +
    '<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Correct</span><strong>' + (saved.correctCount || 0) + '</strong></div>' +
    '</div>' +
    '<p style="font-size:13px;color:#999;text-align:center;margin-top:10px;">' +
    'Click <strong>"Continue"</strong> to resume. Click <strong>"Start Fresh"</strong> to begin again.' +
    '</p>' +
    '</div>';

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
    DOM.reviewBanner.innerHTML = '<span>Review Mode: ' + currentQuestions.length + ' questions</span>' +
      '<button id="exitReviewBtn" class="exit-review-btn">EXIT REVIEW</button>';
    document.getElementById('exitReviewBtn').addEventListener('click', function() {
      clearProgress();
      window.location.reload();
    });
  }

  renderCurrentQuestion();
}

// ============================================================
// 1350 - updateSetSelectorForSubject
// ============================================================
function updateSetSelectorForSubject(subject) {
  var setSelector = document.getElementById('setSelector');
  if (!setSelector) return;

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
  while (setSelector.options.length > 0) setSelector.remove(0);

  for (var i = 1; i <= totalSets; i++) {
    var start = (i - 1) * QUESTIONS_PER_SET + 1;
    var end = Math.min(i * QUESTIONS_PER_SET, totalQuestions);
    var option = document.createElement('option');
    option.value = i;
    option.textContent = 'Set ' + i + ' (Q' + start + '-' + end + ')';
    setSelector.appendChild(option);
  }

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
// 1400 - initialize (원본 + 로그인 체크)
// ============================================================
function initialize() {
  console.log("🚀 initialize 시작");

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
  if (!DOM.progressArea) {
    DOM.progressArea = document.getElementById('progressArea');
  }

  // 과목 선택 이벤트 (HTML에 subjectSelect가 있다면)
  var subjectSelect = document.getElementById('subjectSelect');
  if (subjectSelect) {
    subjectSelect.addEventListener('change', function() {
      SELECTED_SUBJECT = this.value;
      updateSetSelectorForSubject(SELECTED_SUBJECT);
    });
  }

  initTimer();
  updateSplash(10, 'Connecting to server...');

  setTimeout(async function() {
    try {
      // 원본: detectTotalQuestions
      await detectTotalQuestions();

      if (TOTAL_QUESTIONS === 0) {
        TOTAL_QUESTIONS = 720;
        localStorage.setItem(TOTAL_CACHE_KEY, String(TOTAL_QUESTIONS));
      }

      // 원본: updateSetSelector
      updateSetSelector();

      updateSplash(60, 'Preparing data...');

      var maxStartNumber = TOTAL_QUESTIONS;
      console.log('Total questions: ' + TOTAL_QUESTIONS);

      if (DOM.maxNumberSpan) DOM.maxNumberSpan.style.display = 'none';
      if (DOM.maxNumberDisplay) DOM.maxNumberDisplay.style.display = 'none';
      DOM.startNumberInput.placeholder = '1- ' + TOTAL_QUESTIONS;
      DOM.startNumberInput.max = TOTAL_QUESTIONS;
      DOM.startNumberInput.min = 1;

      if (DOM.setSelector) {
        DOM.setSelector.addEventListener('change', function() {
          var setNum = parseInt(this.value);
          if (!isNaN(setNum) && setNum >= 1) {
            var startNum = (setNum - 1) * QUESTIONS_PER_SET + 1;
            DOM.startNumberInput.value = startNum;
            console.log('Set ' + setNum + ' selected, starting from question ' + startNum);
          }
        });
      }

      // 원본: 저장된 진행 상황 확인
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
        DOM.savedBadgeContainer.innerHTML =
          '<div class="no-session">' +
          'No saved session' +
          '<small>Start a new lesson</small>' +
          '</div>';
      }

      attachEvents();
      updateSplash(100, 'Ready!');

      setTimeout(function() {
        DOM.startNumberInput.focus();
        DOM.startNumberInput.select();
      }, 400);

      setTimeout(function() {
        DOM.startNumberInput.focus();
        DOM.startNumberInput.select();
      }, 700);

      console.log('Initialization complete: ' + TOTAL_QUESTIONS + ' total questions');

    } catch(e) {
      console.error('Initialization error:', e);
      showSplashError(e.message || 'Initialization failed');
    }
  }, 300);
}

// ============================================================
// 1500 - startQuizWithNumber (원본 유지)
// ============================================================
async function startQuizWithNumber(uiStartNumber) {
  if (isNaN(uiStartNumber) || uiStartNumber < 1) uiStartNumber = 1;

  if (uiStartNumber > TOTAL_QUESTIONS) {
    console.log('Number ' + uiStartNumber + ' exceeds total ' + TOTAL_QUESTIONS + '. Looping back to 1.');
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
    var questions = await load50Questions(startNum);
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
    if (DOM.quizContent) {
      DOM.quizContent.style.display = 'block';
    }
    if (DOM.progressArea) {
      DOM.progressArea.style.display = 'flex';
    }

    renderCurrentQuestion();
    resetTimer();
    startTimer();

  } catch(err) {
    hideLoadingOverlay();
    alert(LANG.loadError + ' ' + err.message);
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
// 1600 - load50Questions & detectTotalQuestions (원본 유지)
// ============================================================
async function load50Questions(uiStartNumber) {
  if (TOTAL_QUESTIONS === 0) await detectTotalQuestions();

  try {
    var url = ORIGINAL_API_URL + '?start=' + uiStartNumber + '&limit=' + QUESTIONS_PER_SET;
    console.log('Requesting questions (direct):', url);

    var response = await fetch(url);
    console.log('Response status:', response.status);

    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }

    var text = await response.text();
    console.log('Response text (first 200 chars):', text.substring(0, 200));

    if (text.trim().startsWith('<IDOCTYPE') || text.trim().startsWith('<html>')) {
      console.error('Received HTML. Check Apps Script deployment.');
      throw new Error('HTML response - check Apps Script URL');
    }

    var data = JSON.parse(text);
    console.log('Response type:', typeof data);
    console.log('Is array?', Array.isArray(data));

    var questionsData = [];

    if (Array.isArray(data)) {
      questionsData = data;
      console.log('Data is direct array, length:', questionsData.length);
    } else if (data && typeof data === 'object') {
      if (Array.isArray(data.data)) {
        questionsData = data.data;
        console.log('Found data.data array, length:', questionsData.length);
      } else if (Array.isArray(data.questions)) {
        questionsData = data.questions;
        console.log('Found data.questions array, length:', questionsData.length);
      } else if (Array.isArray(data.items)) {
        questionsData = data.items;
        console.log('Found data.items array, length:', questionsData.length);
      } else {
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
          console.log('Converted object to array, length:', questionsData.length);
        }
      }
    }

    if (!Array.isArray(questionsData) || questionsData.length === 0) {
      console.error('No questions data found');
      throw new Error('No question data received');
    }

    console.log('Processing ' + questionsData.length + ' questions');

    var processed = [];
    for (var idx = 0; idx < questionsData.length; idx++) {
      try {
        var item = questionsData[idx];
        var parsed = item;
        if (typeof item === 'string') {
          try {
            parsed = JSON.parse(item);
          } catch(e) {
            parsed = { question: item, answer: '1' };
          }
        }
        if (!parsed || typeof parsed !== 'object') {
          parsed = { question: String(item), answer: '1' };
        }

        // ★★★★★ renderLatex 호출 제거 - raw 데이터 그대로 유지 ★★★★★
        var rawQuestion = parsed.Q || parsed.question || parsed.q || parsed.문제 || parsed.text || 'Question ' + (uiStartNumber + idx);
        var questionText = rawQuestion;

        var rawPassage = parsed.passage || parsed.P || parsed.p || parsed.지문 || '';
        var passageText = rawPassage;

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
        } else if (parsed.정답 !== undefined && parsed.정답 !== null && parsed.정답 !== "") {
          finalAnswer = String(parsed.정답).trim();
        } else if (parsed.a !== undefined && parsed.a !== null && parsed.a !== "") {
          finalAnswer = String(parsed.a).trim();
        }

        var originalNumber = parsed.N || parsed.originalNumber || parsed.n || (uiStartNumber + idx);

        processed.push({
          N: originalNumber,
          question: questionText,
          passage: passageText,
          choices: choices,
          answer: finalAnswer,
          explanation: parsed.explanation || parsed.E || parsed.e || parsed.해설 || 'No explanation available.',
          graphic: parsed.graphic || parsed.G || parsed.g || parsed.그래픽 || parsed.P_graph || '',
          originalNumber: originalNumber,
          A: parsed.A || parsed.answer || parsed.정답 || ''
        });

        if (idx === 0) {
          console.log('First question mapped:', processed[0]);
          console.log('q.question (raw):', processed[0].question);
        }

      } catch(e) {
        console.warn('Parse error for item', idx, ':', e);
      }
    }

    if (processed.length === 0) {
      console.error('No questions could be parsed');
      throw new Error('No valid question data');
    }

    console.log('Successfully parsed ' + processed.length + ' questions');
    console.log('First question preview:', processed[0]);
    return processed;

  } catch(err) {
    console.error('Load failed:', err);
    return [];
  }
}

async function detectTotalQuestions() {
  try {
    var cached = localStorage.getItem(TOTAL_CACHE_KEY);
    if (cached) {
      var parsed = parseInt(cached);
      if (!isNaN(parsed) && parsed > 0) {
        TOTAL_QUESTIONS = parsed;
        return parsed;
      }
    }

    var url = ORIGINAL_API_URL + '?total=true';
    var response = await fetch(url);
    if (!response.ok) throw new Error('HTTP ' + response.status);

    var data = await response.json();

    if (data && typeof data === 'object' && data.total !== undefined) {
      TOTAL_QUESTIONS = parseInt(data.total) || 0;
    } else {
      var keys = Object.keys(data);
      if (keys.length > 0) {
        TOTAL_QUESTIONS = keys.length;
      }
    }

    if (TOTAL_QUESTIONS === 0) {
      TOTAL_QUESTIONS = 720;
    }

    localStorage.setItem(TOTAL_CACHE_KEY, String(TOTAL_QUESTIONS));
    return TOTAL_QUESTIONS;

  } catch(e) {
    console.warn('Could not detect total, using fallback: 720');
    TOTAL_QUESTIONS = 720;
    localStorage.setItem(TOTAL_CACHE_KEY, String(TOTAL_QUESTIONS));
    return TOTAL_QUESTIONS;
  }
}

// ============================================================
// 1601 - updateSetSelector (원본 유지)
// ============================================================
function updateSetSelector() {
  var setSelector = document.getElementById('setSelector');
  if (!setSelector) return;

  while (setSelector.options.length > 0) {
    setSelector.remove(0);
  }

  var totalQuestions = TOTAL_QUESTIONS > 0 ? TOTAL_QUESTIONS : 720;
  var totalSets = Math.ceil(totalQuestions / QUESTIONS_PER_SET);

  console.log('Total Sets: ' + totalSets + ' (Questions: ' + totalQuestions + ')');

  for (var i = 1; i <= totalSets; i++) {
    var start = (i - 1) * QUESTIONS_PER_SET + 1;
    var end = Math.min(i * QUESTIONS_PER_SET, totalQuestions);
    var option = document.createElement('option');
    option.value = i;
    option.textContent = 'Set ' + i + ' (Questions ' + start + '-' + end + ')';
    setSelector.appendChild(option);
  }

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
// 1700 - renderGraphic (원본 유지)
// ============================================================
function renderGraphic(jsonData) {
  if (!jsonData || jsonData.trim() == "") return "";

  var data = jsonData.trim();
  if (data.startsWith("\"") && data.endsWith("\"")) data = data.slice(1, -1);
  data = data.replace(/\"/g, "").replace(/\"/g, "");

  var parsedData = null;
  try {
    parsedData = JSON.parse(data);
  } catch(e) {
    return '<div style="padding:10px;color:#999;text-align:center;">Invalid JSON</div>';
  }

  if (!parsedData || typeof parsedData !== 'object') {
    return '<div style="padding:10px;color:#999;text-align:center;">No data</div>';
  }

  var colors = ['#3498db', '#e74c3c', '#27ae60', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#2c3e50', '#7f8c8d', '#16a085', '#d35400', '#c0392b'];
  var chartId = 'chart_' + Math.random().toString(36).substr(2, 9);

  var html = '<div style="margin:15px 0;padding:15px;background:#f8f9fa;border-radius:8px;border:1px solid #e9ecef;"><canvas id="' + chartId + '" style="max-height:400px;width:100%;"></canvas></div>';

  // TABLE
  if (parsedData.type === 'table' && parsedData.headers && parsedData.rows) {
    var h = '<div style="margin:15px 0;overflow-x:auto;background:white;border-radius:8px;border:1px solid #ddd;"><table style="width:100%;border-collapse:collapse;text-align:center;font-size:14px;">';
    h += '<thead><tr style="background:#3498db;color:white;">';
    parsedData.headers.forEach(function(hd) {
      h += '<th style="padding:10px 14px;border:1px solid #2980b9;font-weight:bold;">' + escapeHtml(hd) + '</th>';
    });
    h += '</tr></thead><tbody>';
    parsedData.rows.forEach(function(row, ri) {
      h += '<tr style="background:' + (ri % 2 == 0 ? '#fff' : '#f8f9fa') + '">';
      row.forEach(function(cell) {
        h += '<td style="padding:8px 14px;border:1px solid #ddd;">' + escapeHtml(cell) + '</td>';
      });
      h += '</tr>';
    });
    h += '</tbody></table>';
    if (parsedData.title) {
      h += '<div style="text-align:center;padding:8px;font-weight:bold;color:#555;background:#f8f9fa;border-radius:0 0 8px 8px;">' + escapeHtml(parsedData.title) + '</div>';
    }
    h += '</div>';
    return h;
  }

  // BAR
  if (parsedData.type === 'bar') {
    console.log("BAR rendering started");
    var labels = [];
    var datasets = [];
    var chartTitle = parsedData.title || 'Bar Chart';
    var xLabel = parsedData.xAxis?.label || '';
    var yLabel = parsedData.yAxis?.label || '';
    var yMin = parsedData.yAxis?.min !== undefined ? parsedData.yAxis.min : 0;
    var yMax = parsedData.yAxis?.max !== undefined ? parsedData.yAxis.max : undefined;

    if (parsedData.labels) {
      labels = parsedData.labels;
    } else if (parsedData.xAxis?.categories) {
      labels = parsedData.xAxis.categories;
    }

    if (parsedData.series && Array.isArray(parsedData.series)) {
      datasets = parsedData.series.map(function(s, i) {
        var color = colors[i % colors.length];
        var data = s.data || [];
        return {
          label: s.name || 'Series ' + (i + 1),
          data: data,
          backgroundColor: color + '80',
          borderColor: color,
          borderWidth: 2
        };
      });
    } else if (parsedData.values) {
      datasets = [{
        label: parsedData.label || 'Data',
        data: parsedData.values,
        backgroundColor: parsedData.color || '#3498db80',
        borderColor: parsedData.stroke || '#3498db',
        borderWidth: 2
      }];
    }

    console.log("labels:", labels);
    console.log("datasets:", datasets);

    if (datasets.length === 0 || datasets.every(function(d) { return d.data.length === 0; })) {
      return '<div style="padding:10px;color:#999;text-align:center;">No data for bar chart</div>';
    }

    function renderBarChart(attempt) {
      attempt = attempt || 0;
      var ctx = document.getElementById(chartId);
      if (!ctx) {
        if (attempt < 5) {
          console.log("Canvas not ready, retrying... (" + (attempt + 1) + "/5)");
          setTimeout(function() { renderBarChart(attempt + 1); }, 200);
          return;
        } else {
          console.error("Canvas not found after 5 attempts!");
          return;
        }
      }

      if (window._chartInstances && window._chartInstances[chartId]) {
        window._chartInstances[chartId].destroy();
      }
      if (!window._chartInstances) window._chartInstances = {};

      var cc = {
        type: 'bar',
        data: { labels: labels, datasets: datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: chartTitle, font: { size: 16, weight: 'bold' } },
            legend: { position: 'bottom' }
          },
          scales: {
            x: { title: { display: true, text: xLabel }, grid: { color: '#e0e0e0' } },
            y: {
              beginAtZero: true,
              title: { display: true, text: yLabel },
              grid: { color: '#e0e0e0' },
              min: yMin,
              max: yMax
            }
          }
        }
      };

      var canvas = document.getElementById(chartId);
      if (canvas && cc) {
        canvas.parentElement.style.height = '400px';
        window._chartInstances[chartId] = new Chart(canvas, cc);
        console.log("Bar chart rendered!");
      } else {
        console.error("Failed to render bar chart");
      }
    }

    setTimeout(function() { renderBarChart(); }, 100);
    return html;
  }

  // PIE
  if (parsedData.type == 'pie' && parsedData.labels && parsedData.values) {
    setTimeout(function() {
      var ctx = document.getElementById(chartId);
      if (!ctx) return;
      if (window._chartInstances && window._chartInstances[chartId]) {
        window._chartInstances[chartId].destroy();
      }
      if (!window._chartInstances) window._chartInstances = {};

      var cc = {
        type: 'pie',
        data: {
          labels: parsedData.labels,
          datasets: [{
            data: parsedData.values,
            backgroundColor: parsedData.colors || ['#3498db', '#e74c3c', '#27ae60', '#f39c12', '#9b59b6', '#1abc9c']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: parsedData.title || 'Pie Chart', font: { size: 16, weight: 'bold' } },
            legend: { position: 'bottom' }
          }
        }
      };

      var canvas = document.getElementById(chartId);
      if (canvas && cc) {
        canvas.parentElement.style.height = '400px';
        window._chartInstances[chartId] = new Chart(canvas, cc);
      }
    }, 100);
    return html;
  }

  // LINE
  if (parsedData.type === 'line' && parsedData.series) {
    setTimeout(function() {
      var ctx = document.getElementById(chartId);
      if (!ctx) return;
      if (window._chartInstances && window._chartInstances[chartId]) {
        window._chartInstances[chartId].destroy();
      }
      if (!window._chartInstances) window._chartInstances = {};

      var ds = parsedData.series.map(function(s, i) {
        var points = [];
        if (Array.isArray(s.points)) {
          points = s.points;
        } else if (typeof s.points === 'string') {
          try { points = JSON.parse(s.points); } catch(e) { points = []; }
        } else if (Array.isArray(s.data) && parsedData.xAxis && Array.isArray(parsedData.xAxis.categories)) {
          points = s.data.map(function(y, idx) {
            return { x: parsedData.xAxis.categories[idx], y: y };
          });
        } else if (Array.isArray(s.data) && s.data.length && typeof s.data[0] === 'object') {
          points = s.data;
        }
        return {
          label: s.name || ('Series ' + (i + 1)),
          data: points,
          showLine: true,
          borderColor: s.color || colors[i % colors.length],
          backgroundColor: (s.color || colors[i % colors.length]) + '20',
          borderWidth: s.lineWidth || 2,
          pointRadius: s.pointSize || 4,
          tension: s.tension || 0.3,
          fill: s.fill || false
        };
      });

      var cc = {
        type: 'scatter',
        data: { datasets: ds },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: parsedData.title || 'Line Chart', font: { size: 16, weight: 'bold' } },
            legend: { position: 'bottom' }
          },
          scales: {
            x: { type: 'linear', title: { display: true, text: (parsedData.xAxis && (parsedData.xAxis.title || parsedData.xAxis.label)) || 'X' }, grid: { color: '#e0e0e0' } },
            y: { title: { display: true, text: (parsedData.yAxis && (parsedData.yAxis.title || parsedData.yAxis.label)) || 'Y' }, grid: { color: '#e0e0e0' } }
          }
        }
      };

      var canvas = document.getElementById(chartId);
      if (canvas && cc) {
        canvas.parentElement.style.height = '400px';
        window._chartInstances[chartId] = new Chart(canvas, cc);
      }
    }, 100);
    return html;
  }

  // SCATTER
  if (parsedData.type == 'scatter') {
    console.log("SCATTER rendering started");
    setTimeout(function() {
      var ctx = document.getElementById(chartId);
      if (!ctx) {
        console.error("Canvas not found!");
        return;
      }
      if (window._chartInstances && window._chartInstances[chartId]) {
        window._chartInstances[chartId].destroy();
      }
      if (!window._chartInstances) window._chartInstances = {};

      var datasets = [];

      if (parsedData.series && Array.isArray(parsedData.series)) {
        parsedData.series.forEach(function(ser, i) {
          var color = colors[i % colors.length];
          datasets.push({
            label: ser.name || 'Series ' + (i + 1),
            data: (ser.points || []).map(function(p) { return { x: p.x, y: p.y }; }),
            backgroundColor: color,
            borderColor: color,
            pointRadius: 5,
            pointHoverRadius: 7
          });
        });
      } else if (parsedData.points) {
        datasets.push({
          label: parsedData.title || 'Data',
          data: parsedData.points.map(function(p) { return { x: p.x, y: p.y }; }),
          backgroundColor: '#3498db',
          borderColor: '#2980b9',
          pointRadius: 5,
          pointHoverRadius: 7
        });
      }

      if (datasets.length == 0) {
        console.warn("No data");
        return;
      }

      var cc = {
        type: 'scatter',
        data: { datasets: datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: parsedData.title || 'Scatter Plot', font: { size: 16, weight: 'bold' } },
            legend: { position: 'bottom' }
          },
          scales: {
            x: { title: { display: true, text: parsedData.xAxis?.label || 'x' }, min: parsedData.xAxis?.min, max: parsedData.xAxis?.max, grid: { color: '#e0e0e0' } },
            y: { title: { display: true, text: parsedData.yAxis?.label || 'y' }, min: parsedData.yAxis?.min, max: parsedData.yAxis?.max, grid: { color: '#e0e0e0' } }
          }
        }
      };

      var canvas = document.getElementById(chartId);
      if (canvas && cc) {
        canvas.parentElement.style.height = '400px';
        window._chartInstances[chartId] = new Chart(canvas, cc);
        console.log("Scatter chart rendered!");
      }
    }, 100);
    return html;
  }

  // RADAR
  if (parsedData.type === 'radar' && parsedData.labels && parsedData.datasets) {
    setTimeout(function() {
      var ctx = document.getElementById(chartId);
      if (!ctx) return;
      if (window._chartInstances && window._chartInstances[chartId]) {
        window._chartInstances[chartId].destroy();
      }
      if (!window._chartInstances) window._chartInstances = {};

      var ds = parsedData.datasets.map(function(d, i) {
        var values = d.values || [];
        if (typeof values === 'string') {
          try { values = JSON.parse(values); } catch(e) { values = values.split(',').map(function(v) { return parseFloat(v.trim()); }); }
        }
        return {
          label: d.label || 'Series ' + (i + 1),
          data: values,
          borderColor: d.color || colors[i % colors.length],
          backgroundColor: (d.color || colors[i % colors.length]) + '20',
          borderWidth: 2,
          pointRadius: 4
        };
      });

      var cc = {
        type: 'radar',
        data: { labels: parsedData.labels, datasets: ds },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: parsedData.title || 'Radar Chart', font: { size: 16, weight: 'bold' } }
          },
          scales: {
            r: { beginAtZero: true, grid: { color: '#e0e0e0' } }
          }
        }
      };

      var canvas = document.getElementById(chartId);
      if (canvas && cc) {
        canvas.parentElement.style.height = '400px';
        window._chartInstances[chartId] = new Chart(canvas, cc);
      }
    }, 100);
    return html;
  }

  // Unsupported
  return '<div style="padding:10px;text-align:center;color:#999;border:1px dashed #ddd;border-radius:8px;margin:15px 0;">' +
    '<span style="font-size:20px;">📊</span>' +
    '<p style="margin-top:8px;">Graph type "<strong>' + escapeHtml(parsedData.type || 'Unknown') + '</strong>" is not supported.</p>' +
    '</div>';
}

// ============================================================
// 1800 - startApp (로그인 후 실행 - 즉시 설정 화면 표시)
// ============================================================
function startApp() {
  console.log("🚀 startApp 실행");

  // 로그인 화면 제거
  var loginScreen = document.getElementById('loginScreen');
  if (loginScreen) loginScreen.remove();

  // ✅ 메인 컨테이너 즉시 표시
  var mainContainer = document.getElementById('mainContainer');
  if (mainContainer) {
    mainContainer.style.display = 'block';
    console.log("✅ 메인 컨테이너 표시");
  }

  // ✅ 설정 화면 즉시 표시 (데이터 로딩과 별개)
  var setupSection = document.getElementById('setupSection');
  if (setupSection) {
    setupSection.style.display = 'block';
    console.log("✅ 설정 화면 즉시 표시");
  }
  var quizMain = document.getElementById('quizMain');
  if (quizMain) {
    quizMain.style.display = 'none';
  }

  // 스플래시 제거
  var overlay = document.getElementById('splashOverlay');
  if (overlay) {
    overlay.style.opacity = '0';
    setTimeout(function() {
      overlay.style.display = 'none';
    }, 500);
  }

  // initialize는 백그라운드에서 실행 (데이터 로딩)
  initialize().then(function() {
    console.log("✅ initialize 백그라운드 완료");
  }).catch(function(err) {
    console.error("❌ initialize 오류:", err);
  });

  console.log("✅ startApp 완료 (설정 화면 표시됨)");
}

// ============================================================
// 1900 - updateProgressDisplay (원본 유지)
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
// 9900 - 내보내기 (원본 + 회원관리)
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

window.LANG = LANG;
window.DOM = DOM;

window.currentQuestions = currentQuestions;
window.userAnswers = userAnswers;
window.currentIndex = currentIndex;
window.correctCount = correctCount;
window.isReviewMode = isReviewMode;
window.currentStartNumber = currentStartNumber;
window.TOTAL_QUESTIONS = TOTAL_QUESTIONS;

// 회원관리 window 노출
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.showRegisterUI = showRegisterUI;
window.showLoginScreen = showLoginScreen;
window.logout = logout;
window.loadSubjects = loadSubjects;
window.getAccessibleSubjects = getAccessibleSubjects;
window.checkAutoLogin = checkAutoLogin;
window.startApp = startApp;
window.updateSetSelectorForSubject = updateSetSelectorForSubject;

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
  clearProgress,
  // 회원관리
  handleLogin,
  handleRegister,
  showRegisterUI,
  showLoginScreen,
  logout,
  loadSubjects,
  getAccessibleSubjects,
  checkAutoLogin,
  startApp,
  updateSetSelectorForSubject
};

console.log("Full main.js loaded with all functions!");
console.log("MathJax available:", typeof MathJax !== 'undefined');
console.log("Exports available: initialize, startQuizWithNumber, renderGraphic, etc.");
console.log("Member management exports available: handleLogin, handleRegister, etc.");
