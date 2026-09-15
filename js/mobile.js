/* ============================================================
   mobile.js — the phone behaviours

   Three things a desktop layout gets wrong on a phone:
     • a text box that stays one size and scrolls inside itself
     • a keyboard that eats half the screen and hides the button
       you are trying to reach
     • helper text that is useful once and in the way forever
   ============================================================ */

/* ---------------------------------------------------------- */
/*  textareas that grow as you type                            */
/* ---------------------------------------------------------- */

export function grow(el) {
  if (!el || el.tagName !== 'TEXTAREA') return;
  /* measure from zero, or it can only ever get taller */
  el.style.height = 'auto';
  const min = parseInt(getComputedStyle(el).minHeight, 10) || 0;
  el.style.height = Math.max(el.scrollHeight, min) + 'px';
}

let pending = null;
function queue(el) {
  if (!pending) {
    pending = new Set();
    requestAnimationFrame(() => { pending.forEach(grow); pending = null; });
  }
  pending.add(el);
}

export function growAll(root = document) {
  root.querySelectorAll?.('textarea').forEach(queue);
}

function initAutogrow() {
  /* every keystroke in any textarea, wherever it came from */
  document.addEventListener('input', (e) => {
    if (e.target && e.target.tagName === 'TEXTAREA') grow(e.target);
  }, true);

  /* and size them the moment they appear — modals, re-renders, everything */
  new MutationObserver((muts) => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.tagName === 'TEXTAREA') queue(n);
        else n.querySelectorAll?.('textarea').forEach(queue);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });

  /* a rotation changes every width, so every height is wrong */
  window.addEventListener('resize', () => growAll());
  growAll();
}

/* ---------------------------------------------------------- */
/*  the keyboard                                               */
/* ---------------------------------------------------------- */

/**
 * On a phone the keyboard covers the bottom 40–50% of the screen.
 * The layout has to know how much, so the tab bar and the player
 * can get out of the way and a modal can shrink to what is left
 * rather than putting its Save button under the keys.
 */
function initKeyboard() {
  const vv = window.visualViewport;
  if (!vv) return;

  const apply = () => {
    /* how much of the window the keyboard (or a browser bar) covers */
    const hidden = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    const open = hidden > 120;
    document.documentElement.style.setProperty('--kb', `${open ? hidden : 0}px`);
    document.body.classList.toggle('kb-open', open);
  };

  vv.addEventListener('resize', apply);
  vv.addEventListener('scroll', apply);
  apply();

  /* keep whatever you are typing in actually visible */
  document.addEventListener('focusin', (e) => {
    const el = e.target;
    if (!/INPUT|TEXTAREA|SELECT/.test(el.tagName || '')) return;
    setTimeout(() => {
      const r = el.getBoundingClientRect();
      const bottom = window.innerHeight - (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--kb'), 10) || 0);
      if (r.bottom > bottom - 12 || r.top < 60) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }, 280);
  });
}

/* ---------------------------------------------------------- */
/*  helper text that folds away                                */
/* ---------------------------------------------------------- */

/**
 * Every explanatory paragraph is worth reading once. On a phone,
 * on the twentieth visit, it is just distance between you and the
 * thing you came for — so they clamp to two lines and open on tap.
 */
function initHints() {
  const isPhone = () => window.matchMedia('(max-width: 880px)').matches;

  const mark = (p) => {
    if (p.dataset.hint) return;
    if (!p.classList.contains('small') || !p.classList.contains('muted')) return;
    if (p.closest('.modal')) return;                 // modals are already short
    if ((p.textContent || '').length < 110) return;  // short ones are fine as they are
    p.dataset.hint = '1';
    p.addEventListener('click', () => {
      if (!isPhone()) return;
      p.classList.toggle('open');
    });
  };

  new MutationObserver((muts) => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.tagName === 'P') mark(n);
        else n.querySelectorAll?.('p.small.muted').forEach(mark);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });

  document.querySelectorAll('p.small.muted').forEach(mark);
}

/* ---------------------------------------------------------- */
/*  swipe between subtabs                                      */
/* ---------------------------------------------------------- */

let tabSwipe = null;

/** Called by ui.subtabs() on every render; cleared by the router. */
export function setSwipeTabs(cfg) { tabSwipe = cfg; }
export function clearSwipeTabs() { tabSwipe = null; }

function initTabSwipe() {
  const view = document.getElementById('view');
  if (!view) return;
  let x0 = 0, y0 = 0, t0 = 0, live = false;

  view.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1 || !tabSwipe) { live = false; return; }
    /* not while you are dragging inside something that scrolls sideways */
    if (e.target.closest('.table-wrap, .subtabs, .shots, .phase-bars, .media-grid, input, textarea, select')) { live = false; return; }
    const t = e.touches[0];
    x0 = t.clientX; y0 = t.clientY; t0 = Date.now(); live = true;
  }, { passive: true });

  view.addEventListener('touchend', (e) => {
    if (!live || !tabSwipe) return;
    live = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - x0, dy = t.clientY - y0;
    if (Date.now() - t0 > 600) return;                 // a drag, not a flick
    if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.6) return;
    const { items, active, onPick } = tabSwipe;
    const i = items.findIndex(x => x[0] === active);
    const next = dx < 0 ? i + 1 : i - 1;
    if (i < 0 || next < 0 || next >= items.length) return;
    onPick(items[next][0]);
    flash(dx < 0 ? 'left' : 'right');
  }, { passive: true });
}

function flash(dir) {
  const el = document.createElement('div');
  el.className = `swipe-flash ${dir}`;
  document.body.append(el);
  setTimeout(() => el.remove(), 280);
}

/* ---------------------------------------------------------- */
/*  swipe actions on a row                                     */
/* ---------------------------------------------------------- */

/**
 * The action you repeat fifty times should not need a button.
 * swipeRow(el, { right: {label, color, fn}, left: {...} })
 */
export function swipeRow(el, actions) {
  let x0 = 0, y0 = 0, dx = 0, dragging = false, decided = false;
  const TH = 78;

  const hint = document.createElement('div');
  hint.className = 'swipe-hint';
  el.classList.add('swipeable');
  el.append(hint);

  el.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    dragging = true; decided = false; dx = 0;
    el.style.transition = 'none';
  }, { passive: true });

  el.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    const t = e.touches[0];
    const ddx = t.clientX - x0, ddy = t.clientY - y0;
    if (!decided) {
      if (Math.abs(ddy) > Math.abs(ddx)) { dragging = false; return; }   // it is a scroll
      if (Math.abs(ddx) < 10) return;
      decided = true;
    }
    const a = ddx > 0 ? actions.right : actions.left;
    if (!a) return;
    dx = Math.max(-140, Math.min(140, ddx));
    el.style.transform = `translateX(${dx}px)`;
    hint.textContent = a.label;
    hint.style.background = a.color || 'var(--accent)';
    hint.style.opacity = Math.min(1, Math.abs(dx) / TH);
    hint.className = `swipe-hint ${dx > 0 ? 'r' : 'l'}`;
  }, { passive: true });

  const end = () => {
    if (!dragging) return;
    dragging = false;
    el.style.transition = 'transform .18s ease';
    const a = dx > 0 ? actions.right : actions.left;
    if (a && Math.abs(dx) >= TH) {
      el.style.transform = `translateX(${dx > 0 ? 340 : -340}px)`;
      el.style.opacity = '0';
      setTimeout(() => a.fn(), 160);
    } else {
      el.style.transform = '';
      hint.style.opacity = '0';
    }
    dx = 0;
  };
  el.addEventListener('touchend', end, { passive: true });
  el.addEventListener('touchcancel', end, { passive: true });
  return el;
}

/* ---------------------------------------------------------- */
/*  the offline strip                                          */
/* ---------------------------------------------------------- */

/**
 * The app already queues writes offline and replays them. What it
 * never did was say so — which leaves you wondering whether the tap
 * registered. pending() is passed in to avoid a circular import.
 */
export function initOffline(pending) {
  const strip = document.createElement('div');
  strip.className = 'offline-strip';
  strip.hidden = true;
  document.body.append(strip);

  let timer = null;
  const paint = () => {
    const off = !navigator.onLine;
    strip.hidden = !off;
    document.body.classList.toggle('is-offline', off);
    if (!off) return;
    const n = pending();
    strip.textContent = n
      ? `Offline — ${n} change${n === 1 ? '' : 's'} saved here, they go up when you reconnect`
      : 'Offline — everything is saved on this device';
  };

  const watch = () => {
    clearInterval(timer);
    if (!navigator.onLine) timer = setInterval(paint, 2500);
    paint();
  };
  window.addEventListener('online', watch);
  window.addEventListener('offline', watch);
  watch();
}

export function initMobile(pending) {
  initAutogrow();
  initKeyboard();
  initHints();
  initTabSwipe();
  if (pending) initOffline(pending);
}
