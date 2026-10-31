import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { Botao, Campo, Titulo } from '../componentes/ui';
import { useSessao } from '../contexto/SessaoContext';
import { espaco, useCores } from '../tema';

export default function TelaLogin() {
  const c = useCores();
  const { entrar } = useSessao();
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (!login.trim() || !senha) {
      setErro('Informe o CPF (ou e-mail) e a senha.');
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await entrar(login.trim(), senha);
      router.back();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao entrar.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.fundo }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: espaco.gg }} keyboardShouldPersistTaps="handled">
        <Titulo>Bem-vindo(a) de volta ☕</Titulo>
        <Text style={{ color: c.textoSuave, marginBottom: espaco.gg }}>Entre para fazer pedidos e acompanhar a entrega.</Text>
        <Campo rotulo="CPF ou e-mail" value={login} onChangeText={setLogin} autoCapitalize="none" autoComplete="username"
          keyboardType="email-address" textContentType="username" />
        <Campo rotulo="Senha" value={senha} onChangeText={setSenha} secureTextEntry autoComplete="password"
          textContentType="password" onSubmitEditing={enviar} returnKeyType="go" erro={erro} />
        <Botao titulo="Entrar" icone="log-in-outline" carregando={enviando} aoPressionar={enviar} />
        <Botao titulo="Ainda não tenho conta" variante="texto" estilo={{ marginTop: espaco.m }}
          aoPressionar={() => router.replace('/cadastro')} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
