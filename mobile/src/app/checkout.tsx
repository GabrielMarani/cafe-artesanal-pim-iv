import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/endpoints';
import type { Endereco, FormaPagamento, TipoEntrega } from '../api/tipos';
import { Botao, Campo, Cartao, Opcao, Titulo } from '../componentes/ui';
import { useCarrinho } from '../contexto/CarrinhoContext';
import { useCatalogo } from '../contexto/CatalogoContext';
import { espaco, useCores } from '../tema';
import { alertar } from '../utils/dialogos';
import { formatarMoeda, rotulosPagamento } from '../utils/formatos';

export default function TelaCheckout() {
  const c = useCores();
  const carrinho = useCarrinho();
  const { loja, sincronizar } = useCatalogo();
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>('retirada');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix');
  const [enderecos, setEnderecos] = useState<Endereco[]>([]);
  const [enderecoId, setEnderecoId] = useState<number | null>(null);
  const [observacao, setObservacao] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Recarrega ao voltar da tela de novo endereço.
  useFocusEffect(useCallback(() => {
    api.conta.enderecos().then((lista) => {
      setEnderecos(lista);
      setEnderecoId((atual) => atual && lista.some((e) => e.id === atual) ? atual : (lista.find((e) => e.principal) ?? lista[0])?.id ?? null);
    }).catch(() => undefined);
  }, []));

  const taxa = tipoEntrega === 'entrega' ? loja?.taxaEntrega ?? 0 : 0;
  const total = carrinho.subtotal + taxa;
  const podeEnviar = carrinho.itens.length > 0 && (tipoEntrega === 'retirada' || enderecoId !== null);

  async function enviar() {
    setEnviando(true);
    try {
      const pedido = await api.pedidos.criar({
        itens: carrinho.itens.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade })),
        tipoEntrega,
        formaPagamento,
        enderecoId: tipoEntrega === 'entrega' ? enderecoId : null,
        observacao: observacao.trim() || null
      });
      carrinho.limpar();
      sincronizar(); // estoque mudou: atualiza o catálogo local
      router.dismissAll();
      router.push({ pathname: '/pedido/[id]', params: { id: String(pedido.id), novo: '1' } });
    } catch (e) {
      alertar('Não foi possível enviar o pedido', e instanceof Error ? e.message : undefined);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: c.fundo }} contentContainerStyle={{ padding: espaco.g }} keyboardShouldPersistTaps="handled">
      <Cartao>
        <Titulo>Como você quer receber?</Titulo>
        <View accessibilityRole="radiogroup">
          <Opcao icone="storefront-outline" rotulo="Retirar no balcão" descricao="Grátis" selecionada={tipoEntrega === 'retirada'}
            aoSelecionar={() => setTipoEntrega('retirada')} />
          <Opcao icone="bicycle-outline" rotulo="Entrega" descricao={`Taxa de ${formatarMoeda(loja?.taxaEntrega ?? 0)}`}
            selecionada={tipoEntrega === 'entrega'} aoSelecionar={() => setTipoEntrega('entrega')} />
        </View>
      </Cartao>

      {tipoEntrega === 'entrega' ? (
        <Cartao>
          <Titulo>Endereço</Titulo>
          <View accessibilityRole="radiogroup">
            {enderecos.map((e) => (
              <Opcao key={e.id} icone="location-outline" rotulo={e.apelido} descricao={e.descricao}
                selecionada={e.id === enderecoId} aoSelecionar={() => setEnderecoId(e.id)} />
            ))}
          </View>
          {!enderecos.length ? <Text style={{ color: c.textoSuave, marginBottom: espaco.m }}>Cadastre um endereço para receber em casa.</Text> : null}
          <Botao titulo="Novo endereço" variante="secundario" icone="add" aoPressionar={() => router.push('/endereco')} />
        </Cartao>
      ) : null}

      <Cartao>
        <Titulo>Pagamento</Titulo>
        <Text style={{ color: c.textoSuave, marginBottom: espaco.m }}>Você paga na {tipoEntrega === 'entrega' ? 'entrega' : 'retirada'}.</Text>
        <View accessibilityRole="radiogroup">
          {(Object.keys(rotulosPagamento) as FormaPagamento[]).map((forma) => (
            <Opcao key={forma} rotulo={rotulosPagamento[forma]} selecionada={forma === formaPagamento} aoSelecionar={() => setFormaPagamento(forma)} />
          ))}
        </View>
      </Cartao>

      <Campo rotulo="Observações" opcional placeholder="Ex.: sem açúcar, interfone 52" value={observacao}
        onChangeText={setObservacao} maxLength={300} multiline style={{ minHeight: 80, textAlignVertical: 'top', paddingTop: 10 }} />

      <Cartao>
        <View style={estilos.linha}><Text style={{ color: c.textoSuave }}>Subtotal</Text><Text style={{ color: c.texto }}>{formatarMoeda(carrinho.subtotal)}</Text></View>
        <View style={estilos.linha}><Text style={{ color: c.textoSuave }}>Entrega</Text><Text style={{ color: c.texto }}>{taxa ? formatarMoeda(taxa) : 'Grátis'}</Text></View>
        <View style={estilos.linha}><Text style={{ color: c.texto, fontWeight: '800' }}>Total</Text>
          <Text style={{ color: c.primaria, fontWeight: '800', fontSize: 20 }}>{formatarMoeda(total)}</Text></View>
        <Text style={{ color: c.textoSuave, fontSize: 12 }}>O valor final é confirmado pelo servidor com os preços atuais.</Text>
      </Cartao>

      <Botao titulo="Confirmar pedido" icone="checkmark" carregando={enviando} desabilitado={!podeEnviar} aoPressionar={enviar} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }
});
