/* 玄机阁 · 灵签抽签动画控制器 lingqian-anim.js
   纯本地、零外链。四阶段状态机编排抽签动画，支持回调钩子与重复触发防护。
   依赖 XJ_QIAN(qian.js) 提供签数据；DOM 结构由 lingqian.html 提供。
   设计：起签(凝神) → 摇签(翻涌) → 落签/揭晓(卷轴展开) → 定签。 */
(function (root) {
  'use strict';

  var TIMING = {
    charge: 480,   // 起签：金光升腾
    roll: 1500,    // 摇签：筒身摇振 + 签影翻滚
    reveal: 560,   // 揭晓：卷轴展开
    lineGap: 60    // 结果各行错峰上浮间隔
  };

  function prefersReduced() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
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
  }

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

  Anim.prototype._cls = function (el, c, on) {
    if (el) el.classList[on ? 'add' : 'remove'](c);
  };

  // 清理上一次揭晓残留，保证可重复触发时动画重播
  Anim.prototype._resetReveal = function () {
    var e = this.els;
    this._cls(e.result, 'scroll-open', false);
    this._cls(e.tube, 'is-rise', false);
    if (e.lines) {
      e.lines.forEach(function (ln) {
        ln.classList.remove('reveal-line');
        ln.style.animationDelay = '';
      });
    }
    if (e.result) e.result.classList.add('is-hidden');
  };

  Anim.prototype.run = function () {
    if (this.busy) return; // 防重复触发
    this.busy = true;
    this.state = 'starting';
    var e = this.els, self = this;

    this._resetReveal();
    this.q = this.getQian(); // 天机早定：动画开始前抽签，揭晓时展示

    if (e.btn) e.btn.disabled = true;
    if (this.hooks.onStart) this.hooks.onStart(this.q);

    if (this.reduce) { this._reveal(); return; }

    this._cls(e.tube, 'is-charging', true);

    this._t(function () {
      this.state = 'rolling';
      this._cls(e.tube, 'is-charging', false);
      this._cls(e.tube, 'is-shaking', true);
      this._cls(e.shuffle, 'is-rolling', true);
      if (this.hooks.onRolling) this.hooks.onRolling(this.q);
    }, TIMING.charge);

    this._t(function () {
      this.state = 'revealing';
      this._cls(e.tube, 'is-shaking', false);
      this._cls(e.shuffle, 'is-rolling', false);
      this._cls(e.tube, 'is-rise', true);
      this._reveal();
    }, TIMING.charge + TIMING.roll);
  };

  Anim.prototype._reveal = function () {
    var e = this.els, self = this;
    if (this.hooks.onReveal) this.hooks.onReveal(this.q);

    if (e.result) {
      e.result.classList.remove('is-hidden');
      requestAnimationFrame(function () { self._cls(e.result, 'scroll-open', true); });
    }
    if (e.lines && e.lines.length) {
      e.lines.forEach(function (ln) { ln.classList.remove('reveal-line'); });
      void (e.result ? e.result.offsetWidth : 0); // 强制重排，确保动画重播
      e.lines.forEach(function (ln, i) {
        ln.style.animationDelay = (i * self.constructor.TIMING.lineGap) + 'ms';
        ln.classList.add('reveal-line');
      });
    }

    var tail = TIMING.reveal + (e.lines ? e.lines.length * TIMING.lineGap : 0);
    this._t(function () {
      this._cls(e.tube, 'is-rise', false);
      this.state = 'done';
      this.busy = false;
      if (e.btn) { e.btn.disabled = false; e.btn.textContent = '再求一签'; }
      if (this.hooks.onComplete) this.hooks.onComplete(this.q);
    }, tail);
  };

  // 中断：清理所有计时与动画类，回到 idle，避免中断异常
  Anim.prototype.cancel = function () {
    if (!this.busy && this.state === 'idle') return;
    this._clearTimers();
    var e = this.els;
    ['is-charging', 'is-shaking', 'is-rise'].forEach(function (c) { this._cls(e.tube, c, false); }, this);
    this._cls(e.shuffle, 'is-rolling', false);
    this._cls(e.result, 'scroll-open', false);
    this.state = 'idle';
    this.busy = false;
    if (this.hooks.onCancel) this.hooks.onCancel();
  };

  root.XJ_QIAN_ANIM = { Anim: Anim, TIMING: TIMING };
})(typeof window !== 'undefined' ? window : globalThis);
