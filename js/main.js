'use strict';
/* =============================================================
   DSA Illustrated — main.js  v1.0
   Theme / Progress / Reveals / Quiz / QA / Hero Canvas
   ============================================================= */

const THEME_KEY = 'dsa-theme';

function isDark() {
  return document.documentElement.getAttribute('data-theme') !== 'light';
}
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem(THEME_KEY, t);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.innerHTML = t === 'dark' ? '&#9788;' : '&#9790;';
}
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(saved);
}

function initReadingProgress() {
  const bar = document.querySelector('.reading-progress') || document.getElementById('reading-progress');
  if (!bar) return;
  const update = () => {
    const st = document.documentElement.scrollTop;
    const sh = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    bar.style.width = (sh > 0 ? (st / sh) * 100 : 0) + '%';
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function initScrollReveals() {
  const els = document.querySelectorAll('.reveal, .section-block, .mini-card, .step-item, .quiz-question, .at-a-glance');
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => { el.classList.add('reveal'); io.observe(el); });
}

function initQuiz() {
  document.querySelectorAll('.quiz-question').forEach(q => {
    q.querySelectorAll('.quiz-option').forEach(opt => {
      opt.addEventListener('click', () => {
        if (q.dataset.answered) return;
        q.dataset.answered = '1';
        const correct = opt.dataset.correct === 'true';
        q.querySelectorAll('.quiz-option').forEach(o => {
          o.classList.add('disabled');
          if (o.dataset.correct === 'true') o.classList.add('correct');
        });
        if (!correct) opt.classList.add('wrong');
        const fb = q.querySelector('.quiz-feedback');
        if (fb) {
          fb.textContent = (correct ? 'Correct. ' : 'Incorrect. ') + (opt.dataset.explanation || '');
          fb.classList.add('show', correct ? 'correct-fb' : 'wrong-fb');
        }
      });
    });
  });
}

function initQA() {
  document.querySelectorAll('.qa-item').forEach(item => {
    const btn = item.querySelector('.qa-q');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.qa-item.open').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });
}

// ── Hero canvas: animated sorting bars ──────────────────────
function initHeroCanvas() {
  var canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W, H, rafId;
  var N = 46;
  var arr = [], barStates = [], barAnimH = [];
  var sortSteps = [], stepIdx = 0, lastStepT = 0;
  var STEP_MS = 48; // ms between sort steps

  function rr(ctx2, x, y, w, h, r) {
    ctx2.beginPath();
    ctx2.moveTo(x+r,y); ctx2.lineTo(x+w-r,y); ctx2.arcTo(x+w,y,x+w,y+r,r);
    ctx2.lineTo(x+w,y+h-r); ctx2.arcTo(x+w,y+h,x+w-r,y+h,r);
    ctx2.lineTo(x+r,y+h); ctx2.arcTo(x,y+h,x,y+h-r,r);
    ctx2.lineTo(x,y+r); ctx2.arcTo(x,y,x+r,y,r); ctx2.closePath();
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var p = canvas.parentElement;
    W = (p ? p.offsetWidth : canvas.offsetWidth) || 600;
    H = (p ? p.offsetHeight : canvas.offsetHeight) || 420;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initArr();
  }

  function initArr() {
    arr = [];
    for (var i = 0; i < N; i++) arr.push(Math.random() * 82 + 8);
    barStates = arr.map(function() { return 'default'; });
    barAnimH  = arr.map(function(v) { return (v / 100) * (H - 56); });
    sortSteps = buildBubble(arr.slice());
    stepIdx = 0;
  }

  function buildBubble(a) {
    var s = [], n = a.length;
    for (var i = 0; i < n - 1; i++) {
      for (var j = 0; j < n - i - 1; j++) {
        (function(ai, bj) {
          s.push({ a: a.slice(), st: a.map(function(_, k) {
            return k >= n-ai ? 'sorted' : (k===bj||k===bj+1) ? 'comparing' : 'default';
          })});
        })(i, j);
        if (a[j] > a[j+1]) { var tmp = a[j]; a[j] = a[j+1]; a[j+1] = tmp; }
      }
    }
    s.push({ a: a.slice(), st: a.map(function() { return 'sorted'; }) });
    return s;
  }

  var particles = [];
  function spawnParticle() {
    particles.push({ x: Math.random()*W, y: Math.random()*H, r: Math.random()*1.5+0.5,
      vx:(Math.random()-0.5)*0.3, vy:(Math.random()-0.5)*0.3, life:1, decay:Math.random()*0.004+0.002 });
  }
  for (var pi = 0; pi < 28; pi++) spawnParticle();

  function draw() {
    // Always dark — ignores page theme
    var bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0d0720'); bg.addColorStop(0.5, '#06030e'); bg.addColorStop(1, '#120a2e');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // Dot grid
    ctx.fillStyle = 'rgba(139,92,246,0.045)';
    for (var gx = 20; gx < W; gx += 22) {
      for (var gy = 20; gy < H; gy += 22) {
        ctx.beginPath(); ctx.arc(gx, gy, 0.9, 0, Math.PI*2); ctx.fill();
      }
    }

    // Particles
    particles.forEach(function(p) {
      p.x += p.vx; p.y += p.vy; p.life -= p.decay;
      if (p.x<0||p.x>W) p.vx*=-1; if (p.y<0||p.y>H) p.vy*=-1;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(167,139,250,' + (p.life * 0.35) + ')'; ctx.fill();
      if (p.life <= 0) { p.life=1; p.x=Math.random()*W; p.y=Math.random()*H; }
    });

    // Sort bars
    var bw = Math.floor((W - 20) / N) - 1;
    var baseY = H - 24;
    var maxH = H - 56;
    var sortedCount = 0;
    if (barStates) { barStates.forEach(function(s) { if (s==='sorted') sortedCount++; }); }
    var pct = Math.round((sortedCount / N) * 100);

    arr.forEach(function(v, i) {
      var target = Math.round((v / 100) * maxH);
      var diff = target - barAnimH[i];
      if (Math.abs(diff) > 0.4) barAnimH[i] += diff * 0.2;
      else barAnimH[i] = target;
      var bh = Math.max(3, barAnimH[i]);
      var x = 10 + i * (bw + 1), y = baseY - bh;
      var st = barStates[i] || 'default';

      ctx.save();
      if (st === 'comparing') { ctx.shadowColor='rgba(251,146,60,0.9)'; ctx.shadowBlur=20; }
      else if (st === 'sorted') { ctx.shadowColor='rgba(52,211,153,0.3)'; ctx.shadowBlur=6; }

      var g = ctx.createLinearGradient(x, y, x, baseY);
      if (st === 'comparing') { g.addColorStop(0,'#FB923C'); g.addColorStop(1,'#7C2D12'); }
      else if (st === 'sorted') { g.addColorStop(0,'#34D399'); g.addColorStop(1,'#064E3B'); }
      else { g.addColorStop(0,'#A78BFA'); g.addColorStop(1,'#2D1B69'); }

      rr(ctx, x, y, bw, bh, 2);
      ctx.fillStyle = g; ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = st==='comparing'?'rgba(251,146,60,0.6)':st==='sorted'?'rgba(52,211,153,0.35)':'rgba(139,92,246,0.3)';
      ctx.lineWidth = 0.8; ctx.stroke();
      ctx.restore();
    });

    // Progress label
    ctx.save();
    ctx.fillStyle = 'rgba(167,139,250,0.28)';
    ctx.font = '11px "JetBrains Mono",monospace';
    ctx.textAlign = 'left'; ctx.fillText('Bubble Sort  ' + pct + '%', 12, 16);
    // Mini legend
    ctx.fillStyle = 'rgba(251,146,60,0.7)'; ctx.fillRect(W-120, 8, 10, 6);
    ctx.fillStyle = 'rgba(167,139,250,0.5)'; ctx.font = '9px "JetBrains Mono",monospace';
    ctx.fillText('comparing', W-106, 13);
    ctx.fillStyle = 'rgba(52,211,153,0.7)'; ctx.fillRect(W-120, 20, 10, 6);
    ctx.fillText('sorted', W-106, 25);
    ctx.restore();
  }

  function tick(now) {
    now = now || performance.now();
    if (now - lastStepT > STEP_MS) {
      if (stepIdx < sortSteps.length) {
        arr = sortSteps[stepIdx].a.slice();
        barStates = sortSteps[stepIdx].st.slice();
        stepIdx++;
      } else if (now - lastStepT > 1400) {
        initArr(); // restart with new random array
      }
      lastStepT = now;
    }
    draw();
    rafId = requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() { resize(); });
  resize();
  requestAnimationFrame(tick);
}

// ── Bootstrap ────────────────────────────────────────────────
function boot() {
  initTheme();
  const tog = document.getElementById('theme-toggle');
  if (tog) tog.addEventListener('click', () => applyTheme(isDark() ? 'light' : 'dark'));
  initReadingProgress();
  initScrollReveals();
  initQuiz();
  initQA();
  initHeroCanvas();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
