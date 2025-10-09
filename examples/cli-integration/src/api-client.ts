import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { AuthManager } from './auth-manager';

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
}

export class ApiClient {
  private client: AxiosInstance;
  private authManager: AuthManager;

  constructor(config: ApiClientConfig) {
    this.authManager = new AuthManager();
    
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Add request interceptor to inject auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await this.authManager.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle auth errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          console.log('Authentication failed, attempting token refresh...');
          
          const refreshed = await this.authManager.refreshToken();
          if (refreshed) {
            // Retry the original request with new token
            const token = await this.authManager.getAccessToken();
            if (token) {
              error.config.headers.Authorization = `Bearer ${token}`;
              return this.client.request(error.config);
            }
          }
          
          console.error('Authentication required. Please run: auth-pkce login');
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * Make authenticated GET request
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  /**
   * Make authenticated POST request
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  /**
   * Make authenticated PUT request
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  /**
   * Make authenticated DELETE request
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  /**
   * Get current user info using the API
   */
  async getCurrentUser(): Promise<any> {
    return this.get('/user/me');
  }

  /**
   * Example API method - get resources
   */
  async getResources(): Promise<any[]> {
    return this.get('/resources');
  }

  /**
   * Example API method - create resource
   */
  async createResource(resource: any): Promise<any> {
    return this.post('/resources', resource);
  }

  /**
   * Example API method - update resource
   */
  async updateResource(id: string, resource: any): Promise<any> {
    return this.put(`/resources/${id}`, resource);
  }

  /**
   * Example API method - delete resource
   */
  async deleteResource(id: string): Promise<void> {
    return this.delete(`/resources/${id}`);
  }
}
