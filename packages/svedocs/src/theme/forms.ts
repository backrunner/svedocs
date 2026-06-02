export type SvedocsControlDensity = 'sm' | 'md' | 'lg';

export type SvedocsButtonVariant = 'default' | 'primary' | 'ghost' | 'danger';

export function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}
