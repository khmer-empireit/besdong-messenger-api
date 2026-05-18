import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StoryService } from './story.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { StoryResponseDto, StoryListResponseDto, StoryWithMetaResponseDto, StoryViewerResponseDto } from './dto/story-response.dto';
import { JwtGuard } from '../../shared/guards/jwt.guard';
import { RateLimitGuard } from '../../shared/guards/rate-limit.guard';
import { RateLimit } from '../../shared/decorators/rate-limit.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@ApiTags('Stories')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@ApiResponse({ status: 401, description: 'Missing or invalid access token' })
@Controller({ path: 'stories', version: '1' })
export class StoryController {
  constructor(private storyService: StoryService) {}

  @Post()
  @UseGuards(RateLimitGuard)
  @RateLimit(10, 60)
  @ApiOperation({
    summary: 'Post a story',
    description: 'Upload the file first via POST /upload?type=story, then pass the returned url and key here.',
  })
  @ApiResponse({ status: 201, type: StoryResponseDto })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  create(@CurrentUser() user: { sub: string }, @Body() dto: CreateStoryDto) {
    return this.storyService.create(user.sub, dto);
  }

  @Get()
  @UseGuards(RateLimitGuard)
  @RateLimit(60, 60)
  @ApiOperation({ summary: "List contacts' active stories (feed)" })
  @ApiResponse({ status: 200, type: StoryListResponseDto })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  getFeed(@CurrentUser() user: { sub: string }) {
    return this.storyService.getFeed(user.sub);
  }

  @Get('mine')
  @UseGuards(RateLimitGuard)
  @RateLimit(60, 60)
  @ApiOperation({ summary: 'List my own stories (all, including expired)' })
  @ApiResponse({ status: 200, type: StoryListResponseDto })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  getMine(@CurrentUser() user: { sub: string }) {
    return this.storyService.getMine(user.sub);
  }

  @Get(':id')
  @UseGuards(RateLimitGuard)
  @RateLimit(120, 60)
  @ApiOperation({ summary: 'View a story — marks it as seen' })
  @ApiParam({ name: 'id', description: 'Story ID' })
  @ApiResponse({ status: 200, type: StoryWithMetaResponseDto })
  @ApiResponse({ status: 404, description: 'Story not found or expired' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  view(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.storyService.view(id, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit(20, 60)
  @ApiOperation({ summary: 'Delete own story' })
  @ApiParam({ name: 'id', description: 'Story ID' })
  @ApiResponse({ status: 200, description: 'Story deleted' })
  @ApiResponse({ status: 403, description: 'Cannot delete another user\'s story' })
  @ApiResponse({ status: 404, description: 'Story not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  delete(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.storyService.delete(id, user.sub);
  }

  @Get(':id/views')
  @UseGuards(RateLimitGuard)
  @RateLimit(30, 60)
  @ApiOperation({ summary: 'Get viewers of a story (owner only)' })
  @ApiParam({ name: 'id', description: 'Story ID' })
  @ApiResponse({ status: 200, type: [StoryViewerResponseDto] })
  @ApiResponse({ status: 403, description: 'Only the story owner can view this' })
  @ApiResponse({ status: 404, description: 'Story not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  getViews(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.storyService.getViews(id, user.sub);
  }
}
