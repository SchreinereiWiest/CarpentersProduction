import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { downloadFile, uploadJSONFile } from '../../src/services/apiTemplates.js';
import { setCachedGlobalFile } from '../../src/services/globalIndexDb.js';
import { uploadProjectFile } from '../../src/services/projectMemoryCache.js';
import { loadCadFile } from '../../src/pages/projects/cad/cadLoader.project.js';

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
      { withCredentials: true },
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
    const { getProjectFile } = await import('../../src/services/projectMemoryCache.js');
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
});
