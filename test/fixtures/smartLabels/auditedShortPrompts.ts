/** Minimal, reviewed excerpts from the four audited Smart Label cases. */
export interface AuditedSmartLabelFixture {
  caseId: string;
  rawText: string;
  previousPrompt: string;
  currentResponse: string;
  allowedLabels: string[];
  forbiddenTerms: string[];
}

export const AUDITED_SHORT_PROMPT_FIXTURES: AuditedSmartLabelFixture[] = [
  {
    caseId: 'cv-acknowledge-structure',
    rawText: '好的',
    previousPrompt: '请先确定一页 Research CV 的模块结构。',
    currentResponse: '好，那我们就定这个结构。\n\n接下来会整理**一页 Research CV 结构**，控制英文正文、bullet 和信息密度。',
    allowedLabels: ['整理一页 Research CV 结构', '确认一页 Research CV 结构'],
    forbiddenTerms: ['已完成 CV', '选择导师'],
  },
  {
    caseId: 'cv-acknowledge-copy',
    rawText: '嗯嗯',
    previousPrompt: '先做最终一页英文 Research CV 正文。',
    currentResponse: '好，我下一步就按这个版本继续收口，先做**最终一页英文 Research CV 正文**，再转 LaTeX。',
    allowedLabels: ['整理最终一页英文 Research CV 正文'],
    forbiddenTerms: ['已排版完成'],
  },
  {
    caseId: 'cv-authorize-latex',
    rawText: '做吧',
    previousPrompt: '先收成最终一页英文 Research CV，再转 LaTeX 和 PDF。',
    currentResponse: '已经转到 Work 里开始做了：会按我们刚刚确认的内容先收成**最终一页英文 Research CV**，再做成 **LaTeX 源文件 + PDF**。',
    allowedLabels: ['制作最终一页英文 Research CV 与 LaTeX 源文件 + PDF'],
    forbiddenTerms: ['PDF 已生成'],
  },
  {
    caseId: 'cv-authorize-benedict',
    rawText: '可以 工作吧',
    previousPrompt: '请制作 Benedict / Agentic AI Security 专项版本。',
    currentResponse: '已经转到 Work 里开始做 **Benedict / Agentic AI Security 专用版 CV** 了。',
    allowedLabels: ['制作 Benedict / Agentic AI Security 专用版 CV'],
    forbiddenTerms: ['接受 Benedict 导师', '选择该项目'],
  },
];
