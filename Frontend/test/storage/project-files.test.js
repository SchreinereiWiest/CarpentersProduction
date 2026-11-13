import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { downloadFile, uploadJSONFile } from '../../src/shared/api/file-api.js';
import { getCachedGlobalFile, markCachedFileStale, setCachedGlobalFile } from '../../src/shared/cache/indexed-db.js';
import {
  getGlobalFile,
  refreshCachedGlobalFiles,
  syncPendingGlobalFiles,
  uploadGlobalFile,
} from '../../src/shared/cache/global-cache.js';
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

    await vi.waitFor(() => expect(upload).toHaveBeenCalledOnce());

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

    expect(result).toMatchObject({
      status: 'pending',
      data: localNesting,
    });
    await vi.waitFor(() => expect(upload).toHaveBeenCalledWith(
      '/api/projects/generated/project-initial-nesting-race/nesting',
      localNesting,
      expect.objectContaining({
        headers: expect.objectContaining({
          'If-Match': '"0"',
          'X-Calculation-Source': CALCULATION_SOURCES.CLIENT,
        }),
      }),
    ));
    await vi.waitFor(async () => {
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
  });

  it('bestätigt Projektdateien lokal, ohne auf eine langsame Verbindung zu warten', async () => {
    const projectId = `local-first-project-${Date.now()}`;
    let finishUpload;
    const upload = vi.fn(() => new Promise(resolve => { finishUpload = resolve; }));
    const payload = { value: 'local' };

    await expect(uploadProjectFile({
      projectId,
      file: 'cabinet.json',
      data: payload,
      uploadFunction: { upload },
    })).resolves.toMatchObject({ status: 'pending', queued: true, data: payload });

    await expect(getProjectFile({
      projectId,
      file: 'cabinet.json',
      loadFromServer: { download: vi.fn() },
    })).resolves.toEqual(payload);
    await vi.waitFor(() => expect(upload).toHaveBeenCalledOnce());

    finishUpload({ version: 1, fileId: 'cabinet-file' });
    await vi.waitFor(async () => {
      await expect(getCachedProjectFile({ projectId, file: 'cabinet.json' }))
        .resolves.toMatchObject({ syncStatus: 'synced', data: payload });
    });
  });

  it('behält bei schnellen Folgespeicherungen immer den neuesten lokalen Stand', async () => {
    const projectId = `serial-project-${Date.now()}`;
    const resolvers = [];
    const upload = vi.fn(() => new Promise(resolve => resolvers.push(resolve)));

    await uploadProjectFile({
      projectId,
      file: 'list.json',
      data: { revision: 1 },
      uploadFunction: { upload },
    });
    await vi.waitFor(() => expect(upload).toHaveBeenCalledTimes(1));

    await uploadProjectFile({
      projectId,
      file: 'list.json',
      data: { revision: 2 },
      uploadFunction: { upload },
    });
    resolvers[0]({ version: 1, fileId: 'list-file' });

    await vi.waitFor(() => expect(upload).toHaveBeenCalledTimes(2));
    expect(upload.mock.calls[1][1]).toEqual({ revision: 2 });
    expect(upload.mock.calls[1][2].headers['If-Match']).toBe('"1"');
    resolvers[1]({ version: 2, fileId: 'list-file' });

    await vi.waitFor(async () => {
      await expect(getCachedProjectFile({ projectId, file: 'list.json' }))
        .resolves.toMatchObject({ syncStatus: 'synced', data: { revision: 2 }, serverVersion: 2 });
    });
  });

  it('speichert globale Bereiche ebenfalls vor dem Hintergrund-Upload lokal', async () => {
    const file = `local-first-global-${Date.now()}.json`;
    let finishUpload;
    const upload = vi.fn(() => new Promise(resolve => { finishUpload = resolve; }));
    const payload = { theme: 'dark' };

    await expect(uploadGlobalFile({
      file,
      data: payload,
      uploadFunction: { upload, path: '/api/settings/test' },
    })).resolves.toMatchObject({ status: 'pending', queued: true, data: payload });
    await expect(getGlobalFile({
      file,
      loadFromServer: { download: vi.fn() },
    })).resolves.toEqual(payload);
    await vi.waitFor(() => expect(upload).toHaveBeenCalledOnce());

    finishUpload({ version: 3, fileId: 'global-file' });
    await vi.waitFor(async () => {
      await expect(getCachedGlobalFile({ file }))
        .resolves.toMatchObject({ syncStatus: 'synced', data: payload, version: 3 });
    });
  });

  it('überträgt offline gespeicherte globale Bereiche nach Wiederherstellung der Verbindung', async () => {
    const file = `offline-global-${Date.now()}.json`;
    const online = vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);

    await expect(uploadGlobalFile({
      file,
      data: { offline: true },
      uploadFunction: { upload: vi.fn(), path: '/api/settings/offline-test' },
    })).resolves.toMatchObject({ status: 'pending', offline: true });
    await expect(getCachedGlobalFile({ file })).resolves.toMatchObject({ syncStatus: 'pending' });

    online.mockReturnValue(true);
    axios.post.mockResolvedValue({ data: { version: 4, fileId: 'offline-global-file' } });
    await syncPendingGlobalFiles();

    expect(axios.post).toHaveBeenCalledWith(
      '/api/settings/offline-test',
      { offline: true },
      expect.objectContaining({ withCredentials: true })
    );
    await expect(getCachedGlobalFile({ file })).resolves.toMatchObject({
      syncStatus: 'synced',
      data: { offline: true },
      version: 4
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
