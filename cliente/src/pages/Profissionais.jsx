import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import * as s from "../styles";
import HorariosEditor, { validarHorarios } from "../components/HorariosEditor";
import { DIAS_CURTOS, dinheiro, duracaoTexto, erroApi, telefoneTexto } from "../utils";
import { Icone } from "../components/Marca";

const CORES = ["#E0A23A", "#7CC4F0", "#F08BB8", "#B79CF5", "#5FD3C4", "#F5A66B", "#F2F2F2", "#6FD69A"];
const VAZIO = { nome: "", apelido: "", telefone: "", cor: CORES[0], ativo: true, horarios: null, servicos: [] };

// Cadastro de profissionais: serviços que cada um faz (com tempo próprio) e horário de trabalho.
export default function Profissionais() {
  const [lista, setLista] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [negocio, setNegocio] = useState(null);
  const [form, setForm] = useState(null);
  const [aba, setAba] = useState("dados");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const carregar = () => {
    api.get("/profissionais").then((r) => setLista(r.data || [])).catch(() => setErro("Não foi possível carregar os profissionais."));
    api.get("/servicos").then((r) => setServicos(r.data || [])).catch(() => {});
    api.get("/negocio").then((r) => setNegocio(r.data)).catch(() => {});
  };
  useEffect(carregar, []);
  useEffect(() => {
    if (!sucesso) return;
    const t = setTimeout(() => setSucesso(""), 4000);
    return () => clearTimeout(t);
  }, [sucesso]);

  const nomeServ = useMemo(() => Object.fromEntries(servicos.map((x) => [x.id, x])), [servicos]);

  const abrir = (p) => {
    setErro("");
    setAba("dados");
    setForm(
      p
        ? {
            ...p,
            telefone: p.telefone || "",
            apelido: p.apelido || "",
            servicos: (p.ProfissionalServicos || []).map((x) => ({ servicoId: x.servicoId, duracaoMin: x.duracaoMin || "" })),
          }
        : { ...VAZIO, cor: CORES[lista.length % CORES.length] }
    );
  };

  const marcado = (id) => form.servicos.find((x) => x.servicoId === id);
  const alternar = (id) =>
    setForm((f) => ({ ...f, servicos: marcado(id) ? f.servicos.filter((x) => x.servicoId !== id) : [...f.servicos, { servicoId: id, duracaoMin: "" }] }));
  const tempo = (id, v) => setForm((f) => ({ ...f, servicos: f.servicos.map((x) => (x.servicoId === id ? { ...x, duracaoMin: v } : x)) }));

  const salvar = async () => {
    setErro("");
    if (!form.nome.trim()) return setErro("Informe o nome.");
    if (!form.servicos.length) return setErro("Marque pelo menos um serviço que este profissional faz.");
    if (form.horarios) {
      const e = validarHorarios(form.horarios);
      if (e) return setErro(e);
    }
    const corpo = {
      nome: form.nome,
      apelido: form.apelido || null,
      telefone: form.telefone,
      cor: form.cor,
      ativo: form.ativo,
      horarios: form.horarios,
      servicos: form.servicos.map((x) => ({ servicoId: x.servicoId, duracaoMin: x.duracaoMin ? Number(x.duracaoMin) : null })),
    };
    try {
      if (form.id) await api.put(`/profissionais/${form.id}`, corpo);
      else await api.post("/profissionais", corpo);
      setSucesso(form.id ? "Profissional atualizado." : "Profissional cadastrado.");
      setForm(null);
      carregar();
    } catch (e) {
      setErro(erroApi(e, "Não foi possível salvar."));
    }
  };

  const excluir = async (p) => {
    if (!window.confirm(`Excluir ${p.nome}? Se tiver histórico de atendimentos, ele será apenas desativado.`)) return;
    try {
      const r = await api.delete(`/profissionais/${p.id}`);
      setSucesso(r.data?.desativado ? `${p.nome} foi desativado (tem histórico).` : "Profissional excluído.");
      carregar();
    } catch (e) {
      setErro(erroApi(e, "Não foi possível excluir."));
    }
  };

  const resumoHorario = (h) => {
    if (!h) return "Horário do negócio";
    const dias = DIAS_CURTOS.filter((_, i) => h[String(i)]);
    return dias.length ? `Próprio: ${dias.join(", ")}` : "Sem dias de trabalho";
  };

  const porCategoria = useMemo(() => {
    const m = {};
    servicos.forEach((x) => (m[x.categoria || "Outros"] = m[x.categoria || "Outros"] || []).push(x));
    return Object.entries(m);
  }, [servicos]);

  return (
    <div style={s.page}>
      <div style={s.headerRow}>
        <div>
          <h1 style={s.title}>Profissionais</h1>
          <p style={s.subtitle}>Quem atende, quais serviços faz (e em quanto tempo) e em que horários.</p>
        </div>
        <button style={s.btnPrimary} onClick={() => abrir(null)}>+ Novo profissional</button>
      </div>

      {sucesso && <div style={s.successBox}>{sucesso}</div>}
      {erro && !form && <div style={s.errorBox}>{erro}</div>}

      {lista.length === 0 && <div style={{ ...s.card, color: "#A3A3A3" }}>Nenhum profissional cadastrado. Sem profissionais, a agenda e o WhatsApp não conseguem marcar horários.</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {lista.map((p) => (
          <div key={p.id} style={{ ...s.card, borderTop: `4px solid ${p.cor}`, opacity: p.ativo ? 1 : 0.6 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: p.cor, color: "#141414", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18 }}>
                {p.nome.replace(/^(Dr|Dra)\.\s*/i, "").slice(0, 1)}
              </div>
              <div style={{ minWidth: 0 }}>
                <strong style={{ fontSize: 15.5 }}>{p.nome}</strong>
                <div style={{ fontSize: 12.5, color: "#A3A3A3" }}>
                  {p.apelido ? `“${p.apelido}” · ` : ""}
                  {telefoneTexto(p.telefone) || "sem telefone"}
                </div>
              </div>
              {!p.ativo && <span style={{ ...s.chip("#1F1F1F", "#A3A3A3"), marginLeft: "auto" }}>Inativo</span>}
            </div>
            <div style={{ fontSize: 12.5, color: "#A3A3A3", margin: "12px 0 6px" }}><Icone nome="relogio" tamanho={14} style={{ color: "#E0A23A" }} /> {resumoHorario(p.horarios)}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(p.ProfissionalServicos || []).map((x) => (
                <span key={x.servicoId} style={s.chip("#2A2110", "#F0C46A")}>
                  {nomeServ[x.servicoId]?.nome || "?"}
                  {x.duracaoMin ? ` · ${x.duracaoMin} min` : ""}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 14 }}>
              <button style={s.linkBtn} onClick={() => abrir(p)}>Editar</button>
              <button style={{ ...s.linkBtn, color: "#F28B8B" }} onClick={() => excluir(p)}>Excluir</button>
            </div>
          </div>
        ))}
      </div>

      {form && (
        <div style={s.overlay} onMouseDown={(e) => e.target === e.currentTarget && setForm(null)}>
          <div style={{ ...s.modal, maxWidth: 760 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 800 }}>{form.id ? `Editar ${form.nome}` : "Novo profissional"}</h2>
            <div style={{ display: "flex", gap: 6, marginBottom: 16, borderBottom: "1px solid #262626" }}>
              {[["dados", "Dados"], ["servicos", `Serviços (${form.servicos.length})`], ["horarios", "Horário de trabalho"]].map(([k, l]) => (
                <button key={k} type="button" onClick={() => setAba(k)} style={{ border: "none", background: "none", padding: "8px 12px", fontWeight: 700, fontSize: 14, cursor: "pointer", color: aba === k ? s.OURO_ESCURO : "#A3A3A3", borderBottom: `2px solid ${aba === k ? s.OURO : "transparent"}` }}>
                  {l}
                </button>
              ))}
            </div>
            {erro && <div style={s.errorBox}>{erro}</div>}

            {aba === "dados" && (
              <>
                <div className="grade-responsiva" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 12 }}>
                  <div>
                    <label style={s.label}>Nome</label>
                    <input style={s.input} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                  </div>
                  <div>
                    <label style={s.label}>Como o cliente chama (apelido)</label>
                    <input style={s.input} value={form.apelido} onChange={(e) => setForm({ ...form, apelido: e.target.value })} placeholder="Ex.: Léo" />
                  </div>
                </div>
                <div className="grade-responsiva" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                  <div>
                    <label style={s.label}>Telefone</label>
                    <input style={s.input} value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(81) 99999-9999" />
                  </div>
                  <div>
                    <label style={s.label}>Cor na agenda</label>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {CORES.map((c) => (
                        <button key={c} type="button" onClick={() => setForm({ ...form, cor: c })} style={{ width: 30, height: 30, borderRadius: "50%", background: c, border: form.cor === c ? "3px solid #F2F2F2" : "2px solid #141414", boxShadow: "0 0 0 1px #2E2E2E", cursor: "pointer" }} />
                      ))}
                    </div>
                  </div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, fontSize: 14, cursor: "pointer" }}>
                  <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} style={{ accentColor: s.OURO }} />
                  Ativo (aparece na agenda e no WhatsApp)
                </label>
              </>
            )}

            {aba === "servicos" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ margin: 0, fontSize: 13, color: "#A3A3A3" }}>Marque o que este profissional faz. O tempo próprio é opcional (ex.: um aprendiz que demora mais); vazio usa o tempo padrão do serviço.</p>
                {porCategoria.map(([cat, itens]) => (
                  <div key={cat}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#8A8A8A", marginBottom: 6 }}>{cat}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {itens.map((x) => {
                        const m = marcado(x.id);
                        return (
                          <div key={x.id} style={{ display: "grid", gridTemplateColumns: "1fr 150px", gap: 10, alignItems: "center", padding: "8px 10px", borderRadius: 10, border: `1.5px solid ${m ? "#E0A23A" : "#262626"}`, background: m ? "#1A160D" : "#141414" }}>
                            <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer", fontSize: 14 }}>
                              <input type="checkbox" checked={!!m} onChange={() => alternar(x.id)} style={{ accentColor: s.OURO }} />
                              <span>
                                <strong>{x.nome}</strong>
                                <span style={{ color: "#A3A3A3", fontSize: 12.5 }}> · {dinheiro(x.preco)} · padrão {duracaoTexto(x.duracaoMin)}</span>
                              </span>
                            </label>
                            {m ? (
                              <input type="number" min="5" step="5" style={{ ...s.input, padding: "7px 10px" }} value={m.duracaoMin} onChange={(e) => tempo(x.id, e.target.value)} placeholder={`${x.duracaoMin} min (padrão)`} />
                            ) : (
                              <span />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {aba === "horarios" && (
              <>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer", marginBottom: 12 }}>
                  <input
                    type="checkbox"
                    checked={!form.horarios}
                    onChange={(e) => setForm({ ...form, horarios: e.target.checked ? null : JSON.parse(JSON.stringify(negocio?.horarios || {})) })}
                    style={{ accentColor: s.OURO }}
                  />
                  Trabalha em todo o horário de funcionamento do negócio
                </label>
                {form.horarios ? (
                  <>
                    <p style={{ margin: "0 0 10px", fontSize: 13, color: "#A3A3A3" }}>Horário próprio (folgas, meio período). Ele sempre fica dentro do horário do negócio; as pausas do negócio também valem.</p>
                    <HorariosEditor valor={form.horarios} onChange={(h) => setForm({ ...form, horarios: h })} rotuloAberto="Trabalha" />
                  </>
                ) : (
                  <p style={{ fontSize: 13, color: "#A3A3A3" }}>Para folgas pontuais (um dia, férias), use “Folgas e bloqueios” em Configurações.</p>
                )}
              </>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button style={s.btnSecondary} onClick={() => setForm(null)}>Cancelar</button>
              <button style={s.btnPrimary} onClick={salvar}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
