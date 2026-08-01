/* 玄机阁 · 灵签抽签动画控制器 lingqian-anim.js
   纯本地、零外链、零依赖。五阶段状态机编排「道法抽签」全流程，支持回调钩子与重复触发防护。
   依赖 XJ_QIAN(qian.js) 提供签数据；DOM 骨架由 lingqian.html 提供，特效层由本文件按需生成。

   编排：聚灵(符文环收拢+灵气汇聚) → 摇筒(筒身摇振+签影翻涌) → 签飞(抛物线出筒+拖尾)
        → 绽放(光芒放射+卷轴展开) → 定签
   总时长约 2.8s。所有动画只驱动 transform / opacity / filter，避免重排。
   prefers-reduced-motion: reduce 时不生成任何特效 DOM，直接揭晓。 */
(function (root) {
  'use strict';

  var TIMING = {
    charge: 600,     // 聚灵：符文环收拢、灵气汇聚、筒身凝光
    roll: 1100,      // 摇筒：筒身摇振 + 签影翻涌
    fly: 560,        // 签飞：签条抛物线出筒
    burstLead: 340,  // 签飞出后多久触发光爆与揭晓（与抛物线顶点同步）
    reveal: 520,     // 揭晓：卷轴展开
    lineGap: 55      // 结果各行错峰上浮间隔
  };

  var RUNES = ['\u2630', '\u2631', '\u2632', '\u2633', '\u2634', '\u2635', '\u2636', '\u2637']; // 八卦 ☰☱☲☳☴☵☶☷
  var MOTE_COUNT = 14;  // 灵气粒子
  var RAY_COUNT = 12;   // 绽放光条
  var GOLDEN_ANGLE = 137.508; // 黄金角散布，确定性且分布均匀

  function prefersReduced() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function el(tag, cls, parent) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (parent) parent.appendChild(n);
    return n;
  }

  function Anim(opts) {
    opts = opts || {};
    this.els = opts.els || {};
    this.getQian = opts.getQian || function () { return null; };
    this.hooks = opts.hooks || {};
    this.state = 'idle';
    this.busy = false;
    this.timers = [];
    this.q = null;
    this.reduce = prefersReduced();
    this.fx = null;
    if (!this.reduce) this._buildFx();
  }

  /* 按需构建特效层：符文环 / 地气光晕 / 灵气粒子 / 签条 / 光爆。
     只构建一次，后续复用，避免每次抽签制造垃圾 DOM。 */
  Anim.prototype._buildFx = function () {
    var altar = this.els.altar;
    if (!altar || altar.querySelector('.qian-runes')) return;

    var halo = el('div', 'qian-halo', null);
    var runes = el('div', 'qian-runes', null);
    var motes = el('div', 'qian-motes', null);
    var burst = el('div', 'qian-burst', null);
    var stick = el('div', 'qian-stick', null);

    [halo, runes, motes, burst, stick].forEach(function (n) { n.setAttribute('aria-hidden', 'true'); });

    // 内层 ring 承载「收拢入场 + 持续旋转」两条动画，
    // 外层 runes 只管透明度，避免中途加类导致入场动画重启
    var ring = el('div', 'rune-ring', runes);
    RUNES.forEach(function (ch, i) {
      var r = el('span', 'rune', ring);
      r.textContent = ch;
      r.style.setProperty('--a', (i * 45) + 'deg');
      r.style.setProperty('--d', (i * 42) + 'ms');
    });

    for (var i = 0; i < MOTE_COUNT; i++) {
      var m = el('i', 'mote', motes);
      var ang = (i * GOLDEN_ANGLE) % 360;
      var rad = ang * Math.PI / 180;
      var dist = 76 + (i % 4) * 11;                       // 76 / 87 / 98 / 109 px
      m.style.setProperty('--tx', Math.round(Math.cos(rad) * dist) + 'px');
      m.style.setProperty('--ty', Math.round(Math.sin(rad) * dist) + 'px');
      m.style.setProperty('--d', (i * 34) + 'ms');
      m.style.setProperty('--s', (0.7 + (i % 3) * 0.22).toFixed(2));
    }

    el('i', 'core', burst);
    for (var j = 0; j < RAY_COUNT; j++) {
      var ray = el('i', 'ray', burst);
      ray.style.setProperty('--r', (j * (360 / RAY_COUNT)) + 'deg');
      ray.style.setProperty('--d', (j % 3) * 26 + 'ms');
    }

    stick.textContent = '\u7C64'; // 籤

    // 层序：光晕 → 符文 →（签筒，已在 DOM 中）→ 粒子 → 光爆 → 签条
    altar.insertBefore(halo, altar.firstChild);
    altar.insertBefore(runes, altar.firstChild);
    altar.appendChild(motes);
    altar.appendChild(burst);
    altar.appendChild(stick);

    this.fx = { halo: halo, runes: runes, motes: motes, burst: burst, stick: stick };
  };

  Anim.prototype._t = function (fn, ms) {
    var self = this;
    var id = setTimeout(function () { fn.call(self); }, ms);
    this.timers.push(id);
    return id;
  };

  Anim.prototype._clearTimers = function () {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  };

  Anim.prototype._cls = function (elm, c, on) {
    if (elm) elm.classList[on ? 'add' : 'remove'](c);
  };

  Anim.prototype._fxCls = function (key, c, on) {
    if (this.fx && this.fx[key]) this.fx[key].classList[on ? 'add' : 'remove'](c);
  };

  // 清空全部动画类，保证重复抽签时动画能从头重播
  Anim.prototype._resetFx = function () {
    var e = this.els;
    ['is-charging', 'is-shaking', 'is-rise'].forEach(function (c) { this._cls(e.tube, c, false); }, this);
    this._cls(e.shuffle, 'is-rolling', false);
    this._cls(e.altar, 'is-active', false);
    this._fxCls('halo', 'is-on', false);
    this._fxCls('runes', 'is-in', false);
    this._fxCls('motes', 'is-in', false);
    this._fxCls('stick', 'is-fly', false);
    this._fxCls('burst', 'is-bloom', false);
  };

  Anim.prototype._resetReveal = function () {
    var e = this.els;
    this._cls(e.result, 'scroll-open', false);
    if (e.lines) {
      e.lines.forEach(function (ln) {
        if (!ln) return;
        ln.classList.remove('reveal-line');
        ln.style.animationDelay = '';
      });
    }
    if (e.result) e.result.classList.add('is-hidden');
  };

  Anim.prototype._lock = function (on) {
    var b = this.els.btn;
    if (!b) return;
    b.disabled = !!on;
    b.setAttribute('aria-busy', on ? 'true' : 'false');
  };

  Anim.prototype.run = function () {
    if (this.busy) return; // 防重复触发
    this.busy = true;
    this.state = 'summoning';

    this._clearTimers();
    this._resetFx();
    this._resetReveal();
    this.q = this.getQian(); // 天机早定：动画开始前抽签，揭晓时呈现

    this._lock(true);
    if (this.hooks.onStart) this.hooks.onStart(this.q);

    if (this.reduce) { this._reveal(); return; }

    var e = this.els;

    // 阶段一 · 聚灵：符文环收拢、灵气汇聚、筒身凝光
    // 强制重排后再加类，确保上一轮残留清除后动画重新播放
    void (e.altar ? e.altar.offsetWidth : 0);
    this._cls(e.altar, 'is-active', true);
    this._cls(e.tube, 'is-charging', true);
    this._fxCls('halo', 'is-on', true);
    this._fxCls('runes', 'is-in', true);
    this._fxCls('motes', 'is-in', true);

    // 阶段二 · 摇筒
    this._t(function () {
      this.state = 'rolling';
      this._cls(e.tube, 'is-charging', false);
      this._cls(e.tube, 'is-shaking', true);
      this._cls(e.shuffle, 'is-rolling', true);
      if (this.hooks.onRolling) this.hooks.onRolling(this.q);
    }, TIMING.charge);

    // 阶段三 · 签飞：签条抛物线出筒
    this._t(function () {
      this.state = 'flying';
      this._cls(e.tube, 'is-shaking', false);
      this._cls(e.shuffle, 'is-rolling', false);
      this._cls(e.tube, 'is-rise', true);
      this._fxCls('stick', 'is-fly', true);
      if (this.hooks.onFly) this.hooks.onFly(this.q);
    }, TIMING.charge + TIMING.roll);

    // 阶段四 · 绽放：与抛物线顶点同步爆光，随即展开卷轴
    this._t(function () {
      this.state = 'revealing';
      this._fxCls('burst', 'is-bloom', true);
      this._reveal();
    }, TIMING.charge + TIMING.roll + TIMING.burstLead);

    // 法阵余韵散去
    this._t(function () {
      this._fxCls('runes', 'is-in', false);
      this._fxCls('halo', 'is-on', false);
      this._cls(e.altar, 'is-active', false);
    }, TIMING.charge + TIMING.roll + TIMING.fly + 260);
  };

  Anim.prototype._reveal = function () {
    var e = this.els, self = this;
    if (this.hooks.onReveal) this.hooks.onReveal(this.q);

    if (e.result) {
      e.result.classList.remove('is-hidden');
      requestAnimationFrame(function () { self._cls(e.result, 'scroll-open', true); });
    }

    var lines = (e.lines || []).filter(Boolean);
    if (lines.length) {
      lines.forEach(function (ln) { ln.classList.remove('reveal-line'); });
      void (e.result ? e.result.offsetWidth : 0); // 强制重排，确保动画重播
      lines.forEach(function (ln, i) {
        ln.style.animationDelay = (i * TIMING.lineGap) + 'ms';
        ln.classList.add('reveal-line');
      });
    }

    var tail = this.reduce ? 0 : TIMING.reveal + lines.length * TIMING.lineGap;
    this._t(function () {
      this._cls(e.tube, 'is-rise', false);
      this._fxCls('stick', 'is-fly', false);
      this._fxCls('burst', 'is-bloom', false);
      this._fxCls('motes', 'is-in', false);
      this.state = 'done';
      this.busy = false;
      this._lock(false);
      if (e.btn) e.btn.textContent = '\u518D\u6C42\u4E00\u7B7E'; // 再求一签
      if (this.hooks.onComplete) this.hooks.onComplete(this.q);
    }, tail);
  };

  /* 立即定签：跳过剩余动画，直接把已抽到的签落定。
     用于页面切后台等场景 —— 后台标签页 setTimeout 被节流，
     若放任不管，回到前台会出现动画类残留、按钮卡在禁用态。 */
  Anim.prototype.settle = function () {
    if (!this.busy) return;
    this._clearTimers();
    this._resetFx();
    var e = this.els;
    if (this.q && this.hooks.onReveal) this.hooks.onReveal(this.q);
    if (e.result) {
      e.result.classList.remove('is-hidden');
      e.result.classList.remove('scroll-open');
    }
    (e.lines || []).forEach(function (ln) {
      if (!ln) return;
      ln.classList.remove('reveal-line');
      ln.style.animationDelay = '';
    });
    this.state = 'done';
    this.busy = false;
    this._lock(false);
    if (e.btn) e.btn.textContent = '\u518D\u6C42\u4E00\u7B7E';
    if (this.hooks.onComplete) this.hooks.onComplete(this.q);
  };

  // 中断：清理所有计时与动画类，回到 idle，避免中断异常
  Anim.prototype.cancel = function () {
    if (!this.busy && this.state === 'idle') return;
    this._clearTimers();
    this._resetFx();
    this._cls(this.els.result, 'scroll-open', false);
    this.state = 'idle';
    this.busy = false;
    this._lock(false);
    if (this.hooks.onCancel) this.hooks.onCancel();
  };

  root.XJ_QIAN_ANIM = { Anim: Anim, TIMING: TIMING };
})(typeof window !== 'undefined' ? window : globalThis);
