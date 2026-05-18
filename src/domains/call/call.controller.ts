import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../../shared/guards/jwt.guard';
import { RateLimitGuard } from '../../shared/guards/rate-limit.guard';
import { RateLimit } from '../../shared/decorators/rate-limit.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { CallService } from './call.service';
import { TurnCredentialsResponseDto } from './dto/call-response.dto';

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
}
