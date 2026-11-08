import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/api";
import { useAuth } from "../../auth";
import * as s from "../../styles";
import { erroApi, telefoneTexto } from "../../utils";

const VAZIO = { nome: "", tipo: "", instanciaWhatsapp: "", telefoneDono: "", nomeAtendente: "Bia", ativo: true };
const TIPOS = ["Salão de beleza", "Barbearia", "Manicure e pedicure", "Clínica de saúde", "Clínica de estética", "Clínica odontológica", "Pet shop", "Studio de pilates", "Estúdio de tatuagem", "Outro"];

// Todos os negócios (clientes do sistema). Só o administrador acessa.
export default function Negocios() {
  const { setNegocioId } = useAuth();
  const navegar = useNavigate();
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState(null);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [busca, setBusca] = useState("");

  const carregar = () => api.get("/admin/negocios").then((r) => setLista(r.data || [])).catch(() => setErro("Não foi possível carregar os negócios."));
  useEffect(() => {
    carregar();
  }, []);
  useEffect(() => {
    if (!sucesso) return;
    const t = setTimeout(() => setSucesso(""), 4000);
    return () => clearTimeout(t);
  }, [sucesso]);

  const salvar = async () => {
    setErro("");
    try {
      if (form.id) await api.put(`/admin/negocios/${form.id}`, form);
      else await api.post("/admin/negocios", form);
      setSucesso(form.id ? "Negócio atualizado." : "Negócio criado. Agora cadastre os profissionais, os serviços e um acesso para o cliente.");
      setForm(null);
      carregar();
    } catch (e) {
      setErro(erroApi(e, "Não foi possível salvar."));
    }
  };

  const excluir = async (n) => {
    if (!window.confirm(`Excluir "${n.nome}"? Só é possível se não houver agendamentos.`)) return;
    try {
      await api.delete(`/admin/negocios/${n.id}`);
      setSucesso("Negócio excluído.");
      carregar();
    } catch (e) {
      setErro(erroApi(e, "Não foi possível excluir."));
    }
  };

  const entrar = (n) => {
    setNegocioId(n.id);
    navegar("/");
  };

  const termo = busca.trim().toLowerCase();
  const filtrados = termo ? lista.filter((n) => `${n.nome} ${n.tipo || ""} ${n.instanciaWhatsapp || ""}`.toLowerCase().includes(termo)) : lista;

  return (
    <div style={s.page}>
      <div style={s.headerRow}>
        <div>
          <h1 style={s.title}>Negócios</h1>
          <p style={s.subtitle}>{lista.length} negócio(s) · {lista.filter((n) => n.ativo).length} ativo(s). Clique em “Abrir” para trabalhar dentro de um deles.</p>
        </div>
        <button style={s.btnPrimary} onClick={() => setForm({ ...VAZIO })}>+ Novo negócio</button>
      </div>

      {sucesso && <div style={s.successBox}>{sucesso}</div>}
      {erro && !form && <div style={s.errorBox}>{erro}</div>}

      <div style={{ ...s.card, marginBottom: 16 }}>
        <input style={s.input} value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, tipo ou instância..." />
      </div>

      <div style={{ ...s.card, padding: 8, overflowX: "auto" }}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Negócio</th>
              <th style={s.th}>Instância WhatsApp</th>
              <th style={s.th}>Dono</th>
              <th style={s.th}>Profissionais</th>
              <th style={s.th}>Serviços</th>
              <th style={s.th}>Acessos</th>
              <th style={s.th}>Hoje</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((n) => (
              <tr key={n.id}>
                <td style={s.td}>
                  <strong>{n.nome}</strong>
                  <div style={{ fontSize: 12, color: "#8A8A8A" }}>{n.tipo || "—"}</div>
                </td>
                <td style={s.td}>{n.instanciaWhatsapp ? <code style={{ fontSize: 12.5 }}>{n.instanciaWhatsapp}</code> : <span style={{ color: "#F28B8B", fontSize: 12.5 }}>não ligada</span>}</td>
                <td style={s.td}>{telefoneTexto(n.telefoneDono) || "—"}</td>
                <td style={s.td}>{n.profissionais}</td>
                <td style={s.td}>{n.servicos}</td>
                <td style={s.td}>{n.usuarios}</td>
                <td style={s.td}>{n.agendamentosHoje}</td>
                <td style={s.td}>
                  <span style={n.ativo ? s.chip("#0F2A1A", "#6FD69A") : s.chip("#1F1F1F", "#A3A3A3")}>{n.ativo ? "Ativo" : "Inativo"}</span>
                </td>
                <td style={s.td}>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button style={{ ...s.linkBtn, color: "#6FD69A" }} onClick={() => entrar(n)}>Abrir</button>
                    <button style={s.linkBtn} onClick={() => setForm({ ...n, telefoneDono: n.telefoneDono || "", instanciaWhatsapp: n.instanciaWhatsapp || "", tipo: n.tipo || "" })}>Editar</button>
                    <button style={{ ...s.linkBtn, color: "#F28B8B" }} onClick={() => excluir(n)}>Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <div style={s.overlay} onMouseDown={(e) => e.target === e.currentTarget && setForm(null)}>
          <div style={{ ...s.modal, maxWidth: 560 }}>
            <h2 style={{ margin: "0 0 14px", fontSize: 20, fontWeight: 800 }}>{form.id ? "Editar negócio" : "Novo negócio"}</h2>
            {erro && <div style={s.errorBox}>{erro}</div>}
            <label style={s.label}>Nome</label>
            <input style={s.input} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            <div className="grade-responsiva" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <label style={s.label}>Tipo</label>
                <select style={s.input} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                  <option value="">—</option>
                  {TIPOS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={s.label}>Nome da atendente virtual</label>
                <input style={s.input} value={form.nomeAtendente} onChange={(e) => setForm({ ...form, nomeAtendente: e.target.value })} />
              </div>
              <div>
                <label style={s.label}>Instância da Evolution (WhatsApp)</label>
                <input style={s.input} value={form.instanciaWhatsapp} onChange={(e) => setForm({ ...form, instanciaWhatsapp: e.target.value })} placeholder="ex.: salao-da-maria" />
              </div>
              <div>
                <label style={s.label}>WhatsApp do dono</label>
                <input style={s.input} value={form.telefoneDono} onChange={(e) => setForm({ ...form, telefoneDono: e.target.value })} placeholder="5581999999999" />
              </div>
            </div>
            <p style={{ fontSize: 12, color: "#8A8A8A", margin: "8px 0 0" }}>A instância precisa ter exatamente o mesmo nome criado na Evolution API. É por ela que o n8n sabe de qual negócio é cada mensagem.</p>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 14, cursor: "pointer" }}>
              <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} style={{ accentColor: s.OURO }} />
              Ativo (desativado: ninguém do negócio entra e o WhatsApp para de agendar)
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
