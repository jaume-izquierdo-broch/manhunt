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
  PING_OPTIONS,
  RADIUS_OPTIONS,
} from '../match-options';
import { useCreateMatch } from '../matches.queries';

type Center =
  | { status: 'locating' }
  | { status: 'ready'; position: DevicePosition }
  | { status: 'error'; message: string };

/** Crear partida: la zona se centra en tu ubicación actual. */
export function CreateMatchScreen() {
  const router = useRouter();
  const create = useCreateMatch();
  const [settings, setSettings] = useState(DEFAULT_MATCH_SETTINGS);
  const [center, setCenter] = useState<Center>({ status: 'locating' });
  const [error, setError] = useState<string | null>(null);

  // Al entrar se pide la ubicación una vez; "Reintentar" vuelve a pedirla.
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

  const locate = () => {
    setCenter({ status: 'locating' });
    setAttempt((n) => n + 1);
  };

  const set =
    <K extends keyof typeof settings>(key: K) =>
    (value: (typeof settings)[K]) =>
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
          title="Crear sala"
          onPress={submit}
          loading={create.isPending}
          disabled={center.status !== 'ready'}
        />
      }
    >
      <Card>
        <AppText variant="label">Centro de la zona</AppText>
        {center.status === 'locating' ? (
          <AppText tone="muted">Buscando tu ubicación…</AppText>
        ) : null}
        {center.status === 'ready' ? (
          <AppText tone="muted">
            Tu ubicación actual
            {center.position.accuracy !== null
              ? ` (precisión ±${formatDistance(center.position.accuracy)})`
              : ''}
          </AppText>
        ) : null}
        {center.status === 'error' ? (
          <>
            <Banner tone="danger" message={center.message} />
            <Button
              title="Reintentar"
              variant="secondary"
              compact
              onPress={locate}
            />
          </>
        ) : null}
      </Card>

      <OptionPicker
        label="Radio de la zona"
        options={RADIUS_OPTIONS}
        value={settings.radiusMeters}
        onChange={set('radiusMeters')}
      />
      <OptionPicker
        label="Tiempo para esconderse"
        options={HIDING_OPTIONS}
        value={settings.hidingSeconds}
        onChange={set('hidingSeconds')}
      />
      <OptionPicker
        label="Duración de la caza"
        options={DURATION_OPTIONS}
        value={settings.durationSeconds}
        onChange={set('durationSeconds')}
      />
      <OptionPicker
        label="Ping a los cazadores cada"
        options={PING_OPTIONS}
        value={settings.pingIntervalSeconds}
        onChange={set('pingIntervalSeconds')}
      />

      {error ? <Banner tone="danger" message={error} /> : null}
    </Screen>
  );
}
