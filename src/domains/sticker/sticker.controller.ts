import { Controller, Get, Param, ParseUUIDPipe, ParseIntPipe, Query, UseGuards, HttpStatus, DefaultValuePipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StickerService } from './sticker.service';
import { StickerPackListResponseDto, StickerPackWithStickersDto, GifSearchResponseDto } from './dto/sticker-response.dto';
import { JwtGuard } from '../../shared/guards/jwt.guard';
import { RateLimitGuard } from '../../shared/guards/rate-limit.guard';
import { RateLimit } from '../../shared/decorators/rate-limit.decorator';

@ApiTags('Stickers')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@ApiResponse({ status: 401, description: 'Missing or invalid access token' })
@Controller({ path: 'stickers', version: '1' })
export class StickerController {
  constructor(private stickerService: StickerService) {}

  @Get('packs')
  @UseGuards(RateLimitGuard)
  @RateLimit(60, 60)
  @ApiOperation({ summary: 'List all active sticker packs' })
  @ApiResponse({ status: 200, type: StickerPackListResponseDto })
  async getPacks() {
    const packs = await this.stickerService.getPacks();
    return { packs };
  }

  @Get('packs/:id')
  @UseGuards(RateLimitGuard)
  @RateLimit(60, 60)
  @ApiOperation({ summary: 'Get a sticker pack with all its stickers' })
  @ApiParam({ name: 'id', description: 'Sticker pack ID' })
  @ApiResponse({ status: 200, type: StickerPackWithStickersDto })
  @ApiResponse({ status: 404, description: 'Sticker pack not found' })
  getPackWithStickers(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST })) id: string,
  ) {
    return this.stickerService.getPackWithStickers(id);
  }

  @Get('gif/search')
  @UseGuards(RateLimitGuard)
  @RateLimit(30, 60)
  @ApiOperation({ summary: 'Search GIFs via Tenor' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, description: 'Results per page (max 50)', example: 20 })
  @ApiQuery({ name: 'next', required: false, description: 'Pagination cursor from previous response' })
  @ApiResponse({ status: 200, type: GifSearchResponseDto })
  @ApiResponse({ status: 400, description: 'GIF search not configured or query missing' })
  searchGifs(
    @Query('q') q: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('next') next?: string,
  ) {
    return this.stickerService.searchGifs(q || '', limit, next);
  }

  @Get('gif/trending')
  @UseGuards(RateLimitGuard)
  @RateLimit(30, 60)
  @ApiOperation({ summary: 'Get trending GIFs via Tenor' })
  @ApiQuery({ name: 'limit', required: false, description: 'Results per page (max 50)', example: 20 })
  @ApiQuery({ name: 'next', required: false, description: 'Pagination cursor from previous response' })
  @ApiResponse({ status: 200, type: GifSearchResponseDto })
  @ApiResponse({ status: 400, description: 'GIF search not configured' })
  getTrendingGifs(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('next') next?: string,
  ) {
    return this.stickerService.getTrendingGifs(limit, next);
  }
}
