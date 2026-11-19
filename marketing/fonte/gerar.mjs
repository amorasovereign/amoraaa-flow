// Gera os PDFs e as imagens do Instagram a partir dos HTML desta pasta.
// Uso: node gerar.mjs   (precisa do Google Chrome e do pacote puppeteer-core)
import puppeteer from "puppeteer-core";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, "..");
const so = process.argv[2]; // opcional: pitch | apresentacao | feed | stories | previa
const navegador = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
});

async function abrir(arquivo, largura, altura) {
  const p = await navegador.newPage();
  await p.setViewport({ width: largura, height: altura, deviceScaleFactor: 1 });
  await p.goto(pathToFileURL(path.join(aqui, arquivo)).href, { waitUntil: "networkidle0" });
  await p.evaluate(() => document.fonts.ready);
  return p;
}

async function pdf(arquivo, saida) {
  const p = await abrir(arquivo, 1920, 1080);
  await p.pdf({ path: path.join(raiz, "pdf", saida), width: "1920px", height: "1080px", printBackground: true, preferCSSPageSize: true });
  console.log("pdf/" + saida);
  await p.close();
}

async function quadros(arquivo, pasta, prefixo, largura, altura, escala = 1) {
  const p = await abrir(arquivo, largura, altura);
  if (escala !== 1) await p.setViewport({ width: largura, height: altura, deviceScaleFactor: escala });
  const els = await p.$$(".quadro");
  for (let i = 0; i < els.length; i++) {
    const nome = `${prefixo}-${String(i + 1).padStart(2, "0")}.png`;
    await els[i].screenshot({ path: path.join(raiz, pasta, nome) });
    console.log(`${pasta}/${nome}`);
  }
  await p.close();
}

if (so === "previa") {
  // miniaturas dos slides para revisão rápida
  const p = await abrir(process.argv[3], 1920, 1080);
  const els = await p.$$(".slide");
  for (let i = 0; i < els.length; i++) await els[i].screenshot({ path: path.join(process.argv[4], `s${String(i + 1).padStart(2, "0")}.png`) });
  await p.close();
} else {
  if (!so || so === "pitch") await pdf("pitch.html", "Amora-Flow-Pitch.pdf");
  if (!so || so === "apresentacao") await pdf("apresentacao.html", "Amora-Flow-Apresentacao-Completa.pdf");
  if (!so || so === "feed") await quadros("feed.html", "instagram/feed", "post", 1080, 1350);
  if (!so || so === "stories") await quadros("stories.html", "instagram/stories", "story", 1080, 1920);
}
await navegador.close();
