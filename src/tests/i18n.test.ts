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
    expect(t('zh-CN', 'assistant.refreshingSummary')).toBe('正在刷新摘要...');
    expect(t('en', 'assistant.testingAi')).toBe('Testing AI...');
    expect(t('zh-CN', 'assistant.applyingAiConfig')).toBe('正在应用...');
  });

  it('translates tabbed assistant controls', () => {
    expect(t('zh-CN', 'assistant.tab.review')).toBe('审查');
    expect(t('en', 'assistant.tab.summary')).toBe('Summary');
    expect(t('en', 'assistant.tab.export')).toBe('Export');
  });

  it('translates workflow stage labels and actions', () => {
    expect(t('en', 'workflow.stage.intake')).toBe('Intake');
    expect(t('en', 'workflow.stage.world_outline')).toBe('World + Outline');
    expect(t('en', 'workflow.confirm')).toBe('Confirm');
    expect(t('en', 'workflow.regenerate')).toBe('Regenerate');
    expect(t('zh-CN', 'workflow.forceSave')).toBe('强制保存');
  });

  it('keeps retained legacy assistant controls translated in both languages', () => {
    const keys = [
      'assistant.generate',
      'assistant.tab.generate',
      'assistant.nextChapter',
      'assistant.generatingNextChapter',
      'assistant.pendingStoryDraft',
      'assistant.pendingChapterDraft',
      'assistant.confirmDraft',
      'assistant.discardDraft',
      'assistant.retryingFailedGate',
      'assistant.retryFailedGate'
    ] as const;

    for (const language of ['en', 'zh-CN'] as const) {
      for (const key of keys) expect(t(language, key)).toBeTruthy();
    }
  });

  it('provides browser project, export, settings, and CORS labels in both languages', () => {
    const keys = [
      'start.importProject',
      'start.localProjects',
      'start.deleteProject',
      'editor.exportBackup',
      'settings.clearApiKey',
      'browser.corsHint',
      'start.confirmDeleteProject',
      'start.importProjectFailed',
      'start.deleteProjectFailed'
    ] as const;

    for (const language of ['en', 'zh-CN'] as const) {
      for (const key of keys) {
        expect(t(language, key)).toBeTruthy();
      }
    }
  });

  it('provides unified workflow drawer labels in both languages', () => {
    const keys = [
      'workflow.currentStage',
      'workflow.completedStage',
      'workflow.returnCurrent',
      'workflow.purpose.world_outline',
      'workflow.purpose.character_bible',
      'workflow.purpose.act_timeline',
      'workflow.purpose.scene_outline',
      'workflow.purpose.chapter_draft',
      'workflow.purpose.act_scoring',
      'workflow.purpose.full_review',
      'workflow.preview.empty',
      'workflow.preview.worldDocument',
      'workflow.preview.masterOutline',
      'workflow.preview.characters',
      'workflow.preview.timeline',
      'workflow.preview.scenes',
      'workflow.preview.chapter',
      'workflow.preview.review',
      'workflow.preview.score',
      'workflow.confirmNext',
      'workflow.saveChapter',
      'workflow.forceSaveWarning',
      'workflow.chapterOutlineMissing',
      'workflow.chapterDraftingComplete',
      'workflow.chapterConflict',
      'workflow.debug'
    ] as const;

    for (const language of ['en', 'zh-CN'] as const) {
      for (const key of keys) {
        expect(t(language, key)).toBeTruthy();
      }
    }
  });

  it('translates the workspace navigation, run card, and diagnostics labels', () => {
    const expected = {
      en: {
        'workspace.settings': 'Settings',
        'workspace.back': 'Back to workspace',
        'workspace.viewAll': 'View all',
        'workspace.asset.world': 'World',
        'workspace.asset.characters': 'Characters',
        'workspace.asset.acts': 'Acts',
        'workspace.asset.chapters': 'Chapters',
        'workspace.asset.summary': 'Summary',
        'workspace.asset.export': 'Export',
        'workspace.searchAssets': 'Search assets',
        'workspace.collapseList': 'Collapse asset list',
        'workspace.expandList': 'Expand asset list',
        'workspace.expandRail': 'Expand context rail',
        'workspace.collapseRail': 'Collapse context rail',
        'workspace.running': 'Running',
        'workspace.ready': 'Ready',
        'workspace.error': 'Error',
        'workspace.idle': 'Idle',
        'workspace.elapsed': 'Elapsed',
        'workspace.retry': 'Retry',
        'workspace.technicalDetails': 'Technical details',
        'workspace.workingInBackground': 'Working in the background',
        'workspace.modelTaskFailed': 'The model task failed.',
        'workspace.assetTypes': 'Asset types',
        'workspace.assetList': 'Asset list',
        'workspace.contextRail': 'Workflow context',
        'workspace.noMatchingAssets': 'No matching assets',
        'diagnostics.title': 'Settings & Diagnostics',
        'diagnostics.provider': 'Model provider',
        'diagnostics.benchmark': 'Benchmark audit',
        'diagnostics.description': 'Configure the model provider and inspect local workflow and benchmark activity.'
      },
      'zh-CN': {
        'workspace.settings': '设置',
        'workspace.back': '返回工作区',
        'workspace.viewAll': '查看全部',
        'workspace.asset.world': '世界',
        'workspace.asset.characters': '角色',
        'workspace.asset.acts': '幕结构',
        'workspace.asset.chapters': '章节',
        'workspace.asset.summary': '摘要',
        'workspace.asset.export': '导出',
        'workspace.searchAssets': '搜索资产',
        'workspace.collapseList': '收起资产列表',
        'workspace.expandList': '展开资产列表',
        'workspace.expandRail': '展开上下文栏',
        'workspace.collapseRail': '收起上下文栏',
        'workspace.running': '运行中',
        'workspace.ready': '已就绪',
        'workspace.error': '错误',
        'workspace.idle': '空闲',
        'workspace.elapsed': '已用时间',
        'workspace.retry': '重试',
        'workspace.technicalDetails': '技术详情',
        'workspace.workingInBackground': '正在后台运行',
        'workspace.modelTaskFailed': '模型任务失败。',
        'workspace.assetTypes': '资产类型',
        'workspace.assetList': '资产列表',
        'workspace.contextRail': '工作流上下文',
        'workspace.noMatchingAssets': '没有匹配的资产',
        'diagnostics.title': '设置与诊断',
        'diagnostics.provider': '模型提供商',
        'diagnostics.benchmark': '基准审计',
        'diagnostics.description': '配置模型提供商，并检查本地工作流和基准活动。'
      }
    } as const;

    for (const language of ['en', 'zh-CN'] as const) {
      for (const [key, value] of Object.entries(expected[language])) {
        expect(t(language, key as Parameters<typeof t>[1])).toBe(value);
      }
    }
  });
});
