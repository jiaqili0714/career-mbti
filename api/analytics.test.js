import assert from 'node:assert/strict';
import test from 'node:test';
import handler from './analytics.js';

function response(){
  return {
    statusCode:200,
    payload:null,
    ended:false,
    headers:{},
    status(code){this.statusCode=code;return this;},
    setHeader(name,value){this.headers[name.toLowerCase()]=value;return this;},
    json(value){this.payload=value;this.ended=true;return this;},
    end(){this.ended=true;return this;},
  };
}

test('analytics endpoint rejects cross-origin writes',async()=>{
  const res=response();
  await handler({method:'POST',headers:{host:'career.example',origin:'https://spam.example'},body:{}},res);
  assert.equal(res.statusCode,403);
});

test('analytics endpoint allows the published Sites mirror through CORS',async()=>{
  const res=response();
  await handler({method:'OPTIONS',headers:{host:'career-mbti-beta.vercel.app',origin:'https://career-mbti.ggboy-313.chatgpt.site'}},res);
  assert.equal(res.statusCode,204);
  assert.equal(res.headers['access-control-allow-origin'],'https://career-mbti.ggboy-313.chatgpt.site');
  assert.equal(res.headers['access-control-allow-methods'],'POST, OPTIONS');
});

test('analytics endpoint validates and forwards only coarse server-side geography',async()=>{
  const previousUrl=process.env.SUPABASE_URL;
  const previousKey=process.env.SUPABASE_SECRET_KEY;
  const previousFetch=global.fetch;
  process.env.SUPABASE_URL='https://warehouse.example';
  process.env.SUPABASE_SECRET_KEY='server-secret';
  let forwarded;
  global.fetch=async(url,options)=>{
    forwarded={url,options,payload:JSON.parse(options.body)};
    return new Response(null,{status:204});
  };
  try{
    const res=response();
    await handler({
      method:'POST',
      headers:{host:'career.example',origin:'https://career.example','x-vercel-ip-country':'us','x-vercel-ip-country-region':'ny'},
      body:{event:'complete',sessionId:'d9428888-122b-4c59-9c30-8f3a64c8475e',attemptId:'6ba7b810-9dad-41d1-80b4-00c04f1e9cb7',questionsAnswered:99,activeSeconds:120,resultType:'infj',source:'instagram',medium:'social'},
    },res);
    assert.equal(res.statusCode,204);
    assert.equal(forwarded.url,'https://warehouse.example/rest/v1/rpc/record_analytics_event');
    assert.equal(forwarded.payload.p_country_code,'US');
    assert.equal(forwarded.payload.p_region_code,'NY');
    assert.equal(forwarded.payload.p_attempt_id,'6ba7b810-9dad-41d1-80b4-00c04f1e9cb7');
    assert.equal(forwarded.payload.p_questions_answered,16);
    assert.equal(forwarded.payload.p_result_type,'INFJ');
    assert.equal(forwarded.options.headers.apikey,'server-secret');
  }finally{
    global.fetch=previousFetch;
    if(previousUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=previousUrl;
    if(previousKey===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=previousKey;
  }
});

test('experiment endpoint accepts only the anonymous survey schema',async()=>{
  const previousUrl=process.env.SUPABASE_URL;
  const previousKey=process.env.SUPABASE_SECRET_KEY;
  const previousFetch=global.fetch;
  process.env.SUPABASE_URL='https://warehouse.example';
  process.env.SUPABASE_SECRET_KEY='server-secret';
  let forwarded;
  global.fetch=async(url,options)=>{forwarded={url,payload:JSON.parse(options.body)};return new Response(null,{status:204});};
  try{
    const res=response();
    await handler({
      method:'POST',headers:{host:'career-mbti-beta.vercel.app',origin:'https://career-mbti.ggboy-313.chatgpt.site'},
      body:{event:'experiment_response',responseId:'7f972a0a-98ee-4f2d-a2d7-0249a89c161f',sessionId:'d9428888-122b-4c59-9c30-8f3a64c8475e',attemptId:'6ba7b810-9dad-41d1-80b4-00c04f1e9cb7',resultType:'isfj',actualMbti:'unknown',mbtiConfidence:'fit_very',ageRange:'25_34',gender:'prefer_not',industry:'technology',careerStage:'3_5',workMode:'hybrid',roleLevel:'individual',language:'zh-CN'},
    },res);
    assert.equal(res.statusCode,204);
    assert.equal(res.headers['access-control-allow-origin'],'https://career-mbti.ggboy-313.chatgpt.site');
    assert.equal(forwarded.url,'https://warehouse.example/rest/v1/rpc/record_experiment_response');
    assert.equal(forwarded.payload.p_actual_mbti,'UNKNOWN');
    assert.equal(forwarded.payload.p_result_type,'ISFJ');
    assert.equal(forwarded.payload.p_mbti_confidence,'fit_very');
    assert.equal(forwarded.payload.p_industry,'technology');

    const invalid=response();
    await handler({method:'POST',headers:{host:'career.example',origin:'https://career.example'},body:{event:'experiment_response',responseId:'7f972a0a-98ee-4f2d-a2d7-0249a89c161f',sessionId:'d9428888-122b-4c59-9c30-8f3a64c8475e',resultType:'ISFJ',actualMbti:'ENFP',industry:'very specific employer'}},invalid);
    assert.equal(invalid.statusCode,400);
  }finally{
    global.fetch=previousFetch;
    if(previousUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=previousUrl;
    if(previousKey===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=previousKey;
  }
});
