import { describe, expect, it } from 'vitest';
import { formatCount, t } from '../renderer/i18n';

describe('i18n', () => {
  it('translates core controls to English and Simplified Chinese', () => {
    expect(t('en', 'start.createProject')).toBe('Create project');
    expect(t('zh-CN', 'start.createProject')).toBe('创建项目');
    expect(t('en', 'tree.kind.world')).toBe('World');
    expect(t('zh-CN', 'tree.kind.world')).toBe('世界观');
  });

  it('formats summary counts for each language', () => {
    expect(formatCount('en', 'summary.timelineEntries', 2)).toBe('2 timeline entries');
    expect(formatCount('zh-CN', 'summary.timelineEntries', 2)).toBe('2 条时间线');
  });

  it('translates export write status messages', () => {
    expect(t('en', 'assistant.writeExports')).toBe('Write export files');
    expect(t('zh-CN', 'assistant.exportsWritten')).toBe('导出文件已写入项目 exports 文件夹');
  });

  it('translates project action labels', () => {
    expect(t('en', 'tree.addChapter')).toBe('New chapter');
    expect(t('zh-CN', 'tree.addCharacter')).toBe('新增人物');
    expect(t('en', 'assistant.openExportsFolder')).toBe('Open exports folder');
  });

  it('keeps start placeholders generic instead of demo project names', () => {
    expect(t('en', 'start.projectNamePlaceholder')).toBe('Untitled story');
    expect(t('zh-CN', 'start.projectNamePlaceholder')).toBe('未命名故事');
  });

  it('translates async assistant action states', () => {
    expect(t('en', 'assistant.generating')).toBe('Generating...');
    expect(t('zh-CN', 'assistant.refreshingSummary')).toBe('正在刷新摘要...');
    expect(t('en', 'assistant.testingAi')).toBe('Testing AI...');
    expect(t('zh-CN', 'assistant.applyingAiConfig')).toBe('正在应用...');
    expect(t('en', 'assistant.retryFailedGate')).toBe('Retry failed gate');
    expect(t('zh-CN', 'assistant.retryingFailedGate')).toBe('正在重试失败门禁...');
  });

  it('translates tabbed assistant and next chapter controls', () => {
    expect(t('en', 'assistant.tab.generate')).toBe('Generate');
    expect(t('zh-CN', 'assistant.tab.review')).toBe('审查');
    expect(t('en', 'assistant.nextChapter')).toBe('Generate current chapter content');
    expect(t('zh-CN', 'assistant.nextChapterReady')).toBe('本章内容已写入项目');
  });
});
