export type Language = 'en' | 'zh-CN';

type TranslationKey =
  | 'language.label'
  | 'language.english'
  | 'language.chinese'
  | 'start.title'
  | 'start.projectName'
  | 'start.projectNamePlaceholder'
  | 'start.storyIdea'
  | 'start.storyIdeaPlaceholder'
  | 'starter.title'
  | 'starter.heading'
  | 'starter.ideaLabel'
  | 'starter.ideaPlaceholder'
  | 'starter.randomSeed'
  | 'starter.generating'
  | 'starter.launch'
  | 'starter.aiConfig'
  | 'starter.notConfigured'
  | 'starter.toggleConfig'
  | 'starter.apply'
  | 'starter.applying'
  | 'starter.test'
  | 'starter.testing'
  | 'start.createProject'
  | 'start.createDemo'
  | 'start.openProject'
  | 'start.importProject'
  | 'start.localProjects'
  | 'start.deleteProject'
  | 'start.confirmDeleteProject'
  | 'start.importProjectFailed'
  | 'start.deleteProjectFailed'
  | 'editor.world'
  | 'editor.character'
  | 'editor.plot'
  | 'editor.summary'
  | 'editor.exports'
  | 'editor.exportsHint'
  | 'editor.exportBackup'
  | 'editor.noEditableDocument'
  | 'editor.emptyHint'
  | 'editor.save'
  | 'editor.generateChapter'
  | 'editor.saved'
  | 'editor.saveFailed'
  | 'assistant.idea'
  | 'assistant.generating'
  | 'assistant.generate'
  | 'assistant.tab.generate'
  | 'assistant.nextChapter'
  | 'assistant.generatingNextChapter'
  | 'assistant.pendingStoryDraft'
  | 'assistant.pendingChapterDraft'
  | 'assistant.confirmDraft'
  | 'assistant.discardDraft'
  | 'assistant.retryingFailedGate'
  | 'assistant.retryFailedGate'
  | 'assistant.tab.review'
  | 'assistant.tab.summary'
  | 'assistant.tab.export'
  | 'assistant.nextChapterFailed'
  | 'assistant.saveBeforeGenerate'
  | 'assistant.selectChapterFirst'
  | 'assistant.draftReady'
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
  | 'workflow.stage.intake'
  | 'workflow.stage.world_outline'
  | 'workflow.stage.character_bible'
  | 'workflow.stage.act_timeline'
  | 'workflow.stage.scene_outline'
  | 'workflow.stage.chapter_draft'
  | 'workflow.stage.act_scoring'
  | 'workflow.stage.full_review'
  | 'workflow.status.locked'
  | 'workflow.status.draft'
  | 'workflow.status.confirmed'
  | 'workflow.status.regenerating'
  | 'workflow.status.optional'
  | 'workflow.confirm'
  | 'workflow.regenerate'
  | 'workflow.forceSave'
  | 'workflow.generate'
  | 'workflow.ideaLabel'
  | 'workflow.ideaPlaceholder'
  | 'workflow.reviewBlocked'
  | 'workflow.scoreAct'
  | 'workflow.fullReview'
  | 'workflow.currentStage'
  | 'workflow.completedStage'
  | 'workflow.returnCurrent'
  | 'workflow.purpose.world_outline'
  | 'workflow.purpose.character_bible'
  | 'workflow.purpose.act_timeline'
  | 'workflow.purpose.scene_outline'
  | 'workflow.purpose.chapter_draft'
  | 'workflow.purpose.act_scoring'
  | 'workflow.purpose.full_review'
  | 'workflow.preview.empty'
  | 'workflow.preview.worldDocument'
  | 'workflow.preview.masterOutline'
  | 'workflow.preview.characters'
  | 'workflow.preview.timeline'
  | 'workflow.preview.scenes'
  | 'workflow.preview.chapter'
  | 'workflow.preview.review'
  | 'workflow.preview.score'
  | 'workflow.confirmNext'
  | 'workflow.saveChapter'
  | 'workflow.forceSaveWarning'
  | 'workflow.chapterOutlineMissing'
  | 'workflow.chapterDraftingComplete'
  | 'workflow.chapterConflict'
  | 'workflow.debug'
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
  | 'tree.kind.scene_outline'
  | 'tree.kind.chapter'
  | 'tree.kind.export'
  | 'tree.kind.summary'
  | 'workspace.settings'
  | 'workspace.back'
  | 'workspace.viewAll'
  | 'workspace.asset.world'
  | 'workspace.asset.characters'
  | 'workspace.asset.acts'
  | 'workspace.asset.scene_outline'
  | 'workspace.asset.chapters'
  | 'workspace.asset.summary'
  | 'workspace.asset.export'
  | 'workspace.searchAssets'
  | 'workspace.collapseList'
  | 'workspace.expandList'
  | 'workspace.expandRail'
  | 'workspace.collapseRail'
  | 'workspace.running'
  | 'workspace.ready'
  | 'workspace.error'
  | 'workspace.idle'
  | 'workspace.elapsed'
  | 'workspace.retry'
  | 'workspace.technicalDetails'
  | 'workspace.workingInBackground'
  | 'workspace.modelTaskFailed'
  | 'workspace.assetTypes'
  | 'workspace.assetList'
  | 'workspace.contextRail'
  | 'workspace.noMatchingAssets'
  | 'diagnostics.title'
  | 'diagnostics.provider'
  | 'diagnostics.benchmark'
  | 'diagnostics.description'
  | 'settings.clearApiKey'
  | 'provider.configured'
  | 'provider.notConfigured'
  | 'provider.provider'
  | 'provider.model'
  | 'provider.baseUrl'
  | 'provider.apiKey'
  | 'provider.apiKeyPlaceholder'
  | 'provider.apply'
  | 'provider.applying'
  | 'provider.testConnection'
  | 'provider.testingConnection'
  | 'starter.apiKeyPlaceholder'
  | 'starter.modelPlaceholder'
  | 'starter.baseUrlPlaceholder'
  | 'app.modelConnectionFailed'
  | 'app.sessionAiConfigApplied'
  | 'app.apiKeyRequired'
  | 'app.unableToApplyAiConfig'
  | 'app.unableToClearApiKey'
  | 'browser.corsHint'
  | 'error.desktopApiUnavailable'
  | 'error.openProject'
  | 'error.createProject';

const translations: Record<Language, Record<TranslationKey, string>> = {
  en: {
    'workflow.currentStage': 'Current stage',
    'workflow.completedStage': 'Completed stage',
    'workflow.returnCurrent': 'Return to current stage',
    'workflow.purpose.world_outline': 'Establish the world rules and story direction',
    'workflow.purpose.character_bible': 'Define the cast, motivations, relationships, and arcs',
    'workflow.purpose.act_timeline': 'Organize act goals, turns, and chronology',
    'workflow.purpose.scene_outline': 'Plan chapter targets, scenes, and anchors',
    'workflow.purpose.chapter_draft': 'Draft and review the next outlined chapter',
    'workflow.purpose.act_scoring': 'Score the completed act and expose revision priorities',
    'workflow.purpose.full_review': 'Review the complete manuscript for final issues',
    'workflow.preview.empty': 'No stage output yet',
    'workflow.preview.worldDocument': 'World document',
    'workflow.preview.masterOutline': 'Master outline',
    'workflow.preview.characters': 'Characters',
    'workflow.preview.timeline': 'Act timeline',
    'workflow.preview.scenes': 'Scene outline',
    'workflow.preview.chapter': 'Chapter draft',
    'workflow.preview.review': 'Review',
    'workflow.preview.score': 'Act score',
    'workflow.confirmNext': 'Confirm and continue',
    'workflow.saveChapter': 'Save chapter and continue',
    'workflow.forceSaveWarning': 'Save despite the current review issues',
    'workflow.chapterOutlineMissing': 'Confirm a scene outline before generating chapters.',
    'workflow.chapterDraftingComplete': 'All outlined chapters have been drafted and reviewed.',
    'workflow.chapterConflict': 'Existing content will not be overwritten in chapter',
    'workflow.debug': 'Raw data (debug)',
    'language.label': 'Language',
    'language.english': 'English',
    'language.chinese': 'Simplified Chinese',
    'start.title': 'Desktop story workspace',
    'start.storyIdea': 'Story idea',
    'start.storyIdeaPlaceholder': 'A sentence that captures the heart of your story...',
    'starter.title': 'Getting started',
    'starter.heading': 'What story do you want to tell?',
    'starter.ideaLabel': 'Story idea',
    'starter.ideaPlaceholder': 'Enter a brief story premise, or let AI generate one...',
    'starter.randomSeed': 'AI inspiration',
    'starter.generating': 'Generating...',
    'starter.launch': 'Launch workflow',
    'starter.aiConfig': 'AI config',
    'starter.notConfigured': 'Not configured',
    'starter.toggleConfig': 'Toggle AI config',
    'starter.apply': 'Apply',
    'starter.applying': 'Applying...',
    'starter.test': 'Test AI',
    'starter.testing': 'Testing AI...',
    'start.projectName': 'Project name',
    'start.projectNamePlaceholder': 'Untitled story',
    'start.createProject': 'Create project',
    'start.createDemo': 'Create demo project',
    'start.openProject': 'Open project',
    'start.importProject': 'Import project',
    'start.localProjects': 'Local projects',
    'start.deleteProject': 'Delete project',
    'start.confirmDeleteProject': 'Delete this local project?',
    'start.importProjectFailed': 'Unable to import this project backup.',
    'start.deleteProjectFailed': 'Unable to delete this local project.',
    'editor.world': 'World Bible',
    'editor.character': 'Character',
    'editor.plot': 'Beat Sheet',
    'editor.summary': 'Story Summary',
    'editor.exports': 'Exports',
    'editor.exportsHint': 'Use the assistant export tab to write Markdown and TXT files.',
    'editor.exportBackup': 'Download project backup',
    'editor.noEditableDocument': 'No editable document for this selection.',
    'editor.emptyHint': 'Use the workflow bar at the top to generate content, then edit it here.',
    'editor.save': 'Save',
    'editor.generateChapter': 'Next chapter',
    'editor.saved': 'Saved',
    'editor.saveFailed': 'Save failed',
    'assistant.idea': 'Idea to story',
    'assistant.tab.review': 'Review',
    'assistant.tab.summary': 'Summary',
    'assistant.tab.export': 'Export',
    'assistant.generating': 'Generating story...',
    'assistant.generate': 'Generate',
    'assistant.tab.generate': 'Generate',
    'assistant.nextChapter': 'Next chapter',
    'assistant.generatingNextChapter': 'Generating next chapter...',
    'assistant.pendingStoryDraft': 'Pending story draft',
    'assistant.pendingChapterDraft': 'Pending chapter draft',
    'assistant.confirmDraft': 'Confirm draft',
    'assistant.discardDraft': 'Discard draft',
    'assistant.retryingFailedGate': 'Retrying failed gate...',
    'assistant.retryFailedGate': 'Retry failed gate',
    'assistant.nextChapterFailed': 'Unable to generate chapter content',
    'assistant.saveBeforeGenerate': 'Save the current chapter before generating.',
    'assistant.selectChapterFirst': 'Select a chapter before generating content.',
    'assistant.draftReady': 'Draft ready for review',
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
    'workflow.stage.intake': 'Intake',
    'workflow.stage.world_outline': 'World + Outline',
    'workflow.stage.character_bible': 'Character Bible',
    'workflow.stage.act_timeline': 'Act Timeline',
    'workflow.stage.scene_outline': 'Scene Outline',
    'workflow.stage.chapter_draft': 'Chapter Drafting',
    'workflow.stage.act_scoring': 'Act Scoring',
    'workflow.stage.full_review': 'Full Review',
    'workflow.status.locked': 'Locked',
    'workflow.status.draft': 'Draft',
    'workflow.status.confirmed': 'Confirmed',
    'workflow.status.regenerating': 'Regenerating',
    'workflow.status.optional': 'Optional',
    'workflow.confirm': 'Confirm',
    'workflow.regenerate': 'Regenerate',
    'workflow.forceSave': 'Force save',
    'workflow.generate': 'Generate',
    'workflow.ideaLabel': 'Initial story idea',
    'workflow.ideaPlaceholder': 'Answer the starting question here, then generate the intake draft.',
    'workflow.reviewBlocked': 'Review blocked save',
    'workflow.scoreAct': 'Score act',
    'workflow.fullReview': 'Full review',
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
    'tree.kind.scene_outline': 'Scene outline',
    'tree.kind.chapter': 'Chapter',
    'tree.kind.export': 'Export',
    'tree.kind.summary': 'Summary',
    'workspace.settings': 'Settings',
    'workspace.back': 'Back to workspace',
    'workspace.viewAll': 'View all',
    'workspace.asset.world': 'World',
    'workspace.asset.characters': 'Characters',
    'workspace.asset.acts': 'Acts',
    'workspace.asset.scene_outline': 'Scene outline',
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
    'diagnostics.description': 'Configure the model provider and inspect local workflow and benchmark activity.',
    'settings.clearApiKey': 'Clear API key',
    'provider.configured': 'configured',
    'provider.notConfigured': 'not configured',
    'provider.provider': 'Provider',
    'provider.model': 'Model',
    'provider.baseUrl': 'Base URL',
    'provider.apiKey': 'API key',
    'provider.apiKeyPlaceholder': 'Enter API key',
    'provider.apply': 'Apply configuration',
    'provider.applying': 'Applying…',
    'provider.testConnection': 'Test connection',
    'provider.testingConnection': 'Testing connection…',
    'starter.apiKeyPlaceholder': 'API Key',
    'starter.modelPlaceholder': 'Model',
    'starter.baseUrlPlaceholder': 'Base URL',
    'app.modelConnectionFailed': 'Model connection failed',
    'app.sessionAiConfigApplied': 'Session AI config applied',
    'app.apiKeyRequired': 'API key is required',
    'app.unableToApplyAiConfig': 'Unable to apply AI config',
    'app.unableToClearApiKey': 'Unable to clear API key',
    'browser.corsHint': 'Your model endpoint must allow browser CORS requests.',
    'error.desktopApiUnavailable': 'Desktop API is not available in this preview.',
    'error.openProject': 'Unable to open project.',
    'error.createProject': 'Unable to create project.'
  },
  'zh-CN': {
    'assistant.generate': '生成',
    'assistant.tab.generate': '生成',
    'assistant.nextChapter': '下一章',
    'assistant.generatingNextChapter': '正在生成下一章...',
    'assistant.pendingStoryDraft': '待确认故事草稿',
    'assistant.pendingChapterDraft': '待确认章节草稿',
    'assistant.confirmDraft': '确认草稿',
    'assistant.discardDraft': '丢弃草稿',
    'assistant.retryingFailedGate': '正在重试失败检查...',
    'assistant.retryFailedGate': '重试失败检查',
    'start.deleteProjectFailed': '无法删除这个本地项目。',
    'start.confirmDeleteProject': '删除这个本地项目？',
    'start.importProjectFailed': '无法导入此项目备份。',
    'start.importProject': '导入项目',
    'start.localProjects': '本地项目',
    'start.deleteProject': '删除项目',
    'editor.exportBackup': '下载项目备份',
    'settings.clearApiKey': '清除 API 密钥',
    'provider.configured': '已配置',
    'provider.notConfigured': '未配置',
    'provider.provider': '提供商',
    'provider.model': '模型',
    'provider.baseUrl': '基础 URL',
    'provider.apiKey': 'API 密钥',
    'provider.apiKeyPlaceholder': '输入 API 密钥',
    'provider.apply': '应用配置',
    'provider.applying': '正在应用…',
    'provider.testConnection': '测试连接',
    'provider.testingConnection': '正在测试连接…',
    'starter.apiKeyPlaceholder': 'API 密钥',
    'starter.modelPlaceholder': '模型',
    'starter.baseUrlPlaceholder': '基础 URL',
    'app.modelConnectionFailed': '模型连接失败',
    'app.sessionAiConfigApplied': 'AI 配置已应用',
    'app.apiKeyRequired': '需要 API 密钥',
    'app.unableToApplyAiConfig': '无法应用 AI 配置',
    'app.unableToClearApiKey': '无法清除 API 密钥',
    'browser.corsHint': '模型端点必须允许浏览器 CORS 请求。',
    'workflow.currentStage': '当前阶段',
    'workflow.completedStage': '已完成阶段',
    'workflow.returnCurrent': '返回当前阶段',
    'workflow.purpose.world_outline': '建立世界规则与故事方向',
    'workflow.purpose.character_bible': '定义角色、动机、关系与人物弧',
    'workflow.purpose.act_timeline': '组织各幕目标、转折与时间顺序',
    'workflow.purpose.scene_outline': '规划章节目标、场景与锚点',
    'workflow.purpose.chapter_draft': '生成并审阅下一章草稿',
    'workflow.purpose.act_scoring': '评价已完成幕并指出修订重点',
    'workflow.purpose.full_review': '审阅完整书稿中的最终问题',
    'workflow.preview.empty': '此阶段尚无产物',
    'workflow.preview.worldDocument': '世界设定',
    'workflow.preview.masterOutline': '故事总纲',
    'workflow.preview.characters': '角色',
    'workflow.preview.timeline': '幕级时间线',
    'workflow.preview.scenes': '场景细纲',
    'workflow.preview.chapter': '章节草稿',
    'workflow.preview.review': '审阅',
    'workflow.preview.score': '幕评分',
    'workflow.confirmNext': '确认并继续',
    'workflow.saveChapter': '保存章节并继续',
    'workflow.forceSaveWarning': '忽略当前审阅问题并强制保存',
    'workflow.chapterOutlineMissing': '请先确认场景细纲，再生成章节。',
    'workflow.chapterDraftingComplete': '大纲中的所有章节均已生成并审阅。',
    'workflow.chapterConflict': '不会覆盖已有正文，冲突章节：',
    'workflow.debug': '原始数据（调试）',
    'language.label': '语言',
    'language.english': 'English',
    'language.chinese': '简体中文',
    'start.title': '桌面故事工作台',
    'start.storyIdea': '故事想法',
    'start.storyIdeaPlaceholder': '一句话描述你的故事核心...',
    'starter.title': '开始创作',
    'starter.heading': '你想讲一个什么样的故事？',
    'starter.ideaLabel': '故事灵感',
    'starter.ideaPlaceholder': '输入简短的灵感，或让AI为你生成...',
    'starter.randomSeed': 'AI灵感',
    'starter.generating': '正在生成...',
    'starter.launch': '启动创作流水线',
    'starter.aiConfig': 'AI 配置',
    'starter.notConfigured': '未配置',
    'starter.toggleConfig': '展开AI配置',
    'starter.apply': '应用',
    'starter.applying': '正在应用...',
    'starter.test': '测试 AI',
    'starter.testing': '正在测试 AI...',
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
    'editor.emptyHint': '使用顶部工作流横栏逐步生成内容，然后在此处编辑。',
    'editor.save': '保存',
    'editor.generateChapter': '生成下一章',
    'editor.saved': '已保存',
    'editor.saveFailed': '保存失败',
    'assistant.idea': '想法到故事',
    'assistant.tab.review': '审查',
    'assistant.tab.summary': '摘要',
    'assistant.tab.export': '导出',
    'assistant.generating': '正在生成故事...',
    'assistant.nextChapterFailed': '无法生成本章内容',
    'assistant.saveBeforeGenerate': '请先保存当前章节，再继续生成。',
    'assistant.selectChapterFirst': '请先选择一个章节，再生成内容。',
    'assistant.draftReady': '草稿已生成，等待确认',
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
    'workflow.stage.intake': '前置引导',
    'workflow.stage.world_outline': '世界观 + 总纲',
    'workflow.stage.character_bible': '角色圣经',
    'workflow.stage.act_timeline': '幕级时间轴',
    'workflow.stage.scene_outline': '细纲',
    'workflow.stage.chapter_draft': '逐章生成',
    'workflow.stage.act_scoring': '幕评分',
    'workflow.stage.full_review': '整体审核',
    'workflow.status.locked': '未解锁',
    'workflow.status.draft': '草稿',
    'workflow.status.confirmed': '已确认',
    'workflow.status.regenerating': '重新生成中',
    'workflow.status.optional': '可选',
    'workflow.confirm': '确认',
    'workflow.regenerate': '重新生成',
    'workflow.forceSave': '强制保存',
    'workflow.generate': '生成',
    'workflow.ideaLabel': '初始故事想法',
    'workflow.ideaPlaceholder': '在这里回答初始问题，然后生成前置引导草稿。',
    'workflow.reviewBlocked': '审核阻止保存',
    'workflow.scoreAct': '幕评分',
    'workflow.fullReview': '整体审核',
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
    'tree.kind.scene_outline': '细纲',
    'tree.kind.chapter': '章节',
    'tree.kind.export': '导出',
    'tree.kind.summary': '摘要',
    'workspace.settings': '设置',
    'workspace.back': '返回工作区',
    'workspace.viewAll': '查看全部',
    'workspace.asset.world': '世界',
    'workspace.asset.characters': '角色',
    'workspace.asset.acts': '幕结构',
    'workspace.asset.scene_outline': '细纲',
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
    'diagnostics.description': '配置模型提供商，并检查本地工作流和基准活动。',
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
