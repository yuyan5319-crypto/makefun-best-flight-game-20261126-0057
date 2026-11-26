// Ridgeline Courier — the hand-in program (Node 22, standard library
// only). It gathers the game and its screenshots from beside this file
// and lays them out in the output directory, then writes dossier.json,
// the summary the judge reads, with the vendored make.fun library.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output. The
// program runs twice and both runs must write the same bytes: the copy
// is a plain recursive copy and buildDossier sorts everything it reads,
// so nothing here depends on the clock or on file order.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail fast with a plain message when the entry is incomplete, instead
// of writing a half-empty output directory the gate would refuse.
const gameSource = join(repoRoot, 'game');
const shotsSource = join(repoRoot, 'screenshots');
if (!existsSync(join(gameSource, 'index.html'))) {
  throw new Error('game/index.html is missing — nothing to hand in');
}
if (!existsSync(shotsSource)) {
  throw new Error('screenshots/ is missing — the entry needs 3 or 4 shots');
}

// Start from a clean output directory so a stale screenshot or dossier
// from an earlier build can never leak into this one.
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

const gameTarget = join(outputDir, 'game');
cpSync(gameSource, gameTarget, { recursive: true });

const shotsTarget = join(outputDir, 'screenshots');
mkdirSync(shotsTarget, { recursive: true });
cpSync(shotsSource, shotsTarget, { recursive: true });

// The scorer's caps, as the kit's gate states them: the dossier text is
// capped at 160 KiB, at most 4 screenshots of 256 KiB each, and game/
// holds at most 993 files and directories totalling 48 MiB, with no path
// longer than 1000 bytes. buildDossier enforces them while it writes.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

writeFileSync(join(outputDir, 'dossier.json'), dossier);

// A one-line summary on stdout, so a local run shows what it handed in.
const shotCount = readdirSync(shotsTarget).length;
console.log(`Ridgeline Courier: game/ and ${shotCount} screenshot(s) written to ${outputDir}, dossier.json ${dossier.length} bytes`);
