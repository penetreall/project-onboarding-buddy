// PT-BR translations for IceWall logs

export const translateReason = (reason: string | null | undefined): string => {
  if (!reason) return 'N/A';

  const translations: Record<string, string> = {
    // Bot detection
    'bot_detected': 'Bot detectado',
    'crawler_detected': 'Crawler detectado',

    // Click-ID validation
    'no_click_id': 'Sem Click-ID',
    'invalid_click_id': 'Click-ID inválido',
    'invalid_click_id_invalid_length': 'Click-ID inválido (comprimento)',
    'invalid_click_id_low_entropy': 'Click-ID inválido (baixa entropia)',
    'valid_click_id': 'Click-ID válido',

    // Google Ads Mode
    'google_ads_mode_valid': 'Modo Google Ads - Tráfego válido',
    'google_ads_mode_valid_traffic': 'Modo Google Ads - Tráfego válido',
    'google_ads_br_mobile_valid': 'Google Ads BR + Mobile válido',

    // Network/IP
    'datacenter_ip': 'IP de Datacenter',
    'proxy_detected': 'Proxy detectado',
    'vpn_detected': 'VPN detectada',

    // Platform
    'mobile_required': 'Mobile obrigatório',
    'desktop_blocked': 'Desktop bloqueado',

    // Country
    'country_not_br': 'País diferente de BR',
    'country_blocked': 'País bloqueado',

    // Default
    'default_safe': 'Padrão seguro',
    'unknown': 'Desconhecido',
  };

  return translations[reason] || reason;
};

export const translateDecision = (isSafe: boolean): string => {
  return isSafe ? 'Negado' : 'Permitido';
};

export const translateCountrySource = (source: string | null | undefined): string => {
  if (!source) return 'Desconhecido';

  const translations: Record<string, string> = {
    'CloudFlare': 'CloudFlare',
    'CF-IPCOUNTRY': 'CloudFlare',
    'ASN': 'ASN',
    'fallback': 'Fallback',
    'Unknown': 'Desconhecido',
    'NONE': 'Nenhum',
  };

  return translations[source] || source;
};

export const translatePlatform = (platform: string | null | undefined): string => {
  if (!platform) return 'Desconhecido';

  const translations: Record<string, string> = {
    'mobile': 'Mobile',
    'desktop': 'Desktop',
    'tablet': 'Tablet',
    'ios': 'iOS',
    'android': 'Android',
    'unknown': 'Desconhecido',
  };

  return translations[platform] || platform;
};

export const translateNetwork = (network: string | null | undefined): string => {
  if (!network) return 'Nenhuma';

  const translations: Record<string, string> = {
    'google_ads': 'Google Ads',
    'facebook_ads': 'Facebook Ads',
    'tiktok_ads': 'TikTok Ads',
    'microsoft_ads': 'Microsoft Ads',
    'kwai_ads': 'Kwai Ads',
    'none': 'Nenhuma',
  };

  return translations[network] || network;
};

export const translateIPType = (type: string | null | undefined): string => {
  if (!type) return 'Desconhecido';

  const translations: Record<string, string> = {
    'IPv4': 'IPv4',
    'IPv6': 'IPv6',
    'unknown': 'Desconhecido',
  };

  return translations[type] || type;
};
