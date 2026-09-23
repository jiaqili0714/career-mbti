import React,{useState} from 'react';
import {submitExperimentResponse} from './analytics.js';

const MBTI_TYPES=['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'];
const EMPTY_FORM={resultFit:'',actualMbti:'',ageRange:'',gender:'',industry:'',careerStage:'',workMode:'',roleLevel:''};

const OPTIONS={
  resultFit:[['very','很像，公司可能装了监控','Very accurate'],['somewhat','有一点像，但没这么夸张','Somewhat accurate'],['not_really','不太像，建议系统重修','Not really']],
  ageRange:[['under_18','18 岁以下','Under 18'],['18_24','18–24','18–24'],['25_34','25–34','25–34'],['35_44','35–44','35–44'],['45_54','45–54','45–54'],['55_plus','55+','55+'],['prefer_not','不想回答','Prefer not to say']],
  gender:[['woman','女性','Woman'],['man','男性','Man'],['nonbinary','非二元性别','Nonbinary'],['prefer_not','不想回答','Prefer not to say']],
  industry:[['technology','科技 / 互联网','Tech / Internet'],['finance','金融','Finance'],['education','教育','Education'],['healthcare','医疗健康','Healthcare'],['creative_media','创意 / 媒体','Creative / Media'],['professional_services','专业服务','Professional services'],['retail_hospitality','零售 / 餐饮 / 酒店','Retail / Hospitality'],['manufacturing_logistics','制造 / 物流','Manufacturing / Logistics'],['government_nonprofit','政府 / 非营利','Government / Nonprofit'],['student','学生','Student'],['other','其他','Other'],['prefer_not','不想回答','Prefer not to say']],
  careerStage:[['student','学生','Student'],['0_2','工作 0–2 年','0–2 years'],['3_5','工作 3–5 年','3–5 years'],['6_10','工作 6–10 年','6–10 years'],['11_plus','工作 11 年以上','11+ years'],['not_working','目前未工作','Not currently working'],['prefer_not','不想回答','Prefer not to say']],
  workMode:[['onsite','主要现场办公','Mostly on-site'],['hybrid','混合办公','Hybrid'],['remote','主要远程办公','Mostly remote'],['not_applicable','不适用','Not applicable'],['prefer_not','不想回答','Prefer not to say']],
  roleLevel:[['individual','个人贡献者','Individual contributor'],['manager','管理者','Manager'],['executive','高层管理者','Executive'],['self_employed','自由职业 / 自雇','Self-employed'],['student','学生','Student'],['not_working','目前未工作','Not currently working'],['prefer_not','不想回答','Prefer not to say']],
};

function SelectField({id,label,value,onChange,language,children,optional=true}){
  return <label className="experiment-field" htmlFor={id}><span>{label}{optional?<small>{language==='en'?'OPTIONAL':'可跳过'}</small>:null}</span><select id={id} value={value} onChange={onChange} required={!optional}><option value="">{language==='en'?'Select…':'请选择…'}</option>{children}</select></label>;
}

function OptionList({name,language}){
  return OPTIONS[name].map(([value,zh,en])=><option key={value} value={value}>{language==='en'?en:zh}</option>);
}

function comparisonCopy(actualMbti,resultType,language){
  if(!actualMbti||actualMbti==='unknown')return language==='en'?['FEEDBACK RECEIVED','Your result has joined the experiment. Your usual MBTI can stay off the record.']:['反馈已归档','你的结果已加入实验，现实 MBTI 继续享有隐私。'];
  const changes=[...actualMbti].map((letter,index)=>letter===resultType[index]?null:`${letter}→${resultType[index]}`).filter(Boolean);
  if(!changes.length)return language==='en'?['SAME PERSON, DIFFERENT BADGE','Your usual MBTI and workplace result match on all four dimensions. Work did not get a separate version of you.']:['同一个人，只是换了工牌','你的现实 MBTI 和职场结果四个维度完全一致。公司没能训练出另一个版本的你。'];
  return language==='en'?[`${changes.length} DIMENSION${changes.length>1?'S':''} CHANGED`,`${actualMbti} becomes ${resultType} at work: ${changes.join(' · ')}.`]:[`有 ${changes.length} 个维度进公司后变了`,`${actualMbti} 在职场里变成 ${resultType}：${changes.join(' · ')}。`];
}

export default function ExperimentSurvey({language,result,saved,onSaved}){
  const [open,setOpen]=useState(false);
  const [dismissed,setDismissed]=useState(false);
  const [form,setForm]=useState(EMPTY_FORM);
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);
  const en=language==='en';

  if(saved){
    const [title,detail]=comparisonCopy(saved.actualMbti,result.type,language);
    return <section className="experiment-card experiment-receipt"><span className="experiment-kicker">SOCIAL_EXPERIMENT.LOG</span><h2>{title}</h2><p>{detail}</p><small>{en?'Saved as an anonymous contribution. Only group-level findings will be published.':'已作为匿名样本保存，之后只会公开群体汇总。'}</small></section>;
  }
  if(dismissed)return null;

  function update(key){return event=>setForm(current=>({...current,[key]:event.target.value}));}
  async function submit(event){
    event.preventDefault();setBusy(true);setStatus('');
    const {resultFit,...details}=form;
    const response={...details,mbtiConfidence:`fit_${resultFit}`,actualMbti:form.actualMbti||'unknown',resultType:result.type};
    try{
      const stored=await submitExperimentResponse(response);
      if(!stored)throw new Error('not stored');
      onSaved({...response,responseId:stored.responseId});
    }catch{
      setStatus(en?'The experiment could not save your response. Nothing was recorded—please try again.':'实验数据暂时没有保存成功，也没有留下半份记录。请再试一次。');
    }finally{setBusy(false);}
  }

  return <section className={`experiment-card${open?' open':''}`}>
    <span className="experiment-kicker">SOCIAL_EXPERIMENT.EXE</span>
    <h2>{en?'DOES THIS RESULT FEEL LIKE YOU?':'这份结果像你吗？'}</h2>
    <p>{en?'Tell us how close it feels. If you know your usual MBTI, you can add it too.':'告诉我们这次鉴定准不准；如果你知道自己平时的 MBTI，也可以顺手留下。'}</p>
    {!open?<div className="experiment-actions"><button className="primary-action" onClick={()=>setOpen(true)}>{en?'RATE MY RESULT →':'评价这份结果 →'}</button><button className="text-action" onClick={()=>setDismissed(true)}>{en?'SKIP':'跳过'}</button></div>:
      <form onSubmit={submit}>
        <fieldset className="result-fit"><legend>{en?'How accurate does it feel?':'你觉得有多像？'}</legend>{OPTIONS.resultFit.map(([value,zh,label])=><label key={value}><input type="radio" name="result-fit" value={value} checked={form.resultFit===value} onChange={update('resultFit')} required/><span>{en?label:zh}</span></label>)}</fieldset>
        <div className="experiment-grid">
          <SelectField id="actual-mbti" label={en?'Your usual MBTI':'你平时认同的 MBTI'} value={form.actualMbti} onChange={update('actualMbti')} language={language}>{MBTI_TYPES.map(type=><option key={type} value={type}>{type}</option>)}</SelectField>
          <SelectField id="age-range" label={en?'Age range':'年龄段'} value={form.ageRange} onChange={update('ageRange')} language={language}><OptionList name="ageRange" language={language}/></SelectField>
          <SelectField id="gender" label={en?'Gender':'性别'} value={form.gender} onChange={update('gender')} language={language}><OptionList name="gender" language={language}/></SelectField>
          <SelectField id="industry" label={en?'Industry':'行业'} value={form.industry} onChange={update('industry')} language={language}><OptionList name="industry" language={language}/></SelectField>
          <SelectField id="career-stage" label={en?'Career stage':'职业阶段'} value={form.careerStage} onChange={update('careerStage')} language={language}><OptionList name="careerStage" language={language}/></SelectField>
          <SelectField id="work-mode" label={en?'Work setup':'工作方式'} value={form.workMode} onChange={update('workMode')} language={language}><OptionList name="workMode" language={language}/></SelectField>
          <SelectField id="role-level" label={en?'Current role':'当前角色'} value={form.roleLevel} onChange={update('roleLevel')} language={language}><OptionList name="roleLevel" language={language}/></SelectField>
        </div>
        <p className="experiment-consent">{en?'Your answers will be included in anonymous, group-level analysis. We do not collect your name, employer, email, or individual quiz answers.':'提交后，这些答案只用于匿名群体分析；不收集姓名、公司、邮箱或每道题的具体选择。'}</p>
        <div className="experiment-actions"><button className="primary-action" type="submit" disabled={busy}>{busy?(en?'SAVING…':'正在归档…'):(en?'ADD MY ANONYMOUS RESPONSE':'提交匿名样本')}</button><button className="text-action" type="button" onClick={()=>setOpen(false)}>{en?'BACK':'返回'}</button></div>
        {status?<output className="experiment-error" aria-live="polite">{status}</output>:null}
      </form>}
  </section>;
}
