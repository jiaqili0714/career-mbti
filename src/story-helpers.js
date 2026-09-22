// Narrative data is serializable: conditions inspect earned flags and relationships.
export const line = (who, text, extra = {}) => ({ who, text, ...extra });
export const option = (text, effect, result, replies, read, extra = {}) => ({ text, effect, result, replies, read, ...extra });
export const later = (after, arc, effect, text, who = 'narrator') => ({ after, arc, effect, line: line(who, text, { memory: true }) });
