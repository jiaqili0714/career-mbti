const hasChoice=(answers,id,choices)=>answers.some(answer=>answer.id===id&&choices.includes(answer.choice));
const countChoices=(answers,rules)=>rules.reduce((count,[id,...choices])=>count+(hasChoice(answers,id,choices)?1:0),0);

export const ACHIEVEMENTS = [
  {id:'living-sample',name:'试用期活体样本',stamp:'01',description:'完整做完一次测试。恭喜，你的数据比本人先通过试用期。',condition:'完成任意一轮测试',earned:({completed})=>completed},
  {id:'boundary',name:'边界不是装饰品',stamp:'02',description:'面对模糊职责时，你多次要求范围、负责人和优先级说人话。',condition:'一轮内至少两次主动明确范围或责任',earned:({answers})=>countChoices(answers,[['credit',0,3],['friday',0,1,3],['parallel',0,1],['airdrop',0]])>=2},
  {id:'paper-trail',name:'组织记忆外置硬盘',stamp:'03',description:'别人靠印象管理，你靠聊天记录、纪要和版本历史。',condition:'一轮内至少两次选择保存证据或留下记录',earned:({answers})=>countChoices(answers,[['screenshot',2],['data',0],['credit',1,2],['bad-idea',3]])>=2},
  {id:'still-human',name:'人类仍在岗',stamp:'04',description:'项目很急，但你至少两次记得项目里还有活人。',condition:'一轮内至少两次优先考虑人的真实处境',earned:({answers})=>countChoices(answers,[['success',2],['collapse',2,3],['layoff',1,3]])>=2},
  {id:'translator',name:'需求翻译许可证',stamp:'05',description:'你成功把“年轻一点”“参考一下”和“顺手做个视频”翻译成可执行内容。',condition:'一轮内至少两次拆解模糊需求',earned:({answers})=>countChoices(answers,[['vague-brief',0,1,2],['competitor',0,1,3],['friday',0,2]])>=2},
  {id:'meeting-demo',name:'会议拆迁许可证',stamp:'06',description:'你没有让点头成为方案的一部分。会议因此短暂拥有了内容。',condition:'一轮内至少两次公开问题或打破假共识',earned:({answers})=>countChoices(answers,[['cold-chat',0,2],['bad-idea',0,1],['airdrop',2],['parallel',0]])>=2},
  {id:'no-faction',name:'群聊非遗潜水员',stamp:'07',description:'你看见了小群、截图和站队邀请，并努力不成为新增素材。',condition:'一轮内至少两次拒绝站队或传播',earned:({answers})=>countChoices(answers,[['gossip',0,3],['screenshot',0,3],['lunch',2]])>=2},
  {id:'friday-survivor',name:'周五 17:56 幸存者',stamp:'08',description:'你对“顺手”进行了风险控制，而不是直接贡献整个周末。',condition:'面对周五临时发布，没有直接献祭整个周末',earned:({answers})=>hasChoice(answers,'friday',[0,1,2])},
  {id:'seafood-refund',name:'预算海鲜化回款',stamp:'09',description:'当功劳没有回来时，你至少让甲方预算以海鲜形式到账。',condition:'在庆功宴上选择先吃',earned:({answers})=>hasChoice(answers,'celebration',[3])},
  {id:'field-researcher',name:'公司生态调查员',stamp:'10',description:'你已经见过四种不同的自己。人力资源部对此不发表意见。',condition:'永久图鉴收录 4 种公司物种',earned:({discovered})=>discovered.length>=4},
];

export const ACHIEVEMENT_BY_ID=new Map(ACHIEVEMENTS.map(item=>[item.id,item]));
export const evaluateAchievements=context=>ACHIEVEMENTS.filter(item=>item.earned(context)).map(item=>item.id);
