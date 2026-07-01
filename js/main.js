// ================================================================
// main.js - SAT & AP 완전 지원 렌더링 엔진
// ================================================================

// ================================================================
// 1. 언어 설정 (LANG)
// ================================================================
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

// ================================================================
// 2. 상수 및 전역 변수
// ================================================================
var API_URL = "https://script.google.com/macros/s/AKfycbx-S88kC_Ii_MxbibHmmHQYK_ITc1U9jphAxJ-uV0NSBGMFUidA3ItBE0niKhUyW32oMA/exec";
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

// ================================================================
// 3. 유틸리티 함수
// ================================================================
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
  var letters = {1:'A',2:'B',3:'C',4:'D',5:'E',6:'F',7:'G',8:'H'};
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

// ================================================================
// 4. 수식 파서 (Function Parser)
// ================================================================
function parseFunction(equation) {
  if (!equation || typeof equation !== 'string') {
    return function(x) { return 0; };
  }
  
  var expr = equation
    .replace(/\^/g, '**')
    .replace(/sin\(/g, 'Math.sin(')
    .replace(/cos\(/g, 'Math.cos(')
    .replace(/tan\(/g, 'Math.tan(')
    .replace(/log10\(/g, 'Math.log10(')
    .replace(/log2\(/g, 'Math.log2(')
    .replace(/ln\(/g, 'Math.log(')
    .replace(/log\(/g, 'Math.log10(')
    .replace(/sqrt\(/g, 'Math.sqrt(')
    .replace(/cbrt\(/g, 'Math.cbrt(')
    .replace(/abs\(/g, 'Math.abs(')
    .replace(/exp\(/g, 'Math.exp(')
    .replace(/pi/g, 'Math.PI')
    .replace(/euler/g, 'Math.E');
  
  try {
    return new Function('x', 'return ' + expr + ';');
  } catch(e) {
    console.warn('⚠️ Function parse error:', e.message);
    return function(x) { return 0; };
  }
}

// ================================================================
// 5. 좌표 변환 헬퍼
// ================================================================
function toPixelX(x, xMin, xMax, canvasWidth, padding) {
  padding = padding || 50;
  var plotW = canvasWidth - 2 * padding;
  return padding + ((x - xMin) / (xMax - xMin)) * plotW;
}

function toPixelY(y, yMin, yMax, canvasHeight, padding) {
  padding = padding || 50;
  var plotH = canvasHeight - 2 * padding;
  return padding + plotH - ((y - yMin) / (yMax - yMin)) * plotH;
}

// ================================================================
// 6. 함수 그래프 렌더러 (Core)
// ================================================================
function renderFunctionGraph(ctx, equation, domain, color, lineWidth, options) {
  options = options || {};
  var fn = parseFunction(equation);
  var points = [];
  var step = (domain[1] - domain[0]) / (options.resolution || 200);
  var yLimit = options.yLimit || 100;
  
  for (var x = domain[0]; x <= domain[1]; x += step) {
    try {
      var y = fn(x);
      if (isFinite(y) && Math.abs(y) < yLimit) {
        points.push({ x: x, y: y });
      }
    } catch(e) {}
  }
  
  if (points.length < 2) return points;
  
  ctx.save();
  ctx.strokeStyle = color || '#e74c3c';
  ctx.lineWidth = lineWidth || 3;
  ctx.beginPath();
  
  for (var i = 0; i < points.length; i++) {
    var px = toPixelX(points[i].x);
    var py = toPixelY(points[i].y);
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.stroke();
  ctx.restore();
  
  return points;
}

// ================================================================
// 7. 메인 renderGraphic (48개 + 81개 = 129개 함수 통합)
// ================================================================
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
  
  var graphType = parsedData.type || '';
  
  // ================================================================
  // 7a. TABLE (표) - 기존 48개
  // ================================================================
  if (graphType === 'table' || graphType === 'frequency-table') {
    if (!parsedData.headers || !parsedData.rows) {
      return '<div style="padding:10px;color:#999;">No data</div>';
    }
    
    var h = '<div style="margin:15px 0;overflow-x:auto;background:white;border-radius:8px;border:1px solid #ddd;"><table style="width:100%;border-collapse:collapse;text-align:center;font-size:14px;">';
    h += '<thead><tr style="background:#3498db;color:white;">';
    for (var hi = 0; hi < parsedData.headers.length; hi++) {
      h += '<th style="padding:10px 14px;border:1px solid #2980b9;font-weight:bold;">' + escapeHtml(parsedData.headers[hi]) + '</th>';
    }
    h += '</tr></thead><tbody>';
    for (var ri = 0; ri < parsedData.rows.length; ri++) {
      var row = parsedData.rows[ri];
      h += '<tr style="background:' + (ri%2===0?'#fff':'#f8f9fa') + ';">';
      for (var ci = 0; ci < row.length; ci++) {
        h += '<td style="padding:8px 14px;border:1px solid #ddd;">' + escapeHtml(row[ci]) + '</td>';
      }
      h += '</tr>';
    }
    h += '</tbody></table>';
    if (parsedData.title) {
      h += '<div style="text-align:center;padding:8px;font-weight:bold;color:#555;background:#f8f9fa;border-radius:0 0 8px 8px;">' + escapeHtml(parsedData.title) + '</div>';
    }
    h += '</div>';
    return h;
  }
  
  // ================================================================
  // 7b. BAR (막대) - 기존 48개
  // ================================================================
  if (graphType === 'bar' || graphType === 'stacked-bar' || graphType === 'histogram') {
    var labels = [];
    var datasets = [];
    var chartTitle = parsedData.title || 'Bar Chart';
    var xLabel = (parsedData.xAxis && parsedData.xAxis.label) || '';
    var yLabel = (parsedData.yAxis && parsedData.yAxis.label) || '';
    var yMin = (parsedData.yAxis && parsedData.yAxis.min) || 0;
    var yMax = (parsedData.yAxis && parsedData.yAxis.max) || undefined;
    var isStacked = (graphType === 'stacked-bar');
    
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
      labels = normalizeArray(parsedData.categories || (parsedData.xAxis && parsedData.xAxis.ticks) || []);
      for (var si = 0; si < series.length; si++) {
        var s = series[si];
        var vals = s.values || [];
        if (typeof vals === 'string') {
          try { vals = JSON.parse(vals); } catch(e) { vals = vals.split(',').map(function(v) { return parseFloat(v.trim()); }); }
        }
        if (!Array.isArray(vals)) vals = [];
        datasets.push({
          label: s.name || 'Series ' + (si+1),
          data: vals,
          backgroundColor: colors[si % colors.length] + '80',
          borderColor: colors[si % colors.length],
          borderWidth: 2
        });
      }
    }
    
    if (datasets.length === 0) {
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
            x: { 
              title: { display: true, text: xLabel }, 
              grid: { color: '#e0e0e0' },
              stacked: isStacked
            },
            y: { 
              beginAtZero: true, 
              title: { display: true, text: yLabel }, 
              grid: { color: '#e0e0e0' }, 
              min: yMin, 
              max: yMax,
              stacked: isStacked
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
  
  // ================================================================
  // 7c. PIE / DOUGHNUT - 기존 48개
  // ================================================================
  if ((graphType === 'pie' || graphType === 'doughnut') && parsedData.labels && parsedData.values) {
    setTimeout(function() {
      var ctx = document.getElementById(chartId);
      if (!ctx) return;
      if (window._chartInstances && window._chartInstances[chartId]) {
        window._chartInstances[chartId].destroy();
      }
      if (!window._chartInstances) window._chartInstances = {};
      
      var cc = {
        type: graphType,
        data: {
          labels: parsedData.labels,
          datasets: [{
            data: parsedData.values,
            backgroundColor: parsedData.colors || ['#3498db', '#e74c3c', '#27ae60', '#f39c12', '#9b59b6', '#1abc9c'],
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: parsedData.title || (graphType === 'pie' ? 'Pie Chart' : 'Doughnut Chart'), font: { size: 16, weight: 'bold' } },
            legend: { position: 'bottom' }
          },
          cutout: graphType === 'doughnut' ? (parsedData.cutout || '50%') : '0%'
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
  
  // ================================================================
  // 7d. LINE - 기존 48개
  // ================================================================
  if (graphType === 'line' && parsedData.series) {
    setTimeout(function() {
      var ctx = document.getElementById(chartId);
      if (!ctx) return;
      if (window._chartInstances && window._chartInstances[chartId]) {
        window._chartInstances[chartId].destroy();
      }
      if (!window._chartInstances) window._chartInstances = {};
      
      var ds = [];
      for (var li = 0; li < parsedData.series.length; li++) {
        var s = parsedData.series[li];
        var points = [];
        if (Array.isArray(s.points)) {
          points = s.points;
        } else if (typeof s.points === 'string') {
          try { points = JSON.parse(s.points); } catch(e) { points = []; }
        } else if (Array.isArray(s.data) && parsedData.xAxis && Array.isArray(parsedData.xAxis.categories)) {
          for (var di = 0; di < s.data.length; di++) {
            points.push({ x: parsedData.xAxis.categories[di] || di, y: s.data[di] });
          }
        } else if (Array.isArray(s.data) && s.data.length && typeof s.data[0] === 'object') {
          points = s.data;
        } else if (Array.isArray(s.data)) {
          for (var di2 = 0; di2 < s.data.length; di2++) {
            points.push({ x: di2, y: s.data[di2] });
          }
        }
        ds.push({
          label: s.name || ('Series ' + (li + 1)),
          data: points,
          showLine: true,
          borderColor: s.color || colors[li % colors.length],
          backgroundColor: (s.color || colors[li % colors.length]) + '20',
          borderWidth: s.lineWidth || 2,
          pointRadius: s.pointSize || 4,
          tension: s.tension || 0.3,
          fill: s.fill || false
        });
      }
      
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
  
  // ================================================================
  // 7e. SCATTER / SCATTER-ONLY - 기존 48개
  // ================================================================
  if ((graphType === 'scatter' || graphType === 'scatter-only') && parsedData.points) {
    setTimeout(function() {
      var ctx = document.getElementById(chartId);
      if (!ctx) return;
      if (window._chartInstances && window._chartInstances[chartId]) {
        window._chartInstances[chartId].destroy();
      }
      if (!window._chartInstances) window._chartInstances = {};
      
      var showLine = (graphType === 'scatter');
      var cc = {
        type: 'scatter',
        data: {
          datasets: [{
            label: parsedData.equation || parsedData.label || 'Data',
            data: parsedData.points,
            showLine: showLine,
            borderColor: parsedData.color || '#3498db',
            backgroundColor: (parsedData.color || '#3498db') + '20',
            borderWidth: parsedData.lineWidth || 2,
            pointRadius: parsedData.pointSize || (showLine ? 4 : 6),
            pointBackgroundColor: parsedData.color || (showLine ? '#3498db' : '#e74c3c'),
            tension: parsedData.tension || 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: parsedData.equation || parsedData.title || parsedData.question || 'Scatter Plot', font: { size: 16, weight: 'bold' } }
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
  
  // ================================================================
  // 7f. RADAR - 기존 48개
  // ================================================================
  if (graphType === 'radar' && parsedData.labels && parsedData.datasets) {
    setTimeout(function() {
      var ctx = document.getElementById(chartId);
      if (!ctx) return;
      if (window._chartInstances && window._chartInstances[chartId]) {
        window._chartInstances[chartId].destroy();
      }
      if (!window._chartInstances) window._chartInstances = {};
      
      var ds = [];
      for (var rdi = 0; rdi < parsedData.datasets.length; rdi++) {
        var d = parsedData.datasets[rdi];
        var values = d.values || [];
        if (typeof values === 'string') {
          try { values = JSON.parse(values); } catch(e) { values = values.split(',').map(function(v) { return parseFloat(v.trim()); }); }
        }
        ds.push({
          label: d.label || 'Series ' + (rdi+1),
          data: values,
          borderColor: d.color || colors[rdi % colors.length],
          backgroundColor: (d.color || colors[rdi % colors.length]) + '20',
          borderWidth: 2,
          pointRadius: 4
        });
      }
      
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
  
  // ================================================================
  // 7g. COORDINATE-PLANE (좌표평면) - ★★★★★ 중요
  // ================================================================
  if (graphType === 'coordinate-plane') {
    setTimeout(function() {
      var ctx = document.getElementById(chartId);
      if (!ctx) return;
      if (window._chartInstances && window._chartInstances[chartId]) {
        window._chartInstances[chartId].destroy();
      }
      if (!window._chartInstances) window._chartInstances = {};
      
      var canvas = document.getElementById(chartId);
      var W = canvas.width;
      var H = canvas.height;
      var pad = 50;
      
      var xMin = -10, xMax = 10, yMin = -10, yMax = 10;
      if (parsedData.xAxis) {
        if (parsedData.xAxis.min !== undefined) xMin = parsedData.xAxis.min;
        if (parsedData.xAxis.max !== undefined) xMax = parsedData.xAxis.max;
      }
      if (parsedData.yAxis) {
        if (parsedData.yAxis.min !== undefined) yMin = parsedData.yAxis.min;
        if (parsedData.yAxis.max !== undefined) yMax = parsedData.yAxis.max;
      }
      
      var xLabel = (parsedData.xAxis && parsedData.xAxis.label) || 'x';
      var yLabel = (parsedData.yAxis && parsedData.yAxis.label) || 'y';
      
      // 좌표 변환 함수
      function toPX(x) { return pad + ((x - xMin) / (xMax - xMin)) * (W - 2 * pad); }
      function toPY(y) { return pad + (H - 2 * pad) - ((y - yMin) / (yMax - yMin)) * (H - 2 * pad); }
      
      // 그리드 그리기
      ctx.save();
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 0.5;
      
      var tickX = (parsedData.xAxis && parsedData.xAxis.tick) || 1;
      var tickY = (parsedData.yAxis && parsedData.yAxis.tick) || 1;
      
      for (var x = Math.ceil(xMin / tickX) * tickX; x <= xMax; x += tickX) {
        var px = toPX(x);
        ctx.beginPath();
        ctx.moveTo(px, pad);
        ctx.lineTo(px, H - pad);
        ctx.stroke();
        ctx.fillStyle = '#333';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(x, px, H - pad + 16);
      }
      
      for (var y = Math.ceil(yMin / tickY) * tickY; y <= yMax; y += tickY) {
        var py = toPY(y);
        ctx.beginPath();
        ctx.moveTo(pad, py);
        ctx.lineTo(W - pad, py);
        ctx.stroke();
        ctx.fillStyle = '#333';
        ctx.font = '11px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(y, pad - 8, py + 4);
      }
      
      // 축 라벨
      ctx.fillStyle = '#333';
      ctx.font = '13px Arial bold';
      ctx.textAlign = 'center';
      ctx.fillText(xLabel, W / 2, H - 6);
      ctx.textAlign = 'center';
      ctx.fillText(yLabel, 20, pad - 10);
      ctx.restore();
      
      var datasets = [];
      
      // Points
      if (parsedData.points && parsedData.points.length > 0) {
        datasets.push({
          label: 'Points',
          data: parsedData.points,
          showLine: false,
          backgroundColor: '#e74c3c',
          pointRadius: 6,
          pointBackgroundColor: '#e74c3c',
          pointBorderColor: 'white',
          pointBorderWidth: 2
        });
      }
      
      // Segments
      if (parsedData.segments && parsedData.segments.length > 0) {
        for (var si4 = 0; si4 < parsedData.segments.length; si4++) {
          var seg = parsedData.segments[si4];
          datasets.push({
            label: seg.label || 'Segment ' + (si4+1),
            data: [{ x: seg.from[0], y: seg.from[1] }, { x: seg.to[0], y: seg.to[1] }],
            showLine: true,
            borderColor: seg.color || '#2c3e50',
            borderWidth: seg.lineWidth || 2,
            pointRadius: 0,
            fill: false
          });
        }
      }
      
      // Lines (y = mx + b)
      if (parsedData.lines) {
        for (var li2 = 0; li2 < parsedData.lines.length; li2++) {
          var line = parsedData.lines[li2];
          var pts = [
            { x: xMin, y: line.slope * xMin + line.intercept },
            { x: xMax, y: line.slope * xMax + line.intercept }
          ];
          datasets.push({
            label: line.label || 'Line ' + (li2+1),
            data: pts,
            showLine: true,
            borderColor: line.color || colors[li2 % colors.length],
            borderWidth: line.lineWidth || 2,
            pointRadius: 0,
            fill: false
          });
        }
      }
      
      // ★★★ FUNCTIONS (함수 그래프) - 신규
      if (parsedData.functions) {
        for (var fi = 0; fi < parsedData.functions.length; fi++) {
          var fn = parsedData.functions[fi];
          var fnPoints = [];
          var domain = fn.domain || [xMin, xMax];
          var step = (domain[1] - domain[0]) / 200;
          var eqFn = parseFunction(fn.equation);
          
          for (var x2 = domain[0]; x2 <= domain[1]; x2 += step) {
            try {
              var y2 = eqFn(x2);
              if (isFinite(y2) && Math.abs(y2) < 100) {
                fnPoints.push({ x: x2, y: y2 });
              }
            } catch(e) {}
          }
          
          if (fnPoints.length > 1) {
            datasets.push({
              label: fn.equation || 'f(x)',
              data: fnPoints,
              showLine: true,
              borderColor: fn.color || '#e74c3c',
              borderWidth: fn.lineWidth || 3,
              pointRadius: 0,
              tension: 0.3,
              fill: false
            });
          }
        }
      }
      
      // ★★★ POLYNOMIALS (다항식) - 신규
      if (parsedData.polynomials) {
        for (var pi2 = 0; pi2 < parsedData.polynomials.length; pi2++) {
          var poly = parsedData.polynomials[pi2];
          var coeffs = poly.coefficients;
          var terms = [];
          var degree = coeffs.length - 1;
          for (var ci = 0; ci < coeffs.length; ci++) {
            var c = coeffs[ci];
            if (c === 0) continue;
            var exp = degree - ci;
            if (exp === 0) terms.push(String(c));
            else if (exp === 1) terms.push(c + '*x');
            else terms.push(c + '*x^' + exp);
          }
          var eq = terms.join('+');
          
          var fnPoints2 = [];
          var domain2 = poly.domain || [xMin, xMax];
          var step2 = (domain2[1] - domain2[0]) / 200;
          var eqFn2 = parseFunction(eq);
          
          for (var x3 = domain2[0]; x3 <= domain2[1]; x3 += step2) {
            try {
              var y3 = eqFn2(x3);
              if (isFinite(y3) && Math.abs(y3) < 100) {
                fnPoints2.push({ x: x3, y: y3 });
              }
            } catch(e) {}
          }
          
          if (fnPoints2.length > 1) {
            datasets.push({
              label: poly.label || 'Polynomial',
              data: fnPoints2,
              showLine: true,
              borderColor: poly.color || '#9b59b6',
              borderWidth: poly.lineWidth || 3,
              pointRadius: 0,
              tension: 0.3,
              fill: false
            });
          }
        }
      }
      
      // ★★★ PIECEWISE (조각함수) - 신규
      if (parsedData.piecewise) {
        for (var pi3 = 0; pi3 < parsedData.piecewise.length; pi3++) {
          var piece = parsedData.piecewise[pi3];
          var fnPoints3 = [];
          var domain3 = piece.domain || [xMin, xMax];
          var step3 = (domain3[1] - domain3[0]) / 200;
          var eqFn3 = parseFunction(piece.equation);
          
          for (var x4 = domain3[0]; x4 <= domain3[1]; x4 += step3) {
            try {
              var y4 = eqFn3(x4);
              if (isFinite(y4) && Math.abs(y4) < 100) {
                fnPoints3.push({ x: x4, y: y4 });
              }
            } catch(e) {}
          }
          
          if (fnPoints3.length > 1) {
            datasets.push({
              label: piece.label || piece.equation || 'Piecewise',
              data: fnPoints3,
              showLine: true,
              borderColor: piece.color || '#27ae60',
              borderWidth: piece.lineWidth || 2.5,
              pointRadius: 0,
              tension: 0.1,
              fill: false
            });
          }
        }
      }
      
      // ★★★ ABSOLUTE (절대값) - 신규
      if (parsedData.absolute) {
        var absEq = 'Math.abs(' + parsedData.absolute.equation + ')';
        var fnPoints4 = [];
        var domain4 = parsedData.absolute.domain || [xMin, xMax];
        var step4 = (domain4[1] - domain4[0]) / 200;
        var eqFn4 = parseFunction(absEq);
        
        for (var x5 = domain4[0]; x5 <= domain4[1]; x5 += step4) {
          try {
            var y5 = eqFn4(x5);
            if (isFinite(y5) && Math.abs(y5) < 100) {
              fnPoints4.push({ x: x5, y: y5 });
            }
          } catch(e) {}
        }
        
        if (fnPoints4.length > 1) {
          datasets.push({
            label: '|' + parsedData.absolute.equation + '|',
            data: fnPoints4,
            showLine: true,
            borderColor: parsedData.absolute.color || '#f39c12',
            borderWidth: parsedData.absolute.lineWidth || 3,
            pointRadius: 0,
            tension: 0.3,
            fill: false
          });
        }
      }
      
      // ★★★ SYSTEM (연립방정식) - 신규
      if (parsedData.system && parsedData.system.equations) {
        for (var syi = 0; syi < parsedData.system.equations.length; syi++) {
          var sysEq = parsedData.system.equations[syi];
          var sysPoints = [];
          var sysDomain = parsedData.system.domain || [xMin, xMax];
          var sysStep = (sysDomain[1] - sysDomain[0]) / 200;
          var sysFn = parseFunction(sysEq.equation);
          
          for (var x6 = sysDomain[0]; x6 <= sysDomain[1]; x6 += sysStep) {
            try {
              var y6 = sysFn(x6);
              if (isFinite(y6) && Math.abs(y6) < 100) {
                sysPoints.push({ x: x6, y: y6 });
              }
            } catch(e) {}
          }
          
          if (sysPoints.length > 1) {
            datasets.push({
              label: sysEq.label || sysEq.equation,
              data: sysPoints,
              showLine: true,
              borderColor: sysEq.color || colors[syi % colors.length],
              borderWidth: sysEq.lineWidth || 2.5,
              pointRadius: 0,
              tension: 0.3,
              fill: false
            });
          }
        }
      }
      
      // ★★★ INEQUALITY (부등식 영역) - 신규
      if (parsedData.inequality) {
        // 간단한 영역 표시 (추후 확장)
      }
      
      // Chart.js로 렌더링
      if (datasets.length === 0) {
        return;
      }
      
      var cc = {
        type: 'scatter',
        data: { datasets: datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: parsedData.title || 'Coordinate Plane', font: { size: 16, weight: 'bold' } },
            legend: { position: 'bottom' }
          },
          scales: {
            x: { type: 'linear', title: { display: true, text: xLabel }, grid: { color: '#e0e0e0' }, min: xMin, max: xMax },
            y: { type: 'linear', title: { display: true, text: yLabel }, grid: { color: '#e0e0e0' }, min: yMin, max: yMax }
          }
        }
      };
      
      if (canvas && cc) {
        canvas.parentElement.style.height = '400px';
        window._chartInstances[chartId] = new Chart(canvas, cc);
      }
    }, 100);
    return html;
  }
  
  // ================================================================
  // 7h. SHAPE (도형) - 기존 48개
  // ================================================================
  if (graphType === 'shape' && parsedData.points) {
    setTimeout(function() {
      var ctx = document.getElementById(chartId);
      if (!ctx) return;
      if (window._chartInstances && window._chartInstances[chartId]) {
        window._chartInstances[chartId].destroy();
      }
      if (!window._chartInstances) window._chartInstances = {};
      
      var pts = parsedData.points.slice();
      pts.push({ x: parsedData.points[0].x, y: parsedData.points[0].y });
      
      var datasets = [];
      datasets.push({
        label: parsedData.label || 'Shape',
        data: pts,
        showLine: true,
        borderColor: parsedData.stroke || '#2c3e50',
        backgroundColor: parsedData.fill || 'rgba(52,152,219,0.15)',
        borderWidth: parsedData.lineWidth || 2,
        pointRadius: parsedData.pointSize || 4,
        pointBackgroundColor: parsedData.stroke || '#2c3e50',
        fill: true,
        tension: 0
      });
      
      var cc = {
        type: 'scatter',
        data: { datasets: datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: parsedData.question || parsedData.title || 'Shape', font: { size: 16, weight: 'bold' } },
            legend: { position: 'bottom' }
          },
          scales: {
            x: { type: 'linear', title: { display: true, text: 'X' }, grid: { color: '#e0e0e0' } },
            y: { type: 'linear', title: { display: true, text: 'Y' }, grid: { color: '#e0e0e0' } }
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
  
  // ================================================================
  // 7i. DOT-PLOT - 기존 48개
  // ================================================================
  if (graphType === 'dot-plot' && parsedData.series) {
    setTimeout(function() {
      var ctx = document.getElementById(chartId);
      if (!ctx) return;
      if (window._chartInstances && window._chartInstances[chartId]) {
        window._chartInstances[chartId].destroy();
      }
      if (!window._chartInstances) window._chartInstances = {};
      
      var ds = [];
      for (var dpi = 0; dpi < parsedData.series.length; dpi++) {
        var sp = parsedData.series[dpi];
        ds.push({
          label: sp.name || 'Series ' + (dpi+1),
          data: sp.data,
          showLine: false,
          backgroundColor: colors[dpi % colors.length],
          pointRadius: 8,
          pointBackgroundColor: colors[dpi % colors.length] + '80',
          pointBorderColor: colors[dpi % colors.length],
          pointBorderWidth: 2
        });
      }
      
      var cc = {
        type: 'scatter',
        data: { datasets: ds },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: parsedData.title || 'Dot Plot', font: { size: 16, weight: 'bold' } },
            legend: { position: 'bottom' }
          },
          scales: {
            x: { type: 'linear', title: { display: true, text: (parsedData.xAxis && parsedData.xAxis.label) || 'Value' }, grid: { color: '#e0e0e0' } },
            y: { title: { display: true, text: 'Frequency' }, grid: { color: '#e0e0e0' }, min: 0, ticks: { stepSize: 1, precision: 0 } }
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
  
  // ================================================================
  // 7j. BOX-PLOT (상자 수염 그림) - 신규
  // ================================================================
  if (graphType === 'box-plot' && parsedData.boxes) {
    setTimeout(function() {
      var ctx = document.getElementById(chartId);
      if (!ctx) return;
      if (window._chartInstances && window._chartInstances[chartId]) {
        window._chartInstances[chartId].destroy();
      }
      if (!window._chartInstances) window._chartInstances = {};
      
      var canvas = document.getElementById(chartId);
      var W = canvas.width;
      var H = canvas.height;
      var pad = 60;
      
      var yMin = (parsedData.yAxis && parsedData.yAxis.min) || 0;
      var yMax = (parsedData.yAxis && parsedData.yAxis.max) || 100;
      
      function toPX2(x) { return pad + ((x - 0.5) / (parsedData.boxes.length + 0.5)) * (W - 2 * pad); }
      function toPY2(y) { return pad + (H - 2 * pad) - ((y - yMin) / (yMax - yMin)) * (H - 2 * pad); }
      
      ctx.save();
      
      for (var bxi = 0; bxi < parsedData.boxes.length; bxi++) {
        var box = parsedData.boxes[bxi];
        var color = box.color || colors[bxi % colors.length];
        var x = bxi + 1;
        var px = toPX2(x);
        var pyMin = toPY2(box.min);
        var pyQ1 = toPY2(box.q1);
        var pyMedian = toPY2(box.median);
        var pyQ3 = toPY2(box.q3);
        var pyMax = toPY2(box.max);
        
        var boxWidth = 30;
        
        // 수염
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, pyMin);
        ctx.lineTo(px, pyQ1);
        ctx.moveTo(px, pyQ3);
        ctx.lineTo(px, pyMax);
        ctx.stroke();
        
        // 수염 끝
        ctx.beginPath();
        ctx.moveTo(px - 8, pyMin);
        ctx.lineTo(px + 8, pyMin);
        ctx.moveTo(px - 8, pyMax);
        ctx.lineTo(px + 8, pyMax);
        ctx.stroke();
        
        // 상자
        ctx.fillStyle = color + '30';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.fillRect(px - boxWidth/2, pyQ3, boxWidth, pyQ1 - pyQ3);
        ctx.strokeRect(px - boxWidth/2, pyQ3, boxWidth, pyQ1 - pyQ3);
        
        // 중앙값
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(px - boxWidth/2, pyMedian);
        ctx.lineTo(px + boxWidth/2, pyMedian);
        ctx.stroke();
        
        // 레이블
        ctx.fillStyle = '#2c3e50';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(box.label || 'Group ' + (bxi+1), px, toPY2(yMin) + 20);
        
        // 값 표시
        ctx.font = '10px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'left';
        ctx.fillText('min:' + box.min, px + boxWidth/2 + 4, pyMin + 3);
        ctx.fillText('Q1:' + box.q1, px + boxWidth/2 + 4, pyQ1 + 3);
        ctx.fillText('med:' + box.median, px + boxWidth/2 + 4, pyMedian + 3);
        ctx.fillText('Q3:' + box.q3, px + boxWidth/2 + 4, pyQ3 + 3);
        ctx.fillText('max:' + box.max, px + boxWidth/2 + 4, pyMax + 3);
      }
      
      ctx.restore();
    }, 100);
    return html;
  }
  
  // ================================================================
  // 7k. RESIDUAL-PLOT (잔차 그래프) - 신규
  // ================================================================
  if (graphType === 'residual-plot' && parsedData.residuals) {
    setTimeout(function() {
      var ctx = document.getElementById(chartId);
      if (!ctx) return;
      if (window._chartInstances && window._chartInstances[chartId]) {
        window._chartInstances[chartId].destroy();
      }
      if (!window._chartInstances) window._chartInstances = {};
      
      var canvas = document.getElementById(chartId);
      var W = canvas.width;
      var H = canvas.height;
      var pad = 60;
      
      var residuals = parsedData.residuals;
      var xMin = Math.min.apply(null, residuals.map(function(r) { return r.x; })) - 1;
      var xMax = Math.max.apply(null, residuals.map(function(r) { return r.x; })) + 1;
      var yMin = Math.min.apply(null, residuals.map(function(r) { return r.residual; })) - 1;
      var yMax = Math.max.apply(null, residuals.map(function(r) { return r.residual; })) + 1;
      
      function toPX3(x) { return pad + ((x - xMin) / (xMax - xMin)) * (W - 2 * pad); }
      function toPY3(y) { return pad + (H - 2 * pad) - ((y - yMin) / (yMax - yMin)) * (H - 2 * pad); }
      
      ctx.save();
      
      // 0선
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = '#95a5a6';
      ctx.lineWidth = 1;
      ctx.beginPath();
      var py0 = toPY3(0);
      ctx.moveTo(pad, py0);
      ctx.lineTo(W - pad, py0);
      ctx.stroke();
      
      // 잔차 점
      var color = parsedData.color || '#e74c3c';
      for (var ri3 = 0; ri3 < residuals.length; ri3++) {
        var px3 = toPX3(residuals[ri3].x);
        var py3 = toPY3(residuals[ri3].residual);
        ctx.beginPath();
        ctx.arc(px3, py3, 5, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // 값 표시
        ctx.fillStyle = '#666';
        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(residuals[ri3].residual.toFixed(2), px3 + 8, py3 + 3);
      }
      
      ctx.restore();
    }, 100);
    return html;
  }
  
  // ================================================================
  // 7l. NORMAL-DISTRIBUTION (정규분포) - 신규
  // ================================================================
  if (graphType === 'normal-distribution') {
    setTimeout(function() {
      var ctx = document.getElementById(chartId);
      if (!ctx) return;
      if (window._chartInstances && window._chartInstances[chartId]) {
        window._chartInstances[chartId].destroy();
      }
      if (!window._chartInstances) window._chartInstances = {};
      
      var mean = parsedData.mean || 0;
      var std = parsedData.std || 1;
      var domain = parsedData.domain || [mean - 4 * std, mean + 4 * std];
      var points = [];
      var step = (domain[1] - domain[0]) / 200;
      
      for (var x = domain[0]; x <= domain[1]; x += step) {
        var y = (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / std, 2));
        points.push({ x: x, y: y });
      }
      
      var color = parsedData.color || '#3498db';
      
      setTimeout(function() {
        var ctx2 = document.getElementById(chartId);
        if (!ctx2) return;
        if (window._chartInstances && window._chartInstances[chartId]) {
          window._chartInstances[chartId].destroy();
        }
        if (!window._chartInstances) window._chartInstances = {};
        
        var cc = {
          type: 'scatter',
          data: {
            datasets: [{
              label: 'N(' + mean + ', ' + std + '²)',
              data: points,
              showLine: true,
              borderColor: color,
              backgroundColor: color + '30',
              borderWidth: 3,
              pointRadius: 0,
              fill: true,
              tension: 0.3
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: { display: true, text: parsedData.title || 'N(' + mean + ', ' + std + '²)', font: { size: 16, weight: 'bold' } }
            },
            scales: {
              x: { type: 'linear', title: { display: true, text: 'x' }, grid: { color: '#e0e0e0' } },
              y: { title: { display: true, text: 'f(x)' }, grid: { color: '#e0e0e0' }, min: 0 }
            }
          }
        };
        
        var canvas = document.getElementById(chartId);
        if (canvas && cc) {
          canvas.parentElement.style.height = '400px';
          window._chartInstances[chartId] = new Chart(canvas, cc);
        }
      }, 100);
    }, 100);
    return html;
  }
  
  // ================================================================
  // 7m. Gauge (게이지) - 기존
  // ================================================================
  if (graphType === 'gauge') {
    setTimeout(function() {
      var ctx = document.getElementById(chartId);
      if (!ctx) return;
      if (window._chartInstances && window._chartInstances[chartId]) {
        window._chartInstances[chartId].destroy();
      }
      if (!window._chartInstances) window._chartInstances = {};
      
      var value = parsedData.value || 50;
      var min = parsedData.min || 0;
      var max = parsedData.max || 100;
      var percentage = (value - min) / (max - min);
      var color = percentage > 0.7 ? '#2ecc71' : percentage > 0.4 ? '#f39c12' : '#e74c3c';
      
      var cc = {
        type: 'doughnut',
        data: {
          datasets: [{
            data: [percentage * 100, (1 - percentage) * 100],
            backgroundColor: [color, '#ecf0f1'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          circumference: 180,
          rotation: 270,
          plugins: {
            title: { display: true, text: parsedData.title || 'Gauge', font: { size: 16, weight: 'bold' } },
            legend: { display: false }
          },
          cutout: '70%'
        },
        plugins: [{
          id: 'gaugeText',
          afterDraw: function(chart) {
            var ctx2 = chart.ctx;
            var width = chart.width;
            var height = chart.height;
            ctx2.save();
            ctx2.font = 'bold 28px Arial';
            ctx2.fillStyle = '#2c3e50';
            ctx2.textAlign = 'center';
            ctx2.textBaseline = 'middle';
            ctx2.fillText(value + (parsedData.suffix || ''), width/2, height/2 + 10);
            ctx2.restore();
          }
        }]
      };
      
      var canvas = document.getElementById(chartId);
      if (canvas && cc) {
        canvas.parentElement.style.height = '400px';
        window._chartInstances[chartId] = new Chart(canvas, cc);
      }
    }, 100);
    return html;
  }
  
  // ================================================================
  // UNSUPPORTED
  // ================================================================
  return '<div style="padding:10px;text-align:center;color:#999;border:1px dashed #ddd;border-radius:8px;margin:15px 0;">' +
    '<span style="font-size:20px;">📊</span>' +
    '<p style="margin-top:8px;">Graph type "<strong>' + escapeHtml(graphType) + '</strong>" is not supported.</p>' +
    '</div>';
}

// ================================================================
// 8. 렌더링 함수
// ================================================================
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
  var html = '<div class="question-card">' +
    '<div class="q-num">' + headerText + '</div>' +
    passageHtml +
    renderGraphic(q.graphic) +
    '<div class="question-text">' + escapeHtml(q.question) + '</div>';
  if (isAnswered) {
    var userAns = String(answered).trim();
    var isCorrect = (userAns === correctAnswerText) || (parseFloat(userAns) === parseFloat(correctAnswerText));
    var statusColor = isCorrect ? '#27ae60' : '#e74c3c';
    html += '<div style="margin-top:15px;padding:15px;background:#f8f9fa;border-radius:8px;border-left:4px solid #666;">' +
      '<div style="font-size:14px;color:#666;">Your answer: <strong>' + escapeHtml(userAns) + '</strong></div>' +
      '</div>' +
      '<div class="subjective-result" style="background:' + statusColor + ';">' +
      'Answer: ' + escapeHtml(correctAnswerText) +
      '</div>' +
      '<div class="subjective-explanation">' +
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

function renderCurrentQuestion() {
  console.log('🔴 renderCurrentQuestion START');
  
  if (!currentQuestions.length || currentIndex >= currentQuestions.length) {
    DOM.questionContainer.innerHTML = '<div style="padding:40px;text-align:center;color:red;">Error: Cannot load question</div>';
    return;
  }
  
  var q = currentQuestions[currentIndex];
  if (!q) {
    DOM.questionContainer.innerHTML = '<div style="padding:40px;text-align:center;color:red;">Error: Invalid question data</div>';
    return;
  }
  
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
  if (displayPassage && displayPassage.trim() !== '' && displayPassage.trim() !== 'No passage.') {
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
    if (q.choices[key] === originalAnswerText) {
      actualAnswerKey = key;
      break;
    }
  }
  var displayAnswer = actualAnswerKey !== null ? validKeys.indexOf(actualAnswerKey) + 1 : parseInt(originalAnswerKey);
  
  var html = '<div class="question-card">' +
    '<div class="q-num">' + headerText + '</div>' +
    passageHtml +
    renderGraphic(q.graphic) +
    '<div class="question-text">' + escapeHtml(q.question || 'No question text') + '</div>' +
    '<div class="choices">';
  
  for (var idx = 0; idx < validKeys.length; idx++) {
    var key = validKeys[idx];
    var choiceNum = parseInt(key);
    var letter = getAnswerLetter(idx + 1);
    var choiceText = q.choices[key] || 'Option ' + letter;
    var isSelected = (answered === choiceNum);
    var isCorrectChoice = (choiceNum === displayAnswer);
    var showCorrect = (answered !== null && answered !== undefined && answered !== -1);
    var cls = 'choice';
    if (showCorrect) {
      cls += ' disabled';
      if (isCorrectChoice) cls += ' correct';
      if (isSelected && !isCorrectChoice) cls += ' incorrect';
    }
    html += '<div class="' + cls + '" data-choice="' + choiceNum + '">' +
      '<span class="choice-letter">' + letter + '</span>' +
      '<span>' + escapeHtml(choiceText) + '</span>' +
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

function showExplanation() {
  var q = currentQuestions[currentIndex];
  var ans = userAnswers[currentIndex];
  if (!q || ans === null || ans === undefined || ans === -1) {
    DOM.explanationBox.classList.remove('show');
    return;
  }
  var hasChoices = hasRealChoices(q);
  if (!hasChoices) {
    var correctAns = '';
    if (q.A && q.A !== '') {
      correctAns = String(q.A).trim();
    } else if (q.answer && q.answer !== '' && q.answer !== '0') {
      correctAns = String(q.answer).trim();
    } else {
      correctAns = 'Answer not available';
    }
    var userAns = String(ans).trim();
    var isCorrect = (userAns === correctAns) || (parseFloat(userAns) === parseFloat(correctAns));
    var statusColor = isCorrect ? '#27ae60' : '#e74c3c';
    DOM.explanationText.innerHTML =
      '<div style="background:' + statusColor + ';color:white;padding:8px 16px;border-radius:6px;display:inline-block;font-weight:700;margin-bottom:15px;">' +
      'Answer: ' + escapeHtml(correctAns) +
      '</div>' +
      '<div style="margin-top:8px;font-size:14px;color:#555;">' +
      'Your answer: <strong>' + escapeHtml(userAns) + '</strong>' +
      '</div>' +
      '<p style="margin-top:12px;">' + escapeHtml(q.explanation || LANG.noExplanation) + '</p>';
    DOM.explanationBox.classList.add('show');
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
  DOM.explanationText.innerHTML =
    '<div style="background:' + statusColor + ';color:white;padding:8px 16px;border-radius:6px;display:inline-block;font-weight:700;margin-bottom:15px;">' +
    'Answer: ' + correctAnswerLetter +
    '</div>' +
    '<div style="margin-top:8px;font-size:14px;color:#555;">' +
    'Your answer: <strong>' + userAnswerLetter + '</strong>' +
    '</div>' +
    '<p style="margin-top:12px;">' + escapeHtml(q.explanation || LANG.noExplanation) + '</p>';
  DOM.explanationBox.classList.add('show');
}

// ================================================================
// 9. 타이머 및 내비게이션
// ================================================================
var timerSeconds = 134 * 60;
var timerInterval = null;
var timerRunning = false;
var timerPaused = false;

function formatTimer(seconds) {
  var hrs = Math.floor(seconds / 3600);
  var mins = Math.floor((seconds % 3600) / 60);
  var secs = seconds % 60;
  return String(hrs).padStart(2, '0') + ':' + 
         String(mins).padStart(2, '0') + ':' + 
         String(secs).padStart(2, '0');
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
  if (btn) btn.textContent = '⏸ Pause';
  timerInterval = setInterval(function() {
    if (timerSeconds > 0) {
      timerSeconds--;
      updateTimerDisplay();
      if (timerSeconds === 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        timerRunning = false;
        alert('⏰ Time is up!');
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
    if (btn) btn.textContent = '▶ Resume';
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
  if (btn) btn.textContent = '⏸ Pause';
  updateTimerDisplay();
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

// ================================================================
// 10. 결과 및 저장
// ================================================================
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

// ================================================================
// 11. 내보내기 (Export)
// ================================================================
export { 
    LANG,
    API_URL,
    STORAGE_KEY,
    TOTAL_QUESTIONS,
    QUESTIONS_PER_SET,
    masterQuestions,
    currentQuestions,
    userAnswers,
    currentIndex,
    correctCount,
    isReviewMode,
    originalQuestions,
    currentStartNumber,
    autoSaveInterval,
    chartInstances,
    DOM,
    escapeHtml,
    getAnswerLetter,
    getValidChoiceKeys,
    hasRealChoices,
    isSubjectiveQuestion,
    parseFunction,
    toPixelX,
    toPixelY,
    renderFunctionGraph,
    renderGraphic,
    renderSubjectiveQuestion,
    renderCurrentQuestion,
    showExplanation,
    formatTimer,
    updateTimerDisplay,
    startTimer,
    pauseTimer,
    resetTimer,
    goNext,
    goPrev,
    skipQuestion,
    submitSubjective,
    saveProgress,
    loadProgress,
    clearProgress,
    startAutoSave
};
