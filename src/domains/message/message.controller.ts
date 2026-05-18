import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MessageService } from './message.service';
import { MessageGateway } from './message.gateway';
import { SendMessageDto } from './dto/send-message.dto';
import { EditMessageDto } from './dto/edit-message.dto';
import { ForwardMessageDto } from './dto/forward-message.dto';
import { AddReactionDto } from './dto/add-reaction.dto';
import { MessageResponseDto, MessageListResponseDto, MessageActionResponseDto, ReactionListResponseDto } from './dto/message-response.dto';
import { JwtGuard } from '../../shared/guards/jwt.guard';
import { RateLimitGuard } from '../../shared/guards/rate-limit.guard';
import { RateLimit } from '../../shared/decorators/rate-limit.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller({ path: 'conversations', version: '1' })
export class MessageController {
  constructor(
    private messageService: MessageService,
    private gateway: MessageGateway,
  ) {}

  @Get(':id/messages')
  @UseGuards(RateLimitGuard)
  @RateLimit(60, 60)
  @ApiOperation({ summary: 'List messages in a conversation (cursor-based pagination)' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Message ID to paginate from' })
  @ApiResponse({ status: 200, type: MessageListResponseDto })
  @ApiResponse({ status: 403, description: 'Not a member' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  list(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Query('cursor') cursor?: string,
  ) {
    return this.messageService.list(id, user.sub, cursor);
  }

  @Post(':id/messages')
  @UseGuards(RateLimitGuard)
  @RateLimit(60, 60)
  @ApiOperation({ summary: 'Send a message to a conversation' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  @ApiResponse({ status: 403, description: 'Not a member' })
  @ApiResponse({ status: 429, description: 'Too many requests — max 60 messages/min' })
  send(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: SendMessageDto,
  ) {
    return this.messageService.send(id, user.sub, dto);
  }

  @Patch(':id/messages/:msgId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit(20, 60)
  @ApiOperation({ summary: 'Edit a message' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 403, description: 'Not your message' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  edit(
    @Param('id') id: string,
    @Param('msgId') msgId: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: EditMessageDto,
  ) {
    return this.messageService.edit(id, msgId, user.sub, dto);
  }

  @Delete(':id/messages/:msgId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit(20, 60)
  @ApiOperation({ summary: 'Delete a message (soft delete)' })
  @ApiResponse({ status: 200, type: MessageActionResponseDto })
  @ApiResponse({ status: 403, description: 'Not your message' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  delete(
    @Param('id') id: string,
    @Param('msgId') msgId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.messageService.delete(id, msgId, user.sub);
  }

  @Post(':id/messages/:msgId/forward')
  @UseGuards(RateLimitGuard)
  @RateLimit(20, 60)
  @ApiOperation({ summary: 'Forward a message to another conversation' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Message is deleted' })
  @ApiResponse({ status: 403, description: 'Not a member of source or target conversation' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async forward(
    @Param('id') id: string,
    @Param('msgId') msgId: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: ForwardMessageDto,
  ) {
    const msg = await this.messageService.forward(id, msgId, user.sub, dto);
    this.gateway.server.to(dto.target_conversation_id).emit('message:new', msg);
    return msg;
  }

  @Post(':id/messages/:msgId/reactions')
  @UseGuards(RateLimitGuard)
  @RateLimit(60, 60)
  @ApiOperation({ summary: 'Add a reaction to a message' })
  @ApiResponse({ status: 201, type: ReactionListResponseDto })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async addReaction(
    @Param('id') id: string,
    @Param('msgId') msgId: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: AddReactionDto,
  ) {
    const reactions = await this.messageService.addReaction(id, msgId, user.sub, dto);
    this.gateway.broadcastReaction(id, msgId, reactions);
    return reactions;
  }

  @Delete(':id/messages/:msgId/reactions/:emoji')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit(60, 60)
  @ApiOperation({ summary: 'Remove a reaction from a message' })
  @ApiResponse({ status: 200, type: ReactionListResponseDto })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async removeReaction(
    @Param('id') id: string,
    @Param('msgId') msgId: string,
    @Param('emoji') emoji: string,
    @CurrentUser() user: { sub: string },
  ) {
    const reactions = await this.messageService.removeReaction(id, msgId, user.sub, decodeURIComponent(emoji));
    this.gateway.broadcastReaction(id, msgId, reactions);
    return reactions;
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit(60, 60)
  @ApiOperation({ summary: 'Mark conversation as read (updates last_read_at)' })
  @ApiResponse({ status: 200, type: MessageActionResponseDto })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  markRead(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.messageService.markRead(id, user.sub);
  }
}
