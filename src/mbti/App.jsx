import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ACHIEVEMENTS,ACHIEVEMENT_BY_ID,evaluateAchievements} from './achievements.js';
import {ARCHETYPES,CORE_QUESTIONS,TIEBREAKERS} from './data.js';
import {QUIZ_SAVE_KEY,addQuestionScore,createInitialQuiz,getResult,isValidQuiz,selectTiebreakers} from './engine.js';
import {createResultCard,getShareHtml,getShareText,getShareUrl,getXShareUrl} from './share.js';
import {LANGUAGE_KEY,detectLanguage,getChoiceReaction,getUi,localizeAchievement,localizeArchetype,localizeQuestion} from './i18n.js';
import {initAnalytics,trackQuestionAnswered,trackQuizComplete,trackQuizStart} from './analytics.js';
import './mbti.css';
import './share.css';

const QUESTION_BY_ID=new Map([...CORE_QUESTIONS,...TIEBREAKERS].map(item=>[item.id,item]));
const QUESTION_ORDER_BY_ID=new Map([...CORE_QUESTIONS,...TIEBREAKERS].map((item,index)=>[item.id,index%4]));
const NAV=[['start','开始测试','TAKE THE TEST',0,0],['profile','我的档案','MY FILE',1,0],['atlas','人格图鉴','TYPE INDEX',2,0],['medals','工伤勋章','WORKPLACE SCARS',3,0],['exit','离职遗言','EXIT INTERVIEW',0,1]];
const GITHUB_PROJECT_URL='https://github.com/jiaqili0714/career-mbti';
const TOTAL_QUESTIONS=16;

function loadQuiz(){
  try{
    const saved=JSON.parse(localStorage.getItem(QUIZ_SAVE_KEY));
    if(saved&&!isValidQuiz(saved))return {...createInitialQuiz(),discovered:Array.isArray(saved.discovered)?saved.discovered:[],earned:Array.isArray(saved.earned)?saved.earned:[]};
    return saved||createInitialQuiz();
  }
  catch{return createInitialQuiz();}
}

function PixelIcon({col,row}){return <span className="pixel-icon" style={{'--icon-col':col,'--icon-row':row}} aria-hidden="true"/>}
function Portrait({index,locked=false}){return <span className={`pixel-portrait${locked?' locked':''}`} style={{'--portrait-col':index%4,'--portrait-row':Math.floor(index/4)}}/>}
function CopyLines({text}){return text.split('\n').map((line,index)=><React.Fragment key={`${line}-${index}`}>{index>0?<br/>:null}{line}</React.Fragment>)}

function App(){
  const [quiz,setQuiz]=useState(loadQuiz);
  const [language,setLanguage]=useState(detectLanguage);
  const [panel,setPanel]=useState(null);
  const [selected,setSelected]=useState(null);
  const [reaction,setReaction]=useState(null);
  useEffect(()=>{
    const cleanup=initAnalytics();
    if(quiz.phase==='quiz')trackQuizStart(quiz.answers.length);
    return cleanup;
  },[]);
  useEffect(()=>{localStorage.setItem(QUIZ_SAVE_KEY,JSON.stringify(quiz));},[quiz]);
  useEffect(()=>{localStorage.setItem(LANGUAGE_KEY,language);document.documentElement.lang=language==='en'?'en':'zh-CN';},[language]);
  const tr=(key,zh)=>getUi(language,key)||zh;
  const baseQuestion=quiz.phase==='quiz'?QUESTION_BY_ID.get(quiz.questions[quiz.index]):null;
  const question=baseQuestion?localizeQuestion(baseQuestion,language):null;
  const result=localizeArchetype(quiz.result||null,language);

  function start(){
    setPanel(null);setSelected(null);setReaction(null);
    trackQuizStart(0);
    setQuiz({...createInitialQuiz(),discovered:quiz.discovered,earned:quiz.earned,phase:'quiz',questions:CORE_QUESTIONS.map(item=>item.id)});
  }
  function resume(){trackQuizStart(quiz.answers.length);setQuiz(current=>({...current,phase:'quiz'}));setPanel(null);}
  function choose(choiceIndex){
    if(selected!==null||!question)return;
    const choice=question.choices[choiceIndex];
    const scores=addQuestionScore(quiz.scores,question,choiceIndex);
    const answers=[...quiz.answers,{id:question.id,choice:choiceIndex}];
    const nextIndex=quiz.index+1;
    const completed=nextIndex>=TOTAL_QUESTIONS;
    const final=completed?getResult(scores):null;
    if(completed)trackQuizComplete(nextIndex,final.type);
    else trackQuestionAnswered(nextIndex);
    const discovered=completed?[...new Set([...quiz.discovered,final.index])]:quiz.discovered;
    const earnedNow=evaluateAchievements({answers,completed,discovered});
    const unlockedNow=earnedNow.filter(id=>!quiz.earned.includes(id));
    const baseReaction=getChoiceReaction(question.id,choiceIndex,language)||question.reaction;
    const unlockCopy=unlockedNow.length?(language==='en'?` | ACHIEVEMENT UNLOCKED: ${unlockedNow.map(id=>localizeAchievement(ACHIEVEMENT_BY_ID.get(id),language).name).join(', ')}`:` ｜ 勋章解锁：${unlockedNow.map(id=>ACHIEVEMENT_BY_ID.get(id).name).join('、')}`):'';
    setSelected(choiceIndex);setReaction(`${baseReaction}${unlockCopy}`);
    window.setTimeout(()=>{
      setQuiz(current=>{
        let questions=current.questions;
        if(current.index===CORE_QUESTIONS.length-1)questions=[...questions,...selectTiebreakers(scores,TOTAL_QUESTIONS-CORE_QUESTIONS.length).map(item=>item.id)];
        const earned=[...new Set([...current.earned,...earnedNow])];
        const newAwards=[...new Set([...current.newAwards,...unlockedNow])];
        if(completed)return {...current,phase:'result',scores,answers,index:nextIndex,questions,discovered,earned,newAwards,reaction:null,result:final};
        return {...current,scores,answers,index:nextIndex,questions,earned,newAwards,reaction:null};
      });
      setSelected(null);setReaction(null);
    },760);
  }
  function reset(){setQuiz({...createInitialQuiz(),discovered:quiz.discovered,earned:quiz.earned});setPanel(null);}
  function clearAll(){localStorage.removeItem(QUIZ_SAVE_KEY);setQuiz(createInitialQuiz());setPanel(null);}
  function nav(id){if(id==='start'){quiz.phase==='intro'?start():setPanel(null);return;}setPanel(id);}

  return <div className="mbti-app">
    <header className="mbti-header">
      <div className="mbti-wordmark"><strong>{tr('wordmark','职场异变图鉴')}</strong><span>{tr('subtitle','测测你会进化成哪一种公司物种')}</span></div>
      <button className="language-switch" onClick={()=>setLanguage(current=>current==='zh'?'en':'zh')} aria-label={tr('langLabel','切换语言')}>{language==='zh'?'EN':'中文'}</button>
      <a className="github-star" href={GITHUB_PROJECT_URL} target="_blank" rel="noreferrer"><span aria-hidden="true">★</span>{tr('githubStar','喜欢的话，去 GitHub 点个 Star')}</a>
      <div className="hr-stamp"><CopyLines text={tr('hr','本测试不改善命运，\n只负责命名。')}/><small>{tr('hrBy','— 人力资源部')}</small></div>
      <div className="meeting-note"><CopyLines text={tr('meeting','周一例会 09:00\n请准时参加')}/><small>{tr('admin','— 行政部')}</small></div>
    </header>

    <div className="app-shell">
      <nav className="side-nav" aria-label={language==='en'?'Primary navigation':'主要功能'}>
        {NAV.map(([id,zh,en,col,row])=><button key={id} className={panel===id||id==='start'&&panel===null?'active':''} onClick={()=>nav(id)}><PixelIcon col={col} row={row}/><span>{language==='en'?en:zh}</span></button>)}
      </nav>

      <main className="workstation">
        <div className="window-bar"><span>{tr('questionWindow','// QUESTION.EXE')}</span><i>{tr('monitor','绩效监控运行中')}</i></div>
        {quiz.phase==='intro'?<Intro language={language} onStart={start} hasProgress={quiz.answers.length>0} onResume={resume}/>:quiz.phase==='result'?<Result language={language} result={result?{...result,newAwards:quiz.newAwards}:null} onReset={reset}/>:<Question language={language} question={question} quiz={quiz} selected={selected} reaction={reaction} onChoose={choose}/>}
      </main>

      <Atlas language={language} quiz={quiz}/>
    </div>

    {panel?<Panel language={language} id={panel} quiz={quiz} onClose={()=>setPanel(null)} onReset={clearAll}/>:null}
  </div>
}

function Intro({language,onStart,hasProgress,onResume}){
  const tr=(key,zh)=>getUi(language,key)||zh;
  return <section className="intro-screen">
    <div className="office-visual"><img src="/assets/mbti-office.webp" alt={tr('introAlt','办公室里，两位同事在复印机旁低声交谈，一位新人独自坐在工位上。')}/><div className="system-caption">{tr('systemScanning','人力系统正在识别可替换部件……')}</div></div>
    <div className="intro-copy"><span className="eyebrow">{tr('introEyebrow','公司物种鉴定 · 16 道情境')}</span><h1><CopyLines text={tr('introTitle','欢迎入职。\n请暴露你的第一反应。')}/></h1><p>{tr('introBody','不用选成熟答案。选那个你还没来得及装职业、就已经想点下去的选项。每完成一次测试，只解锁本次鉴定出的公司物种。')}</p><div className="intro-actions"><button className="primary-action" onClick={onStart}>{tr('begin','开始接受鉴定 →')}</button>{hasProgress?<button className="text-action" onClick={onResume}>{tr('resume','继续上次工伤')}</button>:null}</div><small>{tr('introMeta','预计 3–4 分钟 · 一次解锁一种 · 图鉴永久保存在本机')}</small><small>{tr('analyticsNotice','匿名统计地区、来源和答题进度；不保存姓名、完整 IP 或每题选项。')}</small></div>
  </section>
}

function Question({language,question,quiz,selected,reaction,onChoose}){
  const tr=(key,zh)=>getUi(language,key)||zh;
  if(!question)return null;
  const progress=Math.round((quiz.index/TOTAL_QUESTIONS)*100);
  const offset=QUESTION_ORDER_BY_ID.get(question.id)||0;
  const choices=question.choices.map((choice,index)=>({choice,index}));
  const displayedChoices=[...choices.slice(offset),...choices.slice(0,offset)];
  return <section className="question-screen">
    <div className="scene-frame"><img src="/assets/mbti-office.webp" alt={tr('sceneAlt','像素风办公室情境')}/><div className="scene-status"><span>{tr('survival','求生欲')} +{Math.max(1,Math.ceil(quiz.index/6))}</span><small>{tr('desk','你的工位比你先转正')}</small></div></div>
    <div className="question-paper">
      <div className="question-meta"><span>{question.chapter}</span><strong>{String(quiz.index+1).padStart(2,'0')} / {TOTAL_QUESTIONS}</strong></div>
      <div className="progress-track"><span style={{width:`${progress}%`}}/></div>
      <p className="scene-line">{question.scene}</p><h2>{question.prompt}</h2>
      <div className="choice-grid">{displayedChoices.map(({choice,index},displayIndex)=><button key={choice.text} disabled={selected!==null} className={selected===index?'selected':''} onClick={()=>onChoose(index)}><span>{String.fromCharCode(65+displayIndex)}</span><b>{choice.text}</b></button>)}</div>
      <div className={`reaction-line${reaction?' visible':''}`}>{reaction||tr('idleReaction','选择不会改变命运，只会改变甩锅路径。')}</div>
    </div>
  </section>
}

function Result({language,result,onReset}){
  const [sharing,setSharing]=useState(false);
  const tr=(key,zh)=>getUi(language,key)||zh;
  if(!result)return null;
  return <section className="result-screen">
    <div className="result-hero"><Portrait index={result.index}/><div><span className="eyebrow">{tr('resultEyebrow','异常员工档案 · 鉴定完成')}</span><h1>{result.name}<small>{result.type}</small></h1><p>{result.verdict}</p></div></div>
    <div className="result-grid"><article><span>{tr('survive','你靠什么活下来')}</span><p>{result.survival}</p></article><article><span>{tr('used','公司如何使用你')}</span><p>{result.usedBy}</p></article><article><span>{tr('drain','最容易在哪里耗尽')}</span><p>{result.drain}</p></article></div>
    <div className="axis-list">{result.axes.map(axis=><div key={axis.key}><header><b>{axis.letter}</b><span>{axis.raw>=0?axis.leftLabel:axis.rightLabel}</span><small>{axis.label}</small></header><div><i style={{width:`${Math.max(12,axis.strength*100)}%`}}/></div></div>)}</div>
    {result.newAwards.length?<div className="result-awards"><span>{tr('roundAwards','本轮工伤认定')}</span><div>{result.newAwards.map(id=><b key={id}>{localizeAchievement(ACHIEVEMENT_BY_ID.get(id),language).name}</b>)}</div></div>:null}
    <footer className="result-footer"><p>{tr('disclaimer','本档案不能用于招聘、晋升或证明你比同事更懂自己。')}</p><div><button className="share-action" onClick={()=>setSharing(true)}>{tr('share','分享工伤鉴定')}</button><button className="primary-action" onClick={onReset}>{tr('restart','重新接受异变')}</button></div></footer>
    {sharing?<ShareSheet language={language} result={result} onClose={()=>setSharing(false)}/>:null}
  </section>
}

function ShareSheet({language,result,onClose}){
  const tr=(key,zh)=>getUi(language,key)||zh;
  const [status,setStatus]=useState(tr('shareInitial','选一个出口，让同事看看公司把你养成了什么东西。'));
  const [busy,setBusy]=useState(false);
  const [cardFile,setCardFile]=useState(null);
  useEffect(()=>{const close=event=>event.key==='Escape'&&onClose();window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[onClose]);
  useEffect(()=>{let active=true;createResultCard(result,language).then(blob=>{if(active)setCardFile(new File([blob],`${language==='en'?'Office-Survival-Test':'职场异变图鉴'}-${result.type}.png`,{type:'image/png'}));}).catch(()=>{if(active)setStatus(language==='en'?'The result card could not be created, but you can still copy the text and link.':'海报导出临时罢工，但文案和链接仍然可以分享。');});return()=>{active=false;};},[result,language]);
  const shareUrl=getShareUrl();
  const shareText=getShareText(result,language);

  function copyFallback(value){
    const input=document.createElement('textarea');input.value=value;input.setAttribute('readonly','');input.style.position='fixed';input.style.opacity='0';document.body.appendChild(input);input.select();const copied=document.execCommand('copy');input.remove();return copied;
  }
  function toDataUrl(blob){
    return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
  }
  async function copyShare(){
    const value=`${shareText}${shareUrl}`;
    setBusy(true);
    try{
      if(!cardFile||!navigator.clipboard?.write||!window.ClipboardItem)throw new Error('rich clipboard unavailable');
      const imageDataUrl=await toDataUrl(cardFile);
      const html=getShareHtml(result,language,shareUrl,imageDataUrl);
      const plain=new Blob([value],{type:'text/plain'});
      const rich=new Blob([html],{type:'text/html'});
      await navigator.clipboard.write([new ClipboardItem({'text/html':rich,'text/plain':plain})]);
      setStatus(tr('copyRichDone','结果卡、文案和链接已一起复制。直接去对话框里粘贴。'));
    }catch{
      try{await navigator.clipboard.writeText(value);}catch{copyFallback(value);}
      setStatus(tr('copyTextOnly','当前浏览器只允许复制文字和链接；发图请用“分享我的结果”。'));
    }finally{setBusy(false);}
  }
  function download(file){const link=document.createElement('a');link.href=URL.createObjectURL(file);link.download=file.name;link.click();window.setTimeout(()=>URL.revokeObjectURL(link.href),1000);}
  async function systemShare(){
    setBusy(true);
    const fullText=`${shareText}${shareUrl}`;
    copyFallback(fullText);
    try{
      if(navigator.share&&cardFile&&navigator.canShare?.({files:[cardFile]})){
        await navigator.share({files:[cardFile],title:language==='en'?`My workplace personality: ${result.name}`:`我的职场异变结果：${result.name}`,text:shareText.trim(),url:shareUrl});
        setStatus(tr('shareOpened','系统分享已打开。若对方只收到图片，文案和链接已经复制，直接粘贴即可。'));
      }else if(navigator.share){
        await navigator.share({title:language==='en'?`My workplace personality: ${result.name}`:`我的职场异变结果：${result.name}`,text:shareText.trim(),url:shareUrl});
        setStatus(tr('shareNoFile','系统分享已打开；完整文案和链接也已经复制。'));
      }else{
        if(cardFile)download(cardFile);
        setStatus(tr('shareFallback','浏览器不支持系统分享：海报已保存，完整文案和链接已复制。'));
      }
    }catch(error){if(error?.name!=='AbortError')setStatus(tr('shareError','系统分享临时罢工了，请使用“保存海报”或“复制完整文案”。'));}
    finally{setBusy(false);}
  }
  function downloadCard(){if(!cardFile)return;download(cardFile);setStatus(tr('downloaded','结果海报已保存。它比年终总结更适合公开。'));}
  function shareX(){window.open(getXShareUrl(result,shareUrl,language),'_blank','noopener,noreferrer');setStatus(tr('xOpened','已打开 X 发布页，文字和链接已经填好。'));}

  return <div className="share-backdrop" role="presentation" onMouseDown={event=>event.target===event.currentTarget&&onClose()}>
    <section className="share-sheet" role="dialog" aria-modal="true" aria-labelledby="share-title">
      <header><div><span>SHARE_RESULT.EXE</span><h2 id="share-title">{tr('shareTitle','把工伤鉴定发出去')}</h2></div><button onClick={onClose} aria-label={tr('closeShare','关闭分享')}>×</button></header>
      <div className="share-layout">
        <div className="share-preview"><div className="share-preview-top">{tr('shareTop','职场异变图鉴')} <small>{tr('employeeFile','异常员工档案')}</small></div><div className="share-preview-person"><Portrait index={result.index}/><div><b>{result.name}</b><span>{result.type}</span><p>{result.verdict}</p></div></div><dl><div><dt>{tr('survive','生存方式')}</dt><dd>{result.survival}</dd></div><div><dt>{tr('drain','耗尽现场')}</dt><dd>{result.drain}</dd></div></dl><footer>{tr('shareFoot','本测试不改善命运，只负责命名。')}</footer></div>
        <div className="share-controls"><p>{tr('shareHow','怎么发')}</p><div className="platform-grid"><button className="system-share" disabled={busy||!cardFile} onClick={systemShare}>{cardFile?tr('shareMine','分享我的结果'):tr('preparing','正在准备分享材料…')}</button><button disabled={busy} onClick={shareX}>{tr('postX','发布到 X')}</button></div><small className="share-note">{tr('shareNote','微信、朋友圈等，请在分享面板中选择。')}</small><div className="share-tools"><button disabled={busy||!cardFile} onClick={downloadCard}>{tr('saveCard','保存结果卡')}</button><button disabled={busy||!cardFile} onClick={copyShare}>{tr('copyShare','复制图文和链接')}</button></div><output aria-live="polite">{busy?tr('shareBusy','系统正在移交这份职业污染报告……'):status}</output></div>
      </div>
    </section>
  </div>
}

function Atlas({language,quiz}){
  const tr=(key,zh)=>getUi(language,key)||zh;
  return <aside className="atlas"><header><b>{tr('identified','已鉴定物种')}</b><span>{quiz.discovered.length} / 16</span></header><div className="atlas-grid">{ARCHETYPES.map(item=>{const open=quiz.discovered.includes(item.index);const localized=localizeArchetype(item,language);return <button key={item.type} title={open?`${localized.name} / ${item.type}`:tr('completeToUnlock','完成测试后解锁')}><Portrait index={item.index} locked={!open}/><span>{open?localized.name:tr('locked','待鉴定')}</span></button>})}</div><p><CopyLines text={tr('atlasHint','每次完成测试，只收录本次结果。\n重测可以补全你的公司生态。')}/></p></aside>
}

function Panel({language,id,quiz,onClose,onReset}){
  const tr=(key,zh)=>getUi(language,key)||zh;
  const content={
    profile:<><h2>{tr('profileTitle','我的档案')}</h2><p className="panel-lead">{tr('profileLead','系统只展示行为痕迹，不提前泄露字母。')}</p><dl><div><dt>{tr('completed','本轮已完成')}</dt><dd>{quiz.answers.length} / {TOTAL_QUESTIONS}</dd></div><div><dt>{tr('permanentAtlas','永久图鉴')}</dt><dd>{quiz.discovered.length} / 16</dd></div><div><dt>{tr('recognizedDamage','工伤认定')}</dt><dd>{quiz.earned.length} / {ACHIEVEMENTS.length}</dd></div><div><dt>{tr('orgReview','组织评价')}</dt><dd>{quiz.answers.length>14?tr('highPotential','已具备被追加工作的潜力'):tr('observation','仍在低成本观察期')}</dd></div></dl></>,
    atlas:<><h2>{tr('atlasTitle','人格图鉴')}</h2><p className="panel-lead">{tr('atlasLead','每完成一次测试，只解锁最终鉴定出的那一种；重测才会继续补全。')}</p><div className="panel-atlas">{ARCHETYPES.map(item=>{const localized=localizeArchetype(item,language);return <div key={item.type}><Portrait index={item.index} locked={!quiz.discovered.includes(item.index)}/><b>{quiz.discovered.includes(item.index)?localized.name:tr('identityPending','身份待定')}</b><small>{quiz.discovered.includes(item.index)?item.type:'????'}</small></div>})}</div></>,
    medals:<><h2>{tr('medalsTitle','工伤勋章')}</h2><p className="panel-lead">{language==='en'?`Unlocked by specific choices and retained across runs. ${quiz.earned.length} / ${ACHIEVEMENTS.length} damage claims recognized.`:`按你的具体选择解锁，跨局永久保留。当前认定 ${quiz.earned.length} / ${ACHIEVEMENTS.length} 项工伤。`}</p><div className="achievement-grid">{ACHIEVEMENTS.map(item=>{const open=quiz.earned.includes(item.id);const localized=localizeAchievement(item,language);return <article key={item.id} className={open?'earned':'locked'}><span className="achievement-stamp">{open?item.stamp:'??'}</span><div><b>{open?localized.name:tr('unrecognized','尚未认定')}</b><small>{localized.condition}</small><p>{open?localized.description:tr('evidenceMissing','人力资源部称：证据链仍不完整。')}</p></div></article>})}</div></>,
    exit:<><h2>{tr('exitTitle','离职遗言')}</h2><blockquote>{tr('exitQuote','“感谢平台，感谢培养。附件是我保存的全部聊天记录。”')}</blockquote><p className="panel-lead">{tr('exitLead','放心，这只是一个按钮。你仍需完成本周交付。')}</p><button className="danger-action" onClick={onReset}>{tr('clear','清除档案并模拟离职')}</button></>,
  }[id];
  return <div className="panel-backdrop" role="presentation" onMouseDown={event=>event.target===event.currentTarget&&onClose()}><section className="side-panel" role="dialog" aria-modal="true">{content}<button className="panel-close" onClick={onClose}>{tr('back','返回工位')}</button></section></div>
}

createRoot(document.getElementById('mbti-root')).render(<App/>);
