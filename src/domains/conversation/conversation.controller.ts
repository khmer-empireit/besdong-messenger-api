import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConversationService } from './conversation.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { AddMembersDto } from './dto/add-members.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { MuteConversationDto } from './dto/mute-conversation.dto';
import { ConversationResponseDto, ConversationDetailResponseDto, ConversationListResponseDto, ConversationSearchResponseDto, ConversationActionResponseDto } from './dto/conversation-response.dto';
import { JwtGuard } from '../../shared/guards/jwt.guard';
import { RateLimitGuard } from '../../shared/guards/rate-limit.guard';
import { RateLimit } from '../../shared/decorators/rate-limit.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@ApiTags('Conversations')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller({ path: 'conversations', version: '1' })
export class ConversationController {
  constructor(private conversationService: ConversationService) {}

  @Post()
  @UseGuards(RateLimitGuard)
  @RateLimit(5, 60)
  @ApiOperation({
    summary: 'Create a direct or group conversation',
    description: 'For direct conversations: provide type="direct" and exactly one user ID in member_ids. For group conversations: provide type="group", a name, and one or more user IDs in member_ids.'
  })
  @ApiBody({
    type: CreateConversationDto,
    examples: {
      direct: {
        summary: 'Direct conversation',
        value: {
          type: 'direct',
          member_ids: ['uuid-1']
        }
      },
      group: {
        summary: 'Group conversation',
        value: {
          type: 'group',
          member_ids: ['uuid-1', 'uuid-2'],
          name: 'Dev Team'
        }
      }
    }
  })
  @ApiResponse({ status: 201, type: ConversationResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 429, description: 'Too many requests — max 5 conversations/min' })
  create(@CurrentUser() user: { sub: string }, @Body() dto: CreateConversationDto) {
    return this.conversationService.create(user.sub, dto);
  }

  @Get()
  @UseGuards(RateLimitGuard)
  @RateLimit(60, 60)
  @ApiOperation({ summary: 'List my conversations with full enriched data' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Pagination cursor (updated_at of last item)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Page size (default 20)' })
  @ApiResponse({ status: 200, type: ConversationListResponseDto })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  list(@CurrentUser() user: { sub: string }, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    return this.conversationService.list(user.sub, cursor, limit ? parseInt(limit, 10) : 20);
  }

  @Get('search')
  @UseGuards(RateLimitGuard)
  @RateLimit(30, 60)
  @ApiOperation({
    summary: 'Search conversations',
    description: 'Groups are searched by name. Direct conversations are searched by the other user\'s username or display name.',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiResponse({ status: 200, type: ConversationSearchResponseDto })
  @ApiResponse({ status: 400, description: 'Query cannot be empty' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  search(@CurrentUser() user: { sub: string }, @Query('q') q: string) {
    return this.conversationService.search(user.sub, q || '');
  }

  @Get(':id')
  @UseGuards(RateLimitGuard)
  @RateLimit(60, 60)
  @ApiOperation({ summary: 'Get conversation detail with participants' })
  @ApiResponse({ status: 200, type: ConversationDetailResponseDto })
  @ApiResponse({ status: 403, description: 'Not a member' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  get(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.conversationService.get(id, user.sub);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit(10, 60)
  @ApiOperation({ summary: 'Update group name or avatar (owner/admin only)' })
  @ApiResponse({ status: 200, type: ConversationResponseDto })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: UpdateConversationDto,
  ) {
    return this.conversationService.update(id, user.sub, dto);
  }

  @Post(':id/members')
  @UseGuards(RateLimitGuard)
  @RateLimit(10, 60)
  @ApiOperation({ summary: 'Add members to a group conversation' })
  @ApiResponse({ status: 201, type: ConversationActionResponseDto })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  addMembers(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: AddMembersDto,
  ) {
    return this.conversationService.addMembers(id, user.sub, dto);
  }

  @Patch(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit(10, 60)
  @ApiOperation({ summary: 'Promote or demote a member (owner only)' })
  @ApiResponse({ status: 200, type: ConversationActionResponseDto })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  updateMemberRole(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.conversationService.updateMemberRole(id, user.sub, targetUserId, dto);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit(10, 60)
  @ApiOperation({ summary: 'Remove a member from a group (or leave yourself)' })
  @ApiResponse({ status: 200, type: ConversationActionResponseDto })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  removeMember(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.conversationService.removeMember(id, user.sub, targetUserId);
  }

  @Post(':id/mute')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit(20, 60)
  @ApiOperation({ summary: 'Mute a conversation (30m / 1h / 8h / forever)' })
  @ApiResponse({ status: 200, type: ConversationActionResponseDto })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  mute(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: MuteConversationDto,
  ) {
    return this.conversationService.mute(id, user.sub, dto);
  }

  @Delete(':id/mute')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit(20, 60)
  @ApiOperation({ summary: 'Unmute a conversation' })
  @ApiResponse({ status: 200, type: ConversationActionResponseDto })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  unmute(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.conversationService.unmute(id, user.sub);
  }

  @Post(':id/pin')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit(20, 60)
  @ApiOperation({ summary: 'Pin a conversation' })
  @ApiResponse({ status: 200, type: ConversationActionResponseDto })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  pin(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.conversationService.pin(id, user.sub);
  }

  @Delete(':id/pin')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit(20, 60)
  @ApiOperation({ summary: 'Unpin a conversation' })
  @ApiResponse({ status: 200, type: ConversationActionResponseDto })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  unpin(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.conversationService.unpin(id, user.sub);
  }
}
