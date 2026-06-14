const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
}

export const getTokens = () => {
  if (typeof window === 'undefined') return { accessToken: null, refreshToken: null };
  return {
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken'),
  };
};

export const setTokens = (accessToken: string, refreshToken?: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('accessToken', accessToken);
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }
};

export const clearTokens = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

export const getCurrentUser = () => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

export const request = async (endpoint: string, options: RequestOptions = {}): Promise<any> => {
  const { params, ...customConfig } = options;
  const { accessToken } = getTokens();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const config: RequestInit = {
    method: 'GET',
    ...customConfig,
    headers: {
      ...headers,
      ...customConfig.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    if (response.status === 401 || response.status === 403) {
      // Access token might be expired, attempt to refresh
      const { refreshToken } = getTokens();
      if (refreshToken) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });

            if (refreshRes.ok) {
              const data = await refreshRes.json();
              setTokens(data.accessToken);
              onRefreshed(data.accessToken);
              isRefreshing = false;
              
              // Retry current request with new token
              const retryHeaders = {
                ...config.headers,
                'Authorization': `Bearer ${data.accessToken}`,
              } as HeadersInit;
              
              const retryResponse = await fetch(url, { ...config, headers: retryHeaders });
              if (!retryResponse.ok) {
                const errText = await retryResponse.text();
                throw new Error(errText || 'Request failed after refresh');
              }
              return await retryResponse.json();
            } else {
              // Refresh token failed/expired, force logout
              clearTokens();
              isRefreshing = false;
              if (typeof window !== 'undefined') {
                window.location.href = '/login';
              }
              throw new Error('Session expired. Please log in again.');
            }
          } catch (refreshErr) {
            isRefreshing = false;
            throw refreshErr;
          }
        } else {
          // Wait for token refresh to complete
          return new Promise((resolve, reject) => {
            subscribeTokenRefresh(async (newToken) => {
              const retryHeaders = {
                ...config.headers,
                'Authorization': `Bearer ${newToken}`,
              } as HeadersInit;
              try {
                const retryResponse = await fetch(url, { ...config, headers: retryHeaders });
                if (!retryResponse.ok) {
                  throw new Error('Retry request failed');
                }
                resolve(await retryResponse.json());
              } catch (err) {
                reject(err);
              }
            });
          });
        }
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || response.statusText || 'API Request failed');
    }

    // Handles empty responses (e.g. 204 No Content)
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    return Promise.reject(error);
  }
};

export const api = {
  get: (url: string, options?: RequestOptions) => request(url, { ...options, method: 'GET' }),
  post: (url: string, body?: any, options?: RequestOptions) => request(url, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (url: string, body?: any, options?: RequestOptions) => request(url, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  patch: (url: string, body?: any, options?: RequestOptions) => request(url, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: (url: string, options?: RequestOptions) => request(url, { ...options, method: 'DELETE' }),
};
