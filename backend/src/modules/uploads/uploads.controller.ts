import {
  BadRequestException,
  Controller,
  Post,
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
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { Roles } from '@common/decorators';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
import { UploadsService } from './uploads.service';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type FileFilterCb = (error: Error | null, acceptFile: boolean) => void;

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('product-image')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Upload product image',
    description:
      'Uploads a product image to configured object storage (S3/R2) or local storage fallback.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_FILE_SIZE_BYTES,
      },
      fileFilter: (
        _req: unknown,
        file: { mimetype: string } & Record<string, unknown>,
        cb: FileFilterCb,
      ) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
          cb(
            new BadRequestException(
              'Sadece jpg, png veya webp yükleyebilirsiniz.',
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
      storage: memoryStorage(),
    }),
  )
  async uploadProductImage(
    @UploadedFile() file?: {
      originalname?: string;
      mimetype?: string;
      buffer?: Buffer;
    },
  ) {
    if (!file) {
      throw new BadRequestException('Dosya bulunamadı.');
    }

    return this.uploadsService.uploadProductImage(file);
  }
}
