(() => {
  "use strict";

  const body = document.body;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const previewParams = new URLSearchParams(window.location.search);
  const automatedPreview = previewParams.has("preview");

  // Short system-style intro. It never blocks the page for more than a moment.
  const bootPercent = document.querySelector("[data-boot-percent]");
  const bootTrack = document.querySelector(".boot__track span");
  const bootWord = document.querySelector("[data-boot-word]");
  const bootWords = ["PARSE", "THINK", "MAKE", "AYOOSH"];

  const completeBoot = () => {
    body.classList.add("is-ready");
    window.setTimeout(() => body.classList.remove("is-loading"), reducedMotion ? 20 : 900);
  };

  // Automated previews skip the cover so visual checks see the actual page.
  if (automatedPreview) {
    document.querySelector(".boot")?.remove();
    document.documentElement.style.scrollBehavior = "auto";
    body.classList.add("is-ready", "is-preview");
    body.classList.remove("is-loading");
    const previewTarget = document.getElementById(previewParams.get("preview"));
    previewTarget?.scrollIntoView({ block: "start" });
  } else if (reducedMotion) {
    if (bootPercent) bootPercent.textContent = "100%";
    if (bootTrack) bootTrack.style.width = "100%";
    completeBoot();
  } else {
    const startTime = performance.now();
    const bootDuration = 720;

    const updateBoot = (time) => {
      const progress = Math.min((time - startTime) / bootDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(eased * 100);

      if (bootPercent) bootPercent.textContent = `${String(value).padStart(2, "0")}%`;
      if (bootTrack) bootTrack.style.width = `${value}%`;
      if (bootWord) {
        const wordIndex = Math.min(Math.floor(progress * bootWords.length), bootWords.length - 1);
        bootWord.textContent = bootWords[wordIndex];
      }

      if (progress < 1) {
        requestAnimationFrame(updateBoot);
      } else {
        window.setTimeout(completeBoot, 120);
      }
    };

    requestAnimationFrame(updateBoot);
  }

  // Navigation and compact header.
  const header = document.querySelector("[data-header]");
  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-nav");
  const navLinks = document.querySelectorAll(".site-nav a");

  const updateHeader = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 28);
  };

  const closeNav = () => {
    navToggle?.setAttribute("aria-expanded", "false");
    nav?.classList.remove("is-open");
    body.classList.remove("nav-open");
    if (!body.classList.contains("is-loading")) body.style.overflow = "";
  };

  const openNav = () => {
    navToggle?.setAttribute("aria-expanded", "true");
    nav?.classList.add("is-open");
    body.classList.add("nav-open");
    body.style.overflow = "hidden";
  };

  navToggle?.addEventListener("click", () => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    isOpen ? closeNav() : openNav();
  });

  navLinks.forEach((link) => link.addEventListener("click", closeNav));
  window.addEventListener("scroll", updateHeader, { passive: true });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) closeNav();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeNav();
  });
  updateHeader();

  // Reveal sections as they enter the viewport.
  const revealItems = document.querySelectorAll("[data-reveal]");

  if (automatedPreview || reducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -9%", threshold: 0.08 },
    );

    revealItems.forEach((item) => revealObserver.observe(item));
  }

  // Keep one project detail open at a time for a cleaner index.
  const projectDetails = document.querySelectorAll(".project-row");
  projectDetails.forEach((detail) => {
    detail.addEventListener("toggle", () => {
      if (!detail.open) return;
      projectDetails.forEach((other) => {
        if (other !== detail) other.removeAttribute("open");
      });
    });
  });

  // Desktop cursor and restrained magnetic feedback.
  const finePointer = window.matchMedia("(pointer: fine)");
  const cursorDot = document.querySelector(".cursor-dot");
  const cursorRing = document.querySelector(".cursor-ring");
  let pointerX = window.innerWidth / 2;
  let pointerY = window.innerHeight / 2;
  let ringX = pointerX;
  let ringY = pointerY;
  let cursorFrame;

  const renderCursor = () => {
    ringX += (pointerX - ringX) * 0.16;
    ringY += (pointerY - ringY) * 0.16;

    if (cursorDot) {
      cursorDot.style.left = `${pointerX}px`;
      cursorDot.style.top = `${pointerY}px`;
    }
    if (cursorRing) {
      cursorRing.style.left = `${ringX}px`;
      cursorRing.style.top = `${ringY}px`;
    }

    cursorFrame = requestAnimationFrame(renderCursor);
  };

  if (finePointer.matches && !reducedMotion) {
    body.classList.add("has-custom-cursor");
    window.addEventListener(
      "mousemove",
      (event) => {
        pointerX = event.clientX;
        pointerY = event.clientY;
      },
      { passive: true },
    );

    document.querySelectorAll("a, button, summary").forEach((item) => {
      item.addEventListener("mouseenter", () => body.classList.add("cursor-hover"));
      item.addEventListener("mouseleave", () => body.classList.remove("cursor-hover"));
    });

    cursorFrame = requestAnimationFrame(renderCursor);
  }

  finePointer.addEventListener?.("change", (event) => {
    if (!event.matches) {
      body.classList.remove("has-custom-cursor", "cursor-hover");
      cancelAnimationFrame(cursorFrame);
    }
  });

  document.querySelectorAll(".magnetic").forEach((element) => {
    element.addEventListener("mousemove", (event) => {
      if (!finePointer.matches || reducedMotion) return;
      const bounds = element.getBoundingClientRect();
      const x = event.clientX - bounds.left - bounds.width / 2;
      const y = event.clientY - bounds.top - bounds.height / 2;
      element.style.transform = `translate(${x * 0.1}px, ${y * 0.12}px)`;
    });

    element.addEventListener("mouseleave", () => {
      element.style.transform = "";
    });
  });

  // Small depth response in the hero's system graphic.
  const hero = document.querySelector(".hero");
  const signal = document.querySelector("[data-signal]");

  hero?.addEventListener("pointermove", (event) => {
    if (!signal || reducedMotion || !finePointer.matches) return;
    const x = (event.clientX / window.innerWidth - 0.5) * 16;
    const y = (event.clientY / window.innerHeight - 0.5) * 16;
    signal.style.transform = `translate(${x}px, ${y}px)`;
  });

  hero?.addEventListener("pointerleave", () => {
    if (signal) signal.style.transform = "";
  });

  const year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
})();
