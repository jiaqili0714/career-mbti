const hasChoice=(answers,id,choices)=>answers.some(answer=>answer.id===id&&choices.includes(answer.choice));
const countChoices=(answers,rules)=>rules.reduce((count,[id,...choices])=>count+(hasChoice(answers,id,choices)?1:0),0);

export const ACHIEVEMENTS = [
  {id:'living-sample',name:'试用期活体样本',stamp:'01',description:'完整做完一次测试。恭喜，你的数据比本人先通过试用期。',condition:'完成任意一轮测试',earned:({completed})=>completed},
  {id:'boundary',name:'边界不是装饰品',stamp:'02',description:'模糊形容词和集体决策遇到你，都被要求说人话。',condition:'一轮内至少两次主动明确范围或规则',earned:({answers})=>countChoices(answers,[['ambition',0,2],['vague-brief',0],['new-tool',0,2],['friday',0,2]])>=2},
  {id:'paper-trail',name:'桌面秩序重建',stamp:'03',description:'你把日历、标签页和临时空白重新分了区，混乱被迫提交申请。',condition:'一轮内至少两次主动整理混乱',earned:({answers})=>countChoices(answers,[['credit',0,2],['parallel',0,2],['tie-jp-1',0,3],['tie-jp-2',0,2]])>=2},
  {id:'still-human',name:'人类仍在岗',stamp:'04',description:'规则很重要，但你至少两次记得规则里还有活人。',condition:'一轮内至少两次优先考虑人的真实处境',earned:({answers})=>countChoices(answers,[['equal-pay',1,3],['screenshot',1,2],['new-tool',1,3],['tie-tf-1',1,3],['tie-tf-2',1,2]])>=2},
  {id:'translator',name:'形容词翻译许可证',stamp:'05',description:'你把“全面变化”“高级一点”和办公室玄学翻译成了具体问题。',condition:'一轮内至少两次拆解模糊表达',earned:({answers})=>countChoices(answers,[['ambition',0,2],['vague-brief',0,2],['competitor',0,2]])>=2},
  {id:'meeting-demo',name:'尴尬拆迁许可证',stamp:'06',description:'你没有假装空气里什么都没发生，还顺手给现场开了扇窗。',condition:'一轮内至少两次主动打破尴尬',earned:({answers})=>countChoices(answers,[['first-day',0,1],['lunch',0,1],['celebration',0,1],['tie-ei-1',0,1]])>=2},
  {id:'no-faction',name:'群聊非遗潜水员',stamp:'07',description:'你看见了群聊、错别字和社交邀请，并努力不成为新增素材。',condition:'一轮内至少两次选择低调撤离',earned:({answers})=>countChoices(answers,[['first-day',2,3],['lunch',2,3],['screenshot',2,3],['celebration',2,3],['tie-ei-1',2,3]])>=2},
  {id:'friday-survivor',name:'八人午饭调度员',stamp:'08',description:'你在所有人饿到失去判断力之前，让午饭拥有了目的地。',condition:'为八人午饭快速确定选择方式',earned:({answers})=>hasChoice(answers,'friday',[0,2])},
  {id:'seafood-refund',name:'空气炸锅股东回报',stamp:'09',description:'年终奖不一定有，但你至少把空气炸锅抱回了家。',condition:'年会上八字发言，抱锅离场',earned:({answers})=>hasChoice(answers,'celebration',[2])},
  {id:'field-researcher',name:'公司生态调查员',stamp:'10',description:'你已经见过四种不同的自己。人力资源部对此不发表意见。',condition:'永久图鉴收录 4 种公司物种',earned:({discovered})=>discovered.length>=4},
];

export const ACHIEVEMENT_BY_ID=new Map(ACHIEVEMENTS.map(item=>[item.id,item]));
export const evaluateAchievements=context=>ACHIEVEMENTS.filter(item=>item.earned(context)).map(item=>item.id);
