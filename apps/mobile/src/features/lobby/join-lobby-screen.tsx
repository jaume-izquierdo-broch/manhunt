import { JOIN_CODE_LENGTH, joinLobbySchema } from '@manhunt/types';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { validateForm } from '@/lib/forms';
import { AppText, Banner, Button, Screen, TextField } from '@/ui';
import {
  goToMatch,
  handleMatchEntryError,
} from '@/features/match/match-navigation';
import { useJoinLobby } from './lobby.queries';

export function JoinLobbyScreen() {
  const router = useRouter();
  const join = useJoinLobby();
  const [code, setCode] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const result = validateForm(joinLobbySchema, { joinCode: code });
    setFieldError(result.errors.joinCode);
    if (!result.ok) return;

    setError(null);
    try {
      const match = await join.mutateAsync(result.data.joinCode);
      goToMatch(router, match.id);
    } catch (e) {
      setError(handleMatchEntryError(router, e));
    }
  };

  return (
    <Screen
      footer={<Button title="Join" onPress={submit} loading={join.isPending} />}
    >
      <AppText tone="muted">
        Ask the host for the {JOIN_CODE_LENGTH}-character code.
      </AppText>
      <TextField
        label="Lobby code"
        value={code}
        onChangeText={(text) => {
          setCode(text.toUpperCase());
          setFieldError(undefined);
        }}
        error={fieldError}
        placeholder="ABC234"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={JOIN_CODE_LENGTH}
        autoFocus
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      {error ? <Banner tone="danger" message={error} /> : null}
    </Screen>
  );
}
