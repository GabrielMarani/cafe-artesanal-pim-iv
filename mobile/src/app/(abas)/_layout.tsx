import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { useCarrinho } from '../../contexto/CarrinhoContext';
import { useCores } from '../../tema';

export default function LayoutAbas() {
  const c = useCores();
  const { quantidadeTotal } = useCarrinho();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.primaria,
        tabBarInactiveTintColor: c.textoSuave,
        tabBarStyle: { backgroundColor: c.superficie, borderTopColor: c.borda },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        headerStyle: { backgroundColor: c.superficie },
        headerTintColor: c.texto
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Cardápio', tabBarIcon: ({ color, size }) => <Ionicons name="cafe-outline" color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="carrinho"
        options={{
          title: 'Carrinho',
          tabBarBadge: quantidadeTotal > 0 ? quantidadeTotal : undefined,
          tabBarAccessibilityLabel: `Carrinho, ${quantidadeTotal} itens`,
          tabBarIcon: ({ color, size }) => <Ionicons name="cart-outline" color={color as string} size={size} />
        }}
      />
      <Tabs.Screen
        name="pedidos"
        options={{ title: 'Pedidos', tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="conta"
        options={{ title: 'Conta', tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" color={color as string} size={size} /> }}
      />
    </Tabs>
  );
}
