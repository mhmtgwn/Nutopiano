import { BadRequestException, Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

type UploadResult = {
  url: string;
  key: string;
  provider: 'local' | 's3';
};

@Injectable()
export class UploadsService {
  private s3Client: S3Client | null = null;

  private detectImageMimeFromBuffer(buffer: Buffer): string | null {
    if (!buffer || buffer.length < 12) {
      return null;
    }

    // JPEG signature: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }

    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return 'image/png';
    }

    // WEBP signature: RIFF....WEBP
    const riff = buffer.subarray(0, 4).toString('ascii');
    const webp = buffer.subarray(8, 12).toString('ascii');
    if (riff === 'RIFF' && webp === 'WEBP') {
      return 'image/webp';
    }

    return null;
  }

  private getUploadsDir() {
    const baseDir = process.env.UPLOADS_DIR?.trim();
    return baseDir && baseDir.length > 0
      ? baseDir
      : path.join(process.cwd(), 'uploads');
  }

  private buildStorageKey(file: { originalname?: string; mimetype?: string }) {
    const ext = path.extname(file.originalname ?? '').toLowerCase();
    const safeFromName = /^\.[a-z0-9]{1,9}$/.test(ext) ? ext : '';
    const safeExt = MIME_EXTENSION[file.mimetype ?? ''] || safeFromName || '';
    return `${crypto.randomUUID()}${safeExt}`;
  }

  private isCloudStorageEnabled() {
    const endpoint = (process.env.S3_ENDPOINT ?? '').trim();
    const bucket = (process.env.S3_BUCKET ?? '').trim();
    const accessKeyId = (process.env.S3_ACCESS_KEY_ID ?? '').trim();
    const secretAccessKey = (process.env.S3_SECRET_ACCESS_KEY ?? '').trim();
    return (
      endpoint.length > 0 &&
      bucket.length > 0 &&
      accessKeyId.length > 0 &&
      secretAccessKey.length > 0
    );
  }

  private getS3Client() {
    if (this.s3Client) {
      return this.s3Client;
    }

    const endpoint = (process.env.S3_ENDPOINT ?? '').trim();
    const region = (process.env.S3_REGION ?? 'auto').trim();
    const accessKeyId = (process.env.S3_ACCESS_KEY_ID ?? '').trim();
    const secretAccessKey = (process.env.S3_SECRET_ACCESS_KEY ?? '').trim();
    const forcePathStyle = (process.env.S3_FORCE_PATH_STYLE ?? '')
      .trim()
      .toLowerCase();

    this.s3Client = new S3Client({
      region,
      endpoint,
      forcePathStyle: forcePathStyle === 'true' || forcePathStyle === '1',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    return this.s3Client;
  }

  private buildCloudPublicUrl(key: string) {
    const customPublicBase = (process.env.UPLOADS_PUBLIC_BASE_URL ?? '').trim();
    if (customPublicBase.length > 0) {
      return `${customPublicBase.replace(/\/$/, '')}/${encodeURIComponent(key)}`;
    }

    const endpoint = (process.env.S3_ENDPOINT ?? '').trim().replace(/\/$/, '');
    const bucket = (process.env.S3_BUCKET ?? '').trim();
    return `${endpoint}/${bucket}/${encodeURIComponent(key)}`;
  }

  private buildLocalPublicUrl(key: string) {
    const apiBaseUrl = (process.env.API_BASE_URL ?? '').trim();
    const siteUrl = (process.env.SITE_URL ?? '').trim();
    const baseUrl = (apiBaseUrl || siteUrl)
      .replace(/\/$/, '')
      .replace(/\/api\/?$/, '');

    const relativeUrl = `/uploads/${encodeURIComponent(key)}`;
    return baseUrl ? `${baseUrl}${relativeUrl}` : relativeUrl;
  }

  async uploadProductImage(file: {
    originalname?: string;
    mimetype?: string;
    buffer?: Buffer;
  }): Promise<UploadResult> {
    const body = file.buffer;
    if (!body || body.length === 0) {
      throw new BadRequestException('Dosya içeriği bulunamadı.');
    }

    const detectedMime = this.detectImageMimeFromBuffer(body);
    if (!detectedMime) {
      throw new BadRequestException(
        'Geçersiz dosya içeriği. Sadece jpg, png veya webp kabul edilir.',
      );
    }

    const key = this.buildStorageKey({ ...file, mimetype: detectedMime });
    const contentType = detectedMime;

    if (this.isCloudStorageEnabled()) {
      const bucket = (process.env.S3_BUCKET ?? '').trim();
      const client = this.getS3Client();

      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );

      return {
        key,
        provider: 's3',
        url: this.buildCloudPublicUrl(key),
      };
    }

    const uploadsDir = this.getUploadsDir();
    fs.mkdirSync(uploadsDir, { recursive: true });
    await fs.promises.writeFile(path.join(uploadsDir, key), body);

    return {
      key,
      provider: 'local',
      url: this.buildLocalPublicUrl(key),
    };
  }
}
