/** Defines reviewed long-Prompt fixtures for deterministic compression evaluation. */

export interface AuditedLongPromptFixture {
  caseId: string;
  rawText: string;
  requiredTerms: string[];
  forbiddenTerms: string[];
  expectCompression: boolean;
}

export const AUDITED_LONG_PROMPT_FIXTURES: AuditedLongPromptFixture[] = [
  {
    caseId: 'long-zh-multi-task-privacy',
    rawText: '请帮我进行短句补全问题排查，进一步改进候选标题生成，同时开始设计长标题压缩，但不要引入远程模型，也不要上传聊天文本。',
    requiredTerms: ['短句补全', '长标题压缩', '不要引入远程模型', '不要上传聊天文本'],
    forbiddenTerms: ['已完成'],
    expectCompression: true,
  },
  {
    caseId: 'long-en-version-format-negation',
    rawText: 'Could you please revise the v2.1 audio export to use 16 kHz, preserve the existing codec, produce both JSON and PDF reports, and do not upload the source recording.',
    requiredTerms: ['v2.1', '16 kHz', 'codec', 'JSON', 'PDF', 'do not upload'],
    forbiddenTerms: ['completed'],
    expectCompression: true,
  },
  {
    caseId: 'long-mixed-language-output-chain',
    rawText: 'Please 帮我制作一页英文 Research CV，再生成 LaTeX 源文件和 PDF，同时保留 Agentic AI Security 项目名、时间范围与所有量化数字，不要声称文件已经生成。',
    requiredTerms: ['Research CV', 'LaTeX', 'PDF', 'Agentic AI Security', '不要声称文件已经生成'],
    forbiddenTerms: ['PDF 已生成'],
    expectCompression: true,
  },
  {
    caseId: 'long-four-task-relationship',
    rawText: '请你帮我排查缓存过期原因；修复旧标题复用问题；增加分支切换回归测试；最后整理 Raw 和 Smart 模式的前后对比，但不要修改原始 Prompt 和消息 ID。',
    requiredTerms: ['排查缓存过期', '修复旧标题复用', '增加分支切换回归测试', '整理 Raw 和 Smart', '不要修改原始 Prompt 和消息 ID'],
    forbiddenTerms: [],
    expectCompression: true,
  },
  {
    caseId: 'long-code-log-format',
    rawText: 'Could you please inspect `resolveLabel()` after the CACHE_STALE log, explain why the cached title survives, add a focused regression test, and export the diagnostic summary as JSON without uploading conversation text.',
    requiredTerms: ['`resolveLabel()`', 'CACHE_STALE', 'regression test', 'JSON', 'without uploading conversation text'],
    forbiddenTerms: [],
    expectCompression: true,
  },
  {
    caseId: 'long-no-safe-reduction',
    rawText: '保留原始 Prompt、消息 ID、搜索、收藏、跳转、否定、数字、单位、版本、范围、条件和多任务关系；侧栏宽度变化只允许换行与省略，不得改变标题语义。',
    requiredTerms: ['原始 Prompt', '消息 ID', '多任务关系', '不得改变标题语义'],
    forbiddenTerms: [],
    expectCompression: false,
  },
];
