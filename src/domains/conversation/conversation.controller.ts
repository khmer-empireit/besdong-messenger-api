import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConversationService } from './conversation.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { AddMembersDto } from './dto/add-members.dto';
import { MuteConversationDto } from './dto/mute-conversation.dto';
import { ConversationResponseDto, ConversationDetailResponseDto, ConversationListResponseDto } from './dto/conversation-response.dto';
import { MessageResponseDto } from '../auth/dto/message-response.dto';
import { JwtGuard } from '../../shared/guards/jwt.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@ApiTags('Conversations')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller({ path: 'conversations', version: '1' })
export class ConversationController {
  constructor(private conversationService: ConversationService) {}

  @Post()
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
  create(@CurrentUser() user: { sub: string }, @Body() dto: CreateConversationDto) {
    return this.conversationService.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my conversations' })
  @ApiResponse({ status: 200, type: ConversationListResponseDto })
  list(@CurrentUser() user: { sub: string }) {
    return this.conversationService.list(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get conversation detail with participants' })
  @ApiResponse({ status: 200, type: ConversationDetailResponseDto })
  @ApiResponse({ status: 403, description: 'Not a member' })
  @ApiResponse({ status: 404, description: 'Not found' })
  get(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.conversationService.get(id, user.sub);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update group name or avatar (owner/admin only)' })
  @ApiResponse({ status: 200, type: ConversationResponseDto })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: UpdateConversationDto,
  ) {
    return this.conversationService.update(id, user.sub, dto);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add members to a group conversation' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  addMembers(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: AddMembersDto,
  ) {
    return this.conversationService.addMembers(id, user.sub, dto);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a member from a group (or leave yourself)' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  removeMember(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.conversationService.removeMember(id, user.sub, targetUserId);
  }

  @Post(':id/mute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mute a conversation (30m / 1h / 8h / forever)' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  mute(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: MuteConversationDto,
  ) {
    return this.conversationService.mute(id, user.sub, dto);
  }

  @Delete(':id/mute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unmute a conversation' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  unmute(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.conversationService.unmute(id, user.sub);
  }
}
