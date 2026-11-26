import { Platform, StyleSheet, View } from 'react-native';
import type { LocationAccess } from '@/lib/location/device-location';
import { Banner, type BannerTone, Button, spacing } from '@/ui';
import {
  useLocationAccess,
  useLocationAccessStore,
} from './location-access.store';

const android = Platform.OS === 'android';

const COPY: Record<
  Exclude<LocationAccess, 'granted'>,
  { message: string; action: string }
> = {
  askable: {
    message: 'Manhunt needs your location to play.',
    action: 'Allow location',
  },
  blocked: {
    message:
      'Location access is turned off for Manhunt. Turn it on in Settings to play.',
    action: 'Open settings',
  },
  servicesOff: {
    message: "Your phone's location is turned off.",
    action: android ? 'Turn on location' : 'Open settings',
  },
  approximate: {
    message:
      'Manhunt only has your approximate location, so catches can’t be checked. Allow precise location.',
    action: android ? 'Allow precise location' : 'Open settings',
  },
};

interface LocationAccessNoticeProps {
  tone?: BannerTone;
  /** Replaces the message while the dialog can still be shown, to explain why now. */
  askMessage?: string;
}

/** Why the location isn't available, and the one button that fixes it. Nothing once it is. */
export function LocationAccessNotice({
  tone = 'warning',
  askMessage,
}: LocationAccessNoticeProps) {
  const access = useLocationAccess();
  const fix = useLocationAccessStore((s) => s.fix);
  if (access === null || access === 'granted') return null;

  const copy = COPY[access];
  const message =
    access === 'askable' && askMessage ? askMessage : copy.message;

  return (
    <View style={styles.container}>
      <Banner tone={tone} message={message} />
      <Button
        title={copy.action}
        variant="secondary"
        compact
        onPress={() => void fix()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
});
