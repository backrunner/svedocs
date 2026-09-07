import { searchRecords } from '../../search/local.js';
import { createAskAiControllerWithAdapter } from './ask-controller.js';
import type { SvedocsAskAiControllerOptions } from '../types.js';

export function createAskAiController(initial: SvedocsAskAiControllerOptions) {
  return createAskAiControllerWithAdapter(initial, { search: searchRecords });
}
