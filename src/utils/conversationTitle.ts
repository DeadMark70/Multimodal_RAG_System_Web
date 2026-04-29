export const CONVERSATION_TITLE_MAX_LENGTH = 200;
const DEFAULT_RESEARCH_TITLE = '新研究對話';

export function buildConversationTitle(
  rawQuestion: string,
  fallbackTitle: string = DEFAULT_RESEARCH_TITLE
): string {
  const normalized = rawQuestion.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return fallbackTitle;
  }
  if (normalized.length <= CONVERSATION_TITLE_MAX_LENGTH) {
    return normalized;
  }
  return normalized.slice(0, CONVERSATION_TITLE_MAX_LENGTH);
}
