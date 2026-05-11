import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { JwtGuard } from '../../shared/guards/jwt.guard';
import { RateLimitGuard } from '../../shared/guards/rate-limit.guard';
import { RateLimit } from '../../shared/decorators/rate-limit.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { UploadService, UploadMode, UploadType, ALL_ALLOWED_MIME_TYPES } from './upload.service';
import { DeleteUploadDto } from './dto/delete-upload.dto';
import { UploadResponseDto } from './dto/upload-response.dto';

// Hard cap at Multer level — videos can be up to 200 MB
const MAX_FILE_BYTES = 200 * 1024 * 1024;

@ApiTags('Upload')
@Controller({ path: 'upload', version: '1' })
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit(20, 60 * 60)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (ALL_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Unsupported file type "${file.mimetype}". Allowed: images (JPEG/PNG/WebP/HEIC), videos (MP4/MOV/AVI/MKV/WebM), documents (PDF/Word/Excel/PPT/TXT/ZIP).`,
            ),
            false,
          );
        }
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a file',
    description:
      'One endpoint for all uploads. `type` controls the purpose and determines which file categories are accepted: `avatar`/`group_avatar` → images only; `attachment` → images, videos, documents; `story` → images, videos. `mode` applies to images only.',
  })
  @ApiQuery({ name: 'type', enum: ['avatar', 'group_avatar', 'attachment', 'story'], required: false })
  @ApiQuery({
    name: 'mode',
    enum: ['compressed', 'original'],
    required: false,
    description: 'Images only. compressed: resized + WebP quality 85 (default). original: stored as-is, max 5 MB.',
  })
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiResponse({ status: 200, type: UploadResponseDto })
  @ApiResponse({ status: 400, description: 'Wrong file type or category not allowed for this upload type' })
  @ApiResponse({ status: 413, description: 'File too large' })
  @ApiResponse({ status: 429, description: 'Too many uploads — wait 1 hour' })
  upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { sub: string },
    @Query('type') type: UploadType = 'attachment',
    @Query('mode') mode: UploadMode = 'compressed',
  ) {
    if (!file) {
      throw new BadRequestException('No file provided. Send the file in a field named "file".');
    }

    const validTypes: UploadType[] = ['avatar', 'group_avatar', 'attachment', 'story'];
    const validModes: UploadMode[] = ['compressed', 'original'];

    if (!validTypes.includes(type)) {
      throw new BadRequestException(`Invalid type. Allowed values: ${validTypes.join(', ')}.`);
    }
    if (!validModes.includes(mode)) {
      throw new BadRequestException(`Invalid mode. Allowed values: ${validModes.join(', ')}.`);
    }

    return this.uploadService.upload(file, user.sub, type, mode);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an uploaded file', description: 'Pass the `key` returned by the upload endpoint. You can only delete your own files.' })
  @ApiResponse({ status: 204, description: 'Deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid key or not your file' })
  async deleteFile(
    @Body() dto: DeleteUploadDto,
    @CurrentUser() user: { sub: string },
  ) {
    await this.uploadService.deleteFile(dto.key, user.sub);
  }
}
