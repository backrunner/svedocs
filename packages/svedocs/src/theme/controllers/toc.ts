import { tick } from 'svelte';
import { get, writable } from 'svelte/store';
import type { SvedocsPage } from '../../core/types.js';
import type { SvedocsTocController } from '../types.js';

export function createTocController(initial: { page: SvedocsPage }): SvedocsTocController {
  const activeHeading = writable(initial.page.headings[0]?.id ?? '');
  const indicatorTop = writable(0);
  const indicatorHeight = writable(0);
  const indicatorReady = writable(false);
  let page = initial.page;
  let tocEl: HTMLElement | null = null;
  let headingFrame: number | undefined;
  let stopHeadingTracking: (() => void) | undefined;
  let headingTrackingVersion = 0;
  let mounted = false;

  function setPage(nextPage: SvedocsPage): void {
    if (page === nextPage) return;
    page = nextPage;
    activeHeading.set(page.headings[0]?.id ?? '');
    indicatorReady.set(false);
    if (mounted) void attachHeadingTracker();
  }

  function setContainer(element: HTMLElement | null): void {
    tocEl = element;
    const id = get(activeHeading);
    if (id) void updateIndicator(id);
  }

  function activate(id: string): void {
    activeHeading.set(id);
    void updateIndicator(id);
  }

  function mount(): () => void {
    mounted = true;
    void attachHeadingTracker();
    return destroy;
  }

  function destroy(): void {
    mounted = false;
    headingTrackingVersion += 1;
    stopHeadingTracking?.();
    stopHeadingTracking = undefined;
    cancelHeadingFrame();
  }

  async function attachHeadingTracker(): Promise<void> {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const version = headingTrackingVersion + 1;
    headingTrackingVersion = version;
    stopHeadingTracking?.();
    stopHeadingTracking = undefined;
    cancelHeadingFrame();
    indicatorReady.set(false);
    activeHeading.set(page.headings[0]?.id ?? '');
    await tick();
    if (version !== headingTrackingVersion) return;
    const headings = page.headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (headings.length === 0) return;
    let positions: Array<{ id: string; top: number }> = [];
    let needsMeasurement = true;
    const syncActiveHeading = () => {
      headingFrame = undefined;
      const measured = needsMeasurement;
      if (needsMeasurement) {
        positions = headings.map((heading) => ({ id: heading.id, top: heading.getBoundingClientRect().top + window.scrollY }));
        needsMeasurement = false;
      }
      const nextHeading = findActiveHeading(positions, window.scrollY, window.innerHeight);
      if (nextHeading && (measured || !get(indicatorReady) || nextHeading.id !== get(activeHeading))) {
        activeHeading.set(nextHeading.id);
        void updateIndicator(nextHeading.id);
      }
    };
    const scheduleActiveHeadingSync = () => {
      if (headingFrame !== undefined) return;
      headingFrame = requestAnimationFrame(syncActiveHeading);
    };
    window.addEventListener('scroll', scheduleActiveHeadingSync, { passive: true });
    const invalidatePositions = () => {
      needsMeasurement = true;
      scheduleActiveHeadingSync();
    };
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(invalidatePositions);
    const article = headings[0]?.closest('.sd-prose') ?? document.body;
    observer?.observe(article);
    document.fonts?.ready.then(() => { if (version === headingTrackingVersion) invalidatePositions(); });
    window.addEventListener('resize', invalidatePositions);
    stopHeadingTracking = () => {
      window.removeEventListener('scroll', scheduleActiveHeadingSync);
      window.removeEventListener('resize', invalidatePositions);
      observer?.disconnect();
    };
    scheduleActiveHeadingSync();
  }

  async function updateIndicator(id: string): Promise<void> {
    await tick();
    if (!tocEl) return;
    const link = tocEl.querySelector<HTMLElement>(`a.sd-toc-link[href="#${cssEscape(id)}"]`);
    if (!link) return;
    const markerHeight = Math.min(24, Math.max(16, link.offsetHeight - 12));
    const atBottom = (window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 2;
    const isLastLink = !link.nextElementSibling || !link.nextElementSibling.matches('a.sd-toc-link');
    if (atBottom && isLastLink) {
      const paddingBottom = parseFloat(getComputedStyle(tocEl).paddingBottom) || 0;
      indicatorTop.set(tocEl.scrollHeight - paddingBottom - markerHeight);
    } else {
      indicatorTop.set(link.offsetTop + (link.offsetHeight - markerHeight) / 2);
    }
    indicatorHeight.set(markerHeight);
    indicatorReady.set(true);
  }

  function cancelHeadingFrame(): void {
    if (headingFrame === undefined) return;
    cancelAnimationFrame(headingFrame);
    headingFrame = undefined;
  }

  return {
    activeHeading,
    indicatorTop,
    indicatorHeight,
    indicatorReady,
    setPage,
    setContainer,
    activate,
    mount,
    destroy
  };
}

function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
  return value.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
}

/** Binary search cached document positions; scrolling performs no heading layout reads. */
export function findActiveHeading<T extends { top: number }>(headings: T[], scrollY: number, height: number): T | undefined {
  let low = 0;
  let high = headings.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (headings[mid]!.top < scrollY + 80) low = mid + 1;
    else high = mid;
  }
  const next = headings[low];
  return next && next.top <= scrollY + height ? next : headings[Math.max(0, low - 1)];
}
