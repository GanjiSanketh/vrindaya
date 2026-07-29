import { PurgeCSS } from 'purgecss';
import { writeFileSync } from 'fs';

const browser = 'dist/vrindaya/browser';

const results = await new PurgeCSS().purge({
  content: [`${browser}/index.html`, `${browser}/*.js`],
  css: [`${browser}/*.css`],
  safelist: {
    standard: [
      /^bs-/, /^bi-/, /^btn-/, /^modal-/, /^fade/, /^show/, /^active/,
      /^collapse/, /^collaps/, /^tooltip/, /^popover/, /^carousel/,
      /^nav-/, /^dropdown/, /^accordion/, /^toast/, /^offcanvas/,
      /^spinner-/, /^tab-/, /^chart-/, /^container/, /^row$/, /^col-/,
      /^d-/, /^justify/, /^align-/, /^text-/, /^gap-/, /^g-/,
      /^p-/, /^m-/, /^px-/, /^py-/, /^mx-/, /^my-/, /^pt-/, /^pb-/,
      /^ps-/, /^pe-/, /^mt-/, /^mb-/, /^ms-/, /^me-/, /^w-/, /^h-/,
      /^rounded/, /^border/, /^shadow/, /^position-/, /^top-/, /^start-/,
      /^end-/, /^bottom-/, /^translate-/, /^flex/, /^grid/, /^float/,
      /^clearfix/, /^overflow/, /^visible/, /^invisible/, /^screen/,
      /^vh-/, /^vw-/, /^min-/, /^max-/, /^table/, /^sticky/, /^fixed/,
      /^absolute/, /^relative/, /^static/, /^stretched-link/, /^sr-only/,
      /^visually-/, /^ratio/, /^object-/,
    ],
  },
});

for (const r of results) {
  writeFileSync(r.file, r.css, 'utf-8');
  console.log(`Purged: ${r.file}`);
}
console.log(`PurgeCSS complete: ${results.length} files processed.`);
