import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { PAPEIS, useAuth } from "../../auth";
import * as s from "../../styles";
import { erroApi } from "../../utils";

const DESCRICAO = {
  admin: "Você: vê e administra todos os negócios.",
  gestor: "Dono/gerente: tudo do próprio negócio (agenda, profissionais, serviços, financeiro, configurações).",
  atendente: "Recepção: agenda, agendamentos e financeiro do próprio negócio.",
  profissional: "Vê só a própria agenda e marca atendimentos como confirmados/concluídos.",
};
const VAZIO = { nome: "", email: "", senha: "", papel: "gestor", negocioId: "", profissionalId: "", ativo: true };

// Acessos ao sistema de todos os negócios. Só o administrador acessa.
export default function Usuarios() {
  const { usuario: eu } = useAuth();
  const [lista, setLista] = useState([]);
  const [negocios, setNegocios] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [form, setForm] = useState(null);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const carregar = () =>
    api
      .get("/admin/usuarios", { params: { negocioId: filtro || undefined } })
      .then((r) => setLista(r.data || []))
      .catch(() => setErro("Não foi possível carregar os acessos."));
  useEffect(() => {
    carregar();
  }, [filtro]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    api.get("/admin/negocios").then((r) => setNegocios(r.data || [])).catch(() => {});
  }, []);
  useEffect(() => {
    if (!sucesso) return;
    const t = setTimeout(() => setSucesso(""), 4000);
    return () => clearTimeout(t);
  }, [sucesso]);

  // Profissionais do negócio escolhido no formulário (para o papel "profissional")
  useEffect(() => {
    if (!form?.negocioId) return setProfissionais([]);
    api.get("/profissionais", { headers: { "x-negocio-id": form.negocioId } }).then((r) => setProfissionais(r.data || [])).catch(() => setProfissionais([]));
  }, [form?.negocioId]);

  const salvar = async () => {
    setErro("");
    const corpo = { ...form, negocioId: form.negocioId ? Number(form.negocioId) : null, profissionalId: form.profissionalId ? Number(form.profissionalId) : null };
    if (form.id && !corpo.senha) delete corpo.senha;
    try {
      if (form.id) await api.put(`/admin/usuarios/${form.id}`, corpo);
      else await api.post("/admin/usuarios", corpo);
      setSucesso(form.id ? "Acesso atualizado." : `Acesso criado. Envie ao cliente: ${form.email} / a senha definida.`);
      setForm(null);
      carregar();
    } catch (e) {
      setErro(erroApi(e, "Não foi possível salvar."));
    }
  };

  const excluir = async (u) => {
    if (!window.confirm(`Excluir o acesso de ${u.nome}?`)) return;
    try {
      await api.delete(`/admin/usuarios/${u.id}`);
      carregar();
    } catch (e) {
      setErro(erroApi(e, "Não foi possível excluir."));
    }
  };

  const gerarSenha = () => setForm((f) => ({ ...f, senha: Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6).toUpperCase() }));

  return (
    <div style={s.page}>
      <div style={s.headerRow}>
        <div>
          <h1 style={s.title}>Acessos</h1>
          <p style={s.subtitle}>Quem entra no sistema e o que cada um pode ver. Cada acesso enxerga só o próprio negócio.</p>
        </div>
        <button style={s.btnPrimary} onClick={() => setForm({ ...VAZIO, negocioId: filtro })}>+ Novo acesso</button>
      </div>

      {sucesso && <div style={s.successBox}>{sucesso}</div>}
      {erro && !form && <div style={s.errorBox}>{erro}</div>}

      <div style={{ ...s.card, marginBottom: 16 }}>
        <label style={s.label}>Negócio</label>
        <select style={s.input} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="">Todos</option>
          {negocios.map((n) => (
            <option key={n.id} value={n.id}>{n.nome}</option>
          ))}
        </select>
      </div>

      <div style={{ ...s.card, padding: 8, overflowX: "auto" }}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Nome</th>
              <th style={s.th}>E-mail</th>
              <th style={s.th}>Papel</th>
              <th style={s.th}>Negócio</th>
              <th style={s.th}>Último acesso</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((u) => (
              <tr key={u.id}>
                <td style={s.td}>
                  <strong>{u.nome}</strong>
                  {u.Profissional && <div style={{ fontSize: 12, color: "#6E7482" }}>Profissional: {u.Profissional.nome}</div>}
                </td>
                <td style={s.td}>{u.email}</td>
                <td style={s.td}>{PAPEIS[u.papel]}</td>
                <td style={s.td}>{u.Negocio?.nome || (u.papel === "admin" ? "Todos" : "—")}</td>
                <td style={s.td}>{u.ultimoAcesso ? new Date(u.ultimoAcesso).toLocaleString("pt-BR") : "nunca"}</td>
                <td style={s.td}>
                  <span style={u.ativo ? s.chip("#0F2A1A", "#6FD69A") : s.chip("#1C2027", "#9AA0AA")}>{u.ativo ? "Ativo" : "Bloqueado"}</span>
                </td>
                <td style={s.td}>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button style={s.linkBtn} onClick={() => setForm({ ...u, senha: "", negocioId: u.negocioId ? String(u.negocioId) : "", profissionalId: u.profissionalId ? String(u.profissionalId) : "" })}>Editar</button>
                    {u.id !== eu?.id && <button style={{ ...s.linkBtn, color: "#F28B8B" }} onClick={() => excluir(u)}>Excluir</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <div style={s.overlay} onMouseDown={(e) => e.target === e.currentTarget && setForm(null)}>
          <div style={{ ...s.modal, maxWidth: 540 }}>
            <h2 style={{ margin: "0 0 14px", fontSize: 20, fontWeight: 800 }}>{form.id ? "Editar acesso" : "Novo acesso"}</h2>
            {erro && <div style={s.errorBox}>{erro}</div>}
            <div className="grade-responsiva" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={s.label}>Nome</label>
                <input style={s.input} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div>
                <label style={s.label}>E-mail (login)</label>
                <input type="email" style={s.input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <label style={{ ...s.label, marginTop: 12 }}>Papel</label>
            <select style={s.input} value={form.papel} onChange={(e) => setForm({ ...form, papel: e.target.value })}>
              {Object.entries(PAPEIS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <p style={{ fontSize: 12, color: "#6E7482", margin: "6px 0 0" }}>{DESCRICAO[form.papel]}</p>
            {form.papel !== "admin" && (
              <>
                <label style={{ ...s.label, marginTop: 12 }}>Negócio</label>
                <select style={s.input} value={form.negocioId} onChange={(e) => setForm({ ...form, negocioId: e.target.value, profissionalId: "" })}>
                  <option value="">— escolha —</option>
                  {negocios.map((n) => (
                    <option key={n.id} value={n.id}>{n.nome}</option>
                  ))}
                </select>
              </>
            )}
            {form.papel === "profissional" && (
              <>
                <label style={{ ...s.label, marginTop: 12 }}>Qual profissional</label>
                <select style={s.input} value={form.profissionalId} onChange={(e) => setForm({ ...form, profissionalId: e.target.value })}>
                  <option value="">— escolha —</option>
                  {profissionais.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </>
            )}
            <label style={{ ...s.label, marginTop: 12 }}>{form.id ? "Nova senha (vazio = manter)" : "Senha"}</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input style={s.input} value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} placeholder="mínimo 6 caracteres" />
              <button type="button" style={s.btnSecondary} onClick={gerarSenha}>Gerar</button>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 14, cursor: "pointer" }}>
              <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} style={{ accentColor: s.OURO }} />
              Acesso ativo
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
