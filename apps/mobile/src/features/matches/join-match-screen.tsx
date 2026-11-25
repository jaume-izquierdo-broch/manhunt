import { JOIN_CODE_LENGTH, joinMatchSchema } from '@manhunt/types';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { validateForm } from '@/lib/forms';
import { AppText, Banner, Button, Screen, TextField } from '@/ui';
import { goToMatch, handleMatchEntryError } from '../match-navigation';
import { useJoinMatch } from '../matches.queries';

export function JoinMatchScreen() {
  const router = useRouter();
  const join = useJoinMatch();
  const [code, setCode] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const result = validateForm(joinMatchSchema, { joinCode: code });
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
