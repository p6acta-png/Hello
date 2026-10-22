import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
// Instrument Serif has no Cyrillic; condensed Noto Serif Display is its closest match for the Russian letters.
import '@fontsource-variable/noto-serif-display/wdth.css'
import '@fontsource-variable/noto-serif-display/wdth-italic.css'
import '@fontsource-variable/manrope/wght.css'
import './styles.css'
import App from './App'

// Hold the entrance animation until the fonts are in, so the first frame she sees is the real one.
const fonts = [
  ['400 1em "Instrument Serif"', ',?'],
  ['italic 400 1em "Instrument Serif"', ','],
  ['400 1em "Noto Serif Display Variable"', 'пойдёшь'],
  ['italic 400 1em "Noto Serif Display Variable"', 'Катя'],
  ['600 1em "Manrope Variable"', 'ДаНет'],
]
Promise.race([
  Promise.all(fonts.map(([font, text]) => document.fonts.load(font, text))),
  new Promise((resolve) => setTimeout(resolve, 2500)),
]).finally(() => document.documentElement.classList.add('is-ready'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
