# Anonymous analytics warehouse

The site records one aggregate row per browser-tab session and one row per quiz attempt. It tracks coarse country/region, referral source and UTM tags, active foreground time, question progress, language/device class, and the final MBTI type. After seeing a result, visitors can separately opt into the social experiment by submitting their usual MBTI and broad demographic/work categories. It does **not** store names, employers, email addresses, exact coordinates, full IP addresses, or individual quiz answers. Global Privacy Control and Do Not Track are respected for passive analytics; the experiment form is submitted only after an explicit user action.

## One-time setup

1. Create a Supabase project and open **SQL Editor**.
2. Run [`supabase/analytics.sql`](./supabase/analytics.sql).
3. In Vercel, add these Production environment variables:
   - `SUPABASE_URL` or the Vercel integration's `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SECRET_KEY` — use a new `sb_secret_...` server key, never a browser/publishable key.
4. Redeploy the production site.

The endpoint returns `204` and collects nothing until both variables are configured, so local development and preview builds do not pollute production data.

## Reading the data

Open **Supabase → Table Editor → Views**:

- `analytics_daily`: visits, starts, completions, completion rate, active time, and average progress
- `analytics_by_region`: country/region traffic and engagement
- `analytics_by_source`: direct, referring domain, or UTM campaign traffic
- `analytics_results`: distribution of the 16 outcomes
- `experiment_overview`: response count, exact-match rate, and average matching dimensions
- `experiment_transitions`: usual MBTI → workplace MBTI pathways

For campaign links, use standard tags such as:

```text
https://career-mbti-beta.vercel.app/?utm_source=instagram&utm_medium=social&utm_campaign=launch
```

## Privacy and retention

The random session ID lives in `sessionStorage`, so it expires when the browser tab closes and is not a cross-site identifier. Consider adding the anonymous analytics described here to the site's public privacy notice. If long-term raw data is unnecessary, schedule deletion of rows older than your chosen retention window.
