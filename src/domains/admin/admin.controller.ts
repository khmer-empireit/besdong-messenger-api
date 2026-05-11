import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { ToggleAuthMethodDto } from './dto/toggle-auth-method.dto';
import { AuthConfigItemDto, AuthConfigListResponseDto } from './dto/auth-config-response.dto';
import { AdminGuard } from '../../shared/guards/admin.guard';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@ApiResponse({ status: 401, description: 'Missing or invalid access token' })
@ApiResponse({ status: 403, description: 'Admin access required' })
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('auth-config')
  @ApiOperation({ summary: 'List all login method configs' })
  @ApiResponse({ status: 200, type: AuthConfigListResponseDto })
  getAuthConfigs() {
    return this.adminService.getAuthConfigs();
  }

  @Patch('auth-config/:method')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable or disable a login method' })
  @ApiParam({
    name: 'method',
    enum: ['local', 'google', 'facebook', 'apple', 'telegram'],
  })
  @ApiResponse({ status: 200, type: AuthConfigItemDto })
  @ApiResponse({ status: 400, description: 'Invalid method' })
  @ApiResponse({ status: 404, description: 'Method not found' })
  toggleAuthMethod(@Param('method') method: string, @Body() dto: ToggleAuthMethodDto) {
    return this.adminService.toggleAuthMethod(method, dto);
  }
}
