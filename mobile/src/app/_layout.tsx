import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { carregarUrlApi } from '../config';
import { CarrinhoProvider } from '../contexto/CarrinhoContext';
import { CatalogoProvider } from '../contexto/CatalogoContext';
import { SessaoProvider } from '../contexto/SessaoContext';
import { useCores } from '../tema';
import { useColorScheme } from 'react-native';

export default function LayoutRaiz() {
  const [pronto, setPronto] = useState(false);
  const escuro = useColorScheme() === 'dark';
  const c = useCores();

  useEffect(() => {
    carregarUrlApi().finally(() => setPronto(true));
  }, []);

  if (!pronto) return null;

  const base = escuro ? DarkTheme : DefaultTheme;
  const tema = {
    ...base,
    colors: { ...base.colors, primary: c.primaria, background: c.fundo, card: c.superficie, text: c.texto, border: c.borda }
  };

  return (
    <SafeAreaProvider>
      <ThemeProvider value={tema}>
        <SessaoProvider>
          <CatalogoProvider>
            <CarrinhoProvider>
              <Stack screenOptions={{ headerTintColor: c.texto, headerBackTitle: 'Voltar' }}>
                <Stack.Screen name="(abas)" options={{ headerShown: false }} />
                <Stack.Screen name="produto/[id]" options={{ title: 'Produto', presentation: 'modal' }} />
                <Stack.Screen name="pedido/[id]" options={{ title: 'Acompanhar pedido' }} />
                <Stack.Screen name="checkout" options={{ title: 'Finalizar pedido' }} />
                <Stack.Screen name="login" options={{ title: 'Entrar', presentation: 'modal' }} />
                <Stack.Screen name="cadastro" options={{ title: 'Criar conta' }} />
                <Stack.Screen name="endereco" options={{ title: 'Novo endereço' }} />
                <Stack.Screen name="servidor" options={{ title: 'Servidor da API' }} />
              </Stack>
              <StatusBar style={escuro ? 'light' : 'dark'} />
            </CarrinhoProvider>
          </CatalogoProvider>
        </SessaoProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
