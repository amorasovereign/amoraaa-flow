import { useEffect, useState } from "react";
import { api } from "../services/api";
import * as s from "../styles";
import { DIAS_CURTOS, MESES, dataBR, diaSemana, dinheiro, duracaoTexto, fimDoMes, hojeISO } from "../utils";

// Estimativa de entrada: hoje, semana, mês e período escolhido, dia a dia.
export default function Financeiro() {
  const hoje = hojeISO();
  const [mes, setMes] = useState(hoje.slice(0, 7));
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    setDados(null);
    api
      .get("/relatorios/resumo", { params: { de: `${mes}-01`, ate: fimDoMes(mes) } })
      .then((r) => {
        setDados(r.data);
        setErro("");
      })
      .catch(() => setErro("Não foi possível carregar o financeiro."));
  }, [mes]);

  const [ano, mesNum] = mes.split("-").map(Number);
  const mudarMes = (delta) => {
    const d = new Date(ano, mesNum - 1 + delta, 1);
    setMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const maxDia = Math.max(1, ...(dados?.porDia || []).map((d) => d.previsto));

  const CardResumo = ({ titulo, p, destaque }) => (
    <div style={{ ...s.card, borderTop: `4px solid ${destaque || s.OURO}` }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#8A8A8A", textTransform: "uppercase" }}>{titulo}</div>
      <div style={{ fontSize: 26, fontWeight: 800, margin: "6px 0 2px" }}>{dinheiro(p?.previsto)}</div>
      <div style={{ fontSize: 12.5, color: "#A3A3A3" }}>previsto · {p?.quantidade || 0} atendimento(s) · {duracaoTexto(p?.minutos || 0)}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        <span style={s.chip("#0F2A1A", "#6FD69A")}>Recebido {dinheiro(p?.realizado)}</span>
        {Number(p?.cancelado) > 0 && <span style={s.chip("#1F1F1F", "#A3A3A3")}>Cancelado {dinheiro(p?.cancelado)}</span>}
        {Number(p?.descontos) > 0 && <span style={s.chip("#2A2110", "#F0C46A")}>Descontos {dinheiro(p?.descontos)}</span>}
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.headerRow}>
        <div>
          <h1 style={s.title}>Financeiro</h1>
          <p style={s.subtitle}>Quanto deve entrar com os agendamentos (previsto) e quanto já foi concluído (recebido).</p>
        </div>
      </div>

      {erro && <div style={s.errorBox}>{erro}</div>}

      <div className="grade-responsiva" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>
        <CardResumo titulo={`Hoje · ${dataBR(hoje)}`} p={dados?.hoje} destaque="#7CC4F0" />
        <CardResumo titulo={`Semana · ${dados ? `${dataBR(dados.semana.de).slice(0, 5)} a ${dataBR(dados.semana.ate).slice(0, 5)}` : ""}`} p={dados?.semana} destaque="#B79CF5" />
        <CardResumo titulo={`Mês atual · ${MESES[Number(hoje.slice(5, 7)) - 1]}`} p={dados?.mes} />
      </div>

      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <div>
            <strong style={{ fontSize: 16 }}>Dia a dia · {MESES[mesNum - 1]} {ano}</strong>
            {dados && (
              <div style={{ fontSize: 13, color: "#A3A3A3", marginTop: 2 }}>
                Previsto {dinheiro(dados.totais.previsto)} · recebido {dinheiro(dados.totais.realizado)} · {dados.totais.quantidade} atendimento(s) · ticket médio {dinheiro(dados.ticketMedio)}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={s.btnSecondary} onClick={() => mudarMes(-1)}>‹</button>
            <button style={s.btnSecondary} onClick={() => setMes(hoje.slice(0, 7))}>Mês atual</button>
            <button style={s.btnSecondary} onClick={() => mudarMes(1)}>›</button>
          </div>
        </div>

        {!dados ? (
          <p style={{ color: "#8A8A8A" }}>Carregando...</p>
        ) : dados.porDia.length === 0 ? (
          <p style={{ color: "#8A8A8A" }}>Nenhum agendamento neste mês.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Dia</th>
                  <th style={s.th}>Atend.</th>
                  <th style={{ ...s.th, width: "40%" }}>Previsto</th>
                  <th style={{ ...s.th, textAlign: "right" }}>Recebido</th>
                  <th style={{ ...s.th, textAlign: "right" }}>Cancelado</th>
                  <th style={{ ...s.th, textAlign: "right" }}>Descontos</th>
                </tr>
              </thead>
              <tbody>
                {dados.porDia.map((d) => (
                  <tr key={d.data} style={{ background: d.data === hoje ? "#1A160D" : undefined }}>
                    <td style={s.td}>
                      <strong>{dataBR(d.data)}</strong> <span style={{ color: "#8A8A8A", fontSize: 12 }}>{DIAS_CURTOS[diaSemana(d.data)]}</span>
                    </td>
                    <td style={s.td}>{d.quantidade}</td>
                    <td style={s.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 10, background: "#1F1F1F", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ width: `${(d.previsto / maxDia) * 100}%`, height: "100%", background: "linear-gradient(90deg, #FFD98A, #E0A23A)" }} />
                        </div>
                        <strong style={{ minWidth: 92, textAlign: "right" }}>{dinheiro(d.previsto)}</strong>
                      </div>
                    </td>
                    <td style={{ ...s.td, textAlign: "right", color: "#6FD69A" }}>{dinheiro(d.realizado)}</td>
                    <td style={{ ...s.td, textAlign: "right", color: "#A3A3A3" }}>{dinheiro(d.cancelado)}</td>
                    <td style={{ ...s.td, textAlign: "right", color: "#F0C46A" }}>{dinheiro(d.descontos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dados?.porProfissional?.length > 0 && (
        <div style={{ ...s.card, marginBottom: 16 }}>
          <strong style={{ fontSize: 16 }}>Por profissional · {MESES[mesNum - 1]} {ano}</strong>
          <div style={{ overflowX: "auto", marginTop: 10 }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Profissional</th>
                  <th style={s.th}>Atend.</th>
                  <th style={s.th}>Horas</th>
                  <th style={{ ...s.th, textAlign: "right" }}>Previsto</th>
                  <th style={{ ...s.th, textAlign: "right" }}>Recebido</th>
                  <th style={{ ...s.th, textAlign: "right" }}>Ticket médio</th>
                </tr>
              </thead>
              <tbody>
                {dados.porProfissional.map((p) => (
                  <tr key={p.nome}>
                    <td style={s.td}><strong>{p.nome}</strong></td>
                    <td style={s.td}>{p.quantidade}</td>
                    <td style={s.td}>{duracaoTexto(p.minutos)}</td>
                    <td style={{ ...s.td, textAlign: "right" }}>{dinheiro(p.previsto)}</td>
                    <td style={{ ...s.td, textAlign: "right", color: "#6FD69A" }}>{dinheiro(p.realizado)}</td>
                    <td style={{ ...s.td, textAlign: "right" }}>{dinheiro(p.quantidade ? p.previsto / p.quantidade : 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dados?.servicosMaisVendidos?.length > 0 && (
        <div style={s.card}>
          <strong style={{ fontSize: 16 }}>Serviços mais agendados no mês</strong>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {dados.servicosMaisVendidos.map((x) => (
              <div key={x.nome} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, borderBottom: "1px solid #1F1F1F", paddingBottom: 6 }}>
                <span>{x.nome}</span>
                <span style={{ color: "#A3A3A3" }}>
                  {x.quantidade}× · <strong style={{ color: "#F2F2F2" }}>{dinheiro(x.valor)}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
