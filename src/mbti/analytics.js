const SESSION_KEY='career-mbti-analytics-session-v1';
const ATTEMPT_KEY='career-mbti-analytics-attempt-v1';
const API_PATH='/api/analytics';

let sessionId=null;
let attemptId=null;
let activeMs=0;
let activeSince=null;
let heartbeatId=null;
let initialized=false;

function analyticsAllowed(){
  if(typeof window==='undefined')return false;
  if(['localhost','127.0.0.1'].includes(window.location.hostname)&&import.meta.env.VITE_ANALYTICS_DEBUG!=='1')return false;
  return navigator.globalPrivacyControl!==true&&!['1','yes'].includes(navigator.doNotTrack);
}

function getSessionId(){
  try{
    const saved=sessionStorage.getItem(SESSION_KEY);
    if(saved)return saved;
    const created=crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY,created);
    return created;
  }catch{return crypto.randomUUID();}
}

function currentActiveSeconds(){
  const running=activeSince===null?0:performance.now()-activeSince;
  return Math.max(0,Math.round((activeMs+running)/1000));
}

function stopActiveClock(){
  if(activeSince===null)return;
  activeMs+=performance.now()-activeSince;
  activeSince=null;
}

function startActiveClock(){
  if(activeSince===null&&document.visibilityState==='visible')activeSince=performance.now();
}

function clean(value,max=160){
  return typeof value==='string'?value.trim().slice(0,max):'';
}

function entryContext(){
  const query=new URLSearchParams(window.location.search);
  let referrerHost='';
  try{
    referrerHost=document.referrer?new URL(document.referrer).hostname:'';
    if(referrerHost===window.location.hostname)referrerHost='';
  }catch{referrerHost='';}
  const utmSource=clean(query.get('utm_source')||'',80);
  const source=utmSource||referrerHost||'direct';
  return {
    landingPath:clean(`${window.location.pathname}${window.location.search}`,300),
    referrerHost:clean(referrerHost,160),
    source:clean(source,160),
    medium:clean(query.get('utm_medium')||(referrerHost?'referral':'none'),80),
    campaign:clean(query.get('utm_campaign')||'',120),
    language:clean(document.documentElement.lang||navigator.language,16),
    deviceType:window.matchMedia('(max-width: 820px)').matches?'mobile':'desktop',
  };
}

function send(event,{questionsAnswered=0,resultType='',final=false}={}){
  if(!initialized||!sessionId)return;
  const body=JSON.stringify({
    event,
    sessionId,
    attemptId,
    questionsAnswered:Math.max(0,Math.min(16,Number(questionsAnswered)||0)),
    resultType:clean(resultType,4).toUpperCase(),
    activeSeconds:currentActiveSeconds(),
    ...entryContext(),
  });
  if(final&&navigator.sendBeacon){
    navigator.sendBeacon(API_PATH,new Blob([body],{type:'application/json'}));
    return;
  }
  fetch(API_PATH,{method:'POST',headers:{'content-type':'application/json'},body,keepalive:true}).catch(()=>{});
}

export function initAnalytics(){
  if(initialized||!analyticsAllowed())return ()=>{};
  initialized=true;
  sessionId=getSessionId();
  try{attemptId=sessionStorage.getItem(ATTEMPT_KEY);}catch{attemptId=null;}
  startActiveClock();
  send('session_start');

  const onVisibility=()=>{
    if(document.visibilityState==='hidden'){
      stopActiveClock();
      send('heartbeat',{final:true});
    }else startActiveClock();
  };
  const onPageHide=()=>{stopActiveClock();send('session_end',{final:true});};
  document.addEventListener('visibilitychange',onVisibility);
  window.addEventListener('pagehide',onPageHide);
  heartbeatId=window.setInterval(()=>{
    if(document.visibilityState==='visible')send('heartbeat');
  },30000);

  return ()=>{
    document.removeEventListener('visibilitychange',onVisibility);
    window.removeEventListener('pagehide',onPageHide);
    if(heartbeatId)window.clearInterval(heartbeatId);
    heartbeatId=null;
  };
}

export function trackQuizStart(questionsAnswered=0){
  if(!attemptId||questionsAnswered===0){
    attemptId=crypto.randomUUID();
    try{sessionStorage.setItem(ATTEMPT_KEY,attemptId);}catch{}
  }
  send('quiz_start',{questionsAnswered});
}
export function trackQuestionAnswered(questionsAnswered){send('progress',{questionsAnswered});}
export function trackQuizComplete(questionsAnswered,resultType){
  send('complete',{questionsAnswered,resultType});
  try{sessionStorage.removeItem(ATTEMPT_KEY);}catch{}
  attemptId=null;
}
