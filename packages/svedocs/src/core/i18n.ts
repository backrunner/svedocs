import type { SvedocsConfig } from '../config.js';
import type { SvedocsLocale, SvedocsMessages, SvedocsResolvedConfig } from './types.js';
import { createBaseMessages, mergeMessages } from './messages.js';

export { defaultSvedocsMessages } from './messages.js';

export function resolveSvedocsI18nConfig(config: SvedocsConfig): SvedocsResolvedConfig['i18n'] {
  const baseMessages = createBaseMessages(config);
  if (config.i18n === false) {
    return {
      locales: [],
      prefixDefaultLocale: false,
      messages: {
        en: baseMessages
      }
    };
  }
  const locales = (config.i18n?.locales ?? []).map(normalizeLocale);
  const defaultLocale = config.i18n?.defaultLocale ?? locales[0]?.code;
  const prefixDefaultLocale = config.i18n?.prefixDefaultLocale ?? false;
  validateI18nConfig(locales, defaultLocale, prefixDefaultLocale, config.i18n?.messages);
  return {
    ...(defaultLocale ? { defaultLocale } : {}),
    locales,
    prefixDefaultLocale,
    messages: resolveI18nMessages(locales, defaultLocale, baseMessages, config.i18n?.messages)
  };
}

function normalizeLocale(locale: string | { code: string; label?: string; path?: string; hreflang?: string; dir?: 'ltr' | 'rtl' }): SvedocsLocale {
  if (typeof locale === 'string') {
    return {
      code: locale,
      label: locale,
      path: locale
    };
  }
  return {
    code: locale.code,
    label: locale.label ?? locale.code,
    path: locale.path ?? locale.code,
    ...(locale.hreflang ? { hreflang: locale.hreflang } : {}),
    ...(locale.dir ? { dir: locale.dir } : {})
  };
}

function validateI18nConfig(
  locales: SvedocsLocale[],
  defaultLocale: string | undefined,
  prefixDefaultLocale: boolean,
  messages: Record<string, Partial<SvedocsMessages>> | undefined
): void {
  const codes = new Map<string, string>();
  const paths = new Map<string, string>();
  const languageTags = new Map<string, string>();

  for (const locale of locales) {
    assertLocaleCode(locale.code);
    assertLocalePath(locale.path, locale.code);
    if (!locale.label.trim()) {
      throw new Error(`i18n locale label for "${locale.code}" must not be empty.`);
    }
    assertLanguageTag(locale.hreflang ?? locale.code, locale.code);

    assertUniqueLocaleValue(codes, locale.code, locale.code, 'code');
    assertUniqueLocaleValue(paths, locale.path, locale.code, 'path');
    assertUniqueLocaleValue(languageTags, locale.hreflang ?? locale.code, locale.code, 'language tag');
  }

  if (defaultLocale && locales.length === 0) {
    throw new Error('i18n.defaultLocale requires at least one configured locale.');
  }
  if (defaultLocale && !locales.some((locale) => locale.code === defaultLocale)) {
    throw new Error(`i18n.defaultLocale "${defaultLocale}" must match a configured locale code.`);
  }
  if (prefixDefaultLocale && locales.length === 0) {
    throw new Error('i18n.prefixDefaultLocale requires at least one configured locale.');
  }

  const messageLocales = new Set(['en', ...(defaultLocale ? [defaultLocale] : []), ...locales.map((locale) => locale.code)]);
  for (const code of Object.keys(messages ?? {})) {
    if (!messageLocales.has(code)) {
      throw new Error(`i18n.messages contains unknown locale "${code}". Add it to i18n.locales first.`);
    }
  }
}

function assertLocaleCode(code: string): void {
  if (!/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(code)) {
    throw new Error(`i18n locale code "${code}" must be a non-empty language-style identifier such as "en" or "pt-BR".`);
  }
}

function assertLocalePath(localePath: string, code: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9._~-]*$/.test(localePath) || localePath === '.' || localePath === '..') {
    throw new Error(`i18n locale path "${localePath}" for "${code}" must be one non-empty URL-safe segment.`);
  }
  if (localePath.toLowerCase() === 'docs') {
    throw new Error(`i18n locale path "${localePath}" for "${code}" conflicts with the reserved /docs route.`);
  }
}

function assertLanguageTag(languageTag: string, code: string): void {
  try {
    new Intl.Locale(languageTag);
  } catch {
    throw new Error(`i18n hreflang "${languageTag}" for "${code}" must be a valid BCP 47 language tag.`);
  }
}

function assertUniqueLocaleValue(
  values: Map<string, string>,
  value: string,
  code: string,
  field: string
): void {
  const normalized = value.toLowerCase();
  const existing = values.get(normalized);
  if (existing) {
    throw new Error(`i18n locale ${field} "${value}" is shared by "${existing}" and "${code}".`);
  }
  values.set(normalized, code);
}

function resolveI18nMessages(
  locales: SvedocsLocale[],
  defaultLocale: string | undefined,
  baseMessages: SvedocsMessages,
  messages: Record<string, Partial<SvedocsMessages>> | undefined
): Record<string, SvedocsMessages> {
  const base = mergeMessages(baseMessages, messages?.en);
  const codes = new Set<string>(['en']);
  if (defaultLocale) codes.add(defaultLocale);
  for (const locale of locales) codes.add(locale.code);
  for (const code of Object.keys(messages ?? {})) codes.add(code);

  const resolved: Record<string, SvedocsMessages> = {};
  for (const code of codes) {
    resolved[code] = code === 'en'
      ? base
      : mergeMessages(base, messages?.[code]);
  }
  return resolved;
}
