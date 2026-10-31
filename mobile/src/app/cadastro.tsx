import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { Botao, Campo, Titulo } from '../componentes/ui';
import { useSessao } from '../contexto/SessaoContext';
import { espaco, useCores } from '../tema';
import { alertar } from '../utils/dialogos';
import { cpfValido, mascaraCpf, mascaraTelefone, senhaForte } from '../utils/formatos';

export default function TelaCadastro() {
  const c = useCores();
  const { registrar } = useSessao();
  const [dados, setDados] = useState({ nome: '', nomeSocial: '', cpf: '', email: '', telefone: '', senha: '', confirmar: '' });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  const alterar = (campo: keyof typeof dados) => (valor: string) => setDados((d) => ({ ...d, [campo]: valor }));

  function validar() {
    const e: Record<string, string> = {};
    if (!dados.nome.trim()) e.nome = 'Informe o nome completo.';
    if (!cpfValido(dados.cpf)) e.cpf = 'CPF inválido.';
    if (!senhaForte(dados.senha)) e.senha = 'Use 8 ou mais caracteres, com letras e números.';
    if (dados.senha !== dados.confirmar) e.confirmar = 'As senhas não coincidem.';
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function enviar() {
    if (!validar()) return;
    setEnviando(true);
    try {
      const usuario = await registrar({
        nome: dados.nome.trim(),
        nomeSocial: dados.nomeSocial.trim() || null,
        cpf: dados.cpf,
        email: dados.email.trim() || null,
        telefone: dados.telefone || null,
        senha: dados.senha
      });
      alertar(`Bem-vindo(a), ${usuario.nomeExibicao.split(' ')[0]}!`, 'Sua conta foi criada.');
      router.back();
    } catch (e) {
      alertar('Não foi possível criar a conta', e instanceof Error ? e.message : undefined);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.fundo }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: espaco.gg }} keyboardShouldPersistTaps="handled">
        <Titulo>Crie sua conta</Titulo>
        <Text style={{ color: c.textoSuave, marginBottom: espaco.gg }}>
          Usamos seus dados só para processar seus pedidos (LGPD).
        </Text>
        <Campo rotulo="Nome completo" value={dados.nome} onChangeText={alterar('nome')} autoComplete="name" erro={erros.nome} />
        <Campo rotulo="Nome social" opcional value={dados.nomeSocial} onChangeText={alterar('nomeSocial')}
          ajuda="Como você gostaria de ser chamado(a)? Se preencher, usaremos este nome em todo o atendimento." />
        <Campo rotulo="CPF" value={dados.cpf} onChangeText={(v) => alterar('cpf')(mascaraCpf(v))} keyboardType="number-pad" erro={erros.cpf} />
        <Campo rotulo="E-mail" opcional value={dados.email} onChangeText={alterar('email')} keyboardType="email-address"
          autoCapitalize="none" autoComplete="email" />
        <Campo rotulo="Celular" opcional value={dados.telefone} onChangeText={(v) => alterar('telefone')(mascaraTelefone(v))}
          keyboardType="phone-pad" autoComplete="tel" />
        <Campo rotulo="Senha" value={dados.senha} onChangeText={alterar('senha')} secureTextEntry autoComplete="new-password"
          ajuda="Mínimo de 8 caracteres, com letras e números." erro={erros.senha} />
        <Campo rotulo="Confirmar senha" value={dados.confirmar} onChangeText={alterar('confirmar')} secureTextEntry erro={erros.confirmar} />
        <Botao titulo="Criar minha conta" icone="person-add-outline" carregando={enviando} aoPressionar={enviar} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
