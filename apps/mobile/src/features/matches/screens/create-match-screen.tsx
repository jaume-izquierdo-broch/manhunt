import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { formatDistance } from '@/lib/format';
import {
  type DevicePosition,
  getCurrentPosition,
} from '@/lib/location/device-location';
import { AppText, Banner, Button, Card, OptionPicker, Screen } from '@/ui';
import { goToMatch, handleMatchEntryError } from '../match-navigation';
import {
  DEFAULT_MATCH_SETTINGS,
  DURATION_OPTIONS,
  HIDING_OPTIONS,
  type MatchSettings,
  PING_OPTIONS,
  RADIUS_OPTIONS,
} from '../match-options';
import { useCreateMatch } from '../matches.queries';

type AreaCenter =
  | { status: 'locating' }
  | { status: 'ready'; position: DevicePosition }
  | { status: 'error'; message: string };

/** Create a match. The play area is centered on the user's current location. */
export function CreateMatchScreen() {
  const router = useRouter();
  const create = useCreateMatch();
  const [settings, setSettings] = useState(DEFAULT_MATCH_SETTINGS);
  const [center, setCenter] = useState<AreaCenter>({ status: 'locating' });
  const [error, setError] = useState<string | null>(null);

  // Locate once on mount; "Try again" bumps `attempt` to locate again.
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    getCurrentPosition()
      .then(
        (position) => !cancelled && setCenter({ status: 'ready', position }),
      )
      .catch(
        (e: Error) =>
          !cancelled && setCenter({ status: 'error', message: e.message }),
      );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retryLocation = () => {
    setCenter({ status: 'locating' });
    setAttempt((n) => n + 1);
  };

  const setSetting =
    <K extends keyof MatchSettings>(key: K) =>
    (value: MatchSettings[K]) =>
      setSettings((s) => ({ ...s, [key]: value }));

  const submit = async () => {
    if (center.status !== 'ready') return;
    setError(null);
    try {
      const match = await create.mutateAsync({
        playArea: {
          lat: center.position.lat,
          lng: center.position.lng,
          radiusMeters: settings.radiusMeters,
        },
        hidingSeconds: settings.hidingSeconds,
        durationSeconds: settings.durationSeconds,
        pingIntervalSeconds: settings.pingIntervalSeconds,
      });
      goToMatch(router, match.id);
    } catch (e) {
      setError(handleMatchEntryError(router, e));
    }
  };

  return (
    <Screen
      scroll
      footer={
        <Button
          title="Create lobby"
          onPress={submit}
          loading={create.isPending}
          disabled={center.status !== 'ready'}
        />
      }
    >
      <Card>
        <AppText variant="label">Center of the play area</AppText>
        {center.status === 'locating' ? (
          <AppText tone="muted">Finding your location…</AppText>
        ) : null}
        {center.status === 'ready' ? (
          <AppText tone="muted">
            Your current location
            {center.position.accuracy !== null
              ? ` (±${formatDistance(center.position.accuracy)})`
              : ''}
          </AppText>
        ) : null}
        {center.status === 'error' ? (
          <>
            <Banner tone="danger" message={center.message} />
            <Button
              title="Try again"
              variant="secondary"
              compact
              onPress={retryLocation}
            />
          </>
        ) : null}
      </Card>

      <OptionPicker
        label="Play area radius"
        options={RADIUS_OPTIONS}
        value={settings.radiusMeters}
        onChange={setSetting('radiusMeters')}
      />
      <OptionPicker
        label="Time to hide"
        options={HIDING_OPTIONS}
        value={settings.hidingSeconds}
        onChange={setSetting('hidingSeconds')}
      />
      <OptionPicker
        label="Hunt duration"
        options={DURATION_OPTIONS}
        value={settings.durationSeconds}
        onChange={setSetting('durationSeconds')}
      />
      <OptionPicker
        label="Ping the hunters every"
        options={PING_OPTIONS}
        value={settings.pingIntervalSeconds}
        onChange={setSetting('pingIntervalSeconds')}
      />

      {error ? <Banner tone="danger" message={error} /> : null}
    </Screen>
  );
}
