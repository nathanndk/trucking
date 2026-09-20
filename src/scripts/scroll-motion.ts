/** Public-only progressive enhancement. The server-rendered document is the static fallback. */
export function mountScrollMotion() {
  const main = document.querySelector<HTMLElement>('main#main');
  if (!main) return () => {};
  const root: HTMLElement = main;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const control = document.querySelector<HTMLElement>('[data-motion-control]');
  const toggle = control?.querySelector<HTMLButtonElement>('button');
  const status = control?.querySelector<HTMLElement>('[data-motion-status]');
  const preferenceKey = 'lintas-scroll-motion';
  let preference: 'system' | 'enabled' | 'disabled' = 'system';
  try {
    const saved = sessionStorage.getItem(preferenceKey);
    if (saved === 'enabled' || saved === 'disabled') preference = saved;
  } catch {
    // The current page can still remember a choice when browser storage is unavailable.
  }
  const wantsMotion = () =>
    preference === 'enabled' || (preference === 'system' && !reduced.matches);

  function updateControl() {
    if (!control || !toggle || !status) return;
    control.hidden = !reduced.matches && preference === 'system';
    const active = root.dataset.motionState === 'ready';
    toggle.textContent = active ? 'Matikan animasi' : 'Aktifkan animasi';
    toggle.setAttribute('aria-pressed', String(active));
    status.textContent = active
      ? 'Animasi scroll aktif'
      : reduced.matches && preference === 'system'
        ? 'Perangkat Anda mengurangi animasi'
        : 'Animasi scroll nonaktif';
  }

  function changePreference() {
    preference = root.dataset.motionState === 'ready' ? 'disabled' : 'enabled';
    try {
      sessionStorage.setItem(preferenceKey, preference);
    } catch {
      // Keep the in-memory choice for this page.
    }
    void rebuild();
  }
  let context: gsap.Context | undefined;
  let engine: Awaited<ReturnType<typeof loadEngine>> | undefined;
  let revision = 0;
  let disposed = false;
  let resizeTimer = 0;
  let refreshFrame = 0;
  let initialHashHandled = false;
  const all = <T extends Element = HTMLElement>(selector: string, parent: ParentNode = root) =>
    Array.from(parent.querySelectorAll<T>(selector));

  async function loadEngine() {
    const [{ gsap }, { ScrollTrigger }] = await Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
    ]);
    gsap.registerPlugin(ScrollTrigger);
    return { gsap, ScrollTrigger };
  }

  function reset() {
    context?.revert();
    context = undefined;
    all('[data-motion-pinned]').forEach((el) => el.removeAttribute('data-motion-pinned'));
  }

  function followHash() {
    if (!location.hash) return;
    let target: HTMLElement | null;
    try {
      target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    } catch {
      return;
    }
    if (!target || !root!.contains(target)) return;
    const scene = target.closest<HTMLElement>('[data-motion-pinned]');
    const trigger = scene && engine?.ScrollTrigger.getAll().find((t) => t.trigger === scene);
    if (trigger)
      window.scrollTo({ top: target === scene ? trigger.start : trigger.end, behavior: 'instant' });
    else target.scrollIntoView({ block: 'start', behavior: 'instant' });
    engine?.ScrollTrigger.update();
  }

  async function rebuild() {
    const ticket = ++revision;
    reset();
    if (disposed) return;
    if (!wantsMotion()) {
      if (toggle) toggle.disabled = false;
      delete document.documentElement.dataset.scrollMotion;
      root.dataset.motionState = 'static';
      root.dataset.motionReason = preference === 'disabled' ? 'user-disabled' : 'reduced-motion';
      updateControl();
      return;
    }
    document.documentElement.dataset.scrollMotion = 'enabled';
    delete root.dataset.motionReason;
    if (toggle) toggle.disabled = true;
    try {
      engine ??= await loadEngine();
      if (disposed || ticket !== revision) return;
      const { gsap, ScrollTrigger } = engine;
      const desktop = innerWidth >= 1024;
      const scrub = desktop ? 0.6 : 0.25;
      const distance = desktop ? 64 : 24;
      const pinAllowed = desktop && innerHeight >= 760;
      context = gsap.context(() => {}, root);
      context.add(() => {
        // Pins are created first, in document order, so following triggers include their spacing.
        const hero = root!.querySelector<HTMLElement>('[data-motion="hero"]');
        if (hero) {
          const pin = pinAllowed && hero.offsetHeight <= innerHeight - 16;
          if (pin) {
            hero.dataset.motionPinned = 'hero';
            // Fill the held frame so its spacer never appears as an empty strip.
            gsap.set(hero, { minHeight: innerHeight });
          }
          const timeline = gsap.timeline({
            scrollTrigger: {
              trigger: hero,
              start: 'top top',
              end: () => (pin ? `+=${innerHeight * 0.8}` : 'bottom top'),
              pin,
              pinSpacing: true,
              scrub,
              invalidateOnRefresh: true,
            },
          });
          timeline.to(
            hero.querySelector('.hero-photo'),
            { scale: desktop ? 1.15 : 1.05, y: desktop ? -24 : -8, ease: 'none', duration: 1 },
            0,
          );
          timeline.to(
            hero.querySelector('.hero-content'),
            { y: desktop ? -40 : -16, ease: 'none', duration: 1 },
            0,
          );
        }
        const fleet = root!.querySelector<HTMLElement>('[data-motion="fleet-scene"]');
        const fleetCards = fleet ? all<HTMLElement>('[data-motion-item]', fleet) : [];
        if (fleet && fleetCards.length && pinAllowed && fleet.offsetHeight <= innerHeight - 16) {
          fleet.dataset.motionPinned = 'fleet';
          const scene = gsap.timeline({
            scrollTrigger: {
              trigger: fleet,
              start: 'top top',
              end: () => `+=${innerHeight}`,
              pin: true,
              pinSpacing: true,
              scrub,
              invalidateOnRefresh: true,
            },
          });
          fleetCards.forEach((card, i) => {
            scene.fromTo(
              card,
              { y: 64, opacity: 0.25 },
              { y: 0, opacity: 1, duration: 0.65, ease: 'none' },
              i * 0.3,
            );
            const image = card.querySelector('img');
            if (image)
              scene.fromTo(
                image,
                { scale: 1.12 },
                { scale: 1, duration: 0.8, ease: 'none' },
                i * 0.3,
              );
          });
        }
        for (const element of all<HTMLElement>('[data-motion="heading"], [data-motion="copy"]')) {
          const heading = element.dataset.motion === 'heading';
          // First-viewport headings are already readable in the SSR response.
          const initiallyVisible =
            element.getBoundingClientRect().top + scrollY < innerHeight * 0.85;
          if (initiallyVisible) continue;
          gsap.fromTo(
            element,
            {
              y: heading ? distance * 0.75 : distance * 0.4,
              opacity: heading ? 0.15 : 0.35,
              ...(heading ? { clipPath: 'inset(100% 0 0 0)' } : {}),
            },
            {
              y: 0,
              opacity: 1,
              ...(heading ? { clipPath: 'inset(0% 0 0 0)' } : {}),
              ease: 'none',
              scrollTrigger: {
                trigger: element,
                start: 'top 85%',
                end: 'top 40%',
                scrub,
                invalidateOnRefresh: true,
              },
            },
          );
        }
        for (const group of all<HTMLElement>('[data-motion="group"]')) {
          if (group.closest('[data-motion-pinned="fleet"]')) continue;
          const items = all<HTMLElement>(':scope > [data-motion-item]', group);
          items.forEach((item, i) => {
            const offset = desktop ? (i % 3) * 5 : 0;
            const timeline = gsap.timeline({
              scrollTrigger: {
                trigger: item,
                start: `top ${85 - offset}%`,
                end: `top ${40 - offset}%`,
                scrub,
                invalidateOnRefresh: true,
              },
            });
            timeline.fromTo(
              item,
              { y: distance, opacity: 0.25 },
              { y: 0, opacity: 1, ease: 'none', duration: 1 },
              0,
            );
            const photo = item.querySelector<HTMLElement>('[data-motion-photo]');
            if (photo)
              timeline.fromTo(
                photo,
                { scale: desktop ? 1.12 : 1.05 },
                { scale: 1, ease: 'none', duration: 1 },
                0,
              );
          });
        }
        for (const map of all<HTMLElement>('[data-motion="route"]')) {
          const route = map.querySelector<SVGPathElement>('[data-motion-path]');
          if (!route) continue;
          const length = route.getTotalLength();
          const timeline = gsap.timeline({
            scrollTrigger: {
              trigger: map,
              start: 'top 85%',
              end: 'top 30%',
              scrub,
              invalidateOnRefresh: true,
            },
          });
          timeline.fromTo(
            route,
            { strokeDasharray: length, strokeDashoffset: length },
            { strokeDashoffset: 0, duration: 1, ease: 'none' },
            0,
          );
          all<SVGGElement>('[data-motion-marker]', map).forEach((marker, i, markers) => {
            timeline.fromTo(
              marker,
              { opacity: 0.1, y: desktop ? 12 : 8 },
              { opacity: 1, y: 0, duration: 0.2, ease: 'none' },
              i / Math.max(markers.length, 1),
            );
          });
        }
      });
      ScrollTrigger.refresh();
      root!.dataset.motionState = 'ready';
      updateControl();
      if (!initialHashHandled) {
        initialHashHandled = true;
        followHash();
      }
    } catch {
      reset();
      root!.dataset.motionState = 'static';
      root.dataset.motionReason = 'load-error';
      delete document.documentElement.dataset.scrollMotion;
      updateControl();
    } finally {
      if (toggle && ticket === revision) toggle.disabled = false;
    }
  }

  function scheduleRebuild() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => void rebuild(), 200);
  }
  function refresh() {
    cancelAnimationFrame(refreshFrame);
    refreshFrame = requestAnimationFrame(() => engine?.ScrollTrigger.refresh());
  }
  function visibilityRestored(event: PageTransitionEvent) {
    if (event.persisted) scheduleRebuild();
  }
  toggle?.addEventListener('click', changePreference);
  window.addEventListener('resize', scheduleRebuild, { passive: true });
  window.addEventListener('hashchange', followHash);
  window.addEventListener('pageshow', visibilityRestored);
  reduced.addEventListener('change', scheduleRebuild);
  root.addEventListener('load', refresh, true);
  // Font metrics affect whether a scene fits. Start after fonts settle, even on a slow connection.
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
    reset();
    window.removeEventListener('resize', scheduleRebuild);
    window.removeEventListener('hashchange', followHash);
    window.removeEventListener('pageshow', visibilityRestored);
    reduced.removeEventListener('change', scheduleRebuild);
    root.removeEventListener('load', refresh, true);
    toggle?.removeEventListener('click', changePreference);
    if (control) control.hidden = true;
    delete document.documentElement.dataset.scrollMotion;
    delete root.dataset.motionReason;
    delete root.dataset.motionState;
  };
}
