import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createProjectRecord,
  ProjectSave,
} from '../../src/features/projects/legacy-editor/uploadProject.js';
import { getProjectFile } from '../../src/shared/cache/project-cache.js';
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

  it('meldet einen fehlgeschlagenen Listen-Upload an den Aufrufer zurück', async () => {
    axios.post.mockImplementation(async (path) => {
      if (path === '/api/projects/new') {
        return { data: { id: 'project-with-failed-list' } };
      }

      if (path === '/api/projects/generated/project-with-failed-list/list') {
        const error = new Error('Backend error');
        error.response = {
          status: 500,
          data: { message: 'Internal server error' },
        };
        throw error;
      }

      throw new Error(`Unerwarteter POST: ${path}`);
    });

    await expect(ProjectSave(
      [legacyCorpus],
      materials,
      { id: 'customer-1' },
      [],
      'Fehlertest',
      'Projekt mit Uploadfehler',
      'create',
      null,
      [{ id: 'cabinet-1' }],
    )).rejects.toMatchObject({
      projectId: 'project-with-failed-list',
    });

    expect(axios.post).not.toHaveBeenCalledWith(
      '/api/projects/generated/project-with-failed-list/cabinet',
      expect.anything(),
      expect.anything(),
    );
  });

  it('legt ein leeres Projekt ohne Listen- oder Korpusdatei an', async () => {
    const projectId = await createProjectRecord({
      customerId: 'customer-1',
      title: 'Neues Projekt',
    });

    expect(projectId).toBe('project-created');
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.post).toHaveBeenCalledWith(
      '/api/projects/new',
      {
        customerId: 'customer-1',
        title: 'Neues Projekt',
        description: '',
      },
      { withCredentials: true },
    );
  });
});
