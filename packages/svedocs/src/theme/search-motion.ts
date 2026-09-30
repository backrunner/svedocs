/** Keep the centered dialog steady while its results grow or shrink. */
export function smoothSearchSize(node: HTMLElement) {
  const content = node.querySelector<HTMLElement>(':scope > .sd-search-content');
  if (!content || typeof ResizeObserver === 'undefined') return {};

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const measure = () => Number.parseFloat(getComputedStyle(content).height) || 0;
  let height = measure();
  let animation: Animation | undefined;
  if (height > 0) node.style.height = `${height}px`;

  const observer = new ResizeObserver(() => {
    const nextHeight = measure();
    if (nextHeight === height) return;
    const initialized = height > 0;
    // Retarget from the displayed height, including an unfinished transition.
    const previousHeight = Number.parseFloat(getComputedStyle(node).height);
    height = nextHeight;
    animation?.cancel();
    node.style.height = `${height}px`;
    if (initialized && !motion.matches) {
      animation = node.animate(
        [{ height: `${previousHeight}px` }, { height: `${height}px` }],
        { id: 'svedocs-search-resize', duration: 180, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
      );
    }
  });
  observer.observe(content);

  function stopMotion() {
    if (motion.matches) animation?.cancel();
  }
  motion.addEventListener('change', stopMotion);

  return {
    destroy() {
      observer.disconnect();
      animation?.cancel();
      motion.removeEventListener('change', stopMotion);
      node.style.removeProperty('height');
    }
  };
}
