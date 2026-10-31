import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { AccessibilityInfo, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CartaoProduto } from '../../componentes/CartaoProduto';
import { BannerOffline, Campo, Carregando, EstadoVazio } from '../../componentes/ui';
import { useCarrinho } from '../../contexto/CarrinhoContext';
import { useCatalogo } from '../../contexto/CatalogoContext';
import { useSessao } from '../../contexto/SessaoContext';
import { ALVO_TOQUE, espaco, useCores } from '../../tema';
import { formatarData } from '../../utils/formatos';

/** Remove acentos para a busca ("pao" encontra "Pão"). */
const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function TelaCardapio() {
  const c = useCores();
  const { produtos, categorias, online, sincronizando, ultimaSincronizacao, erro, sincronizar } = useCatalogo();
  const carrinho = useCarrinho();
  const { usuario } = useSessao();
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState<number | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    return produtos.filter((p) =>
      (categoria === null || p.categoriaId === categoria) &&
      (!termo || normalizar(`${p.nome} ${p.descricao ?? ''} ${p.categoriaNome ?? ''}`).includes(termo)));
  }, [produtos, busca, categoria]);

  function adicionar(id: number) {
    const produto = produtos.find((p) => p.id === id);
    if (!produto) return;
    const texto = carrinho.adicionar(produto)
      ? `${produto.nome} adicionado ao carrinho.`
      : `Não há mais estoque de ${produto.nome}.`;
    setMensagem(texto);
    AccessibilityInfo.announceForAccessibility(texto);
    setTimeout(() => setMensagem(null), 2500);
  }

  if (!produtos.length && sincronizando) return <Carregando texto="Carregando o cardápio..." />;

  const semConexao = !online || Boolean(erro);

  return (
    <View style={{ flex: 1, backgroundColor: c.fundo }}>
      {semConexao && produtos.length ? (
        <BannerOffline mensagem="Sem conexão. Mostrando o cardápio salvo no aparelho." />
      ) : null}

      <FlatList
        data={filtrados}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ padding: espaco.g }}
        refreshControl={<RefreshControl refreshing={sincronizando} onRefresh={sincronizar} tintColor={c.primaria} />}
        ListHeaderComponent={
          <View>
            <Text accessibilityRole="header" style={[estilos.saudacao, { color: c.texto }]}>
              {usuario ? `Olá, ${usuario.nomeExibicao.split(' ')[0]}!` : 'Bem-vindo(a)!'}
            </Text>
            <Text style={{ color: c.textoSuave, marginBottom: espaco.g }}>O que vai ser hoje?</Text>
            <Campo rotulo="Buscar no cardápio" placeholder="Ex.: cappuccino" value={busca} onChangeText={setBusca} returnKeyType="search" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: espaco.p, paddingBottom: espaco.g }}
              accessibilityRole="tablist">
              {[{ id: null, nome: 'Todas' }, ...categorias].map((cat) => {
                const ativa = categoria === cat.id;
                return (
                  <Pressable
                    key={String(cat.id)}
                    onPress={() => setCategoria(cat.id)}
                    role="tab"
                    aria-selected={ativa}
                    style={[estilos.chip, { backgroundColor: ativa ? c.primaria : c.superficie, borderColor: ativa ? c.primaria : c.borda }]}
                  >
                    <Text style={{ color: ativa ? c.sobrePrimaria : c.texto, fontWeight: '600' }}>{cat.nome}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        }
        renderItem={({ item }) => (
          <CartaoProduto
            produto={item}
            aoAbrir={() => router.push(`/produto/${item.id}`)}
            aoAdicionar={() => adicionar(item.id)}
          />
        )}
        ListEmptyComponent={
          semConexao && !produtos.length
            ? <EstadoVazio icone="cloud-offline-outline" titulo="Não foi possível carregar" texto={erro ?? 'Verifique sua conexão.'} />
            : <EstadoVazio icone="search-outline" titulo="Nada encontrado" texto="Tente outra palavra ou categoria." />
        }
        ListFooterComponent={ultimaSincronizacao ? (
          <Text style={{ color: c.textoSuave, textAlign: 'center', fontSize: 12, marginTop: espaco.m }}>
            Cardápio sincronizado em {formatarData(ultimaSincronizacao)}
          </Text>
        ) : undefined}
      />

      {mensagem ? (
        <View style={[estilos.aviso, { backgroundColor: c.texto }]} accessibilityLiveRegion="polite">
          <Text style={{ color: c.fundo, fontWeight: '600' }}>{mensagem}</Text>
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  saudacao: { fontSize: 24, fontWeight: '800' },
  chip: { minHeight: ALVO_TOQUE - 4, paddingHorizontal: espaco.g, borderRadius: 999, borderWidth: 1.5, justifyContent: 'center' },
  aviso: { position: 'absolute', left: espaco.g, right: espaco.g, bottom: espaco.g, padding: espaco.m, borderRadius: 10 }
});
