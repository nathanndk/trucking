/**
 * Public-only enhancement: the hero photo settles once as the page opens. Everything else is
 * static; scattered fade-ins on headings and cards were removed so one moment stands out.
 */
export function mountScrollMotion() {
  const main = document.querySelector<HTMLElement>('main#main');
  if (!main) return () => {};
  const root: HTMLElement = main;
  const played = new WeakSet<Element>();
  let context: gsap.Context | undefined;
  let engine: Awaited<ReturnType<typeof loadEngine>> | undefined;
  let revision = 0;
  let disposed = false;
  let resizeTimer = 0;
  let refreshFrame = 0;

  async function loadEngine() {
    const [{ gsap }, { ScrollTrigger }] = await Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
    ]);
    gsap.registerPlugin(ScrollTrigger);
    return { gsap, ScrollTrigger };
  }

  function followHash() {
    if (!location.hash) return;
    try {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target && root.contains(target)) target.scrollIntoView({ behavior: 'instant' });
      engine?.ScrollTrigger.update();
    } catch {
      // A malformed anchor must not prevent the rest of the page from working.
    }
  }

  async function rebuild() {
    const ticket = ++revision;
    context?.revert();
    context = undefined;
    if (disposed) return;
    // Scroll reveals are automatic, including on devices requesting reduced motion.
    // Decorative CSS motion continues to follow the device preference independently.
    document.documentElement.dataset.scrollMotion = 'enabled';
    try {
      engine ??= await loadEngine();
      if (disposed || ticket !== revision) return;
      const { gsap, ScrollTrigger } = engine;
      const desktop = innerWidth >= 1024;
      context = gsap.context(() => {}, root);
      context.add(() => {
        function reveal(element: HTMLElement, timeline: gsap.core.Timeline) {
          if (played.has(element)) {
            timeline.progress(1);
            return;
          }
          ScrollTrigger.create({
            trigger: element,
            start: 'top 85%',
            end: 'bottom top',
            once: true,
            animation: timeline,
            toggleActions: 'play none none none',
            onEnter: () => played.add(element),
            onEnterBack: () => {
              played.add(element);
              timeline.play();
            },
            onLeave: () => {
              // Fast scrolling and direct anchors must leave passed content fully visible.
              played.add(element);
              timeline.progress(1);
            },
          });
        }
        const hero = root.querySelector<HTMLElement>('[data-motion="hero"]');
        if (hero) {
          const timeline = gsap.timeline({ paused: true });
          timeline.to(hero.querySelector('.hero-photo'), {
            scale: desktop ? 1.15 : 1.05,
            y: desktop ? -24 : -8,
            duration: 1.8,
            ease: 'power2.out',
          });
          reveal(hero, timeline);
        }
      });
      ScrollTrigger.refresh();
      root.dataset.motionState = 'ready';
      delete root.dataset.motionReason;
      followHash();
    } catch {
      context?.revert();
      context = undefined;
      root.dataset.motionState = 'static';
      root.dataset.motionReason = 'load-error';
      delete document.documentElement.dataset.scrollMotion;
    }
  }

  function scheduleRebuild() {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => void rebuild(), 200);
  }
  function refresh() {
    cancelAnimationFrame(refreshFrame);
    refreshFrame = requestAnimationFrame(() => engine?.ScrollTrigger.refresh());
  }
  function visibilityRestored(event: PageTransitionEvent) {
    if (event.persisted) scheduleRebuild();
  }
  window.addEventListener('resize', scheduleRebuild, { passive: true });
  window.addEventListener('hashchange', followHash);
  window.addEventListener('pageshow', visibilityRestored);
  root.addEventListener('load', refresh, true);
  void Promise.race([
    document.fonts.ready,
    new Promise((resolve) => setTimeout(resolve, 1200)),
  ]).then(() => {
    if (!disposed) void rebuild();
  });
  void document.fonts.ready.then(() => {
    if (!disposed && context) scheduleRebuild();
  });
  return () => {
    disposed = true;
    revision++;
    clearTimeout(resizeTimer);
    cancelAnimationFrame(refreshFrame);
    context?.revert();
    window.removeEventListener('resize', scheduleRebuild);
    window.removeEventListener('hashchange', followHash);
    window.removeEventListener('pageshow', visibilityRestored);
    root.removeEventListener('load', refresh, true);
    delete document.documentElement.dataset.scrollMotion;
    delete root.dataset.motionReason;
    delete root.dataset.motionState;
  };
}
