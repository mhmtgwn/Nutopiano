import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Roles } from '@core/decorators';
import { JwtAuthGuard, RolesGuard } from '@core/guards';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const getUploadsDir = () => {
  const baseDir = process.env.UPLOADS_DIR?.trim();
  return baseDir && baseDir.length > 0
    ? baseDir
    : path.join(process.cwd(), 'uploads');
};

const ensureUploadsDir = (dir: string) => {
  fs.mkdirSync(dir, { recursive: true });
};

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  @Post('product-image')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Upload product image',
    description:
      'Uploads a product image to the server filesystem and returns a public URL under /uploads.',
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
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
          cb(new BadRequestException('Sadece jpg, png veya webp yükleyebilirsiniz.'), false);
          return;
        }
        cb(null, true);
      },
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = getUploadsDir();
          ensureUploadsDir(dir);
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase();
          const safeExt = ext && ext.length <= 10 ? ext : '';
          const name = `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${safeExt}`;
          cb(null, name);
        },
      }),
    }),
  )
  uploadProductImage(@UploadedFile() file?: { filename: string }) {
    if (!file) {
      throw new BadRequestException('Dosya bulunamadı.');
    }

    const apiBaseUrl = (process.env.API_BASE_URL ?? '').trim();
    const siteUrl = (process.env.SITE_URL ?? '').trim();
    const baseUrl = (apiBaseUrl || siteUrl)
      .replace(/\/$/, '')
      .replace(/\/api\/?$/, '');

    const relativeUrl = `/uploads/${encodeURIComponent(file.filename)}`;

    const url = baseUrl ? `${baseUrl}${relativeUrl}` : relativeUrl;

    return { url };
  }
}
