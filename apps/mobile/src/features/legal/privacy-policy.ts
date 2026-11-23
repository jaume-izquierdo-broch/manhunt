// The privacy policy and terms of use shown in the app.
//
// ⚠️ DRAFT: it accurately describes the data the app processes today, but
// before publishing, fill in LEGAL_CONTACT and have it reviewed by someone with
// legal expertise. If you change it materially, bump TERMS_VERSION in
// @manhunt/types: the API records which version each user accepted.
import { TERMS_VERSION } from '@manhunt/types';

/** Fill these in before publishing. */
export const LEGAL_CONTACT = {
  owner: '[Data controller name]',
  email: '[contact email]',
};

export interface PolicySection {
  title: string;
  paragraphs: string[];
}

export const POLICY_VERSION = TERMS_VERSION;

export const PRIVACY_POLICY: PolicySection[] = [
  {
    title: 'Who is responsible',
    paragraphs: [
      `Your data is controlled by ${LEGAL_CONTACT.owner}. For any privacy question, write to ${LEGAL_CONTACT.email}.`,
    ],
  },
  {
    title: 'What data we process',
    paragraphs: [
      'Account: username, email and password (stored as a one-way hash; nobody can read it).',
      'Matches: which matches you play, your team and the outcome (whether you were caught, and by whom).',
      'Location: only while a match is being played and the app is open. It is used to show you on the map, share it with your team, send "pings" to the hunters and validate catches.',
    ],
  },
  {
    title: 'Why, and on what basis',
    paragraphs: [
      'We use this data only so you can play: to identify you, run matches and apply their rules. The legal bases are your consent, given when you create the account, and providing the service itself.',
      'We do not sell your data or use it for advertising.',
    ],
  },
  {
    title: 'Who sees your location',
    paragraphs: [
      'During a match, your teammates see it live. If you are a runner, the hunters only receive it on each ping, according to the match rules.',
      'Nobody outside the match can access it.',
    ],
  },
  {
    title: 'How long we keep it',
    paragraphs: [
      'Location is temporary: it is deleted when the match ends, and after 12 hours at most. We keep no history of your movements.',
      'Account data and match history are kept for as long as you have an account.',
    ],
  },
  {
    title: 'Your rights',
    paragraphs: [
      `You can ask to access, correct, delete or restrict the use of your data by writing to ${LEGAL_CONTACT.email}. You can also complain to your country's data protection authority (in Spain, the AEPD).`,
    ],
  },
  {
    title: 'Terms of use',
    paragraphs: [
      'Manhunt is played in the real world: play in safe public places, follow traffic rules, respect private property and never put anyone at risk. You are responsible for your own safety while playing.',
      'You must be at least 14 years old, or have your parents’ or guardians’ consent, to use the app.',
      'We may suspend accounts that cheat or harass other players.',
    ],
  },
];
