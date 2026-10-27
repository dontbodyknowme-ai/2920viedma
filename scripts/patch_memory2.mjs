import fs from "fs";
const p = "MEMORY.md";
let s = fs.readFileSync(p, "utf8");
const old = "- `Settings -> Source -> Root Directory` tiene que ser `backend`. **El schema de `railway.json` no permite declarar el contexto de build** (solo `dockerfilePath`), asi que esto vive solo en el panel y se resetea al renombrar el servicio o recargar el repo.";
if (!s.includes(old)) { console.log("NO"); process.exit(0); }
s = s.replace(old, "");
fs.writeFileSync(p, s, "utf8");
console.log("OK");
