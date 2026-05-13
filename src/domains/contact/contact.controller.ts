import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { AddContactDto } from './dto/add-contact.dto';
import {
  ContactListResponseDto,
  ContactResponseDto,
  FindUserResponseDto,
} from './dto/contact-response.dto';
import { JwtGuard } from '../../shared/guards/jwt.guard';
import { RateLimitGuard } from '../../shared/guards/rate-limit.guard';
import { RateLimit } from '../../shared/decorators/rate-limit.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@ApiTags('Contacts')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@ApiResponse({ status: 401, description: 'Missing or invalid access token' })
@Controller({ path: 'contacts', version: '1' })
export class ContactController {
  constructor(private contactService: ContactService) {}

  @Get('find')
  @UseGuards(RateLimitGuard)
  @RateLimit(30, 60)
  @ApiOperation({
    summary: 'Find users by name or BD number',
    description: 'type=name: partial match on username and display name (up to 20 results). type=bd_number: exact match on BD number (1 result).',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'type', required: false, enum: ['name', 'bd_number'], description: 'Search type (default: name)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Results per page (default: 20, max: 50)' })
  @ApiResponse({ status: 200, type: FindUserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 429, description: 'Too many requests — max 30 searches/min' })
  async findUser(
    @Query('q') q: string,
    @Query('type') type: 'name' | 'bd_number' = 'name',
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    if (!q?.trim()) throw new BadRequestException('Query is required');
    if (type !== 'name' && type !== 'bd_number') throw new BadRequestException('type must be name or bd_number');
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const safePage = Math.max(page, 1);
    return this.contactService.findUsers(q.trim(), type, safePage, safeLimit);
  }

  @Get()
  @UseGuards(RateLimitGuard)
  @RateLimit(60, 60)
  @ApiOperation({ summary: 'List my contacts' })
  @ApiResponse({ status: 200, type: ContactListResponseDto })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  listContacts(@CurrentUser() user: { sub: string }) {
    return this.contactService.listContacts(user.sub);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RateLimitGuard)
  @RateLimit(20, 60)
  @ApiOperation({ summary: 'Add a contact by user ID' })
  @ApiResponse({ status: 201, type: ContactResponseDto })
  @ApiResponse({ status: 400, description: 'Cannot add yourself' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Contact already added' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  addContact(@CurrentUser() user: { sub: string }, @Body() dto: AddContactDto) {
    return this.contactService.addContact(user.sub, dto.user_id);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RateLimitGuard)
  @RateLimit(20, 60)
  @ApiOperation({ summary: 'Remove a contact by their user ID' })
  @ApiResponse({ status: 204, description: 'Contact removed' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  removeContact(
    @CurrentUser() user: { sub: string },
    @Param('userId', new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST })) userId: string,
  ) {
    return this.contactService.removeContact(user.sub, userId);
  }
}
