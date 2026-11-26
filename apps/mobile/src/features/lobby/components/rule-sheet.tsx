import type { MatchSettings } from '@manhunt/types';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  describeSetting,
  fitSettings,
  type SettingKey,
  stepsFor,
} from '../match-settings';
import { AppText, Button, Sheet, spacing, StepSlider } from '@/ui';

/**
 * Changes one rule. The value moves freely while the sheet is open and is
 * saved when it closes, together with any rule it pulls along (a shorter hunt
 * shortens the pings).
 */
export function RuleSheet({
  title,
  setting,
  format,
  settings,
  onChange,
  onClose,
}: {
  title: string;
  setting: SettingKey;
  format: (value: number) => string;
  settings: MatchSettings;
  onChange: (settings: MatchSettings) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(settings[setting]);
  const next = fitSettings({ ...settings, [setting]: value });

  return (
    <Sheet
      title={title}
      onClose={() => {
        if (value !== settings[setting]) onChange(next);
        onClose();
      }}
    >
      {(close) => (
        <>
          <AppText variant="title" center style={styles.value}>
            {format(value)}
          </AppText>
          <StepSlider
            steps={stepsFor(setting, settings)}
            value={value}
            onChange={setValue}
            label={title}
            format={format}
          />
          <AppText variant="body" tone="muted" center>
            {describeSetting(setting, next)}
          </AppText>
          <Button title="Done" onPress={close} />
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  value: { marginTop: spacing.xs },
});
