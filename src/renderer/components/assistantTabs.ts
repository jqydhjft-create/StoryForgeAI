export const assistantTabs = ['review', 'summary', 'export'] as const;

export type AssistantTab = (typeof assistantTabs)[number];
