import * as s from "../styles";
import { DIAS } from "../utils";

// Editor de horários: para cada dia, aberto/fechado, abertura, fechamento e
// quantas pausas quiser (almoço, café...). Formato:
// { "0": null, "1": { abre, fecha, pausas: [{ inicio, fim }] }, ... }
export default function HorariosEditor({ valor, onChange, rotuloAberto = "Abre" }) {
  const h = valor || {};
  const ler = (i) => {
    const d = h[String(i)];
    if (!d) return null;
    if (Array.isArray(d)) return d[0] ? { abre: d[0], fecha: d[1], pausas: [] } : null;
    return { abre: d.abre || "09:00", fecha: d.fecha || "18:00", pausas: d.pausas || [] };
  };
  const mudar = (i, novo) => onChange({ ...h, [String(i)]: novo });
  const copiarParaTodos = (i) => {
    const base = ler(i);
    const novo = { ...h };
    for (let d = 0; d < 7; d++) if (d !== i && ler(d)) novo[String(d)] = JSON.parse(JSON.stringify(base));
    onChange(novo);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {DIAS.map((nome, i) => {
        const d = ler(i);
        return (
          <div key={i} style={{ border: "1px solid #262626", borderRadius: 12, padding: "10px 12px", background: d ? "#141414" : "#0F0F0F" }}>
            <div style={{ display: "grid", gridTemplateColumns: "92px 88px 1fr 1fr auto", gap: 8, alignItems: "center" }}>
              <strong style={{ fontSize: 14 }}>{nome}</strong>
              <label style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={!!d}
                  onChange={(e) => mudar(i, e.target.checked ? { abre: "09:00", fecha: "18:00", pausas: [] } : null)}
                  style={{ accentColor: s.OURO }}
                />
                {rotuloAberto}
              </label>
              {d ? (
                <>
                  <input type="time" style={s.input} value={d.abre} onChange={(e) => mudar(i, { ...d, abre: e.target.value })} />
                  <input type="time" style={s.input} value={d.fecha} onChange={(e) => mudar(i, { ...d, fecha: e.target.value })} />
                  <button type="button" style={{ ...s.linkBtn, fontSize: 12 }} title="Aplicar este horário aos outros dias abertos" onClick={() => copiarParaTodos(i)}>
                    Copiar p/ todos
                  </button>
                </>
              ) : (
                <span style={{ gridColumn: "3 / 6", fontSize: 13, color: "#8A8A8A" }}>Fechado</span>
              )}
            </div>
            {d && (
              <div style={{ marginTop: 8, paddingLeft: 100, display: "flex", flexDirection: "column", gap: 6 }}>
                {d.pausas.map((p, k) => (
                  <div key={k} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12.5, color: "#A3A3A3", width: 50 }}>Pausa</span>
                    <input type="time" style={{ ...s.input, width: 130 }} value={p.inicio} onChange={(e) => mudar(i, { ...d, pausas: d.pausas.map((x, j) => (j === k ? { ...x, inicio: e.target.value } : x)) })} />
                    <span style={{ fontSize: 12.5, color: "#A3A3A3" }}>até</span>
                    <input type="time" style={{ ...s.input, width: 130 }} value={p.fim} onChange={(e) => mudar(i, { ...d, pausas: d.pausas.map((x, j) => (j === k ? { ...x, fim: e.target.value } : x)) })} />
                    <button type="button" style={{ ...s.linkBtn, color: "#F28B8B", fontSize: 12 }} onClick={() => mudar(i, { ...d, pausas: d.pausas.filter((_, j) => j !== k) })}>Remover</button>
                  </div>
                ))}
                <button type="button" style={{ ...s.linkBtn, fontSize: 12, alignSelf: "flex-start" }} onClick={() => mudar(i, { ...d, pausas: [...d.pausas, { inicio: "12:00", fim: "13:00" }] })}>
                  + Pausa (almoço, intervalo...)
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Valida antes de salvar: devolve mensagem de erro ou null
export function validarHorarios(h) {
  for (let i = 0; i < 7; i++) {
    const d = (h || {})[String(i)];
    if (!d) continue;
    if (!d.abre || !d.fecha || d.fecha <= d.abre) return `${DIAS[i]}: o fechamento precisa ser depois da abertura.`;
    for (const p of d.pausas || []) {
      if (!p.inicio || !p.fim || p.fim <= p.inicio) return `${DIAS[i]}: pausa com horário inválido.`;
      if (p.inicio < d.abre || p.fim > d.fecha) return `${DIAS[i]}: a pausa ${p.inicio}–${p.fim} está fora do horário.`;
    }
  }
  return null;
}
