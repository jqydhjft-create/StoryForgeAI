export type Language = 'en' | 'zh-CN';

type TranslationKey =
  | 'language.label'
  | 'language.english'
  | 'language.chinese'
  | 'start.title'
  | 'start.projectName'
  | 'start.projectNamePlaceholder'
  | 'start.createProject'
  | 'start.createDemo'
  | 'start.openProject'
  | 'editor.world'
  | 'editor.character'
  | 'editor.plot'
  | 'editor.summary'
  | 'editor.exports'
  | 'editor.exportsHint'
  | 'editor.noEditableDocument'
  | 'editor.save'
  | 'editor.saved'
  | 'editor.saveFailed'
  | 'editor.regenerateChapter'
  | 'editor.rollbackChapter'
  | 'assistant.idea'
  | 'assistant.tab.generate'
  | 'assistant.tab.review'
  | 'assistant.tab.summary'
  | 'assistant.tab.export'
  | 'assistant.generate'
  | 'assistant.generating'
  | 'assistant.nextChapter'
  | 'assistant.generatingNextChapter'
  | 'assistant.nextChapterReady'
  | 'assistant.nextChapterFailed'
  | 'assistant.saveBeforeGenerate'
  | 'assistant.selectChapterFirst'
  | 'assistant.draftReady'
  | 'assistant.confirmDraft'
  | 'assistant.discardDraft'
  | 'assistant.pendingStoryDraft'
  | 'assistant.pendingChapterDraft'
  | 'assistant.liveWarnings'
  | 'assistant.noLiveWarnings'
  | 'assistant.collapse'
  | 'assistant.expand'
  | 'assistant.review'
  | 'assistant.reviewOk'
  | 'assistant.summary'
  | 'assistant.refreshSummary'
  | 'assistant.refreshingSummary'
  | 'assistant.exportPreview'
  | 'assistant.writeExports'
  | 'assistant.exportsWritten'
  | 'assistant.exportsReady'
  | 'assistant.exportsOpened'
  | 'assistant.openExportsFolder'
  | 'assistant.openExportsUnavailable'
  | 'assistant.exportFailed'
  | 'assistant.seedApplied'
  | 'assistant.seedFailed'
  | 'assistant.applyAiConfig'
  | 'assistant.applyingAiConfig'
  | 'assistant.testAi'
  | 'assistant.testingAi'
  | 'assistant.retryFailedGate'
  | 'assistant.retryingFailedGate'
  | 'summary.timelineEntries'
  | 'summary.locations'
  | 'summary.characters'
  | 'tree.addChapter'
  | 'tree.addCharacter'
  | 'tree.deleteCharacter'
  | 'tree.deleteChapter'
  | 'tree.kind.world'
  | 'tree.kind.character'
  | 'tree.kind.plot'
  | 'tree.kind.chapter'
  | 'tree.kind.export'
  | 'tree.kind.summary'
  | 'error.desktopApiUnavailable'
  | 'error.openProject'
  | 'error.createProject';

const translations: Record<Language, Record<TranslationKey, string>> = {
  en: {
    'language.label': 'Language',
    'language.english': 'English',
    'language.chinese': 'Simplified Chinese',
    'start.title': 'Desktop story workspace',
    'start.projectName': 'Project name',
    'start.projectNamePlaceholder': 'Untitled story',
    'start.createProject': 'Create project',
    'start.createDemo': 'Create demo project',
    'start.openProject': 'Open project',
    'editor.world': 'World Bible',
    'editor.character': 'Character',
    'editor.plot': 'Beat Sheet',
    'editor.summary': 'Story Summary',
    'editor.exports': 'Exports',
    'editor.exportsHint': 'Use the assistant export tab to write Markdown and TXT files.',
    'editor.noEditableDocument': 'No editable document for this selection.',
    'editor.save': 'Save',
    'editor.saved': 'Saved',
    'editor.saveFailed': 'Save failed',
    'editor.regenerateChapter': 'Regenerate',
    'editor.rollbackChapter': 'Rollback',
    'assistant.idea': 'Idea to story',
    'assistant.tab.generate': 'Generate',
    'assistant.tab.review': 'Review',
    'assistant.tab.summary': 'Summary',
    'assistant.tab.export': 'Export',
    'assistant.generate': 'Generate starter assets',
    'assistant.generating': 'Generating...',
    'assistant.nextChapter': 'Generate current chapter content',
    'assistant.generatingNextChapter': 'Generating chapter content...',
    'assistant.nextChapterReady': 'Current chapter content saved to the project',
    'assistant.nextChapterFailed': 'Unable to generate chapter content',
    'assistant.saveBeforeGenerate': 'Save the current chapter before generating.',
    'assistant.selectChapterFirst': 'Select a chapter before generating content.',
    'assistant.draftReady': 'Draft ready for review',
    'assistant.confirmDraft': 'Accept draft',
    'assistant.discardDraft': 'Discard draft',
    'assistant.pendingStoryDraft': 'Story asset draft',
    'assistant.pendingChapterDraft': 'Chapter draft',
    'assistant.liveWarnings': 'Live warnings',
    'assistant.noLiveWarnings': 'No live warnings after the last save.',
    'assistant.collapse': 'Collapse assistant',
    'assistant.expand': 'Expand assistant',
    'assistant.review': 'Review',
    'assistant.reviewOk': 'No continuity warnings in the current mock review.',
    'assistant.summary': 'Summary',
    'assistant.refreshSummary': 'Refresh summary',
    'assistant.refreshingSummary': 'Refreshing summary...',
    'assistant.exportPreview': 'Export preview',
    'assistant.writeExports': 'Write export files',
    'assistant.exportsWritten': 'Export files written to the project exports folder',
    'assistant.exportsReady': 'Exports are ready in the preview',
    'assistant.exportsOpened': 'Exports folder opened',
    'assistant.openExportsFolder': 'Open exports folder',
    'assistant.openExportsUnavailable': 'Create or open a desktop project to open exports',
    'assistant.exportFailed': 'Export failed',
    'assistant.seedApplied': 'Starter assets saved to the project',
    'assistant.seedFailed': 'Unable to save starter assets',
    'assistant.applyAiConfig': 'Apply',
    'assistant.applyingAiConfig': 'Applying...',
    'assistant.testAi': 'Test AI',
    'assistant.testingAi': 'Testing AI...',
    'assistant.retryFailedGate': 'Retry failed gate',
    'assistant.retryingFailedGate': 'Retrying failed gate...',
    'summary.timelineEntries': 'timeline entries',
    'summary.locations': 'locations',
    'summary.characters': 'characters',
    'tree.addChapter': 'New chapter',
    'tree.addCharacter': 'New character',
    'tree.deleteCharacter': 'Delete character',
    'tree.deleteChapter': 'Delete chapter',
    'tree.kind.world': 'World',
    'tree.kind.character': 'Character',
    'tree.kind.plot': 'Plot',
    'tree.kind.chapter': 'Chapter',
    'tree.kind.export': 'Export',
    'tree.kind.summary': 'Summary',
    'error.desktopApiUnavailable': 'Desktop API is not available in this preview.',
    'error.openProject': 'Unable to open project.',
    'error.createProject': 'Unable to create project.'
  },
  'zh-CN': {
    'language.label': '语言',
    'language.english': 'English',
    'language.chinese': '简体中文',
    'start.title': '桌面故事工作台',
    'start.projectName': '项目名',
    'start.projectNamePlaceholder': '未命名故事',
    'start.createProject': '创建项目',
    'start.createDemo': '创建演示项目',
    'start.openProject': '打开项目',
    'editor.world': '世界观圣经',
    'editor.character': '人物档案',
    'editor.plot': '情节蓝图',
    'editor.summary': '故事摘要',
    'editor.exports': '导出',
    'editor.exportsHint': '使用助手导出标签写入 Markdown 和 TXT 文件。',
    'editor.noEditableDocument': '当前选择没有可编辑文档。',
    'editor.save': '保存',
    'editor.saved': '已保存',
    'editor.saveFailed': '保存失败',
    'editor.regenerateChapter': '重新生成',
    'editor.rollbackChapter': '版本回滚',
    'assistant.idea': '想法到故事',
    'assistant.tab.generate': '生成',
    'assistant.tab.review': '审查',
    'assistant.tab.summary': '摘要',
    'assistant.tab.export': '导出',
    'assistant.generate': '生成起始资产',
    'assistant.generating': '正在生成...',
    'assistant.nextChapter': '生成本章内容',
    'assistant.generatingNextChapter': '正在生成本章内容...',
    'assistant.nextChapterReady': '本章内容已写入项目',
    'assistant.nextChapterFailed': '无法生成本章内容',
    'assistant.saveBeforeGenerate': '请先保存当前章节，再继续生成。',
    'assistant.selectChapterFirst': '请先选择一个章节，再生成内容。',
    'assistant.draftReady': '草稿已生成，等待确认',
    'assistant.confirmDraft': '确认写入',
    'assistant.discardDraft': '丢弃草稿',
    'assistant.pendingStoryDraft': '故事资产草稿',
    'assistant.pendingChapterDraft': '章节草稿',
    'assistant.liveWarnings': '实时警告',
    'assistant.noLiveWarnings': '上次保存后没有实时警告。',
    'assistant.collapse': '折叠助手',
    'assistant.expand': '展开助手',
    'assistant.review': '审查',
    'assistant.reviewOk': '当前模拟审查未发现连续性警告。',
    'assistant.summary': '摘要',
    'assistant.refreshSummary': '刷新摘要',
    'assistant.refreshingSummary': '正在刷新摘要...',
    'assistant.exportPreview': '导出预览',
    'assistant.writeExports': '写出导出文件',
    'assistant.exportsWritten': '导出文件已写入项目 exports 文件夹',
    'assistant.exportsReady': '导出内容已在预览中准备好',
    'assistant.exportsOpened': '已打开导出文件夹',
    'assistant.openExportsFolder': '打开导出文件夹',
    'assistant.openExportsUnavailable': '请先创建或打开桌面项目',
    'assistant.exportFailed': '导出失败',
    'assistant.seedApplied': '起始资产已保存到项目',
    'assistant.seedFailed': '无法保存起始资产',
    'assistant.applyAiConfig': '应用',
    'assistant.applyingAiConfig': '正在应用...',
    'assistant.testAi': '测试 AI',
    'assistant.testingAi': '正在测试 AI...',
    'assistant.retryFailedGate': '重试失败门禁',
    'assistant.retryingFailedGate': '正在重试失败门禁...',
    'summary.timelineEntries': '条时间线',
    'summary.locations': '个地点',
    'summary.characters': '个人物',
    'tree.addChapter': '新增章节',
    'tree.addCharacter': '新增人物',
    'tree.deleteCharacter': '删除人物',
    'tree.deleteChapter': '删除章节',
    'tree.kind.world': '世界观',
    'tree.kind.character': '人物',
    'tree.kind.plot': '情节',
    'tree.kind.chapter': '章节',
    'tree.kind.export': '导出',
    'tree.kind.summary': '摘要',
    'error.desktopApiUnavailable': '当前预览无法使用桌面 API。',
    'error.openProject': '无法打开项目。',
    'error.createProject': '无法创建项目。'
  }
};

export function t(language: Language, key: TranslationKey): string {
  return translations[language][key];
}

export function formatCount(language: Language, key: Extract<TranslationKey, `summary.${string}`>, count: number): string {
  if (language === 'zh-CN') {
    return `${count} ${t(language, key)}`;
  }

  return `${count} ${t(language, key)}`;
}
