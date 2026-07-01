// ================================================================
// GRAPHICS ENGINE v3.0 - 전체 통합 파일
// ================================================================

// ================================================================
// BLOCK-00: CORE (공통 기반)
// ================================================================

// 00-config.js
var CONFIG = {
    COLORS: ['#3498db', '#e74c3c', '#27ae60', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#2c3e50', '#7f8c8d', '#16a085', '#d35400', '#c0392b'],
    CHART: { responsive: true, maintainAspectRatio: false, height: '400px' },
    GRID: { color: '#e0e0e0', lineWidth: 0.5 },
    PADDING: 50,
    VERSION: '3.0.0',
    ACTIVE_BLOCKS: {
        'BLOCK-00': true, 'BLOCK-01': true, 'BLOCK-02': true,
        'BLOCK-03': true, 'BLOCK-04': true, 'BLOCK-05': false,
        'BLOCK-06': true, 'BLOCK-07': false, 'BLOCK-08': true, 'BLOCK-09': true
    }
};
console.log('✅ BLOCK-00: Config loaded');

// 00-utils.js
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

function toPixelX(x, xMin, xMax, canvasWidth, padding) {
    padding = padding || CONFIG.PADDING;
    var plotW = canvasWidth - 2 * padding;
    return padding + ((x - xMin) / (xMax - xMin)) * plotW;
}

function toPixelY(y, yMin, yMax, canvasHeight, padding) {
    padding = padding || CONFIG.PADDING;
    var plotH = canvasHeight - 2 * padding;
    return padding + plotH - ((y - yMin) / (yMax - yMin)) * plotH;
}
console.log('✅ BLOCK-00: Utils loaded');

// 00-parser.js - ★ 슬래시 + 이중/삼중 escape 처리
function safeParseJSON(data) {
    if (data === null || data === undefined) return null;
    if (typeof data === 'object') return data;
    var str = String(data);
    if (str.trim() === '') return null;
    if (str === 'null' || str === 'undefined') return null;
    
    // 일반 파싱 시도
    try { return JSON.parse(str); } catch(e) {}
    
    // 이중/삼중 escape 처리
    var cleaned = str;
    for (var i = 0; i < 5; i++) {
        try {
            cleaned = cleaned.replace(/\\"/g, '"');
            cleaned = cleaned.replace(/\\\\/g, '\\');
            if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
                cleaned = cleaned.slice(1, -1);
            }
            if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
                cleaned = cleaned.slice(1, -1);
            }
            var result = JSON.parse(cleaned);
            if (typeof result === 'string') { cleaned = result; continue; }
            return result;
        } catch(e) {}
    }
    
    // ★ 슬래시(/) 특수 처리
    try {
        var fixed = str;
        fixed = fixed.replace(/\\\//g, '/');
        fixed = fixed.replace(/\\\\/g, '\\');
        fixed = fixed.replace(/\\"/g, '"');
        if (fixed.startsWith('"') && fixed.endsWith('"')) {
            fixed = fixed.slice(1, -1);
        }
        if (fixed.startsWith("'") && fixed.endsWith("'")) {
            fixed = fixed.slice(1, -1);
        }
        return JSON.parse(fixed);
    } catch(e) {}
    
    // 마지막 시도
    try {
        var manual = str;
        manual = manual.replace(/'/g, '"');
        manual = manual.replace(/\\/g, '');
        manual = manual.replace(/""/g, '"');
        if (manual.startsWith('"') && manual.endsWith('"')) {
            manual = manual.slice(1, -1);
        }
        return JSON.parse(manual);
    } catch(e) {
        console.warn('⚠️ safeParseJSON: All parsing attempts failed');
        return null;
    }
}

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
        .replace(/euler/g, 'Math.E')
        .replace(/\[S\]/g, 'S')
        .replace(/\[s\]/g, 'S');
    try {
        return new Function('x', 'return ' + expr + ';');
    } catch(e) {
        console.warn('⚠️ parseFunction error:', e.message);
        return function(x) { return 0; };
    }
}
console.log('✅ BLOCK-00: Parser loaded');

// 00-chart-loader.js
var chartInstances = {};

function getChartInstance(chartId) { return chartInstances[chartId] || null; }

function destroyChart(chartId) {
    if (chartInstances[chartId]) {
        chartInstances[chartId].destroy();
        delete chartInstances[chartId];
        return true;
    }
    return false;
}

function createChart(chartId, config) {
    var canvas = document.getElementById(chartId);
    if (!canvas) { console.warn('⚠️ Canvas not found:', chartId); return null; }
    if (typeof Chart === 'undefined') { console.warn('⚠️ Chart.js not loaded'); return null; }
    destroyChart(chartId);
    try {
        var instance = new Chart(canvas, config);
        chartInstances[chartId] = instance;
        return instance;
    } catch(e) {
        console.warn('⚠️ Chart creation failed:', e.message);
        return null;
    }
}

function renderWithDelay(chartId, renderFn, delay) {
    delay = delay || 150;
    setTimeout(function() {
        try { renderFn(); } catch(e) { console.warn('⚠️ Render failed:', e.message); }
    }, delay);
}
console.log('✅ BLOCK-00: Chart loader loaded');

// 00-registry.js
var GRAPHIC_REGISTRY = {};

function registerRenderer(type, renderFn) {
    GRAPHIC_REGISTRY[type] = renderFn;
    console.log('✅ Registered renderer:', type);
}

function getRenderer(type) { return GRAPHIC_REGISTRY[type] || null; }

function isTypeSupported(type) { return type in GRAPHIC_REGISTRY; }

function getSupportedTypes() { return Object.keys(GRAPHIC_REGISTRY); }
console.log('✅ BLOCK-00: Registry loaded');


// ================================================================
// BLOCK-01: BASIC CHARTS
// ================================================================

// 01-table.js
function renderTable(parsed) {
    if (!parsed.headers || !parsed.rows) return '<div style="padding:10px;color:#999;">No data</div>';
    var h = '<div style="margin:15px 0;overflow-x:auto;background:white;border-radius:8px;border:1px solid #ddd;"><table style="width:100%;border-collapse:collapse;text-align:center;font-size:14px;">';
    h += '<thead><tr style="background:#3498db;color:white;">';
    for (var hi = 0; hi < parsed.headers.length; hi++) {
        h += '<th style="padding:10px 14px;border:1px solid #2980b9;font-weight:bold;">' + escapeHtml(parsed.headers[hi]) + '</th>';
    }
    h += '</tr></thead><tbody>';
    for (var ri = 0; ri < parsed.rows.length; ri++) {
        var row = parsed.rows[ri];
        h += '<tr style="background:' + (ri%2===0?'#fff':'#f8f9fa') + ';">';
        for (var ci = 0; ci < row.length; ci++) {
            h += '<td style="padding:8px 14px;border:1px solid #ddd;">' + escapeHtml(row[ci]) + '</td>';
        }
        h += '</tr>';
    }
    h += '</tbody></table>';
    if (parsed.title) h += '<div style="text-align:center;padding:8px;font-weight:bold;color:#555;background:#f8f9fa;border-radius:0 0 8px 8px;">' + escapeHtml(parsed.title) + '</div>';
    h += '</div>';
    return h;
}
registerRenderer('table', renderTable);
registerRenderer('frequency-table', renderTable);

// 01-scatter-only.js ★ SAT 단골
function renderScatterOnly(parsed) {
    if (!parsed.points || parsed.points.length === 0) {
        return '<div style="padding:10px;color:#999;">No points data</div>';
    }
    var chartId = 'chart_' + Math.random().toString(36).substr(2, 9);
    var html = '<div class="graphic-box"><h3>' + (parsed.title || 'Scatter Plot') + ' <span class="tag">scatter-only</span></h3><canvas id="' + chartId + '"></canvas></div>';
    
    function renderFn() {
        var normalizedPoints = parsed.points.map(function(p) {
            if (Array.isArray(p)) return { x: p[0], y: p[1] };
            return p;
        });
        var config = {
            type: 'scatter',
            data: { datasets: [{
                label: parsed.label || 'Data',
                data: normalizedPoints,
                showLine: false,
                backgroundColor: parsed.color || '#e74c3c',
                pointRadius: parsed.pointSize || 6,
                pointBackgroundColor: parsed.color || '#e74c3c'
            }]},
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: parsed.title || parsed.question || 'Scatter Plot', font: { size: 16, weight: 'bold' } } },
                scales: {
                    x: { type: 'linear', title: { display: true, text: parsed.xLabel || (parsed.xAxis && parsed.xAxis.label) || 'X' }, grid: { color: CONFIG.GRID.color },
                        min: parsed.xAxis && parsed.xAxis.min !== undefined ? parsed.xAxis.min : undefined,
                        max: parsed.xAxis && parsed.xAxis.max !== undefined ? parsed.xAxis.max : undefined },
                    y: { type: 'linear', title: { display: true, text: parsed.yLabel || (parsed.yAxis && parsed.yAxis.label) || 'Y' }, grid: { color: CONFIG.GRID.color },
                        min: parsed.yAxis && parsed.yAxis.min !== undefined ? parsed.yAxis.min : undefined,
                        max: parsed.yAxis && parsed.yAxis.max !== undefined ? parsed.yAxis.max : undefined }
                }
            }
        };
        createChart(chartId, config);
    }
    renderWithDelay(chartId, renderFn, 150);
    return html;
}
registerRenderer('scatter-only', renderScatterOnly);
registerRenderer('scatter', renderScatterOnly);

// 01-bar.js
function renderBar(parsed) {
    var labels = [], datasets = [], chartTitle = parsed.title || 'Bar Chart';
    var xLabel = (parsed.xAxis && parsed.xAxis.label) || '';
    var yLabel = (parsed.yAxis && parsed.yAxis.label) || '';
    var isStacked = (parsed.type === 'stacked-bar');
    
    function normalizeArray(arr) {
        if (typeof arr === 'string') {
            try { return JSON.parse(arr); } catch(e) { return arr.split(',').map(function(v) { return v.trim(); }); }
        }
        if (!Array.isArray(arr)) return [];
        return arr;
    }
    
    if (parsed.labels && parsed.values) {
        labels = normalizeArray(parsed.labels);
        var values = parsed.values;
        if (typeof values === 'string') {
            try { values = JSON.parse(values); } catch(e) { values = values.split(',').map(function(v) { return parseFloat(v.trim()); }); }
        }
        if (!Array.isArray(values)) values = [];
        datasets = [{ label: parsed.label || 'Data', data: values, backgroundColor: parsed.color || '#3498db80', borderColor: parsed.stroke || '#3498db', borderWidth: 2 }];
    } else if (parsed.series) {
        var series = normalizeArray(parsed.series);
        labels = normalizeArray(parsed.categories || (parsed.xAxis && parsed.xAxis.ticks) || []);
        for (var si = 0; si < series.length; si++) {
            var s = series[si];
            var vals = s.values || [];
            if (typeof vals === 'string') {
                try { vals = JSON.parse(vals); } catch(e) { vals = vals.split(',').map(function(v) { return parseFloat(v.trim()); }); }
            }
            if (!Array.isArray(vals)) vals = [];
            datasets.push({ label: s.name || 'Series ' + (si+1), data: vals, backgroundColor: CONFIG.COLORS[si % CONFIG.COLORS.length] + '80', borderColor: CONFIG.COLORS[si % CONFIG.COLORS.length], borderWidth: 2 });
        }
    }
    if (datasets.length === 0) return '<div style="padding:10px;color:#999;">No data</div>';
    
    var chartId = 'chart_' + Math.random().toString(36).substr(2, 9);
    var html = '<div class="graphic-box"><h3>' + chartTitle + ' <span class="tag">bar</span></h3><canvas id="' + chartId + '"></canvas></div>';
    
    function renderFn() {
        var config = {
            type: 'bar',
            data: { labels: labels, datasets: datasets },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: chartTitle, font: { size: 16, weight: 'bold' } }, legend: { position: 'bottom' } },
                scales: {
                    x: { title: { display: true, text: xLabel }, grid: { color: CONFIG.GRID.color }, stacked: isStacked },
                    y: { beginAtZero: true, title: { display: true, text: yLabel }, grid: { color: CONFIG.GRID.color }, stacked: isStacked }
                }
            }
        };
        createChart(chartId, config);
    }
    renderWithDelay(chartId, renderFn, 150);
    return html;
}
registerRenderer('bar', renderBar);
registerRenderer('stacked-bar', renderBar);
registerRenderer('histogram', renderBar);

// 01-pie.js
function renderPie(parsed) {
    if (!parsed.labels || !parsed.values) return '<div style="padding:10px;color:#999;">No data</div>';
    var chartId = 'chart_' + Math.random().toString(36).substr(2, 9);
    var isDoughnut = (parsed.type === 'doughnut');
    var html = '<div class="graphic-box"><h3>' + (parsed.title || (isDoughnut ? 'Doughnut Chart' : 'Pie Chart')) + ' <span class="tag">' + parsed.type + '</span></h3><canvas id="' + chartId + '"></canvas></div>';
    
    function renderFn() {
        var config = {
            type: isDoughnut ? 'doughnut' : 'pie',
            data: { labels: parsed.labels, datasets: [{ data: parsed.values, backgroundColor: parsed.colors || CONFIG.COLORS, borderWidth: 2 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: parsed.title || (isDoughnut ? 'Doughnut Chart' : 'Pie Chart'), font: { size: 16, weight: 'bold' } }, legend: { position: 'bottom' } },
                cutout: isDoughnut ? (parsed.cutout || '50%') : '0%'
            }
        };
        createChart(chartId, config);
    }
    renderWithDelay(chartId, renderFn, 150);
    return html;
}
registerRenderer('pie', renderPie);
registerRenderer('doughnut', renderPie);
registerRenderer('gauge', renderPie);

// 01-line.js
function renderLine(parsed) {
    if (!parsed.series) return '<div style="padding:10px;color:#999;">No series data</div>';
    var chartId = 'chart_' + Math.random().toString(36).substr(2, 9);
    var html = '<div class="graphic-box"><h3>' + (parsed.title || 'Line Chart') + ' <span class="tag">line</span></h3><canvas id="' + chartId + '"></canvas></div>';
    
    function renderFn() {
        var ds = [];
        for (var li = 0; li < parsed.series.length; li++) {
            var s = parsed.series[li];
            var points = [];
            if (Array.isArray(s.points)) {
                points = s.points;
            } else if (typeof s.points === 'string') {
                try { points = JSON.parse(s.points); } catch(e) { points = []; }
            } else if (Array.isArray(s.data)) {
                for (var di = 0; di < s.data.length; di++) {
                    points.push({ x: (parsed.xAxis && parsed.xAxis.categories && parsed.xAxis.categories[di]) || di, y: s.data[di] });
                }
            }
            ds.push({
                label: s.name || ('Series ' + (li + 1)),
                data: points,
                showLine: true,
                borderColor: s.color || CONFIG.COLORS[li % CONFIG.COLORS.length],
                backgroundColor: (s.color || CONFIG.COLORS[li % CONFIG.COLORS.length]) + '20',
                borderWidth: s.lineWidth || 2,
                pointRadius: s.pointSize || 4,
                tension: s.tension || 0.3,
                fill: s.fill || false
            });
        }
        var config = {
            type: 'scatter',
            data: { datasets: ds },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: parsed.title || 'Line Chart', font: { size: 16, weight: 'bold' } }, legend: { position: 'bottom' } },
                scales: {
                    x: { type: 'linear', title: { display: true, text: (parsed.xAxis && (parsed.xAxis.title || parsed.xAxis.label)) || 'X' }, grid: { color: CONFIG.GRID.color } },
                    y: { title: { display: true, text: (parsed.yAxis && (parsed.yAxis.title || parsed.yAxis.label)) || 'Y' }, grid: { color: CONFIG.GRID.color } }
                }
            }
        };
        createChart(chartId, config);
    }
    renderWithDelay(chartId, renderFn, 150);
    return html;
}
registerRenderer('line', renderLine);

// 01-radar.js
function renderRadar(parsed) {
    if (!parsed.labels || !parsed.datasets) return '<div style="padding:10px;color:#999;">No data</div>';
    var chartId = 'chart_' + Math.random().toString(36).substr(2, 9);
    var html = '<div class="graphic-box"><h3>' + (parsed.title || 'Radar Chart') + ' <span class="tag">radar</span></h3><canvas id="' + chartId + '"></canvas></div>';
    
    function renderFn() {
        var ds = [];
        for (var rdi = 0; rdi < parsed.datasets.length; rdi++) {
            var d = parsed.datasets[rdi];
            var values = d.values || [];
            if (typeof values === 'string') {
                try { values = JSON.parse(values); } catch(e) { values = values.split(',').map(function(v) { return parseFloat(v.trim()); }); }
            }
            ds.push({ label: d.label || 'Series ' + (rdi+1), data: values, borderColor: d.color || CONFIG.COLORS[rdi % CONFIG.COLORS.length], backgroundColor: (d.color || CONFIG.COLORS[rdi % CONFIG.COLORS.length]) + '20', borderWidth: 2, pointRadius: 4 });
        }
        var config = {
            type: 'radar',
            data: { labels: parsed.labels, datasets: ds },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: parsed.title || 'Radar Chart', font: { size: 16, weight: 'bold' } } },
                scales: { r: { beginAtZero: true, grid: { color: CONFIG.GRID.color } } }
            }
        };
        createChart(chartId, config);
    }
    renderWithDelay(chartId, renderFn, 150);
    return html;
}
registerRenderer('radar', renderRadar);


// ================================================================
// BLOCK-02: COORDINATE & GEOMETRY
// ================================================================

// 02-coordinate-plane.js
function renderCoordinatePlane(parsed) {
    var chartId = 'chart_' + Math.random().toString(36).substr(2, 9);
    var html = '<div class="graphic-box"><h3>' + (parsed.title || 'Coordinate Plane') + ' <span class="tag">coordinate-plane</span></h3><canvas id="' + chartId + '"></canvas></div>';
    
    function renderFn() {
        var canvas = document.getElementById(chartId);
        if (!canvas) return;
        var W = canvas.width, H = canvas.height, pad = CONFIG.PADDING;
        var ctx = canvas.getContext('2d');
        
        var xMin = (parsed.xAxis && parsed.xAxis.min !== undefined) ? parsed.xAxis.min : -10;
        var xMax = (parsed.xAxis && parsed.xAxis.max !== undefined) ? parsed.xAxis.max : 10;
        var yMin = (parsed.yAxis && parsed.yAxis.min !== undefined) ? parsed.yAxis.min : -10;
        var yMax = (parsed.yAxis && parsed.yAxis.max !== undefined) ? parsed.yAxis.max : 10;
        var xLabel = (parsed.xAxis && parsed.xAxis.label) || 'x';
        var yLabel = (parsed.yAxis && parsed.yAxis.label) || 'y';
        
        // 그리드
        ctx.save();
        ctx.strokeStyle = CONFIG.GRID.color;
        ctx.lineWidth = CONFIG.GRID.lineWidth;
        var tickX = (parsed.xAxis && parsed.xAxis.tick) || 1;
        var tickY = (parsed.yAxis && parsed.yAxis.tick) || 1;
        
        for (var x = Math.ceil(xMin / tickX) * tickX; x <= xMax; x += tickX) {
            var px = toPixelX(x, xMin, xMax, W, pad);
            ctx.beginPath(); ctx.moveTo(px, pad); ctx.lineTo(px, H - pad); ctx.stroke();
            ctx.fillStyle = '#333'; ctx.font = '11px Arial'; ctx.textAlign = 'center';
            ctx.fillText(x, px, H - pad + 16);
        }
        for (var y = Math.ceil(yMin / tickY) * tickY; y <= yMax; y += tickY) {
            var py = toPixelY(y, yMin, yMax, H, pad);
            ctx.beginPath(); ctx.moveTo(pad, py); ctx.lineTo(W - pad, py); ctx.stroke();
            ctx.fillStyle = '#333'; ctx.font = '11px Arial'; ctx.textAlign = 'right';
            ctx.fillText(y, pad - 8, py + 4);
        }
        ctx.fillStyle = '#333'; ctx.font = '13px Arial bold'; ctx.textAlign = 'center';
        ctx.fillText(xLabel, W / 2, H - 6);
        ctx.textAlign = 'center'; ctx.fillText(yLabel, 20, pad - 10);
        ctx.restore();
        
        var datasets = [];
        
        // Points
        if (parsed.points && parsed.points.length > 0) {
            var pts = parsed.points.map(function(p) { if (Array.isArray(p)) return { x: p[0], y: p[1] }; return p; });
            datasets.push({ label: 'Points', data: pts, showLine: false, backgroundColor: '#e74c3c', pointRadius: 6, pointBackgroundColor: '#e74c3c', pointBorderColor: 'white', pointBorderWidth: 2 });
        }
        
        // Segments
        if (parsed.segments && parsed.segments.length > 0) {
            for (var si = 0; si < parsed.segments.length; si++) {
                var seg = parsed.segments[si];
                datasets.push({ label: seg.label || 'Segment ' + (si+1), data: [{ x: seg.from[0], y: seg.from[1] }, { x: seg.to[0], y: seg.to[1] }], showLine: true, borderColor: seg.color || '#2c3e50', borderWidth: seg.lineWidth || 2, pointRadius: 0, fill: false });
            }
        }
        
        // Lines (y = mx + b)
        if (parsed.lines) {
            for (var li = 0; li < parsed.lines.length; li++) {
                var line = parsed.lines[li];
                datasets.push({ label: line.label || 'Line ' + (li+1), data: [{ x: xMin, y: line.slope * xMin + line.intercept }, { x: xMax, y: line.slope * xMax + line.intercept }], showLine: true, borderColor: line.color || CONFIG.COLORS[li % CONFIG.COLORS.length], borderWidth: line.lineWidth || 2, pointRadius: 0, fill: false });
            }
        }
        
        // ★ Functions (슬래시 지원)
        if (parsed.functions) {
            for (var fi = 0; fi < parsed.functions.length; fi++) {
                var fn = parsed.functions[fi];
                var fnPoints = [];
                var domain = fn.domain || [xMin, xMax];
                var step = (domain[1] - domain[0]) / 200;
                var eqFn = parseFunction(fn.equation);
                for (var x2 = domain[0]; x2 <= domain[1]; x2 += step) {
                    try { var y2 = eqFn(x2); if (isFinite(y2) && Math.abs(y2) < 100) fnPoints.push({ x: x2, y: y2 }); } catch(e) {}
                }
                if (fnPoints.length > 1) {
                    datasets.push({ label: fn.equation || 'f(x)', data: fnPoints, showLine: true, borderColor: fn.color || '#e74c3c', borderWidth: fn.lineWidth || 3, pointRadius: 0, tension: 0.3, fill: false });
                }
            }
        }
        
        // ★ Polynomials
        if (parsed.polynomials) {
            for (var pi = 0; pi < parsed.polynomials.length; pi++) {
                var poly = parsed.polynomials[pi];
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
                    try { var y3 = eqFn2(x3); if (isFinite(y3) && Math.abs(y3) < 100) fnPoints2.push({ x: x3, y: y3 }); } catch(e) {}
                }
                if (fnPoints2.length > 1) {
                    datasets.push({ label: poly.label || 'Polynomial', data: fnPoints2, showLine: true, borderColor: poly.color || '#9b59b6', borderWidth: poly.lineWidth || 3, pointRadius: 0, tension: 0.3, fill: false });
                }
            }
        }
        
        // ★ Piecewise
        if (parsed.piecewise) {
            for (var pwi = 0; pwi < parsed.piecewise.length; pwi++) {
                var piece = parsed.piecewise[pwi];
                var fnPoints3 = [];
                var domain3 = piece.domain || [xMin, xMax];
                var step3 = (domain3[1] - domain3[0]) / 200;
                var eqFn3 = parseFunction(piece.equation);
                for (var x4 = domain3[0]; x4 <= domain3[1]; x4 += step3) {
                    try { var y4 = eqFn3(x4); if (isFinite(y4) && Math.abs(y4) < 100) fnPoints3.push({ x: x4, y: y4 }); } catch(e) {}
                }
                if (fnPoints3.length > 1) {
                    datasets.push({ label: piece.label || piece.equation || 'Piecewise', data: fnPoints3, showLine: true, borderColor: piece.color || '#27ae60', borderWidth: piece.lineWidth || 2.5, pointRadius: 0, tension: 0.1, fill: false });
                }
            }
        }
        
        // ★ Absolute
        if (parsed.absolute) {
            var absEq = 'Math.abs(' + parsed.absolute.equation + ')';
            var fnPoints4 = [];
            var domain4 = parsed.absolute.domain || [xMin, xMax];
            var step4 = (domain4[1] - domain4[0]) / 200;
            var eqFn4 = parseFunction(absEq);
            for (var x5 = domain4[0]; x5 <= domain4[1]; x5 += step4) {
                try { var y5 = eqFn4(x5); if (isFinite(y5) && Math.abs(y5) < 100) fnPoints4.push({ x: x5, y: y5 }); } catch(e) {}
            }
            if (fnPoints4.length > 1) {
                datasets.push({ label: '|' + parsed.absolute.equation + '|', data: fnPoints4, showLine: true, borderColor: parsed.absolute.color || '#f39c12', borderWidth: parsed.absolute.lineWidth || 3, pointRadius: 0, tension: 0.3, fill: false });
            }
        }
        
        // ★ System (연립방정식)
        if (parsed.system && parsed.system.equations) {
            for (var syi = 0; syi < parsed.system.equations.length; syi++) {
                var sysEq = parsed.system.equations[syi];
                var sysPoints = [];
                var sysDomain = parsed.system.domain || [xMin, xMax];
                var sysStep = (sysDomain[1] - sysDomain[0]) / 200;
                var sysFn = parseFunction(sysEq.equation);
                for (var x6 = sysDomain[0]; x6 <= sysDomain[1]; x6 += sysStep) {
                    try { var y6 = sysFn(x6); if (isFinite(y6) && Math.abs(y6) < 100) sysPoints.push({ x: x6, y: y6 }); } catch(e) {}
                }
                if (sysPoints.length > 1) {
                    datasets.push({ label: sysEq.label || sysEq.equation, data: sysPoints, showLine: true, borderColor: sysEq.color || CONFIG.COLORS[syi % CONFIG.COLORS.length], borderWidth: sysEq.lineWidth || 2.5, pointRadius: 0, tension: 0.3, fill: false });
                }
            }
        }
        
        if (datasets.length === 0) return;
        
        var config = {
            type: 'scatter',
            data: { datasets: datasets },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: parsed.title || 'Coordinate Plane', font: { size: 16, weight: 'bold' } }, legend: { position: 'bottom' } },
                scales: {
                    x: { type: 'linear', title: { display: true, text: xLabel }, grid: { color: CONFIG.GRID.color }, min: xMin, max: xMax },
                    y: { type: 'linear', title: { display: true, text: yLabel }, grid: { color: CONFIG.GRID.color }, min: yMin, max: yMax }
                }
            }
        };
        createChart(chartId, config);
    }
    renderWithDelay(chartId, renderFn, 150);
    return html;
}
registerRenderer('coordinate-plane', renderCoordinatePlane);

// 02-shape.js
function renderShape(parsed) {
    if (!parsed.points || parsed.points.length === 0) {
        return '<div style="padding:10px;color:#999;">No points data</div>';
    }
    var chartId = 'chart_' + Math.random().toString(36).substr(2, 9);
    var html = '<div class="graphic-box"><h3>' + (parsed.question || parsed.title || 'Shape') + ' <span class="tag">shape</span></h3><canvas id="' + chartId + '"></canvas></div>';
    
    function renderFn() {
        var pts = parsed.points.slice();
        if (pts.length > 0) { pts.push({ x: parsed.points[0].x, y: parsed.points[0].y }); }
        var config = {
            type: 'scatter',
            data: { datasets: [{
                label: parsed.label || 'Shape',
                data: pts,
                showLine: true,
                borderColor: parsed.stroke || '#2c3e50',
                backgroundColor: parsed.fill || 'rgba(52,152,219,0.15)',
                borderWidth: parsed.lineWidth || 2,
                pointRadius: parsed.pointSize || 4,
                pointBackgroundColor: parsed.stroke || '#2c3e50',
                fill: true,
                tension: 0
            }]},
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: parsed.question || parsed.title || 'Shape', font: { size: 16, weight: 'bold' } }, legend: { position: 'bottom' } },
                scales: { x: { type: 'linear', title: { display: true, text: 'X' }, grid: { color: CONFIG.GRID.color } }, y: { type: 'linear', title: { display: true, text: 'Y' }, grid: { color: CONFIG.GRID.color } } }
            }
        };
        createChart(chartId, config);
    }
    renderWithDelay(chartId, renderFn, 150);
    return html;
}
registerRenderer('shape', renderShape);
registerRenderer('shape-polygon', renderShape);
registerRenderer('shape-circle', renderShape);
registerRenderer('shape-ellipse', renderShape);
registerRenderer('shape-triangle', renderShape);

// 02-dot-plot.js
function renderDotPlot(parsed) {
    if (!parsed.series) return '<div style="padding:10px;color:#999;">No series data</div>';
    var chartId = 'chart_' + Math.random().toString(36).substr(2, 9);
    var html = '<div class="graphic-box"><h3>' + (parsed.title || 'Dot Plot') + ' <span class="tag">dot-plot</span></h3><canvas id="' + chartId + '"></canvas></div>';
    
    function renderFn() {
        var ds = [];
        for (var dpi = 0; dpi < parsed.series.length; dpi++) {
            var sp = parsed.series[dpi];
            ds.push({ label: sp.name || 'Series ' + (dpi+1), data: sp.data, showLine: false, backgroundColor: CONFIG.COLORS[dpi % CONFIG.COLORS.length], pointRadius: 8, pointBackgroundColor: CONFIG.COLORS[dpi % CONFIG.COLORS.length] + '80', pointBorderColor: CONFIG.COLORS[dpi % CONFIG.COLORS.length], pointBorderWidth: 2 });
        }
        var config = {
            type: 'scatter',
            data: { datasets: ds },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: parsed.title || 'Dot Plot', font: { size: 16, weight: 'bold' } }, legend: { position: 'bottom' } },
                scales: {
                    x: { type: 'linear', title: { display: true, text: (parsed.xAxis && parsed.xAxis.label) || 'Value' }, grid: { color: CONFIG.GRID.color } },
                    y: { title: { display: true, text: 'Frequency' }, grid: { color: CONFIG.GRID.color }, min: 0, ticks: { stepSize: 1, precision: 0 } }
                }
            }
        };
        createChart(chartId, config);
    }
    renderWithDelay(chartId, renderFn, 150);
    return html;
}
registerRenderer('dot-plot', renderDotPlot);


// ================================================================
// BLOCK-03: STATISTICS
// ================================================================

// 03-box-plot.js
function renderBoxPlot(parsed) {
    if (!parsed.boxes) return '<div style="padding:10px;color:#999;">No boxes data</div>';
    var chartId = 'chart_' + Math.random().toString(36).substr(2, 9);
    var html = '<div class="graphic-box"><h3>' + (parsed.title || 'Box Plot') + ' <span class="tag">box-plot</span></h3><canvas id="' + chartId + '"></canvas></div>';
    
    function renderFn() {
        var canvas = document.getElementById(chartId);
        if (!canvas) return;
        var W = canvas.width, H = canvas.height, pad = 60;
        var ctx = canvas.getContext('2d');
        var yMin = (parsed.yAxis && parsed.yAxis.min !== undefined) ? parsed.yAxis.min : 0;
        var yMax = (parsed.yAxis && parsed.yAxis.max !== undefined) ? parsed.yAxis.max : 100;
        
        function toPX2(x) { return pad + ((x - 0.5) / (parsed.boxes.length + 0.5)) * (W - 2 * pad); }
        function toPY2(y) { return pad + (H - 2 * pad) - ((y - yMin) / (yMax - yMin)) * (H - 2 * pad); }
        
        ctx.save();
        for (var bxi = 0; bxi < parsed.boxes.length; bxi++) {
            var box = parsed.boxes[bxi];
            var color = box.color || CONFIG.COLORS[bxi % CONFIG.COLORS.length];
            var x = bxi + 1;
            var px = toPX2(x);
            var pyMin = toPY2(box.min), pyQ1 = toPY2(box.q1), pyMedian = toPY2(box.median), pyQ3 = toPY2(box.q3), pyMax = toPY2(box.max);
            var boxWidth = 30;
            
            ctx.strokeStyle = color; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(px, pyMin); ctx.lineTo(px, pyQ1); ctx.moveTo(px, pyQ3); ctx.lineTo(px, pyMax); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(px - 8, pyMin); ctx.lineTo(px + 8, pyMin); ctx.moveTo(px - 8, pyMax); ctx.lineTo(px + 8, pyMax); ctx.stroke();
            ctx.fillStyle = color + '30'; ctx.strokeStyle = color; ctx.lineWidth = 2;
            ctx.fillRect(px - boxWidth/2, pyQ3, boxWidth, pyQ1 - pyQ3);
            ctx.strokeRect(px - boxWidth/2, pyQ3, boxWidth, pyQ1 - pyQ3);
            ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(px - boxWidth/2, pyMedian); ctx.lineTo(px + boxWidth/2, pyMedian); ctx.stroke();
            ctx.fillStyle = '#2c3e50'; ctx.font = '12px Arial'; ctx.textAlign = 'center';
            ctx.fillText(box.label || 'Group ' + (bxi+1), px, toPY2(yMin) + 20);
            ctx.font = '10px Arial'; ctx.fillStyle = '#666'; ctx.textAlign = 'left';
            ctx.fillText('min:' + box.min, px + boxWidth/2 + 4, pyMin + 3);
            ctx.fillText('Q1:' + box.q1, px + boxWidth/2 + 4, pyQ1 + 3);
            ctx.fillText('med:' + box.median, px + boxWidth/2 + 4, pyMedian + 3);
            ctx.fillText('Q3:' + box.q3, px + boxWidth/2 + 4, pyQ3 + 3);
            ctx.fillText('max:' + box.max, px + boxWidth/2 + 4, pyMax + 3);
        }
        ctx.restore();
    }
    renderWithDelay(chartId, renderFn, 150);
    return html;
}
registerRenderer('box-plot', renderBoxPlot);

// 03-normal-distribution.js
function renderNormalDistribution(parsed) {
    var mean = parsed.mean || 0, std = parsed.std || 1;
    var domain = parsed.domain || [mean - 4 * std, mean + 4 * std];
    var points = [];
    var step = (domain[1] - domain[0]) / 200;
    for (var x = domain[0]; x <= domain[1]; x += step) {
        var y = (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / std, 2));
        points.push({ x: x, y: y });
    }
    var chartId = 'chart_' + Math.random().toString(36).substr(2, 9);
    var html = '<div class="graphic-box"><h3>' + (parsed.title || 'N(' + mean + ', ' + std + '²)') + ' <span class="tag">normal-distribution</span></h3><canvas id="' + chartId + '"></canvas></div>';
    
    function renderFn() {
        var color = parsed.color || '#3498db';
        var config = {
            type: 'scatter',
            data: { datasets: [{ label: 'N(' + mean + ', ' + std + '²)', data: points, showLine: true, borderColor: color, backgroundColor: color + '30', borderWidth: 3, pointRadius: 0, fill: true, tension: 0.3 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: parsed.title || 'N(' + mean + ', ' + std + '²)', font: { size: 16, weight: 'bold' } } },
                scales: { x: { type: 'linear', title: { display: true, text: 'x' }, grid: { color: CONFIG.GRID.color } }, y: { title: { display: true, text: 'f(x)' }, grid: { color: CONFIG.GRID.color }, min: 0 } }
            }
        };
        createChart(chartId, config);
    }
    renderWithDelay(chartId, renderFn, 150);
    return html;
}
registerRenderer('normal-distribution', renderNormalDistribution);

// 03-residual-plot.js
function renderResidualPlot(parsed) {
    if (!parsed.residuals) return '<div style="padding:10px;color:#999;">No residuals data</div>';
    var chartId = 'chart_' + Math.random().toString(36).substr(2, 9);
    var html = '<div class="graphic-box"><h3>' + (parsed.title || 'Residual Plot') + ' <span class="tag">residual-plot</span></h3><canvas id="' + chartId + '"></canvas></div>';
    
    function renderFn() {
        var canvas = document.getElementById(chartId);
        if (!canvas) return;
        var W = canvas.width, H = canvas.height, pad = 60;
        var ctx = canvas.getContext('2d');
        var residuals = parsed.residuals;
        var xMin = Math.min.apply(null, residuals.map(function(r) { return r.x; })) - 1;
        var xMax = Math.max.apply(null, residuals.map(function(r) { return r.x; })) + 1;
        var yMin = Math.min.apply(null, residuals.map(function(r) { return r.residual; })) - 1;
        var yMax = Math.max.apply(null, residuals.map(function(r) { return r.residual; })) + 1;
        
        function toPX3(x) { return pad + ((x - xMin) / (xMax - xMin)) * (W - 2 * pad); }
        function toPY3(y) { return pad + (H - 2 * pad) - ((y - yMin) / (yMax - yMin)) * (H - 2 * pad); }
        
        ctx.save();
        ctx.setLineDash([5, 5]); ctx.strokeStyle = '#95a5a6'; ctx.lineWidth = 1;
        ctx.beginPath(); var py0 = toPY3(0); ctx.moveTo(pad, py0); ctx.lineTo(W - pad, py0); ctx.stroke();
        var color = parsed.color || '#e74c3c';
        for (var ri = 0; ri < residuals.length; ri++) {
            var px = toPX3(residuals[ri].x), py = toPY3(residuals[ri].residual);
            ctx.beginPath(); ctx.arc(px, py, 5, 0, 2 * Math.PI); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = 'white'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.fillStyle = '#666'; ctx.font = '10px Arial'; ctx.textAlign = 'left';
            ctx.fillText(residuals[ri].residual.toFixed(2), px + 8, py + 3);
        }
        ctx.restore();
    }
    renderWithDelay(chartId, renderFn, 150);
    return html;
}
registerRenderer('residual-plot', renderResidualPlot);


// ================================================================
// BLOCK-04: AP CALCULUS (선택)
// ================================================================

// 04-slope-field.js
function renderSlopeField(parsed) {
    if (!parsed.equation) return '<div style="padding:10px;color:#999;">No equation provided</div>';
    var chartId = 'chart_' + Math.random().toString(36).substr(2, 9);
    var html = '<div class="graphic-box"><h3>' + (parsed.title || 'Slope Field: dy/dx = ' + parsed.equation) + ' <span class="tag">slope-field</span></h3><canvas id="' + chartId + '"></canvas></div>';
    
    function renderFn() {
        var canvas = document.getElementById(chartId);
        if (!canvas) return;
        var W = canvas.width, H = canvas.height, pad = CONFIG.PADDING;
        var ctx = canvas.getContext('2d');
        var xMin = (parsed.xAxis && parsed.xAxis.min !== undefined) ? parsed.xAxis.min : -5;
        var xMax = (parsed.xAxis && parsed.xAxis.max !== undefined) ? parsed.xAxis.max : 5;
        var yMin = (parsed.yAxis && parsed.yAxis.min !== undefined) ? parsed.yAxis.min : -5;
        var yMax = (parsed.yAxis && parsed.yAxis.max !== undefined) ? parsed.yAxis.max : 5;
        var step = parsed.step || 0.8;
        var fn = parseFunction(parsed.equation);
        
        // 그리드
        ctx.save();
        ctx.strokeStyle = CONFIG.GRID.color;
        ctx.lineWidth = CONFIG.GRID.lineWidth;
        var tickX = (parsed.xAxis && parsed.xAxis.tick) || 1;
        var tickY = (parsed.yAxis && parsed.yAxis.tick) || 1;
        for (var x = Math.ceil(xMin / tickX) * tickX; x <= xMax; x += tickX) {
            var px = toPixelX(x, xMin, xMax, W, pad);
            ctx.beginPath(); ctx.moveTo(px, pad); ctx.lineTo(px, H - pad); ctx.stroke();
            ctx.fillStyle = '#333'; ctx.font = '11px Arial'; ctx.textAlign = 'center';
            ctx.fillText(x, px, H - pad + 16);
        }
        for (var y = Math.ceil(yMin / tickY) * tickY; y <= yMax; y += tickY) {
            var py = toPixelY(y, yMin, yMax, H, pad);
            ctx.beginPath(); ctx.moveTo(pad, py); ctx.lineTo(W - pad, py); ctx.stroke();
            ctx.fillStyle = '#333'; ctx.font = '11px Arial'; ctx.textAlign = 'right';
            ctx.fillText(y, pad - 8, py + 4);
        }
        ctx.fillStyle = '#333'; ctx.font = '13px Arial bold'; ctx.textAlign = 'center';
        ctx.fillText((parsed.xAxis && parsed.xAxis.label) || 'x', W / 2, H - 6);
        ctx.textAlign = 'center'; ctx.fillText((parsed.yAxis && parsed.yAxis.label) || 'y', 20, pad - 10);
        ctx.restore();
        
        // 기울기 장
        ctx.save();
        var color = parsed.color || '#2c3e50';
        for (var x2 = xMin; x2 <= xMax; x2 += step) {
            for (var y2 = yMin; y2 <= yMax; y2 += step) {
                try {
                    var slope = fn(x2, y2);
                    if (!isFinite(slope)) continue;
                    var angle = Math.atan(slope);
                    var len = step * 0.4;
                    var dx = len * Math.cos(angle);
                    var dy = len * Math.sin(angle);
                    var px1 = toPixelX(x2 - dx/2, xMin, xMax, W, pad);
                    var py1 = toPixelY(y2 - dy/2, yMin, yMax, H, pad);
                    var px2 = toPixelX(x2 + dx/2, xMin, xMax, W, pad);
                    var py2 = toPixelY(y2 + dy/2, yMin, yMax, H, pad);
                    ctx.beginPath(); ctx.moveTo(px1, py1); ctx.lineTo(px2, py2);
                    ctx.strokeStyle = color; ctx.lineWidth = 1.2; ctx.stroke();
                } catch(e) {}
            }
        }
        ctx.restore();
    }
    renderWithDelay(chartId, renderFn, 150);
    return html;
}
registerRenderer('slope-field', renderSlopeField);

// 04-parametric-curve.js
function renderParametricCurve(parsed) {
    if (!parsed.xEq || !parsed.yEq) return '<div style="padding:10px;color:#999;">No parametric equations provided</div>';
    var chartId = 'chart_' + Math.random().toString(36).substr(2, 9);
    var html = '<div class="graphic-box"><h3>' + (parsed.title || 'Parametric Curve') + ' <span class="tag">parametric-curve</span></h3><canvas id="' + chartId + '"></canvas></div>';
    
    function renderFn() {
        var canvas = document.getElementById(chartId);
        if (!canvas) return;
        var W = canvas.width, H = canvas.height, pad = CONFIG.PADDING;
        var ctx = canvas.getContext('2d');
        var xMin = (parsed.xAxis && parsed.xAxis.min !== undefined) ? parsed.xAxis.min : -5;
        var xMax = (parsed.xAxis && parsed.xAxis.max !== undefined) ? parsed.xAxis.max : 5;
        var yMin = (parsed.yAxis && parsed.yAxis.min !== undefined) ? parsed.yAxis.min : -5;
        var yMax = (parsed.yAxis && parsed.yAxis.max !== undefined) ? parsed.yAxis.max : 5;
        var domain = parsed.domain || [0, 2 * Math.PI];
        var step = (domain[1] - domain[0]) / 200;
        var fnX = parseFunction(parsed.xEq);
        var fnY = parseFunction(parsed.yEq);
        var points = [];
        for (var t = domain[0]; t <= domain[1]; t += step) {
            try { var x = fnX(t); var y = fnY(t); if (isFinite(x) && isFinite(y) && Math.abs(x) < 100 && Math.abs(y) < 100) points.push({ x: x, y: y }); } catch(e) {}
        }
        
        // 그리드
        ctx.save();
        ctx.strokeStyle = CONFIG.GRID.color;
        ctx.lineWidth = CONFIG.GRID.lineWidth;
        var tickX = (parsed.xAxis && parsed.xAxis.tick) || 1;
        var tickY = (parsed.yAxis && parsed.yAxis.tick) || 1;
        for (var x = Math.ceil(xMin / tickX) * tickX; x <= xMax; x += tickX) {
            var px = toPixelX(x, xMin, xMax, W, pad);
            ctx.beginPath(); ctx.moveTo(px, pad); ctx.lineTo(px, H - pad); ctx.stroke();
            ctx.fillStyle = '#333'; ctx.font = '11px Arial'; ctx.textAlign = 'center';
            ctx.fillText(x, px, H - pad + 16);
        }
        for (var y = Math.ceil(yMin / tickY) * tickY; y <= yMax; y += tickY) {
            var py = toPixelY(y, yMin, yMax, H, pad);
            ctx.beginPath(); ctx.moveTo(pad, py); ctx.lineTo(W - pad, py); ctx.stroke();
            ctx.fillStyle = '#333'; ctx.font = '11px Arial'; ctx.textAlign = 'right';
            ctx.fillText(y, pad - 8, py + 4);
        }
        ctx.fillStyle = '#333'; ctx.font = '13px Arial bold'; ctx.textAlign = 'center';
        ctx.fillText((parsed.xAxis && parsed.xAxis.label) || 'x', W / 2, H - 6);
        ctx.textAlign = 'center'; ctx.fillText((parsed.yAxis && parsed.yAxis.label) || 'y', 20, pad - 10);
        ctx.restore();
        
        // 곡선
        var color = parsed.color || '#e67e22';
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = parsed.lineWidth || 2.5;
        ctx.beginPath();
        for (var i = 0; i < points.length; i++) {
            var px = toPixelX(points[i].x, xMin, xMax, W, pad);
            var py = toPixelY(points[i].y, yMin, yMax, H, pad);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
        
        // 방향 화살표
        if (points.length > 10) {
            var mid = Math.floor(points.length / 2);
            var p1 = points[mid], p2 = points[mid + 5];
            if (p1 && p2) {
                var px1 = toPixelX(p1.x, xMin, xMax, W, pad);
                var py1 = toPixelY(p1.y, yMin, yMax, H, pad);
                var px2 = toPixelX(p2.x, xMin, xMax, W, pad);
                var py2 = toPixelY(p2.y, yMin, yMax, H, pad);
                var angle = Math.atan2(py2 - py1, px2 - px1);
                ctx.save(); ctx.fillStyle = color;
                ctx.beginPath();
                var arrLen = 10;
                ctx.moveTo(px2, py2);
                ctx.lineTo(px2 - arrLen * Math.cos(angle - 0.5), py2 - arrLen * Math.sin(angle - 0.5));
                ctx.lineTo(px2 - arrLen * Math.cos(angle + 0.5), py2 - arrLen * Math.sin(angle + 0.5));
                ctx.closePath(); ctx.fill(); ctx.restore();
            }
        }
    }
    renderWithDelay(chartId, renderFn, 150);
    return html;
}
registerRenderer('parametric-curve', renderParametricCurve);


// ================================================================
// BLOCK-07: AP BIOLOGY (슬래시 지원)
// ================================================================

// 07-michaelis-menten.js - ★ Vmax*[S]/(Km+[S])
function renderMichaelisMenten(parsed) {
    var Vmax = parsed.Vmax || 100;
    var Km = parsed.Km || 10;
    var domain = parsed.domain || [0, 50];
    var chartId = 'chart_' + Math.random().toString(36).substr(2, 9);
    var html = '<div class="graphic-box"><h3>' + (parsed.title || 'Michaelis-Menten Kinetics') + ' <span class="tag">michaelis-menten</span></h3><canvas id="' + chartId + '"></canvas></div>';
    
    function renderFn() {
        var canvas = document.getElementById(chartId);
        if (!canvas) return;
        var W = canvas.width, H = canvas.height, pad = CONFIG.PADDING;
        var ctx = canvas.getContext('2d');
        var xMin = domain[0], xMax = domain[1];
        var yMin = 0, yMax = Vmax * 1.2;
        
        // 그리드
        ctx.save();
        ctx.strokeStyle = CONFIG.GRID.color;
        ctx.lineWidth = CONFIG.GRID.lineWidth;
        var tickX = (parsed.xAxis && parsed.xAxis.tick) || 5;
        var tickY = (parsed.yAxis && parsed.yAxis.tick) || 10;
        for (var x = Math.ceil(xMin / tickX) * tickX; x <= xMax; x += tickX) {
            var px = toPixelX(x, xMin, xMax, W, pad);
            ctx.beginPath(); ctx.moveTo(px, pad); ctx.lineTo(px, H - pad); ctx.stroke();
            ctx.fillStyle = '#333'; ctx.font = '11px Arial'; ctx.textAlign = 'center';
            ctx.fillText(x, px, H - pad + 16);
        }
        for (var y = Math.ceil(yMin / tickY) * tickY; y <= yMax; y += tickY) {
            var py = toPixelY(y, yMin, yMax, H, pad);
            ctx.beginPath(); ctx.moveTo(pad, py); ctx.lineTo(W - pad, py); ctx.stroke();
            ctx.fillStyle = '#333'; ctx.font = '11px Arial'; ctx.textAlign = 'right';
            ctx.fillText(y, pad - 8, py + 4);
        }
        ctx.fillStyle = '#333'; ctx.font = '13px Arial bold'; ctx.textAlign = 'center';
        ctx.fillText((parsed.xAxis && parsed.xAxis.label) || '[S] (substrate)', W / 2, H - 6);
        ctx.textAlign = 'center'; ctx.fillText((parsed.yAxis && parsed.yAxis.label) || 'v (rate)', 20, pad - 10);
        ctx.restore();
        
        // ★ Michaelis-Menten (슬래시 지원)
        var equation = Vmax + '*x/(' + Km + '+x)';
        var fn = parseFunction(equation);
        var points = [];
        var step = (xMax - xMin) / 200;
        for (var x2 = xMin; x2 <= xMax; x2 += step) {
            try { var y2 = fn(x2); if (isFinite(y2) && Math.abs(y2) < 100) points.push({ x: x2, y: y2 }); } catch(e) {}
        }
        var color = parsed.color || '#27ae60';
        ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = parsed.lineWidth || 3;
        ctx.beginPath();
        for (var i = 0; i < points.length; i++) {
            var px = toPixelX(points[i].x, xMin, xMax, W, pad);
            var py = toPixelY(points[i].y, yMin, yMax, H, pad);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke(); ctx.restore();
        
        // Km 표시
        var kmX = toPixelX(Km, xMin, xMax, W, pad);
        var kmY = toPixelY(Vmax / 2, yMin, yMax, H, pad);
        ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(kmX, pad); ctx.lineTo(kmX, kmY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(pad, kmY); ctx.lineTo(kmX, kmY); ctx.stroke();
        ctx.restore();
        ctx.save(); ctx.fillStyle = '#e74c3c'; ctx.font = '12px Arial'; ctx.textAlign = 'center';
        ctx.fillText('Km = ' + Km, kmX, toPixelY(yMax, yMin, yMax, H, pad) - 10);
        ctx.fillText('Vmax/2', toPixelX(xMin, xMin, xMax, W, pad) + 20, kmY - 5);
        ctx.restore();
        
        // Vmax 표시
        var vmaxY = toPixelY(Vmax, yMin, yMax, H, pad);
        ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = '#3498db'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(pad, vmaxY); ctx.lineTo(W - pad, vmaxY); ctx.stroke();
        ctx.restore();
        ctx.save(); ctx.fillStyle = '#3498db'; ctx.font = '12px Arial'; ctx.textAlign = 'left';
        ctx.fillText('Vmax = ' + Vmax, toPixelX(xMax, xMin, xMax, W, pad) - 60, vmaxY - 5);
        ctx.restore();
        
        // 방정식
        ctx.save(); ctx.fillStyle = '#2c3e50'; ctx.font = '14px Arial'; ctx.textAlign = 'left';
        ctx.fillText('v = Vmax·[S]/(Km+[S])', toPixelX(xMin + (xMax - xMin) * 0.05, xMin, xMax, W, pad), toPixelY(yMax * 0.9, yMin, yMax, H, pad));
        ctx.restore();
    }
    renderWithDelay(chartId, renderFn, 150);
    return html;
}
registerRenderer('michaelis-menten', renderMichaelisMenten);
registerRenderer('michaelis', renderMichaelisMenten);


// ================================================================
// BLOCK-08: SAT SPECIAL (슬래시 지원)
// ================================================================

// 08-sat-rational.js - ★ 1/(x-2)
function renderSATRational(parsed) {
    if (!parsed.equation) return '<div style="padding:10px;color:#999;">No equation provided</div>';
    var chartId = 'chart_' + Math.random().toString(36).substr(2, 9);
    var html = '<div class="graphic-box"><h3>' + (parsed.title || 'Rational Function') + ' <span class="tag">sat-rational</span></h3><canvas id="' + chartId + '"></canvas></div>';
    
    function renderFn() {
        var canvas = document.getElementById(chartId);
        if (!canvas) return;
        var W = canvas.width, H = canvas.height, pad = CONFIG.PADDING;
        var ctx = canvas.getContext('2d');
        var xMin = (parsed.xAxis && parsed.xAxis.min !== undefined) ? parsed.xAxis.min : -8;
        var xMax = (parsed.xAxis && parsed.xAxis.max !== undefined) ? parsed.xAxis.max : 8;
        var yMin = (parsed.yAxis && parsed.yAxis.min !== undefined) ? parsed.yAxis.min : -8;
        var yMax = (parsed.yAxis && parsed.yAxis.max !== undefined) ? parsed.yAxis.max : 8;
        
        // 그리드
        ctx.save();
        ctx.strokeStyle = CONFIG.GRID.color;
        ctx.lineWidth = CONFIG.GRID.lineWidth;
        var tickX = (parsed.xAxis && parsed.xAxis.tick) || 1;
        var tickY = (parsed.yAxis && parsed.yAxis.tick) || 1;
        for (var x = Math.ceil(xMin / tickX) * tickX; x <= xMax; x += tickX) {
            var px = toPixelX(x, xMin, xMax, W, pad);
            ctx.beginPath(); ctx.moveTo(px, pad); ctx.lineTo(px, H - pad); ctx.stroke();
            ctx.fillStyle = '#333'; ctx.font = '11px Arial'; ctx.textAlign = 'center';
            ctx.fillText(x, px, H - pad + 16);
        }
        for (var y = Math.ceil(yMin / tickY) * tickY; y <= yMax; y += tickY) {
            var py = toPixelY(y, yMin, yMax, H, pad);
            ctx.beginPath(); ctx.moveTo(pad, py); ctx.lineTo(W - pad, py); ctx.stroke();
            ctx.fillStyle = '#333'; ctx.font = '11px Arial'; ctx.textAlign = 'right';
            ctx.fillText(y, pad - 8, py + 4);
        }
        ctx.fillStyle = '#333'; ctx.font = '13px Arial bold'; ctx.textAlign = 'center';
        ctx.fillText((parsed.xAxis && parsed.xAxis.label) || 'x', W / 2, H - 6);
        ctx.textAlign = 'center'; ctx.fillText((parsed.yAxis && parsed.yAxis.label) || 'y', 20, pad - 10);
        ctx.restore();
        
        // ★ 유리함수 (슬래시 지원)
        var equation = parsed.equation;
        var fn = parseFunction(equation);
        var points = [];
        var domain = parsed.domain || [xMin, xMax];
        var step = (domain[1] - domain[0]) / 200;
        
        // 점근선
        var asymptotes = [];
        try {
            var denomStr = equation.split('/')[1];
            if (denomStr) {
                var denomFn = parseFunction(denomStr);
                for (var x3 = domain[0]; x3 <= domain[1]; x3 += 0.01) {
                    try { var d = denomFn(x3); if (Math.abs(d) < 0.001) asymptotes.push(x3); } catch(e) {}
                }
            }
        } catch(e) {}
        
        for (var x4 = domain[0]; x4 <= domain[1]; x4 += step) {
            try { var y2 = fn(x4); if (isFinite(y2) && Math.abs(y2) < 100) points.push({ x: x4, y: y2 }); } catch(e) {}
        }
        
        // 점근선 그리기
        if (asymptotes.length > 0) {
            ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = '#95a5a6'; ctx.lineWidth = 1.5;
            for (var ai = 0; ai < asymptotes.length; ai++) {
                var ax = toPixelX(asymptotes[ai], xMin, xMax, W, pad);
                ctx.beginPath(); ctx.moveTo(ax, pad); ctx.lineTo(ax, H - pad); ctx.stroke();
            }
            ctx.restore();
        }
        
        // 함수 그래프
        var color = parsed.color || '#e74c3c';
        ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = parsed.lineWidth || 3;
        ctx.beginPath();
        for (var i = 0; i < points.length; i++) {
            var px = toPixelX(points[i].x, xMin, xMax, W, pad);
            var py = toPixelY(points[i].y, yMin, yMax, H, pad);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke(); ctx.restore();
        
        // 방정식 레이블
        ctx.save(); ctx.fillStyle = '#2c3e50'; ctx.font = '14px Arial'; ctx.textAlign = 'left';
        ctx.fillText('y = ' + equation, toPixelX(domain[0] + (domain[1] - domain[0]) * 0.7, xMin, xMax, W, pad), toPixelY(yMax * 0.8, yMin, yMax, H, pad));
        ctx.restore();
    }
    renderWithDelay(chartId, renderFn, 150);
    return html;
}
registerRenderer('sat-rational', renderSATRational);
registerRenderer('rational', renderSATRational);


// ================================================================
// BLOCK-09: DISPATCHER (메인 디스패처)
// ================================================================

// 09-render-graphic.js
function renderGraphic(jsonData) {
    if (jsonData === null || jsonData === undefined) return "";
    if (typeof jsonData === 'string' && jsonData.trim() === "") return "";
    
    var parsed = safeParseJSON(jsonData);
    if (!parsed || typeof parsed !== 'object') {
        return '<div style="padding:10px;color:#999;text-align:center;">📊 Invalid graphic data</div>';
    }
    
    var type = parsed.type || '';
    if (!type) {
        return '<div style="padding:10px;color:#999;text-align:center;">📊 No type specified</div>';
    }
    
    if (typeof Chart === 'undefined') {
        return '<div style="padding:10px;color:#999;text-align:center;">📊 Loading chart library...</div>';
    }
    
    var renderer = getRenderer(type);
    if (renderer) {
        try {
            return renderer(parsed);
        } catch(e) {
            console.warn('⚠️ Renderer failed for type:', type, e);
            return '<div style="padding:10px;color:#999;text-align:center;">📊 Render error: ' + escapeHtml(type) + '</div>';
        }
    }
    
    return '<div style="padding:10px;text-align:center;color:#999;border:1px dashed #ddd;border-radius:8px;margin:15px 0;">' +
        '<span style="font-size:20px;">📊</span>' +
        '<p style="margin-top:8px;">Graph type "<strong>' + escapeHtml(type) + '</strong>" is not supported.</p>' +
        '</div>';
}

window.renderGraphic = renderGraphic;
console.log('✅ BLOCK-09: Dispatcher loaded');
console.log('✅ All renderers registered (' + getSupportedTypes().length + ' types)');


// ================================================================
// DEMO - 테스트
// ================================================================
(function demo() {
    var demoDiv = document.getElementById('demo');
    if (!demoDiv) return;
    
    var demos = [
        {
            title: '✅ Scatter Plot (SAT Q11)',
            json: '{"type":"scatter-only","xAxis":{"min":0,"max":10,"tick":1,"label":"x"},"yAxis":{"min":-10,"max":10,"tick":1,"label":"y"},"points":[{"x":1,"y":8},{"x":2,"y":7},{"x":3,"y":5},{"x":4,"y":4},{"x":5,"y":2},{"x":6,"y":1},{"x":7,"y":0},{"x":8,"y":-2},{"x":9,"y":-3},{"x":10,"y":-5}]}'
        },
        {
            title: '✅ Rational Function with Slash 1/(x-2)',
            json: '{"type":"sat-rational","equation":"1/(x-2)","domain":[-5,5],"color":"#e74c3c"}'
        },
        {
            title: '✅ Michaelis-Menten Vmax*[S]/(Km+[S])',
            json: '{"type":"michaelis-menten","Vmax":100,"Km":10,"domain":[0,50],"color":"#27ae60"}'
        },
        {
            title: '✅ Coordinate Plane with Functions',
            json: '{"type":"coordinate-plane","xAxis":{"min":-5,"max":5,"tick":1,"label":"x"},"yAxis":{"min":-5,"max":5,"tick":1,"label":"y"},"functions":[{"equation":"0.3*x^3-0.6*x^2-2.7*x+3.6","domain":[-4,4],"color":"#e74c3c"}]}'
        }
    ];
    
    var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">';
    demos.forEach(function(demo) {
        html += '<div style="background:white;border-radius:12px;padding:15px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">';
        html += '<h4 style="margin:0 0 10px 0;color:#2c3e50;">' + demo.title + '</h4>';
        html += renderGraphic(demo.json);
        html += '</div>';
    });
    html += '</div>';
    
    demoDiv.innerHTML = html;
    console.log('✅ Demo loaded with ' + demos.length + ' examples');
})();

console.log('✅ GRAPHICS ENGINE v3.0 loaded successfully');
console.log('📊 Supported types:', getSupportedTypes().join(', '));
</script>
</body>
</html>
