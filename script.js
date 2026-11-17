/* =========================================================
   OGZ «SAKARTVELO» — интерактив и переключение языков
   ========================================================= */

(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const wideScreen = window.matchMedia("(min-width: 1025px)").matches;

  let lang = "ru";
  try {
    const saved = localStorage.getItem("ogz-lang");
    if (saved === "en" || saved === "ka" || saved === "ru") lang = saved;
  } catch (e) {}

  const dict = () => (window.OGZ_I18N && window.OGZ_I18N[lang]) || {};

  const t = (path, fallback = "") => {
    const value = path.split(".").reduce((obj, key) => (obj == null ? obj : obj[key]), dict());
    return typeof value === "string" ? value : fallback;
  };

  /* ---------- часы Тбилиси ---------- */
  const clockEl = $("#clock");
  const clockFmt = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Tbilisi",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const updateClock = () => {
    if (clockEl) clockEl.textContent = `${t("header.clock", "TBILISI")} ${clockFmt.format(new Date())}`;
  };

  /* ---------- язык ---------- */
  const langButtons = $$("[data-lang]");
  let currentUnit = null;
  let modalOpen = false;

  const applyLanguage = (nextLang, persist = true) => {
    if (!window.OGZ_I18N || !window.OGZ_I18N[nextLang]) return;
    lang = nextLang;

    if (persist) {
      try { localStorage.setItem("ogz-lang", lang); } catch (e) {}
    }

    document.documentElement.lang = lang;

    $$("[data-i18n]").forEach((el) => {
      const value = t(el.dataset.i18n);
      if (value) el.textContent = value;
    });

    $$("[data-i18n-ph]").forEach((el) => {
      const value = t(el.dataset.i18nPh);
      if (value) el.setAttribute("placeholder", value);
    });

    $$("[data-i18n-aria]").forEach((el) => {
      const value = t(el.dataset.i18nAria);
      if (value) el.setAttribute("aria-label", value);
    });

    document.title = t("meta.title", document.title);
    const metaDesc = $('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", t("meta.desc", metaDesc.content));

    const burger = $("#burger");
    if (burger) burger.setAttribute("aria-label", t("header.menu", "Меню"));

    langButtons.forEach((btn) => {
      const active = btn.dataset.lang === lang;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });

    updateClock();

    if (modalOpen && currentUnit) renderModal(currentUnit);
  };

  langButtons.forEach((btn) => {
    btn.addEventListener("click", () => applyLanguage(btn.dataset.lang));
  });

  /* ---------- шапка, прогресс, наверх ---------- */
  const header = $("#header");
  const scrollBar = $("#scrollBar");
  const toTop = $("#toTop");
  let scrollTick = false;

  const onScroll = () => {
    const y = window.scrollY;
    if (header) header.classList.toggle("scrolled", y > 24);

    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollBar) scrollBar.style.width = `${max > 0 ? Math.min(100, (y / max) * 100) : 0}%`;
    if (toTop) toTop.classList.toggle("show", y > 700);

    scrollTick = false;
  };

  window.addEventListener("scroll", () => {
    if (scrollTick) return;
    scrollTick = true;
    requestAnimationFrame(onScroll);
  }, { passive: true });

  toTop && toTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  });

  /* ---------- мобильное меню ---------- */
  const burger = $("#burger");
  const nav = $("#nav");

  const closeMenu = () => {
    if (!nav || !nav.classList.contains("open")) return;
    nav.classList.remove("open");
    burger && burger.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
    if (burger) burger.setAttribute("aria-label", t("header.menu", "Меню"));
  };

  if (burger && nav) {
    burger.addEventListener("click", () => {
      const open = !nav.classList.contains("open");
      nav.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("menu-open", open);
      burger.setAttribute("aria-label", open ? "✕" : t("header.menu", "Меню"));
    });

    $$("a", nav).forEach((a) => a.addEventListener("click", closeMenu));

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
  }

  /* ---------- появление при скролле ---------- */
  const revealItems = $$("[data-reveal]");
  $$(".stagger").forEach((group) => {
    [...group.children].forEach((child, i) => child.style.setProperty("--i", i));
  });

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((el) => el.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -50px 0px" });

    revealItems.forEach((el) => revealObserver.observe(el));
  }

  /* ---------- счётчики ---------- */
  const counters = $$("[data-count]");

  const finishCounter = (el) => {
    el.textContent = el.dataset.count + (el.dataset.suffix || "");
  };

  const animateCount = (el) => {
    const target = Number(el.dataset.count || 0);
    const suffix = el.dataset.suffix || "";
    const duration = 1500;
    const start = performance.now();

    const step = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  if (counters.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      counters.forEach(finishCounter);
    } else {
      const countObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCount(entry.target);
          countObserver.unobserve(entry.target);
        });
      }, { threshold: 0.4 });

      counters.forEach((el) => countObserver.observe(el));
    }
  }

  /* ---------- шкалы подготовки ---------- */
  const bars = $$(".bar__fill");
  if (bars.length) {
    const setBar = (el) => { el.style.width = `${el.dataset.value || 0}%`; };

    if ("IntersectionObserver" in window) {
      const barObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          setTimeout(() => setBar(entry.target), 120);
          barObserver.unobserve(entry.target);
        });
      }, { threshold: 0.35 });

      bars.forEach((el) => barObserver.observe(el));
    } else {
      bars.forEach(setBar);
    }
  }

  /* ---------- активный пункт меню ---------- */
  const sections = $$("main section[id]");
  if (sections.length && "IntersectionObserver" in window) {
    const navLinks = $$(".nav__link");
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
        });
      });
    }, { rootMargin: "-42% 0px -52% 0px", threshold: 0 });

    sections.forEach((s) => sectionObserver.observe(s));
  }

  /* ---------- свечение карточек за курсором ---------- */
  if (finePointer && !reduceMotion) {
    $$(".unit").forEach((card) => {
      let frame = 0;
      let px = 50;
      let py = 0;

      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        px = ((e.clientX - r.left) / r.width) * 100;
        py = ((e.clientY - r.top) / r.height) * 100;
        if (frame) return;
        frame = requestAnimationFrame(() => {
          card.style.setProperty("--mx", `${px}%`);
          card.style.setProperty("--my", `${py}%`);
          frame = 0;
        });
      }, { passive: true });
    });
  }

  /* ---------- параллакс эмблемы ---------- */
  if (finePointer && wideScreen && !reduceMotion) {
    const hero = $("#hero");
    const visual = $(".hero__visual");
    if (hero && visual) {
      let frame = 0;
      let tx = 0;
      let ty = 0;

      hero.addEventListener("pointermove", (e) => {
        const r = hero.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * -18;
        ty = ((e.clientY - r.top) / r.height - 0.5) * -14;
        if (frame) return;
        frame = requestAnimationFrame(() => {
          visual.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
          frame = 0;
        });
      }, { passive: true });

      hero.addEventListener("pointerleave", () => { visual.style.transform = ""; });
    }
  }

  /* ---------- кастомный курсор ---------- */
  if (finePointer && wideScreen && !reduceMotion) {
    const cursor = $("#cursor");
    if (cursor) {
      document.body.classList.add("has-cursor");
      let x = -100;
      let y = -100;
      let frame = 0;

      const paint = () => {
        cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        frame = 0;
      };

      document.addEventListener("pointermove", (e) => {
        x = e.clientX;
        y = e.clientY;
        cursor.style.opacity = "1";
        cursor.classList.toggle(
          "is-hover",
          !!e.target.closest("a, button, .unit, .feature, .faq__q, input, select, textarea, label")
        );
        if (!frame) frame = requestAnimationFrame(paint);
      }, { passive: true });

      document.addEventListener("mouseleave", () => { cursor.style.opacity = "0"; });
      document.addEventListener("mouseenter", () => { cursor.style.opacity = "1"; });
    }
  }

  /* ---------- модальное окно подразделения ---------- */
  const modal = $("#unitModal");
  const modalBody = $("#modalBody");
  let lastFocused = null;

  const escapeHtml = (str) => String(str).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));

  const getUnit = (key) => (dict().unit && dict().unit[key]) || null;

  const renderModal = (key) => {
    const unit = getUnit(key);
    if (!unit || !modalBody) return;

    const facts = [
      [t("modal.founded"), unit.founded],
      [t("modal.base"), unit.city],
      [t("modal.operators"), unit.staff],
      [t("modal.operations"), unit.ops],
    ];

    modalBody.innerHTML = `
      <p class="modal__eyebrow">${escapeHtml(t("modal.eyebrow"))}</p>
      <h3 class="modal__title" id="modalTitle">${escapeHtml(unit.name)}</h3>
      <p class="modal__role">${escapeHtml(unit.role)}</p>
      <div class="modal__motto">${escapeHtml(unit.motto)}<em>${escapeHtml(unit.mottoTr)}</em></div>
      <p class="modal__desc">${escapeHtml(unit.desc)}</p>
      <div class="modal__facts">
        ${facts.map(([label, value]) => `
          <div class="modal__fact"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>
        `).join("")}
      </div>
      <div class="tags modal__tags">${unit.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
      <div class="modal__actions">
        <a href="#join" class="btn btn--primary" data-close><span>${escapeHtml(t("modal.apply"))}</span> <span class="btn__arrow">→</span></a>
      </div>
    `;
  };

  const openUnit = (key) => {
    if (!modal || !getUnit(key)) return;
    currentUnit = key;
    modalOpen = true;
    lastFocused = document.activeElement;

    renderModal(key);
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    const closeBtn = $(".modal__close", modal);
    closeBtn && closeBtn.focus({ preventScroll: true });
  };

  const closeModal = () => {
    if (!modal || !modal.classList.contains("open")) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    modalOpen = false;
    if (lastFocused && lastFocused.focus) lastFocused.focus({ preventScroll: true });
  };

  $$("[data-open]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openUnit(btn.dataset.open);
    });
  });

  $$(".unit").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("[data-open]")) return;
      if (card.dataset.unit) openUnit(card.dataset.unit);
    });
  });

  modal && modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  /* ---------- FAQ ---------- */
  $$(".faq__item").forEach((item) => {
    const btn = $(".faq__q", item);
    if (!btn) return;

    btn.addEventListener("click", () => {
      const isOpen = item.classList.contains("open");

      $$(".faq__item.open").forEach((other) => {
        other.classList.remove("open");
        const q = $(".faq__q", other);
        q && q.setAttribute("aria-expanded", "false");
      });

      if (!isOpen) {
        item.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
      }
    });
  });

  /* ---------- форма ---------- */
  const form = $("#joinForm");
  const toast = $("#toast");
  const toastText = $("#toastText");
  let toastTimer = null;

  const showToast = (message, isError = false) => {
    if (!toast || !toastText) return;
    toastText.textContent = message;
    toast.classList.toggle("is-error", isError);
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 4200);
  };

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const fields = $$("input[required], select[required], textarea[required]", form);
      let valid = true;

      fields.forEach((field) => {
        const ok = field.type === "checkbox" ? field.checked : field.value.trim() !== "";
        field.classList.toggle("invalid", !ok);
        if (!ok) valid = false;
      });

      if (!valid) {
        showToast(t("toast.error"), true);
        const firstBad = fields.find((f) => f.classList.contains("invalid"));
        firstBad && firstBad.focus({ preventScroll: false });
        return;
      }

      const nick = form.elements.nick.value.trim();
      form.reset();
      $$(".invalid", form).forEach((el) => el.classList.remove("invalid"));
      showToast(t("toast.success").replace("{nick}", nick));
    });

    $$("input, select, textarea", form).forEach((field) => {
      const clear = () => field.classList.remove("invalid");
      field.addEventListener("input", clear);
      field.addEventListener("change", clear);
    });
  }

  /* ---------- плавный скролл ---------- */
  $$('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;

      e.preventDefault();
      closeMenu();

      const top = target.getBoundingClientRect().top + window.scrollY - 76;
      window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
      history.replaceState(null, "", id);
    });
  });

  /* ---------- запуск ---------- */
  if ($("#year")) $("#year").textContent = new Date().getFullYear();
  applyLanguage(lang, false);
  updateClock();
  setInterval(updateClock, 30000);

  /* ---------- офлайн-кеш (PWA) ---------- */
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();
