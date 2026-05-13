import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import {
  UserProfileResponseDto,
  UserProfileListResponseDto,
  PublicProfileResponseDto,
} from './dto/user-profile-response.dto';
import { UserSettingsResponseDto } from './dto/user-settings-response.dto';
import { JwtGuard } from '../../shared/guards/jwt.guard';
import { RateLimitGuard } from '../../shared/guards/rate-limit.guard';
import { RateLimit } from '../../shared/decorators/rate-limit.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@ApiResponse({ status: 401, description: 'Missing or invalid access token' })
@Controller({ path: 'users', version: '1' })
export class UserController {
  constructor(private userService: UserService) {}

  @Get('me')
  @UseGuards(RateLimitGuard)
  @RateLimit(60, 60)
  @ApiOperation({ summary: 'Get own full profile' })
  @ApiResponse({ status: 200, type: UserProfileResponseDto })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  getMe(@CurrentUser() user: { sub: string }) {
    return this.userService.getProfile(user.sub);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit(5, 60)
  @ApiOperation({
    summary: 'Update own profile',
    description: 'Send only the fields you want to change. At least one field is required.',
  })
  @ApiResponse({ status: 200, type: UserProfileResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed or no fields provided' })
  @ApiResponse({ status: 429, description: 'Too many requests — max 5 profile updates/min' })
  updateMe(
    @CurrentUser() user: { sub: string },
    @Body() dto: UpdateProfileDto,
  ) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one field must be provided.');
    }
    return this.userService.updateProfile(user.sub, dto);
  }

  @Get('me/settings')
  @UseGuards(RateLimitGuard)
  @RateLimit(60, 60)
  @ApiOperation({ summary: 'Get own settings' })
  @ApiResponse({ status: 200, type: UserSettingsResponseDto })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  getSettings(@CurrentUser() user: { sub: string }) {
    return this.userService.getSettings(user.sub);
  }

  @Patch('me/settings')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit(10, 60)
  @ApiOperation({
    summary: 'Update own settings',
    description: 'Send only the settings you want to change. At least one field is required.',
  })
  @ApiResponse({ status: 200, type: UserSettingsResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed or no fields provided' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  updateSettings(
    @CurrentUser() user: { sub: string },
    @Body() dto: UpdateSettingsDto,
  ) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one field must be provided.');
    }
    return this.userService.updateSettings(user.sub, dto);
  }

  @Get('search')
  @UseGuards(RateLimitGuard)
  @RateLimit(30, 60)
  @ApiOperation({
    summary: 'Search users by username or display name',
    description: 'Returns up to 20 matches. Requires at least 1 character.',
  })
  @ApiQuery({ name: 'q', required: false, description: 'Search query (username or display name)' })
  @ApiResponse({ status: 200, type: UserProfileListResponseDto })
  @ApiResponse({ status: 429, description: 'Too many requests — max 30 searches/min' })
  search(@Query('q') q: string) {
    return this.userService.search(q || '');
  }

  @Get(':id')
  @UseGuards(RateLimitGuard)
  @RateLimit(60, 60)
  @ApiOperation({ summary: "Get another user's public profile" })
  @ApiResponse({ status: 200, type: PublicProfileResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid user ID format' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  getUser(
    @CurrentUser() user: { sub: string },
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST })) id: string,
  ) {
    return this.userService.getPublicProfile(id, user.sub);
  }
}
