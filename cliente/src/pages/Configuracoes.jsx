import { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../auth";
import * as s from "../styles";
import HorariosEditor, { validarHorarios } from "../components/HorariosEditor";
import { dataBR, erroApi, hojeISO } from "../utils";

// Dados do negócio, funcionamento (dias, horários e pausas), folgas/feriados,
// regras do agente de WhatsApp, descontos e cupons.
export default function Configuracoes() {
  const { ehAdmin } = useAuth();
  const [cfg, setCfg] = useState(null);
  const [cupons, setCupons] = useState([]);
  const [bloqueios, setBloqueios] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [novoCupom, setNovoCupom] = useState({ codigo: "", descricao: "", percentual: "", validoAte: "" });
  const [novoBloq, setNovoBloq] = useState({ dataInicio: hojeISO(), dataFim: "", diaInteiro: true, inicio: "", fim: "", profissionalId: "", motivo: "" });
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const carregar = () => {
    api.get("/negocio").then((r) => setCfg(r.data)).catch(() => setErro("Não foi possível carregar a configuração."));
    api.get("/cupons").then((r) => setCupons(r.data || [])).catch(() => {});
    api.get("/bloqueios", { params: { futuros: "true" } }).then((r) => setBloqueios(r.data || [])).catch(() => {});
    api.get("/profissionais").then((r) => setProfissionais(r.data || [])).catch(() => {});
  };
  useEffect(carregar, []);
  useEffect(() => {
    if (!sucesso) return;
    const t = setTimeout(() => setSucesso(""), 4000);
    return () => clearTimeout(t);
  }, [sucesso]);

  if (!cfg) return <div style={s.page}>{erro ? <div style={s.errorBox}>{erro}</div> : "Carregando..."}</div>;

  const set = (campo, valor) => setCfg((c) => ({ ...c, [campo]: valor }));
  const faixas = cfg.descontosQuantidade || [];

  const salvar = async () => {
    setErro("");
    const e = validarHorarios(cfg.horarios);
    if (e) return setErro(e);
    try {
      const r = await api.put("/negocio", {
        ...cfg,
        descontosQuantidade: faixas
          .filter((f) => f.minServicos && f.percentual !== "")
          .map((f) => ({ minServicos: Number(f.minServicos), percentual: Number(f.percentual) }))
          .sort((a, b) => a.minServicos - b.minServicos),
      });
      setCfg(r.data);
      setSucesso("Configurações salvas.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setErro(erroApi(err, "Não foi possível salvar."));
    }
  };

  const criarCupom = async () => {
    setErro("");
    try {
      await api.post("/cupons", { ...novoCupom, percentual: Number(novoCupom.percentual), validoAte: novoCupom.validoAte || null });
      setNovoCupom({ codigo: "", descricao: "", percentual: "", validoAte: "" });
      setSucesso("Cupom criado.");
      carregar();
    } catch (e) {
      setErro(erroApi(e, "Não foi possível criar o cupom."));
    }
  };

  const criarBloqueio = async () => {
    setErro("");
    try {
      await api.post("/bloqueios", {
        dataInicio: novoBloq.dataInicio,
        dataFim: novoBloq.dataFim || novoBloq.dataInicio,
        inicio: novoBloq.diaInteiro ? null : novoBloq.inicio,
        fim: novoBloq.diaInteiro ? null : novoBloq.fim,
        profissionalId: novoBloq.profissionalId || null,
        motivo: novoBloq.motivo,
      });
      setNovoBloq({ dataInicio: hojeISO(), dataFim: "", diaInteiro: true, inicio: "", fim: "", profissionalId: "", motivo: "" });
      setSucesso("Bloqueio criado. Esses horários não aparecem mais para agendamento.");
      carregar();
    } catch (e) {
      setErro(erroApi(e, "Não foi possível criar o bloqueio."));
    }
  };

  const nomeProf = (id) => profissionais.find((p) => p.id === id)?.nome || "—";
  const sec = { fontSize: 16, display: "block" };

  return (
    <div style={s.page}>
      <div style={s.headerRow}>
        <div>
          <h1 style={s.title}>Configurações</h1>
          <p style={s.subtitle}>Funcionamento, folgas, regras do WhatsApp, descontos e cupons.</p>
        </div>
        <button style={s.btnPrimary} onClick={salvar}>Salvar configurações</button>
      </div>

      {sucesso && <div style={s.successBox}>{sucesso}</div>}
      {erro && <div style={s.errorBox}>{erro}</div>}

      <div className="grade-responsiva" style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={s.card}>
            <strong style={sec}>Negócio</strong>
            <label style={{ ...s.label, marginTop: 12 }}>Nome</label>
            <input style={s.input} value={cfg.nome} onChange={(e) => set("nome", e.target.value)} />
            <div className="grade-responsiva" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <label style={s.label}>WhatsApp do dono</label>
                <input style={s.input} value={cfg.telefoneDono || ""} onChange={(e) => set("telefoneDono", e.target.value)} placeholder="5581999999999" />
              </div>
              <div>
                <label style={s.label}>Instância do WhatsApp</label>
                <input style={{ ...s.input, background: ehAdmin ? s.input.backgroundColor : "#1F1F1F" }} value={cfg.instanciaWhatsapp || ""} disabled={!ehAdmin} onChange={(e) => set("instanciaWhatsapp", e.target.value)} />
              </div>
            </div>
            <p style={{ fontSize: 12, color: "#8A8A8A", margin: "6px 0 0" }}>O dono recebe a agenda todo dia às 3h e a cada mudança. A instância liga o número do WhatsApp a este negócio (só o administrador altera).</p>
          </div>

          <div style={s.card}>
            <strong style={sec}>Dias e horário de funcionamento</strong>
            <p style={{ fontSize: 12.5, color: "#A3A3A3", margin: "4px 0 12px" }}>Marque os dias em que abre, o horário e as pausas (almoço, intervalo). Profissionais podem ter horário próprio dentro deste.</p>
            <HorariosEditor valor={cfg.horarios} onChange={(h) => set("horarios", h)} />
            <div className="grade-responsiva" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
              <div>
                <label style={s.label}>Grade de horários (minutos)</label>
                <select style={s.input} value={cfg.passoMin} onChange={(e) => set("passoMin", Number(e.target.value))}>
                  {[5, 10, 15, 20, 30, 60].map((n) => (
                    <option key={n} value={n}>De {n} em {n} min</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={s.label}>Cancelar/remarcar no WhatsApp até</label>
                <select style={s.input} value={cfg.antecedenciaCancelamentoHoras} onChange={(e) => set("antecedenciaCancelamentoHoras", Number(e.target.value))}>
                  {[0, 1, 2, 3, 4, 6, 12, 24, 48].map((n) => (
                    <option key={n} value={n}>{n === 0 ? "A qualquer momento" : `${n}h antes`}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div style={s.card}>
            <strong style={sec}>Folgas, feriados e bloqueios</strong>
            <p style={{ fontSize: 12.5, color: "#A3A3A3", margin: "4px 0 12px" }}>Feche a agenda num dia (feriado), num período (férias) ou num intervalo de horas, para todos ou para um profissional.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {bloqueios.length === 0 && <span style={{ fontSize: 13, color: "#8A8A8A" }}>Nenhum bloqueio futuro.</span>}
              {bloqueios.map((b) => (
                <div key={b.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, borderBottom: "1px solid #1F1F1F", paddingBottom: 8 }}>
                  <div style={{ fontSize: 13.5 }}>
                    <strong>{b.motivo || "Bloqueio"}</strong>
                    <div style={{ fontSize: 12.5, color: "#A3A3A3" }}>
                      {dataBR(b.dataInicio)}{b.dataFim !== b.dataInicio ? ` a ${dataBR(b.dataFim)}` : ""} · {b.inicio ? `${b.inicio}–${b.fim}` : "dia inteiro"} · {b.profissionalId ? nomeProf(b.profissionalId) : "todo o negócio"}
                    </div>
                  </div>
                  <button
                    style={{ ...s.linkBtn, color: "#F28B8B" }}
                    onClick={async () => {
                      await api.delete(`/bloqueios/${b.id}`);
                      carregar();
                    }}
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
            <div className="grade-responsiva" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
              <div>
                <label style={s.label}>De</label>
                <input type="date" style={s.input} value={novoBloq.dataInicio} onChange={(e) => setNovoBloq({ ...novoBloq, dataInicio: e.target.value })} />
              </div>
              <div>
                <label style={s.label}>Até (opcional)</label>
                <input type="date" style={s.input} value={novoBloq.dataFim} onChange={(e) => setNovoBloq({ ...novoBloq, dataFim: e.target.value })} />
              </div>
              <div>
                <label style={s.label}>Para quem</label>
                <select style={s.input} value={novoBloq.profissionalId} onChange={(e) => setNovoBloq({ ...novoBloq, profissionalId: e.target.value })}>
                  <option value="">Todo o negócio</option>
                  {profissionais.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={s.label}>Motivo</label>
                <input style={s.input} value={novoBloq.motivo} onChange={(e) => setNovoBloq({ ...novoBloq, motivo: e.target.value })} placeholder="Feriado, férias, curso..." />
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 13.5, cursor: "pointer" }}>
              <input type="checkbox" checked={novoBloq.diaInteiro} onChange={(e) => setNovoBloq({ ...novoBloq, diaInteiro: e.target.checked })} style={{ accentColor: s.OURO }} />
              Dia inteiro
            </label>
            {!novoBloq.diaInteiro && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                <input type="time" style={s.input} value={novoBloq.inicio} onChange={(e) => setNovoBloq({ ...novoBloq, inicio: e.target.value })} />
                <input type="time" style={s.input} value={novoBloq.fim} onChange={(e) => setNovoBloq({ ...novoBloq, fim: e.target.value })} />
              </div>
            )}
            <button style={{ ...s.btnSecondary, marginTop: 10 }} onClick={criarBloqueio}>+ Bloquear agenda</button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={s.card}>
            <strong style={sec}>Atendimento no WhatsApp</strong>
            <div className="grade-responsiva" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <label style={s.label}>Nome da atendente virtual</label>
                <input style={s.input} value={cfg.nomeAtendente || ""} onChange={(e) => set("nomeAtendente", e.target.value)} />
              </div>
              <div>
                <label style={s.label}>Desconto extra que pode dar (%)</label>
                <input type="number" min="0" max="100" style={s.input} value={cfg.descontoMaxAgente} onChange={(e) => set("descontoMaxAgente", e.target.value)} />
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 14, cursor: "pointer" }}>
              <input type="checkbox" checked={!!cfg.clienteEscolheProfissional} onChange={(e) => set("clienteEscolheProfissional", e.target.checked)} style={{ accentColor: s.OURO }} />
              O cliente pode escolher o profissional
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 14, cursor: "pointer" }}>
              <input type="checkbox" checked={cfg.avisarClienteMudancas !== false} onChange={(e) => set("avisarClienteMudancas", e.target.checked)} style={{ accentColor: s.OURO }} />
              Avisar o cliente quando o agendamento for marcado, remarcado ou cancelado pelo sistema
            </label>
            <label style={{ ...s.label, marginTop: 12 }}>Instruções extras para a atendente</label>
            <textarea
              style={{ ...s.input, minHeight: 90, resize: "vertical" }}
              value={cfg.observacoesAgente || ""}
              onChange={(e) => set("observacoesAgente", e.target.value)}
              placeholder="Ex.: aceitamos Pix e cartão; estacionamento conveniado; pedir para chegar 10 min antes..."
            />
          </div>

          <div style={s.card}>
            <strong style={sec}>Descontos por quantidade de serviços</strong>
            <p style={{ fontSize: 12.5, color: "#A3A3A3", margin: "4px 0 10px" }}>Vale a maior faixa atingida no mesmo agendamento.</p>
            {faixas.map((f, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
                <input type="number" min="2" style={s.input} value={f.minServicos} onChange={(e) => set("descontosQuantidade", faixas.map((x, j) => (j === i ? { ...x, minServicos: e.target.value } : x)))} placeholder="A partir de N serviços" />
                <input type="number" min="0" max="100" style={s.input} value={f.percentual} onChange={(e) => set("descontosQuantidade", faixas.map((x, j) => (j === i ? { ...x, percentual: e.target.value } : x)))} placeholder="%" />
                <button style={{ ...s.linkBtn, color: "#F28B8B" }} onClick={() => set("descontosQuantidade", faixas.filter((_, j) => j !== i))}>Remover</button>
              </div>
            ))}
            <button style={s.linkBtn} onClick={() => set("descontosQuantidade", [...faixas, { minServicos: "", percentual: "" }])}>+ Adicionar faixa</button>
          </div>

          <div style={s.card}>
            <strong style={sec}>Cupons</strong>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
              {cupons.length === 0 && <span style={{ fontSize: 13, color: "#8A8A8A" }}>Nenhum cupom.</span>}
              {cupons.map((c) => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, borderBottom: "1px solid #1F1F1F", paddingBottom: 8 }}>
                  <div>
                    <strong>{c.codigo}</strong> · {Number(c.percentual)}%{!c.ativo && " (inativo)"}
                    <div style={{ fontSize: 12, color: "#8A8A8A" }}>
                      {c.descricao || "—"}
                      {c.validoAte ? ` · até ${dataBR(c.validoAte)}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button style={s.linkBtn} onClick={async () => { await api.put(`/cupons/${c.id}`, { ativo: !c.ativo }); carregar(); }}>{c.ativo ? "Desativar" : "Ativar"}</button>
                    <button style={{ ...s.linkBtn, color: "#F28B8B" }} onClick={async () => { if (window.confirm(`Excluir o cupom ${c.codigo}?`)) { await api.delete(`/cupons/${c.id}`); carregar(); } }}>Excluir</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 0.6fr", gap: 8, marginTop: 12 }}>
              <input style={s.input} value={novoCupom.codigo} onChange={(e) => setNovoCupom({ ...novoCupom, codigo: e.target.value.toUpperCase() })} placeholder="CÓDIGO" />
              <input type="number" style={s.input} value={novoCupom.percentual} onChange={(e) => setNovoCupom({ ...novoCupom, percentual: e.target.value })} placeholder="%" />
              <input style={s.input} value={novoCupom.descricao} onChange={(e) => setNovoCupom({ ...novoCupom, descricao: e.target.value })} placeholder="Descrição" />
              <input type="date" style={s.input} value={novoCupom.validoAte} onChange={(e) => setNovoCupom({ ...novoCupom, validoAte: e.target.value })} />
            </div>
            <button style={{ ...s.btnSecondary, marginTop: 10 }} onClick={criarCupom} disabled={!novoCupom.codigo || !novoCupom.percentual}>+ Criar cupom</button>
          </div>
        </div>
      </div>
    </div>
  );
}
