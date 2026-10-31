import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/endpoints';
import type { Endereco } from '../../api/tipos';
import { Botao, Cartao, EstadoVazio, Titulo, type NomeIcone } from '../../componentes/ui';
import { urlApi } from '../../config';
import { useSessao } from '../../contexto/SessaoContext';
import { ALVO_TOQUE, espaco, useCores } from '../../tema';
import { confirmar } from '../../utils/dialogos';

export default function TelaConta() {
  const c = useCores();
  const { estaLogado, usuario, sair } = useSessao();
  const [enderecos, setEnderecos] = useState<Endereco[]>([]);

  useFocusEffect(useCallback(() => {
    if (estaLogado) api.conta.enderecos().then(setEnderecos).catch(() => undefined);
  }, [estaLogado]));

  const itemMenu = (icone: NomeIcone, titulo: string, descricao: string, aoPressionar: () => void) => (
    <Pressable onPress={aoPressionar} accessibilityRole="button" accessibilityLabel={`${titulo}. ${descricao}`}
      style={[estilos.item, { borderColor: c.borda }]}>
      <Ionicons name={icone} size={22} color={c.primaria} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.texto, fontWeight: '600' }}>{titulo}</Text>
        <Text style={{ color: c.textoSuave, fontSize: 13 }} numberOfLines={2}>{descricao}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={c.textoSuave} />
    </Pressable>
  );

  return (
    <ScrollView style={{ backgroundColor: c.fundo }} contentContainerStyle={{ padding: espaco.g }}>
      {estaLogado && usuario ? (
        <>
          <Cartao>
            <Titulo>{usuario.nomeExibicao}</Titulo>
            {usuario.nomeSocial ? <Text style={{ color: c.textoSuave }}>Nome social em uso · registro: {usuario.nome}</Text> : null}
            <Text style={{ color: c.textoSuave }}>CPF {usuario.cpf}</Text>
            {usuario.email ? <Text style={{ color: c.textoSuave }}>{usuario.email}</Text> : null}
            {usuario.telefone ? <Text style={{ color: c.textoSuave }}>{usuario.telefone}</Text> : null}
            {usuario.perfil !== 'cliente' ? (
              <Text style={{ color: c.aviso, marginTop: espaco.p }}>Perfil {usuario.perfil}: use o painel web para gerenciar a loja.</Text>
            ) : null}
          </Cartao>

          <Cartao>
            <Titulo>Endereços</Titulo>
            {enderecos.length ? enderecos.map((e) => (
              <View key={e.id} style={{ marginBottom: espaco.m }}>
                <Text style={{ color: c.texto, fontWeight: '700' }}>{e.apelido}{e.principal ? ' · principal' : ''}</Text>
                <Text style={{ color: c.textoSuave }}>{e.descricao}</Text>
              </View>
            )) : <Text style={{ color: c.textoSuave, marginBottom: espaco.m }}>Nenhum endereço cadastrado.</Text>}
            <Botao titulo="Adicionar endereço" variante="secundario" icone="add" aoPressionar={() => router.push('/endereco')} />
          </Cartao>
        </>
      ) : (
        <Cartao>
          <EstadoVazio icone="person-circle-outline" titulo="Entre ou crie sua conta"
            texto="Com uma conta você faz pedidos, salva endereços e acompanha a entrega."
            acao={<View style={{ gap: espaco.p, alignSelf: 'stretch' }}>
              <Botao titulo="Entrar" icone="log-in-outline" aoPressionar={() => router.push('/login')} />
              <Botao titulo="Criar conta" variante="secundario" aoPressionar={() => router.push('/cadastro')} />
            </View>} />
        </Cartao>
      )}

      <Cartao>
        <Titulo>Aplicativo</Titulo>
        {itemMenu('server-outline', 'Servidor da API', urlApi(), () => router.push('/servidor'))}
        {itemMenu('accessibility-outline', 'Acessibilidade',
          'O app segue o tamanho de fonte, o modo escuro e o leitor de tela (TalkBack/VoiceOver) do celular.', () => undefined)}
      </Cartao>

      {estaLogado ? (
        <Botao titulo="Sair da conta" variante="perigo" icone="log-out-outline"
          aoPressionar={async () => { if (await confirmar('Sair', 'Deseja sair da sua conta?', 'Sair')) await sair(); }} />
      ) : null}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: espaco.m, minHeight: ALVO_TOQUE + 12, borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: espaco.p }
});
