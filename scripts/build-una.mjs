// Compila y prueba UNA sola extensión, sin tocar las demás.
//
//   npm run build:una -- lamovie
//
// Es lo de `npm run build`, pero solo para esa: su `dist/`, su entrada de
// `index.json` (las otras quedan iguales, con sus marcas del health-check) y
// la prueba en vivo solo de ella.
import { spawnSync } from 'child_process';

const nombre = process.argv[2];
if (!nombre) {
  console.error('Uso: npm run build:una -- <nombre>   (por ejemplo: lamovie)');
  process.exit(1);
}
const correr = (args) =>
  spawnSync(process.execPath, args, { stdio: 'inherit' }).status ?? 1;

if (correr(['scripts/build.mjs', `--solo=${nombre}`]) !== 0) process.exit(1);
process.exit(correr(['scripts/live-test.mjs', `--only=${nombre}`]));
