import fs from "fs";
const p = "src/pages/checkout.tsx";
let s = fs.readFileSync(p, "utf8");
const old = `          <p className='text-neutral-400'>
            Realizá la transferencia con los datos que te dejamos abajo
          </p>`;
const neu = `          <p className='text-neutral-400'>
            {esQr ? (esNave ? 'Pagá con NAVE desde la app de Banco Galicia' : 'Pagá con Naranja X') : 'Realizá la transferencia con los datos que te dejamos abajo'}
          </p>`;
if (!s.includes(old)) { console.log("NO"); process.exit(0); }
s = s.replace(old, neu);
fs.writeFileSync(p, s, "utf8");
console.log("OK");
