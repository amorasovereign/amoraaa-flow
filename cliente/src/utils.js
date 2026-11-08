export const dinheiro = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export function hojeISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export const dataBR = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : "");

export function diaSemana(iso) {
  return new Date(`${iso}T12:00:00`).getDay();
}

export function somarDias(iso, n) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export const duracaoTexto = (min) => {
  const h = Math.floor((min || 0) / 60);
  const m = (min || 0) % 60;
  return h ? `${h}h${m ? String(m).padStart(2, "0") : ""}` : `${m} min`;
};

export const telefoneTexto = (t) => {
  let d = String(t || "").replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t || "";
};

export const erroApi = (e, padrao) => e?.response?.data?.error || e?.response?.data?.mensagem || padrao;

// Último dia do mês de uma data ("AAAA-MM-DD" ou "AAAA-MM")
export function fimDoMes(iso) {
  const [a, m] = String(iso).split("-").map(Number);
  return `${a}-${String(m).padStart(2, "0")}-${String(new Date(a, m, 0).getDate()).padStart(2, "0")}`;
}
