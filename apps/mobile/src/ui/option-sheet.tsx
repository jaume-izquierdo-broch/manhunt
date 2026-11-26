import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './app-text';
import { Icon } from './icon';
import { radius, spacing } from './theme';
import { useThemeColors } from './use-theme';

export interface Option<T> {
  value: T;
  label: string;
}

export interface OptionSheetProps<T> {
  visible: boolean;
  title: string;
  options: readonly Option<T>[];
  value: T;
  onSelect: (value: T) => void;
  onClose: () => void;
}

/** A sheet from the bottom to pick one option. Tapping outside closes it. */
export function OptionSheet<T extends string | number>({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose,
}: OptionSheetProps<T>) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: c.overlay }]}
        accessibilityLabel="Close"
        onPress={onClose}
      />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: c.surface,
            borderColor: c.border,
            paddingBottom: insets.bottom + spacing.lg,
          },
        ]}
        accessibilityRole="radiogroup"
        accessibilityLabel={title}
      >
        <View style={[styles.handle, { backgroundColor: c.border }]} />
        <AppText variant="subtitle" style={styles.title}>
          {title}
        </AppText>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={option.label}
              onPress={() => {
                onClose();
                if (!selected) onSelect(option.value);
              }}
              style={({ pressed }) => [
                styles.option,
                (selected || pressed) && { backgroundColor: c.surfaceAlt },
              ]}
            >
              <AppText variant="body" tone={selected ? 'primary' : 'default'}>
                {option.label}
              </AppText>
              {selected ? <Icon name="checkmark" color="primary" /> : null}
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    marginBottom: spacing.sm,
  },
  title: { marginBottom: spacing.sm },
  option: {
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
