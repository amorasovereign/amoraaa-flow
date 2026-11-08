import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import * as s from "../styles";
import { erroApi } from "../utils";
import { LogoIcone, Logotipo } from "../components/Marca";

export default function Login() {
  const { usuario, entrar } = useAuth();
  const navegar = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
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
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "radial-gradient(ellipse at top, #1A160D 0%, #000000 60%)" }}>
      <form onSubmit={enviar} style={{ ...s.card, width: "100%", maxWidth: 400, padding: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginBottom: 22 }}>
          <LogoIcone tamanho={72} />
          <Logotipo tamanho={22} />
        </div>
        <h1 style={{ ...s.title, fontSize: 24 }}>Entrar na agenda</h1>
        <p style={{ ...s.subtitle, marginBottom: 20 }}>Use o e-mail e a senha que você recebeu.</p>
        {erro && <div style={s.errorBox}>{erro}</div>}
        <label style={s.label}>E-mail</label>
        <input style={s.input} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label style={{ ...s.label, marginTop: 14 }}>Senha</label>
        <input style={s.input} type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        <button type="submit" disabled={enviando} style={{ ...s.btnPrimary, width: "100%", marginTop: 20, opacity: enviando ? 0.7 : 1 }}>
          {enviando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
