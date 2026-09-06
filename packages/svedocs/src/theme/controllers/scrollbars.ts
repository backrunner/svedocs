export function mountScrollbarVisibility() {
  const root = document.documentElement;
  const body = document.body;
  const elementTimers = new Map<HTMLElement, number>();
  let windowTimer: number | undefined;

  function markWindowScrolling() {
    root.classList.add('sd-is-window-scrolling');
    body.classList.add('sd-is-window-scrolling');
    if (windowTimer !== undefined) window.clearTimeout(windowTimer);
    windowTimer = window.setTimeout(() => {
      root.classList.remove('sd-is-window-scrolling');
      body.classList.remove('sd-is-window-scrolling');
      windowTimer = undefined;
    }, 900);
  }

  function markElementScrolling(event: Event) {
    const target = event.target;
    if (!(target instanceof HTMLElement) || target === root || target === body) return;
    if (!isScrollableElement(target)) return;
    target.classList.add('sd-is-scrolling');
    const existingTimer = elementTimers.get(target);
    if (existingTimer !== undefined) window.clearTimeout(existingTimer);
    elementTimers.set(target, window.setTimeout(() => {
      target.classList.remove('sd-is-scrolling');
      elementTimers.delete(target);
    }, 900));
  }

  window.addEventListener('scroll', markWindowScrolling, { passive: true });
  document.addEventListener('scroll', markElementScrolling, { capture: true, passive: true });

  return () => {
    window.removeEventListener('scroll', markWindowScrolling);
    document.removeEventListener('scroll', markElementScrolling, { capture: true });
    if (windowTimer !== undefined) window.clearTimeout(windowTimer);
    root.classList.remove('sd-is-window-scrolling');
    body.classList.remove('sd-is-window-scrolling');
    for (const [element, timer] of elementTimers) {
      window.clearTimeout(timer);
      element.classList.remove('sd-is-scrolling');
    }
    elementTimers.clear();
  };
}

function isScrollableElement(element: HTMLElement) {
  return element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1;
}
