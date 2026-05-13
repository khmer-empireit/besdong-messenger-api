import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AdminRepository } from './admin.repository';
import { AuthMethod } from './entities/auth-config.entity';
import { ToggleAuthMethodDto } from './dto/toggle-auth-method.dto';
import { AuthProvider } from '../../shared/enums';

const VALID_METHODS: AuthMethod[] = Object.values(AuthProvider);

@Injectable()
export class AdminService {
  constructor(private repo: AdminRepository) {}

  async getAuthConfigs() {
    return this.repo.findAllAuthConfigs();
  }

  async toggleAuthMethod(method: string, dto: ToggleAuthMethodDto) {
    if (!VALID_METHODS.includes(method as AuthMethod)) {
      throw new BadRequestException(`Invalid auth method: ${method}`);
    }

    const config = await this.repo.findAuthConfig(method as AuthMethod);
    if (!config) throw new NotFoundException(`Auth method ${method} not found`);

    return this.repo.updateAuthConfig(method as AuthMethod, dto.is_enabled);
  }
}
