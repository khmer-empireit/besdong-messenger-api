import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UserProfileResponseDto, UserProfileListResponseDto, PublicProfileResponseDto } from './dto/user-profile-response.dto';
import { UserSettingsResponseDto } from './dto/user-settings-response.dto';
import { JwtGuard } from '../../shared/guards/jwt.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller({ path: 'users', version: '1' })
export class UserController {
  constructor(private userService: UserService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get own profile' })
  @ApiResponse({ status: 200, type: UserProfileResponseDto })
  getMe(@CurrentUser() user: { sub: string }) {
    return this.userService.getProfile(user.sub);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update own profile' })
  @ApiResponse({ status: 200, type: UserProfileResponseDto })
  updateMe(@CurrentUser() user: { sub: string }, @Body() dto: UpdateProfileDto) {
    return this.userService.updateProfile(user.sub, dto);
  }

  @Get('me/settings')
  @ApiOperation({ summary: 'Get own settings' })
  @ApiResponse({ status: 200, type: UserSettingsResponseDto })
  getSettings(@CurrentUser() user: { sub: string }) {
    return this.userService.getSettings(user.sub);
  }

  @Patch('me/settings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update own settings' })
  @ApiResponse({ status: 200, type: UserSettingsResponseDto })
  updateSettings(@CurrentUser() user: { sub: string }, @Body() dto: UpdateSettingsDto) {
    return this.userService.updateSettings(user.sub, dto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search users by username or display name' })
  @ApiResponse({ status: 200, type: UserProfileListResponseDto })
  search(@Query('q') q: string) {
    return this.userService.search(q || '');
  }

  @Get(':id')
  @ApiOperation({ summary: "Get another user's public profile" })
  @ApiResponse({ status: 200, type: PublicProfileResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUser(@Param('id') id: string) {
    return this.userService.getPublicProfile(id);
  }
}
