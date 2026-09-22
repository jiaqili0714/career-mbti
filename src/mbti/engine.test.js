import test from 'node:test';
import assert from 'node:assert/strict';
import {ACHIEVEMENTS,evaluateAchievements} from './achievements.js';
import {ARCHETYPES,CHOICE_REACTIONS,CORE_QUESTIONS,TIEBREAKERS} from './data.js';
import {EMPTY_SCORES,addScores,getResult,getType,isValidQuiz,createInitialQuiz,selectTiebreakers} from './engine.js';
import {getShareText,getShareUrl,getXShareUrl} from './share.js';

test('question bank has 20 core questions and an adaptive pool for every axis',()=>{
  assert.equal(CORE_QUESTIONS.length,20);
  assert.equal(TIEBREAKERS.length,8);
  for(const axis of ['ei','sn','tf','jp'])assert.equal(TIEBREAKERS.filter(item=>item.id.startsWith(`tie-${axis}`)).length,2);
  for(const item of [...CORE_QUESTIONS,...TIEBREAKERS]){assert.equal(item.choices.length,4);assert.ok(item.reaction.length>12);}
});
test('every playable choice has a distinct scene reaction and revised prompts stay unambiguous',()=>{
  for(const item of [...CORE_QUESTIONS,...TIEBREAKERS]){
    assert.equal(CHOICE_REACTIONS[item.id]?.length,4,`${item.id} needs four reactions`);
    assert.equal(new Set(CHOICE_REACTIONS[item.id]).size,4,`${item.id} reactions should be unique`);
  }
  const success=CORE_QUESTIONS.find(item=>item.id==='success');
  assert.ok(success.choices[2].text.includes('还愿意和彼此说人话'));
  const friday=CORE_QUESTIONS.find(item=>item.id==='friday');
  assert.ok(friday.scene.includes('发布视频'));
  assert.ok(!friday.scene.includes('不够有感觉'));
  const celebration=CORE_QUESTIONS.find(item=>item.id==='celebration');
  assert.ok(celebration.scene.startsWith('庆功宴上'));
});
test('all 16 MBTI results resolve to a unique archetype',()=>{
  assert.equal(ARCHETYPES.length,16);assert.equal(new Set(ARCHETYPES.map(item=>item.type)).size,16);
  for(const e of [-1,1])for(const s of [-1,1])for(const t of [-1,1])for(const j of [-1,1]){
    const scores={ei:e,sn:s,tf:t,jp:j};const type=getType(scores);assert.equal(getResult(scores).type,type);
  }
});
test('score reducer is immutable and adaptive questions prioritize closest axes',()=>{
  const base={...EMPTY_SCORES,ei:9,sn:1,tf:-7,jp:2};const next=addScores(base,{sn:-2,jp:1});assert.notEqual(next,base);assert.equal(base.sn,1);assert.equal(next.sn,-1);
  const selected=selectTiebreakers(base);assert.equal(selected.length,4);assert.ok(selected[0].id.startsWith('tie-sn'));assert.equal(new Set(selected.map(item=>item.id)).size,4);
});
test('saved quiz schema includes persistent achievements and rejects malformed state',()=>{
  const state=createInitialQuiz();assert.ok(isValidQuiz(state));assert.deepEqual(state.earned,[]);assert.deepEqual(state.newAwards,[]);assert.ok(!isValidQuiz({...state,version:1}));assert.ok(!isValidQuiz({...state,index:-1}));assert.ok(!isValidQuiz({...state,scores:{}}));assert.ok(!isValidQuiz({...state,discovered:null}));assert.ok(!isValidQuiz({...state,earned:null}));
});
test('achievement catalogue has unique ids and public unlock conditions',()=>{
  assert.equal(ACHIEVEMENTS.length,10);assert.equal(new Set(ACHIEVEMENTS.map(item=>item.id)).size,10);
  for(const item of ACHIEVEMENTS){assert.ok(item.condition.length>5);assert.ok(item.description.length>8);}
});
test('completion, behavior and collection achievements use distinct evidence',()=>{
  assert.ok(evaluateAchievements({answers:[],completed:true,discovered:[]}).includes('living-sample'));
  const boundary=evaluateAchievements({answers:[{id:'credit',choice:0},{id:'parallel',choice:1}],completed:false,discovered:[]});
  assert.ok(boundary.includes('boundary'));
  assert.ok(!evaluateAchievements({answers:[{id:'celebration',choice:0}],completed:true,discovered:[]}).includes('seafood-refund'));
  assert.ok(evaluateAchievements({answers:[{id:'celebration',choice:3}],completed:true,discovered:[]}).includes('seafood-refund'));
  assert.ok(evaluateAchievements({answers:[],completed:false,discovered:[0,1,2,3]}).includes('field-researcher'));
});
test('share helpers create platform-safe result copy and clean URLs',()=>{
  const result={name:'Excel 监工',type:'ESTJ',verdict:'你不是没有感情，感情只是尚未录入必填字段。'};
  assert.match(getShareText(result),/Excel 监工（ESTJ）/);
  assert.equal(getShareUrl('https://example.com/mbti.html#result'),'https://example.com/mbti.html');
  const xUrl=new URL(getXShareUrl(result,'https://example.com/mbti.html'));
  assert.equal(xUrl.hostname,'twitter.com');assert.equal(xUrl.pathname,'/intent/tweet');
  assert.match(xUrl.searchParams.get('text'),/#职场异变图鉴/);assert.equal(xUrl.searchParams.get('url'),'https://example.com/mbti.html');
});
