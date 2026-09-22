import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ACHIEVEMENTS,ACHIEVEMENT_BY_ID,evaluateAchievements} from './achievements.js';
import {ARCHETYPES,CHOICE_REACTIONS,CORE_QUESTIONS,TIEBREAKERS} from './data.js';
import {QUIZ_SAVE_KEY,addScores,createInitialQuiz,getResult,isValidQuiz,selectTiebreakers} from './engine.js';
import {createResultCard,getShareText,getShareUrl,getXShareUrl} from './share.js';
import './mbti.css';
import './share.css';

const QUESTION_BY_ID=new Map([...CORE_QUESTIONS,...TIEBREAKERS].map(item=>[item.id,item]));
const NAV=[['start','开始测试',0,0],['profile','我的档案',1,0],['atlas','人格图鉴',2,0],['medals','工伤勋章',3,0],['exit','离职遗言',0,1]];

function loadQuiz(){
  try{
    const saved=JSON.parse(localStorage.getItem(QUIZ_SAVE_KEY));
    const migrated=saved?{...saved,earned:Array.isArray(saved.earned)?saved.earned:[],newAwards:Array.isArray(saved.newAwards)?saved.newAwards:[]}:saved;
    return isValidQuiz(migrated)?migrated:createInitialQuiz();
  }
  catch{return createInitialQuiz();}
}

function PixelIcon({col,row}){return <span className="pixel-icon" style={{'--icon-col':col,'--icon-row':row}} aria-hidden="true"/>}
function Portrait({index,locked=false}){return <span className={`pixel-portrait${locked?' locked':''}`} style={{'--portrait-col':index%4,'--portrait-row':Math.floor(index/4)}}/>}

function App(){
  const [quiz,setQuiz]=useState(loadQuiz);
  const [panel,setPanel]=useState(null);
  const [selected,setSelected]=useState(null);
  const [reaction,setReaction]=useState(null);
  useEffect(()=>{localStorage.setItem(QUIZ_SAVE_KEY,JSON.stringify(quiz));},[quiz]);
  const question=quiz.phase==='quiz'?QUESTION_BY_ID.get(quiz.questions[quiz.index]):null;
  const result=quiz.result||null;

  function start(){
    setPanel(null);setSelected(null);setReaction(null);
    setQuiz({...createInitialQuiz(),discovered:quiz.discovered,earned:quiz.earned,phase:'quiz',questions:CORE_QUESTIONS.map(item=>item.id)});
  }
  function resume(){setQuiz(current=>({...current,phase:'quiz'}));setPanel(null);}
  function choose(choiceIndex){
    if(selected!==null||!question)return;
    const choice=question.choices[choiceIndex];
    const scores=addScores(quiz.scores,choice.score);
    const answers=[...quiz.answers,{id:question.id,choice:choiceIndex}];
    const nextIndex=quiz.index+1;
    const completed=nextIndex>=24;
    const final=completed?getResult(scores):null;
    const discovered=completed?[...new Set([...quiz.discovered,final.index])]:quiz.discovered;
    const earnedNow=evaluateAchievements({answers,completed,discovered});
    const unlockedNow=earnedNow.filter(id=>!quiz.earned.includes(id));
    const baseReaction=CHOICE_REACTIONS[question.id]?.[choiceIndex]||question.reaction;
    const unlockCopy=unlockedNow.length?` ｜ 勋章解锁：${unlockedNow.map(id=>ACHIEVEMENT_BY_ID.get(id).name).join('、')}`:'';
    setSelected(choiceIndex);setReaction(`${baseReaction}${unlockCopy}`);
    window.setTimeout(()=>{
      setQuiz(current=>{
        let questions=current.questions;
        if(current.index===CORE_QUESTIONS.length-1)questions=[...questions,...selectTiebreakers(scores).map(item=>item.id)];
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
      <div className="mbti-wordmark"><strong>职场异变图鉴</strong><span>测测你会进化成哪一种公司物种</span></div>
      <div className="hr-stamp">本测试不改善命运，<br/>只负责命名。<small>— 人力资源部</small></div>
      <div className="meeting-note">周一例会 09:00<br/>请准时参加<small>— 行政部</small></div>
    </header>

    <div className="app-shell">
      <nav className="side-nav" aria-label="主要功能">
        {NAV.map(([id,label,col,row])=><button key={id} className={panel===id||id==='start'&&panel===null?'active':''} onClick={()=>nav(id)}><PixelIcon col={col} row={row}/><span>{label}</span></button>)}
      </nav>

      <main className="workstation">
        <div className="window-bar"><span>// QUESTION.EXE</span><i>绩效监控运行中</i></div>
        {quiz.phase==='intro'?<Intro onStart={start} hasProgress={quiz.answers.length>0} onResume={resume}/>:quiz.phase==='result'?<Result result={result?{...result,newAwards:quiz.newAwards}:null} onReset={reset}/>:<Question question={question} quiz={quiz} selected={selected} reaction={reaction} onChoose={choose}/>} 
      </main>

      <Atlas quiz={quiz}/>
    </div>

    {panel?<Panel id={panel} quiz={quiz} onClose={()=>setPanel(null)} onReset={clearAll}/>:null}
  </div>
}

function Intro({onStart,hasProgress,onResume}){
  return <section className="intro-screen">
    <div className="office-visual"><img src="/assets/mbti-office.webp" alt="办公室里，两位同事在复印机旁低声交谈，一位新人独自坐在工位上。"/><div className="system-caption">人力系统正在识别可替换部件……</div></div>
    <div className="intro-copy"><span className="eyebrow">公司物种鉴定 · 24 道情境</span><h1>欢迎入职。<br/>请暴露你的第一反应。</h1><p>别选“正确答案”。选老板突然点你名时，你的手、嘴和脑子最先干的那件事。每完成一次测试，只解锁本次鉴定出的公司物种。</p><div className="intro-actions"><button className="primary-action" onClick={onStart}>开始接受鉴定 →</button>{hasProgress?<button className="text-action" onClick={onResume}>继续上次工伤</button>:null}</div><small>预计 4–6 分钟 · 一次解锁一种 · 图鉴永久保存在本机</small></div>
  </section>
}

function Question({question,quiz,selected,reaction,onChoose}){
  if(!question)return null;
  const progress=Math.round((quiz.index/24)*100);
  return <section className="question-screen">
    <div className="scene-frame"><img src="/assets/mbti-office.webp" alt="像素风办公室情境"/><div className="scene-status"><span>求生欲 +{Math.max(1,Math.ceil(quiz.index/6))}</span><small>你的工位比你先转正</small></div></div>
    <div className="question-paper">
      <div className="question-meta"><span>{question.chapter}</span><strong>{String(quiz.index+1).padStart(2,'0')} / 24</strong></div>
      <div className="progress-track"><span style={{width:`${progress}%`}}/></div>
      <p className="scene-line">{question.scene}</p><h2>{question.prompt}</h2>
      <div className="choice-grid">{question.choices.map((choice,index)=><button key={choice.text} disabled={selected!==null} className={selected===index?'selected':''} onClick={()=>onChoose(index)}><span>{String.fromCharCode(65+index)}</span><b>{choice.text}</b></button>)}</div>
      <div className={`reaction-line${reaction?' visible':''}`}>{reaction||'选择不会改变命运，只会改变甩锅路径。'}</div>
    </div>
  </section>
}

function Result({result,onReset}){
  const [sharing,setSharing]=useState(false);
  if(!result)return null;
  return <section className="result-screen">
    <div className="result-hero"><Portrait index={result.index}/><div><span className="eyebrow">异常员工档案 · 鉴定完成</span><h1>{result.name}<small>{result.type}</small></h1><p>{result.verdict}</p></div></div>
    <div className="result-grid"><article><span>你靠什么活下来</span><p>{result.survival}</p></article><article><span>公司如何使用你</span><p>{result.usedBy}</p></article><article><span>最容易在哪里耗尽</span><p>{result.drain}</p></article></div>
    <div className="axis-list">{result.axes.map(axis=><div key={axis.key}><header><b>{axis.letter}</b><span>{axis.raw>=0?axis.leftLabel:axis.rightLabel}</span><small>{axis.label}</small></header><div><i style={{width:`${Math.max(12,axis.strength*100)}%`}}/></div></div>)}</div>
    {result.newAwards.length?<div className="result-awards"><span>本轮工伤认定</span><div>{result.newAwards.map(id=><b key={id}>{ACHIEVEMENT_BY_ID.get(id).name}</b>)}</div></div>:null}
    <footer className="result-footer"><p>本档案不能用于招聘、晋升或证明你比同事更懂自己。</p><div><button className="share-action" onClick={()=>setSharing(true)}>分享工伤鉴定</button><button className="primary-action" onClick={onReset}>重新接受异变</button></div></footer>
    {sharing?<ShareSheet result={result} onClose={()=>setSharing(false)}/>:null}
  </section>
}

function ShareSheet({result,onClose}){
  const [status,setStatus]=useState('手机会打开系统分享面板；电脑会保存海报并复制文案。');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{const close=event=>event.key==='Escape'&&onClose();window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[onClose]);
  const shareUrl=getShareUrl();
  const shareText=getShareText(result);

  async function copyText(){
    const value=`${shareText}${shareUrl}`;
    try{await navigator.clipboard.writeText(value);setStatus('文案和链接已复制。剩下的由群聊事故负责。');}
    catch{const input=document.createElement('textarea');input.value=value;document.body.appendChild(input);input.select();document.execCommand('copy');input.remove();setStatus('文案和链接已复制。剩下的由群聊事故负责。');}
  }
  async function getCard(){const blob=await createResultCard(result);return new File([blob],`职场异变图鉴-${result.type}.png`,{type:'image/png'});}
  function download(file){const link=document.createElement('a');link.href=URL.createObjectURL(file);link.download=file.name;link.click();window.setTimeout(()=>URL.revokeObjectURL(link.href),1000);}
  async function shareTo(target){
    setBusy(true);
    try{
      const file=await getCard();
      if(navigator.share&&navigator.canShare?.({files:[file]})){
        await navigator.share({files:[file],title:`我的职场异变结果：${result.name}`,text:`${shareText}${shareUrl}`});
        setStatus(`系统已接手，请在面板里选择${target}。`);
      }else{
        download(file);await copyText();setStatus(`海报已保存、文案已复制。打开${target}即可发布。`);
      }
    }catch(error){if(error?.name!=='AbortError')setStatus('分享面板临时罢工了，请使用“保存海报”或“复制文案”。');}
    finally{setBusy(false);}
  }
  async function downloadCard(){setBusy(true);try{download(await getCard());setStatus('结果海报已保存。它比年终总结更适合公开。');}finally{setBusy(false);}}
  function shareX(){window.open(getXShareUrl(result,shareUrl),'_blank','noopener,noreferrer');setStatus('已打开 X 发布页，文字和链接已经填好。');}

  return <div className="share-backdrop" role="presentation" onMouseDown={event=>event.target===event.currentTarget&&onClose()}>
    <section className="share-sheet" role="dialog" aria-modal="true" aria-labelledby="share-title">
      <header><div><span>SHARE_RESULT.EXE</span><h2 id="share-title">把工伤鉴定发出去</h2></div><button onClick={onClose} aria-label="关闭分享">×</button></header>
      <div className="share-layout">
        <div className="share-preview"><div className="share-preview-top">职场异变图鉴 <small>异常员工档案</small></div><div className="share-preview-person"><Portrait index={result.index}/><div><b>{result.name}</b><span>{result.type}</span><p>{result.verdict}</p></div></div><dl><div><dt>生存方式</dt><dd>{result.survival}</dd></div><div><dt>耗尽现场</dt><dd>{result.drain}</dd></div></dl><footer>本测试不改善命运，只负责命名。</footer></div>
        <div className="share-controls"><p>选择去向</p><div className="platform-grid"><button disabled={busy} onClick={()=>shareTo('微信')}>微信</button><button disabled={busy} onClick={()=>shareTo('朋友圈')}>朋友圈</button><button disabled={busy} onClick={()=>shareTo('Instagram')}>Instagram</button><button disabled={busy} onClick={shareX}>X / Twitter</button><button disabled={busy} onClick={()=>shareTo('Messages')}>Messages</button></div><div className="share-tools"><button disabled={busy} onClick={downloadCard}>保存海报</button><button disabled={busy} onClick={copyText}>复制文案 + 链接</button></div><output aria-live="polite">{busy?'人力资源部正在导出你的可传播证据……':status}</output></div>
      </div>
    </section>
  </div>
}

function Atlas({quiz}){
  return <aside className="atlas"><header><b>已鉴定物种</b><span>{quiz.discovered.length} / 16</span></header><div className="atlas-grid">{ARCHETYPES.map(item=>{const open=quiz.discovered.includes(item.index);return <button key={item.type} title={open?`${item.name} / ${item.type}`:'完成测试后解锁'}><Portrait index={item.index} locked={!open}/><span>{open?item.name:'待鉴定'}</span></button>})}</div><p>每次完成测试，只收录本次结果。<br/>重测可以补全你的公司生态。</p></aside>
}

function Panel({id,quiz,onClose,onReset}){
  const content={
    profile:<><h2>我的档案</h2><p className="panel-lead">系统只展示行为痕迹，不提前泄露字母。</p><dl><div><dt>本轮已完成</dt><dd>{quiz.answers.length} / 24</dd></div><div><dt>永久图鉴</dt><dd>{quiz.discovered.length} / 16</dd></div><div><dt>工伤认定</dt><dd>{quiz.earned.length} / {ACHIEVEMENTS.length}</dd></div><div><dt>组织评价</dt><dd>{quiz.answers.length>12?'已具备被追加工作的潜力':'仍在低成本观察期'}</dd></div></dl></>,
    atlas:<><h2>人格图鉴</h2><p className="panel-lead">每完成一次测试，只解锁最终鉴定出的那一种；重测才会继续补全。</p><div className="panel-atlas">{ARCHETYPES.map(item=><div key={item.type}><Portrait index={item.index} locked={!quiz.discovered.includes(item.index)}/><b>{quiz.discovered.includes(item.index)?item.name:'身份待定'}</b><small>{quiz.discovered.includes(item.index)?item.type:'????'}</small></div>)}</div></>,
    medals:<><h2>工伤勋章</h2><p className="panel-lead">按你的具体选择解锁，跨局永久保留。当前认定 {quiz.earned.length} / {ACHIEVEMENTS.length} 项工伤。</p><div className="achievement-grid">{ACHIEVEMENTS.map(item=>{const open=quiz.earned.includes(item.id);return <article key={item.id} className={open?'earned':'locked'}><span className="achievement-stamp">{open?item.stamp:'??'}</span><div><b>{open?item.name:'尚未认定'}</b><small>{item.condition}</small><p>{open?item.description:'人力资源部称：证据链仍不完整。'}</p></div></article>})}</div></>,
    exit:<><h2>离职遗言</h2><blockquote>“感谢平台，感谢培养。附件是我保存的全部聊天记录。”</blockquote><p className="panel-lead">放心，这只是一个按钮。你仍需完成本周交付。</p><button className="danger-action" onClick={onReset}>清除档案并模拟离职</button></>,
  }[id];
  return <div className="panel-backdrop" role="presentation" onMouseDown={event=>event.target===event.currentTarget&&onClose()}><section className="side-panel" role="dialog" aria-modal="true">{content}<button className="panel-close" onClick={onClose}>返回工位</button></section></div>
}

createRoot(document.getElementById('mbti-root')).render(<App/>);
