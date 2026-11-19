// Logotipo e ícones da Amora Flow (mesmos desenhos de cliente/src/components/Marca.jsx).
const BRASAO = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <path d="M50 6 L92 20 L92 50 C92 74 74 90 50 96 C26 90 8 74 8 50 L8 20 Z" fill="none" stroke="#AEB5BF" stroke-width="3"/>
  <path d="M38 28 L45 50 L50 36 Z" fill="#49C2A0"/><path d="M62 28 L55 50 L50 36 Z" fill="#49C2A0"/>
  <path d="M50 34 C58 34 64 40 65 50 C66 58 63 64 58 68 L60 76 L52 72 L50 76 L48 72 L40 76 L42 68 C37 64 34 58 35 50 C36 40 42 34 50 34 Z" fill="#3E7FB5"/>
  <circle cx="44" cy="52" r="1.6" fill="#E7E9EC"/><circle cx="56" cy="52" r="1.6" fill="#E7E9EC"/></svg>`;

const ICONES = {
  agenda: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  lista: '<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  dinheiro: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>',
  pessoas: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.7 3 2.5 3.5 5.2"/>',
  pessoa: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  tesoura: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.6 7.6 20 18M8.6 16.4 20 6"/>',
  predio: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  celular: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
  bloqueio: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
  ok: '<path d="M20 6 9 17l-5-5"/>',
  cadeado: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5"/>',
  conversa: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/>',
  sino: '<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  lua: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/>',
  raio: '<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>',
  etiqueta: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9Z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  troca: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  grafico: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  nota: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  seta:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  dente: '<path d="M7 3c-2.5 0-4 2-4 4.5 0 3 1.5 4.5 2 7.5.5 3 1 6 2.5 6s1.8-4 2.5-6c.4-1.2 1.6-1.2 2 0 .7 2 1 6 2.5 6s2-3 2.5-6c.5-3 2-4.5 2-7.5C21 5 19.5 3 17 3c-2 0-3 1-5 1S9 3 7 3Z"/>',
  pata: '<circle cx="5.5" cy="10" r="2"/><circle cx="9.5" cy="5.5" r="2"/><circle cx="14.5" cy="5.5" r="2"/><circle cx="18.5" cy="10" r="2"/><path d="M12 11c-3 0-6 4.5-6 7 0 1.7 1.3 2.5 3 2.5 1.2 0 2-.6 3-.6s1.8.6 3 .6c1.7 0 3-.8 3-2.5 0-2.5-3-7-6-7Z"/>',
  coracao: '<path d="M12 20s-7.5-4.6-9.2-9.4C1.6 7 4 4 7 4c2 0 3.6 1.2 5 3 1.4-1.8 3-3 5-3 3 0 5.4 3 4.2 6.6C19.5 15.4 12 20 12 20Z"/>',
  brilho: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  pena: '<path d="M20 4C11 4 6 9 5 19l-1 2M20 4c0 8-5 13-14 14M20 4 9 15"/>',
  corpo: '<circle cx="12" cy="4.5" r="2"/><path d="M5 9h14M12 9v6M12 15l-4 6M12 15l4 6"/>',
};

function montarMarca() {
  document.querySelectorAll("[data-logo]").forEach((el) => {
    el.classList.add("logo");
    el.innerHTML = BRASAO + (el.dataset.logo === "icone" ? "" : "<span><b>AMORA</b> <i>FLOW</i></span>");
  });
  document.querySelectorAll("[data-i]").forEach((el) => {
    el.outerHTML = `<svg class="icone ${el.className}" viewBox="0 0 24 24" aria-hidden="true">${ICONES[el.dataset.i] || ""}</svg>`;
  });
}
montarMarca();
