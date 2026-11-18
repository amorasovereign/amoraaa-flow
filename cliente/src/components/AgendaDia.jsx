import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../auth";
import * as s from "../styles";
import { DIAS, dataBR, diaSemana, dinheiro, hojeISO, somarDias, telefoneTexto } from "../utils";
import { Icone } from "./Marca";

const ICO = { color: "#49C2A0", marginRight: 4 };

const ALTURA_HORA = 72; // px por hora
const paraMin = (h) => {
  const [a, b] = String(h || "0:0").split(":").map(Number);
  return a * 60 + (b || 0);
};
const paraHora = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

// Agenda de um dia em colunas, uma por profissional: quem atende quem e em que horário.
// Clique num horário vazio para agendar; clique num atendimento para ver e agir.
export default function AgendaDia({ data, setData, onNovo, onAbrir, recarregar }) {
  const { podeAgendar } = useAuth();
  const [dia, setDia] = useState(null);
  const [erro, setErro] = useState("");

  const carregar = useCallback(() => {
    api
      .get("/agenda/dia", { params: { data } })
      .then((r) => {
        setDia(r.data);
        setErro("");
      })
      .catch(() => setErro("Não foi possível carregar o dia."));
  }, [data]);
  useEffect(carregar, [carregar, recarregar]);

  // Faixa de horas exibida: do menor horário de abertura ao maior de fechamento
  const { inicio, fim } = useMemo(() => {
    const trab = (dia?.profissionais || []).filter((p) => p.trabalha);
    const ags = (dia?.profissionais || []).flatMap((p) => p.agendamentos);
    const ini = Math.min(...trab.map((p) => paraMin(p.abre)), ...ags.map((a) => paraMin(a.inicio)), dia?.negocio ? paraMin(dia.negocio.abre) : 8 * 60);
    const f = Math.max(...trab.map((p) => paraMin(p.fecha)), ...ags.map((a) => paraMin(a.fim)), dia?.negocio ? paraMin(dia.negocio.fecha) : 18 * 60);
    return { inicio: Math.floor(ini / 60) * 60, fim: Math.ceil(f / 60) * 60 };
  }, [dia]);

  const y = (min) => ((min - inicio) / 60) * ALTURA_HORA;
  const horas = [];
  for (let m = inicio; m <= fim; m += 60) horas.push(m);

  const ativos = (dia?.profissionais || []).flatMap((p) => p.agendamentos).filter((a) => a.status !== "cancelado" && a.status !== "faltou");
  const previsto = ativos.reduce((t, a) => t + Number(a.total), 0);
  const agora = data === hojeISO() ? (() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  })() : null;

  const cliqueColuna = (p, e) => {
    if (!podeAgendar || !p.trabalha) return;
    const r = e.currentTarget.getBoundingClientRect();
    const min = inicio + Math.floor(((e.clientY - r.top) / ALTURA_HORA) * 60 / 15) * 15;
    onNovo({ dataInicial: data, horaInicial: paraHora(min), profissionalInicial: p.id });
  };

  return (
    <div style={s.card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6E7482", textTransform: "uppercase" }}>{DIAS[diaSemana(data)]}</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{dataBR(data)}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={s.chip("#0F2B24", "#7CE0C4")}>{ativos.length} atendimento(s)</span>
          <span style={s.chip("#0F2A1A", "#6FD69A")}>Previsto {dinheiro(previsto)}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={s.btnSecondary} onClick={() => setData(somarDias(data, -1))}>‹</button>
          <button style={s.btnSecondary} onClick={() => setData(hojeISO())}>Hoje</button>
          <input type="date" value={data} onChange={(e) => e.target.value && setData(e.target.value)} style={{ ...s.input, width: 150 }} />
          <button style={s.btnSecondary} onClick={() => setData(somarDias(data, 1))}>›</button>
        </div>
      </div>

      {erro && <div style={s.errorBox}>{erro}</div>}
      {dia && !dia.negocio && <div style={{ ...s.successBox, background: "#0D1014", color: "#9AA0AA", borderColor: "#262B33" }}>O negócio não abre neste dia.</div>}
      {(dia?.bloqueios || []).filter((b) => !b.profissionalId).map((b) => (
        <div key={b.id} style={{ ...s.errorBox, background: "#2A1A0D", color: "#F5A66B", borderColor: "#5A3A18" }}>
          <Icone nome="bloqueio" tamanho={14} /> {b.motivo || "Bloqueio"} {b.inicio ? `(${b.inicio}–${b.fim})` : "(dia inteiro)"}
        </div>
      ))}

      {dia && dia.profissionais.length === 0 && <p style={{ color: "#6E7482" }}>Nenhum profissional ativo.</p>}

      {dia && dia.profissionais.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: `56px repeat(${dia.profissionais.length}, minmax(170px, 1fr))`, minWidth: 56 + dia.profissionais.length * 170 }}>
            {/* Cabeçalho */}
            <div />
            {dia.profissionais.map((p) => (
              <div key={p.id} style={{ padding: "6px 8px 10px", borderBottom: `3px solid ${p.cor}`, textAlign: "center" }}>
                <strong style={{ fontSize: 13.5 }}>{p.nome}</strong>
                <div style={{ fontSize: 11.5, color: "#6E7482" }}>
                  {p.trabalha ? `${p.abre}–${p.fecha} · ${p.agendamentos.filter((a) => a.status !== "cancelado").length} atend.` : "Não trabalha hoje"}
                </div>
              </div>
            ))}

            {/* Régua de horas */}
            <div style={{ position: "relative", height: y(fim) }}>
              {horas.map((m) => (
                <div key={m} style={{ position: "absolute", top: y(m) - 7, right: 8, fontSize: 11, color: "#6E7482" }}>{paraHora(m)}</div>
              ))}
            </div>

            {/* Colunas */}
            {dia.profissionais.map((p) => (
              <div
                key={p.id}
                onClick={(e) => e.target === e.currentTarget && cliqueColuna(p, e)}
                style={{ position: "relative", height: y(fim), borderLeft: "1px solid #1C2027", background: p.trabalha ? "#13171D" : "repeating-linear-gradient(45deg,#0D1014,#0D1014 8px,#1C2027 8px,#1C2027 16px)", cursor: p.trabalha && podeAgendar ? "copy" : "default" }}
                title={p.trabalha && podeAgendar ? "Clique num horário vazio para agendar" : ""}
              >
                {horas.map((m) => (
                  <div key={m} style={{ position: "absolute", top: y(m), left: 0, right: 0, borderTop: "1px solid #1C2027", pointerEvents: "none" }} />
                ))}
                {/* Fora do expediente */}
                {p.trabalha && (
                  <>
                    <div style={{ position: "absolute", top: 0, height: y(paraMin(p.abre)), left: 0, right: 0, background: "#1C2027", pointerEvents: "none" }} />
                    <div style={{ position: "absolute", top: y(paraMin(p.fecha)), bottom: 0, left: 0, right: 0, background: "#1C2027", pointerEvents: "none" }} />
                  </>
                )}
                {/* Pausas e bloqueios */}
                {p.indisponivel.map((x, i) => (
                  <div key={i} style={{ position: "absolute", top: y(paraMin(x.inicio)), height: y(paraMin(x.fim)) - y(paraMin(x.inicio)), left: 0, right: 0, background: "repeating-linear-gradient(45deg,#0F2B24,#0F2B24 6px,#1F4A63 6px,#1F4A63 12px)", opacity: 0.55, pointerEvents: "none", fontSize: 10.5, color: "#7CE0C4", padding: "2px 6px" }}>
                    Pausa / bloqueio
                  </div>
                ))}
                {/* Atendimentos */}
                {p.agendamentos.map((a) => {
                  const st = s.STATUS[a.status] || s.STATUS.agendado;
                  const apagado = a.status === "cancelado" || a.status === "faltou";
                  const altura = Math.max(y(paraMin(a.fim)) - y(paraMin(a.inicio)) - 2, 22);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onAbrir(a)}
                      style={{
                        position: "absolute",
                        top: y(paraMin(a.inicio)) + 1,
                        height: altura,
                        left: 4,
                        right: 4,
                        borderRadius: 8,
                        border: "none",
                        borderLeft: `4px solid ${apagado ? "#4A4A4A" : p.cor}`,
                        background: apagado ? "#0D1014" : `${p.cor}18`,
                        textAlign: "left",
                        padding: "3px 7px",
                        overflow: "hidden",
                        cursor: "pointer",
                        opacity: apagado ? 0.6 : 1,
                        textDecoration: a.status === "cancelado" ? "line-through" : "none",
                      }}
                      title={`${a.inicio}–${a.fim} · ${a.clienteNome} · ${a.servicos.map((x) => x.nome).join(" + ")} · ${st.label}`}
                    >
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#E7E9EC", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {a.inicio} {a.clienteNome}
                      </div>
                      {altura > 34 && <div style={{ fontSize: 11, color: "#9AA0AA", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.servicos.map((x) => x.nome).join(" + ")}</div>}
                      {altura > 50 && (
                        <div style={{ fontSize: 10.5, color: st.cor, fontWeight: 700 }}>
                          {st.label}
                          {a.origem === "whatsapp" ? " · WhatsApp" : ""}
                        </div>
                      )}
                    </button>
                  );
                })}
                {agora !== null && agora >= inicio && agora <= fim && (
                  <div style={{ position: "absolute", top: y(agora), left: 0, right: 0, borderTop: "2px solid #F28B8B", pointerEvents: "none" }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Janela com os detalhes de um atendimento (clicado na agenda do dia)
export function DetalheAgendamento({ ag, onClose, children }) {
  const st = s.STATUS[ag.status] || s.STATUS.agendado;
  return (
    <div style={s.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...s.modal, maxWidth: 480 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{ag.clienteNome}</h2>
            <div style={{ fontSize: 13, color: "#9AA0AA", marginTop: 2 }}>{telefoneTexto(ag.telefone) || "sem telefone"}</div>
          </div>
          <span style={s.chip(st.bg, st.cor)}>{st.label}</span>
        </div>
        <div style={{ marginTop: 14, fontSize: 14, color: "#D4D4D4", display: "flex", flexDirection: "column", gap: 6 }}>
          <div><Icone nome="agenda" tamanho={15} style={ICO} /> {DIAS[diaSemana(ag.data)]}, {dataBR(ag.data)} · {ag.inicio}–{ag.fim}</div>
          <div><Icone nome="pessoa" tamanho={15} style={ICO} /> {ag.profissionalNome}{ag.profissionalEscolhidoPeloCliente ? " (escolhido pelo cliente)" : ""}</div>
          <div><Icone nome="tesoura" tamanho={15} style={ICO} /> {ag.servicos.map((x) => x.nome).join(" + ")}</div>
          <div><Icone nome="dinheiro" tamanho={15} style={ICO} /> {dinheiro(ag.total)}{Number(ag.descontoValor) > 0 ? ` (desconto ${dinheiro(ag.descontoValor)})` : ""}</div>
          <div><Icone nome="celular" tamanho={15} style={ICO} /> {ag.origem === "whatsapp" ? "Marcado pelo WhatsApp" : "Marcado no sistema"}</div>
          {ag.observacoes && <div><Icone nome="nota" tamanho={15} style={ICO} /> {ag.observacoes}</div>}
          {ag.motivoCancelamento && <div style={{ color: "#F28B8B" }}>Motivo do cancelamento: {ag.motivoCancelamento}</div>}
        </div>
        <div style={{ marginTop: 16 }}>{children}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button style={s.btnSecondary} onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}
