import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { BannerOffline, Botao, Cartao, EstadoVazio, Quantidade } from '../../componentes/ui';
import { useCarrinho } from '../../contexto/CarrinhoContext';
import { useCatalogo } from '../../contexto/CatalogoContext';
import { useSessao } from '../../contexto/SessaoContext';
import { espaco, raio, useCores } from '../../tema';
import { confirmar } from '../../utils/dialogos';
import { formatarMoeda } from '../../utils/formatos';

export default function TelaCarrinho() {
  const c = useCores();
  const carrinho = useCarrinho();
  const { produtos, loja } = useCatalogo();
  const { estaLogado } = useSessao();
  const [removidos, setRemovidos] = useState<string[]>([]);

  // Ao abrir a aba, confere o carrinho com o catálogo sincronizado (preço e estoque atuais).
  useFocusEffect(useCallback(() => {
    if (produtos.length) setRemovidos(carrinho.conciliar(produtos));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produtos]));

  if (!carrinho.itens.length) {
    return (
      <View style={{ flex: 1, backgroundColor: c.fundo }}>
        {removidos.length ? <BannerOffline mensagem={`Removidos por falta de estoque: ${removidos.join(', ')}`} /> : null}
        <EstadoVazio icone="cart-outline" titulo="Seu carrinho está vazio" texto="Escolha algo gostoso no cardápio."
          acao={<Botao titulo="Ver cardápio" icone="cafe-outline" aoPressionar={() => router.navigate('/')} />} />
      </View>
    );
  }

  const pedidoMinimo = loja?.pedidoMinimo ?? 0;
  const abaixoDoMinimo = carrinho.subtotal < pedidoMinimo;

  async function esvaziar() {
    if (await confirmar('Esvaziar carrinho', 'Remover todos os itens?', 'Esvaziar', true)) carrinho.limpar();
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.fundo }}>
      <FlatList
        data={carrinho.itens}
        keyExtractor={(i) => String(i.produtoId)}
        contentContainerStyle={{ padding: espaco.g }}
        ListHeaderComponent={removidos.length
          ? <Text style={{ color: c.aviso, marginBottom: espaco.m }}>Removidos por falta de estoque: {removidos.join(', ')}</Text>
          : undefined}
        renderItem={({ item }) => (
          <Cartao estilo={estilos.item}>
            <Image source={item.imagemUrl ? { uri: item.imagemUrl } : undefined} style={[estilos.imagem, { backgroundColor: c.fundoAlt }]} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: c.texto, fontWeight: '700', fontSize: 16 }}>{item.nome}</Text>
              <Text style={{ color: c.textoSuave }}>{formatarMoeda(item.preco)} cada</Text>
              <View style={estilos.linha}>
                <Quantidade valor={item.quantidade} maximo={Math.min(99, item.estoque)} nome={item.nome}
                  aoMudar={(n) => carrinho.definirQuantidade(item.produtoId, n)} />
                <Text style={{ color: c.texto, fontWeight: '800' }}>{formatarMoeda(item.preco * item.quantidade)}</Text>
              </View>
            </View>
          </Cartao>
        )}
        ListFooterComponent={
          <View>
            <Botao titulo="Esvaziar carrinho" variante="texto" icone="trash-outline" aoPressionar={esvaziar} />
            <Cartao>
              <View style={estilos.linha}><Text style={{ color: c.textoSuave }}>Subtotal</Text>
                <Text style={{ color: c.texto, fontWeight: '700' }}>{formatarMoeda(carrinho.subtotal)}</Text></View>
              <Text style={{ color: c.textoSuave, fontSize: 13, marginTop: 4 }}>
                Entrega: {formatarMoeda(loja?.taxaEntrega ?? 0)} · Retirada no balcão: grátis
              </Text>
              {abaixoDoMinimo ? (
                <Text style={{ color: c.aviso, marginTop: espaco.p, fontWeight: '600' }}>
                  Pedido mínimo de {formatarMoeda(pedidoMinimo)}.
                </Text>
              ) : null}
            </Cartao>
            <Botao
              titulo={estaLogado ? 'Escolher entrega e pagamento' : 'Entrar para finalizar'}
              icone={estaLogado ? 'arrow-forward' : 'log-in-outline'}
              desabilitado={abaixoDoMinimo}
              aoPressionar={() => router.push(estaLogado ? '/checkout' : '/login')}
            />
          </View>
        }
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  item: { flexDirection: 'row', gap: espaco.m, alignItems: 'center' },
  imagem: { width: 72, height: 72, borderRadius: raio.p },
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaco.p, flexWrap: 'wrap' }
});
