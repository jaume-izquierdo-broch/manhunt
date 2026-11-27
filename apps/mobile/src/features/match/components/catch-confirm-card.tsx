import type { CatchClaim } from '@manhunt/types';
import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { errorMessage } from '@/lib/http/api-error';
import { AppText, Button, Card, spacing } from '@/ui';
import { msUntil } from '../rules/time';

export interface CatchConfirmCardProps {
  claim: CatchClaim;
  hunterName: string;
  /** "Now" by the server's clock. */
  now: number;
  onAnswer: (caught: boolean) => Promise<unknown>;
}

/**
 * A hunter says they caught me. Only I can turn it down; if I don't answer in
 * time it counts, since the server already checked we were a few meters apart.
 */
export function CatchConfirmCard({
  claim,
  hunterName,
  now,
  onAnswer,
}: CatchConfirmCardProps) {
  const [answering, setAnswering] = useState<boolean | null>(null);
  const seconds = Math.ceil((msUntil(claim.expiresAt, now) ?? 0) / 1000);

  const answer = async (caught: boolean) => {
    setAnswering(caught);
    try {
      await onAnswer(caught);
    } catch (error) {
      Alert.alert('Could not answer', errorMessage(error));
    } finally {
      setAnswering(null);
    }
  };

  return (
    <Card style={styles.card}>
      <AppText variant="subtitle">{`${hunterName} says they caught you`}</AppText>
      <AppText tone="muted">
        {seconds > 0
          ? `If you don't answer, it counts in ${seconds} s.`
          : 'It counts now.'}
      </AppText>
      <Button
        title="Yes, I was caught"
        variant="danger"
        loading={answering === true}
        disabled={answering !== null}
        onPress={() => void answer(true)}
      />
      <Button
        title="No, I got away"
        variant="secondary"
        loading={answering === false}
        disabled={answering !== null}
        onPress={() => void answer(false)}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
});
