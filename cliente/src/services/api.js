import axios from "axios";

// Token do login e negócio selecionado (o admin escolhe; os demais têm um só)
const CHAVE_TOKEN = "agenda.token";
const CHAVE_NEGOCIO = "agenda.negocioId";

const ler = (k) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const gravar = (k, v) => {
  try {
    if (v === null || v === undefined) localStorage.removeItem(k);
    else localStorage.setItem(k, String(v));
  } catch {
    /* sem localStorage */
  }
};

export const sessao = {
  token: () => ler(CHAVE_TOKEN),
  setToken: (t) => gravar(CHAVE_TOKEN, t),
  negocioId: () => ler(CHAVE_NEGOCIO),
  setNegocioId: (id) => gravar(CHAVE_NEGOCIO, id),
  limpar: () => {
    gravar(CHAVE_TOKEN, null);
    gravar(CHAVE_NEGOCIO, null);
  },
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
});

api.interceptors.request.use((config) => {
  const token = sessao.token();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const negocioId = sessao.negocioId();
  if (negocioId) config.headers["x-negocio-id"] = negocioId;
  return config;
});

// Sessão expirada: volta para o login
api.interceptors.response.use(
  (r) => r,
  (e) => {
    if (e?.response?.status === 401 && !String(e.config?.url || "").includes("/auth/login")) {
      sessao.limpar();
      if (window.location.pathname !== "/login") window.location.href = "/login";
    }
    return Promise.reject(e);
  }
);
