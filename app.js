/* ============================================================
   ONBORDO — app.js
   Sayfa davranışları, sıralı bölüm numaralarıyla:
   1) Nav: sadece sayfanın en tepesindeyken görünür
   2)+3) Feature-scroll: 4 özellikli sticky-scroll vitrin
   4) MacBook scroll: kapak açılma animasyonu
   5) Kapanış grid'i: imleç-takipli ışıklandırma (MagicBento ilhamlı)
   6) Yazma (typewriter) animasyonu — hero başlığı + MacBook metni
   7) Özel imleç — mavi, cartoon SVG
   8) Stats band sayaçları

   Sticky-scroll mekanikleri (2, 4) mobil breakpoint'in (768px)
   üstünde çalışır; altında pin mekaniği tamamen kapanır.
   ============================================================ */

const STICKY_BREAKPOINT = "(min-width: 769px)";
const mq = window.matchMedia(STICKY_BREAKPOINT);

/* -----------------------------------------------------------
   1) NAV GİZLEME / GÖSTERME
   Sadece sayfanın en tepesindeyken görünür. Aşağı indikten sonra
   yukarı kaydırıldığında GERİ GELMİYOR — yön fark etmiyor, tek
   kriter mevcut scroll konumu (en üstte mi değil mi).
   ----------------------------------------------------------- */
function initNavScroll() {
  const nav = document.querySelector(".nav");
  if (!nav) return;

  let ticking = false;

  function onScroll() {
    const currentY = window.scrollY;
    const atTop = currentY <= nav.offsetHeight;

    nav.classList.toggle("nav--hidden", !atTop);

    ticking = false;
  }

  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(onScroll);
      ticking = true;
    }
  });

  onScroll();
}

/* -----------------------------------------------------------
   2) + 3) FEATURE-SCROLL BÖLÜMÜ (4 özellik)
   Eskisinden farklı olarak burada tek bir sticky panel var;
   içindeki metin + mockup, kullanıcı outer section'ı kaydırdıkça
   birlikte crossfade ile değişiyor. Arka plan hiç değişmiyor.

   Aktif adımın hesaplanması TAMAMEN deterministik:
   getBoundingClientRect ile section'ın viewport'a göre "ne kadar
   kaydırıldığı" ölçülüyor (0 = pin'e yeni girildi, 1 = pin'den
   çıkılıyor), bu oran adım sayısına bölünerek aktif index
   bulunuyor. IntersectionObserver ratio eşiği KULLANILMIYOR —
   bu projede daha önce (4 adımlı eski tasarımda) ratio tabanlı
   yaklaşım erken/rastgele geçişlere yol açmıştı; doğrudan
   geometri ölçümü her ekranda aynı, öngörülebilir sonucu verir.
   ----------------------------------------------------------- */
function initFeatureScroll() {
  const section = document.querySelector("[data-feature-scroll]");
  const navSecondary = document.querySelector(".nav-secondary");
  const nav = document.querySelector(".nav");
  if (!section) return;

  const textItems = Array.from(
    section.querySelectorAll(".feature-scroll__text-item")
  );
  const mockups = Array.from(
    section.querySelectorAll(".feature-scroll__mockup-col .mockup-card")
  );
  const dots = Array.from(section.querySelectorAll(".feature-scroll__dot"));
  const indexLabel = section.querySelector("[data-feature-index]");
  const secondaryLabels = navSecondary
    ? Array.from(navSecondary.querySelectorAll(".nav-secondary__step"))
    : [];

  const STEPS = textItems.length;
  if (!STEPS) return;

  let currentActive = -1;

  function setActive(index) {
    if (index === currentActive) return;
    currentActive = index;
    textItems.forEach((el, i) => el.classList.toggle("is-active", i === index));
    mockups.forEach((el) => {
      el.classList.toggle("is-active", Number(el.dataset.step) === index);
    });
    dots.forEach((el, i) => el.classList.toggle("is-active", i === index));
    secondaryLabels.forEach((el, i) => {
      el.classList.toggle("is-current", i === index);
    });
    if (indexLabel) {
      const current = String(index + 1).padStart(2, "0");
      const total = String(STEPS).padStart(2, "0");
      indexLabel.textContent = `${current} / ${total}`;
    }
  }

  function update() {
    const rect = section.getBoundingClientRect();
    const scrollableDistance = rect.height - window.innerHeight;

    // Section henüz pin mesafesine sahip değilse (çok kısa viewport
    // vb.) ilk adımda sabitle.
    if (scrollableDistance <= 0) {
      setActive(0);
    } else {
      const rawProgress = -rect.top / scrollableDistance;
      const progress = Math.min(Math.max(rawProgress, 0), 1);
      let index = Math.floor(progress * STEPS);
      if (index >= STEPS) index = STEPS - 1;
      if (index < 0) index = 0;
      setActive(index);
    }

    if (navSecondary) {
      const navHeight = nav ? nav.offsetHeight : 0;
      const navLineInsideSection = rect.top <= navHeight && rect.bottom >= navHeight;
      navSecondary.classList.toggle("is-active", navLineInsideSection);
    }
  }

  let ticking = false;
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener("scroll", onScroll);
  window.addEventListener("resize", onScroll);
  update();

  return {
    teardown() {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    },
    reset() {
      currentActive = -1;
      textItems.forEach((el, i) => el.classList.toggle("is-active", i === 0));
      mockups.forEach((el) => {
        el.classList.toggle("is-active", Number(el.dataset.step) === 0);
      });
      dots.forEach((el, i) => el.classList.toggle("is-active", i === 0));
    },
  };
}

/* -----------------------------------------------------------
   MOBİLDE PİN MEKANİĞİNİ TAMAMEN KAPAT
   matchMedia değiştikçe (döndürme, resize) yeniden değerlendirir.
   Mobilde CSS zaten tüm metinleri normal akışta gösteriyor
   (bkz. styles.css @media max-width:768px, .feature-scroll),
   bu yüzden JS sadece scroll-driven hesaplamayı devre dışı
   bırakıyor — is-active durumunu bozmuyor.
   ----------------------------------------------------------- */
let featureScrollInstance = null;

function evaluateBreakpoint() {
  if (mq.matches) {
    if (!featureScrollInstance) {
      featureScrollInstance = initFeatureScroll();
    }
  } else {
    if (featureScrollInstance) {
      featureScrollInstance.reset();
      featureScrollInstance.teardown();
      featureScrollInstance = null;
    }
    document.querySelector(".nav-secondary")?.classList.remove("is-active");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initNavScroll();
  evaluateBreakpoint();
  mq.addEventListener("change", evaluateBreakpoint);
  initStatCounters();
  initCustomCursor();
  initHeroTypewriter();
  initBentoGlow();
  initMacbookScroll();
});

/* -----------------------------------------------------------
   4) MACBOOK SCROLL — Aceternity UI'nin MacbookScroll bileşeninden
   ilhamla, Framer Motion'ın useScroll/useTransform'u yerine
   deterministik getBoundingClientRect ölçümü kullanılıyor (bu
   projede feature-scroll'da da aynı yaklaşım tercih edildi —
   ratio-tabanlı IntersectionObserver'dan daha öngörülebilir).

   Section'ı kaydırdıkça kapak (lid) rotateX ile kapalıdan (80deg —
   dik açıyla katlı, ekran gizli) açığa (0deg — dönüşsüz, doğrudan
   ekrana bakan) dönüyor. Foto ve sol taraftaki başlık/gövde metni,
   kapak neredeyse tam açılana kadar görünmüyor (REVEAL_START /
   TEXT_TRIGGER eşikleri) — dönüş sırasında çarpık görünmesinler diye.
   ----------------------------------------------------------- */
function initMacbookScroll() {
  const section = document.querySelector("[data-macbook-scroll]");
  const lid = document.querySelector("[data-macbook-lid]");
  const screenImg = document.querySelector(".macbook__screen-img");
  const titleEl = document.querySelector('[data-typewriter-target="macbook-title"]');
  const bodyEl = document.querySelector('[data-typewriter-target="macbook-body"]');
  if (!section || !lid) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const titleTyper = titleEl ? createTypewriter(titleEl) : null;
  const bodyTyper = bodyEl ? createTypewriter(bodyEl) : null;

  function playText() {
    if (titleTyper) {
      titleTyper.start(() => {
        if (bodyTyper) bodyTyper.start();
      });
    } else if (bodyTyper) {
      bodyTyper.start();
    }
  }

  const ANGLE_CLOSED = 80; // kapak dik açıyla katlı, ekran neredeyse gizli
  const ANGLE_OPEN = 0; // dönüşsüz — doğrudan ekrana bakan, sıfır çarpıtma

  // Foto sadece kapak neredeyse tam açıldığında (progress'in son
  // %35'lik kısmında) belirginleşiyor — dönüş sırasında çarpık/
  // "uzamış" görünmesin diye.
  const REVEAL_START = 0.65;

  // Yazı animasyonu, kapak TAMAMEN açılmaya çok yaklaşınca (foto
  // görünürlüğü ~%80'e ulaşınca) bir kez tetikleniyor.
  const TEXT_TRIGGER = 0.92;

  // Animasyon toplam scroll mesafesinin sadece bir kısmında (ilk
  // %72'sinde) tamamlanıyor; kalan %28'lik kısım kullanıcıya "nefes
  // payı" — kapak tam açık, foto ve yazı görünür halde sabit kalıyor,
  // hemen bir sonraki bölüme geçilmiyor.
  const ANIMATION_FRACTION = 0.72;

  if (prefersReducedMotion) {
    lid.style.transform = `rotateX(${ANGLE_OPEN}deg)`;
    if (screenImg) screenImg.style.setProperty("--screen-reveal", "1");
    playText();
    return;
  }

  let textTriggered = false;

  function update() {
    const rect = section.getBoundingClientRect();
    const scrollableDistance = rect.height - window.innerHeight;

    let rawProgress;
    if (scrollableDistance <= 0) {
      rawProgress = 1;
    } else {
      rawProgress = Math.min(Math.max(-rect.top / scrollableDistance, 0), 1);
    }

    // Ham ilerlemeyi (0-1, tüm section boyunca) animasyon payına göre
    // yeniden ölçekliyoruz — ANIMATION_FRACTION'a ulaşınca 1'de kilitlenip
    // kalan scroll boyunca sabit kalıyor (dwell).
    const progress = Math.min(rawProgress / ANIMATION_FRACTION, 1);

    // ease-out: açılış başta hızlı, sona doğru yavaşlıyor
    const eased = 1 - Math.pow(1 - progress, 2);
    const angle = ANGLE_CLOSED + (ANGLE_OPEN - ANGLE_CLOSED) * eased;
    lid.style.transform = `rotateX(${angle}deg)`;

    if (screenImg) {
      const reveal =
        progress <= REVEAL_START
          ? 0
          : (progress - REVEAL_START) / (1 - REVEAL_START);
      screenImg.style.setProperty("--screen-reveal", reveal.toFixed(3));
    }

    if (!textTriggered && progress >= TEXT_TRIGGER) {
      textTriggered = true;
      playText();
    }
  }

  let ticking = false;
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener("scroll", onScroll);
  window.addEventListener("resize", onScroll);
  update();
}

/* -----------------------------------------------------------
   5) KAPANIŞ GRID'İ — MagicBento tarzı imleç-takipli ışıklandırma.
   İki katman: (1) panel genelinde imleci takip eden yumuşak bir
   spotlight (kartların ARKASINDA, boşluklarda görünür), (2) her
   kartın kendi kenarında, imleç o karta yaklaştıkça beliren bir
   parıltı halkası (::after ile, styles.css). GSAP yok — sadece
   rAF ile throttle edilmiş CSS custom property güncellemesi.
   Sadece gerçek fare desteği olan cihazlarda ve
   prefers-reduced-motion kapalıyken çalışır.
   ----------------------------------------------------------- */
function initBentoGlow() {
  const panel = document.querySelector(".features__panel");
  if (!panel) return;

  const cards = Array.from(panel.querySelectorAll(".bento__card"));
  if (!cards.length) return;

  const supportsFinePointer = window.matchMedia(
    "(hover: hover) and (pointer: fine)"
  ).matches;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  if (!supportsFinePointer || prefersReducedMotion) return;

  const spotlight = document.createElement("div");
  spotlight.className = "bento-spotlight";
  panel.appendChild(spotlight);

  const PROXIMITY = 120; // px — bu mesafede tam parlaklık
  const FADE_DISTANCE = 260; // px — bu mesafeden sonra tamamen söner

  function resetGlow() {
    spotlight.classList.remove("is-active");
    cards.forEach((card) => card.style.setProperty("--glow-intensity", "0"));
  }

  function handleMove(e) {
    const panelRect = panel.getBoundingClientRect();
    const insidePanel =
      e.clientX >= panelRect.left &&
      e.clientX <= panelRect.right &&
      e.clientY >= panelRect.top &&
      e.clientY <= panelRect.bottom;

    if (!insidePanel) {
      resetGlow();
      return;
    }

    spotlight.classList.add("is-active");
    spotlight.style.left = `${e.clientX - panelRect.left}px`;
    spotlight.style.top = `${e.clientY - panelRect.top}px`;

    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance =
        Math.hypot(e.clientX - centerX, e.clientY - centerY) -
        Math.max(rect.width, rect.height) / 2;
      const effectiveDistance = Math.max(0, distance);

      let intensity = 0;
      if (effectiveDistance <= PROXIMITY) {
        intensity = 1;
      } else if (effectiveDistance <= FADE_DISTANCE) {
        intensity =
          (FADE_DISTANCE - effectiveDistance) / (FADE_DISTANCE - PROXIMITY);
      }

      const relX = ((e.clientX - rect.left) / rect.width) * 100;
      const relY = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty("--glow-x", `${relX}%`);
      card.style.setProperty("--glow-y", `${relY}%`);
      card.style.setProperty("--glow-intensity", intensity.toString());
    });
  }

  let ticking = false;
  function onMouseMove(e) {
    if (!ticking) {
      requestAnimationFrame(() => {
        handleMove(e);
        ticking = false;
      });
      ticking = true;
    }
  }

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseleave", resetGlow);
}

/* -----------------------------------------------------------
   6) YAZMA (TYPEWRITER) ANİMASYONU — yeniden kullanılabilir çekirdek.
   React Bits'in "TextType" bileşeninden ilhamla, framer-motion/GSAP
   bağımlılığı olmadan vanilla JS'e taşındı. Hem hero başlığı hem de
   MacBook bölümündeki başlık/gövde metni bunu kullanıyor.

   Element'in orijinal metni DOM'dan okunup temizleniyor (JS kapalıyken
   de kaynak HTML'de tam metin durur — no-JS fallback + SEO için
   önemli), aria-label ile ekran okuyuculara tam metin baştan veriliyor.

   createTypewriter() SADECE hazırlık yapar (DOM'u kurar, metni
   temizler) — yazma işlemi ancak döndürülen start() çağrılınca
   başlar. Bu sayede MacBook bölümündeki metinler, kapak tamamen
   açılana kadar boş kalabiliyor.
   ----------------------------------------------------------- */
function createTypewriter(el, options = {}) {
  const { speed = 45, showCursor = true } = options;

  const fullText = el.textContent.trim();
  el.setAttribute("aria-label", fullText);
  el.textContent = "";

  const content = document.createElement("span");
  content.className = "text-type__content";
  content.setAttribute("aria-hidden", "true");
  el.appendChild(content);

  let cursor = null;
  if (showCursor) {
    cursor = document.createElement("span");
    cursor.className = "text-type__cursor";
    cursor.setAttribute("aria-hidden", "true");
    cursor.textContent = "|";
    cursor.style.visibility = "hidden"; // start() çağrılana kadar gizli
    el.appendChild(cursor);
  }

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  let started = false;
  function start(onComplete) {
    if (started) return;
    started = true;
    if (cursor) cursor.style.visibility = "visible";

    if (prefersReducedMotion) {
      content.textContent = fullText;
      if (onComplete) onComplete();
      return;
    }

    let i = 0;
    function typeNext() {
      if (i < fullText.length) {
        content.textContent += fullText[i];
        i++;
        setTimeout(typeNext, speed);
      } else if (onComplete) {
        onComplete();
      }
    }
    typeNext();
  }

  return { start };
}

function initHeroTypewriter() {
  const el = document.querySelector("[data-typewriter]");
  if (!el) return;
  const typer = createTypewriter(el);
  setTimeout(() => typer.start(), 300);
}

/* -----------------------------------------------------------
   7) ÖZEL İMLEÇ — mavi, cartoon görünümlü SVG imleç.
   Native cursor gizlenir (bkz. styles.css), yerine bu SVG fareyi
   basit bir lerp (linear interpolation) ile yumuşak bir gecikmeyle
   takip eder — framer-motion'daki spring hissine yakın, ama
   bağımlılıksız/vanilla JS.
   Sadece gerçek fare + hover desteği olan cihazlarda çalışır;
   dokunmatik ekranlarda ve prefers-reduced-motion'da hiç
   başlatılmaz (native imleç kalır).
   ----------------------------------------------------------- */
function initCustomCursor() {
  const supportsFinePointer = window.matchMedia(
    "(hover: hover) and (pointer: fine)"
  ).matches;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  if (!supportsFinePointer || prefersReducedMotion) return;

  const cursor = document.createElement("div");
  cursor.className = "custom-cursor";
  cursor.innerHTML = `
    <div class="custom-cursor__inner">
      <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M7 4 L7 31.5 L13.8 25.2 L18.5 34.8 L23.8 32.2 L19.1 22.6 L28.5 22.6 Z"
          fill="#3b82f6"
          stroke="#1e3a8a"
          stroke-width="2.5"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <path
          d="M10 8.5 L10 21.5 L13.5 18.3"
          fill="none"
          stroke="#bfdbfe"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          opacity="0.85"
        />
      </svg>
    </div>
  `;
  document.body.appendChild(cursor);

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let cursorX = mouseX;
  let cursorY = mouseY;
  let hasMoved = false;

  function onMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!hasMoved) {
      hasMoved = true;
      cursorX = mouseX;
      cursorY = mouseY;
      cursor.classList.add("is-visible");
    }
  }

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mousedown", () => cursor.classList.add("is-pressed"));
  window.addEventListener("mouseup", () => cursor.classList.remove("is-pressed"));
  document.addEventListener("mouseleave", () => cursor.classList.remove("is-visible"));
  document.addEventListener("mouseenter", () => {
    if (hasMoved) cursor.classList.add("is-visible");
  });

  function render() {
    // Basit lerp — imleç ucunu (tip) SVG'nin sol üst köşesine (~7,4)
    // hizalamak için küçük bir ofset uyguluyoruz.
    cursorX += (mouseX - cursorX) * 0.25;
    cursorY += (mouseY - cursorY) * 0.25;
    cursor.style.transform = `translate(${cursorX - 5}px, ${cursorY - 3}px)`;
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

/* -----------------------------------------------------------
   8) STATS BAND — sayılar görünür alana girince 0'dan gerçek
   değere sayar (tek seferlik, prefers-reduced-motion'a saygılı).
   ----------------------------------------------------------- */
function initStatCounters() {
  const values = document.querySelectorAll(".stat__value[data-count]");
  if (!values.length) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  function animateCount(el) {
    const target = parseInt(el.dataset.count, 10);
    if (prefersReducedMotion || Number.isNaN(target)) {
      el.textContent = target;
      return;
    }
    const duration = 1400;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const stat = entry.target.closest(".stat");
          const allStats = Array.from(document.querySelectorAll(".stat"));
          const index = stat ? allStats.indexOf(stat) : 0;
          stat?.classList.add("is-counting");
          setTimeout(() => animateCount(entry.target), index * 120);
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );
  values.forEach((v) => observer.observe(v));
}