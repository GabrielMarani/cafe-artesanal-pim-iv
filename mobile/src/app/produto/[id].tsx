import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { AccessibilityInfo, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Botao, EstadoVazio, Quantidade, Selo } from '../../componentes/ui';
import { useCarrinho } from '../../contexto/CarrinhoContext';
import { useCatalogo } from '../../contexto/CatalogoContext';
import { useSessao } from '../../contexto/SessaoContext';
import { espaco, useCores } from '../../tema';
import { alertar } from '../../utils/dialogos';
import { formatarMoeda } from '../../utils/formatos';

export default function TelaProduto() {
  const c = useCores();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { produtos } = useCatalogo();
  const carrinho = useCarrinho();
  const { usuario } = useSessao();
  const [quantidade, setQuantidade] = useState(1);

  const produto = produtos.find((p) => p.id === Number(id));
  if (!produto) return <EstadoVazio icone="help-circle-outline" titulo="Produto não encontrado" />;

  const noCarrinho = carrinho.itens.find((i) => i.produtoId === produto.id)?.quantidade ?? 0;
  const maximo = Math.max(0, Math.min(99, produto.estoque) - noCarrinho);
  const equipe = usuario && usuario.perfil !== 'cliente';

  function adicionar() {
    if (!produto) return;
    if (carrinho.adicionar(produto, quantidade)) {
      AccessibilityInfo.announceForAccessibility(`${quantidade} ${produto.nome} adicionado ao carrinho`);
      router.back();
    } else {
      alertar('Estoque insuficiente', `Restam ${produto.estoque} unidades de ${produto.nome}.`);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: c.fundo }} contentContainerStyle={{ paddingBottom: espaco.gg }}>
      <Stack.Screen options={{ title: produto.nome }} />
      <Image source={produto.imagemUrl ? { uri: produto.imagemUrl } : undefined}
        style={[estilos.imagem, { backgroundColor: c.fundoAlt }]} accessibilityLabel={`Foto de ${produto.nome}`} />
      <View style={{ padding: espaco.g, gap: espaco.p }}>
        <Text style={{ color: c.destaque, fontWeight: '700' }}>{produto.categoriaNome?.toUpperCase()}</Text>
        <Text accessibilityRole="header" style={[estilos.nome, { color: c.texto }]}>{produto.nome}</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {produto.destaque ? <Selo texto="Destaque da casa" tipo="destaque" /> : null}
          {!produto.disponivel ? <Selo texto="Esgotado" tipo="erro" />
            : produto.estoque <= 5 ? <Selo texto={`Últimas ${produto.estoque} unidades`} tipo="alerta" /> : null}
        </View>
        {produto.descricao ? <Text style={{ color: c.textoSuave, fontSize: 16, lineHeight: 24 }}>{produto.descricao}</Text> : null}
        <Text style={[estilos.preco, { color: c.primaria }]}>{formatarMoeda(produto.preco)}</Text>

        {equipe ? null : produto.disponivel && maximo > 0 ? (
          <View style={{ gap: espaco.g, marginTop: espaco.m }}>
            <Quantidade valor={quantidade} maximo={maximo} nome={produto.nome} aoMudar={(n) => setQuantidade(Math.max(1, n))} />
            <Botao titulo={`Adicionar · ${formatarMoeda(produto.preco * quantidade)}`} icone="cart-outline" aoPressionar={adicionar} />
          </View>
        ) : (
          <Text style={{ color: c.aviso, fontWeight: '600' }}>
            {produto.disponivel ? 'Você já colocou todo o estoque disponível no carrinho.' : 'Produto indisponível no momento.'}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  imagem: { width: '100%', aspectRatio: 4 / 3 },
  nome: { fontSize: 26, fontWeight: '800' },
  preco: { fontSize: 24, fontWeight: '800', marginTop: espaco.p }
});
