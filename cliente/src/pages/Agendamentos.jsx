import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import * as s from "../styles";
import AgendamentoModal from "../components/AgendamentoModal";
import AcoesAgendamento from "../components/AcoesAgendamento";
import { useAuth } from "../auth";
import { DIAS_CURTOS, dataBR, diaSemana, dinheiro, duracaoTexto, fimDoMes, hojeISO, somarDias, telefoneTexto } from "../utils";

// Lista de agendamentos com filtros (período, status e busca) e cadastro/edição.
export default function Agendamentos() {
  const hoje = hojeISO();
  const [de, setDe] = useState(hoje);
  const [ate, setAte] = useState(somarDias(hoje, 30));
  const [status, setStatus] = useState("");
  const [busca, setBusca] = useState("");
  const [prof, setProf] = useState("");
  const [profissionais, setProfissionais] = useState([]);
  const { podeAgendar } = useAuth();
  useEffect(() => {
    api.get("/profissionais").then((r) => setProfissionais(r.data || [])).catch(() => {});
  }, []);
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [modal, setModal] = useState(null);

  const carregar = useCallback(() => {
    setCarregando(true);
    api
      .get("/agendamentos", { params: { de, ate, status: status || undefined, q: busca || undefined, profissionalId: prof || undefined } })
      .then((r) => {
        setLista(r.data || []);
        setErro("");
      })
      .catch(() => setErro("Não foi possível carregar os agendamentos."))
      .finally(() => setCarregando(false));
  }, [de, ate, status, busca, prof]);

  useEffect(() => {
    const t = setTimeout(carregar, 250);
    return () => clearTimeout(t);
  }, [carregar]);

  useEffect(() => {
    if (!sucesso) return;
    const t = setTimeout(() => setSucesso(""), 4000);
    return () => clearTimeout(t);
  }, [sucesso]);

  const ativos = lista.filter((a) => a.status !== "cancelado" && a.status !== "faltou");
  const previsto = ativos.reduce((t, a) => t + Number(a.total), 0);

  const aposAlterar = (msg) => {
    setSucesso(msg);
    carregar();
  };

  const atalho = (dias) => {
    setDe(hoje);
    setAte(somarDias(hoje, dias));
  };

  return (
    <div style={s.page}>
      <div style={s.headerRow}>
        <div>
          <h1 style={s.title}>Agendamentos</h1>
          <p style={s.subtitle}>
            {carregando ? "Carregando..." : `${lista.length} no período · ${ativos.length} ativos · previsto ${dinheiro(previsto)}`}
          </p>
        </div>
        {podeAgendar && <button style={s.btnPrimary} onClick={() => setModal({})}>+ Novo agendamento</button>}
      </div>

      {sucesso && <div style={s.successBox}>{sucesso}</div>}
      {erro && <div style={s.errorBox}>{erro}</div>}

      <div style={{ ...s.card, marginBottom: 16 }}>
        <div className="grade-responsiva" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1.4fr", gap: 12 }}>
          <div>
            <label style={s.label}>De</label>
            <input type="date" style={s.input} value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div>
            <label style={s.label}>Até</label>
            <input type="date" style={s.input} value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
          <div>
            <label style={s.label}>Status</label>
            <select style={s.input} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(s.STATUS).map(([v, st]) => (
                <option key={v} value={v}>{st.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={s.label}>Profissional</label>
            <select style={s.input} value={prof} onChange={(e) => setProf(e.target.value)}>
              <option value="">Todos</option>
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={s.label}>Buscar</label>
            <input style={s.input} value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome ou telefone do cliente..." />
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
          <button style={s.linkBtn} onClick={() => atalho(0)}>Hoje</button>
          <button style={s.linkBtn} onClick={() => atalho(7)}>Próximos 7 dias</button>
          <button style={s.linkBtn} onClick={() => atalho(30)}>Próximos 30 dias</button>
          <button
            style={s.linkBtn}
            onClick={() => {
              setDe(`${hoje.slice(0, 8)}01`);
              setAte(fimDoMes(hoje));
            }}
          >
            Este mês
          </button>
        </div>
      </div>

      <div style={{ ...s.card, padding: 8, overflowX: "auto" }}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Data</th>
              <th style={s.th}>Horário</th>
              <th style={s.th}>Cliente</th>
              <th style={s.th}>Profissional</th>
              <th style={s.th}>Serviços</th>
              <th style={{ ...s.th, textAlign: "right" }}>Valor</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {!carregando && lista.length === 0 && (
              <tr>
                <td style={{ ...s.td, color: "#6E7482" }} colSpan={8}>Nenhum agendamento com esses filtros.</td>
              </tr>
            )}
            {lista.map((a) => {
              const st = s.STATUS[a.status] || s.STATUS.agendado;
              return (
                <tr key={a.id} style={{ opacity: a.status === "cancelado" ? 0.6 : 1 }}>
                  <td style={s.td}>
                    <strong>{dataBR(a.data)}</strong>
                    <div style={{ fontSize: 12, color: "#6E7482" }}>{DIAS_CURTOS[diaSemana(a.data)]}</div>
                  </td>
                  <td style={s.td}>
                    {a.inicio}–{a.fim}
                    <div style={{ fontSize: 12, color: "#6E7482" }}>{duracaoTexto(a.duracaoTotal)}</div>
                  </td>
                  <td style={s.td}>
                    <strong>{a.clienteNome}</strong>
                    <div style={{ fontSize: 12, color: "#6E7482" }}>
                      {telefoneTexto(a.telefone) || "—"}
                      {a.origem === "whatsapp" ? " · WhatsApp" : ""}
                    </div>
                  </td>
                  <td style={s.td}>{a.profissionalNome}{a.profissionalEscolhidoPeloCliente ? <div style={{ fontSize: 11.5, color: "#6E7482" }}>escolhido pelo cliente</div> : null}</td>
                  <td style={{ ...s.td, maxWidth: 260 }}>{a.servicos.map((x) => x.nome).join(" + ")}</td>
                  <td style={{ ...s.td, textAlign: "right", whiteSpace: "nowrap" }}>
                    <strong>{dinheiro(a.total)}</strong>
                    {Number(a.descontoValor) > 0 && (
                      <div style={{ fontSize: 12, color: "#6FD69A" }} title={a.descontoMotivo || ""}>-{dinheiro(a.descontoValor)}</div>
                    )}
                  </td>
                  <td style={s.td}>
                    <span style={s.chip(st.bg, st.cor)}>{st.label}</span>
                  </td>
                  <td style={s.td}>
                    <AcoesAgendamento ag={a} compacto onEditar={(ag) => setModal({ agendamento: ag })} onAlterado={aposAlterar} onErro={setErro} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <AgendamentoModal
          agendamento={modal.agendamento}
          onClose={() => setModal(null)}
          onSalvo={(ag, msg) => {
            setModal(null);
            aposAlterar(msg);
          }}
        />
      )}
    </div>
  );
}
