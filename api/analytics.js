const EVENTS=new Set(['session_start','quiz_start','progress','complete','heartbeat','session_end']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MBTI=/^[EI][SN][TF][JP]$/;

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
