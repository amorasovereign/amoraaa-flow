import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import * as s from "../styles";
import { erroApi } from "../utils";
import { Icone, LogoIcone, Logotipo } from "../components/Marca";

const RECURSOS = [
  { icone: "agenda", texto: "Agenda do dia sempre em dia, sem retrabalho" },
  { icone: "ok", texto: "Confirmação e lembrete do cliente em automático" },
  { icone: "dinheiro", texto: "Financeiro e comissões calculados sozinhos" },
];

export default function Login() {
  const { usuario, entrar } = useAuth();
  const navegar = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to="/" replace />;

  const enviar = async (e) => {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      const u = await entrar(email, senha);
      navegar(u.papel === "admin" ? "/admin/negocios" : "/", { replace: true });
    } catch (err) {
      setErro(erroApi(err, "Não foi possível entrar."));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="af-pagina" style={EST.pagina}>
      <style>{CSS}</style>

      <section className="af-painel-marca" style={EST.painelMarca}>
        <div style={EST.auraVerde} />
        <div style={EST.auraAzul} />

        <div style={EST.marcaTopo}>
          <LogoIcone tamanho={44} />
          <Logotipo tamanho={18} />
        </div>

        <div style={EST.marcaConteudo}>
          <h1 style={EST.tituloMarca}>
            O fluxo contínuo entre a agenda e quem ela atende.
          </h1>
          <p style={EST.textoMarca}>
            Um só lugar para marcar, confirmar e acompanhar cada atendimento do seu negócio.
          </p>
          <ul style={EST.listaRecursos}>
            {RECURSOS.map((r) => (
              <li key={r.icone} style={EST.itemRecurso}>
                <span style={EST.iconeRecurso}><Icone nome={r.icone} tamanho={16} cor="#7CE0C4" /></span>
                {r.texto}
              </li>
            ))}
          </ul>
        </div>

        <div style={EST.rodapeMarca}>AMORA FLOW © {new Date().getFullYear()}</div>
      </section>

      <section style={EST.painelForm}>
        <form onSubmit={enviar} style={EST.cartao} className="af-cartao">
          <div className="af-cartao-marca-mobile" style={EST.marcaMobile}>
            <LogoIcone tamanho={40} />
            <Logotipo tamanho={17} />
          </div>

          <h2 style={EST.tituloForm}>Bem-vindo de volta</h2>
          <p style={{ ...s.subtitle, marginBottom: 24 }}>Use o e-mail e a senha que você recebeu.</p>

          {erro && <div style={s.errorBox}>{erro}</div>}

          <label style={s.label}>E-mail</label>
          <div className="af-campo" style={EST.campo}>
            <Icone nome="email" tamanho={17} cor="#6E7482" />
            <input
              className="af-input"
              style={EST.input}
              type="email"
              autoComplete="username"
              placeholder="voce@seudominio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <label style={{ ...s.label, marginTop: 16 }}>Senha</label>
          <div className="af-campo" style={EST.campo}>
            <Icone nome="cadeado" tamanho={17} cor="#6E7482" />
            <input
              className="af-input"
              style={EST.input}
              type={verSenha ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setVerSenha((v) => !v)}
              style={EST.botaoOlho}
              aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
              title={verSenha ? "Ocultar senha" : "Mostrar senha"}
            >
              <Icone nome={verSenha ? "olhoFechado" : "olho"} tamanho={17} cor="#9AA0AA" />
            </button>
          </div>

          <button type="submit" disabled={enviando} className="af-botao" style={{ ...s.btnPrimary, width: "100%", marginTop: 24, opacity: enviando ? 0.7 : 1 }}>
            {enviando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </div>
  );
}

const CSS = `
  .af-campo { transition: border-color .15s ease, box-shadow .15s ease; }
  .af-campo:focus-within { border-color: #49C2A0 !important; box-shadow: 0 0 0 3px rgba(73,194,160,0.16); }
  .af-input:focus { outline: none; }
  .af-botao { transition: transform .12s ease, box-shadow .12s ease; }
  .af-botao:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(73,194,160,0.32); }
  .af-botao:active:not(:disabled) { transform: translateY(0); }
  .af-cartao-marca-mobile { display: none; }
  @media (max-width: 880px) {
    .af-pagina { grid-template-columns: 1fr !important; }
    .af-painel-marca { display: none !important; }
    .af-cartao-marca-mobile { display: flex !important; }
  }
`;

const EST = {
  pagina: { minHeight: "100vh", display: "grid", gridTemplateColumns: "minmax(0,1.05fr) minmax(0,1fr)" },
  painelMarca: {
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "40px 48px",
    background: "#0A0D11",
    borderRight: "1px solid #1C2027",
  },
  auraVerde: { position: "absolute", top: "-18%", left: "-12%", width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle, rgba(73,194,160,0.22) 0%, rgba(73,194,160,0) 70%)" },
  auraAzul: { position: "absolute", bottom: "-20%", right: "-14%", width: 460, height: 460, borderRadius: "50%", background: "radial-gradient(circle, rgba(62,127,181,0.22) 0%, rgba(62,127,181,0) 70%)" },
  marcaTopo: { position: "relative", display: "flex", alignItems: "center", gap: 14 },
  marcaConteudo: { position: "relative", maxWidth: 440 },
  tituloMarca: { fontFamily: '"Unbounded", sans-serif', fontSize: 34, lineHeight: 1.2, fontWeight: 600, color: "#E7E9EC", margin: "0 0 16px" },
  textoMarca: { fontSize: 15.5, lineHeight: 1.6, color: "#9AA0AA", margin: "0 0 28px" },
  listaRecursos: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 14 },
  itemRecurso: { display: "flex", alignItems: "center", gap: 12, fontSize: 14, color: "#C9CDD3" },
  iconeRecurso: { width: 30, height: 30, borderRadius: 9, background: "#0F2B24", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  rodapeMarca: { position: "relative", fontFamily: '"JetBrains Mono", monospace', fontSize: 11.5, letterSpacing: "0.08em", color: "#6E7482" },
  painelForm: { display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#0D1014" },
  cartao: { width: "100%", maxWidth: 380 },
  marcaMobile: { alignItems: "center", gap: 12, marginBottom: 28 },
  tituloForm: { fontFamily: '"Unbounded", sans-serif', fontSize: 22, fontWeight: 600, color: "#E7E9EC", margin: "0 0 6px" },
  campo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0 12px",
    borderRadius: 10,
    border: "1.5px solid #262B33",
    background: "#13171D",
    height: 46,
  },
  input: { flex: 1, border: "none", background: "none", color: "#E7E9EC", fontSize: 14, height: "100%", padding: 0 },
  botaoOlho: { border: "none", background: "none", padding: 4, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 },
};
