// ─── Vidhide ⚡ nativo ────────────────────────────────────────────────────────
//
// Medido el 2026-08-05: **59 botones** (uno por episodio), resuelve 3 de 3 con
// 200 `application/vnd.apple.mpegurl`. En este sitio el host es
// `vidhidevip.com`.
//
//   embed   https://vidhidevip.com/embed/fzg0sdjkqkc7
//   sale    un m3u8 firmado (acek-cdn.com / dramiyos-cdn.com, el subdominio
//           rota en cada pedido)
//   tarda   1050–1120 ms
//
// Es el MISMO motor que Streamwish, con otro nombre y otro dominio, así que usa
// el mismo resolver — está en la carpeta de al lado. Se le da ficha propia y no
// se lo mete en la de Streamwish porque son botones distintos para el usuario y
// conviene que cada uno tenga su medición.

export { resolver } from '../streamwish';
