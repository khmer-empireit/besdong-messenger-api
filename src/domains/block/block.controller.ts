import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BlockService } from './block.service';
import { JwtGuard } from '../../shared/guards/jwt.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@ApiTags('Block')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller({ path: 'users', version: '1' })
export class BlockController {
  constructor(private blockService: BlockService) {}

  @Get('me/blocked')
  @ApiOperation({ summary: 'List blocked users' })
  @ApiResponse({ status: 200, description: 'List of blocked users' })
  listBlocked(@CurrentUser() user: { sub: string }) {
    return this.blockService.listBlocked(user.sub);
  }

  @Post(':id/block')
  @ApiOperation({ summary: 'Block a user' })
  @ApiResponse({ status: 201, description: 'User blocked' })
  @ApiResponse({ status: 400, description: 'Cannot block yourself' })
  @ApiResponse({ status: 409, description: 'Already blocked' })
  block(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.blockService.block(user.sub, id);
  }

  @Delete(':id/block')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiResponse({ status: 200, description: 'User unblocked' })
  @ApiResponse({ status: 404, description: 'User is not blocked' })
  unblock(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.blockService.unblock(user.sub, id);
  }
}
