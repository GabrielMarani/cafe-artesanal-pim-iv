import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { armazenamento } from './armazenamento';

const CHAVE_URL = 'cafe.apiUrl';
const PORTA_API = 5000;

let urlAtual: string | null = null;

/**
 * Descobre o endereço da API:
 *  1. URL salva pela pessoa na tela "Servidor da API";
 *  2. variável EXPO_PUBLIC_API_URL;
 *  3. o IP do computador que roda o Expo (o celular já está falando com ele na mesma rede Wi-Fi);
 *  4. localhost (Expo Web / emulador iOS).
 */
export function urlPadrao(): string {
  const deAmbiente = process.env.EXPO_PUBLIC_API_URL;
  if (deAmbiente) return deAmbiente.replace(/\/$/, '');

  const hostUri = Constants.expoConfig?.hostUri; // ex.: "192.168.0.10:8081"
  const host = hostUri?.split(':')[0];
  if (host && Platform.OS !== 'web') return `http://${host}:${PORTA_API}/api/v1`;

  if (Platform.OS === 'android' && !host) return `http://10.0.2.2:${PORTA_API}/api/v1`; // emulador Android
  return `http://localhost:${PORTA_API}/api/v1`;
}

export async function carregarUrlApi(): Promise<string> {
  urlAtual = (await armazenamento.lerTexto(CHAVE_URL)) ?? urlPadrao();
  return urlAtual;
}

export function urlApi(): string {
  return urlAtual ?? urlPadrao();
}

export async function salvarUrlApi(url: string | null): Promise<void> {
  if (url) {
    urlAtual = url.trim().replace(/\/$/, '');
    await armazenamento.gravarTexto(CHAVE_URL, urlAtual);
  } else {
    urlAtual = urlPadrao();
    await armazenamento.remover(CHAVE_URL);
  }
}
