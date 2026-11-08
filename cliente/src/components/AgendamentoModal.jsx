import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import * as s from "../styles";
import { dinheiro, duracaoTexto, erroApi, hojeISO } from "../utils";

// Cadastro / edição de agendamento. Escolha dos serviços, do profissional
// (ou "qualquer disponível"), horários livres de cada um, descontos e aviso
// ao cliente no WhatsApp.
export default function AgendamentoModal({ agendamento, dataInicial, horaInicial, profissionalInicial, onClose, onSalvo }) {
  const editando = !!agendamento?.id;
  const [servicos, setServicos] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [form, setForm] = useState(() => ({
    clienteNome: agendamento?.clienteNome || "",
    telefone: agendamento?.telefone || "",
    data: agendamento?.data || dataInicial || hojeISO(),
    inicio: agendamento?.inicio || horaInicial || "",
    servicos: (agendamento?.servicos || []).map((x) => x.servicoId),
    profissionalId: String(agendamento?.profissionalId || profissionalInicial || ""),
    cupom: agendamento?.cupom || "",
    descontoManualPercentual:
      agendamento?.descontoManualPercentual !== null && agendamento?.descontoManualPercentual !== undefined ? String(Number(agendamento.descontoManualPercentual)) : "",
    status: agendamento?.status || "agendado",
    observacoes: agendamento?.observacoes || "",
    avisarCliente: true,
  }));
  const [orcamento, setOrcamento] = useState(null);
  const [disp, setDisp] = useState(null);
  const [carregandoLivres, setCarregandoLivres] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sugestoes, setSugestoes] = useState([]);

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  useEffect(() => {
    api.get("/servicos").then((r) => setServicos(r.data || [])).catch(() => setErro("Não foi possível carregar os serviços."));
    api.get("/profissionais", { params: { ativos: "true" } }).then((r) => setProfissionais(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  // Quem faz todos os serviços escolhidos
  const aptos = useMemo(
    () => profissionais.filter((p) => form.servicos.every((id) => (p.ProfissionalServicos || []).some((x) => x.servicoId === id))),
    [profissionais, form.servicos]
  );
  useEffect(() => {
    if (form.profissionalId && form.servicos.length && profissionais.length && !aptos.some((p) => String(p.id) === form.profissionalId)) set("profissionalId", "");
  }, [aptos]); // eslint-disable-line react-hooks/exhaustive-deps

  // Orçamento ao vivo
  useEffect(() => {
    if (!form.servicos.length) return setOrcamento(null);
    const t = setTimeout(() => {
      api
        .post("/agenda/orcamento", {
          servicos: form.servicos,
          profissionalId: form.profissionalId || undefined,
          cupom: form.cupom || null,
          descontoManualPercentual: form.descontoManualPercentual === "" ? undefined : form.descontoManualPercentual,
          descontoExtraPercentual: editando ? agendamento.descontoExtraPercentual : undefined,
        })
        .then((r) => setOrcamento(r.data))
        .catch(() => setOrcamento(null));
    }, 250);
    return () => clearTimeout(t);
  }, [form.servicos, form.cupom, form.descontoManualPercentual, form.profissionalId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Horários livres (de um profissional ou de todos os aptos)
  useEffect(() => {
    if (!form.data || !form.servicos.length) return setDisp(null);
    setCarregandoLivres(true);
    const t = setTimeout(() => {
      api
        .get("/agenda/disponibilidade", {
          params: { data: form.data, servicos: form.servicos.join(","), profissionalId: form.profissionalId || undefined, ignorarId: editando ? agendamento.id : undefined },
        })
        .then((r) => setDisp(r.data))
        .catch(() => setDisp(null))
        .finally(() => setCarregandoLivres(false));
    }, 200);
    return () => clearTimeout(t);
  }, [form.data, form.servicos, form.profissionalId]); // eslint-disable-line react-hooks/exhaustive-deps

  const horarios = disp?.horarios || [];
  const livresNoHorario = horarios.find((h) => h.hora === form.inicio)?.profissionais || [];

  const porCategoria = useMemo(() => {
    const mapa = {};
    servicos
      .filter((x) => x.ativo || form.servicos.includes(x.id))
      .forEach((x) => (mapa[x.categoria || "Outros"] = mapa[x.categoria || "Outros"] || []).push(x));
    return Object.entries(mapa);
  }, [servicos, form.servicos]);

  const alternarServico = (id) => set("servicos", form.servicos.includes(id) ? form.servicos.filter((x) => x !== id) : [...form.servicos, id]);

  const salvar = async () => {
    setErro("");
    setSugestoes([]);
    if (!form.clienteNome.trim()) return setErro("Informe o nome do cliente.");
    if (!form.servicos.length) return setErro("Escolha pelo menos um serviço.");
    if (!form.data || !form.inicio) return setErro("Escolha a data e o horário.");
    setSalvando(true);
    const corpo = {
      ...form,
      profissionalId: form.profissionalId ? Number(form.profissionalId) : editando ? "qualquer" : undefined,
      cupom: form.cupom.trim() || null,
      descontoManualPercentual: form.descontoManualPercentual === "" ? null : Number(form.descontoManualPercentual),
    };
    try {
      const r = editando ? await api.put(`/agendamentos/${agendamento.id}`, corpo) : await api.post("/agendamentos", corpo);
      onSalvo(r.data, editando ? "Agendamento atualizado." : `Agendamento cadastrado com ${r.data.profissionalNome}.`);
    } catch (e) {
      setErro(erroApi(e, "Não foi possível salvar o agendamento."));
      setSugestoes(e?.response?.data?.horariosLivres || []);
    } finally {
      setSalvando(false);
    }
  };

  const fimPrevisto = () => {
    if (!form.inicio || !orcamento) return "";
    const [h, m] = form.inicio.split(":").map(Number);
    const fim = h * 60 + m + orcamento.duracaoTotal;
    return `${String(Math.floor(fim / 60)).padStart(2, "0")}:${String(fim % 60).padStart(2, "0")}`;
  };

  return (
    <div style={s.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...s.modal, maxWidth: 760 }} role="dialog" aria-modal="true">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{editando ? "Editar agendamento" : "Novo agendamento"}</h2>
            {editando && (
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#A3A3A3" }}>
                #{agendamento.id} · origem: {agendamento.origem === "whatsapp" ? "WhatsApp" : "sistema"}
                {agendamento.profissionalEscolhidoPeloCliente ? " · profissional escolhido pelo cliente" : ""}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} style={{ border: "none", background: "none", fontSize: 24, color: "#8A8A8A", cursor: "pointer" }}>×</button>
        </div>

        {erro && (
          <div style={s.errorBox}>
            {erro}
            {sugestoes.length > 0 && <div style={{ marginTop: 6 }}>Horários livres: {sugestoes.join(", ")}</div>}
          </div>
        )}

        <div className="grade-responsiva" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12 }}>
          <div>
            <label style={s.label}>Cliente</label>
            <input style={s.input} value={form.clienteNome} onChange={(e) => set("clienteNome", e.target.value)} placeholder="Nome do cliente" />
          </div>
          <div>
            <label style={s.label}>Telefone / WhatsApp</label>
            <input style={s.input} value={form.telefone} onChange={(e) => set("telefone", e.target.value)} placeholder="(81) 99999-9999" />
          </div>
        </div>

        <label style={{ ...s.label, marginTop: 16 }}>Serviços</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 220, overflowY: "auto", paddingRight: 4 }}>
          {porCategoria.map(([cat, lista]) => (
            <div key={cat}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#8A8A8A", marginBottom: 6 }}>{cat}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 6 }}>
                {lista.map((x) => {
                  const marcado = form.servicos.includes(x.id);
                  return (
                    <label key={x.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 10px", borderRadius: 10, cursor: "pointer", border: `1.5px solid ${marcado ? "#E0A23A" : "#262626"}`, background: marcado ? "#1A160D" : "#141414" }}>
                      <input type="checkbox" checked={marcado} onChange={() => alternarServico(x.id)} style={{ accentColor: s.OURO, marginTop: 2 }} />
                      <span style={{ fontSize: 13 }}>
                        <strong style={{ color: "#F2F2F2" }}>{x.nome}</strong>
                        <span style={{ display: "block", color: "#A3A3A3", fontSize: 12 }}>{dinheiro(x.preco)} · {duracaoTexto(x.duracaoMin)}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="grade-responsiva" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 12, marginTop: 16 }}>
          <div>
            <label style={s.label}>Profissional</label>
            <select style={s.input} value={form.profissionalId} onChange={(e) => set("profissionalId", e.target.value)}>
              <option value="">Qualquer disponível (automático)</option>
              {(form.servicos.length ? aptos : profissionais).map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
            {form.servicos.length > 0 && profissionais.length > 0 && aptos.length === 0 && (
              <div style={{ fontSize: 12, color: "#F28B8B", marginTop: 4 }}>Nenhum profissional faz todos esses serviços juntos.</div>
            )}
          </div>
          <div>
            <label style={s.label}>Data</label>
            <input type="date" style={s.input} value={form.data} onChange={(e) => set("data", e.target.value)} />
          </div>
          <div>
            <label style={s.label}>Horário</label>
            <input type="time" step="300" style={s.input} value={form.inicio} onChange={(e) => set("inicio", e.target.value)} />
          </div>
        </div>

        {form.servicos.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <span style={{ fontSize: 12, color: "#A3A3A3" }}>
              {carregandoLivres
                ? "Buscando horários livres..."
                : horarios.length
                  ? `Horários livres${form.profissionalId ? "" : " (passe o mouse para ver quem está livre)"}:`
                  : "Sem horários livres nesta data."}
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, maxHeight: 104, overflowY: "auto" }}>
              {horarios.map((h) => (
                <button
                  key={h.hora}
                  type="button"
                  title={h.profissionais.map((p) => p.nome).join(", ")}
                  onClick={() => set("inicio", h.hora)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 999,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: `1.5px solid ${form.inicio === h.hora ? s.OURO : "#2E2E2E"}`,
                    background: form.inicio === h.hora ? s.OURO_CLARO : "#141414",
                    color: form.inicio === h.hora ? s.OURO_ESCURO : "#D4D4D4",
                  }}
                >
                  {h.hora}
                  {!form.profissionalId && h.profissionais.length > 1 ? ` (${h.profissionais.length})` : ""}
                </button>
              ))}
            </div>
            {!form.profissionalId && form.inicio && livresNoHorario.length > 0 && (
              <div style={{ fontSize: 12.5, color: "#6FD69A", marginTop: 6 }}>
                Livres às {form.inicio}: {livresNoHorario.map((p) => p.nome).join(", ")}. O sistema escolhe quem estiver com a agenda mais leve.
              </div>
            )}
          </div>
        )}

        <div className="grade-responsiva" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 16 }}>
          <div>
            <label style={s.label}>Status</label>
            <select style={s.input} value={form.status} onChange={(e) => set("status", e.target.value)}>
              {Object.entries(s.STATUS).map(([v, st]) => (
                <option key={v} value={v}>{st.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={s.label}>Cupom</label>
            <input style={s.input} value={form.cupom} onChange={(e) => set("cupom", e.target.value.toUpperCase())} placeholder="Opcional" />
          </div>
          <div>
            <label style={s.label}>Desconto manual (%)</label>
            <input type="number" min="0" max="100" style={s.input} value={form.descontoManualPercentual} onChange={(e) => set("descontoManualPercentual", e.target.value)} placeholder="Automático" />
          </div>
        </div>

        <label style={{ ...s.label, marginTop: 16 }}>Observações</label>
        <textarea style={{ ...s.input, minHeight: 56, resize: "vertical" }} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />

        {orcamento && (
          <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "#1A160D", border: "1px solid #5C4718" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, color: "#D4D4D4" }}>
              <span>{orcamento.quantidade} serviço(s) · {duracaoTexto(orcamento.duracaoTotal)}</span>
              <span>Subtotal {dinheiro(orcamento.subtotal)}</span>
            </div>
            {orcamento.descontoValor > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, color: "#6FD69A", marginTop: 4 }}>
                <span>Desconto ({orcamento.descontoMotivo})</span>
                <span>-{dinheiro(orcamento.descontoValor)}</span>
              </div>
            )}
            {orcamento.erroCupom && <div style={{ fontSize: 13, color: "#F28B8B", marginTop: 4 }}>{orcamento.erroCupom}</div>}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 800, color: "#F2F2F2", marginTop: 8 }}>
              <span>Total</span>
              <span>{dinheiro(orcamento.total)}</span>
            </div>
            {form.inicio && <div style={{ fontSize: 12.5, color: "#A3A3A3", marginTop: 4 }}>Das {form.inicio} às {fimPrevisto()}{form.profissionalId ? "" : " (tempo pode variar conforme o profissional)"}</div>}
          </div>
        )}

        {form.telefone && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 13.5, cursor: "pointer", color: "#D4D4D4" }}>
            <input type="checkbox" checked={form.avisarCliente} onChange={(e) => set("avisarCliente", e.target.checked)} style={{ accentColor: s.OURO }} />
            Avisar o cliente no WhatsApp {editando ? "se mudar data, horário ou profissional" : "com a confirmação"}
          </label>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button type="button" style={s.btnSecondary} onClick={onClose}>Fechar</button>
          <button type="button" style={{ ...s.btnPrimary, opacity: salvando ? 0.7 : 1 }} onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar agendamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
