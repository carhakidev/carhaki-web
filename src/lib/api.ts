import axios from 'axios';

const getBaseURL = () => {
  if (typeof window === 'undefined') {
    // Server-side: call Django directly
    return process.env.DJANGO_API_URL || 'https://carhaki-svmo.onrender.com';
  }
  // Client-side: use Next.js proxy (same domain = cookies work)
  return '/api/proxy';
};

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await api.post('/api/auth/refresh/');
        return api(originalRequest);
      } catch {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
