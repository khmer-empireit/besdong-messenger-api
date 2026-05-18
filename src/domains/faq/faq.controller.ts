import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FaqService } from './faq.service';
import { CreateFaqDto, FaqListResponseDto, FaqResponseDto, UpdateFaqDto } from './dto/faq.dto';
import { JwtGuard } from '../../shared/guards/jwt.guard';
import { AdminGuard } from '../../shared/guards/admin.guard';
import { RateLimitGuard } from '../../shared/guards/rate-limit.guard';
import { RateLimit } from '../../shared/decorators/rate-limit.decorator';

@ApiTags('FAQ')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Missing or invalid access token' })
@Controller({ path: 'faq', version: '1' })
export class FaqController {
  constructor(private faqService: FaqService) {}

  @Get()
  @UseGuards(JwtGuard, RateLimitGuard)
  @RateLimit(60, 60)
  @ApiOperation({ summary: 'List all active FAQs' })
  @ApiResponse({ status: 200, type: FaqListResponseDto })
  async list() {
    const items = await this.faqService.list();
    return { items };
  }

  @Post()
  @UseGuards(AdminGuard, RateLimitGuard)
  @RateLimit(20, 60)
  @ApiOperation({ summary: '[Admin] Create a FAQ entry' })
  @ApiResponse({ status: 201, type: FaqResponseDto })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  create(@Body() dto: CreateFaqDto) {
    return this.faqService.create(dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard, RateLimitGuard)
  @RateLimit(20, 60)
  @ApiOperation({ summary: '[Admin] Update a FAQ entry' })
  @ApiParam({ name: 'id', description: 'FAQ ID' })
  @ApiResponse({ status: 200, type: FaqResponseDto })
  @ApiResponse({ status: 400, description: 'No fields provided' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'FAQ not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  update(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST })) id: string,
    @Body() dto: UpdateFaqDto,
  ) {
    return this.faqService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard, RateLimitGuard)
  @RateLimit(20, 60)
  @ApiOperation({ summary: '[Admin] Delete a FAQ entry' })
  @ApiParam({ name: 'id', description: 'FAQ ID' })
  @ApiResponse({ status: 200, description: 'FAQ deleted' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'FAQ not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  remove(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST })) id: string,
  ) {
    return this.faqService.remove(id);
  }
}
