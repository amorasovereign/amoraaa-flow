import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { PAPEIS, useAuth } from "../auth";
import * as s from "../styles";
import { erroApi } from "../utils";
import { Icone, LogoIcone, Logotipo } from "./Marca";

// Cabeçalho preto com a marca Amora Studio e menu lateral recolhível.
// O admin escolhe o negócio no cabeçalho; os demais veem só o próprio.
export default function Layout() {
  const { usuario, sair, ehAdmin, podeGerir, podeAgendar, negocioId, setNegocioId } = useAuth();
  const navegar = useNavigate();
  const [recolhido, setRecolhido] = useState(() => {
    try {
      return localStorage.getItem("agenda.menuRecolhido") === "1";
    } catch {
      return false;
    }
  });
  const [negocios, setNegocios] = useState([]);
  const [nomeNegocio, setNomeNegocio] = useState("");
  const [menuUsuario, setMenuUsuario] = useState(false);
  const [trocarSenha, setTrocarSenha] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("agenda.menuRecolhido", recolhido ? "1" : "0");
    } catch {
      /* sem localStorage */
    }
  }, [recolhido]);

  useEffect(() => {
    if (ehAdmin) api.get("/admin/negocios").then((r) => setNegocios(r.data || [])).catch(() => {});
  }, [ehAdmin, negocioId]);

  useEffect(() => {
    if (!negocioId) return setNomeNegocio("");
    api.get("/negocio").then((r) => setNomeNegocio(r.data?.nome || "")).catch(() => setNomeNegocio(""));
  }, [negocioId]);

  const MENU = [
    { to: "/", label: "Agenda", icone: "agenda", end: true, ver: !!negocioId },
    { to: "/agendamentos", label: "Agendamentos", icone: "lista", ver: !!negocioId },
    { to: "/financeiro", label: "Financeiro", icone: "dinheiro", ver: !!negocioId && podeAgendar },
    { to: "/profissionais", label: "Profissionais", icone: "pessoas", ver: !!negocioId && podeGerir },
    { to: "/servicos", label: "Serviços", icone: "tesoura", ver: !!negocioId && podeGerir },
    { to: "/configuracoes", label: "Configurações", icone: "ajustes", ver: !!negocioId && podeGerir },
    { secao: "Administração", ver: ehAdmin },
    { to: "/admin/negocios", label: "Negócios", icone: "predio", ver: ehAdmin },
    { to: "/admin/usuarios", label: "Acessos", icone: "chave", ver: ehAdmin },
  ].filter((m) => m.ver);

  const escolherNegocio = (id) => {
    setNegocioId(id || null);
    navegar(id ? "/" : "/admin/negocios");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={S.header}>
        <button type="button" onClick={() => setRecolhido((v) => !v)} style={S.hamburguer} aria-label="Menu"><Icone nome="menu" tamanho={20} /></button>
        <LogoIcone tamanho={40} />
        <div className="esconde-celular" style={{ paddingRight: 14, marginRight: 2, borderRight: "1px solid #2E2E2E" }}><Logotipo tamanho={15} /></div>
        <div style={{ minWidth: 0 }} className={ehAdmin ? "esconde-celular" : ""}>
          <div style={{ fontWeight: 700, fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {nomeNegocio || (ehAdmin ? "Painel do administrador" : "Agenda")}
          </div>
          <div style={{ fontSize: 12, color: "#A3A3A3" }}>Agenda, profissionais e financeiro</div>
        </div>

        {ehAdmin && (
          <select
            value={negocioId || ""}
            onChange={(e) => escolherNegocio(e.target.value)}
            style={{ ...s.input, width: "min(260px, 48vw)", marginLeft: 4, height: 38, padding: "6px 12px", background: "#0F0F0F", border: "1.5px solid #2E2E2E" }}
            title="Negócio em que você está trabalhando"
          >
            <option value="">— Escolha um negócio —</option>
            {negocios.map((n) => (
              <option key={n.id} value={n.id}>{n.nome}{n.ativo ? "" : " (inativo)"}</option>
            ))}
          </select>
        )}

        <div style={{ marginLeft: "auto", position: "relative" }}>
          <button type="button" onClick={() => setMenuUsuario((v) => !v)} style={S.usuario}>
            <span style={S.avatar}>{(usuario?.nome || "?").slice(0, 1).toUpperCase()}</span>
            <span className="esconde-celular" style={{ textAlign: "left", lineHeight: 1.15 }}>
              <span style={{ display: "block", fontWeight: 700, fontSize: 13.5 }}>{usuario?.nome}</span>
              <span style={{ display: "block", fontSize: 11.5, color: "#A3A3A3" }}>{PAPEIS[usuario?.papel]}</span>
            </span>
          </button>
          {menuUsuario && (
            <div style={S.menuUsuario} onMouseLeave={() => setMenuUsuario(false)}>
              <div style={{ padding: "8px 12px", fontSize: 12.5, color: "#A3A3A3", borderBottom: "1px solid #1F1F1F" }}>{usuario?.email}</div>
              <button type="button" style={S.itemMenu} onClick={() => { setMenuUsuario(false); setTrocarSenha(true); }}>Trocar senha</button>
              <button type="button" style={{ ...S.itemMenu, color: "#F28B8B" }} onClick={sair}>Sair</button>
            </div>
          )}
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <nav style={{ ...S.sidebar, width: recolhido ? 64 : 220 }}>
          {MENU.map((m, i) =>
            m.secao ? (
              !recolhido && <div key={`s${i}`} style={S.secao}>{m.secao}</div>
            ) : (
              <NavLink
                key={m.to}
                to={m.to}
                end={m.end}
                title={m.label}
                style={({ isActive }) => ({ ...S.item, ...(isActive ? S.itemAtivo : {}), justifyContent: recolhido ? "center" : "flex-start" })}
              >
                <Icone nome={m.icone} tamanho={19} />
                {!recolhido && <span>{m.label}</span>}
              </NavLink>
            )
          )}
        </nav>
        <main style={{ flex: 1, minWidth: 0 }}>
          <Outlet key={negocioId || "sem-negocio"} />
        </main>
      </div>

      {trocarSenha && <TrocarSenha onClose={() => setTrocarSenha(false)} />}
    </div>
  );
}

function TrocarSenha({ onClose }) {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);
  const salvar = async () => {
    setErro("");
    try {
      await api.put("/auth/senha", { atual, nova });
      setOk(true);
      setTimeout(onClose, 1200);
    } catch (e) {
      setErro(erroApi(e, "Não foi possível trocar a senha."));
    }
  };
  return (
    <div style={s.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...s.modal, maxWidth: 400 }}>
        <h2 style={{ margin: "0 0 14px", fontSize: 20, fontWeight: 800 }}>Trocar senha</h2>
        {erro && <div style={s.errorBox}>{erro}</div>}
        {ok && <div style={s.successBox}>Senha alterada.</div>}
        <label style={s.label}>Senha atual</label>
        <input type="password" style={s.input} value={atual} onChange={(e) => setAtual(e.target.value)} />
        <label style={{ ...s.label, marginTop: 12 }}>Nova senha (mínimo 6 caracteres)</label>
        <input type="password" style={s.input} value={nova} onChange={(e) => setNova(e.target.value)} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button style={s.btnSecondary} onClick={onClose}>Cancelar</button>
          <button style={s.btnPrimary} onClick={salvar}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

const S = {
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 20px",
    color: "#F2F2F2",
    background: "#000000",
    borderBottom: "1px solid #262626",
    boxShadow: "inset 0 -1px 0 rgba(224,162,58,0.25)",
    position: "sticky",
    top: 0,
    zIndex: 50,
  },
  hamburguer: { border: "1px solid #2E2E2E", background: "#0F0F0F", color: "#D4D4D4", width: 40, height: 40, borderRadius: 10, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  logo: { width: 38, height: 38, borderRadius: 12, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0 },
  usuario: { display: "flex", alignItems: "center", gap: 10, border: "1px solid #2E2E2E", background: "#0F0F0F", color: "#F2F2F2", padding: "5px 12px 5px 5px", borderRadius: 999, cursor: "pointer" },
  avatar: { width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #FFD98A, #E0A23A 55%, #B87A1E)", color: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 },
  menuUsuario: { position: "absolute", right: 0, top: 46, background: "#141414", border: "1px solid #2E2E2E", borderRadius: 12, boxShadow: "0 12px 32px rgba(0,0,0,0.6)", minWidth: 220, overflow: "hidden", zIndex: 60 },
  itemMenu: { display: "block", width: "100%", textAlign: "left", border: "none", background: "#141414", padding: "10px 12px", fontSize: 14, color: "#D4D4D4", cursor: "pointer" },
  sidebar: {
    flexShrink: 0,
    background: "#0A0A0A",
    borderRight: "1px solid #262626",
    padding: "16px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    transition: "width 0.2s ease",
    position: "sticky",
    top: 65,
    height: "calc(100vh - 65px)",
  },
  secao: { fontSize: 11, fontWeight: 700, color: "#8A8A8A", textTransform: "uppercase", letterSpacing: "0.06em", padding: "14px 12px 4px" },
  item: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#BDBDBD", textDecoration: "none" },
  itemAtivo: { background: "#1A160D", color: "#F0C46A", boxShadow: "inset 2px 0 0 #E0A23A" },
};
