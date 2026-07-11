export function portal(node: HTMLElement, target: HTMLElement | string = 'body') {
  let host: HTMLElement | null = null;
  function mount() {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    host = (el as HTMLElement) ?? document.body;
    host.appendChild(node);
  }
  if (typeof document !== 'undefined') mount();
  return {
    update(next: HTMLElement | string) {
      target = next;
      mount();
    },
    destroy() {
      node.parentNode?.removeChild(node);
    }
  };
}

interface DocumentScrollState {
  rootOverflow: string;
  bodyOverflow: string;
  bodyPaddingRight: string;
  scrollX: number;
  scrollY: number;
}

let documentScrollLocks = 0;
let documentScrollState: DocumentScrollState | undefined;

export function lockDocumentScroll(): () => void {
  if (typeof document === 'undefined' || typeof window === 'undefined' || !document.body) return () => {};

  documentScrollLocks += 1;
  if (documentScrollLocks === 1) {
    const root = document.documentElement;
    const body = document.body;
    const scrollbarWidth = Math.max(0, window.innerWidth - root.clientWidth);
    documentScrollState = {
      rootOverflow: root.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPaddingRight: body.style.paddingRight,
      scrollX: window.scrollX,
      scrollY: window.scrollY
    };
    root.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      const currentPadding = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
    }
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    documentScrollLocks = Math.max(0, documentScrollLocks - 1);
    if (documentScrollLocks > 0 || !documentScrollState) return;

    const state = documentScrollState;
    documentScrollState = undefined;
    document.documentElement.style.overflow = state.rootOverflow;
    document.body.style.overflow = state.bodyOverflow;
    document.body.style.paddingRight = state.bodyPaddingRight;
    window.scrollTo(state.scrollX, state.scrollY);
  };
}
