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
  | 'editor.exports'
  | 'editor.exportsHint'
  | 'editor.noEditableDocument'
  | 'editor.save'
  | 'editor.saved'
  | 'editor.saveFailed'
  | 'assistant.idea'
  | 'assistant.generate'
  | 'assistant.review'
  | 'assistant.reviewOk'
  | 'assistant.summary'
  | 'assistant.refreshSummary'
  | 'assistant.exportPreview'
  | 'summary.timelineEntries'
  | 'summary.locations'
  | 'summary.characters'
  | 'tree.kind.world'
  | 'tree.kind.character'
  | 'tree.kind.plot'
  | 'tree.kind.chapter'
  | 'tree.kind.export'
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
    'start.projectNamePlaceholder': 'Ash Road',
    'start.createProject': 'Create project',
    'start.createDemo': 'Create demo project',
    'start.openProject': 'Open project',
    'editor.world': 'World Bible',
    'editor.character': 'Character',
    'editor.plot': 'Beat Sheet',
    'editor.exports': 'Exports',
    'editor.exportsHint': 'Use the assistant panel to build novel and summary exports.',
    'editor.noEditableDocument': 'No editable document for this selection.',
    'editor.save': 'Save',
    'editor.saved': 'Saved',
    'editor.saveFailed': 'Save failed',
    'assistant.idea': 'Idea to story',
    'assistant.generate': 'Generate starter assets',
    'assistant.review': 'Review',
    'assistant.reviewOk': 'No continuity warnings in the current mock review.',
    'assistant.summary': 'Summary',
    'assistant.refreshSummary': 'Refresh summary',
    'assistant.exportPreview': 'Export preview',
    'summary.timelineEntries': 'timeline entries',
    'summary.locations': 'locations',
    'summary.characters': 'characters',
    'tree.kind.world': 'World',
    'tree.kind.character': 'Character',
    'tree.kind.plot': 'Plot',
    'tree.kind.chapter': 'Chapter',
    'tree.kind.export': 'Export',
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
    'start.projectNamePlaceholder': '灰烬之路',
    'start.createProject': '创建项目',
    'start.createDemo': '创建演示项目',
    'start.openProject': '打开项目',
    'editor.world': '世界观圣经',
    'editor.character': '人物档案',
    'editor.plot': '情节蓝图',
    'editor.exports': '导出',
    'editor.exportsHint': '在辅助面板生成小说和摘要导出。',
    'editor.noEditableDocument': '当前选择没有可编辑文档。',
    'editor.save': '保存',
    'editor.saved': '已保存',
    'editor.saveFailed': '保存失败',
    'assistant.idea': '想法到故事',
    'assistant.generate': '生成起始资产',
    'assistant.review': '审查',
    'assistant.reviewOk': '当前模拟审查未发现连续性警告。',
    'assistant.summary': '摘要',
    'assistant.refreshSummary': '刷新摘要',
    'assistant.exportPreview': '导出预览',
    'summary.timelineEntries': '条时间线',
    'summary.locations': '个地点',
    'summary.characters': '个人物',
    'tree.kind.world': '世界观',
    'tree.kind.character': '人物',
    'tree.kind.plot': '情节',
    'tree.kind.chapter': '章节',
    'tree.kind.export': '导出',
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
