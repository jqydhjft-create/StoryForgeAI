import { describe, expect, it } from 'vitest';
import { formatCount, t } from '../renderer/i18n';

describe('i18n', () => {
  it('translates core controls to English and Simplified Chinese', () => {
    expect(t('en', 'start.createDemo')).toBe('Create demo project');
    expect(t('zh-CN', 'start.createDemo')).toBe('创建演示项目');
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
});
