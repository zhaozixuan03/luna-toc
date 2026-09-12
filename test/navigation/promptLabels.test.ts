/** Tests conservative local Smart Label classification and heading selection. */
import { describe, expect, it } from 'vitest';
import {
  classifyPromptForSmartLabel,
  createSmartPromptLabel,
  extractFirstMarkdownHeading,
  isReliableHeading,
  resolvePromptDisplayLabel,
} from '@/navigation/promptLabels';

const CONTEXT_DEPENDENT_PROMPTS = [
  '可以理解，继续。',
  '比刚刚理解些，先继续，以后再回讲。',
  '对这个问题有疑问，只理解一丢丢。',
  '好的，继续讲吧。',
  '可以，这一点暂时可以跟上。',
  '竟然是这样，暂时可以接受吧。',
  '稍微理解一丢丢，但不能说完全理解。',
  '暂时可以继续，但这里要标记。',
  '勉强，先标记，往后走。',
  '继续～',
  '嗯嗯',
  '做吧',
  '也可以',
  '可以 工作吧',
  '原来如此，接着说',
  '没问题，下一步',
  '行，继续往下',
  '好，接下来呢',
  '暂时没完全理解，先放一放',
  '这个问题还是不懂',
  '这部分有些不理解',
  '这一点没理解',
  '有点懂了，继续',
  '大概理解，接着讲',
  '基本明白了，往后走',
  '差不多懂了，下一步',
  '现在理解一点点，继续吧',
  '收到，请继续',
  '知道了，然后呢',
  '明白了，继续说',
  '懂了，接着来',
  '可以接受，继续',
  '暂时跟得上，继续',
  '回头再看，先继续',
  '以后再讨论，现在继续',
  '这点有疑问，先标记',
  'okay',
  'sure, go on',
  'got it, keep going',
  'understood, move on',
  "makes sense, what's next?",
  'fine, then what',
  'yeah, continue please',
  'I understand, continue',
  'I kind of understand, continue',
  'I partly follow, go on',
  "I don't fully understand this, but continue",
  'This is still unclear, go on',
  'Mark this for later and continue',
  'Bookmark it, move on',
  'Come back to this later, continue',
  'That is confusing, but go on',
  'This point is unclear',
  'That part is still confusing',
  'do it',
  'yep, next',
  'alright, continue',
  'okay, do it',
  'sure, move on',
  'for now I understand it',
];

const INFORMATIVE_PROMPTS = [
  '继续解释波长',
  '波长这里没理解',
  '可以把简历导出为 PDF 吗',
  '为什么频率越高波长越短',
  '请继续比较通信算法岗位和软件岗位',
  '这个问题里，电场到底是什么',
  '这一点请用麦克斯韦方程解释',
  '接下来分析 Project2 的风险',
  '好的，请生成最终英文简历',
  '可以，把第三段改成更专业的表达',
  '继续修复这个函数的空指针错误',
  '标记这条消息为待办事项',
  '为什么天线长度通常取四分之一波长',
  '帮我查找近三年的通信论文',
  '比较 OFDM 与单载波系统',
  '解释电磁波中电场和磁场的关系',
  '把这份报告翻译成英文',
  '给导师写一封预约会议的邮件',
  '总结附件中的实验结果',
  '打开代码并检查类型错误',
  '这里的 scrollTop 为什么没有更新',
  '我不理解波长为何是空间尺度',
  '继续，但先回答我的第二个问题',
  '可以用一个生活中的例子解释频率吗',
  '下一步需要安装哪些依赖',
  '请记住我的偏好：回答要简洁',
  '暂时不要继续，先核对数据',
  '这个 API 返回 401，怎么处理',
  '也可以改用 TypeScript 实现',
  '工作吧，但不要修改测试文件',
  '嗯嗯，这个结论的数据来源是什么',
  '好的方案应包含回滚步骤',
  '行距设置为 1.5 倍',
  '接受参数时需要验证空字符串',
  '明白这个公式后如何计算带宽',
  '继续之前先保存当前文件',
  '回头再看缓存问题，现在修复标题提取',
  '附件 [File] 中有哪些表格',
  '运行 `npm test` 并解释失败原因',
  '参考 https://example.com 的规范继续实现',
  'Continue explaining wavelength',
  'Okay, export the CV to PDF',
  'Why is wavelength shorter at higher frequencies?',
  'Go on with the TypeScript migration',
  'Sure, compare React and Vue first',
  'I understand the formula but not the physical meaning',
  'This point about caching needs a concrete example',
  'Mark the deployment task as completed',
  'Move on to the database schema',
  'Do it with native browser APIs',
  'Next, analyze the failing test',
  'Got it; now rewrite the introduction',
  'Understood, but why does the observer fire twice?',
  'Keep going through the remaining source files',
  'Come back to this later and add a regression test',
  'This is unclear because the units do not match',
  'Bookmark this URL: https://example.com/reference',
  'Please continue from section three',
  'What is next in the release checklist?',
  'I partly follow the antenna explanation; draw a diagram',
];

describe('Smart Prompt classification', () => {
  function expectClassificationMatrix(
    contextDependent: string[],
    informative: string[]
  ): void {
    for (const prompt of contextDependent) {
      expect(classifyPromptForSmartLabel(prompt), prompt).toMatchObject({
        isLowInformation: true,
        remainder: '',
      });
    }
    for (const prompt of informative) {
      expect(classifyPromptForSmartLabel(prompt), prompt).toMatchObject({
        isLowInformation: false,
      });
    }
  }

  it('classifies the frozen 30/30 development matrix', () => {
    expect(CONTEXT_DEPENDENT_PROMPTS).toHaveLength(60);
    expect(INFORMATIVE_PROMPTS).toHaveLength(60);
    expectClassificationMatrix(
      CONTEXT_DEPENDENT_PROMPTS.slice(0, 30),
      INFORMATIVE_PROMPTS.slice(0, 30)
    );
  });

  it('classifies the separate frozen 30/30 holdout matrix', () => {
    expectClassificationMatrix(
      CONTEXT_DEPENDENT_PROMPTS.slice(30),
      INFORMATIVE_PROMPTS.slice(30)
    );
  });

  it('returns inspectable rule reasons without presenting a probability', () => {
    const decision = classifyPromptForSmartLabel('稍微理解一点，继续吧');

    expect(decision.score).toBeGreaterThanOrEqual(2);
    expect(decision.reasons).toEqual(
      expect.arrayContaining(['understanding-state', 'continuation'])
    );
    expect(decision).not.toHaveProperty('confidence');
  });

  it('normalizes full-width punctuation and keeps protected content', () => {
    expect(classifyPromptForSmartLabel('　继续～　').isLowInformation).toBe(true);
    expect(classifyPromptForSmartLabel('继续执行 `build()`').isLowInformation).toBe(false);
    expect(classifyPromptForSmartLabel('可以参考 https://example.com').isLowInformation).toBe(false);
  });

  it('recognizes decorative emoji but preserves concrete numeric explanations', () => {
    expect(classifyPromptForSmartLabel('继续吧💝')).toMatchObject({
      isLowInformation: true,
      replyType: 'continue',
    });
    expect(
      classifyPromptForSmartLabel('3.5g 0.1g 它把最高频率和带宽弄混了')
    ).toMatchObject({ isLowInformation: false });
  });

  it('recognizes uncertainty and treats bare keys only as context candidates', () => {
    expect(classifyPromptForSmartLabel('我不知道')).toMatchObject({
      isLowInformation: true,
      replyType: 'uncertain',
    });
    expect(classifyPromptForSmartLabel('B')).toMatchObject({
      isLowInformation: true,
      replyType: 'choice',
    });
  });

  it('distinguishes authorization from acknowledgement and continuation', () => {
    expect(classifyPromptForSmartLabel('做吧').replyType).toBe('authorize');
    expect(classifyPromptForSmartLabel('可以 工作吧').replyType).toBe('authorize');
    expect(classifyPromptForSmartLabel('好的').replyType).toBe('acknowledge');
  });

  it('keeps the original compound colloquial regressions verbatim', () => {
    const prompts = [
      '好的，暂时可以继续了。但是我觉得这地方仍然是要标记一下的。',
      '好吧，勉勉强强，先标记一下吧，往后走吧。',
      '哦，我稍微理解了一丢丢，但我觉得应该不能说是完全理解。',
      '能接受 这个完全理解的',
    ];
    prompts.forEach((prompt) => {
      expect(classifyPromptForSmartLabel(prompt), prompt).toMatchObject({
        isLowInformation: true,
      });
    });
  });
});

describe('Assistant heading candidates', () => {
  const reliableHeadings = [
    '第 2 小点：什么叫“频率”？',
    '第 3 小点：什么叫“波长”？',
    '为什么频率越高，波长越短？',
    '电磁波里到底是谁在振动？',
    '变化的电场为什么会向远处传播？',
    '为什么一个位置的电场会影响旁边？',
    '正弦曲线在电磁波中表示什么？',
    '电磁波往前传播的究竟是什么？',
    '周期与波长分别描述什么尺度？',
    '波长、频率和传播速度的关系',
    '四分之一波长天线的工作原理',
    'OFDM 与单载波系统的差异',
    'Selected Robotics Experience',
    'How Browser Storage Keeps Labels Stable',
    'Why the Mutation Observer Fires Twice',
    'TypeScript Migration Risks and Safeguards',
    'A Practical Bandwidth Calculation',
    'The Relationship Between Frequency and Wavelength',
    'Cache Invalidation Across Multiple Tabs',
    'Rendering Prompt Labels Without Mutation',
  ];
  const rejectedHeadings = [
    '总结', '概述', '引言', '回答', '解答', '分析', '说明', '正文', '结论',
    '下一步', '第 1 部分：总结', '2. Overview', 'Summary', 'Introduction',
    'Answer', 'Next Steps', 'Continue', 'Xing', 'Response',
    '先看一篇最相关、也比较新的论文',
  ];

  it('accepts 20 specific candidates and rejects 20 weak candidates', () => {
    expect(reliableHeadings).toHaveLength(20);
    expect(rejectedHeadings).toHaveLength(20);
    reliableHeadings.forEach((heading) => expect(isReliableHeading(heading), heading).toBe(true));
    rejectedHeadings.forEach((heading) => expect(isReliableHeading(heading), heading).toBe(false));
  });

  it('keeps long semantic headings eligible for later compression', () => {
    expect(isReliableHeading(
      '这是一个需要先保留完整任务语义、随后再根据侧栏宽度选择显示候选的较长标题'
    )).toBe(true);
  });

  it('skips code fences and weak headings before selecting a specific heading', () => {
    const heading = extractFirstMarkdownHeading([
      {
        text: [
          '```md',
          '# Ignore this example',
          '```',
          '## 总结',
          '### **第 5 小点：** [电磁波](https://example.com)里谁在振动？',
        ].join('\n'),
      },
    ]);

    expect(heading).toBe('第 5 小点： 电磁波里谁在振动？');
  });

  it('does not scan arbitrarily late response details', () => {
    const response = `${Array.from({ length: 41 }, () => '正文').join('\n')}\n## Late Detail`;
    expect(extractFirstMarkdownHeading([{ text: response }])).toBeNull();
  });

  it('extracts bounded explicit topics and keeps readable identifiers', () => {
    expect(
      resolvePromptDisplayLabel({
        rawText: '差不多理解了',
        mode: 'smart',
        hasResponse: true,
        sourceComplete: true,
        currentResponses: [
          {
            id: 'answer-1',
            text: '**为什么频谱不重叠，就要求采样频率至少是最高频率的 2 倍？**\n\n正文',
          },
        ],
      }).label
    ).toBe('为什么频谱不重叠，就要求采样频率至少是最高频率的 2 倍？');

    expect(
      resolvePromptDisplayLabel({
        rawText: '继续吧💝',
        mode: 'smart',
        hasResponse: true,
        sourceComplete: true,
        currentResponses: [
          { id: 'answer-2', text: '## 最高频率 \\(f_{\\max}\\) 与带宽 \\(B\\)' },
        ],
      }).label
    ).toBe('最高频率与带宽');

    expect(
      resolvePromptDisplayLabel({
        rawText: '继续～',
        mode: 'smart',
        hasResponse: true,
        sourceComplete: true,
        currentResponses: [
          {
            id: 'answer-3',
            text: `你问得非常好：电话为什么是 8 kHz，而音乐/CD 是 44.1 kHz？\n${Array.from({ length: 52 }, () => '正文').join('\n')}\n## 晚标题`,
          },
        ],
      }).label
    ).toBe('电话为什么是 8 kHz，而音乐/CD 是 44.1 kHz？');
  });
});

describe('Smart Label resolution', () => {
  it('uses one decision for Raw, cached Smart, heading Smart, and no-answer states', () => {
    const base = {
      rawText: '可以理解，继续。',
      answerHeading: '第 3 小点：什么叫“波长”？',
      hasResponse: true,
    } as const;

    expect(resolvePromptDisplayLabel({ ...base, mode: 'raw' }).label).toBe('可以理解，继续。');
    expect(resolvePromptDisplayLabel({ ...base, mode: 'smart' })).toMatchObject({
      label: '第 3 小点：什么叫“波长”？',
      shouldStore: true,
    });
    expect(
      resolvePromptDisplayLabel({ ...base, mode: 'smart', cachedLabel: '稳定缓存标签' })
    ).toMatchObject({ label: '稳定缓存标签', shouldStore: false });
    expect(
      resolvePromptDisplayLabel({ ...base, mode: 'smart', hasResponse: false })
    ).toMatchObject({ label: '可以理解，继续。', shouldStore: false });
  });

  it('never replaces an informative prompt or falls back to an earlier prompt', () => {
    expect(
      resolvePromptDisplayLabel({
        rawText: '继续解释波长',
        mode: 'smart',
        cachedLabel: '旧缓存标题',
        answerHeading: '第 4 小点：波长关系',
        hasResponse: true,
      }).label
    ).toBe('继续解释波长');
    expect(createSmartPromptLabel({ text: '可以' }, null)).toBe('可以');
  });

  it('meets the fixed 16-turn communication expectation', () => {
    const samples = [
      ['系统学习通信并掌握调制、频率与波长', null, false],
      ['可以', '第 2 小点：什么叫“频率”？', true],
      ['可以理解，继续。', '第 3 小点：什么叫“波长”？', true],
      ['可以', '第 4 小点：为什么频率越高，波长越短？', true],
      ['可以', '第 5 小点：电磁波里到底是谁在振动？', true],
      ['不理解电磁波振动，是否有小东西在抖动', null, false],
      ['比刚刚理解些，先继续，以后再回讲', '第 6 小点：变化的电场为什么会往远处传？', true],
      ['对这个问题有疑问，只理解一丢丢', null, false],
      ['好的，继续讲吧。', '第 7 小点：电场变化为何影响旁边位置？', true],
      ['可以，这一点暂时可以跟上。', '第 8 小点：正弦曲线到底是什么？', true],
      ['竟然是这样，暂时可以接受吧。', '第 9 小点：电磁波往前走的是什么？', true],
      ['不理解电场、磁场变化模式的传播', '第 9 小点：重讲传播模式', false],
      ['稍微理解一丢丢，但不能说完全理解', null, false],
      ['暂时可以继续，但这里要标记', '第 10 小点：周期与波长是什么尺度？', true],
      ['波长为何是某瞬间拍照、箭头空间重复', null, false],
      ['勉强，先标记，往后走', '第 11 小点：波长和传播速度怎么连接？', true],
    ] as const;

    const labels = samples.map(([rawText, answerHeading]) =>
      resolvePromptDisplayLabel({
        rawText,
        mode: 'smart',
        answerHeading,
        hasResponse: Boolean(answerHeading),
      }).label
    );
    const replacements = labels.filter((label, index) => label !== samples[index][0]);

    expect(replacements).toHaveLength(10);
    expect(labels[7]).toBe(samples[7][0]);
    expect(labels[12]).toBe(samples[12][0]);
    expect(labels[5]).toBe(samples[5][0]);
    expect(labels[11]).toBe(samples[11][0]);
    expect(labels[14]).toBe(samples[14][0]);
  });

  it('binds uncertainty and choices only to one complete preceding option group', () => {
    const previousResponses = [
      {
        id: 'previous-answer',
        text: '你更愿意选择哪条路径？\nA. 回到过去参加联合项目\nB. 保留现在的硕士路径',
      },
    ];

    expect(
      resolvePromptDisplayLabel({
        rawText: '我不知道',
        mode: 'smart',
        hasResponse: true,
        sourceComplete: true,
        previousResponses,
        currentResponses: [{ id: 'answer', text: '你的犹豫很正常。' }],
      }).label
    ).toBe('尚未决定：回到过去参加联合项目还是保留现在的硕士路径');

    expect(
      resolvePromptDisplayLabel({
        rawText: 'B',
        mode: 'smart',
        hasResponse: true,
        sourceComplete: true,
        previousResponses,
        currentResponses: [{ id: 'answer', text: '好的。' }],
      }).label
    ).toBe('选择 B：保留现在的硕士路径');
  });

  it('rejects ambiguous choices, arithmetic answers, and incomplete sources', () => {
    const ambiguous = [
      {
        id: 'previous-answer',
        text: '第一组？\nA. 方案甲\nB. 方案乙\n第二组？\nA. 路径一\nB. 路径二',
      },
    ];
    expect(
      resolvePromptDisplayLabel({
        rawText: 'B', mode: 'smart', hasResponse: true, sourceComplete: true,
        previousResponses: ambiguous, currentResponses: [{ text: '收到' }],
      }).label
    ).toBe('B');
    expect(
      resolvePromptDisplayLabel({
        rawText: '2', mode: 'smart', hasResponse: true, sourceComplete: true,
        previousResponses: [{ text: '1 + 1 等于多少？' }], currentResponses: [{ text: '正确' }],
      }).label
    ).toBe('2');
    expect(
      resolvePromptDisplayLabel({
        rawText: '继续吧', mode: 'smart', hasResponse: true, sourceComplete: false,
        currentResponses: [{ text: '## 尚未完成的标题' }],
      })
    ).toMatchObject({ label: '继续吧', shouldStore: false });
  });

  it('reports an explicit no-candidate exit instead of treating it as useful Raw', () => {
    expect(resolvePromptDisplayLabel({
      rawText: '嗯嗯',
      mode: 'smart',
      hasResponse: true,
      sourceComplete: true,
      currentResponses: [{ id: 'answer', text: '收到。' }],
    })).toMatchObject({
      label: '嗯嗯',
      completionNeed: 'yes',
      candidateCount: 0,
      primaryReason: 'NO_CANDIDATES',
      route: 'abstain',
    });
  });
});
