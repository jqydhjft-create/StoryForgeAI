export interface WorkflowBenchmarkCase {
  id: string;
  idea: string;
}

export const workflowBenchmarkCases: readonly WorkflowBenchmarkCase[] = [
  { id: 'mystery', idea: '档案员发现一份会篡改记忆的账本。' },
  { id: 'romance', idea: '两个竞争对手必须假扮恋人。' },
  { id: 'science-fiction', idea: '殖民飞船苏醒时目的地已消失。' },
  { id: 'historical', idea: '抄写员在战乱中守护禁书。' },
  { id: 'fantasy', idea: '失去魔力的法师寻找龙骨。' },
  { id: 'realism', idea: '返乡女儿接管濒临倒闭的餐馆。' },
  { id: 'crime', idea: '警探发现每起案件都指向自己。' },
  { id: 'adventure', idea: '向导带队穿越会移动的沙漠。' },
  { id: 'campus', idea: '学生会选举揭开匿名举报。' },
  { id: 'workplace', idea: '新主管被迫重组老团队。' },
  { id: 'family', idea: '三代人争夺祠堂的去留。' },
  { id: 'horror', idea: '夜班护士听见病房里不存在的呼叫铃。' }
];
