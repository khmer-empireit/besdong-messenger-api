import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../../shared/guards/jwt.guard';
import { RateLimitGuard } from '../../shared/guards/rate-limit.guard';
import { RateLimit } from '../../shared/decorators/rate-limit.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { CallService } from './call.service';
import { CallLogListResponseDto, TurnCredentialsResponseDto } from './dto/call-response.dto';
import { CallFilter } from './interfaces/i-call.repository';

@ApiTags('Calls')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller({ path: 'calls', version: '1' })
export class CallController {
  constructor(private readonly callService: CallService) {}

  @Get('turn-credentials')
  @UseGuards(RateLimitGuard)
  @RateLimit(10, 60)
  @ApiOperation({ summary: 'Get STUN/TURN ICE server credentials for WebRTC' })
  @ApiResponse({ status: 200, type: TurnCredentialsResponseDto })
  getTurnCredentials(@CurrentUser() user: { sub: string }) {
    return this.callService.generateTurnCredentials(user.sub);
  }

  @Get()
  @UseGuards(RateLimitGuard)
  @RateLimit(30, 60)
  @ApiOperation({ summary: 'List call history with optional filter' })
  @ApiQuery({ name: 'filter', enum: ['all', 'missed', 'voice', 'video'], required: false })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: CallLogListResponseDto })
  async listCalls(
    @CurrentUser() user: { sub: string },
    @Query('filter') filter: CallFilter = 'all',
    @Query('cursor') cursor?: string,
    @Query('limit') limit = 20,
  ) {
    const { data, has_more, next_cursor } = await this.callService.listCallLogs(
      user.sub,
      filter,
      cursor ?? null,
      Number(limit),
    );
    return { data, pagination: { next_cursor, has_more } };
  }
}
