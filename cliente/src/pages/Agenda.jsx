import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import * as s from "../styles";
import AgendamentoModal from "../components/AgendamentoModal";
import AcoesAgendamento from "../components/AcoesAgendamento";
import AgendaDia, { DetalheAgendamento } from "../components/AgendaDia";
import { useAuth } from "../auth";
import { DIAS, DIAS_CURTOS, MESES, dataBR, diaSemana, dinheiro, duracaoTexto, fimDoMes, hojeISO, telefoneTexto } from "../utils";

// Duas visões: o DIA por profissional (colunas com horários) e o MÊS
// (calendário com quantidade e valor previsto por dia).
export default function Agenda() {
  const hoje = hojeISO();
  const { podeAgendar } = useAuth();
  const [visao, setVisao] = useState(() => {
    try {
      return localStorage.getItem("agenda.visao") || "dia";
    } catch {
      return "dia";
    }
  });
  const [dataDia, setDataDia] = useState(hoje);
  const [detalhe, setDetalhe] = useState(null);
  const [versao, setVersao] = useState(0);
  const [profissionais, setProfissionais] = useState([]);
  const [filtroProf, setFiltroProf] = useState("");
  useEffect(() => {
    try {
      localStorage.setItem("agenda.visao", visao);
    } catch {
      /* sem localStorage */
    }
  }, [visao]);
  useEffect(() => {
    api.get("/profissionais", { params: { ativos: "true" } }).then((r) => setProfissionais(r.data || [])).catch(() => {});
  }, []);
  const [mes, setMes] = useState(hoje.slice(0, 7)); // "AAAA-MM"
  const [diaSel, setDiaSel] = useState(hoje);
  const [agendamentos, setAgendamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [modal, setModal] = useState(null); // { agendamento?, dataInicial? }

  const [ano, mesNum] = mes.split("-").map(Number);
  const primeiroDia = `${mes}-01`;
  const ultimoDia = fimDoMes(mes);

  const carregar = useCallback(() => {
    setCarregando(true);
    api
      .get("/agendamentos", { params: { de: primeiroDia, ate: ultimoDia, profissionalId: filtroProf || undefined } })
      .then((r) => {
        setAgendamentos(r.data || []);
        setErro("");
      })
      .catch(() => setErro("Não foi possível carregar a agenda."))
      .finally(() => setCarregando(false));
  }, [primeiroDia, ultimoDia, filtroProf]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (!sucesso) return;
    const t = setTimeout(() => setSucesso(""), 4000);
    return () => clearTimeout(t);
  }, [sucesso]);

  const porDia = useMemo(() => {
    const m = {};
    agendamentos.forEach((a) => {
      m[a.data] = m[a.data] || { lista: [], previsto: 0, ativos: 0 };
      m[a.data].lista.push(a);
      if (a.status !== "cancelado" && a.status !== "faltou") {
        m[a.data].previsto += Number(a.total);
        m[a.data].ativos += 1;
      }
    });
    return m;
  }, [agendamentos]);

  const totalMes = useMemo(
    () =>
      agendamentos
        .filter((a) => a.status !== "cancelado" && a.status !== "faltou")
        .reduce((t, a) => ({ qtd: t.qtd + 1, valor: t.valor + Number(a.total) }), { qtd: 0, valor: 0 }),
    [agendamentos]
  );

  // Células do calendário (semana começando no domingo)
  const celulas = useMemo(() => {
    const inicio = diaSemana(primeiroDia);
    const dias = new Date(ano, mesNum, 0).getDate();
    const lista = Array.from({ length: inicio }, () => null);
    for (let d = 1; d <= dias; d++) lista.push(`${mes}-${String(d).padStart(2, "0")}`);
    while (lista.length % 7) lista.push(null);
    return lista;
  }, [mes, ano, mesNum, primeiroDia]);

  const mudarMes = (delta) => {
    const d = new Date(ano, mesNum - 1 + delta, 1);
    const novo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    setMes(novo);
    setDiaSel(novo === hoje.slice(0, 7) ? hoje : `${novo}-01`);
  };

  const doDia = (porDia[diaSel]?.lista || []).slice().sort((a, b) => a.inicio.localeCompare(b.inicio));
  const ativosDia = doDia.filter((a) => a.status !== "cancelado" && a.status !== "faltou");
  const previstoDia = ativosDia.reduce((t, a) => t + Number(a.total), 0);
  const minutosDia = ativosDia.reduce((t, a) => t + a.duracaoTotal, 0);

  const aposAlterar = (msg) => {
    setSucesso(msg);
    setDetalhe(null);
    setVersao((v) => v + 1);
    carregar();
  };

  return (
    <div style={s.page}>
      <div style={s.headerRow}>
        <div>
          <h1 style={s.title}>Agenda</h1>
          <p style={s.subtitle}>
            {visao === "dia"
              ? "Agenda do dia por profissional. Clique num horário vazio para agendar ou num atendimento para ver detalhes."
              : `${MESES[mesNum - 1]} de ${ano}: ${totalMes.qtd} atendimento(s) · previsto ${dinheiro(totalMes.valor)}`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", background: "#13171D", border: "1.5px solid #262B33", borderRadius: 10, overflow: "hidden" }}>
            {[["dia", "Dia por profissional"], ["mes", "Mês"]].map(([v, l]) => (
              <button key={v} type="button" onClick={() => setVisao(v)} style={{ border: "none", padding: "9px 14px", fontWeight: 700, fontSize: 13.5, cursor: "pointer", background: visao === v ? s.OURO_CLARO : "#13171D", color: visao === v ? s.OURO_ESCURO : "#9AA0AA" }}>
                {l}
              </button>
            ))}
          </div>
          {podeAgendar && <button style={s.btnPrimary} onClick={() => setModal({ dataInicial: visao === "dia" ? dataDia : diaSel })}>+ Novo agendamento</button>}
        </div>
      </div>

      {sucesso && <div style={s.successBox}>{sucesso}</div>}
      {erro && <div style={s.errorBox}>{erro}</div>}

      {visao === "dia" && (
        <AgendaDia data={dataDia} setData={setDataDia} recarregar={versao} onNovo={(m) => setModal(m)} onAbrir={(a) => setDetalhe(a)} />
      )}

      {visao === "mes" && (
      <>
      {profissionais.length > 1 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          <button type="button" onClick={() => setFiltroProf("")} style={{ ...s.chip(filtroProf ? "#13171D" : s.OURO_CLARO, filtroProf ? "#9AA0AA" : s.OURO_ESCURO), border: "1px solid #262B33", cursor: "pointer" }}>Todos</button>
          {profissionais.map((p) => (
            <button key={p.id} type="button" onClick={() => setFiltroProf(String(p.id))} style={{ ...s.chip(filtroProf === String(p.id) ? `${p.cor}22` : "#13171D", filtroProf === String(p.id) ? p.cor : "#9AA0AA"), border: `1px solid ${filtroProf === String(p.id) ? p.cor : "#262B33"}`, cursor: "pointer" }}>
              ● {p.nome}
            </button>
          ))}
        </div>
      )}
      <div className="grade-responsiva" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.55fr) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
        {/* Calendário */}
        <div style={s.card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <button style={s.btnSecondary} onClick={() => mudarMes(-1)}>‹</button>
            <strong style={{ fontSize: 16 }}>{MESES[mesNum - 1]} {ano}</strong>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                style={s.btnSecondary}
                onClick={() => {
                  setMes(hoje.slice(0, 7));
                  setDiaSel(hoje);
                }}
              >
                Hoje
              </button>
              <button style={s.btnSecondary} onClick={() => mudarMes(1)}>›</button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {DIAS_CURTOS.map((d) => (
              <div key={d} style={{ fontSize: 11.5, fontWeight: 700, color: "#6E7482", textAlign: "center", paddingBottom: 4 }}>{d}</div>
            ))}
            {celulas.map((iso, i) => {
              if (!iso) return <div key={`v${i}`} />;
              const info = porDia[iso];
              const sel = iso === diaSel;
              const ehHoje = iso === hoje;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setDiaSel(iso)}
                  style={{
                    minHeight: 78,
                    borderRadius: 12,
                    padding: 8,
                    textAlign: "left",
                    cursor: "pointer",
                    border: `1.5px solid ${sel ? s.OURO : ehHoje ? "#1F4A63" : "#262B33"}`,
                    background: sel ? "#0F2B24" : "#13171D",
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 800, color: ehHoje ? s.OURO_ESCURO : "#D4D4D4" }}>{Number(iso.slice(8))}</span>
                  {info?.ativos > 0 && (
                    <>
                      <span style={{ fontSize: 11, color: "#9AA0AA" }}>{info.ativos} atend.</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#6FD69A" }}>{dinheiro(info.previsto)}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
          {carregando && <p style={{ fontSize: 12, color: "#6E7482", margin: "10px 0 0" }}>Carregando...</p>}
        </div>

        {/* Dia selecionado */}
        <div style={s.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#6E7482", textTransform: "uppercase" }}>{DIAS[diaSemana(diaSel)]}</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{dataBR(diaSel)}</div>
            </div>
            {podeAgendar && <button style={s.btnSecondary} onClick={() => setModal({ dataInicial: diaSel })}>+ Agendar</button>}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0 14px" }}>
            <span style={s.chip("#0F2B24", "#7CE0C4")}>{ativosDia.length} atendimento(s)</span>
            <span style={s.chip("#0F2533", "#7CC4F0")}>{duracaoTexto(minutosDia)} ocupadas</span>
            <span style={s.chip("#0F2A1A", "#6FD69A")}>Previsto {dinheiro(previstoDia)}</span>
          </div>

          {doDia.length === 0 ? (
            <p style={{ color: "#6E7482", fontSize: 14 }}>Nenhum agendamento neste dia.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {doDia.map((a) => {
                const st = s.STATUS[a.status] || s.STATUS.agendado;
                const apagado = a.status === "cancelado" || a.status === "faltou";
                return (
                  <div key={a.id} style={{ border: "1px solid #262B33", borderLeft: `4px solid ${apagado ? "#4A4A4A" : s.OURO}`, borderRadius: 12, padding: "10px 12px", opacity: apagado ? 0.6 : 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <strong style={{ fontSize: 14 }}>{a.inicio}–{a.fim} · {a.clienteNome}</strong>
                      <span style={s.chip(st.bg, st.cor)}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "#9AA0AA", marginTop: 4 }}>{a.servicos.map((x) => x.nome).join(" + ")} · <strong>{a.profissionalNome}</strong></div>
                    <div style={{ fontSize: 12.5, color: "#9AA0AA", marginTop: 2 }}>
                      {dinheiro(a.total)}
                      {Number(a.descontoValor) > 0 && ` (desconto ${dinheiro(a.descontoValor)})`}
                      {a.telefone && ` · ${telefoneTexto(a.telefone)}`}
                      {a.origem === "whatsapp" && " · via WhatsApp"}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <AcoesAgendamento ag={a} compacto onEditar={(ag) => setModal({ agendamento: ag })} onAlterado={aposAlterar} onErro={setErro} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      </>
      )}

      {detalhe && (
        <DetalheAgendamento ag={detalhe} onClose={() => setDetalhe(null)}>
          <AcoesAgendamento
            ag={detalhe}
            onEditar={(ag) => {
              setDetalhe(null);
              setModal({ agendamento: ag });
            }}
            onAlterado={aposAlterar}
            onErro={(m) => {
              setDetalhe(null);
              setErro(m);
            }}
          />
        </DetalheAgendamento>
      )}

      {modal && (
        <AgendamentoModal
          agendamento={modal.agendamento}
          dataInicial={modal.dataInicial}
          horaInicial={modal.horaInicial}
          profissionalInicial={modal.profissionalInicial}
          onClose={() => setModal(null)}
          onSalvo={(ag, msg) => {
            setModal(null);
            setDiaSel(ag.data);
            setDataDia(ag.data);
            if (ag.data.slice(0, 7) !== mes) setMes(ag.data.slice(0, 7));
            aposAlterar(msg);
          }}
        />
      )}
    </div>
  );
}
