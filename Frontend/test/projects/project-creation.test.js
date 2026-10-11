import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectSave } from '../../src/pages/projects/edit/uploadProject.js';
import { getProjectFile } from '../../src/services/projectMemoryCache.js';
import {
  legacyCorpus,
  materials,
} from '../fixtures/project.fixture.js';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('Projektanlage im Frontend', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    axios.post.mockImplementation(async (path) => {
      if (path === '/api/projects/new') {
        return { data: { id: 'project-created' } };
      }

      if (path === '/api/files/upload') {
        return { data: { fileEntry: { id: 'uploaded-file' } } };
      }

      if (path.startsWith('/api/projects/generated/')) {
        return { data: { saved: true } };
      }

      throw new Error(`Unerwarteter POST: ${path}`);
    });
  });

  it('legt das Projekt an, lädt Anhänge hoch und speichert Listen- und Korpusdaten', async () => {
    const attachment = new File(['binary'], 'planung.glb', { type: '' });
    const cabinets = [{ id: 'cabinet-1', name: 'Testschrank' }];

    await ProjectSave(
      [legacyCorpus],
      materials,
      { id: 'customer-1' },
      [attachment],
      'Frontend-Integrationstest',
      'Testprojekt',
      'create',
      null,
      cabinets,
    );

    expect(axios.post).toHaveBeenCalledWith(
      '/api/projects/new',
      {
        customerId: 'customer-1',
        title: 'Testprojekt',
        description: 'Frontend-Integrationstest',
      },
      { withCredentials: true },
    );

    const attachmentCall = axios.post.mock.calls.find(
      ([path]) => path === '/api/files/upload',
    );
    expect(attachmentCall).toBeDefined();
    expect(attachmentCall[1]).toBeInstanceOf(FormData);
    expect(attachmentCall[1].get('entityId')).toBe('project-created');
    expect(attachmentCall[1].get('customerId')).toBe('customer-1');
    expect(attachmentCall[1].get('mimeType')).toBe('model/gltf-binary');

    expect(axios.post).toHaveBeenCalledWith(
      '/api/projects/generated/project-created/list',
      expect.any(Array),
      expect.objectContaining({ withCredentials: true }),
    );
    expect(axios.post).toHaveBeenCalledWith(
      '/api/projects/generated/project-created/cabinet',
      cabinets,
      expect.objectContaining({ withCredentials: true }),
    );

    const list = await getProjectFile({
      projectId: 'project-created',
      file: 'list.json',
      loadFromServer: {
        path: '/should-not-be-called',
        download: vi.fn(() => {
          throw new Error('Die frisch gespeicherte Liste muss aus dem Cache kommen.');
        }),
      },
    });

    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      Objektname: 'Testschrank',
      MID: 'BOARD-19',
    });
    expect(list[0].Children[0]).toMatchObject({
      Objektname: 'Seiten',
      Anzahl: 2,
      MID: 'BOARD-19',
    });
  });
});
