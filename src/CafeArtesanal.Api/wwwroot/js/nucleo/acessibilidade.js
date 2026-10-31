// Preferências de acessibilidade: tamanho da fonte, alto contraste e tema.
// Aplicadas antes da renderização por js/tema-inicial.js.

const CHAVE = 'cafe.preferencias';
export const ESCALAS_FONTE = [0.9, 1, 1.15, 1.3, 1.5];

function ler() {
  try { return JSON.parse(localStorage.getItem(CHAVE)) ?? {}; } catch { return {}; }
}

function gravar(preferencias) {
  localStorage.setItem(CHAVE, JSON.stringify(preferencias));
  aplicar(preferencias);
  window.dispatchEvent(new CustomEvent('preferencias:alteradas', { detail: preferencias }));
}

function aplicar(p) {
  const raiz = document.documentElement;
  const escuroNoSistema = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  raiz.dataset.tema = p.tema ?? (escuroNoSistema ? 'escuro' : 'claro');
  if (p.altoContraste) raiz.dataset.contraste = 'alto';
  else delete raiz.dataset.contraste;
  raiz.style.setProperty('--escala-fonte', String(p.escalaFonte ?? 1));
}

export const preferencias = {
  ler,

  alterarFonte(direcao) {
    const p = ler();
    const atual = ESCALAS_FONTE.indexOf(p.escalaFonte ?? 1);
    const proxima = direcao === 0 ? 1 : ESCALAS_FONTE[Math.min(ESCALAS_FONTE.length - 1, Math.max(0, (atual < 0 ? 1 : atual) + direcao))];
    gravar({ ...p, escalaFonte: proxima });
    return proxima;
  },

  alternarContraste() {
    const p = ler();
    gravar({ ...p, altoContraste: !p.altoContraste });
    return !p.altoContraste;
  },

  alternarTema() {
    const p = ler();
    const atual = document.documentElement.dataset.tema;
    const novo = atual === 'escuro' ? 'claro' : 'escuro';
    gravar({ ...p, tema: novo });
    return novo;
  },

  redefinir() { gravar({}); }
};
