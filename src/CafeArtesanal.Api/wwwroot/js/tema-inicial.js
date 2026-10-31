// Executado no <head> (antes de desenhar a página) para aplicar tema, contraste
// e tamanho de fonte salvos — evita o "piscar" do tema errado.
(function () {
  try {
    var p = JSON.parse(localStorage.getItem('cafe.preferencias') || '{}');
    var raiz = document.documentElement;
    var escuroNoSistema = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    raiz.setAttribute('data-tema', p.tema || (escuroNoSistema ? 'escuro' : 'claro'));
    if (p.altoContraste) raiz.setAttribute('data-contraste', 'alto');
    if (p.escalaFonte) raiz.style.setProperty('--escala-fonte', String(p.escalaFonte));
  } catch (e) { /* sem preferências salvas */ }
})();
