export const getApiBase = () => {
  const configured = import.meta.env.VITE_API_BASE?.trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  return '/api';
};

export const getSocketBaseUrl = () => {
  const configured = import.meta.env.VITE_SOCKET_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  const apiBase = getApiBase();
  if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
    return apiBase.replace(/\/api\/?$/, '');
  }

  return '';
};

export const API_BASE = getApiBase();
