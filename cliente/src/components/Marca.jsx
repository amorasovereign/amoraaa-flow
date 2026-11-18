// Identidade Amora Flow: ícone (lobo em brasão), logotipo e ícones de traço.
// Sem emojis: todo ícone do sistema sai daqui, em SVG.

export function LogoIcone({ tamanho = 40, titulo = "Amora Flow" }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 100 100" role="img" aria-label={titulo} style={{ flexShrink: 0, display: "block" }}>
      <path d="M50 6 L92 20 L92 50 C92 74 74 90 50 96 C26 90 8 74 8 50 L8 20 Z" fill="none" stroke="#AEB5BF" strokeWidth="3" />
      <path d="M38 28 L45 50 L50 36 Z" fill="#49C2A0" />
      <path d="M62 28 L55 50 L50 36 Z" fill="#49C2A0" />
      <path
        d="M50 34 C58 34 64 40 65 50 C66 58 63 64 58 68 L60 76 L52 72 L50 76 L48 72 L40 76 L42 68 C37 64 34 58 35 50 C36 40 42 34 50 34 Z"
        fill="#3E7FB5"
      />
      <circle cx="44" cy="52" r="1.6" fill="#E7E9EC" />
      <circle cx="56" cy="52" r="1.6" fill="#E7E9EC" />
    </svg>
  );
}

// "AMORA FLOW" — wordmark geométrico, "FLOW" sempre em verde-fluxo.
export function Logotipo({ tamanho = 18, subtitulo = "FLOW" }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: tamanho * 0.28, lineHeight: 1, fontFamily: '"Unbounded", "Manrope", sans-serif' }} aria-label="Amora Flow">
      <span aria-hidden="true" style={{ fontSize: tamanho, fontWeight: 700, letterSpacing: "0.02em", color: "#E7E9EC" }}>
        AMORA
      </span>
      {subtitulo && (
        <span aria-hidden="true" style={{ fontSize: tamanho * 0.86, fontWeight: 700, letterSpacing: "0.02em", color: "#49C2A0" }}>
          {subtitulo}
        </span>
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
  email: <><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="m3.5 6.5 8.5 7 8.5-7" /></>,
  cadeado: <><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" /><path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5" /></>,
  olho: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
  olhoFechado: <><path d="M3.5 3.5 20.5 20.5" /><path d="M9.9 5.3A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a14.4 14.4 0 0 1-3.1 3.9M6.8 6.8C4 8.6 2 12 2 12s3.5 7 10 7a9.9 9.9 0 0 0 3.3-.6" /><path d="M9.5 9.8a3 3 0 0 0 4.2 4.2" /></>,
};

export function Icone({ nome, tamanho = 18, cor = "currentColor", style }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, display: "inline-block", verticalAlign: "-0.2em", ...style }}>
      {CAMINHOS[nome]}
    </svg>
  );
}
