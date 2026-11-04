import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalDocumentStorage } from '../../src/server/modules/documents/document-storage.js';

let directory: string | undefined;
afterEach(async () => { if (directory) await rm(directory, { recursive: true, force: true }); directory = undefined; });

describe('almacenamiento privado de documentos', () => {
  it('guarda un archivo fuera de public con nombre aleatorio y hash SHA-256', async () => {
    directory = await mkdtemp(join(tmpdir(), 'school-documents-'));
    const storage = new LocalDocumentStorage(directory);
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
    const result = await storage.store(png, 'image/png');
    expect(result.privatePath).toContain(directory);
    expect(result.privatePath).not.toContain(`${join(process.cwd(), 'public')}`);
    expect(result.sizeBytes).toBe(png.byteLength);
    expect(result.sha256).toHaveLength(64);
    expect(await storage.read(result.privatePath)).toEqual(png);
    expect(await storage.exists(result.privatePath)).toBe(true);
    await storage.delete(result.privatePath);
    expect(await storage.exists(result.privatePath)).toBe(false);
  });

  it('rechaza MIME no permitido y archivos mayores de 10 MB', async () => {
    directory = await mkdtemp(join(tmpdir(), 'school-documents-'));
    const storage = new LocalDocumentStorage(directory);
    await expect(storage.store(Buffer.from('contenido'), 'text/plain')).rejects.toThrow('tipo de archivo');
    await expect(storage.store(Buffer.alloc(10 * 1024 * 1024 + 1), 'image/png')).rejects.toThrow('10 MB');
  });

  it('rechaza un directorio dentro de public', () => {
    expect(() => new LocalDocumentStorage(join(process.cwd(), 'public', 'uploads'))).toThrow('no puede ubicarse dentro de public');
  });
});
