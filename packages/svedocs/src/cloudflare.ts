import type { SvedocsResolvedConfig } from './core.js';

export type SvedocsBuildMode = 'edge' | 'static' | 'spa';

export interface CloudflareBindingShape {
  AI?: unknown;
  SVEDOCS_AI_SEARCH?: unknown;
  SVEDOCS_ASSETS?: unknown;
  [key: string]: unknown;
}

export interface CloudflareBuildPreset {
  mode: SvedocsBuildMode;
  adapter: '@sveltejs/adapter-cloudflare' | '@sveltejs/adapter-static';
  output: string;
  recommended: boolean;
  warning?: string;
}

export function createCloudflarePreset(mode: SvedocsBuildMode = 'edge'): CloudflareBuildPreset {
  if (mode === 'edge') {
    return {
      mode,
      adapter: '@sveltejs/adapter-cloudflare',
      output: '.svelte-kit/cloudflare',
      recommended: true
    };
  }
  if (mode === 'static') {
    return {
      mode,
      adapter: '@sveltejs/adapter-static',
      output: 'build',
      recommended: true
    };
  }
  return {
    mode,
    adapter: '@sveltejs/adapter-static',
    output: 'build',
    recommended: false,
    warning: 'SPA mode is supported for constrained deployments, but edge SSR or SSG is recommended.'
  };
}

export function createWranglerJson(config: SvedocsResolvedConfig): Record<string, unknown> {
  const wrangler: Record<string, unknown> = {
    $schema: 'node_modules/wrangler/config-schema.json',
    name: config.site.name,
    compatibility_date: config.cloudflare.compatibilityDate,
    pages_build_output_dir: createCloudflarePreset(config.build.mode).output
  };
  if (usesCloudflareAiSearch(config)) {
    const aiSearchBinding = {
      binding: config.cloudflare.aiSearch.binding,
      remote: config.cloudflare.aiSearch.remote
    };
    if (config.cloudflare.aiSearch.namespace) {
      wrangler.ai_search_namespaces = [
        {
          ...aiSearchBinding,
          namespace: config.cloudflare.aiSearch.namespace
        }
      ];
    } else {
      wrangler.ai_search = [
        {
          ...aiSearchBinding,
          instance_name: config.cloudflare.aiSearch.instanceName
        }
      ];
    }
  }
  if (usesCloudflareWorkersAi(config)) {
    wrangler.ai = {
      binding: 'AI'
    };
  }
  return wrangler;
}

export function createWranglerJsonc(config: SvedocsResolvedConfig): string {
  return `${JSON.stringify(createWranglerJson(config), null, 2)}\n`;
}

export function createWranglerToml(config: SvedocsResolvedConfig): string {
  const lines = [
    `name = ${tomlString(config.site.name)}`,
    `compatibility_date = ${tomlString(config.cloudflare.compatibilityDate)}`,
    `pages_build_output_dir = ${tomlString(createCloudflarePreset(config.build.mode).output)}`
  ];

  if (usesCloudflareAiSearch(config)) {
    lines.push('');
    if (config.cloudflare.aiSearch.namespace) {
      lines.push(
        '[[ai_search_namespaces]]',
        `binding = ${tomlString(config.cloudflare.aiSearch.binding)}`,
        `namespace = ${tomlString(config.cloudflare.aiSearch.namespace)}`
      );
    } else {
      lines.push(
        '[[ai_search]]',
        `binding = ${tomlString(config.cloudflare.aiSearch.binding)}`,
        `instance_name = ${tomlString(config.cloudflare.aiSearch.instanceName)}`
      );
    }
    if (config.cloudflare.aiSearch.remote) {
      lines.push('remote = true');
    }
  }

  if (usesCloudflareWorkersAi(config)) {
    lines.push('', '[ai]', 'binding = "AI"');
  }

  return `${lines.join('\n')}\n`;
}

export function createCloudflareEnvDts(config: SvedocsResolvedConfig): string {
  const lines = [
    'declare namespace App {',
    '  interface Platform {',
    '    env: {',
    ...createCloudflareBindingLines(config),
    '    };',
    '    context: {',
    '      waitUntil(promise: Promise<unknown>): void;',
    '    };',
    '    caches: CacheStorage;',
    '  }',
    '}'
  ];
  return `${lines.join('\n')}\n`;
}

export function usesCloudflareAiSearch(config: SvedocsResolvedConfig): boolean {
  return (config.search.enabled && config.search.provider === 'cloudflare-ai-search')
    || (config.ai.enabled && config.ai.provider === 'cloudflare-ai-search');
}

export function usesCloudflareWorkersAi(config: SvedocsResolvedConfig): boolean {
  return config.ai.enabled && config.ai.provider === 'cloudflare-workers-ai';
}

function createCloudflareBindingLines(config: SvedocsResolvedConfig): string[] {
  const bindings = new Map<string, string[]>();
  if (usesCloudflareAiSearch(config)) {
    addBindingType(
      bindings,
      config.cloudflare.aiSearch.binding,
      config.cloudflare.aiSearch.namespace
        ? `import('svedocs/search').CloudflareAiSearchNamespace`
        : `import('svedocs/search').CloudflareAiSearchInstance`
    );
  }
  if (usesCloudflareWorkersAi(config)) {
    addBindingType(bindings, 'AI', `import('svedocs/ai').CloudflareWorkersAiBinding`);
  }
  const lines = Array.from(bindings.entries()).map(([name, types]) => `      ${formatBindingProperty(name)}: ${types.join(' & ')};`);
  return lines.length > 0 ? lines : ['      [key: string]: unknown;'];
}

function addBindingType(bindings: Map<string, string[]>, name: string, type: string): void {
  bindings.set(name, [...(bindings.get(name) ?? []), type]);
}

function formatBindingProperty(name: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(name) ? name : JSON.stringify(name);
}

function tomlString(value: string): string {
  return JSON.stringify(value);
}
