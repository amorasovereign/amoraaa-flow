import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, sessao } from "./services/api";

const Ctx = createContext(null);

// Guarda o usuário logado e o negócio em que ele está trabalhando.
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(!!sessao.token());
  const [negocioId, setNegocioIdState] = useState(sessao.negocioId());

  const setNegocioId = useCallback((id) => {
    sessao.setNegocioId(id || null);
    setNegocioIdState(id ? String(id) : null);
  }, []);

  useEffect(() => {
    if (!sessao.token()) return;
    api
      .get("/auth/me")
      .then((r) => {
        setUsuario(r.data);
        if (r.data.papel !== "admin") setNegocioId(r.data.negocioId);
      })
      .catch(() => sessao.limpar())
      .finally(() => setCarregando(false));
  }, [setNegocioId]);

  const entrar = async (email, senha) => {
    const r = await api.post("/auth/login", { email, senha });
    sessao.setToken(r.data.token);
    setUsuario(r.data.usuario);
    if (r.data.usuario.papel !== "admin") setNegocioId(r.data.usuario.negocioId);
    return r.data.usuario;
  };

  const sair = () => {
    sessao.limpar();
    setUsuario(null);
    setNegocioIdState(null);
    window.location.href = "/login";
  };

  const papel = usuario?.papel;
  const valor = {
    usuario,
    carregando,
    entrar,
    sair,
    negocioId,
    setNegocioId,
    ehAdmin: papel === "admin",
    podeGerir: papel === "admin" || papel === "gestor",
    podeAgendar: papel === "admin" || papel === "gestor" || papel === "atendente",
    ehProfissional: papel === "profissional",
  };
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

export const PAPEIS = {
  admin: "Administrador",
  gestor: "Gestor",
  atendente: "Atendente",
  profissional: "Profissional",
};
