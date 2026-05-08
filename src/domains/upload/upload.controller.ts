import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { JwtGuard } from '../../shared/guards/jwt.guard';
import { RateLimitGuard } from '../../shared/guards/rate-limit.guard';
import { RateLimit } from '../../shared/decorators/rate-limit.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { UploadService, UploadMode, UploadType } from './upload.service';
import { UploadResponseDto } from './dto/upload-response.dto';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB hard cap at multer level

@ApiTags('Upload')
@Controller({ path: 'upload', version: '1' })
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post('image')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit(20, 60 * 60)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_BYTES },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only JPEG, PNG, WebP, and HEIC images are allowed.'), false);
        }
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an image — profile picture, group avatar, attachment, or story media' })
  @ApiQuery({ name: 'type', enum: ['avatar', 'group_avatar', 'attachment', 'story'], required: false })
  @ApiQuery({ name: 'mode', enum: ['compressed', 'original'], required: false, description: 'compressed: resized + WebP (recommended). original: stored as-is, max 5 MB.' })
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiResponse({ status: 200, description: 'Upload successful', type: UploadResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid file type' })
  @ApiResponse({ status: 413, description: 'File is too large' })
  @ApiResponse({ status: 429, description: 'Too many uploads — wait 1 hour' })
  uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { sub: string },
    @Query('type') type: UploadType = 'avatar',
    @Query('mode') mode: UploadMode = 'compressed',
  ) {
    if (!file) throw new BadRequestException('No file provided. Send the image in a field named "file".');

    const validTypes: UploadType[] = ['avatar', 'group_avatar', 'attachment', 'story'];
    const validModes: UploadMode[] = ['compressed', 'original'];

    if (!validTypes.includes(type)) throw new BadRequestException(`Invalid type. Allowed values: ${validTypes.join(', ')}.`);
    if (!validModes.includes(mode)) throw new BadRequestException(`Invalid mode. Allowed values: ${validModes.join(', ')}.`);

    return this.uploadService.uploadImage(file, user.sub, type, mode);
  }
}
