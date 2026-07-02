// ============================================================
// x T123-1 + T123-2 + T123-3 + T123-4 통합 (GitHub용 - 완전한 버전)  x
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
  correctAnswer: "✅ CORRECT! Answer:",
  wrongAnswer: "❌ WRONG. Answer:",
  noExplanation: "No explanation available.",
  loadError: "Failed to load questions:",
  allCorrect: "🎉 Congratulations! All correct!",
  perfectReview: "✨ Perfect! No questions to review!",
  confirmExit: "Return to main menu. Progress will not be saved.",
  reviewModeQuestionPrefix: "Review Question",
  loading: "Loading...",
  loadingQuestions: "Loading questions from ",
  rangeText: "Range: 1 ~ "
};

var API_URL = "https://script.google.com/macros/s/AKfycbx-S88kC_Ii_MxbibHmmHQYK_ITc1U9jphAxJ-uV0NSBGMFUidA3ItBE0niKhUyW32oMA/exec";
var STORAGE_KEY = 'quiz_progress_main';
var TOTAL_CACHE_KEY = 'quiz_total_questions';1
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
  if (errorEl) { errorEl.style.display = 'block'; errorEl.textContent = '▲ ' + msg; }
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

function updateProgressDisplay() {
  var total = currentQuestions.length || 1;
  var percent = ((currentIndex + 1) / total) * 100;
  if (DOM.quizProgressBar) DOM.quizProgressBar.style.width = percent + '%';
  if (DOM.progressText) {
    DOM.progressText.style.display = 'inline-block';
    DOM.progressText.innerText = (currentIndex + 1) + ' / ' + total;
  }
}

function showLoadingOverlay(message) {
  var overlay = document.createElement('div');
  overlay.id = 'loadingOverlay';
  overlay.className = 'loading-overlay';
  overlay.innerHTML = '<div class="loading-spinner"></div><h3>' + message + '</h3>';
  document.body.appendChild(overlay);
  return overlay;
}

function hideLoadingOverlay() {
  var overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.remove();
}

function saveProgress() {
  try {
    var data = {
      currentQuestions: currentQuestions,
      userAnswers: userAnswers,
      currentIndex: currentIndex,
      correctCount: correctCount,
      currentStartNumber: currentStartNumber,
      isReviewMode: isReviewMode,
      originalQuestions: originalQuestions,
      masterQuestions: masterQuestions,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch(e) {
    console.warn('Save failed:', e);
    return false;
  }
}

function loadProgress() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch(e) {
    console.warn('Load failed:', e);
    return null;
  }
}

function clearProgress() {
  localStorage.removeItem(STORAGE_KEY);
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
  }
}

function startAutoSave() {
  if (autoSaveInterval) clearInterval(autoSaveInterval);
  autoSaveInterval = setInterval(function() {
    saveProgress();
  }, 5000);
}

var ORIGINAL_API_URL = "https://script.google.com/macros/s/AKfycbx-S88kC_Ii_MxbibHmmHQYK_ITc1U9jphAxJ-uV0NSBGMFUidA3ItBE0niKhUyW32oMA/exec";

async function detectTotalQuestions() {
  localStorage.removeItem(TOTAL_CACHE_KEY);
  console.log('Cache cleared, fetching fresh data...');
  
  try {
    updateSplash(30, 'Checking total questions...');
    var url = ORIGINAL_API_URL + '?total=true&_=' + Date.now();
    console.log('📡 Requesting total (direct):', url);
    
    var response = await fetch(url);
    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }
    
    var text = await response.text();
    console.log('📡 Response text (first 200 chars):', text.substring(0, 200));
    
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      console.error('❌ Received HTML. Check Apps Script deployment.');
      throw new Error('HTML response - check Apps Script URL');
    }
    
    var data = JSON.parse(text);
    console.log('📡 Total API response:', JSON.stringify(data));
    
    var total = 0;
    if (data && typeof data === 'object') {
      if (typeof data.total === 'number') total = data.total;
      else if (typeof data.count === 'number') total = data.count;
      else if (typeof data.length === 'number') total = data.length;
    }
    
    if (total > 0) {
      TOTAL_QUESTIONS = total;
      localStorage.setItem(TOTAL_CACHE_KEY, String(TOTAL_QUESTIONS));
      console.log('✅ Total questions: ' + TOTAL_QUESTIONS);
      return TOTAL_QUESTIONS;
    }
    
    console.warn('⚠️ Could not detect total, using fallback: 360');
  } catch(e) {
    console.error('❌ Total API call failed:', e.message);
  }
  
  TOTAL_QUESTIONS = 360;
  localStorage.setItem(TOTAL_CACHE_KEY, String(TOTAL_QUESTIONS));
  return TOTAL_QUESTIONS;
}

function updateSetSelector() {
  var setSelector = document.getElementById('setSelector');
  if (!setSelector) return;
  
  while (setSelector.options.length > 0) {
    setSelector.remove(0);
  }
  
  var totalQuestions = TOTAL_QUESTIONS > 0 ? TOTAL_QUESTIONS : 360;
  var totalSets = Math.ceil(totalQuestions / QUESTIONS_PER_SET);
  console.log('📊 Total Sets: ' + totalSets + ' (Questions: ' + totalQuestions + ')');
  
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

async function load50Questions(uiStartNumber) {
  if (TOTAL_QUESTIONS === 0) await detectTotalQuestions();
  try {
    var url = ORIGINAL_API_URL + '?start=' + uiStartNumber + '&limit=' + QUESTIONS_PER_SET;
    console.log('📡 Requesting questions (direct):', url);
    
    var response = await fetch(url);
    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }
    
    var text = await response.text();
    console.log('📡 Response text (first 200 chars):', text.substring(0, 200));
    
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      console.error('❌ Received HTML. Check Apps Script deployment.');
      throw new Error('HTML response - check Apps Script URL');
    }
    
    var data = JSON.parse(text);
    console.log('📡 Response type:', typeof data);
    console.log('📡 Is array?', Array.isArray(data));
    
    var questionsData = [];
    
    if (Array.isArray(data)) {
      questionsData = data;
      console.log('✅ Data is direct array, length:', questionsData.length);
    } else if (data && typeof data === 'object') {
      if (Array.isArray(data.data)) {
        questionsData = data.data;
        console.log('✅ Found data.data array, length:', questionsData.length);
      } else if (Array.isArray(data.questions)) {
        questionsData = data.questions;
        console.log('✅ Found data.questions array, length:', questionsData.length);
      } else if (Array.isArray(data.items)) {
        questionsData = data.items;
        console.log('✅ Found data.items array, length:', questionsData.length);
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
          console.log('✅ Converted object to array, length:', questionsData.length);
        }
      }
    }
    
    if (!Array.isArray(questionsData) || questionsData.length === 0) {
      console.error('❌ No questions data found');
      throw new Error('No question data received');
    }
    
    console.log('✅ Processing ' + questionsData.length + ' questions');
    
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
        
        var questionText = parsed.Q || parsed.question || parsed.q || parsed.문제 || parsed.text || 'Question ' + (uiStartNumber + idx);
        var passageText = parsed.passage || parsed.P || parsed.p || parsed.지문 || '';
        
        var choices = {};
        choices['1'] = parsed['1'] || parsed.choice1 || 'Option A';
        choices['2'] = parsed['2'] || parsed.choice2 || 'Option B';
        choices['3'] = parsed['3'] || parsed.choice3 || 'Option C';
        choices['4'] = parsed['4'] || parsed.choice4 || 'Option D';
        
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
          console.log('📝 First question mapped:', processed[0]);
        }
      } catch(e) {
        console.warn('⚠️ Parse error for item', idx, ':', e);
      }
    }
    
    if (processed.length === 0) {
      console.error('❌ No questions could be parsed');
      throw new Error('No valid question data');
    }
    
    console.log('✅ Successfully parsed ' + processed.length + ' questions');
    console.log('📝 First question preview:', processed[0]);
    return processed;
  } catch(err) {
    console.error('❌ Load failed:', err);
    return [];
  }
}
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
      wrongItems.push({ idx: i, actualNumber: actualNumber, q: q, ans: ans, isSkipped: isSkipped, isUnanswered: isUnanswered, isSubjective: isSubjective });
    }
  }
  if (wrongItems.length === 0) {
    alert(LANG.allCorrect);
    return;
  }
  var html = '<p style="margin-bottom:15px;padding:10px;background:#f0f0f0;border-radius:8px;text-align:center;">' +
    LANG.reviewQuestions + ' <strong>' + wrongItems.length + '</strong><br>' +
    LANG.wrongCount + ' ' + wrongItems.filter(function(w) { return !w.isSkipped && !w.isUnanswered; }).length +
    ' | ' + LANG.skippedCount + ' ' + wrongItems.filter(function(w) { return w.isSkipped; }).length +
    ' | ' + LANG.unansweredCount + ' ' + wrongItems.filter(function(w) { return w.isUnanswered; }).length +
    '</p>';
  wrongItems.forEach(function(item) {
    var statusText = item.isSkipped ? LANG.statusSkipped : (item.isUnanswered ? LANG.statusUnanswered : LANG.statusWrong);
    var statusColor = item.isSkipped ? '#f39c12' : (item.isUnanswered ? '#6c757d' : '#e74c3c');
    var userAnswerDisplay = (item.ans === null || item.ans === undefined || item.ans === -1) ? '—' : String(item.ans);
    var correctAnswerDisplay = (item.isSubjective) ? (item.q.A || item.q.answer || '—') : getAnswerLetter(item.q.answer);
    if (!item.isSubjective && !item.isSkipped && !item.isUnanswered) {
      userAnswerDisplay = getAnswerLetter(item.ans);
      correctAnswerDisplay = getAnswerLetter(item.q.answer);
    }
    html += '<div class="wrong-item" style="border-left:5px solid ' + statusColor + '">' +
      '<div style="font-weight:bold;margin-bottom:10px;">' +
      'Question ' + (item.idx + 1) + ' (Original #' + item.actualNumber + ')' +
      '<span class="status-badge" style="background:' + statusColor + ';">' + statusText + '</span>' +
      (item.isSubjective ? ' Subjective' : '') +
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

















// ============================================================
// A T123-1 + T123-2 + T123-3 + T123-4 통합 (GitHub용 - 완전한 버전)  A  0000
// ============================================================

function renderGraphic(jsonData) {
  if (!jsonData || jsonData.trim() == "") return "";
  
  var data = jsonData.trim();
  if (data.startsWith("\"") && data.endsWith("\"")) data = data.slice(1, -1);
  data = data.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  
  var parsedData = null;
  try {
    parsedData = JSON.parse(data);
  } catch(e) {
    return '<div style="padding:10px;color:#999;text-align:center;">📊 Invalid JSON</div>';
  }
  
  if (!parsedData || typeof parsedData !== 'object') {
    return '<div style="padding:10px;color:#999;text-align:center;">📊 No data</div>';
  }
  
  var colors = ['#3498db', '#e74c3c', '#27ae60', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#2c3e50', '#7f8c8d', '#16a085', '#d35400', '#c0392b'];
  var chartId = 'chart_' + Math.random().toString(36).substr(2, 9);
  var html = '<div style="margin:15px 0;padding:15px;background:#f8f9fa;border-radius:8px;border:1px solid #e9ecef;"><canvas id="' + chartId + '" style="max-height:400px;width:100%;"></canvas></div>';
  
  // ============================================================
  // 1. TABLE
  // ============================================================
  if (parsedData.type === 'table' && parsedData.headers && parsedData.rows) {
    var h = '<div style="margin:15px 0;overflow-x:auto;background:white;border-radius:8px;border:1px solid #ddd;"><table style="width:100%;border-collapse:collapse;text-align:center;font-size:14px;">';
    h += '<thead><tr style="background:#3498db;color:white;">';
    parsedData.headers.forEach(function(hd) { 
      h += '<th style="padding:10px 14px;border:1px solid #2980b9;font-weight:bold;">' + escapeHtml(hd) + '</th>'; 
    });
    h += '</tr></thead><tbody>';
    parsedData.rows.forEach(function(row, ri) {
      h += '<tr style="background:' + (ri%2===0?'#fff':'#f8f9fa') + ';">';
      row.forEach(function(cell) { 
        h += '<td style="padding:8px 14px;border:1px solid #ddd;">' + escapeHtml(cell) + '</td>'; 
      });
      h += '</tr>';
    });
    h += '</tbody></table>';
    if (parsedData.title) h += '<div style="text-align:center;padding:8px;font-weight:bold;color:#555;background:#f8f9fa;border-radius:0 0 8px 8px;">' + escapeHtml(parsedData.title) + '</div>';
    h += '</div>';
    return h;
  }
  
  // ============================================================
  // 2. BAR (기존 유지)
  // ============================================================
  else if (parsedData.type === 'bar') {
    var labels = [];
    var datasets = [];
    var chartTitle = parsedData.title || 'Bar Chart';
    var xLabel = parsedData.xAxis?.label || '';
    var yLabel = parsedData.yAxis?.label || '';
    var yMin = parsedData.yAxis?.min || 0;
    var yMax = parsedData.yAxis?.max || undefined;
    
    function normalizeArray(arr) {
      if (typeof arr === 'string') {
        try { return JSON.parse(arr); } catch(e) { return arr.split(',').map(function(v) { return v.trim(); }); }
      }
      if (!Array.isArray(arr)) return [];
      return arr;
    }
    
    if (parsedData.labels && parsedData.values) {
      labels = normalizeArray(parsedData.labels);
      var values = parsedData.values;
      if (typeof values === 'string') {
        try { values = JSON.parse(values); } catch(e) { values = values.split(',').map(function(v) { return parseFloat(v.trim()); }); }
      }
      if (!Array.isArray(values)) values = [];
      datasets = [{
        label: parsedData.label || 'Data',
        data: values,
        backgroundColor: parsedData.color || '#3498db80',
        borderColor: parsedData.stroke || '#3498db',
        borderWidth: 2
      }];
    } else if (parsedData.series) {
      var series = normalizeArray(parsedData.series);
      labels = normalizeArray(parsedData.categories || parsedData.xAxis?.ticks || []);
      datasets = series.map(function(s, i) {
        var values = s.values || [];
        if (typeof values === 'string') {
          try { values = JSON.parse(values); } catch(e) { values = values.split(',').map(function(v) { return parseFloat(v.trim()); }); }
        }
        if (!Array.isArray(values)) values = [];
        return {
          label: s.name || 'Series ' + (i+1),
          data: values,
          backgroundColor: colors[i % colors.length] + '80',
          borderColor: colors[i % colors.length],
          borderWidth: 2
        };
      });
    }
    
    if (datasets.length === 0 || datasets.every(function(d) { return d.data.length === 0; })) {
      return '<div style="padding:10px;color:#999;text-align:center;">📊 No data for bar chart</div>';
    }
    
    setTimeout(function() {
      var ctx = document.getElementById(chartId);
      if (!ctx) return;
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
      }
    }, 100);
    
    return html;
  }
  
  // ============================================================
  // 3. PIE (기존 유지)
  // ============================================================
  else if (parsedData.type === 'pie' && parsedData.labels && parsedData.values) {
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
  
  // ============================================================
  // 4. LINE (기존 유지)
  // ============================================================
  else if (parsedData.type === 'line' && parsedData.series) {
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
  
  // ============================================================
  // 5. SCATTER (기존 유지)
  // ============================================================
  else if (parsedData.type === 'scatter' && parsedData.points) {
    setTimeout(function() {
      var ctx = document.getElementById(chartId);
      if (!ctx) return;
      if (window._chartInstances && window._chartInstances[chartId]) {
        window._chartInstances[chartId].destroy();
      }
      if (!window._chartInstances) window._chartInstances = {};
      
      var cc = {
        type: 'scatter',
        data: {
          datasets: [{
            label: parsedData.equation || parsedData.label || 'Data',
            data: parsedData.points,
            showLine: true,
            borderColor: parsedData.color || '#3498db',
            backgroundColor: (parsedData.color || '#3498db') + '20',
            borderWidth: parsedData.lineWidth || 2,
            pointRadius: parsedData.pointSize || 4,
            tension: parsedData.tension || 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: parsedData.equation || parsedData.title || 'Scatter Plot', font: { size: 16, weight: 'bold' } }
          },
          scales: {
            x: { type: 'linear', title: { display: true, text: parsedData.xLabel || 'X' }, grid: { color: '#e0e0e0' } },
            y: { title: { display: true, text: parsedData.yLabel || 'Y' }, grid: { color: '#e0e0e0' } }
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
  
  // ============================================================
  // 6. RADAR (기존 유지)
  // ============================================================
  else if (parsedData.type === 'radar' && parsedData.labels && parsedData.datasets) {
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
          label: d.label || 'Series ' + (i+1),
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

  // ============================================================
  // 7. SCATTER-ONLY (기존에 있던 것, 반드시 포함)
  // ============================================================
  else if (parsedData.type === 'scatter-only' && parsedData.points) {
    setTimeout(function() {
      var ctx = document.getElementById(chartId);
      if (!ctx) return;
      if (window._chartInstances && window._chartInstances[chartId]) {
        window._chartInstances[chartId].destroy();
      }
      if (!window._chartInstances) window._chartInstances = {};
      
      var dataPoints = parsedData.points.map(function(p) {
        return { x: p.x, y: p.y };
      });
      
      var minX = parsedData.xAxis?.min ?? 0;
      var maxX = parsedData.xAxis?.max ?? 10;
      var minY = parsedData.yAxis?.min ?? -10;
      var maxY = parsedData.yAxis?.max ?? 10;
      
      var cc = {
        type: 'scatter',
        data: {
          datasets: [{
            label: parsedData.title || 'Scatterplot',
            data: dataPoints,
            backgroundColor: '#3498db',
            borderColor: '#2980b9',
            pointRadius: 5,
            pointHoverRadius: 7
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: parsedData.title || 'Scatterplot', font: { size: 16, weight: 'bold' } },
            legend: { display: false }
          },
          scales: {
            x: {
              min: minX,
              max: maxX,
              grid: { color: '#e0e0e0' },
              title: { display: true, text: parsedData.xAxis?.label || 'x' }
            },
            y: {
              min: minY,
              max: maxY,
              grid: { color: '#e0e0e0' },
              title: { display: true, text: parsedData.yAxis?.label || 'y' }
            }
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

  // ============================================================
  // 8. STACKED-BAR (기존에 있던 것)
  // ============================================================
  else if (parsedData.type === 'stacked-bar' && parsedData.labels && parsedData.datasets) {
    var stackedChartId = 'chart_' + Math.random().toString(36).substr(2, 9);
    var stackedHtml = '<div style="margin:15px 0;padding:15px;background:#f8f9fa;border-radius:8px;border:1px solid #e9ecef;"><canvas id="' + stackedChartId + '" style="max-height:400px;width:100%;"></canvas></div>';
    
    setTimeout(function() {
      var ctx = document.getElementById(stackedChartId);
      if (!ctx) return;
      if (window._chartInstances && window._chartInstances[stackedChartId]) {
        window._chartInstances[stackedChartId].destroy();
      }
      if (!window._chartInstances) window._chartInstances = {};
      
      var datasets = parsedData.datasets.map(function(ds, i) {
        var color = colors[i % colors.length];
        return {
          label: ds.label || 'Series ' + (i+1),
          data: ds.values || [],
          backgroundColor: color + '80',
          borderColor: color,
          borderWidth: 1
        };
      });
      
      var cc = {
        type: 'bar',
        data: {
          labels: parsedData.labels,
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: parsedData.title || 'Stacked Bar Chart', font: { size: 16, weight: 'bold' } },
            legend: { position: 'bottom' }
          },
          scales: {
            x: { stacked: true, grid: { color: '#e0e0e0' } },
            y: { stacked: true, beginAtZero: true, grid: { color: '#e0e0e0' } }
          }
        }
      };
      
      var canvas = document.getElementById(stackedChartId);
      if (canvas && cc) {
        canvas.parentElement.style.height = '400px';
        window._chartInstances[stackedChartId] = new Chart(canvas, cc);
      }
    }, 100);
    
    return stackedHtml;
  }

  // ============================================================
  // 9. COMPARE (기존에 있던 것)
  // ============================================================
  else if (parsedData.type === 'compare' && parsedData.graphs) {
    var compareChartId = 'chart_' + Math.random().toString(36).substr(2, 9);
    var compareHtml = '<div style="margin:15px 0;padding:15px;background:#f8f9fa;border-radius:8px;border:1px solid #e9ecef;"><canvas id="' + compareChartId + '" style="max-height:400px;width:100%;"></canvas></div>';
    
    setTimeout(function() {
      var ctx = document.getElementById(compareChartId);
      if (!ctx) return;
      if (window._chartInstances && window._chartInstances[compareChartId]) {
        window._chartInstances[compareChartId].destroy();
      }
      if (!window._chartInstances) window._chartInstances = {};
      
      var allPoints = [];
      parsedData.graphs.forEach(function(g) {
        if (g.points) {
          g.points.forEach(function(p) {
            allPoints.push(p.x !== undefined ? p.x : 0);
          });
        }
      });
      
      var minX = Infinity, maxX = -Infinity;
      var minY = Infinity, maxY = -Infinity;
      parsedData.graphs.forEach(function(g) {
        if (g.points) {
          g.points.forEach(function(p) {
            var x = p.x !== undefined ? p.x : 0;
            var y = p.y !== undefined ? p.y : 0;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          });
        }
      });
      
      if (minX === Infinity) { minX = 0; maxX = 10; }
      if (minY === Infinity) { minY = 0; maxY = 10; }
      var paddingX = (maxX - minX) * 0.1 || 1;
      var paddingY = (maxY - minY) * 0.1 || 1;
      
      var datasets = parsedData.graphs.map(function(g, i) {
        var color = colors[i % colors.length];
        var data = [];
        if (g.points) {
          data = g.points.map(function(p) {
            return { x: p.x !== undefined ? p.x : 0, y: p.y !== undefined ? p.y : 0 };
          });
        }
        return {
          label: g.label || 'Series ' + (i+1),
          data: data,
          borderColor: color,
          backgroundColor: color + '20',
          pointRadius: 4,
          pointBackgroundColor: color,
          tension: 0.3,
          showLine: true,
          fill: false
        };
      });
      
      var cc = {
        type: 'scatter',
        data: { datasets: datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: parsedData.title || 'Comparison Chart', font: { size: 16, weight: 'bold' } },
            legend: { position: 'bottom' }
          },
          scales: {
            x: { 
              type: 'linear',
              min: minX - paddingX,
              max: maxX + paddingX,
              grid: { color: '#e0e0e0' },
              title: { display: true, text: parsedData.xAxis?.label || '' }
            },
            y: {
              min: minY - paddingY,
              max: maxY + paddingY,
              grid: { color: '#e0e0e0' },
              title: { display: true, text: parsedData.yAxis?.label || '' }
            }
          }
        }
      };
      
      var canvas = document.getElementById(compareChartId);
      if (canvas && cc) {
        canvas.parentElement.style.height = '400px';
        window._chartInstances[compareChartId] = new Chart(canvas, cc);
      }
    }, 100);
    
    return compareHtml;
  }

  // ============================================================
  // 10. FUNCTION (신규 - Math.js + Canvas)
  // ============================================================
  else if (parsedData.type === 'function' && parsedData.equation) {
    var funcCanvasId = 'chart_' + Math.random().toString(36).substr(2, 9);
    var funcHtml = '<div style="margin:15px 0;padding:15px;background:#f8f9fa;border-radius:8px;border:1px solid #e9ecef;position:relative;">' +
      '<canvas id="' + funcCanvasId + '" style="width:100%;height:400px;display:block;border-radius:4px;"></canvas>' +
      '</div>';
    
    setTimeout(function() {
      var canvas = document.getElementById(funcCanvasId);
      if (!canvas) return;
      
      var rect = canvas.parentElement.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      var w = canvas.parentElement.clientWidth || 600;
      var h = 400;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      
      var ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      
      var equation = parsedData.equation.replace(/y\s*=\s*/, '');
      var xMin = parsedData.xAxis?.min !== undefined ? parsedData.xAxis.min : -10;
      var xMax = parsedData.xAxis?.max !== undefined ? parsedData.xAxis.max : 10;
      var yMin = parsedData.yAxis?.min !== undefined ? parsedData.yAxis.min : -10;
      var yMax = parsedData.yAxis?.max !== undefined ? parsedData.yAxis.max : 10;
      var samples = 1000;
      var color = parsedData.color || '#e74c3c';
      var lineWidth = parsedData.lineWidth || 3;
      
      var padding = 40;
      var graphW = w - padding * 2;
      var graphH = h - padding * 2;
      
      function worldToScreen(wx, wy) {
        var sx = padding + ((wx - xMin) / (xMax - xMin)) * graphW;
        var sy = padding + graphH - ((wy - yMin) / (yMax - yMin)) * graphH;
        return { x: sx, y: sy };
      }
      
      function evaluate(expr, x) {
        try {
          var node = math.parse(expr);
          var result = node.evaluate({ x: x });
          return typeof result === 'number' && isFinite(result) ? result : NaN;
        } catch(e) {
          return NaN;
        }
      }
      
      // 배경
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      
      // 그리드
      ctx.strokeStyle = '#f0f0f0';
      ctx.lineWidth = 1;
      for (var x = Math.ceil(xMin); x <= Math.floor(xMax); x++) {
        var pos = worldToScreen(x, 0);
        ctx.beginPath();
        ctx.moveTo(pos.x, padding);
        ctx.lineTo(pos.x, padding + graphH);
        ctx.stroke();
      }
      for (var y = Math.ceil(yMin); y <= Math.floor(yMax); y++) {
        if (y === 0) continue;
        var pos = worldToScreen(0, y);
        ctx.beginPath();
        ctx.moveTo(padding, pos.y);
        ctx.lineTo(padding + graphW, pos.y);
        ctx.stroke();
      }
      
      // 축
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      var origin = worldToScreen(0, 0);
      if (origin.x >= padding && origin.x <= padding + graphW) {
        ctx.beginPath();
        ctx.moveTo(origin.x, padding);
        ctx.lineTo(origin.x, padding + graphH);
        ctx.stroke();
      }
      if (origin.y >= padding && origin.y <= padding + graphH) {
        ctx.beginPath();
        ctx.moveTo(padding, origin.y);
        ctx.lineTo(padding + graphW, origin.y);
        ctx.stroke();
      }
      
      // 화살표
      ctx.fillStyle = '#333';
      if (origin.x >= padding && origin.x <= padding + graphW) {
        ctx.beginPath();
        ctx.moveTo(origin.x, padding);
        ctx.lineTo(origin.x - 6, padding + 8);
        ctx.lineTo(origin.x + 6, padding + 8);
        ctx.fill();
      }
      if (origin.y >= padding && origin.y <= padding + graphH) {
        ctx.beginPath();
        ctx.moveTo(padding + graphW, origin.y);
        ctx.lineTo(padding + graphW - 8, origin.y - 6);
        ctx.lineTo(padding + graphW - 8, origin.y + 6);
        ctx.fill();
      }
      
      // 축 레이블
      ctx.fillStyle = '#555';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(parsedData.xAxis?.label || 'x', padding + graphW / 2, h - 18);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(parsedData.yAxis?.label || 'y', 12, padding);
      
      // 함수 그래프
      var points = [];
      var step = (xMax - xMin) / samples;
      for (var xVal = xMin; xVal <= xMax; xVal += step) {
        var yVal = evaluate(equation, xVal);
        if (!isNaN(yVal) && isFinite(yVal) && yVal >= yMin && yVal <= yMax) {
          points.push({ x: xVal, y: yVal });
        } else if (points.length > 0) {
          points.push({ x: xVal, y: NaN });
        }
      }
      
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      
      var i = 0;
      while (i < points.length) {
        while (i < points.length && isNaN(points[i].y)) i++;
        if (i >= points.length) break;
        var start = i;
        while (i < points.length && !isNaN(points[i].y)) i++;
        if (i - start > 1) {
          ctx.beginPath();
          var p = worldToScreen(points[start].x, points[start].y);
          ctx.moveTo(p.x, p.y);
          for (var j = start + 1; j < i; j++) {
            p = worldToScreen(points[j].x, points[j].y);
            ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();
        }
      }
      
      // 점 표시
      if (parsedData.points) {
        parsedData.points.forEach(function(pt) {
          var screen = worldToScreen(pt.x, pt.y);
          ctx.beginPath();
          ctx.arc(screen.x, screen.y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = pt.color || '#e74c3c';
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
          if (pt.label) {
            ctx.fillStyle = '#333';
            ctx.font = '13px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(pt.label, screen.x, screen.y - 8);
          }
        });
      }
      
      // 방정식 레이블
      if (parsedData.showEquation !== false) {
        ctx.fillStyle = color;
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        var labelPos = worldToScreen(xMax * 0.7, evaluate(equation, xMax * 0.7));
        if (isFinite(labelPos.y)) {
          ctx.fillText('y = ' + equation, padding + 10, padding + 20);
        }
      }
      
    }, 100);
    
    return funcHtml;
  }

  // ============================================================
  // 11. COORDINATE-PLANE (신규)
  // ============================================================
  else if (parsedData.type === 'coordinate-plane') {
    var coordCanvasId = 'coord_' + Math.random().toString(36).substr(2, 9);
    var coordHtml = '<div style="margin:15px 0;padding:15px;background:#f8f9fa;border-radius:8px;border:1px solid #e9ecef;position:relative;">' +
      '<canvas id="' + coordCanvasId + '" style="width:100%;height:400px;display:block;border-radius:4px;"></canvas>' +
      '</div>';
    
    setTimeout(function() {
      var canvas = document.getElementById(coordCanvasId);
      if (!canvas) return;
      
      var rect = canvas.parentElement.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      var w = canvas.parentElement.clientWidth || 600;
      var h = 400;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      
      var ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      
      var xMin = parsedData.xAxis?.min !== undefined ? parsedData.xAxis.min : -10;
      var xMax = parsedData.xAxis?.max !== undefined ? parsedData.xAxis.max : 10;
      var yMin = parsedData.yAxis?.min !== undefined ? parsedData.yAxis.min : -10;
      var yMax = parsedData.yAxis?.max !== undefined ? parsedData.yAxis.max : 10;
      
      var padding = 40;
      var graphW = w - padding * 2;
      var graphH = h - padding * 2;
      
      function toScreen(px, py) {
        var sx = padding + ((px - xMin) / (xMax - xMin)) * graphW;
        var sy = padding + graphH - ((py - yMin) / (yMax - yMin)) * graphH;
        return { x: sx, y: sy };
      }
      
      // 배경
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      
      // 그리드
      if (parsedData.grid !== false) {
        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 1;
        var xTick = parsedData.xAxis?.tick || 1;
        var yTick = parsedData.yAxis?.tick || 1;
        for (var x = Math.ceil(xMin / xTick) * xTick; x <= xMax; x += xTick) {
          if (Math.abs(x) < 0.001) continue;
          var pos = toScreen(x, 0);
          ctx.beginPath();
          ctx.moveTo(pos.x, padding);
          ctx.lineTo(pos.x, padding + graphH);
          ctx.stroke();
        }
        for (var y = Math.ceil(yMin / yTick) * yTick; y <= yMax; y += yTick) {
          if (Math.abs(y) < 0.001) continue;
          var pos = toScreen(0, y);
          ctx.beginPath();
          ctx.moveTo(padding, pos.y);
          ctx.lineTo(padding + graphW, pos.y);
          ctx.stroke();
        }
      }
      
      // 축
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      var origin = toScreen(0, 0);
      if (origin.x >= padding && origin.x <= padding + graphW) {
        ctx.beginPath();
        ctx.moveTo(origin.x, padding);
        ctx.lineTo(origin.x, padding + graphH);
        ctx.stroke();
      }
      if (origin.y >= padding && origin.y <= padding + graphH) {
        ctx.beginPath();
        ctx.moveTo(padding, origin.y);
        ctx.lineTo(padding + graphW, origin.y);
        ctx.stroke();
      }
      
      // 화살표
      ctx.fillStyle = '#333';
      if (origin.x >= padding && origin.x <= padding + graphW) {
        ctx.beginPath();
        ctx.moveTo(origin.x, padding);
        ctx.lineTo(origin.x - 6, padding + 8);
        ctx.lineTo(origin.x + 6, padding + 8);
        ctx.fill();
      }
      if (origin.y >= padding && origin.y <= padding + graphH) {
        ctx.beginPath();
        ctx.moveTo(padding + graphW, origin.y);
        ctx.lineTo(padding + graphW - 8, origin.y - 6);
        ctx.lineTo(padding + graphW - 8, origin.y + 6);
        ctx.fill();
      }
      
      // 축 레이블
      ctx.fillStyle = '#555';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(parsedData.xAxis?.label || 'x', padding + graphW / 2, h - 18);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(parsedData.yAxis?.label || 'y', 12, padding);
      
      // 점 표시
      if (parsedData.points) {
        parsedData.points.forEach(function(pt) {
          var screen = toScreen(pt.x, pt.y);
          ctx.beginPath();
          ctx.arc(screen.x, screen.y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = pt.color || '#3498db';
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
          if (pt.label) {
            ctx.fillStyle = '#333';
            ctx.font = '13px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(pt.label, screen.x, screen.y - 8);
          }
        });
      }
      
      // 선분 표시
      if (parsedData.segments) {
        parsedData.segments.forEach(function(seg) {
          var from = toScreen(seg.from[0], seg.from[1]);
          var to = toScreen(seg.to[0], seg.to[1]);
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          ctx.strokeStyle = seg.color || '#e74c3c';
          ctx.lineWidth = seg.lineWidth || 2;
          ctx.stroke();
        });
      }
      
      // 곡선 표시
      if (parsedData.series) {
        parsedData.series.forEach(function(ser) {
          if (ser.type === 'curve' && ser.points) {
            ctx.beginPath();
            var first = toScreen(ser.points[0][0], ser.points[0][1]);
            ctx.moveTo(first.x, first.y);
            for (var k = 1; k < ser.points.length; k++) {
              var p = toScreen(ser.points[k][0], ser.points[k][1]);
              ctx.lineTo(p.x, p.y);
            }
            ctx.strokeStyle = ser.color || '#27ae60';
            ctx.lineWidth = ser.lineWidth || 2;
            ctx.stroke();
          }
        });
      }
      
    }, 100);
    
    return coordHtml;
  }

  // ============================================================
  // 12. SHAPE (신규)
  // ============================================================
  else if (parsedData.type === 'shape') {
    var shapeCanvasId = 'shape_' + Math.random().toString(36).substr(2, 9);
    var shapeHtml = '<div style="margin:15px 0;padding:15px;background:#f8f9fa;border-radius:8px;border:1px solid #e9ecef;position:relative;">' +
      '<canvas id="' + shapeCanvasId + '" style="width:100%;height:400px;display:block;border-radius:4px;"></canvas>' +
      '</div>';
    
    setTimeout(function() {
      var canvas = document.getElementById(shapeCanvasId);
      if (!canvas) return;
      
      var rect = canvas.parentElement.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      var w = canvas.parentElement.clientWidth || 600;
      var h = 400;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      
      var ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      
      var pts = parsedData.points || [];
      var segments = parsedData.segments || [];
      var labels = parsedData.labels || [];
      var angles = parsedData.angles || [];
      var circles = parsedData.circles || [];
      var arcs = parsedData.arcs || [];
      var rightAngles = parsedData.rightAngles || [];
      
      var padding = 40;
      var graphW = w - padding * 2;
      var graphH = h - padding * 2;
      
      var allX = pts.map(function(p) { return p.x; });
      var allY = pts.map(function(p) { return p.y; });
      if (allX.length === 0) { allX = [0, 1]; allY = [0, 1]; }
      var minX = Math.min.apply(null, allX) - 1;
      var maxX = Math.max.apply(null, allX) + 1;
      var minY = Math.min.apply(null, allY) - 1;
      var maxY = Math.max.apply(null, allY) + 1;
      var rangeX = maxX - minX || 1;
      var rangeY = maxY - minY || 1;
      var scaleX = graphW / rangeX;
      var scaleY = graphH / rangeY;
      var scale = Math.min(scaleX, scaleY);
      var cx = (minX + maxX) / 2;
      var cy = (minY + maxY) / 2;
      
      function toScreen(px, py) {
        var sx = padding + graphW/2 + (px - cx) * scale;
        var sy = padding + graphH/2 - (py - cy) * scale;
        return { x: sx, y: sy };
      }
      
      function getPoint(id) {
        for (var i = 0; i < pts.length; i++) {
          if (pts[i].id === id) return pts[i];
        }
        return null;
      }
      
      // 배경
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      
      // 그리드
      ctx.strokeStyle = '#f0f0f0';
      ctx.lineWidth = 1;
      for (var x = Math.ceil(minX); x <= Math.floor(maxX); x++) {
        var pos = toScreen(x, 0);
        ctx.beginPath();
        ctx.moveTo(pos.x, padding);
        ctx.lineTo(pos.x, padding + graphH);
        ctx.stroke();
      }
      for (var y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
        var pos = toScreen(0, y);
        ctx.beginPath();
        ctx.moveTo(padding, pos.y);
        ctx.lineTo(padding + graphW, pos.y);
        ctx.stroke();
      }
      
      // 축
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.5;
      var origin = toScreen(0, 0);
      if (origin.x >= padding && origin.x <= padding + graphW) {
        ctx.beginPath();
        ctx.moveTo(origin.x, padding);
        ctx.lineTo(origin.x, padding + graphH);
        ctx.stroke();
      }
      if (origin.y >= padding && origin.y <= padding + graphH) {
        ctx.beginPath();
        ctx.moveTo(padding, origin.y);
        ctx.lineTo(padding + graphW, origin.y);
        ctx.stroke();
      }
      
      // 원
      circles.forEach(function(c) {
        var center = getPoint(c.center);
        if (!center) {
          if (Array.isArray(c.center)) {
            center = { x: c.center[0], y: c.center[1] };
          } else {
            return;
          }
        }
        var centerScreen = toScreen(center.x, center.y);
        var radiusPx = c.radius * scale;
        ctx.beginPath();
        ctx.arc(centerScreen.x, centerScreen.y, radiusPx, 0, 2 * Math.PI);
        ctx.strokeStyle = c.stroke || '#3498db';
        ctx.lineWidth = c.lineWidth || 2;
        ctx.stroke();
        if (c.fill) {
          ctx.fillStyle = c.fill;
          ctx.fill();
        }
      });
      
      // 호
      arcs.forEach(function(a) {
        var center = getPoint(a.center);
        if (!center) return;
        var centerScreen = toScreen(center.x, center.y);
        var radiusPx = a.radius * scale;
        var startAngle = (a.startAngle || 0) * Math.PI / 180;
        var endAngle = (a.endAngle || 0) * Math.PI / 180;
        ctx.beginPath();
        ctx.arc(centerScreen.x, centerScreen.y, radiusPx, startAngle, endAngle);
        ctx.strokeStyle = a.stroke || '#2c3e50';
        ctx.lineWidth = a.lineWidth || 2;
        ctx.stroke();
      });
      
      // 선분
      segments.forEach(function(seg) {
        var fromPt = getPoint(seg.from);
        var toPt = getPoint(seg.to);
        if (!fromPt || !toPt) return;
        var from = toScreen(fromPt.x, fromPt.y);
        var to = toScreen(toPt.x, toPt.y);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = seg.stroke || '#2c3e50';
        ctx.lineWidth = seg.lineWidth || 2;
        ctx.stroke();
      });
      
      // 직각 표시
      rightAngles.forEach(function(vertexId) {
        var v = getPoint(vertexId);
        if (!v) return;
        var vScreen = toScreen(v.x, v.y);
        var size = 12;
        var neighbors = [];
        segments.forEach(function(seg) {
          if (seg.from === vertexId) {
            var pt = getPoint(seg.to);
            if (pt) neighbors.push(pt);
          }
          if (seg.to === vertexId) {
            var pt = getPoint(seg.from);
            if (pt) neighbors.push(pt);
          }
        });
        if (neighbors.length >= 2) {
          var n1 = toScreen(neighbors[0].x, neighbors[0].y);
          var n2 = toScreen(neighbors[1].x, neighbors[1].y);
          var dx1 = n1.x - vScreen.x, dy1 = n1.y - vScreen.y;
          var dx2 = n2.x - vScreen.x, dy2 = n2.y - vScreen.y;
          var len1 = Math.sqrt(dx1*dx1 + dy1*dy1);
          var len2 = Math.sqrt(dx2*dx2 + dy2*dy2);
          if (len1 > 0 && len2 > 0) {
            var ratio = size / len1;
            var p1x = vScreen.x + dx1 * ratio;
            var p1y = vScreen.y + dy1 * ratio;
            ratio = size / len2;
            var p2x = vScreen.x + dx2 * ratio;
            var p2y = vScreen.y + dy2 * ratio;
            var p3x = p1x + p2x - vScreen.x;
            var p3y = p1y + p2y - vScreen.y;
            ctx.beginPath();
            ctx.moveTo(p1x, p1y);
            ctx.lineTo(p3x, p3y);
            ctx.lineTo(p2x, p2y);
            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
      });
      
      // 각도 표시
      angles.forEach(function(a) {
        var v = getPoint(a.vertex);
        if (!v) return;
        var vScreen = toScreen(v.x, v.y);
        var sides = a.sides || [];
        var measure = a.measure || 0;
        var label = a.label || measure + '°';
        if (sides.length >= 2) {
          var p1 = getPoint(sides[0]);
          var p2 = getPoint(sides[1]);
          if (p1 && p2) {
            var p1s = toScreen(p1.x, p1.y);
            var p2s = toScreen(p2.x, p2.y);
            var angle1 = Math.atan2(p1s.y - vScreen.y, p1s.x - vScreen.x);
            var angle2 = Math.atan2(p2s.y - vScreen.y, p2s.x - vScreen.x);
            var radius = 30;
            var startA = Math.min(angle1, angle2);
            var endA = Math.max(angle1, angle2);
            if (endA - startA > Math.PI) {
              var temp = startA;
              startA = endA;
              endA = temp + 2 * Math.PI;
            }
            ctx.beginPath();
            ctx.arc(vScreen.x, vScreen.y, radius, startA, endA);
            ctx.strokeStyle = a.color || '#e74c3c';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            var midA = (startA + endA) / 2;
            var labelR = radius + 15;
            var lx = vScreen.x + labelR * Math.cos(midA);
            var ly = vScreen.y + labelR * Math.sin(midA);
            ctx.fillStyle = '#e74c3c';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, lx, ly);
          }
        }
      });
      
      // 점 표시
      pts.forEach(function(p) {
        var screen = toScreen(p.x, p.y);
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = p.color || '#3498db';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
      
      // 레이블
      labels.forEach(function(l) {
        var pos = toScreen(l.x, l.y);
        ctx.fillStyle = l.color || '#2c3e50';
        ctx.font = (l.fontSize || 14) + 'px sans-serif';
        ctx.textAlign = l.align || 'center';
        ctx.textBaseline = l.baseline || 'middle';
        ctx.fillText(l.text, pos.x, pos.y);
      });
      
      // 제목
      if (parsedData.question) {
        ctx.fillStyle = '#555';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(parsedData.question, w/2, 8);
      }
      
    }, 100);
    return shapeHtml;
  }

  // ============================================================
  // 13. HISTOGRAM (신규)
  // ============================================================
  else if (parsedData.type === 'histogram' && parsedData.bins && parsedData.counts) {
    setTimeout(function() {
      var ctx = document.getElementById(chartId);
      if (!ctx) return;
      if (window._chartInstances && window._chartInstances[chartId]) {
        window._chartInstances[chartId].destroy();
      }
      if (!window._chartInstances) window._chartInstances = {};
      
      var cc = {
        type: 'bar',
        data: {
          labels: parsedData.bins,
          datasets: [{
            label: parsedData.title || 'Frequency',
            data: parsedData.counts,
            backgroundColor: 'rgba(52,152,219,0.7)',
            borderColor: '#2c3e50',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: parsedData.title || 'Histogram', font: { size: 16, weight: 'bold' } },
            legend: { display: false }
          },
          scales: {
            x: { title: { display: true, text: parsedData.xLabel || '' }, grid: { color: '#e0e0e0' } },
            y: { beginAtZero: true, title: { display: true, text: parsedData.yLabel || 'Frequency' }, grid: { color: '#e0e0e0' } }
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

  // ============================================================
  // 14. DOT-PLOT (신규)
  // ============================================================
  else if (parsedData.type === 'dot-plot' && parsedData.data) {
    setTimeout(function() {
      var ctx = document.getElementById(chartId);
      if (!ctx) return;
      if (window._chartInstances && window._chartInstances[chartId]) {
        window._chartInstances[chartId].destroy();
      }
      if (!window._chartInstances) window._chartInstances = {};
      
      var labels = parsedData.data.map(function(d) { return d.value; });
      var values = parsedData.data.map(function(d) { return d.count; });
      
      var cc = {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: parsedData.title || 'Frequency',
            data: values,
            backgroundColor: 'rgba(52,152,219,0.5)',
            borderColor: '#2c3e50',
            borderWidth: 1,
            barPercentage: 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: parsedData.title || 'Dot Plot', font: { size: 16, weight: 'bold' } },
            legend: { display: false }
          },
          scales: {
            x: { title: { display: true, text: parsedData.xAxis?.label || 'Value' }, grid: { color: '#e0e0e0' } },
            y: { beginAtZero: true, title: { display: true, text: parsedData.yAxis?.label || 'Count' }, grid: { color: '#e0e0e0' } }
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
    
  // ============================================================
  // UNSUPPORTED
  // ============================================================
  else {
    return '<div style="padding:10px;text-align:center;color:#999;border:1px dashed #ddd;border-radius:8px;margin:15px 0;">' +
      '<span style="font-size:20px;">📊</span>' +
      '<p style="margin-top:8px;">Graph type "<strong>' + escapeHtml(parsedData.type || 'Unknown') + '</strong>" is not supported.</p>' +
      '</div>';
  }
}






















// ============================================================
// y T123-1 + T123-2 + T123-3 + T123-4 통합 (GitHub용 - 완전한 버전)  y
// ============================================================
// ===== 내보내기 (export) =====
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
};77
// ===== main.js 맨 아래, export 전에 추가 =====
window.initialize = initialize;
window.startQuizWithNumber = startQuizWithNumber;
window.renderCurrentQuestion = renderCurrentQuestion;
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
window.renderGraphic = renderGraphic;
window.showExplanation = showExplanation;
