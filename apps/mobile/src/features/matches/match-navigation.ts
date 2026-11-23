import type { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { ApiError, errorMessage } from '@/lib/http/api-error';

type Router = ReturnType<typeof useRouter>;

export function goToMatch(router: Router, matchId: string) {
  router.replace({ pathname: '/match/[id]', params: { id: matchId } });
}

/**
 * Error al crear/unirse. Si es porque ya estás en otra partida, ofrece ir a ella.
 * Devuelve el mensaje para mostrarlo en línea si no se ha gestionado con un diálogo.
 */
export function handleMatchEntryError(
  router: Router,
  error: unknown,
): string | null {
  const openMatchId = error instanceof ApiError ? error.openMatchId : null;
  if (openMatchId) {
    Alert.alert(
      'Ya estás en una partida',
      'Solo puedes estar en una partida a la vez.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Ir a mi partida',
          onPress: () => goToMatch(router, openMatchId),
        },
      ],
    );
    return null;
  }
  return errorMessage(error);
}
