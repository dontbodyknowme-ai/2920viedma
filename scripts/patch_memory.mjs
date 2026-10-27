import fs from "fs";
const p = "MEMORY.md";
let s = fs.readFileSync(p, "utf8");
s = s.replace(/Railway \+ Postgres \+ Cloudflare R2/g, "Postgres + Cloudflare R2");
s = s.replace(/Settings -> Source -> Root Directory' tiene que ser 'backend'\. \*\*El schema de `railway\.json` no permite declarar el contexto de build\*\* \(solo `dockerfilePath`\), asi que esto vive solo en el panel y se resetea al renombrar el servicio o recargar el repo\./g, "");
s = s.replace(/Falta correr el seed \(`railway ssh -s Vinoteca-1` y `npm run seed`\)\./g, "Falta correr el seed (`npm run seed`).");
fs.writeFileSync(p, s, "utf8");
console.log("OK");
