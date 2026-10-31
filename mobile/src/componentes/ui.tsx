import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle
} from 'react-native';
import type { StatusPedido } from '../api/tipos';
import { ALVO_TOQUE, coresStatus, espaco, raio, useCores } from '../tema';
import { rotulosStatus } from '../utils/formatos';

export type NomeIcone = ComponentProps<typeof Ionicons>['name'];

// ------------------------------------------------------------------ Botão

interface BotaoProps {
  titulo: string;
  aoPressionar: () => void;
  variante?: 'primario' | 'secundario' | 'perigo' | 'texto';
  icone?: NomeIcone;
  carregando?: boolean;
  desabilitado?: boolean;
  rotuloAcessivel?: string;
  estilo?: StyleProp<ViewStyle>;
}

export function Botao({ titulo, aoPressionar, variante = 'primario', icone, carregando, desabilitado, rotuloAcessivel, estilo }: BotaoProps) {
  const c = useCores();
  const fundo = { primario: c.primaria, secundario: c.superficie, perigo: c.erro, texto: 'transparent' }[variante];
  const corTexto = { primario: c.sobrePrimaria, secundario: c.texto, perigo: '#FFFFFF', texto: c.destaque }[variante];
  const inativo = desabilitado || carregando;

  return (
    <Pressable
      onPress={aoPressionar}
      disabled={inativo}
      role="button"
      aria-label={rotuloAcessivel ?? titulo}
      aria-disabled={inativo}
      aria-busy={carregando}
      style={({ pressed }) => [
        estilos.botao,
        { backgroundColor: fundo, borderColor: variante === 'secundario' ? c.borda : fundo, opacity: inativo ? 0.5 : pressed ? 0.85 : 1 },
        estilo
      ]}
    >
      {carregando ? <ActivityIndicator color={corTexto} /> : icone ? <Ionicons name={icone} size={20} color={corTexto} /> : null}
      <Text style={[estilos.textoBotao, { color: corTexto }]}>{titulo}</Text>
    </Pressable>
  );
}

// ------------------------------------------------------------------ Campo de texto com rótulo

interface CampoProps extends TextInputProps {
  rotulo: string;
  ajuda?: string;
  erro?: string | null;
  opcional?: boolean;
}

export function Campo({ rotulo, ajuda, erro, opcional, style, ...props }: CampoProps) {
  const c = useCores();
  return (
    <View style={{ marginBottom: espaco.g }}>
      <Text style={[estilos.rotulo, { color: c.texto }]}>
        {rotulo}{opcional ? <Text style={{ color: c.textoSuave, fontWeight: '400' }}> (opcional)</Text> : null}
      </Text>
      <TextInput
        accessibilityLabel={rotulo}
        accessibilityHint={ajuda}
        placeholderTextColor={c.textoSuave}
        style={[estilos.entrada, { borderColor: erro ? c.erro : c.borda, backgroundColor: c.superficie, color: c.texto }, style]}
        {...props}
      />
      {ajuda && !erro ? <Text style={[estilos.ajuda, { color: c.textoSuave }]}>{ajuda}</Text> : null}
      {erro ? <Text accessibilityLiveRegion="polite" style={[estilos.ajuda, { color: c.erro, fontWeight: '600' }]}>{erro}</Text> : null}
    </View>
  );
}

// ------------------------------------------------------------------ Opção (rádio)

export function Opcao({ rotulo, descricao, selecionada, aoSelecionar, icone }: {
  rotulo: string; descricao?: string; selecionada: boolean; aoSelecionar: () => void; icone?: NomeIcone;
}) {
  const c = useCores();
  return (
    <Pressable
      onPress={aoSelecionar}
      role="radio"
      aria-checked={selecionada}
      aria-label={descricao ? `${rotulo}. ${descricao}` : rotulo}
      style={[estilos.opcao, { borderColor: selecionada ? c.primaria : c.borda, backgroundColor: selecionada ? c.fundoAlt : c.superficie }]}
    >
      <Ionicons name={selecionada ? 'radio-button-on' : 'radio-button-off'} size={22} color={selecionada ? c.primaria : c.textoSuave} />
      {icone ? <Ionicons name={icone} size={20} color={c.texto} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.texto, fontWeight: selecionada ? '700' : '500' }}>{rotulo}</Text>
        {descricao ? <Text style={{ color: c.textoSuave, fontSize: 13 }}>{descricao}</Text> : null}
      </View>
    </Pressable>
  );
}

// ------------------------------------------------------------------ Cartão, títulos e selos

export function Cartao({ children, estilo }: { children: ReactNode; estilo?: StyleProp<ViewStyle> }) {
  const c = useCores();
  return <View style={[estilos.cartao, { backgroundColor: c.superficie, borderColor: c.borda }, estilo]}>{children}</View>;
}

export function Titulo({ children }: { children: ReactNode }) {
  const c = useCores();
  return <Text accessibilityRole="header" style={[estilos.titulo, { color: c.texto }]}>{children}</Text>;
}

export function SeloStatus({ status, rotulo }: { status: StatusPedido; rotulo?: string }) {
  const cor = coresStatus[status];
  return (
    <View style={[estilos.selo, { backgroundColor: cor.fundo }]}>
      <Text style={{ color: cor.texto, fontWeight: '700', fontSize: 12 }}>{rotulo ?? rotulosStatus[status]}</Text>
    </View>
  );
}

export function Selo({ texto, tipo = 'neutro' }: { texto: string; tipo?: 'neutro' | 'alerta' | 'erro' | 'destaque' }) {
  const c = useCores();
  const cores = {
    neutro: [c.fundoAlt, c.texto], alerta: [c.avisoFundo, c.aviso], erro: [c.erroFundo, c.erro], destaque: ['#C27B40', '#1F1A17']
  }[tipo];
  return (
    <View style={[estilos.selo, { backgroundColor: cores[0] }]}>
      <Text style={{ color: cores[1], fontWeight: '700', fontSize: 12 }}>{texto}</Text>
    </View>
  );
}

// ------------------------------------------------------------------ Estados

export function Carregando({ texto = 'Carregando...' }: { texto?: string }) {
  const c = useCores();
  return (
    <View style={estilos.centro} accessibilityRole="progressbar" accessibilityLabel={texto}>
      <ActivityIndicator size="large" color={c.primaria} />
      <Text style={{ color: c.textoSuave, marginTop: espaco.m }}>{texto}</Text>
    </View>
  );
}

export function EstadoVazio({ icone, titulo, texto, acao }: { icone: NomeIcone; titulo: string; texto?: string; acao?: ReactNode }) {
  const c = useCores();
  return (
    <View style={estilos.centro}>
      <Ionicons name={icone} size={56} color={c.textoSuave} />
      <Text accessibilityRole="header" style={[estilos.titulo, { color: c.texto, textAlign: 'center', marginTop: espaco.m }]}>{titulo}</Text>
      {texto ? <Text style={{ color: c.textoSuave, textAlign: 'center', marginBottom: espaco.g }}>{texto}</Text> : null}
      {acao}
    </View>
  );
}

/** Faixa exibida quando o app está sem internet ou não alcança a API. */
export function BannerOffline({ mensagem }: { mensagem: string }) {
  const c = useCores();
  return (
    <View accessibilityRole="alert" style={[estilos.banner, { backgroundColor: c.avisoFundo, borderColor: c.aviso }]}>
      <Ionicons name="cloud-offline-outline" size={20} color={c.aviso} />
      <Text style={{ color: c.aviso, flex: 1, fontWeight: '600' }}>{mensagem}</Text>
    </View>
  );
}

export function Quantidade({ valor, aoMudar, maximo, nome }: { valor: number; aoMudar: (n: number) => void; maximo: number; nome: string }) {
  const c = useCores();
  const botao = (rotulo: string, icone: NomeIcone, novo: number, desabilitado = false) => (
    <Pressable
      onPress={() => aoMudar(novo)}
      disabled={desabilitado}
      accessibilityRole="button"
      accessibilityLabel={`${rotulo} quantidade de ${nome}`}
      style={[estilos.botaoQtd, { backgroundColor: c.fundoAlt, opacity: desabilitado ? 0.4 : 1 }]}
    >
      <Ionicons name={icone} size={18} color={c.texto} />
    </Pressable>
  );
  return (
    <View style={estilos.linha} accessibilityLabel={`Quantidade de ${nome}: ${valor}`}>
      {botao('Diminuir', valor === 1 ? 'trash-outline' : 'remove', valor - 1)}
      <Text style={{ color: c.texto, fontWeight: '700', minWidth: 28, textAlign: 'center' }}>{valor}</Text>
      {botao('Aumentar', 'add', valor + 1, valor >= maximo)}
    </View>
  );
}

export const estilos = StyleSheet.create({
  botao: {
    minHeight: ALVO_TOQUE + 4, paddingHorizontal: espaco.gg, borderRadius: raio.p, borderWidth: 1.5,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: espaco.p
  },
  textoBotao: { fontSize: 16, fontWeight: '700' },
  rotulo: { fontWeight: '600', marginBottom: 6, fontSize: 15 },
  entrada: { minHeight: ALVO_TOQUE + 4, borderWidth: 1.5, borderRadius: raio.p, paddingHorizontal: espaco.m, fontSize: 16 },
  ajuda: { fontSize: 13, marginTop: 4 },
  opcao: {
    flexDirection: 'row', alignItems: 'center', gap: espaco.m, borderWidth: 2, borderRadius: raio.p,
    padding: espaco.m, minHeight: ALVO_TOQUE + 8, marginBottom: espaco.p
  },
  cartao: { borderWidth: 1, borderRadius: raio.m, padding: espaco.g, marginBottom: espaco.m },
  titulo: { fontSize: 20, fontWeight: '700', marginBottom: espaco.p },
  selo: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espaco.gg, minHeight: 280 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: espaco.p, padding: espaco.m, borderWidth: 1, borderRadius: raio.p, margin: espaco.g, marginBottom: 0 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.p },
  botaoQtd: { width: ALVO_TOQUE, height: ALVO_TOQUE, borderRadius: raio.p, alignItems: 'center', justifyContent: 'center' }
});
