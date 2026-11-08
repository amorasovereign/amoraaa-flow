// Estilos compartilhados: identidade Amora Studio (preto, prata e dourado).
export const OURO = "#E0A23A";
export const OURO_CLARO = "#2A2110";
export const OURO_ESCURO = "#F0C46A";
export const PRATA = "linear-gradient(135deg, #FFFFFF 0%, #9A9A9A 45%, #E8E8E8 70%, #7C7C7C 100%)";
export const FONTE_MARCA = '"Jura", "Inter", sans-serif';

export const page = { padding: "28px 24px 40px", maxWidth: 1240, margin: "0 auto" };
export const headerRow = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" };
export const title = { fontSize: 26, fontWeight: 500, margin: 0, letterSpacing: "0.04em", color: "#F2F2F2", fontFamily: '"Jura", "Inter", sans-serif' };
export const subtitle = { fontSize: 14, color: "#A3A3A3", margin: "6px 0 0" };

export const card = {
  background: "#141414",
  borderRadius: 16,
  border: "1px solid #262626",
  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
  padding: 20,
};

export const label = {
  display: "block",
  fontSize: 11.5,
  fontWeight: 700,
  color: "#A3A3A3",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: 6,
};

export const input = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1.5px solid #2E2E2E",
  fontSize: 14,
  color: "#F2F2F2",
  backgroundColor: "#0F0F0F",
  outline: "none",
};

export const btnPrimary = {
  padding: "10px 20px",
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(135deg, #FFD98A 0%, #E0A23A 55%, #B87A1E 100%)",
  color: "#0A0A0A",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "0 4px 14px rgba(224,162,58,0.22)",
  whiteSpace: "nowrap",
};

export const btnSecondary = {
  padding: "10px 18px",
  borderRadius: 10,
  border: "1.5px solid #2E2E2E",
  background: "#141414",
  color: "#D4D4D4",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export const btnDanger = { ...btnSecondary, color: "#F28B8B", borderColor: "#5A2020" };

export const linkBtn = { border: "none", background: "none", color: "#E0A23A", fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0 };

export const errorBox = { background: "#2E1212", border: "1px solid #5A2020", color: "#F28B8B", padding: "10px 14px", borderRadius: 10, fontSize: 13.5, marginBottom: 14 };
export const successBox = { background: "#0F2A1A", border: "1px solid #1F5A35", color: "#6FD69A", padding: "10px 14px", borderRadius: 10, fontSize: 13.5, marginBottom: 14 };

export const table = { width: "100%", borderCollapse: "collapse", fontSize: 14 };
export const th = { textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "#A3A3A3", textTransform: "uppercase", letterSpacing: "0.04em", padding: "10px 12px", borderBottom: "1px solid #262626", whiteSpace: "nowrap" };
export const td = { padding: "12px", borderBottom: "1px solid #1F1F1F", verticalAlign: "top" };

export const STATUS = {
  agendado: { label: "Agendado", bg: "#2A2110", cor: "#F0C46A" },
  confirmado: { label: "Confirmado", bg: "#0F2533", cor: "#7CC4F0" },
  concluido: { label: "Concluído", bg: "#0F2A1A", cor: "#6FD69A" },
  cancelado: { label: "Cancelado", bg: "#1F1F1F", cor: "#A3A3A3" },
  faltou: { label: "Faltou", bg: "#2E1212", cor: "#F28B8B" },
};

export const chip = (bg, cor) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  background: bg,
  color: cor,
  whiteSpace: "nowrap",
});

export const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 };
export const modal = { width: "100%", maxWidth: 680, maxHeight: "92vh", overflowY: "auto", background: "#141414", border: "1px solid #2E2E2E", borderRadius: 16, boxShadow: "0 24px 60px rgba(0,0,0,0.6)", padding: 24 };
