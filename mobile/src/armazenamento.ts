import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Persistência local do app:
 *  - dados comuns (catálogo, carrinho) → AsyncStorage;
 *  - dados sensíveis (tokens) → SecureStore (Keychain/Keystore). Na Web o SecureStore
 *    não existe, então cai no AsyncStorage (localStorage).
 */
export const armazenamento = {
  async lerTexto(chave: string): Promise<string | null> {
    return AsyncStorage.getItem(chave);
  },

  async gravarTexto(chave: string, valor: string): Promise<void> {
    await AsyncStorage.setItem(chave, valor);
  },

  async lerJson<T>(chave: string): Promise<T | null> {
    const texto = await AsyncStorage.getItem(chave);
    if (!texto) return null;
    try {
      return JSON.parse(texto) as T;
    } catch {
      return null;
    }
  },

  async gravarJson(chave: string, valor: unknown): Promise<void> {
    await AsyncStorage.setItem(chave, JSON.stringify(valor));
  },

  async remover(chave: string): Promise<void> {
    await AsyncStorage.removeItem(chave);
  },

  async lerSeguro(chave: string): Promise<string | null> {
    if (Platform.OS === 'web') return AsyncStorage.getItem(chave);
    return SecureStore.getItemAsync(chave);
  },

  async gravarSeguro(chave: string, valor: string): Promise<void> {
    if (Platform.OS === 'web') return AsyncStorage.setItem(chave, valor);
    return SecureStore.setItemAsync(chave, valor);
  },

  async removerSeguro(chave: string): Promise<void> {
    if (Platform.OS === 'web') return AsyncStorage.removeItem(chave);
    return SecureStore.deleteItemAsync(chave);
  }
};
