import { AppText, Card, Screen } from '@/ui';
import { POLICY_VERSION, PRIVACY_POLICY } from './privacy-policy';

/** Política de privacidad y condiciones. Accesible con o sin sesión. */
export function PrivacyScreen() {
  return (
    <Screen scroll>
      <AppText tone="muted" variant="caption">
        Versión {POLICY_VERSION}
      </AppText>
      {PRIVACY_POLICY.map((section) => (
        <Card key={section.title}>
          <AppText variant="label">{section.title}</AppText>
          {section.paragraphs.map((p) => (
            <AppText key={p} variant="caption">
              {p}
            </AppText>
          ))}
        </Card>
      ))}
    </Screen>
  );
}
