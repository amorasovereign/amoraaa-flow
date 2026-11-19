# Materiais de marketing — Amora Flow

Nenhuma peça traz preços.

- `pdf/Amora-Flow-Pitch.pdf`: pitch com 10 slides.
- `pdf/Amora-Flow-Apresentacao-Completa.pdf`: apresentação institucional com 20 slides.
- `instagram/feed/`: 8 posts em 1080×1350.
- `instagram/stories/`: 6 stories em 1080×1920.

## Editar e gerar de novo

Os textos e o layout ficam em `fonte/` (`pitch.html`, `apresentacao.html`, `feed.html`, `stories.html`). As cores e os componentes estão em `marca.css`, `deck.css` e `social.css`.

O gerador precisa do Google Chrome instalado em `/Applications`. Para gerar tudo:

```bash
cd marketing/fonte
npm install
npm run gerar
```

Para gerar uma peça só, use `node gerar.mjs pitch`, `apresentacao`, `feed` ou `stories`.

Os prints em `fonte/img/` são telas reais do app com dados de demonstração. Os valores em R$ foram escondidos antes da captura.
