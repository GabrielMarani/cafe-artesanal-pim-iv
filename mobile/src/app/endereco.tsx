import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Switch, Text, View } from 'react-native';
import { api, buscarCep, type NovoEndereco } from '../api/endpoints';
import { Botao, Campo } from '../componentes/ui';
import { espaco, useCores } from '../tema';
import { alertar } from '../utils/dialogos';
import { mascaraCep, somenteDigitos } from '../utils/formatos';

export default function TelaEndereco() {
  const c = useCores();
  const [dados, setDados] = useState<NovoEndereco>({
    apelido: 'Casa', cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', referencia: '', principal: false
  });
  const [ajudaCep, setAjudaCep] = useState('Preenchemos o endereço automaticamente.');
  const [enviando, setEnviando] = useState(false);

  const alterar = (campo: keyof NovoEndereco) => (valor: string) => setDados((d) => ({ ...d, [campo]: valor }));

  async function alterarCep(valor: string) {
    const cep = mascaraCep(valor);
    setDados((d) => ({ ...d, cep }));
    if (somenteDigitos(cep).length !== 8) return;
    setAjudaCep('Buscando CEP...');
    const r = await buscarCep(cep);
    if (!r) {
      setAjudaCep('CEP não encontrado. Preencha manualmente.');
      return;
    }
    setDados((d) => ({ ...d, logradouro: r.logradouro || d.logradouro, bairro: r.bairro || d.bairro, cidade: r.localidade, uf: r.uf }));
    setAjudaCep('Endereço encontrado. Informe o número.');
  }

  async function salvar() {
    const obrigatorios: (keyof NovoEndereco)[] = ['apelido', 'cep', 'logradouro', 'numero', 'bairro', 'cidade', 'uf'];
    if (obrigatorios.some((campo) => !String(dados[campo] ?? '').trim())) {
      alertar('Preencha os campos obrigatórios', 'CEP, rua, número, bairro, cidade e UF.');
      return;
    }
    setEnviando(true);
    try {
      await api.conta.criarEndereco({ ...dados, uf: dados.uf.toUpperCase(), complemento: dados.complemento || null, referencia: dados.referencia || null });
      router.back();
    } catch (e) {
      alertar('Não foi possível salvar', e instanceof Error ? e.message : undefined);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.fundo }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: espaco.gg }} keyboardShouldPersistTaps="handled">
        <Campo rotulo="CEP" value={dados.cep} onChangeText={alterarCep} keyboardType="number-pad" ajuda={ajudaCep} autoComplete="postal-code" />
        <Campo rotulo="Nome do endereço" value={dados.apelido} onChangeText={alterar('apelido')} placeholder="Casa, Trabalho..." />
        <Campo rotulo="Rua / Avenida" value={dados.logradouro} onChangeText={alterar('logradouro')} autoComplete="street-address" />
        <View style={{ flexDirection: 'row', gap: espaco.m }}>
          <View style={{ flex: 1 }}><Campo rotulo="Número" value={dados.numero} onChangeText={alterar('numero')} /></View>
          <View style={{ flex: 2 }}><Campo rotulo="Complemento" opcional value={dados.complemento ?? ''} onChangeText={alterar('complemento')} /></View>
        </View>
        <Campo rotulo="Bairro" value={dados.bairro} onChangeText={alterar('bairro')} />
        <View style={{ flexDirection: 'row', gap: espaco.m }}>
          <View style={{ flex: 3 }}><Campo rotulo="Cidade" value={dados.cidade} onChangeText={alterar('cidade')} /></View>
          <View style={{ flex: 1 }}><Campo rotulo="UF" value={dados.uf} onChangeText={(v) => alterar('uf')(v.toUpperCase().slice(0, 2))} autoCapitalize="characters" /></View>
        </View>
        <Campo rotulo="Ponto de referência" opcional value={dados.referencia ?? ''} onChangeText={alterar('referencia')} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: espaco.g }}>
          <Text style={{ color: c.texto, fontWeight: '600' }}>Usar como endereço principal</Text>
          <Switch value={dados.principal} onValueChange={(v) => setDados((d) => ({ ...d, principal: v }))}
            accessibilityLabel="Usar como endereço principal" />
        </View>
        <Botao titulo="Salvar endereço" icone="save-outline" carregando={enviando} aoPressionar={salvar} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
