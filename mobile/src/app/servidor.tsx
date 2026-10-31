import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { api } from '../api/endpoints';
import { Botao, Campo, Cartao } from '../componentes/ui';
import { salvarUrlApi, urlApi, urlPadrao } from '../config';
import { useCatalogo } from '../contexto/CatalogoContext';
import { espaco, useCores } from '../tema';

/**
 * Configuração do endereço da API. No Expo Go o app já detecta o IP do computador
 * que roda o "npx expo start"; aqui dá para trocar manualmente se precisar.
 */
export default function TelaServidor() {
  const c = useCores();
  const { sincronizar } = useCatalogo();
  const [url, setUrl] = useState(urlApi());
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [testando, setTestando] = useState(false);

  async function testarESalvar() {
    setTestando(true);
    setResultado(null);
    await salvarUrlApi(url);
    try {
      const loja = await api.loja();
      setResultado({ ok: true, texto: `Conectado a "${loja.nome}". Endereço salvo.` });
      sincronizar();
    } catch (e) {
      setResultado({ ok: false, texto: e instanceof Error ? e.message : 'Falha na conexão.' });
    } finally {
      setTestando(false);
    }
  }

  async function restaurar() {
    await salvarUrlApi(null);
    setUrl(urlPadrao());
    setResultado({ ok: true, texto: 'Usando o endereço detectado automaticamente.' });
  }

  return (
    <ScrollView style={{ backgroundColor: c.fundo }} contentContainerStyle={{ padding: espaco.gg }} keyboardShouldPersistTaps="handled">
      <Cartao>
        <Text style={{ color: c.texto, marginBottom: espaco.m }}>
          Rode a API no computador com <Text style={{ fontWeight: '700' }}>dotnet run --launch-profile rede-local</Text> e
          use o IP dele na mesma rede Wi-Fi. Exemplo: http://192.168.0.10:5000/api/v1
        </Text>
        <Text style={{ color: c.textoSuave, fontSize: 13 }}>Detectado automaticamente: {urlPadrao()}</Text>
      </Cartao>
      <Campo rotulo="Endereço da API" value={url} onChangeText={setUrl} autoCapitalize="none" keyboardType="url" autoCorrect={false} />
      {resultado ? (
        <Text accessibilityLiveRegion="polite" style={{ color: resultado.ok ? c.sucesso : c.erro, fontWeight: '600', marginBottom: espaco.g }}>
          {resultado.texto}
        </Text>
      ) : null}
      <Botao titulo="Testar e salvar" icone="wifi-outline" carregando={testando} aoPressionar={testarESalvar} />
      <Botao titulo="Usar detecção automática" variante="texto" estilo={{ marginTop: espaco.m }} aoPressionar={restaurar} />
    </ScrollView>
  );
}
