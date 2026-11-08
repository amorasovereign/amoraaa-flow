// Identidade Amora Studio: ícone (escudo + relógio), logotipo e ícones de traço.
// Sem emojis: todo ícone do sistema sai daqui, em SVG.

let seq = 0;

export function LogoIcone({ tamanho = 40, titulo = "Amora Studio" }) {
  const id = `am${++seq}`;
  const traco = tamanho < 48 ? 1.6 : 1;
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 300 300" role="img" aria-label={titulo} style={{ flexShrink: 0, display: "block" }}>
      <defs>
        <linearGradient id={`${id}p`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.45" stopColor="#9A9A9A" />
          <stop offset="0.7" stopColor="#E8E8E8" />
          <stop offset="1" stopColor="#7C7C7C" />
        </linearGradient>
        <linearGradient id={`${id}o`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFD98A" />
          <stop offset="0.5" stopColor="#E0A23A" />
          <stop offset="1" stopColor="#9C6414" />
        </linearGradient>
      </defs>
      <rect x="10" y="10" width="280" height="280" rx="64" fill="#0F0F0F" stroke={`url(#${id}p)`} strokeWidth={4 * traco} />
      <path d="M90 70 Q150 56 210 70 L210 142 Q210 196 150 228 Q90 196 90 142 Z" fill="none" stroke={`url(#${id}p)`} strokeWidth={6 * traco} />
      <line x1="150" y1="140" x2="128" y2="120" stroke={`url(#${id}p)`} strokeWidth={7 * traco} strokeLinecap="round" />
      <line x1="150" y1="140" x2="176" y2="108" stroke={`url(#${id}o)`} strokeWidth={5 * traco} strokeLinecap="round" />
      <circle cx="150" cy="140" r={7 * traco} fill={`url(#${id}o)`} />
    </svg>
  );
}

// "ΛMORΛ / STUDIO" com o triângulo dourado, como no Amora Sovereign.
export function Logotipo({ tamanho = 18, subtitulo = "STUDIO" }) {
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", lineHeight: 1, fontFamily: '"Jura", "Inter", sans-serif' }} aria-label="Amora Studio">
      <span aria-hidden="true" style={{ fontSize: tamanho, fontWeight: 400, letterSpacing: "0.32em", color: "#EDEDED" }}>
        ΛMORΛ<span style={{ color: "#E0A23A", fontSize: tamanho * 0.45, marginLeft: -tamanho * 0.25, verticalAlign: "top" }}>▲</span>
      </span>
      {subtitulo && (
        <span aria-hidden="true" style={{ fontSize: tamanho * 0.45, letterSpacing: "0.6em", color: "#A3A3A3", marginTop: tamanho * 0.3 }}>{subtitulo}</span>
      )}
    </span>
  );
}

const CAMINHOS = {
  agenda: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  lista: <><path d="M9 6h12M9 12h12M9 18h12" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></>,
  dinheiro: <><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M6 12h.01M18 12h.01" /></>,
  pessoas: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.7 3 2.5 3.5 5.2" /></>,
  pessoa: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>,
  tesoura: <><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M8.6 7.6 20 18M8.6 16.4 20 6" /></>,
  ajustes: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  predio: <><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3" /></>,
  chave: <><circle cx="7.5" cy="15.5" r="4.5" /><path d="m10.7 12.3 9.3-9.3M16 7l3 3M14 9l2 2" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  relogio: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  celular: <><rect x="6" y="2" width="12" height="20" rx="2" /><path d="M11 18h2" /></>,
  nota: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></>,
  bloqueio: <><circle cx="12" cy="12" r="9" /><path d="m5.6 5.6 12.8 12.8" /></>,
  ok: <path d="M20 6 9 17l-5-5" />,
};

export function Icone({ nome, tamanho = 18, cor = "currentColor", style }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, display: "inline-block", verticalAlign: "-0.2em", ...style }}>
      {CAMINHOS[nome]}
    </svg>
  );
}
