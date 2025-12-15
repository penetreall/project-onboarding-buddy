export const LOG_TYPES = {
  BLOCKED: 'blocked',
  ALLOWED: 'allowed',
  WARNING: 'warning',
} as const;

export const THREAT_LEVELS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export const DETECTION_RULES = {
  BOT_SIGNATURES: 'bot_signatures',
  IP_REPUTATION: 'ip_reputation',
  BEHAVIORAL: 'behavioral',
  GEO_BLOCKING: 'geo_blocking',
} as const;

export const DEVICE_TYPES = {
  DESKTOP: 'desktop',
  MOBILE: 'mobile',
  TABLET: 'tablet',
  BOT: 'bot',
} as const;

export type LogType = typeof LOG_TYPES[keyof typeof LOG_TYPES];
export type ThreatLevel = typeof THREAT_LEVELS[keyof typeof THREAT_LEVELS];
export type DetectionRule = typeof DETECTION_RULES[keyof typeof DETECTION_RULES];
export type DeviceType = typeof DEVICE_TYPES[keyof typeof DEVICE_TYPES];
