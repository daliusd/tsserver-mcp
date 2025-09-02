import { UserService } from './sample-code';
import { ApiClient, mapArray } from './api-client';

// Cross-file references for testing
export class UserManager {
  private userService: UserService;
  private apiClient: ApiClient;

  constructor() {
    this.userService = new UserService();
    this.apiClient = new ApiClient('https://api.example.com');
  }

  async loadUsers(): Promise<void> {
    const response = await this.apiClient.get('/users');
    // This creates cross-file references
    const users = mapArray(response.data, (userData: any) => ({
      id: userData.id,
      name: userData.name,
      email: userData.email,
      isActive: userData.active
    }));
  }

  getActiveUsers() {
    return this.userService.getAllUsers();
  }
}

// Exported for testing references across files
export const globalUserManager = new UserManager();