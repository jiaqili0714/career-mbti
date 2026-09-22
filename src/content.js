export {PEOPLE, MEMORIES} from './characters.js';
export {EVENTS} from './work.js';
export {DAILY_EVENTS} from './daily.js';
export const LABELS={skill:'专业',social:'沟通',insight:'洞察',energy:'精力',performance:'绩效',reputation:'信誉',shen:'沈知微信任',zhou:'周航亲近',gu:'顾岚认可'};
export const ACTIONS=[
 {id:'work',title:'专注交付',desc:'先做完会在周会上被追问的部分。',icon:'file',effect:{skill:3,performance:9,energy:-14},hint:'专业 +3 · 绩效 +9 · 精力 −14'},
 {id:'study',title:'进修学习',desc:'让“我不会”逐渐成为一个选择。',icon:'book',effect:{skill:9,insight:2,energy:-10},hint:'专业 +9 · 洞察 +2 · 精力 −10'},
 {id:'coffee',title:'喝杯咖啡',desc:'听清他们没放进邮件里的话。',icon:'coffee',effect:{social:7,insight:5,energy:-6,zhou:2},hint:'沟通 +7 · 洞察 +5 · 周航 +2 · 精力 −6'},
 {id:'report',title:'复盘留痕',desc:'记下来。有人可能会忽然失忆。',icon:'pen',effect:{insight:7,reputation:4,performance:2,energy:-6},flag:'record',hint:'洞察 +7 · 信誉 +4 · 绩效 +2 · 精力 −6 · 获得记录'},
 {id:'rest',title:'准时下班',desc:'员工也有不属于公司的器官。',icon:'leaf',effect:{energy:28},hint:'精力 +28 · 群消息明天再看'},
 {id:'network',title:'经营未来',desc:'给“我再考虑一下”准备底气。',icon:'compass',effect:{social:5,insight:3,energy:-8},flag:'portfolio',hint:'沟通 +5 · 洞察 +3 · 精力 −8 · 获得作品集'},
];
