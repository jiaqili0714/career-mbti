import {ARCHETYPE_BY_TYPE,AXES,CORE_AXIS_BY_ID,CORE_QUESTIONS,TIEBREAKERS} from './data.js';

export const QUIZ_SAVE_KEY = 'workplace-mbti-v2';
export const EMPTY_SCORES = Object.freeze({ei:0,sn:0,tf:0,jp:0});

export function addScores(scores, delta) {
  const next={...scores};
  for(const axis of AXES) next[axis.key]=(next[axis.key]||0)+(delta[axis.key]||0);
  return next;
}

export function getChoiceScore(question, choiceIndex) {
  const choice=question.choices[choiceIndex];
  const reviewAxis=question.id.startsWith('tie-')?question.id.split('-')[1]:null;
  const measuredAxis=reviewAxis||CORE_AXIS_BY_ID[question.id];
  return Object.fromEntries(AXES.map(axis=>{
    if(axis.key!==measuredAxis)return [axis.key,0];
    const average=question.choices.reduce((sum,item)=>sum+(item.score[axis.key]||0),0)/question.choices.length;
    const weight=reviewAxis===axis.key?1.5:1;
    return [axis.key,((choice.score[axis.key]||0)-average)*weight];
  }));
}

export function addQuestionScore(scores, question, choiceIndex) {
  return addScores(scores,getChoiceScore(question,choiceIndex));
}

export function selectTiebreakers(scores, count=8) {
  const ranked=AXES.toSorted((a,b)=>Math.abs(scores[a.key])-Math.abs(scores[b.key]));
  const selected=[];
  for(let i=0;i<count;i++){
    const axis=ranked[i%ranked.length];
    const pool=TIEBREAKERS.filter(item=>item.id.startsWith(`tie-${axis.key}`));
    const directionVariant=scores[axis.key]>=0?1:0;
    selected.push(pool[(directionVariant+Math.floor(i/ranked.length))%pool.length]);
  }
  return selected;
}

const TIE_LETTER=Object.freeze({ei:'I',sn:'S',tf:'F',jp:'J'});
const getAxisLetter=(axis,raw)=>raw===0?TIE_LETTER[axis.key]:raw>0?axis.left:axis.right;

export function getType(scores) {
  return AXES.map(axis=>getAxisLetter(axis,scores[axis.key])).join('');
}

export function getResult(scores) {
  const type=getType(scores);
  const max=Object.fromEntries(AXES.map(axis=>[axis.key,[...CORE_QUESTIONS,...TIEBREAKERS].reduce((sum,question)=>sum+Math.max(...question.choices.map((_,index)=>Math.abs(getChoiceScore(question,index)[axis.key]))),0)]));
  const axes=AXES.map(axis=>{
    const raw=scores[axis.key];
    const strength=Math.min(1,Math.abs(raw)/max[axis.key]);
    return {...axis,raw,letter:getAxisLetter(axis,raw),strength,label:strength>.48?'明显偏向':strength>.2?'略微偏向':'反复横跳'};
  });
  return {...ARCHETYPE_BY_TYPE.get(type),axes};
}

export function createInitialQuiz(){
  return {version:4,phase:'intro',index:0,questions:[],scores:{...EMPTY_SCORES},answers:[],discovered:[],earned:[],newAwards:[],reaction:null,result:null};
}

export function isValidQuiz(value){
  return !!value&&value.version===4&&['intro','quiz','result'].includes(value.phase)&&Number.isInteger(value.index)&&value.index>=0&&value.scores&&AXES.every(axis=>Number.isFinite(value.scores[axis.key]))&&Array.isArray(value.answers)&&Array.isArray(value.discovered)&&Array.isArray(value.earned)&&Array.isArray(value.newAwards);
}
