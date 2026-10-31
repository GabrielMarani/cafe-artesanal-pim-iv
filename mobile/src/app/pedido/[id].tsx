import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/endpoints';
import type { Pedido } from '../../api/tipos';
import { BannerOffline, Botao, Cartao, Carregando, SeloStatus, Titulo } from '../../componentes/ui';
import { espaco, useCores } from '../../tema';
import { alertar, confirmar } from '../../utils/dialogos';
import { etapasDoPedido, formatarData, formatarMoeda, rotulosStatus } from '../../utils/formatos';

const INTERVALO = 15000;

export default function TelaPedido() {
  const c = useCores();
  const { id, novo } = useLocalSearchParams<{ id: string; novo?: string }>();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setPedido(await api.pedidos.obter(Number(id)));
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar.');
    }
  }, [id]);

  // Atualiza sozinho enquanto o pedido estiver em andamento (sincronização de status).
  useFocusEffect(useCallback(() => {
    carregar();
    const intervalo = setInterval(carregar, INTERVALO);
    return () => clearInterval(intervalo);
  }, [carregar]));

  if (!pedido) return erro ? <BannerOffline mensagem={erro} /> : <Carregando />;

  async function executar(acao: () => Promise<Pedido>, sucesso: string) {
    setEnviando(true);
    try {
      setPedido(await acao());
      alertar(sucesso);
    } catch (e) {
      alertar('Não foi possível concluir', e instanceof Error ? e.message : undefined);
    } finally {
      setEnviando(false);
    }
  }

  const etapas = etapasDoPedido(pedido.tipoEntrega);
  const indice = etapas.indexOf(pedido.status);

  return (
    <ScrollView style={{ backgroundColor: c.fundo }} contentContainerStyle={{ padding: espaco.g }}>
      <Stack.Screen options={{ title: `Pedido ${pedido.numero}` }} />
      {novo ? (
        <View accessibilityRole="alert" style={[estilos.sucesso, { backgroundColor: c.sucessoFundo }]}>
          <Text style={{ color: c.sucesso, fontWeight: '700' }}>Pedido enviado! Acompanhe cada etapa por aqui.</Text>
        </View>
      ) : null}
      {erro ? <BannerOffline mensagem="Sem conexão: mostrando a última atualização." /> : null}

      <Cartao>
        <View style={estilos.linha}>
          <Titulo>Pedido {pedido.numero}</Titulo>
          <SeloStatus status={pedido.status} rotulo={pedido.statusRotulo} />
        </View>
        <Text style={{ color: c.textoSuave }}>{formatarData(pedido.dataPedido)}</Text>

        {pedido.status !== 'cancelado' ? (
          <View accessible accessibilityLabel={`Etapa ${indice + 1} de ${etapas.length}: ${rotulosStatus[pedido.status]}`}
            style={{ marginTop: espaco.g }}>
            {etapas.map((etapa, i) => (
              <View key={etapa} style={estilos.etapa}>
                <View style={[estilos.bolinha, { backgroundColor: i <= indice ? c.sucesso : c.borda }]} />
                <Text style={{ color: i <= indice ? c.texto : c.textoSuave, fontWeight: i === indice ? '800' : '400' }}>
                  {rotulosStatus[etapa]}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ color: c.erro, marginTop: espaco.m }}>Cancelado{pedido.motivoCancelamento ? `: ${pedido.motivoCancelamento}` : ''}</Text>
        )}
      </Cartao>

      <Cartao>
        <Titulo>Itens</Titulo>
        {pedido.itens.map((i) => (
          <View key={i.produtoId} style={estilos.linha}>
            <Text style={{ color: c.texto, flex: 1 }}>{i.quantidade}× {i.nomeProduto}</Text>
            <Text style={{ color: c.texto }}>{formatarMoeda(i.subtotal)}</Text>
          </View>
        ))}
        <View style={[estilos.linha, { marginTop: espaco.p }]}><Text style={{ color: c.textoSuave }}>Taxa de entrega</Text>
          <Text style={{ color: c.textoSuave }}>{pedido.taxaEntrega ? formatarMoeda(pedido.taxaEntrega) : 'Grátis'}</Text></View>
        <View style={estilos.linha}><Text style={{ color: c.texto, fontWeight: '800' }}>Total</Text>
          <Text style={{ color: c.primaria, fontWeight: '800', fontSize: 18 }}>{formatarMoeda(pedido.total)}</Text></View>
        <Text style={{ color: c.textoSuave, marginTop: espaco.p }}>
          Pagamento: {pedido.formaPagamentoRotulo} ({pedido.tipoEntrega === 'entrega' ? 'na entrega' : 'na retirada'})
        </Text>
        {pedido.enderecoEntrega ? <Text style={{ color: c.textoSuave }}>Entrega em: {pedido.enderecoEntrega}</Text> : null}
        {pedido.observacao ? <Text style={{ color: c.textoSuave }}>Observação: {pedido.observacao}</Text> : null}
      </Cartao>

      {pedido.historico.length ? (
        <Cartao>
          <Titulo>Linha do tempo</Titulo>
          {pedido.historico.map((h, i) => (
            <View key={i} style={{ marginBottom: espaco.p }}>
              <Text style={{ color: c.texto, fontWeight: '700' }}>{h.rotulo}</Text>
              <Text style={{ color: c.textoSuave, fontSize: 13 }}>{formatarData(h.data)}{h.responsavel ? ` · ${h.responsavel}` : ''}</Text>
            </View>
          ))}
        </Cartao>
      ) : null}

      <View style={{ gap: espaco.p }}>
        {pedido.acoes.podeConfirmarRecebimento ? (
          <Botao titulo="Confirmar que recebi" icone="checkmark-circle-outline" carregando={enviando}
            aoPressionar={async () => {
              if (await confirmar('Confirmar recebimento', `Você recebeu o pedido ${pedido.numero}?`, 'Sim, recebi')) {
                executar(() => api.pedidos.confirmarRecebimento(pedido.id), 'Obrigado! Bom café ☕');
              }
            }} />
        ) : null}
        {pedido.acoes.podeCancelar ? (
          <Botao titulo="Cancelar pedido" variante="perigo" icone="close-circle-outline" carregando={enviando}
            aoPressionar={async () => {
              if (await confirmar('Cancelar pedido', 'Os itens voltam para o estoque. Deseja cancelar?', 'Cancelar pedido', true)) {
                executar(() => api.pedidos.cancelar(pedido.id, null), 'Pedido cancelado.');
              }
            }} />
        ) : null}
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaco.p, marginBottom: 4 },
  etapa: { flexDirection: 'row', alignItems: 'center', gap: espaco.m, marginBottom: espaco.p },
  bolinha: { width: 14, height: 14, borderRadius: 7 },
  sucesso: { padding: espaco.m, borderRadius: 10, marginBottom: espaco.m }
});
