import { Alert, Platform } from 'react-native';

// Alert.alert não funciona no Expo Web; estes atalhos funcionam nas três plataformas.

export function alertar(titulo: string, mensagem?: string) {
  if (Platform.OS === 'web') {
    window.alert(mensagem ? `${titulo}\n\n${mensagem}` : titulo);
    return;
  }
  Alert.alert(titulo, mensagem);
}

export function confirmar(titulo: string, mensagem: string, textoConfirmar = 'Confirmar', destrutivo = false): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${titulo}\n\n${mensagem}`));
  return new Promise((resolver) => {
    Alert.alert(titulo, mensagem, [
      { text: 'Voltar', style: 'cancel', onPress: () => resolver(false) },
      { text: textoConfirmar, style: destrutivo ? 'destructive' : 'default', onPress: () => resolver(true) }
    ], { cancelable: true, onDismiss: () => resolver(false) });
  });
}
