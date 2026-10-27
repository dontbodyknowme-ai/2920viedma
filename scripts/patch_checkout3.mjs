import fs from "fs";
const p = "src/pages/checkout.tsx";
let s = fs.readFileSync(p, "utf8");
const old = `          <div className='space-y-3'>
            {instrucciones.titular && (
              <DatoTransferencia
                etiqueta='Titular'
                valor={instrucciones.titular}
                copiado={copiado === 'titular'}
                onCopiar={() => copiarDato('titular', instrucciones.titular)}
              />
            )}
            {instrucciones.banco && (
              <DatoTransferencia
                etiqueta='Banco'
                valor={instrucciones.banco}
                copiado={copiado === 'banco'}
                onCopiar={() => copiarDato('banco', instrucciones.banco)}
              />
            )}
            {instrucciones.alias && (
              <DatoTransferencia
                etiqueta='Alias'
                valor={instrucciones.alias}
                copiado={copiado === 'alias'}
                onCopiar={() => copiarDato('alias', instrucciones.alias)}
              />
            )}
            {instrucciones.cbu && (
              <DatoTransferencia
                etiqueta='CBU/CVU'
                valor={instrucciones.cbu}
                copiado={copiado === 'cbu'}
                onCopiar={() => copiarDato('cbu', instrucciones.cbu)}
              />
            )}
            {instrucciones.referencia && (
              <DatoTransferencia
                etiqueta='Referencia / Concepto'
                valor={instrucciones.referencia}
                copiado={copiado === 'ref'}
                onCopiar={() => copiarDato('ref', instrucciones.referencia)}
              />
            )}
          </div>`;
if (!s.includes(old)) { console.log("NO"); process.exit(0); }
const neu = `          {esQr && (
            <div className='space-y-3'>
              {instrucciones.codigo && (
                <DatoTransferencia
                  etiqueta={esNave ? 'Código NAVE' : 'Código Naranja X'}
                  valor={instrucciones.codigo}
                  copiado={copiado === 'codigo'}
                  onCopiar={() => copiarDato('codigo', instrucciones.codigo)}
                />
              )}
              {instrucciones.linkCobro && (
                <a
                  href={instrucciones.linkCobro}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex w-full items-center justify-center gap-2 rounded-xl bg-gold-400 px-6 py-3 text-sm font-semibold text-charcoal-950 transition hover:bg-gold-300'
                >
                  Pagar con {esNave ? 'NAVE' : 'Naranja X'}
                </a>
              )}
              {instrucciones.qrUrl && (
                <div className='rounded-xl border border-neutral-800 bg-charcoal-950/80 p-4 text-center'>
                  <p className='mb-3 text-xs uppercase tracking-widest text-neutral-500'>Escaneá el QR con {esNave ? 'NAVE' : 'Naranja X'}</p>
                  <img src={instrucciones.qrUrl} alt={esNave ? 'QR para pagar con NAVE' : 'QR para pagar con Naranja X'} className='mx-auto max-h-64 rounded-lg' />
                </div>
              )}
            </div>
          )}

          {!esQr && (
            <div className='space-y-3'>
              {instrucciones.titular && (
                <DatoTransferencia
                  etiqueta='Titular'
                  valor={instrucciones.titular}
                  copiado={copiado === 'titular'}
                  onCopiar={() => copiarDato('titular', instrucciones.titular)}
                />
              )}
              {instrucciones.banco && (
                <DatoTransferencia
                  etiqueta='Banco'
                  valor={instrucciones.banco}
                  copiado={copiado === 'banco'}
                  onCopiar={() => copiarDato('banco', instrucciones.banco)}
                />
              )}
              {instrucciones.alias && (
                <DatoTransferencia
                  etiqueta='Alias'
                  valor={instrucciones.alias}
                  copiado={copiado === 'alias'}
                  onCopiar={() => copiarDato('alias', instrucciones.alias)}
                />
              )}
              {instrucciones.cbu && (
                <DatoTransferencia
                  etiqueta='CBU/CVU'
                  valor={instrucciones.cbu}
                  copiado={copiado === 'cbu'}
                  onCopiar={() => copiarDato('cbu', instrucciones.cbu)}
                />
              )}
              {instrucciones.referencia && (
                <DatoTransferencia
                  etiqueta='Referencia / Concepto'
                  valor={instrucciones.referencia}
                  copiado={copiado === 'ref'}
                  onCopiar={() => copiarDato('ref', instrucciones.referencia)}
                />
              )}
            </div>
          )`;
s = s.replace(old, neu);
fs.writeFileSync(p, s, "utf8");
console.log("OK");
