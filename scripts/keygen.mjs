// ─── Prism+ Keygen ────────────────────────────────────────────────────────────
// Genera el par de llaves Ed25519 para firmar extensiones.
//   - .keys/private.pem  → SECRETA. Queda local, gitignored. NUNCA subir al repo.
//   - keys/public.pem    → pública, se commitea (no es secreta).
//   - keys/public.hex    → llave pública cruda (32 bytes hex) para embeber en
//                          prism_hub y verificar firmas.
//
// Uso: npm run keygen   (solo una vez; si ya existe, aborta para no pisarla)
// ---------------------------------------------------------------------------

import { generateKeyPairSync } from 'crypto';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PRIV_DIR = join(ROOT, '.keys');
const PUB_DIR = join(ROOT, 'keys');
const PRIV_PATH = join(PRIV_DIR, 'private.pem');

if (existsSync(PRIV_PATH)) {
  console.error('\n⛔  Ya existe .keys/private.pem');
  console.error('    No se sobrescribe para no perder tu llave. Si querés regenerar,');
  console.error('    borrá .keys/private.pem a mano (y re-firmá todo + actualizá prism_hub).\n');
  process.exit(1);
}

console.log('\n🔐  Generando par de llaves Ed25519...');

const { publicKey, privateKey } = generateKeyPairSync('ed25519');

mkdirSync(PRIV_DIR, { recursive: true });
mkdirSync(PUB_DIR, { recursive: true });

const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const pubPem = publicKey.export({ type: 'spki', format: 'pem' });

// La llave pública Ed25519 en formato SPKI DER termina con los 32 bytes crudos.
const pubDer = publicKey.export({ type: 'spki', format: 'der' });
const pubRaw = pubDer.subarray(pubDer.length - 32);
const pubHex = pubRaw.toString('hex');

writeFileSync(PRIV_PATH, privPem);
writeFileSync(join(PUB_DIR, 'public.pem'), pubPem);
writeFileSync(join(PUB_DIR, 'public.hex'), pubHex + '\n');

console.log('✅  Llaves generadas:');
console.log(`    🔒  .keys/private.pem   (SECRETA — guardala y NO la subas)`);
console.log(`    🔓  keys/public.pem     (pública — se commitea)`);
console.log(`    🔓  keys/public.hex     (para embeber en prism_hub)\n`);
console.log('📋  Llave pública (hex) para pegar en prism_hub:');
console.log(`\n    ${pubHex}\n`);
console.log('⚠️   IMPORTANTE: respaldá .keys/private.pem en un lugar seguro.');
console.log('    Si la perdés, no podés firmar nuevas extensiones ni updates.\n');
