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

// ── Hero canvas: floating graph nodes ───────────────────────
function initHeroCanvas() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, nodes = [], edges = [], raf;

  function resize() {
    W = canvas.offsetWidth; H = canvas.offsetHeight;
    canvas.width = W * Math.min(window.devicePixelRatio || 1, 2);
    canvas.height = H * Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(Math.min(window.devicePixelRatio || 1, 2), 0, 0, Math.min(window.devicePixelRatio || 1, 2), 0, 0);
    build();
  }

  function build() {
    nodes = [];
    edges = [];
    const count = Math.floor(W * H / 18000) + 12;
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 3 + 1.5,
        alpha: Math.random() * 0.6 + 0.2
      });
    }
  }

  function tick() {
    ctx.clearRect(0, 0, W, H);
    nodes.forEach(n => {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
    });
    // edges
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 120) {
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = `rgba(139,92,246,${0.18 * (1 - d / 120)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
    // nodes
    nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(167,139,250,${n.alpha})`;
      ctx.fill();
    });
    raf = requestAnimationFrame(tick);
  }

  window.addEventListener('resize', resize);
  resize();
  tick();
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
