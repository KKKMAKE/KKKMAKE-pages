/* ==========================================================================
   script.js —— 全站交互脚本

   这个文件负责六件事：
     1. 导航栏：滚动后加底边框、高亮当前板块、手机端汉堡菜单开合
     2. 滚动淡入：内容滚动到视野时才淡入出现
     3. 数字动画：统计区的数字滚动到此才从 0 跳到目标值
     4. 技能进度条：滚动到视野时条形才长出来
     5. 作品筛选：点分类按钮显示 / 隐藏对应卡片
     6. 表单校验：检查填写是否合规并给出提示。
        默认是「演示模式」，不会真的发出内容；
        当你在 HTML 的 <form> 上填了 action 属性后，它会自动切换成真正提交。

   【重要】这个文件用的是最传统的写法，不需要联网、不需要安装任何东西，
          双击 index.html 就能正常运行。一般情况下你不需要改它。
   ========================================================================== */

/* 用一个立即执行函数把所有代码包起来，避免变量名污染全局 */
(function () {
  "use strict";

  /* ---------------------------------------------------------------
     小工具函数
     --------------------------------------------------------------- */

  /**
   * 判断用户是否在系统里开启了「减少动态效果」。
   * @returns {boolean} true 表示应该关掉动画
   */
  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  /**
   * 安全地取 DOM 里的值并转成整数，取不到就用默认值。
   * @param {Element} el 元素
   * @param {string} attr 属性名
   * @param {number} fallback 取不到时的默认值
   * @returns {number} 整数
   */
  function readIntAttr(el, attr, fallback) {
    var raw = el.getAttribute(attr);
    var num = parseInt(raw, 10);
    return isNaN(num) ? fallback : num;
  }

  /* ---------------------------------------------------------------
     1. 导航栏
     --------------------------------------------------------------- */

  /**
   * 初始化导航相关行为：滚动底边框、返回顶部按钮、顶部进度条。
   * @returns {void}
   */
  function initHeader() {
    var header = document.getElementById("siteHeader");
    var progressBar = document.getElementById("scrollProgressBar");
    var toTopBtn = document.getElementById("toTop");

    /**
     * 页面滚动时统一处理。
     * @returns {void}
     */
    function onScroll() {
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;

      if (header) {
        if (y > 10) {
          header.classList.add("is-scrolled");
        } else {
          header.classList.remove("is-scrolled");
        }
      }

      if (toTopBtn) {
        // 滚过一屏高度才显示返回顶部按钮
        if (y > window.innerHeight * 0.7) {
          toTopBtn.classList.add("is-visible");
        } else {
          toTopBtn.classList.remove("is-visible");
        }
      }

      if (progressBar) {
        // 用节流思路防抖这里不需要：计算很轻
        var total = document.documentElement.scrollHeight - window.innerHeight;
        var percent = total > 0 ? (y / total) * 100 : 0;
        if (percent < 0) { percent = 0; }
        if (percent > 100) { percent = 100; }
        progressBar.style.width = percent.toFixed(2) + "%";
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll(); // 页面刚打开时先算一次

    // 返回顶部按钮：平滑滚回顶部
    if (toTopBtn) {
      toTopBtn.addEventListener("click", function () {
        window.scrollTo({
          top: 0,
          behavior: prefersReducedMotion() ? "auto" : "smooth"
        });
      });
    }
  }

  /**
   * 手机端汉堡菜单的开合。
   * @returns {void}
   */
  function initNavToggle() {
    var toggle = document.getElementById("navToggle");
    var nav = document.getElementById("primaryNav");

    if (!toggle || !nav) { return; }

    /**
     * 设置菜单展开还是收起。
     * @param {boolean} open true 为展开
     * @returns {void}
     */
    function setOpen(open) {
      if (open) {
        nav.classList.add("is-open");
        toggle.classList.add("is-open");
        toggle.setAttribute("aria-expanded", "true");
        toggle.setAttribute("aria-label", "关闭菜单");
      } else {
        nav.classList.remove("is-open");
        toggle.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "打开菜单");
      }
    }

    toggle.addEventListener("click", function () {
      setOpen(!nav.classList.contains("is-open"));
    });

    // 点了菜单里的任意链接就自动收起，方便看内容
    var links = nav.querySelectorAll(".nav-link");
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener("click", function () {
        setOpen(false);
      });
    }

    // 按 Esc 也能关掉菜单
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });

    // 窗口变宽回到桌面布局时，把菜单状态清掉，避免残留
    window.addEventListener("resize", function () {
      if (window.innerWidth > 768 && nav.classList.contains("is-open")) {
        setOpen(false);
      }
    });
  }

  /**
   * 滚动到某个板块时，给对应的导航链接加高亮。
   * @returns {void}
   */
  function initScrollSpy() {
    var links = document.querySelectorAll(".nav-link");
    if (links.length === 0) { return; }

    // 收集导航链接指向的板块 id
    var items = [];
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute("href") || "";
      if (href.charAt(0) !== "#" || href.length < 2) { continue; }
      var target = document.getElementById(href.substring(1));
      if (target) {
        items.push({ link: links[i], section: target });
      }
    }

    if (items.length === 0) { return; }

    /**
     * 根据当前滚动位置，算出哪个板块应该高亮。
     * @returns {void}
     */
    function update() {
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      // 判定线：视口上方三分之一处
      var line = y + window.innerHeight * 0.34;
      var activeIndex = -1;

      for (var i = 0; i < items.length; i++) {
        if (items[i].section.offsetTop <= line) {
          activeIndex = i;
        }
      }

      for (var j = 0; j < items.length; j++) {
        if (j === activeIndex) {
          items[j].link.classList.add("is-current");
        } else {
          items[j].link.classList.remove("is-current");
        }
      }
    }

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ---------------------------------------------------------------
     2. 滚动淡入
     --------------------------------------------------------------- */

  /**
   * 让带 .reveal 类的元素滚动到视野时淡入。
   * 浏览器不支持 IntersectionObserver 时，直接全部显示，不影响阅读。
   * @returns {void}
   */
  function initReveal() {
    var targets = document.querySelectorAll(".reveal");
    if (targets.length === 0) { return; }

    // 用户要求减少动态效果：直接显示，不做动画
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      for (var i = 0; i < targets.length; i++) {
        targets[i].classList.add("is-revealed");
      }
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          // 只播一次，播完就不再观察，省性能
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: "0px 0px -40px 0px"
    });

    for (var j = 0; j < targets.length; j++) {
      observer.observe(targets[j]);
    }
  }

  /* ---------------------------------------------------------------
     3. 数字滚动动画
     --------------------------------------------------------------- */

  /**
   * 统计区数字从 0 递增到目标值，滚动到视野时才触发。
   * @returns {void}
   */
  function initCounters() {
    var counters = document.querySelectorAll(".stat-num");
    if (counters.length === 0) { return; }

    /**
     * 让某一个数字动起来。
     * @param {Element} el 数字所在元素
     * @returns {void}
     */
    function animate(el) {
      var target = readIntAttr(el, "data-count", 0);
      var suffix = el.getAttribute("data-suffix") || "";

      // 尊重「减少动态效果」设置
      if (prefersReducedMotion()) {
        el.textContent = target + suffix;
        return;
      }

      var duration = 1400;   // 动画总时长（毫秒）
      var start = 0;         // 起始时间戳
      var rafId = 0;

      /**
       * requestAnimationFrame 的每一帧回调。
       * @param {number} timestamp 当前时间戳
       * @returns {void}
       */
      function step(timestamp) {
        if (!start) { start = timestamp; }
        var progress = (timestamp - start) / duration;
        if (progress > 1) { progress = 1; }

        // easeOutCubic：先快后慢，收尾自然
        var eased = 1 - Math.pow(1 - progress, 3);
        var current = Math.round(target * eased);
        el.textContent = current + suffix;

        if (progress < 1) {
          rafId = window.requestAnimationFrame(step);
        } else {
          el.textContent = target + suffix; // 收尾对齐，避免取整误差
        }
      }

      rafId = window.requestAnimationFrame(step);
      // 保存 id，便于将来清理（当前动画只跑一次，保留变量以便维护）
      el.setAttribute("data-raf", String(rafId));
    }

    if (!("IntersectionObserver" in window)) {
      for (var i = 0; i < counters.length; i++) {
        animate(counters[i]);
      }
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animate(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.45 });

    for (var j = 0; j < counters.length; j++) {
      observer.observe(counters[j]);
    }
  }

  /* ---------------------------------------------------------------
     4. 技能进度条
     --------------------------------------------------------------- */

  /**
   * 技能进度条滚动到视野时，按 data-level 的值长出来。
   * @returns {void}
   */
  function initSkillBars() {
    var bars = document.querySelectorAll(".skill-fill");
    if (bars.length === 0) { return; }

    /**
     * 把一根进度条设到目标长度。
     * @param {Element} el 进度条元素
     * @returns {void}
     */
    function fill(el) {
      var level = readIntAttr(el, "data-level", 0);
      if (level < 0) { level = 0; }
      if (level > 100) { level = 100; }

      if (prefersReducedMotion()) {
        // 减少动效时直接到位，但仍然等一小会儿让眼睛跟上
        el.style.width = level + "%";
        return;
      }

      // 加一点点延迟，视觉上更有节奏
      window.setTimeout(function () {
        el.style.width = level + "%";
      }, 120);
    }

    if (!("IntersectionObserver" in window)) {
      for (var i = 0; i < bars.length; i++) {
        fill(bars[i]);
      }
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          fill(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });

    for (var j = 0; j < bars.length; j++) {
      observer.observe(bars[j]);
    }
  }

  /* ---------------------------------------------------------------
     5. 作品分类筛选
     --------------------------------------------------------------- */

  /**
   * 作品区的分类筛选按钮。
   * 改类别时注意：按钮的 data-filter 必须和卡片的 data-category 一致，
   * data-filter="all" 表示显示全部。
   * @returns {void}
   */
  function initWorkFilter() {
    var buttons = document.querySelectorAll(".filter-btn");
    var grid = document.getElementById("worksGrid");
    var emptyTip = document.getElementById("filterEmpty");

    if (buttons.length === 0 || !grid) { return; }

    var cards = grid.querySelectorAll(".work-card");

    /**
     * 按给定分类筛选卡片。
     * @param {string} category 分类名，"all" 表示全部
     * @returns {void}
     */
    function applyFilter(category) {
      var visibleCount = 0;

      for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        var cardCategory = card.getAttribute("data-category") || "";

        if (category === "all" || cardCategory === category) {
          card.classList.remove("is-hidden");
          visibleCount += 1;
        } else {
          card.classList.add("is-hidden");
        }
      }

      // 一份分类都没有时给句提示
      if (emptyTip) {
        if (visibleCount === 0) {
          emptyTip.hidden = false;
        } else {
          emptyTip.hidden = true;
        }
      }
    }

    for (var k = 0; k < buttons.length; k++) {
      buttons[k].addEventListener("click", function () {
        // 先把所有按钮取消选中
        for (var m = 0; m < buttons.length; m++) {
          buttons[m].classList.remove("is-active");
        }
        // 再选中当前点到的这个
        this.classList.add("is-active");

        var filter = this.getAttribute("data-filter") || "all";
        applyFilter(filter);
      });
    }
  }

  /* ---------------------------------------------------------------
     6. 联系表单校验
     --------------------------------------------------------------- */

  /**
   * 判断一个字符串是不是合法的邮箱格式（基础判断，够用即可）。
   * @param {string} value 待检查的字符串
   * @returns {boolean} 合法返回 true
   */
  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
  }

  /**
   * 显示某个字段的错误提示。
   * @param {Element} input 输入框
   * @param {Element} errorTip 提示元素
   * @param {string} message 提示文字
   * @returns {void}
   */
  function showFieldError(input, errorTip, message) {
    input.classList.add("has-error");
    if (errorTip) {
      errorTip.textContent = message;
      errorTip.hidden = false;
    }
  }

  /**
   * 清除某个字段的错误提示。
   * @param {Element} input 输入框
   * @param {Element} errorTip 提示元素
   * @returns {void}
   */
  function clearFieldError(input, errorTip) {
    input.classList.remove("has-error");
    if (errorTip) {
      errorTip.hidden = true;
    }
  }

  /**
   * 初始化联系表单的校验与提交。
   * 两种模式，自动判断：
   *   演示模式（默认）：<form> 上没有 action，只提示、不发送；
   *   真实模式：<form> 上填了 action（例如 Formspree 的地址），校验通过后真的提交。
   * @returns {void}
   */
  function initContactForm() {
    var form = document.getElementById("contactForm");
    if (!form) { return; }

    var nameInput = document.getElementById("formName");
    var emailInput = document.getElementById("formEmail");
    var messageInput = document.getElementById("formMessage");

    var nameError = document.getElementById("errName");
    var emailError = document.getElementById("errEmail");
    var messageError = document.getElementById("errMessage");

    var notice = document.getElementById("formNotice");
    var noticeText = document.getElementById("formNoticeText");

    // 任何一个元素缺失就直接退出，避免报错
    if (!nameInput || !emailInput || !messageInput) { return; }

    /**
     * 在提示框里显示一段文字。
     * @param {string} text 提示文字
     * @param {boolean} isSuccess true 表示成功样式，false 表示错误样式
     * @returns {void}
     */
    function setNotice(text, isSuccess) {
      if (!notice) { return; }
      notice.hidden = false;
      notice.classList.remove("is-success", "is-error");
      notice.classList.add(isSuccess ? "is-success" : "is-error");
      if (noticeText) {
        noticeText.textContent = text;
      }
    }

    /**
     * 隐藏提示框。
     * @returns {void}
     */
    function hideNotice() {
      if (notice) {
        notice.hidden = true;
        notice.classList.remove("is-success", "is-error");
      }
    }

    // 用户重新输入时，立刻清掉这一项的错误提示
    var watched = [
      { input: nameInput, error: nameError },
      { input: emailInput, error: emailError },
      { input: messageInput, error: messageError }
    ];

    for (var i = 0; i < watched.length; i++) {
      (function (item) {
        item.input.addEventListener("input", function () {
          clearFieldError(item.input, item.error);
        });
      })(watched[i]);
    }

    form.addEventListener("submit", function (event) {
      // 阻止浏览器默认的提交跳转
      event.preventDefault();

      var name = nameInput.value.trim();
      var email = emailInput.value.trim();
      var message = messageInput.value.trim();
      var ok = true;
      var firstInvalid = null;

      // 校验：姓名
      if (name.length < 2) {
        showFieldError(nameInput, nameError, "请填写你的名字（至少 2 个字）");
        ok = false;
        firstInvalid = firstInvalid || nameInput;
      } else {
        clearFieldError(nameInput, nameError);
      }

      // 校验：邮箱
      if (!isEmail(email)) {
        showFieldError(emailInput, emailError, "请填写正确的邮箱格式，例如 you@example.com");
        ok = false;
        firstInvalid = firstInvalid || emailInput;
      } else {
        clearFieldError(emailInput, emailError);
      }

      // 校验：留言
      if (message.length < 10) {
        showFieldError(messageInput, messageError, "请至少写 10 个字，方便我了解你的需求");
        ok = false;
        firstInvalid = firstInvalid || messageInput;
      } else {
        clearFieldError(messageInput, messageError);
      }

      if (!ok) {
        if (firstInvalid) {
          firstInvalid.focus();
        }
        setNotice("还有几项没填对，请检查一下上面的输入框。", false);
        return;
      }

      // 校验通过后的处理，分两种情况：
      //   A. <form> 上填了 action（例如接上了 Formspree 之类的免费表单服务）
      //      → 直接调用浏览器原生提交，把内容真正发出去；
      //   B. 没填 action → 保持演示状态，只给一个友好提示，不发任何请求。
      var action = form.getAttribute("action");
      var hasRealAction = !!action && action.trim() !== "" && action.trim().charAt(0) !== "#";

      if (hasRealAction) {
        // 原生 submit() 不会再次触发 submit 事件，不会造成死循环
        setNotice("正在发送，请稍等……", true);
        form.submit();
        return;
      }

      // 演示模式：给出成功提示，并清空表单
      setNotice("发送成功！这是演示效果，内容并没有真的发送出去。要真正接收留言，请看 README.md 里的说明。", true);
      form.reset();

      // 8 秒后自动收起提示
      window.setTimeout(function () {
        hideNotice();
      }, 8000);
    });
  }

  /* ---------------------------------------------------------------
     启动：等 DOM 全部就绪后再逐个初始化，并忽略单个模块的报错，
           保证出问题也不会让其它功能跟着一起坏掉。
     --------------------------------------------------------------- */
  function boot() {
    var tasks = [
      initHeader,
      initNavToggle,
      initScrollSpy,
      initReveal,
      initCounters,
      initSkillBars,
      initWorkFilter,
      initContactForm
    ];

    for (var i = 0; i < tasks.length; i++) {
      try {
        tasks[i]();
      } catch (err) {
        // 某个功能出错时只在控制台留个记录，页面其余部分照常工作
        if (window.console && window.console.warn) {
          window.console.warn("[site] 某个初始化步骤出错了：", err);
        }
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
