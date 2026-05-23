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
