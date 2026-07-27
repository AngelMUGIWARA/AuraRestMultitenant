import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class UploadService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
      secure: true,
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            return reject(error);
          }

          resolve(result as UploadApiResponse);
        },
      );

      Readable.from(file.buffer).pipe(upload);
    });
  }

  async deleteImage(publicId: string) {
    return cloudinary.uploader.destroy(publicId);
  }

  private getPublicId(imageUrl: string): string {
    const parts = imageUrl.split('/upload/');

    if (parts.length < 2) {
      return '';
    }

    return parts[1].replace(/^v\d+\//, '').replace(/\.[^.]+$/, '');
  }

  async deleteImageByUrl(imageUrl: string | null | undefined) {
    if (!imageUrl) {
      return;
    }

    const publicId = this.getPublicId(imageUrl);

    if (!publicId) {
      return;
    }

    await this.deleteImage(publicId);
  }
}
