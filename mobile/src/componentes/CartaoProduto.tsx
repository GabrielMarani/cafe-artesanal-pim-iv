import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Produto } from '../api/tipos';
import { ALVO_TOQUE, espaco, raio, useCores } from '../tema';
import { formatarMoeda } from '../utils/formatos';
import { Selo } from './ui';

interface Props {
  produto: Produto;
  aoAbrir: () => void;
  aoAdicionar?: () => void;
}

/**
 * Cartão do cardápio. O botão "adicionar" fica ao lado da área clicável (e não dentro dela):
 * botões aninhados confundem leitores de tela e são HTML inválido no Expo Web.
 */
export function CartaoProduto({ produto: p, aoAbrir, aoAdicionar }: Props) {
  const c = useCores();
  return (
    <View style={[estilos.cartao, { backgroundColor: c.superficie, borderColor: c.borda }]}>
      <Pressable
        onPress={aoAbrir}
        accessibilityRole="button"
        accessibilityLabel={`${p.nome}, ${formatarMoeda(p.preco)}${p.disponivel ? '' : ', esgotado'}`}
        accessibilityHint="Abre os detalhes do produto"
        style={({ pressed }) => [estilos.area, { opacity: pressed ? 0.85 : 1 }]}
      >
        <Image
          source={p.imagemUrl ? { uri: p.imagemUrl } : undefined}
          style={[estilos.imagem, { backgroundColor: c.fundoAlt }]}
          accessibilityIgnoresInvertColors
        />
        <View style={estilos.corpo}>
          <Text style={[estilos.categoria, { color: c.destaque }]}>{p.categoriaNome?.toUpperCase()}</Text>
          <Text style={[estilos.nome, { color: c.texto }]} numberOfLines={2}>{p.nome}</Text>
          <View style={estilos.selos}>
            {p.destaque ? <Selo texto="Destaque" tipo="destaque" /> : null}
            {!p.disponivel ? <Selo texto="Esgotado" tipo="erro" /> : p.estoque <= 5 ? <Selo texto={`Últimas ${p.estoque}`} tipo="alerta" /> : null}
          </View>
          <Text style={[estilos.preco, { color: c.primaria }]}>{formatarMoeda(p.preco)}</Text>
        </View>
      </Pressable>

      {aoAdicionar ? (
        <Pressable
          onPress={aoAdicionar}
          disabled={!p.disponivel}
          accessibilityRole="button"
          accessibilityLabel={`Adicionar ${p.nome} ao carrinho`}
          aria-disabled={!p.disponivel}
          hitSlop={8}
          style={[estilos.adicionar, { backgroundColor: c.primaria, opacity: p.disponivel ? 1 : 0.4 }]}
        >
          <Ionicons name="add" size={24} color={c.sobrePrimaria} />
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: { flexDirection: 'row', alignItems: 'flex-end', borderWidth: 1, borderRadius: raio.m, overflow: 'hidden', marginBottom: espaco.m },
  area: { flex: 1, flexDirection: 'row', alignSelf: 'stretch' },
  imagem: { width: 110, minHeight: 120 },
  corpo: { flex: 1, padding: espaco.m, gap: 2 },
  categoria: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  nome: { fontSize: 16, fontWeight: '700' },
  selos: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginVertical: 4 },
  preco: { fontSize: 17, fontWeight: '800', marginTop: 'auto' },
  adicionar: {
    width: ALVO_TOQUE, height: ALVO_TOQUE, borderRadius: ALVO_TOQUE / 2, alignItems: 'center', justifyContent: 'center',
    margin: espaco.m
  }
});
