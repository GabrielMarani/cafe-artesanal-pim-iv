import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { ErroApi } from '../../api/cliente';
import { api } from '../../api/endpoints';
import type { Pedido } from '../../api/tipos';
import { BannerOffline, Botao, Carregando, EstadoVazio, SeloStatus } from '../../componentes/ui';
import { useSessao } from '../../contexto/SessaoContext';
import { espaco, raio, useCores } from '../../tema';
import { formatarData, formatarMoeda } from '../../utils/formatos';

const INTERVALO_SINCRONIZACAO = 15000;

export default function TelaPedidos() {
  const c = useCores();
  const { estaLogado, usuario } = useSessao();
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const pagina = await api.pedidos.listar(1);
      setPedidos(pagina.itens);
      setErro(null);
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível carregar.');
    }
  }, []);

  // Sincroniza os status enquanto a aba estiver aberta.
  useFocusEffect(useCallback(() => {
    if (!estaLogado) return undefined;
    carregar();
    const intervalo = setInterval(carregar, INTERVALO_SINCRONIZACAO);
    return () => clearInterval(intervalo);
  }, [estaLogado, carregar]));

  if (!estaLogado) {
    return (
      <View style={{ flex: 1, backgroundColor: c.fundo }}>
        <EstadoVazio icone="receipt-outline" titulo="Acompanhe seus pedidos" texto="Entre na sua conta para ver o andamento dos pedidos."
          acao={<Botao titulo="Entrar" icone="log-in-outline" aoPressionar={() => router.push('/login')} />} />
      </View>
    );
  }

  if (usuario && usuario.perfil !== 'cliente') {
    return (
      <View style={{ flex: 1, backgroundColor: c.fundo }}>
        <EstadoVazio icone="desktop-outline" titulo="Conta da equipe" texto="Atendentes e administradores gerenciam os pedidos pelo painel web." />
      </View>
    );
  }

  if (!pedidos && !erro) return <Carregando texto="Carregando seus pedidos..." />;

  return (
    <View style={{ flex: 1, backgroundColor: c.fundo }}>
      {erro ? <BannerOffline mensagem={erro} /> : null}
      <FlatList
        data={pedidos ?? []}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ padding: espaco.g }}
        refreshControl={<RefreshControl refreshing={atualizando} tintColor={c.primaria}
          onRefresh={async () => { setAtualizando(true); await carregar(); setAtualizando(false); }} />}
        ListEmptyComponent={<EstadoVazio icone="cafe-outline" titulo="Nenhum pedido ainda" texto="Que tal pedir um café agora?" />}
        renderItem={({ item: p }) => (
          <Pressable
            onPress={() => router.push(`/pedido/${p.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`Pedido ${p.numero}, ${p.statusRotulo}, ${formatarMoeda(p.total)}`}
            style={({ pressed }) => [estilos.cartao, { backgroundColor: c.superficie, borderColor: c.borda, opacity: pressed ? 0.9 : 1 }]}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <View style={estilos.linha}>
                <Text style={{ color: c.texto, fontWeight: '800', fontSize: 16 }}>Pedido {p.numero}</Text>
                <SeloStatus status={p.status} rotulo={p.statusRotulo} />
              </View>
              <Text style={{ color: c.textoSuave }}>{formatarData(p.dataPedido)} · {p.tipoEntrega === 'entrega' ? 'Entrega' : 'Retirada'}</Text>
              <Text style={{ color: c.texto }} numberOfLines={1}>
                {p.itens.map((i) => `${i.quantidade}× ${i.nomeProduto}`).join(', ')}
              </Text>
              <Text style={{ color: c.primaria, fontWeight: '800' }}>{formatarMoeda(p.total)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={c.textoSuave} />
          </Pressable>
        )}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: { flexDirection: 'row', alignItems: 'center', gap: espaco.m, borderWidth: 1, borderRadius: raio.m, padding: espaco.g, marginBottom: espaco.m },
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaco.p, flexWrap: 'wrap' }
});
