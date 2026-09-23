const EVENTS=new Set(['session_start','quiz_start','progress','complete','heartbeat','session_end','experiment_response']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MBTI=/^[EI][SN][TF][JP]$/;
const EXPERIMENT_VALUES={
  mbtiConfidence:new Set(['sure','likely','old_result','unsure']),
  ageRange:new Set(['under_18','18_24','25_34','35_44','45_54','55_plus','prefer_not']),
  gender:new Set(['woman','man','nonbinary','prefer_not']),
  industry:new Set(['technology','finance','education','healthcare','creative_media','professional_services','retail_hospitality','manufacturing_logistics','government_nonprofit','student','other','prefer_not']),
  careerStage:new Set(['student','0_2','3_5','6_10','11_plus','not_working','prefer_not']),
  workMode:new Set(['onsite','hybrid','remote','not_applicable','prefer_not']),
  roleLevel:new Set(['individual','manager','executive','self_employed','student','not_working','prefer_not']),
};

function text(value,max){return typeof value==='string'?value.trim().slice(0,max):'';}

function sameOrigin(req){
  const origin=req.headers.origin;
  if(!origin)return true;
  try{return new URL(origin).host===req.headers.host;}catch{return false;}
}

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  if(!sameOrigin(req))return res.status(403).json({error:'Origin not allowed'});

  const supabaseUrl=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey=process.env.SUPABASE_SECRET_KEY;
  if(!supabaseUrl||!supabaseKey)return res.status(204).end();

  let body=req.body;
  if(typeof body==='string'){
    try{body=JSON.parse(body);}catch{return res.status(400).json({error:'Invalid JSON'});}
  }
  if(!body||!EVENTS.has(body.event)||!UUID.test(body.sessionId||''))return res.status(400).json({error:'Invalid event'});
  const attemptId=UUID.test(body.attemptId||'')?body.attemptId:null;
  if(['quiz_start','progress','complete'].includes(body.event)&&!attemptId)return res.status(400).json({error:'Missing attempt'});

  if(body.event==='experiment_response'){
    const resultType=text(body.resultType,4).toUpperCase();
    const actualMbti=text(body.actualMbti,8).toUpperCase();
    if(!UUID.test(body.responseId||'')||!MBTI.test(resultType)||!(MBTI.test(actualMbti)||actualMbti==='UNKNOWN'))return res.status(400).json({error:'Invalid experiment response'});
    const fields={};
    for(const [key,allowed] of Object.entries(EXPERIMENT_VALUES)){
      const value=text(body[key],40);
      if(value&&!allowed.has(value))return res.status(400).json({error:`Invalid ${key}`});
      fields[key]=value;
    }
    const experimentPayload={
      p_response_id:body.responseId,
      p_session_id:body.sessionId,
      p_attempt_id:attemptId,
      p_result_type:resultType,
      p_actual_mbti:actualMbti,
      p_mbti_confidence:fields.mbtiConfidence,
      p_age_range:fields.ageRange,
      p_gender:fields.gender,
      p_industry:fields.industry,
      p_career_stage:fields.careerStage,
      p_work_mode:fields.workMode,
      p_role_level:fields.roleLevel,
      p_language:text(body.language,16),
    };
    try{
      const response=await fetch(`${supabaseUrl.replace(/\/$/,'')}/rest/v1/rpc/record_experiment_response`,{
        method:'POST',headers:{apikey:supabaseKey,'content-type':'application/json'},body:JSON.stringify(experimentPayload),
      });
      if(!response.ok){
        const detail=await response.text();
        console.error('Experiment warehouse rejected a response',response.status,detail.slice(0,500));
        return res.status(502).json({error:'Warehouse unavailable'});
      }
      return res.status(204).end();
    }catch(error){
      console.error('Experiment warehouse request failed',error);
      return res.status(502).json({error:'Warehouse unavailable'});
    }
  }

  const resultType=text(body.resultType,4).toUpperCase();
  const payload={
    p_event:body.event,
    p_session_id:body.sessionId,
    p_attempt_id:attemptId,
    p_country_code:text(req.headers['x-vercel-ip-country'],2).toUpperCase(),
    p_region_code:text(req.headers['x-vercel-ip-country-region'],8).toUpperCase(),
    p_landing_path:text(body.landingPath,300),
    p_referrer_host:text(body.referrerHost,160),
    p_source:text(body.source,160),
    p_medium:text(body.medium,80),
    p_campaign:text(body.campaign,120),
    p_language:text(body.language,16),
    p_device_type:['mobile','desktop'].includes(body.deviceType)?body.deviceType:'unknown',
    p_questions_answered:Math.max(0,Math.min(16,Number(body.questionsAnswered)||0)),
    p_active_seconds:Math.max(0,Math.min(86400,Number(body.activeSeconds)||0)),
    p_result_type:MBTI.test(resultType)?resultType:'',
  };

  try{
    const response=await fetch(`${supabaseUrl.replace(/\/$/,'')}/rest/v1/rpc/record_analytics_event`,{
      method:'POST',
      headers:{apikey:supabaseKey,'content-type':'application/json'},
      body:JSON.stringify(payload),
    });
    if(!response.ok){
      const detail=await response.text();
      console.error('Analytics warehouse rejected an event',response.status,detail.slice(0,500));
      return res.status(502).json({error:'Warehouse unavailable'});
    }
    return res.status(204).end();
  }catch(error){
    console.error('Analytics warehouse request failed',error);
    return res.status(502).json({error:'Warehouse unavailable'});
  }
}
