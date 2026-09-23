create table if not exists public.analytics_sessions (
  session_id uuid primary key,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  country_code varchar(2),
  region_code varchar(8),
  landing_path text,
  referrer_host text,
  source text not null default 'direct',
  medium text not null default 'none',
  campaign text,
  language varchar(16),
  device_type varchar(12) not null default 'unknown',
  active_seconds integer not null default 0 check (active_seconds between 0 and 86400)
);

alter table public.analytics_sessions enable row level security;
revoke all on public.analytics_sessions from public, anon, authenticated;

create index if not exists analytics_sessions_started_at_idx on public.analytics_sessions (started_at desc);
create index if not exists analytics_sessions_country_started_idx on public.analytics_sessions (country_code, started_at desc);
create index if not exists analytics_sessions_source_started_idx on public.analytics_sessions (source, started_at desc);
create table if not exists public.analytics_attempts (
  attempt_id uuid primary key,
  session_id uuid not null references public.analytics_sessions(session_id) on delete cascade,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  completed_at timestamptz,
  questions_answered smallint not null default 0 check (questions_answered between 0 and 28),
  result_type varchar(4) check (result_type ~ '^[EI][SN][TF][JP]$')
);

alter table public.analytics_attempts enable row level security;
revoke all on public.analytics_attempts from public, anon, authenticated;

create index if not exists analytics_attempts_session_idx on public.analytics_attempts (session_id);
create index if not exists analytics_attempts_started_idx on public.analytics_attempts (started_at desc);
create index if not exists analytics_attempts_result_idx on public.analytics_attempts (result_type) where result_type is not null;

create table if not exists public.experiment_responses (
  response_id uuid primary key,
  session_id uuid not null,
  attempt_id uuid,
  submitted_at timestamptz not null default now(),
  result_type varchar(4) not null check (result_type ~ '^[EI][SN][TF][JP]$'),
  actual_mbti varchar(8) not null check (actual_mbti = 'UNKNOWN' or actual_mbti ~ '^[EI][SN][TF][JP]$'),
  mbti_confidence varchar(24),
  age_range varchar(24),
  gender varchar(24),
  industry varchar(40),
  career_stage varchar(24),
  work_mode varchar(24),
  role_level varchar(24),
  language varchar(16)
);

alter table public.experiment_responses enable row level security;
revoke all on public.experiment_responses from public, anon, authenticated;
create index if not exists experiment_responses_submitted_idx on public.experiment_responses (submitted_at desc);
create index if not exists experiment_responses_transition_idx on public.experiment_responses (actual_mbti, result_type) where actual_mbti <> 'UNKNOWN';

create or replace function public.record_experiment_response(
  p_response_id uuid,
  p_session_id uuid,
  p_attempt_id uuid,
  p_result_type text,
  p_actual_mbti text,
  p_mbti_confidence text,
  p_age_range text,
  p_gender text,
  p_industry text,
  p_career_stage text,
  p_work_mode text,
  p_role_level text,
  p_language text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.experiment_responses (
    response_id, session_id, attempt_id, result_type, actual_mbti, mbti_confidence,
    age_range, gender, industry, career_stage, work_mode, role_level, language
  ) values (
    p_response_id,
    p_session_id,
    p_attempt_id,
    p_result_type,
    p_actual_mbti,
    nullif(left(p_mbti_confidence,24),''),
    nullif(left(p_age_range,24),''),
    nullif(left(p_gender,24),''),
    nullif(left(p_industry,40),''),
    nullif(left(p_career_stage,24),''),
    nullif(left(p_work_mode,24),''),
    nullif(left(p_role_level,24),''),
    nullif(left(p_language,16),'')
  ) on conflict (response_id) do nothing;
end;
$$;

revoke execute on function public.record_experiment_response(uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.record_experiment_response(uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,text) to service_role;

create or replace function public.record_analytics_event(
  p_event text,
  p_session_id uuid,
  p_attempt_id uuid,
  p_country_code text,
  p_region_code text,
  p_landing_path text,
  p_referrer_host text,
  p_source text,
  p_medium text,
  p_campaign text,
  p_language text,
  p_device_type text,
  p_questions_answered integer,
  p_active_seconds integer,
  p_result_type text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_event not in ('session_start','quiz_start','progress','complete','heartbeat','session_end') then
    raise exception 'unsupported analytics event';
  end if;

  insert into public.analytics_sessions (
    session_id, last_seen_at, country_code, region_code,
    landing_path, referrer_host, source, medium, campaign, language, device_type, active_seconds
  ) values (
    p_session_id,
    now(),
    nullif(left(p_country_code,2),''),
    nullif(left(p_region_code,8),''),
    nullif(left(p_landing_path,300),''),
    nullif(left(p_referrer_host,160),''),
    coalesce(nullif(left(p_source,160),''),'direct'),
    coalesce(nullif(left(p_medium,80),''),'none'),
    nullif(left(p_campaign,120),''),
    nullif(left(p_language,16),''),
    case when p_device_type in ('mobile','desktop') then p_device_type else 'unknown' end,
    greatest(0,least(86400,coalesce(p_active_seconds,0)))
  )
  on conflict (session_id) do update set
    last_seen_at = now(),
    country_code = coalesce(public.analytics_sessions.country_code,excluded.country_code),
    region_code = coalesce(public.analytics_sessions.region_code,excluded.region_code),
    landing_path = coalesce(public.analytics_sessions.landing_path,excluded.landing_path),
    referrer_host = coalesce(public.analytics_sessions.referrer_host,excluded.referrer_host),
    source = coalesce(public.analytics_sessions.source,excluded.source),
    medium = coalesce(public.analytics_sessions.medium,excluded.medium),
    campaign = coalesce(public.analytics_sessions.campaign,excluded.campaign),
    language = coalesce(public.analytics_sessions.language,excluded.language),
    device_type = case when public.analytics_sessions.device_type = 'unknown' then excluded.device_type else public.analytics_sessions.device_type end,
    active_seconds = greatest(public.analytics_sessions.active_seconds,excluded.active_seconds);

  if p_attempt_id is not null and p_event in ('quiz_start','progress','complete') then
    insert into public.analytics_attempts (
      attempt_id, session_id, last_seen_at, completed_at, questions_answered, result_type
    ) values (
      p_attempt_id,
      p_session_id,
      now(),
      case when p_event = 'complete' then now() end,
      greatest(0,least(28,coalesce(p_questions_answered,0))),
      case when p_result_type ~ '^[EI][SN][TF][JP]$' then p_result_type end
    )
    on conflict (attempt_id) do update set
      last_seen_at = now(),
      completed_at = coalesce(public.analytics_attempts.completed_at,excluded.completed_at),
      questions_answered = greatest(public.analytics_attempts.questions_answered,excluded.questions_answered),
      result_type = coalesce(excluded.result_type,public.analytics_attempts.result_type);
  end if;
end;
$$;

revoke execute on function public.record_analytics_event(text,uuid,uuid,text,text,text,text,text,text,text,text,text,integer,integer,text) from public, anon, authenticated;
grant execute on function public.record_analytics_event(text,uuid,uuid,text,text,text,text,text,text,text,text,text,integer,integer,text) to service_role;

create or replace view public.analytics_daily as
with sessions as (
  select started_at::date as day, count(*) as visits, round(avg(active_seconds)) as avg_active_seconds
  from public.analytics_sessions group by 1
), attempts as (
  select started_at::date as day, count(*) as quiz_starts, count(completed_at) as completions,
    round(avg(questions_answered),1) as avg_questions_answered
  from public.analytics_attempts group by 1
)
select sessions.day, sessions.visits, coalesce(attempts.quiz_starts,0) as quiz_starts,
  coalesce(attempts.completions,0) as completions,
  round(100.0 * coalesce(attempts.completions,0) / nullif(attempts.quiz_starts,0),1) as completion_rate_pct,
  sessions.avg_active_seconds, coalesce(attempts.avg_questions_answered,0) as avg_questions_answered
from sessions left join attempts using (day)
order by sessions.day desc;

create or replace view public.analytics_by_region as
select
  coalesce(country_code,'unknown') as country,
  coalesce(region_code,'unknown') as region,
  count(*) as visits,
  coalesce(sum(attempts.completions),0) as completions,
  round(avg(sessions.active_seconds)) as avg_active_seconds
from public.analytics_sessions sessions
left join (
  select session_id, count(completed_at) as completions
  from public.analytics_attempts
  group by session_id
) attempts on attempts.session_id = sessions.session_id
group by 1,2
order by visits desc;

create or replace view public.analytics_by_source as
select sessions.source, sessions.medium, coalesce(sessions.campaign,'') as campaign,
  count(distinct sessions.session_id) as visits,
  count(attempts.completed_at) as completions,
  round(avg(attempts.questions_answered),1) as avg_questions_answered
from public.analytics_sessions sessions
left join public.analytics_attempts attempts on attempts.session_id = sessions.session_id
group by 1,2,3
order by visits desc;

create or replace view public.analytics_results as
select result_type, count(*) as results,
  round(100.0 * count(*) / sum(count(*)) over (),1) as share_pct
from public.analytics_attempts
where result_type is not null
group by 1
order by results desc;

create or replace view public.experiment_transitions as
select actual_mbti, result_type as workplace_mbti, count(*) as responses,
  round(100.0 * count(*) / sum(count(*)) over (partition by actual_mbti),1) as share_within_actual_pct
from public.experiment_responses
where actual_mbti <> 'UNKNOWN'
group by 1,2
order by responses desc;

create or replace view public.experiment_overview as
select
  count(*) as responses,
  count(*) filter (where actual_mbti <> 'UNKNOWN') as typed_responses,
  round(100.0 * count(*) filter (where actual_mbti = result_type) / nullif(count(*) filter (where actual_mbti <> 'UNKNOWN'),0),1) as exact_match_pct,
  round(avg(
    (substr(actual_mbti,1,1)=substr(result_type,1,1))::integer +
    (substr(actual_mbti,2,1)=substr(result_type,2,1))::integer +
    (substr(actual_mbti,3,1)=substr(result_type,3,1))::integer +
    (substr(actual_mbti,4,1)=substr(result_type,4,1))::integer
  ) filter (where actual_mbti <> 'UNKNOWN'),2) as avg_matching_dimensions
from public.experiment_responses;

revoke all on public.analytics_daily, public.analytics_by_region, public.analytics_by_source, public.analytics_results, public.experiment_transitions, public.experiment_overview from public, anon, authenticated;
