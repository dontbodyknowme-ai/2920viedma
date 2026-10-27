import fs from "fs";
const p = "src/pages/checkout.tsx";
let s = fs.readFileSync(p, "utf8");
const old = `const InstruccionesTransferenciaPage = ({ instrucciones, orderId, alFinalizar }: InstruccionesProps) => {
  const [copiado, setCopiado] = useState<string | null>(null)

  const copiarDato = async (clave: string, texto: string) => {
    await copiar(texto)
    setCopiado(clave)
    setTimeout(() => setCopiado(null), 1500)
  }

  return (`;
const neu = `const InstruccionesTransferenciaPage = ({ instrucciones, orderId, alFinalizar }: InstruccionesProps) => {
  const [copiado, setCopiado] = useState<string | null>(null)

  const copiarDato = async (clave: string, texto?: string) => {
    if (!texto) return
    await copiar(texto)
    setCopiado(clave)
    setTimeout(() => setCopiado(null), 1500)
  }

  const esNave = !!(instrucciones.codigo || instrucciones.qrUrl || instrucciones.linkCobro) && !instrucciones.alias && !instrucciones.cbu
  const esNaranjaX = !!(instrucciones.codigo || instrucciones.qrUrl || instrucciones.linkCobro) && !esNave
  const esQr = esNave || esNaranjaX

  return (`;
if (!s.includes(old)) { console.log("NO"); process.exit(0); }
s = s.replace(old, neu);
fs.writeFileSync(p, s, "utf8");
console.log("OK");
