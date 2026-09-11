# Ayoosh Iyer — Portfolio

A responsive, single-page portfolio built from Ayoosh's 2026 résumé. The site uses plain HTML, CSS, and JavaScript, so it can be deployed anywhere without a build step.

## Run locally

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Deploy to Vercel

From this folder, run:

```bash
npx vercel@latest --prod
```

Choose the free Hobby account when prompted. No build command or output directory is required; this is a static site.

## Files

- `index.html` — content and page structure
- `styles.css` — responsive visual system and animation
- `script.js` — loader, navigation, scroll reveals, cursor, and interactions
- `vercel.json` — deployment and security-header configuration
- `Ayoosh_Resume_2026_CGPA_8.55.pdf` — downloadable résumé
