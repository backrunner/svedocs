declare module 'virtual:svedocs/config' {
  import type { SvedocsResolvedConfig } from 'svedocs/core';
  const config: SvedocsResolvedConfig;
  export default config;
}

declare module 'virtual:svedocs/server-config' {
  import type { SvedocsResolvedConfig } from 'svedocs/core';
  const config: SvedocsResolvedConfig;
  export default config;
}

declare module 'virtual:svedocs/pages' {
  import type { SvedocsPage } from 'svedocs/core';
  const pages: SvedocsPage[];
  export default pages;
}

declare module 'virtual:svedocs/page-index' {
  import type { SvedocsPage } from 'svedocs/core';
  const pages: SvedocsPage[];
  export default pages;
}

declare module 'virtual:svedocs/page-loaders' {
  import type { SvedocsPage } from 'svedocs/core';
  const loaders: Record<string, () => Promise<{ default: SvedocsPage | undefined }>>;
  export default loaders;
}

declare module 'virtual:svedocs/tree' {
  import type { SvedocsTreeItem } from 'svedocs/core';
  const tree: SvedocsTreeItem[];
  export default tree;
}

declare module 'virtual:svedocs/search' {
  import type { SvedocsSearchRecord } from 'svedocs/core';
  const records: SvedocsSearchRecord[];
  export default records;
}

declare module 'virtual:svedocs/search-loader' {
  import type { SvedocsSearchRecord } from 'svedocs/core';
  const loadSearch: () => Promise<SvedocsSearchRecord[]>;
  export default loadSearch;
}

declare module 'virtual:svedocs/components' {
  import type { Component } from 'svelte';
  const components: Record<string, Component>;
  export default components;
}

declare module 'virtual:svedocs/layouts' {
  import type { Component } from 'svelte';
  const layouts: Record<string, Component>;
  export default layouts;
}

declare module 'virtual:svedocs/theme-components' {
  import type { SvedocsThemeComponentMap } from 'svedocs/theme/types';
  const components: Partial<SvedocsThemeComponentMap>;
  export default components;
}

declare namespace App {
  interface Platform {
    env: {
      SVEDOCS_AI_SEARCH?: import('svedocs/search').CloudflareAiSearchInstance;
      AI?: import('svedocs/ai').CloudflareWorkersAiBinding;
      ALGOLIA_APP_ID?: string;
      ALGOLIA_SEARCH_KEY?: string;
      ALGOLIA_INDEX_NAME?: string;
      TYPESENSE_HOST?: string;
      TYPESENSE_SEARCH_KEY?: string;
      TYPESENSE_COLLECTION?: string;
      OPENAI_COMPATIBLE_API_KEY?: string;
      OPENAI_COMPATIBLE_BASE_URL?: string;
      OPENAI_COMPATIBLE_MODEL?: string;
    };
    context: {
      waitUntil(promise: Promise<unknown>): void;
    };
    caches: CacheStorage;
  }
}
