// Texto de la política de privacidad y condiciones de uso que se muestra en la app.
//
// ⚠️ BORRADOR: describe fielmente qué datos trata la app hoy, pero antes de publicarla
// complétalo (responsable y contacto) y que lo revise alguien con conocimientos legales.
// Si cambias el contenido de forma relevante, sube TERMS_VERSION en @manhunt/types:
// la API guarda qué versión aceptó cada usuario.
import { TERMS_VERSION } from '@manhunt/types';

/** Completa estos datos antes de publicar. */
export const LEGAL_CONTACT = {
  owner: '[Nombre del responsable]',
  email: '[email de contacto]',
};

export interface PolicySection {
  title: string;
  paragraphs: string[];
}

export const POLICY_VERSION = TERMS_VERSION;

export const PRIVACY_POLICY: PolicySection[] = [
  {
    title: 'Quién es el responsable',
    paragraphs: [
      `El responsable de tus datos es ${LEGAL_CONTACT.owner}. Puedes escribir a ${LEGAL_CONTACT.email} para cualquier consulta sobre privacidad.`,
    ],
  },
  {
    title: 'Qué datos tratamos',
    paragraphs: [
      'Cuenta: nombre de usuario, email y contraseña (guardada cifrada con un hash; nadie puede leerla).',
      'Partidas: en qué partidas participas, tu equipo y el resultado (si te capturaron y quién).',
      'Ubicación: solo mientras una partida está en juego y la app está abierta. Se usa para mostrarte en el mapa, compartirla con tu equipo, enviar los "pings" a los cazadores y validar las capturas.',
    ],
  },
  {
    title: 'Para qué y con qué base',
    paragraphs: [
      'Usamos estos datos únicamente para que puedas jugar: identificarte, montar las partidas y aplicar sus reglas. La base es tu consentimiento, que das al crear la cuenta, y la prestación del propio servicio.',
      'No vendemos tus datos ni los usamos para publicidad.',
    ],
  },
  {
    title: 'Quién ve tu ubicación',
    paragraphs: [
      'Durante la partida: tus compañeros de equipo la ven en directo. Si eres escapador, los cazadores la reciben solo en cada ping, según las reglas de la partida.',
      'Nadie fuera de la partida tiene acceso a ella.',
    ],
  },
  {
    title: 'Cuánto tiempo la guardamos',
    paragraphs: [
      'La ubicación es temporal: se borra al terminar la partida y, como máximo, a las 12 horas. No guardamos un historial de tus movimientos.',
      'Los datos de la cuenta y el historial de partidas se conservan mientras tengas la cuenta.',
    ],
  },
  {
    title: 'Tus derechos',
    paragraphs: [
      `Puedes pedir acceder a tus datos, corregirlos, borrarlos o limitar su uso escribiendo a ${LEGAL_CONTACT.email}. También puedes reclamar ante la autoridad de protección de datos de tu país (en España, la AEPD).`,
    ],
  },
  {
    title: 'Condiciones de uso',
    paragraphs: [
      'Manhunt es un juego en el mundo real: juega en lugares seguros y públicos, respeta las normas de tráfico y la propiedad privada, y no pongas en riesgo a nadie. Tú eres responsable de tu seguridad mientras juegas.',
      'Para usar la app debes tener al menos 14 años o el consentimiento de tus padres o tutores.',
      'Podemos suspender cuentas que hagan trampas o molesten a otros jugadores.',
    ],
  },
];
