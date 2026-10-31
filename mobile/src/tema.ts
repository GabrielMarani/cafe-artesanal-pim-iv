import { useColorScheme } from 'react-native';

// Mesma identidade visual do site. Pares de cor com contraste WCAG AA.
const claro = {
  primaria: '#4B2E2B',
  sobrePrimaria: '#FFF8F0',
  destaque: '#8A5426',
  destaqueSuave: '#C27B40',
  secundaria: '#556B2F',
  fundo: '#FFF8F0',
  fundoAlt: '#F5E6D3',
  superficie: '#FFFFFF',
  borda: '#E3D2BF',
  texto: '#1F1A17',
  textoSuave: '#5C5149',
  sucesso: '#2E6B30',
  sucessoFundo: '#E3F1E3',
  erro: '#A8231B',
  erroFundo: '#FBE7E5',
  aviso: '#7A4F00',
  avisoFundo: '#FFF1D6'
};

const escuro: typeof claro = {
  primaria: '#D9A57A',
  sobrePrimaria: '#1F1A17',
  destaque: '#E0A56E',
  destaqueSuave: '#C27B40',
  secundaria: '#A9C47A',
  fundo: '#171311',
  fundoAlt: '#221C19',
  superficie: '#241E1B',
  borda: '#40352F',
  texto: '#F5E6D3',
  textoSuave: '#C9B8A6',
  sucesso: '#8FD18F',
  sucessoFundo: '#1E3320',
  erro: '#FF9A92',
  erroFundo: '#3A1D1B',
  aviso: '#FFD27A',
  avisoFundo: '#3A2E14'
};

export type Cores = typeof claro;

/** Cores do tema atual (acompanha o modo claro/escuro do celular). */
export function useCores(): Cores {
  return useColorScheme() === 'dark' ? escuro : claro;
}

export const espaco = { p: 8, m: 12, g: 16, gg: 24 };
export const raio = { p: 8, m: 12, g: 20 };
/** Área mínima de toque recomendada (44 pt). */
export const ALVO_TOQUE = 44;

export const coresStatus: Record<string, { fundo: string; texto: string }> = {
  pendente: { fundo: '#FFF1D6', texto: '#7A4F00' },
  em_preparo: { fundo: '#E3EEFA', texto: '#1D5FA8' },
  pronto: { fundo: '#EFE3FA', texto: '#6A2E9E' },
  saiu_para_entrega: { fundo: '#E0F4F4', texto: '#1F6B6B' },
  entregue: { fundo: '#E3F1E3', texto: '#2E6B30' },
  cancelado: { fundo: '#FBE7E5', texto: '#A8231B' }
};
