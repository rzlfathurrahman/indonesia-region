import { createReadStream, createWriteStream, existsSync } from 'fs';
import { createGunzip, createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

export type CompressionType = 'gzip' | 'deflate' | 'none';

export interface CompressOptions {
  level?: number; // 1-9 for gzip
  chunkSize?: number;
}

export class CompressionService {
  async compressFile(
    inputPath: string,
    outputPath: string,
    type: CompressionType = 'gzip',
    options: CompressOptions = {}
  ): Promise<{ inputPath: string; outputPath: string; ratio: number }> {
    if (type === 'none') {
      const fs = require('fs');
      fs.copyFileSync(inputPath, outputPath);
      return { inputPath, outputPath, ratio: 1 };
    }

    const inputSize = require('fs').statSync(inputPath).size;

    const transform = type === 'gzip'
      ? createGzip({ level: options.level || 6 })
      : createDeflate({ level: options.level || 6 });

    await pipeline(
      createReadStream(inputPath),
      transform,
      createWriteStream(outputPath)
    );

    const outputSize = require('fs').statSync(outputPath).size;
    const ratio = outputSize / inputSize;

    return { inputPath, outputPath, ratio };
  }

  async decompressFile(
    inputPath: string,
    outputPath: string,
    type: CompressionType = 'gzip'
  ): Promise<void> {
    if (type === 'none') {
      const fs = require('fs');
      fs.copyFileSync(inputPath, outputPath);
      return;
    }

    const transform = type === 'gzip' ? createGunzip() : createInflate();

    await pipeline(
      createReadStream(inputPath),
      transform,
      createWriteStream(outputPath)
    );
  }

  async compressString(
    data: string,
    type: CompressionType = 'gzip',
    options: CompressOptions = {}
  ): Promise<Buffer> {
    if (type === 'none') {
      return Buffer.from(data);
    }

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const readable = Readable.from(data);

      const transform = type === 'gzip'
        ? createGzip({ level: options.level || 6 })
        : createDeflate({ level: options.level || 6 });

      readable.pipe(transform);

      transform.on('data', (chunk: Buffer) => chunks.push(chunk));
      transform.on('end', () => resolve(Buffer.concat(chunks)));
      transform.on('error', reject);
    });
  }

  async decompressBuffer(
    buffer: Buffer,
    type: CompressionType = 'gzip'
  ): Promise<string> {
    if (type === 'none') {
      return buffer.toString();
    }

    return new Promise((resolve, reject) => {
      const transform = type === 'gzip' ? createGunzip() : createInflate();
      const readable = Readable.from(buffer);

      let result = '';
      readable.pipe(transform);

      transform.on('data', (chunk: Buffer) => { result += chunk.toString(); });
      transform.on('end', () => resolve(result));
      transform.on('error', reject);
    });
  }

  detectCompression(filePath: string): CompressionType {
    if (filePath.endsWith('.gz')) return 'gzip';
    if (filePath.endsWith('.deflate') || filePath.endsWith('.z')) return 'deflate';
    return 'none';
  }
}

// Re-export for convenience
function createDeflate(options?: any) {
  return require('zlib').createDeflate(options);
}

function createInflate() {
  return require('zlib').createInflate();
}
