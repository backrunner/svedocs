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
