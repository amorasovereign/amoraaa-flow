// Estilos compartilhados: identidade Amora Flow (tinta, prata e verde-fluxo).
export const OURO = "#49C2A0";
export const OURO_CLARO = "#0F2B24";
export const OURO_ESCURO = "#7CE0C4";
export const AÇO = "#3E7FB5";
export const PRATA = "linear-gradient(135deg, #EAEDF1 0%, #8992A1 45%, #CBD1D8 70%, #5B6472 100%)";
export const FONTE_MARCA = '"Unbounded", "Manrope", sans-serif';
export const FONTE_DADO = '"JetBrains Mono", ui-monospace, monospace';

export const page = { padding: "28px 24px 40px", maxWidth: 1240, margin: "0 auto" };
export const headerRow = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" };
export const title = { fontSize: 26, fontWeight: 600, margin: 0, letterSpacing: "0.01em", color: "#E7E9EC", fontFamily: FONTE_MARCA };
export const subtitle = { fontSize: 14, color: "#9AA0AA", margin: "6px 0 0" };

export const card = {
  background: "#13171D",
  borderRadius: 14,
  border: "1px solid #262B33",
  boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
  padding: 20,
};

export const label = {
  display: "block",
  fontSize: 11.5,
  fontWeight: 700,
  color: "#9AA0AA",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 6,
};

export const input = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1.5px solid #262B33",
  fontSize: 14,
  color: "#E7E9EC",
  backgroundColor: "#0D1014",
  outline: "none",
};

export const btnPrimary = {
  padding: "10px 20px",
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(135deg, #7CE0C4 0%, #49C2A0 55%, #2F8F76 100%)",
  color: "#07110E",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "0 4px 14px rgba(73,194,160,0.28)",
  whiteSpace: "nowrap",
};

export const btnSecondary = {
  padding: "10px 18px",
  borderRadius: 10,
  border: "1.5px solid #262B33",
  background: "#13171D",
  color: "#D4D8DD",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export const btnDanger = { ...btnSecondary, color: "#F28B8B", borderColor: "#5A2020" };

export const linkBtn = { border: "none", background: "none", color: "#49C2A0", fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0 };

export const errorBox = { background: "#2E1212", border: "1px solid #5A2020", color: "#F28B8B", padding: "10px 14px", borderRadius: 10, fontSize: 13.5, marginBottom: 14 };
export const successBox = { background: "#0F2A1A", border: "1px solid #1F5A35", color: "#6FD69A", padding: "10px 14px", borderRadius: 10, fontSize: 13.5, marginBottom: 14 };

export const table = { width: "100%", borderCollapse: "collapse", fontSize: 14 };
export const th = { textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "#9AA0AA", textTransform: "uppercase", letterSpacing: "0.06em", padding: "10px 12px", borderBottom: "1px solid #262B33", whiteSpace: "nowrap" };
export const td = { padding: "12px", borderBottom: "1px solid #1C2027", verticalAlign: "top" };

export const STATUS = {
  agendado: { label: "Agendado", bg: "#132A3A", cor: "#7CC4F0" },
  confirmado: { label: "Confirmado", bg: "#0F2B24", cor: "#7CE0C4" },
  concluido: { label: "Concluído", bg: "#0F2A1A", cor: "#6FD69A" },
  cancelado: { label: "Cancelado", bg: "#1F2127", cor: "#9AA0AA" },
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

export const overlay = { position: "fixed", inset: 0, background: "rgba(5,7,9,0.72)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 };
export const modal = { width: "100%", maxWidth: 680, maxHeight: "92vh", overflowY: "auto", background: "#13171D", border: "1px solid #262B33", borderRadius: 16, boxShadow: "0 24px 60px rgba(0,0,0,0.55)", padding: 24 };
