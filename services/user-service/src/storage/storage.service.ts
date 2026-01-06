import { Injectable, Logger } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private storage: Storage;
  private bucketName: string | undefined;

  constructor() {
    const credentialsBase64 = process.env.GOOGLE_CLOUD_CREDENTIALS_BASE64;

    if (!credentialsBase64) {
      this.logger.warn(
        'GOOGLE_CLOUD_CREDENTIALS_BASE64 not set - storage uploads will fail',
      );
      return;
    }

    try {
      const credentials = JSON.parse(
        Buffer.from(credentialsBase64, 'base64').toString('utf-8'),
      );

      this.storage = new Storage({
        credentials,
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      });

      this.bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;
      this.logger.log(`Storage initialized with bucket: ${this.bucketName}`);
    } catch (error) {
      this.logger.error('Failed to initialize Google Cloud Storage', error);
    }
  }

  /**
   * Upload file buffer to Google Cloud Storage
   * @param fileBuffer - File content as Buffer
   * @param userId - User ID for organizing files
   * @param fileName - Original file name
   * @param mimeType - File MIME type
   * @returns gs:// URI of uploaded file
   */
  async uploadFile(
    fileBuffer: Buffer,
    userId: string,
    fileName: string,
    mimeType: string,
  ): Promise<string> {
    if (!this.storage || !this.bucketName) {
      throw new Error(
        'Storage not initialized - check GOOGLE_CLOUD_CREDENTIALS_BASE64',
      );
    }

    try {
      // Generate unique file path: user_[userId]/[date]/[uuid].[ext]
      const fileId = uuidv4();
      const today = new Date().toISOString().split('T')[0];
      const fileExtension = fileName.split('.').pop() || 'bin';
      const gcsPath = `user_${userId}/${today}/${fileId}.${fileExtension}`;

      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(gcsPath);

      await file.save(fileBuffer, {
        contentType: mimeType,
        metadata: {
          originalName: fileName,
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
        },
      });

      const gcsUri = `gs://${this.bucketName}/${gcsPath}`;
      this.logger.log(`File uploaded successfully: ${gcsUri}`);

      return gcsUri;
    } catch (error) {
      this.logger.error('File upload failed', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Generate signed URL for private file access
   * @param gcsUri - gs:// URI from database or just the path
   * @returns Signed HTTPS URL valid for 1 hour
   */
  async getSignedUrl(gcsUri: string): Promise<string> {
    if (!this.storage || !this.bucketName) {
      throw new Error('Storage not initialized');
    }

    // If already an HTTP URL, return as-is
    if (gcsUri.startsWith('http://') || gcsUri.startsWith('https://')) {
      return gcsUri;
    }

    try {
      // Handle both gs://bucket/path and plain path formats
      let path = gcsUri;
      if (gcsUri.startsWith('gs://')) {
        path = gcsUri.replace(`gs://${this.bucketName}/`, '');
      }

      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(path);

      const [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000, // 1 hour
      });

      return signedUrl;
    } catch (error) {
      this.logger.error(`Failed to sign URL: ${gcsUri}`, error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * Delete file from storage
   * @param gcsUri - gs:// URI to delete
   */
  async deleteFile(gcsUri: string): Promise<void> {
    if (!this.storage || !this.bucketName) {
      throw new Error('Storage not initialized');
    }

    if (!gcsUri.startsWith('gs://')) {
      this.logger.warn(`Invalid gs:// URI for deletion: ${gcsUri}`);
      return;
    }

    try {
      const path = gcsUri.replace(`gs://${this.bucketName}/`, '');
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(path);

      await file.delete();
      this.logger.log(`File deleted: ${gcsUri}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${gcsUri}`, error);
      // Don't throw - deletion failures shouldn't break operations
    }
  }
}
