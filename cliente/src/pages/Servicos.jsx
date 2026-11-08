import { useEffect, useState } from "react";
import { api } from "../services/api";
import * as s from "../styles";
import { dinheiro, duracaoTexto, erroApi } from "../utils";

const VAZIO = { nome: "", categoria: "", descricao: "", preco: "", duracaoMin: 30, ativo: true, profissionais: [] };

// Cadastro de serviços: preço e tempo (usados para somar o tempo dos agendamentos).
export default function Servicos() {
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState(null); // null = fechado
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [busca, setBusca] = useState("");
  const [profissionais, setProfissionais] = useState([]);

  const carregar = () => {
    api
      .get("/servicos")
      .then((r) => setLista(r.data || []))
      .catch(() => setErro("Não foi possível carregar os serviços."));
    api.get("/profissionais").then((r) => setProfissionais(r.data || [])).catch(() => {});
  };

  useEffect(() => {
    carregar();
  }, []);
  const quemFaz = (id) => profissionais.filter((p) => p.ativo && (p.ProfissionalServicos || []).some((x) => x.servicoId === id));

  useEffect(() => {
    if (!sucesso) return;
    const t = setTimeout(() => setSucesso(""), 4000);
    return () => clearTimeout(t);
  }, [sucesso]);

  const salvar = async () => {
    setErro("");
    if (!form.nome.trim() || form.preco === "" || !form.duracaoMin) return setErro("Nome, preço e duração são obrigatórios.");
    const corpo = { ...form, preco: Number(String(form.preco).replace(",", ".")), duracaoMin: Number(form.duracaoMin) };
    try {
      if (form.id) await api.put(`/servicos/${form.id}`, corpo);
      else await api.post("/servicos", corpo);
      setSucesso(form.id ? "Serviço atualizado." : "Serviço cadastrado.");
      setForm(null);
      carregar();
    } catch (e) {
      setErro(erroApi(e, "Não foi possível salvar o serviço."));
    }
  };

  const excluir = async (x) => {
    if (!window.confirm(`Excluir o serviço "${x.nome}"? Os agendamentos já feitos não são afetados.`)) return;
    try {
      await api.delete(`/servicos/${x.id}`);
      setSucesso("Serviço excluído.");
      carregar();
    } catch (e) {
      setErro(erroApi(e, "Não foi possível excluir."));
    }
  };

  const termo = busca.trim().toLowerCase();
  const filtrados = termo ? lista.filter((x) => `${x.nome} ${x.categoria || ""}`.toLowerCase().includes(termo)) : lista;

  return (
    <div style={s.page}>
      <div style={s.headerRow}>
        <div>
          <h1 style={s.title}>Serviços</h1>
          <p style={s.subtitle}>{lista.length} serviço(s) · preço e tempo de cada um</p>
        </div>
        <button style={s.btnPrimary} onClick={() => setForm({ ...VAZIO })}>+ Novo serviço</button>
      </div>

      {sucesso && <div style={s.successBox}>{sucesso}</div>}
      {erro && !form && <div style={s.errorBox}>{erro}</div>}

      <div style={{ ...s.card, marginBottom: 16 }}>
        <label style={s.label}>Buscar</label>
        <input style={s.input} value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome ou categoria..." />
      </div>

      <div style={{ ...s.card, padding: 8, overflowX: "auto" }}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Serviço</th>
              <th style={s.th}>Categoria</th>
              <th style={{ ...s.th, textAlign: "right" }}>Preço</th>
              <th style={s.th}>Tempo</th>
              <th style={s.th}>Quem faz</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((x) => (
              <tr key={x.id}>
                <td style={s.td}>
                  <strong>{x.nome}</strong>
                  {x.descricao && <div style={{ fontSize: 12, color: "#8A8A8A" }}>{x.descricao}</div>}
                </td>
                <td style={s.td}>{x.categoria || "—"}</td>
                <td style={{ ...s.td, textAlign: "right" }}>{dinheiro(x.preco)}</td>
                <td style={s.td}>{duracaoTexto(x.duracaoMin)}</td>
                <td style={{ ...s.td, fontSize: 13 }}>
                  {quemFaz(x.id).length ? quemFaz(x.id).map((p) => p.nome).join(", ") : <span style={{ color: "#F28B8B" }}>Ninguém (não aparece para agendar)</span>}
                </td>
                <td style={s.td}>
                  <span style={x.ativo ? s.chip("#0F2A1A", "#6FD69A") : s.chip("#1F1F1F", "#A3A3A3")}>{x.ativo ? "Ativo" : "Inativo"}</span>
                </td>
                <td style={s.td}>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button style={s.linkBtn} onClick={() => setForm({ ...x, preco: Number(x.preco), profissionais: [] })}>Editar</button>
                    <button style={{ ...s.linkBtn, color: "#F28B8B" }} onClick={() => excluir(x)}>Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <div style={s.overlay} onMouseDown={(e) => e.target === e.currentTarget && setForm(null)}>
          <div style={{ ...s.modal, maxWidth: 520 }}>
            <h2 style={{ margin: "0 0 14px", fontSize: 20, fontWeight: 800 }}>{form.id ? "Editar serviço" : "Novo serviço"}</h2>
            {erro && <div style={s.errorBox}>{erro}</div>}
            <label style={s.label}>Nome</label>
            <input style={s.input} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            <div className="grade-responsiva" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <label style={s.label}>Categoria</label>
                <input style={s.input} value={form.categoria || ""} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Ex.: Cabelo" />
              </div>
              <div>
                <label style={s.label}>Preço (R$)</label>
                <input style={s.input} value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value })} inputMode="decimal" />
              </div>
              <div>
                <label style={s.label}>Tempo (min)</label>
                <input type="number" min="5" step="5" style={s.input} value={form.duracaoMin} onChange={(e) => setForm({ ...form, duracaoMin: e.target.value })} />
              </div>
            </div>
            <label style={{ ...s.label, marginTop: 12 }}>Descrição</label>
            <textarea style={{ ...s.input, minHeight: 60 }} value={form.descricao || ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            {!form.id && profissionais.length > 0 && (
              <>
                <label style={{ ...s.label, marginTop: 12 }}>Quem faz este serviço</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {profissionais.filter((p) => p.ativo).map((p) => (
                    <label key={p.id} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13.5, cursor: "pointer", padding: "5px 10px", borderRadius: 999, border: "1px solid #2E2E2E" }}>
                      <input
                        type="checkbox"
                        checked={form.profissionais.includes(p.id)}
                        onChange={(e) => setForm({ ...form, profissionais: e.target.checked ? [...form.profissionais, p.id] : form.profissionais.filter((x) => x !== p.id) })}
                        style={{ accentColor: s.OURO }}
                      />
                      {p.nome}
                    </label>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: "#8A8A8A", margin: "6px 0 0" }}>Depois, ajuste por profissional (inclusive tempo próprio) em Profissionais.</p>
              </>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 14, cursor: "pointer" }}>
              <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} style={{ accentColor: s.OURO }} />
              Ativo (aparece para agendamento e no WhatsApp)
            </label>
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
