# Office Survival Test

A bilingual workplace MBTI quiz wrapped in a 1990s-inspired pixel-art office. Across 28 scenarios about ambition, office politics, vague briefs, competing priorities, and Friday-afternoon emergencies, the test identifies which of 16 workplace archetypes best matches how you operate at work.

The site supports English and Simplified Chinese. It detects the browser language on the first visit, and visitors can switch languages at any time.

[Take the test](https://career-mbti-beta.vercel.app) · [中文 README](./README.md)

## Features

- 20 core workplace scenarios and 8 adaptive tie-breakers
- All 16 MBTI outcomes, each with a distinct pixel character and workplace archetype
- Four-axis result breakdown without revealing the letters before completion
- Choice-based achievements and a persistent type collection
- Shareable 4:5 result cards, native sharing, X sharing, and copy-ready text with a link
- Responsive layouts for desktop and mobile
- Browser-language detection with a manual language switch
- Progress saved locally with `localStorage`

## Run locally

Node.js 20 or later is recommended.

```bash
npm install
npm run dev
```

Open the local URL printed in the terminal. The quiz is available at both `/` and `/mbti.html`.

## Test and build

```bash
npm test
npm run build
```

The production build is written to `dist/` and can be deployed to any static hosting service.

## Tech stack

- React 19
- Vite 7
- Node.js native test runner

## Contributing

Issues and pull requests are welcome. If the project made you laugh, please consider giving it a star—it helps more people find the test.

## Disclaimer

This project is for entertainment only. It is not intended for hiring, promotion, or professional psychological assessment.
