import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';

export interface StoredDocument { privatePath: string; mimeType: string; sizeBytes: number; sha256: string }
export interface DocumentStorage {
  store(buffer: Buffer, mimeType: string): Promise<StoredDocument>;
  read(privatePath: string): Promise<Buffer>;
  delete(privatePath: string): Promise<void>;
}

export class LocalDocumentStorage implements DocumentStorage {
  private readonly root: string;
  constructor(directory: string) {
    this.root = resolve(directory);
    const publicRoot = resolve(process.cwd(), 'public');
    const fromPublic = relative(publicRoot, this.root);
    if (fromPublic === '' || (!fromPublic.startsWith(`..${sep}`) && fromPublic !== '..' && !isAbsolute(fromPublic))) {
      throw new Error('El almacenamiento privado no puede ubicarse dentro de public/.');
    }
  }

  async store(buffer: Buffer, mimeType: string): Promise<StoredDocument> {
    const extensions: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'application/pdf': '.pdf' };
    const extension = extensions[mimeType];
    if (!extension) throw new Error('El tipo de archivo no está permitido.');
    if (buffer.byteLength === 0 || buffer.byteLength > 10 * 1024 * 1024) throw new Error('El archivo supera el tamaño máximo de 10 MB.');
    await mkdir(this.root, { recursive: true });
    const privatePath = join(this.root, `${randomUUID()}${extension}`);
    await writeFile(privatePath, buffer, { flag: 'wx', mode: 0o600 });
    return { privatePath, mimeType, sizeBytes: buffer.byteLength, sha256: createHash('sha256').update(buffer).digest('hex') };
  }

  async read(privatePath: string): Promise<Buffer> {
    const resolved = resolve(privatePath);
    const relativePath = relative(this.root, resolved);
    if (!relativePath || relativePath.startsWith(`..${sep}`) || relativePath === '..' || isAbsolute(relativePath) || extname(relativePath) === '') {
      throw new Error('La ruta del documento no corresponde al almacenamiento privado.');
    }
    const { readFile } = await import('node:fs/promises');
    return readFile(resolved);
  }

  async delete(privatePath: string): Promise<void> {
    const resolved = resolve(privatePath);
    const relativePath = relative(this.root, resolved);
    if (!relativePath || relativePath.startsWith(`..${sep}`) || relativePath === '..' || isAbsolute(relativePath)) {
      throw new Error('La ruta del documento no corresponde al almacenamiento privado.');
    }
    const { rm } = await import('node:fs/promises');
    await rm(resolved, { force: true });
  }
}
