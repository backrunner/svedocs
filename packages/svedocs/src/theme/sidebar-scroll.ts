import { tick } from 'svelte';

/** Reveal the current page without scrolling the document or moving focus. */
export function revealSidebarPage(node: HTMLElement, currentPath: string) {
  let generation = 0;
  let visible = node.getBoundingClientRect().height > 0;

  function reveal() {
    const active = node.querySelector<HTMLElement>('a[aria-current="page"]');
    if (!active || !active.getClientRects().length) return;

    for (let container = node.parentElement; container && container !== document.body && container !== document.documentElement; container = container.parentElement) {
      if (!/(auto|scroll|overlay)/.test(getComputedStyle(container).overflowY)) continue;
      if (container.scrollHeight <= container.clientHeight) continue;
      const bounds = container.getBoundingClientRect();
      const target = active.getBoundingClientRect();
      const top = bounds.top + container.clientTop;
      const bottom = top + container.clientHeight;
      // Leave room for the active outline and fractional scroll rounding.
      const offset = target.top < top ? target.top - top - 4 : target.bottom > bottom ? target.bottom - bottom + 4 : 0;
      if (offset) container.scrollBy({ top: offset, behavior: 'instant' });
      break;
    }
  }

  async function schedule() {
    const version = ++generation;
    await tick();
    if (version !== generation) return;
    const active = node.querySelector<HTMLElement>('a[aria-current="page"]');
    // A user may have closed the current branch before navigating into it.
    for (let parent = active?.parentElement; parent && node.contains(parent); parent = parent.parentElement) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
    }
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    if (version !== generation) return;
    reveal();
    // Expanding details can change the target's position during its transition.
    const expansions = node.getAnimations({ subtree: true }).filter((animation) =>
      animation.effect instanceof KeyframeEffect
      && animation.effect.target instanceof HTMLDetailsElement
      && animation.effect.getComputedTiming().endTime !== Infinity
    );
    await Promise.allSettled(expansions.map((animation) => animation.finished));
    if (version === generation) reveal();
  }

  const observer = new ResizeObserver(() => {
    const nextVisible = node.getBoundingClientRect().height > 0;
    if (nextVisible && !visible) void schedule();
    visible = nextVisible;
  });
  observer.observe(node);
  void schedule();

  return {
    update(path: string) {
      if (path === currentPath) return;
      currentPath = path;
      void schedule();
    },
    destroy() {
      generation++;
      observer.disconnect();
    }
  };
}
