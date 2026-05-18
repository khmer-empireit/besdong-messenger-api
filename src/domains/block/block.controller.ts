import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BlockService } from './block.service';
import { BlockedUserListResponseDto, BlockActionResponseDto } from './dto/block-response.dto';
import { JwtGuard } from '../../shared/guards/jwt.guard';
import { RateLimitGuard } from '../../shared/guards/rate-limit.guard';
import { RateLimit } from '../../shared/decorators/rate-limit.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@ApiTags('Block')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller({ path: 'users', version: '1' })
export class BlockController {
  constructor(private blockService: BlockService) {}

  @Get('me/blocked')
  @UseGuards(RateLimitGuard)
  @RateLimit(30, 60)
  @ApiOperation({ summary: 'List blocked users' })
  @ApiResponse({ status: 200, type: BlockedUserListResponseDto })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  listBlocked(@CurrentUser() user: { sub: string }) {
    return this.blockService.listBlocked(user.sub);
  }

  @Post(':id/block')
  @UseGuards(RateLimitGuard)
  @RateLimit(20, 60)
  @ApiOperation({ summary: 'Block a user' })
  @ApiResponse({ status: 201, type: BlockActionResponseDto })
  @ApiResponse({ status: 400, description: 'Cannot block yourself' })
  @ApiResponse({ status: 409, description: 'Already blocked' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  block(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.blockService.block(user.sub, id);
  }

  @Delete(':id/block')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit(20, 60)
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiResponse({ status: 200, type: BlockActionResponseDto })
  @ApiResponse({ status: 404, description: 'User is not blocked' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  unblock(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.blockService.unblock(user.sub, id);
  }
}
