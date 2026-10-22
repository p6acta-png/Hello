# Для Кати ♡

A one-question invitation: «Катя, пойдёшь со мной на свидание?»
«Да» is easy to press. «Нет» is not.

Vite + React + TypeScript, no backend. Fonts are self-hosted (Instrument Serif, with condensed
Noto Serif Display for the Cyrillic letters Instrument Serif lacks, and Manrope), and confetti comes
from `canvas-confetti`.

## Run locally

```sh
npm install
npm run dev       # http://localhost:5173
```

## Build

```sh
npm run build     # type-check and build into dist/
npm run preview   # serve dist/ locally
```

`dist/` is plain static files that use relative paths, so it works from any static host or
sub-path: Vercel or Netlify (build command `npm run build`, output directory `dist`), GitHub Pages,
or by dragging the `dist` folder onto Netlify Drop.
