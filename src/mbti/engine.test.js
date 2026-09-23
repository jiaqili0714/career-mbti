import test from 'node:test';
import assert from 'node:assert/strict';
import {ACHIEVEMENTS,evaluateAchievements} from './achievements.js';
import {ARCHETYPES,CHOICE_REACTIONS,CORE_QUESTIONS,TIEBREAKERS} from './data.js';
import {EMPTY_SCORES,addQuestionScore,addScores,getChoiceScore,getResult,getType,isValidQuiz,createInitialQuiz,selectTiebreakers} from './engine.js';
import {getShareHtml,getShareText,getShareUrl,getXShareUrl} from './share.js';
import {getChoiceReaction,getUi,localizeAchievement,localizeArchetype,localizeQuestion} from './i18n.js';

test('question bank has 12 core questions and a four-question adaptive finish',()=>{
  assert.equal(CORE_QUESTIONS.length,12);
  assert.equal(TIEBREAKERS.length,8);
  assert.equal(CORE_QUESTIONS.length+4,16);
  for(const axis of ['ei','sn','tf','jp'])assert.equal(TIEBREAKERS.filter(item=>item.id.startsWith(`tie-${axis}`)).length,2);
  for(const item of [...CORE_QUESTIONS,...TIEBREAKERS]){assert.equal(item.choices.length,4);assert.ok(item.reaction.length>12);}
});
test('every playable choice has a distinct scene reaction and revised prompts stay unambiguous',()=>{
  for(const item of [...CORE_QUESTIONS,...TIEBREAKERS]){
    assert.equal(CHOICE_REACTIONS[item.id]?.length,4,`${item.id} needs four reactions`);
    assert.equal(new Set(CHOICE_REACTIONS[item.id]).size,4,`${item.id} reactions should be unique`);
  }
  const firstDay=CORE_QUESTIONS.find(item=>item.id==='first-day');
  assert.ok(firstDay.scene.includes('表情包'));
  const coffee=CORE_QUESTIONS.find(item=>item.id==='competitor');
  assert.ok(coffee.scene.includes('咖啡机'));
  const friday=CORE_QUESTIONS.find(item=>item.id==='friday');
  assert.ok(friday.scene.includes('八个人'));
  assert.ok(!friday.scene.includes('不够有感觉'));
  const celebration=CORE_QUESTIONS.find(item=>item.id==='celebration');
  assert.ok(celebration.scene.includes('年会抽奖'));
});
test('all 16 MBTI results resolve to a unique archetype',()=>{
  assert.equal(ARCHETYPES.length,16);assert.equal(new Set(ARCHETYPES.map(item=>item.type)).size,16);
  assert.equal(getType({...EMPTY_SCORES}),'ISFJ');
  for(const e of [-1,1])for(const s of [-1,1])for(const t of [-1,1])for(const j of [-1,1]){
    const scores={ei:e,sn:s,tf:t,jp:j};const type=getType(scores);assert.equal(getResult(scores).type,type);
  }
});
test('score reducer is immutable and adaptive questions prioritize closest axes',()=>{
  const base={...EMPTY_SCORES,ei:9,sn:1,tf:-7,jp:2};const next=addScores(base,{sn:-2,jp:1});assert.notEqual(next,base);assert.equal(base.sn,1);assert.equal(next.sn,-1);
  const selected=selectTiebreakers(base);assert.equal(selected.length,4);assert.equal(selected[0].id,'tie-sn-2');assert.equal(new Set(selected.map(item=>item.id)).size,4);
  assert.equal(Math.abs(getChoiceScore(TIEBREAKERS[0],0).ei),2);
});
test('each question is score-centered so its answer set has no built-in letter bias',()=>{
  for(const question of [...CORE_QUESTIONS,...TIEBREAKERS])for(const axis of ['ei','sn','tf','jp']){
    const total=question.choices.reduce((sum,_,index)=>sum+getChoiceScore(question,index)[axis],0);
    assert.ok(Math.abs(total)<1e-9,`${question.id} should be centered on ${axis}`);
  }
});
test('a core workplace answer can influence only its intended preference pair',()=>{
  for(const question of CORE_QUESTIONS){
    for(let index=0;index<question.choices.length;index++){
      const score=getChoiceScore(question,index);
      assert.equal(Object.values(score).filter(value=>value!==0).length<=1,true,`${question.id} choice ${index} casts more than one vote`);
    }
  }
});
test('calibrated random answer patterns produce a meaningfully differentiated result set',()=>{
  let seed=20260922;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const counts=new Map();const runs=30000;
  for(let run=0;run<runs;run++){
    let scores={...EMPTY_SCORES};
    for(const question of CORE_QUESTIONS)scores=addQuestionScore(scores,question,Math.floor(random()*4));
    for(const question of selectTiebreakers(scores,4))scores=addQuestionScore(scores,question,Math.floor(random()*4));
    const type=getType(scores);counts.set(type,(counts.get(type)||0)+1);
  }
  assert.equal(counts.size,16);
  assert.ok(Math.max(...counts.values())/runs<0.13);
  assert.ok(Math.min(...counts.values())/runs>0.025);
});
test('saved quiz schema includes persistent achievements and rejects old scoring state',()=>{
  const state=createInitialQuiz();assert.ok(isValidQuiz(state));assert.equal(state.version,6);assert.deepEqual(state.earned,[]);assert.deepEqual(state.newAwards,[]);assert.ok(!isValidQuiz({...state,version:5}));assert.ok(!isValidQuiz({...state,index:-1}));assert.ok(!isValidQuiz({...state,scores:{}}));assert.ok(!isValidQuiz({...state,discovered:null}));assert.ok(!isValidQuiz({...state,earned:null}));
});
test('achievement catalogue has unique ids and public unlock conditions',()=>{
  assert.equal(ACHIEVEMENTS.length,10);assert.equal(new Set(ACHIEVEMENTS.map(item=>item.id)).size,10);
  for(const item of ACHIEVEMENTS){assert.ok(item.condition.length>5);assert.ok(item.description.length>8);}
});
test('completion, behavior and collection achievements use distinct evidence',()=>{
  assert.ok(evaluateAchievements({answers:[],completed:true,discovered:[]}).includes('living-sample'));
  const boundary=evaluateAchievements({answers:[{id:'ambition',choice:0},{id:'friday',choice:2}],completed:false,discovered:[]});
  assert.ok(boundary.includes('boundary'));
  assert.ok(!evaluateAchievements({answers:[{id:'celebration',choice:0}],completed:true,discovered:[]}).includes('seafood-refund'));
  assert.ok(evaluateAchievements({answers:[{id:'celebration',choice:2}],completed:true,discovered:[]}).includes('seafood-refund'));
  assert.ok(evaluateAchievements({answers:[],completed:false,discovered:[0,1,2,3]}).includes('field-researcher'));
});
test('share helpers create platform-safe result copy and clean URLs',()=>{
  const result={name:'Excel 监工',type:'ESTJ',verdict:'你不是没有感情，感情只是尚未录入必填字段。'};
  assert.match(getShareText(result),/Excel 监工（ESTJ）/);
  assert.match(getShareText(result),/看看公司到底把你养成了什么东西/);
  assert.match(getShareText(result),/16 道离谱但眼熟的情境/);
  assert.match(getShareText(localizeArchetype({...result,index:10},'en'),'en'),/My workplace personality is/);
  assert.ok(!getShareText(result).includes('你也来接受公司物种鉴定'));
  assert.equal(getShareUrl('https://example.com/mbti.html#result'),'https://example.com/mbti.html');
  const html=getShareHtml(result,'zh','https://example.com/?a=1&b=2','data:image/png;base64,card');
  assert.match(html,/data:image\/png;base64,card/);assert.match(html,/职场异变结果卡/);assert.match(html,/a=1&amp;b=2/);
  const xUrl=new URL(getXShareUrl(result,'https://example.com/mbti.html'));
  assert.equal(xUrl.hostname,'twitter.com');assert.equal(xUrl.pathname,'/intent/tweet');
  assert.match(xUrl.searchParams.get('text'),/#职场异变图鉴/);assert.equal(xUrl.searchParams.get('url'),'https://example.com/mbti.html');
});
test('English localization covers every question, reaction, archetype and achievement',()=>{
  for(const question of [...CORE_QUESTIONS,...TIEBREAKERS]){
    const english=localizeQuestion(question,'en');assert.ok(english.scene.length>15);assert.equal(english.choices.length,4);
    for(let index=0;index<4;index++){assert.ok(english.choices[index].text.length>8);assert.ok(getChoiceReaction(question.id,index,'en').length>10);}
  }
  for(const item of ARCHETYPES)assert.notEqual(localizeArchetype(item,'en').name,item.name);
  for(const item of ACHIEVEMENTS)assert.notEqual(localizeAchievement(item,'en').name,item.name);
  const chineseEnfp=ARCHETYPES.find(item=>item.type==='ENFP');
  assert.equal(chineseEnfp.name,'点子气氛发动机');
  assert.equal(localizeArchetype(chineseEnfp,'en').name,'Idea Starter');
  assert.ok(!ARCHETYPES.some(item=>item.name.includes('企业微信烟花')));
  assert.equal(getUi('en','introTitle'),'WHO DO YOU BECOME AT WORK?');
  assert.equal(getUi('en','analyticsNotice'),undefined);
  assert.doesNotMatch(getUi('en','introBody'),/hands, mouth|professional filter|correct answer/i);
  const lunch=localizeQuestion(CORE_QUESTIONS.find(item=>item.id==='equal-pay'),'en');
  assert.match(lunch.scene,/cart is \$6 below the delivery minimum/);
  assert.doesNotMatch(lunch.scene,/you are six dollars short/i);
  const coffee=localizeQuestion(CORE_QUESTIONS.find(item=>item.id==='competitor'),'en');
  assert.match(coffee.scene,/office coffee machine/);
  assert.equal(coffee.prompt,'Where does your mind go first?');
});
