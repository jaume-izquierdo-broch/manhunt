import { AppText, Card, Screen } from '@/ui';
import { POLICY_VERSION, PRIVACY_POLICY } from './privacy-policy';

/** Privacy policy and terms of use. Reachable with or without a session. */
export function PrivacyScreen() {
  return (
    <Screen scroll>
      <AppText tone="muted" variant="caption">
        Version {POLICY_VERSION}
      </AppText>
      {PRIVACY_POLICY.map((section) => (
        <Card key={section.title}>
          <AppText variant="label">{section.title}</AppText>
          {section.paragraphs.map((paragraph) => (
            <AppText key={paragraph} variant="caption">
              {paragraph}
            </AppText>
          ))}
        </Card>
      ))}
    </Screen>
  );
}
