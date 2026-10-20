import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { downloadFile, uploadJSONFile } from '../../src/shared/api/file-api.js';
import { getCachedGlobalFile, markCachedFileStale, setCachedGlobalFile } from '../../src/shared/cache/indexed-db.js';
import { getGlobalFile, refreshCachedGlobalFiles } from '../../src/shared/cache/global-cache.js';
import { getProjectFile, uploadProjectFile } from '../../src/shared/cache/project-cache.js';
import { getCachedProjectFile, setCachedProjectFile } from '../../src/shared/cache/project-indexed-db.js';
import { loadCadFile } from '../../src/features/projects/measurement/import/cadLoader.js';
import { CALCULATION_SOURCES } from '@Engine/contracts/project/calculation-source.js';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('Dateispeicherung und -abruf', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    axios.get.mockReset();
    axios.post.mockReset();
  });

  it('lädt JSON über die vom Backend gelieferte signierte URL', async () => {
    const payload = { project: 'project-download', rows: [1, 2, 3] };
    axios.get.mockResolvedValue({
      data: {
        exists: true,
        downloadUrl: 'https://storage.test/list.json',
      },
    });
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(payload),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(downloadFile('/api/projects/generated/project-download/list'))
      .resolves.toEqual(payload);

    expect(axios.get).toHaveBeenCalledWith(
      '/api/projects/generated/project-download/list',
      {
        withCredentials: true,
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      },
    );
    expect(fetchMock).toHaveBeenCalledWith('https://storage.test/list.json');
  });

  it('gibt bei einer nicht vorhandenen Datei null zurück und ruft den Storage nicht auf', async () => {
    axios.get.mockResolvedValue({ data: { exists: false } });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(downloadFile('/api/projects/generated/missing/list'))
      .resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('liefert für ein fehlendes Nesting die Client-Kennung an den Erzeugungsablauf', async () => {
    const download = vi.fn();
    download.getDescriptor = vi.fn().mockResolvedValue({
      exists: false,
      calculationSource: CALCULATION_SOURCES.CLIENT,
    });

    await expect(getProjectFile({
      projectId: 'project-without-nesting',
      file: 'nesting.json',
      includeCalculationSource: true,
      loadFromServer: {
        path: '/api/projects/generated/project-without-nesting/nesting',
        download,
      },
    })).resolves.toEqual({
      data: null,
      calculationSource: CALCULATION_SOURCES.CLIENT,
    });
    expect(download).not.toHaveBeenCalled();
  });

  it('sendet JSON mit Session-Cookie und Content-Type an das Backend', async () => {
    const payload = { rows: [{ PID: '000001' }] };
    axios.post.mockResolvedValue({ data: { saved: true } });

    await expect(uploadJSONFile('/api/projects/generated/p-1/list', payload))
      .resolves.toEqual({ saved: true });

    expect(axios.post).toHaveBeenCalledWith(
      '/api/projects/generated/p-1/list',
      payload,
      {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  });

  it('ruft einen hochgeladenen CAD-Anhang über seine signierte Datei-URL ab', async () => {
    axios.get.mockResolvedValue({
      data: { url: 'https://storage.test/cad.json' },
    });
    const fetchMock = vi.fn().mockResolvedValue({
      text: vi.fn().mockResolvedValue(JSON.stringify([
        { PID: '001000', Objektname: 'Korpus', L: '720,0', B: '600', T: '560' },
        { PID: '001001', Objektname: 'Seite', L: '720,0', B: '560', T: '19' },
      ])),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await loadCadFile({ id: 'cad-file-1' });

    expect(axios.get).toHaveBeenCalledWith(
      '/api/files/download/cad-file-1',
      { withCredentials: true },
    );
    expect(fetchMock).toHaveBeenCalledWith('https://storage.test/cad.json');
    expect(result).toEqual([
      expect.objectContaining({
        PID: '001000',
        L: 720,
        Children: [expect.objectContaining({ PID: '001001', T: 19 })],
      }),
    ]);
  });

  it('liest einen Upload nach einem Modul-Neustart aus IndexedDB statt erneut vom Server', async () => {
    const payload = [{ PID: '000001', Objektname: 'Seiten' }];
    const upload = vi.fn().mockResolvedValue({ saved: true });

    await setCachedGlobalFile({
      file: 'settings-cache.json',
      data: { healthDuration: 12 * 60 * 60 * 1000 },
      version: Date.now(),
    });

    await uploadProjectFile({
      projectId: 'project-indexed-db',
      file: 'list.json',
      data: payload,
      uploadFunction: {
        path: '/api/projects/generated/project-indexed-db/list',
        upload,
      },
    });

    expect(upload).toHaveBeenCalledOnce();

    vi.resetModules();
    const { getProjectFile } = await import('../../src/shared/cache/project-cache.js');
    const serverDownload = vi.fn();

    await expect(getProjectFile({
      projectId: 'project-indexed-db',
      file: 'list.json',
      loadFromServer: {
        path: '/api/projects/generated/project-indexed-db/list',
        download: serverDownload,
      },
    })).resolves.toEqual(payload);

    expect(serverDownload).not.toHaveBeenCalled();
  });

  it('liefert einen S3-Cache-Treffer sofort und ersetzt eine alte Version im Hintergrund', async () => {
    const file = 'stale-while-revalidate.json';
    const oldData = { version: 'local-cache' };
    const newData = { version: 'server' };
    await setCachedGlobalFile({
      file,
      data: oldData,
      version: 1,
      sourcePath: '/api/settings/revalidation-test',
      lastValidatedAt: 0,
    });

    let resolveDescriptor;
    const descriptorPromise = new Promise(resolve => { resolveDescriptor = resolve; });
    const download = vi.fn();
    download.getDescriptor = vi.fn(() => descriptorPromise);
    download.fromDescriptor = vi.fn().mockResolvedValue(newData);

    await expect(getGlobalFile({
      file,
      loadFromServer: {
        download,
        path: '/api/settings/revalidation-test',
      },
    })).resolves.toEqual(oldData);

    expect(download.fromDescriptor).not.toHaveBeenCalled();
    resolveDescriptor({ exists: true, serverVersion: 2 });

    await vi.waitFor(async () => {
      expect((await getCachedGlobalFile({ file })).data).toEqual(newData);
    });
    expect(download.fromDescriptor).toHaveBeenCalledOnce();
  });

  it('markiert fremde Serveränderungen als veraltet, schützt aber lokale Änderungen', async () => {
    await setCachedProjectFile({
      projectId: 'project-live-update',
      file: 'list.json',
      fileId: 'server-file-live',
      data: { source: 'server' },
      serverVersion: 3,
      syncStatus: 'synced',
      lastValidatedAt: Date.now(),
    });
    await setCachedProjectFile({
      projectId: 'project-live-update',
      file: 'cabinet.json',
      fileId: 'server-file-pending',
      data: { source: 'local' },
      serverVersion: 3,
      syncStatus: 'pending',
      lastValidatedAt: Date.now(),
    });

    await markCachedFileStale({
      action: 'updated',
      resourceType: 'project-json',
      fileId: 'server-file-live',
      projectId: 'project-live-update',
      fileName: 'list.json',
      serverVersion: 4,
    });
    await markCachedFileStale({
      action: 'updated',
      resourceType: 'project-json',
      fileId: 'server-file-pending',
      projectId: 'project-live-update',
      fileName: 'cabinet.json',
      serverVersion: 4,
    });

    const stale = await getCachedProjectFile({ projectId: 'project-live-update', file: 'list.json' });
    const pending = await getCachedProjectFile({ projectId: 'project-live-update', file: 'cabinet.json' });
    expect(stale).toMatchObject({ lastValidatedAt: 0, announcedServerVersion: 4 });
    expect(pending.syncStatus).toBe('pending');
    expect(pending.lastValidatedAt).not.toBe(0);
  });

  it('übernimmt beim ersten Nesting-Vorschlag eindeutig die bereits vorhandene Serverberechnung', async () => {
    const localNesting = [{ MID: 'LOCAL', nestingPlates: [] }];
    const serverNesting = [{ MID: 'SERVER', nestingPlates: [] }];
    const upload = vi.fn().mockRejectedValue(Object.assign(new Error('conflict'), {
      response: {
        status: 412,
        data: {
          error: 'VERSION_CONFLICT',
          fileId: 'server-nesting-file',
          currentVersion: 1,
          calculationSource: CALCULATION_SOURCES.SERVER,
        },
      },
    }));
    axios.get.mockResolvedValue({
      data: {
        exists: true,
        downloadUrl: 'https://storage.test/server-nesting.json',
        fileId: 'server-nesting-file',
        serverVersion: 1,
        calculationSource: CALCULATION_SOURCES.SERVER,
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(serverNesting),
    }));

    const result = await uploadProjectFile({
      projectId: 'project-initial-nesting-race',
      file: 'nesting.json',
      data: localNesting,
      calculationSource: CALCULATION_SOURCES.CLIENT,
      uploadFunction: { upload },
    });

    expect(upload).toHaveBeenCalledWith(
      '/api/projects/generated/project-initial-nesting-race/nesting',
      localNesting,
      expect.objectContaining({
        headers: expect.objectContaining({
          'If-Match': '"0"',
          'X-Calculation-Source': CALCULATION_SOURCES.CLIENT,
        }),
      }),
    );
    expect(result).toMatchObject({
      status: 'synced',
      calculationSource: CALCULATION_SOURCES.SERVER,
      data: serverNesting,
      version: 1,
    });
    await expect(getCachedProjectFile({
      projectId: 'project-initial-nesting-race',
      file: 'nesting.json',
    })).resolves.toMatchObject({
      data: serverNesting,
      serverVersion: 1,
      baseVersion: 1,
      syncStatus: 'synced',
      calculationSource: CALCULATION_SOURCES.SERVER,
    });
  });

  it('lädt eine bereits gecachte Datei auf Anforderung auch bei gleicher Version neu', async () => {
    const file = 'manual-redownload.json';
    await setCachedGlobalFile({
      file,
      data: { content: 'old' },
      version: 7,
      sourcePath: '/api/settings/manual-redownload',
    });
    axios.get.mockResolvedValue({
      data: {
        exists: true,
        fileId: 'manual-redownload-id',
        serverVersion: 7,
        downloadUrl: 'https://storage.test/manual-redownload.json',
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ content: 'fresh' }),
    }));

    const result = await refreshCachedGlobalFiles({
      force: true,
      includeInactive: true,
      redownload: true,
    });

    expect(result.refreshed).toBeGreaterThan(0);
    expect((await getCachedGlobalFile({ file })).data).toEqual({ content: 'fresh' });
  });
});
