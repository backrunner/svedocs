import { searchRecords } from '../../search/local.js';
import { createSearchControllerWithAdapter } from './search-controller.js';
import type { SvedocsSearchControllerOptions } from '../types.js';
export { createDefaultSearchResults, createSearchUrl } from './search-controller.js';

/** The public headless controller retains synchronous local results. */
export function createSearchController(initial: SvedocsSearchControllerOptions = {}) {
  return createSearchControllerWithAdapter(initial, { search: searchRecords });
}
