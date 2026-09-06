import { lockDocumentScroll } from './portal.js';

export function isComposingKey(event: KeyboardEvent): boolean {
  // Safari can report the IME confirmation key as 229 with isComposing=false.
  return event.isComposing || event.keyCode === 229;
}

interface DialogOptions {
  modal: true | 'mobile';
  onClose: () => void;
}

/** Native dialogs keep focus and background interaction consistent with their mode. */
export function dialogBehavior(node: HTMLDialogElement, initial: DialogOptions) {
  let options = initial;
  const mobile = window.matchMedia('(max-width: 980px)');
  let currentModal: boolean | undefined;
  let unlock: (() => void) | undefined;

  function sync() {
    const modal = options.modal === true || mobile.matches;
    if (modal === currentModal) return;
    const focus = document.activeElement;
    if (node.open) node.close();
    unlock?.();
    unlock = undefined;
    currentModal = modal;
    node.setAttribute('aria-modal', String(modal));
    if (modal) {
      node.showModal();
      unlock = lockDocumentScroll();
    } else {
      node.show();
    }
    if (focus instanceof HTMLElement && node.contains(focus)) focus.focus();
  }

  function cancel(event: Event) {
    event.preventDefault();
    options.onClose();
  }

  function click(event: MouseEvent) {
    if (!currentModal || event.target !== node) return;
    const bounds = node.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom) options.onClose();
  }

  sync();
  mobile.addEventListener('change', sync);
  node.addEventListener('cancel', cancel);
  node.addEventListener('click', click);
  return {
    update(next: DialogOptions) { options = next; sync(); },
    destroy() {
      mobile.removeEventListener('change', sync);
      node.removeEventListener('cancel', cancel);
      node.removeEventListener('click', click);
      node.close();
      unlock?.();
    }
  };
}
