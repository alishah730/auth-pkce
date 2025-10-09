import chalk from 'chalk';
import { ApiClient } from './api-client';
import { AuthManager } from './auth-manager';

const API_BASE_URL = process.env.API_BASE_URL || 'https://api.example.com';

export class Commands {
  private apiClient: ApiClient;
  private authManager: AuthManager;

  constructor() {
    this.apiClient = new ApiClient({ baseURL: API_BASE_URL });
    this.authManager = new AuthManager();
  }

  /**
   * Check authentication status
   */
  async status(): Promise<void> {
    try {
      console.log(chalk.blue('🔍 Checking system authentication status...'));
      
      const authStatus = await this.authManager.getAuthStatus();
      
      if (authStatus.isAuthenticated) {
        console.log(chalk.green('✅ System authenticated'));
        if (authStatus.tokenExpiresIn) {
          console.log(chalk.cyan('Token expires in:'), `${authStatus.tokenExpiresIn} minutes`);
        }
        if (authStatus.userInfo?.sub) {
          console.log(chalk.cyan('User ID:'), authStatus.userInfo.sub);
        }
      } else {
        console.log(chalk.red('❌ System not authenticated'));
        if (!authStatus.hasConfig) {
          console.log(chalk.yellow('💡 Run "auth-pkce configure" first, then "auth-pkce login"'));
        } else {
          console.log(chalk.yellow('💡 Run "auth-pkce login" to authenticate'));
        }
      }
    } catch (error) {
      console.error(chalk.red('❌ Failed to check system status:'), error);
    }
  }

  /**
   * Show system information
   */
  async showSystem(): Promise<void> {
    try {
      console.log(chalk.blue('🖥️  Getting system information...'));
      
      const token = await this.authManager.ensureAuthenticated();
      if (!token) {
        console.error(chalk.red('❌ Authentication required'));
        return;
      }

      const systemInfo = await this.apiClient.get('/system/info');
      
      console.log(chalk.green('✅ System Information:'));
      console.log(chalk.white('─'.repeat(50)));
      console.log(chalk.cyan('System ID:'), systemInfo.id);
      console.log(chalk.cyan('Name:'), systemInfo.name);
      console.log(chalk.cyan('Status:'), systemInfo.status === 'active' ? chalk.green('Active') : chalk.red('Inactive'));
      console.log(chalk.cyan('Version:'), systemInfo.version);
      console.log(chalk.cyan('Uptime:'), systemInfo.uptime);
      if (systemInfo.description) {
        console.log(chalk.cyan('Description:'), systemInfo.description);
      }
      
    } catch (error: any) {
      console.error(chalk.red('❌ Failed to get system info:'), error.message);
    }
  }

  /**
   * List all systems
   */
  async listSystems(): Promise<void> {
    try {
      console.log(chalk.blue('📋 Fetching systems...'));
      
      const token = await this.authManager.ensureAuthenticated();
      if (!token) {
        console.error(chalk.red('❌ Authentication required'));
        return;
      }

      const systems = await this.apiClient.get('/systems');
      
      if (systems.length === 0) {
        console.log(chalk.yellow('📭 No systems found'));
        return;
      }

      console.log(chalk.green(`✅ Found ${systems.length} system(s):`));
      console.log(chalk.white('─'.repeat(70)));
      
      systems.forEach((system: any, index: number) => {
        const statusColor = system.status === 'active' ? chalk.green : chalk.red;
        console.log(
          chalk.cyan(`${index + 1}.`), 
          chalk.white(system.name),
          statusColor(`[${system.status}]`)
        );
        console.log(chalk.gray(`   ID: ${system.id}`));
        if (system.description) {
          console.log(chalk.gray(`   ${system.description}`));
        }
        console.log();
      });
      
    } catch (error: any) {
      console.error(chalk.red('❌ Failed to fetch systems:'), error.message);
    }
  }

  /**
   * Create a new system
   */
  async createSystem(name: string, description?: string): Promise<void> {
    try {
      console.log(chalk.blue(`🆕 Creating system: ${name}`));
      
      const token = await this.authManager.ensureAuthenticated();
      if (!token) {
        console.error(chalk.red('❌ Authentication required'));
        return;
      }

      const systemData = {
        name,
        description: description || `System created by ${process.env.USER || 'cli'}`,
        status: 'active'
      };

      const created = await this.apiClient.post('/systems', systemData);
      
      console.log(chalk.green('✅ System created successfully!'));
      console.log(chalk.cyan('ID:'), created.id);
      console.log(chalk.cyan('Name:'), created.name);
      console.log(chalk.cyan('Status:'), chalk.green(created.status));
      
    } catch (error: any) {
      console.error(chalk.red('❌ Failed to create system:'), error.message);
    }
  }

  /**
   * Get system status by ID
   */
  async getSystemStatus(systemId: string): Promise<void> {
    try {
      console.log(chalk.blue(`📊 Getting status for system: ${systemId}`));
      
      const token = await this.authManager.ensureAuthenticated();
      if (!token) {
        console.error(chalk.red('❌ Authentication required'));
        return;
      }

      const system = await this.apiClient.get(`/systems/${systemId}/status`);
      
      console.log(chalk.green('✅ System Status:'));
      console.log(chalk.white('─'.repeat(40)));
      console.log(chalk.cyan('System:'), system.name);
      console.log(chalk.cyan('Status:'), system.status === 'active' ? chalk.green('Active') : chalk.red('Inactive'));
      console.log(chalk.cyan('Health:'), system.health === 'healthy' ? chalk.green('Healthy') : chalk.yellow('Warning'));
      console.log(chalk.cyan('CPU Usage:'), `${system.metrics?.cpu || 0}%`);
      console.log(chalk.cyan('Memory Usage:'), `${system.metrics?.memory || 0}%`);
      console.log(chalk.cyan('Last Updated:'), system.lastUpdated);
      
    } catch (error: any) {
      console.error(chalk.red('❌ Failed to get system status:'), error.message);
    }
  }

  /**
   * Update system configuration
   */
  async updateSystem(systemId: string, updates: any): Promise<void> {
    try {
      console.log(chalk.blue(`🔧 Updating system: ${systemId}`));
      
      const token = await this.authManager.ensureAuthenticated();
      if (!token) {
        console.error(chalk.red('❌ Authentication required'));
        return;
      }

      const updated = await this.apiClient.put(`/systems/${systemId}`, updates);
      
      console.log(chalk.green('✅ System updated successfully!'));
      console.log(chalk.cyan('ID:'), updated.id);
      console.log(chalk.cyan('Name:'), updated.name);
      console.log(chalk.cyan('Status:'), updated.status === 'active' ? chalk.green('Active') : chalk.red('Inactive'));
      
    } catch (error: any) {
      console.error(chalk.red('❌ Failed to update system:'), error.message);
    }
  }

  /**
   * Delete a system
   */
  async deleteSystem(systemId: string): Promise<void> {
    try {
      console.log(chalk.blue(`🗑️  Deleting system: ${systemId}`));
      
      const token = await this.authManager.ensureAuthenticated();
      if (!token) {
        console.error(chalk.red('❌ Authentication required'));
        return;
      }

      await this.apiClient.delete(`/systems/${systemId}`);
      
      console.log(chalk.green('✅ System deleted successfully!'));
      
    } catch (error: any) {
      console.error(chalk.red('❌ Failed to delete system:'), error.message);
    }
  }

  /**
   * Show current access token
   */
  async showToken(): Promise<void> {
    try {
      console.log(chalk.blue('🔑 Getting access token...'));
      
      const token = await this.authManager.getAccessToken();
      if (!token) {
        console.error(chalk.red('❌ No access token found'));
        console.log(chalk.yellow('💡 Run "auth-pkce login" to authenticate'));
        return;
      }

      const tokenInfo = await this.authManager.getTokenInfo();
      
      console.log(chalk.green('✅ Access Token:'));
      console.log(chalk.white('─'.repeat(40)));
      console.log(chalk.gray(token));
      
      if (tokenInfo) {
        const expiresIn = Math.floor((tokenInfo.expiresAt - Date.now()) / 1000 / 60);
        console.log(chalk.cyan('\nExpires in:'), `${expiresIn} minutes`);
      }
      
    } catch (error: any) {
      console.error(chalk.red('❌ Failed to get token:'), error.message);
    }
  }
}
