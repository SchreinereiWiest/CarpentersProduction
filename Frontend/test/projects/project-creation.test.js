import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createProjectRecord,
  ProjectSave,
} from '../../src/features/projects/legacy-editor/uploadProject.js';
import { getProjectFile } from '../../src/shared/cache/project-cache.js';
import { getCachedProjectFile } from '../../src/shared/cache/project-indexed-db.js';
import {
  getLocalProject,
  markLocalProjectCreatedOnServer,
} from '../../src/shared/offline/local-projects.js';
import { promoteLocalProject } from '../../src/shared/projects/local-project-promotion.js';
import {
  legacyCorpus,
  materials,
} from '../fixtures/project.fixture.js';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('Projektanlage im Frontend', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    axios.post.mockImplementation(async (path, body) => {
      if (path === '/api/projects/new') {
        return { data: { id: body.id ?? 'project-created' } };
      }

      if (path === '/api/files/upload') {
        return { data: { fileEntry: { id: 'uploaded-file' } } };
      }

      if (path.startsWith('/api/projects/generated/')) {
        return { data: { saved: true } };
      }

      throw new Error(`Unerwarteter POST: ${path}`);
    });
    axios.put.mockImplementation(async (path, body) => ({
      data: {
        id: path.split('/').pop(),
        ...body,
      },
    }));
    axios.get.mockImplementation(async (path) => {
      if (path.startsWith('/api/projects/get/')) {
        const id = path.split('/').pop();
        return {
          data: {
            project: {
              id,
              customerId: 'customer-1',
              title: 'Lokales Projekt',
              description: '',
              status: 'active',
              files: [],
            },
          },
        };
      }
      throw new Error(`Unerwarteter GET: ${path}`);
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

    await vi.waitFor(() => {
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
    });

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

  it('behält einen fehlgeschlagenen Listen-Upload lokal zur späteren Synchronisierung', async () => {
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
    )).resolves.toEqual({ projectId: 'project-with-failed-list' });

    await vi.waitFor(async () => {
      await expect(getCachedProjectFile({
        projectId: 'project-with-failed-list',
        file: 'list.json',
      })).resolves.toMatchObject({
        syncStatus: 'error',
        data: expect.any(Array),
      });
    });
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

  it('legt ein Projekt ohne Kunden vollständig lokal mit einer Frontend-ID an', async () => {
    const projectId = await createProjectRecord({
      title: 'Nur lokal',
      description: 'Noch keinem Kunden zugewiesen',
    });

    expect(projectId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(axios.post).not.toHaveBeenCalled();
    await expect(getLocalProject(projectId)).resolves.toMatchObject({
      id: projectId,
      title: 'Nur lokal',
      description: 'Noch keinem Kunden zugewiesen',
      customerId: null,
      localOnly: true,
    });
  });

  it('speichert Projektdaten ohne Kunden lokal und lädt sie nach der Zuweisung mit derselben ID hoch', async () => {
    const attachment = new File(['offline'], 'lokaler-plan.pdf', { type: 'application/pdf' });
    const result = await ProjectSave(
      [legacyCorpus],
      materials,
      null,
      [attachment],
      '',
      'Lokales Projekt',
      'create',
      null,
      [{ id: 'cabinet-local' }],
    );

    expect(result).toMatchObject({ localOnly: true });
    expect(axios.post).not.toHaveBeenCalled();
    await expect(getCachedProjectFile({
      projectId: result.projectId,
      file: 'list.json',
    })).resolves.toMatchObject({ syncStatus: 'local' });
    await expect(getLocalProject(result.projectId)).resolves.toMatchObject({
      files: [expect.objectContaining({
        fileName: 'lokaler-plan.pdf',
        localOnly: true,
      })],
    });
    await expect(getCachedProjectFile({
      projectId: result.projectId,
      file: 'cabinet.json',
    })).resolves.toMatchObject({ syncStatus: 'local' });
    const serverDownload = vi.fn();
    await expect(getProjectFile({
      projectId: result.projectId,
      file: 'list.json',
      loadFromServer: {
        path: `/api/projects/generated/${result.projectId}/list`,
        download: serverDownload,
      },
    })).resolves.toEqual(expect.any(Array));
    expect(serverDownload).not.toHaveBeenCalled();

    await promoteLocalProject({
      projectId: result.projectId,
      customerId: 'customer-1',
      title: 'Lokales Projekt',
      description: '',
      status: 'active',
    });

    expect(axios.post).toHaveBeenCalledWith(
      '/api/projects/new',
      expect.objectContaining({
        id: result.projectId,
        customerId: 'customer-1',
        status: 'inactive',
      }),
      { withCredentials: true },
    );
    expect(axios.post).toHaveBeenCalledWith(
      `/api/projects/generated/${result.projectId}/list`,
      expect.any(Array),
      expect.objectContaining({ withCredentials: true }),
    );
    expect(axios.post).toHaveBeenCalledWith(
      `/api/projects/generated/${result.projectId}/cabinet`,
      [{ id: 'cabinet-local' }],
      expect.objectContaining({ withCredentials: true }),
    );
    const attachmentCall = axios.post.mock.calls.find(
      ([path]) => path === '/api/files/upload',
    );
    expect(attachmentCall).toBeDefined();
    expect(attachmentCall[1]).toBeInstanceOf(FormData);
    expect(attachmentCall[1].get('entityId')).toBe(result.projectId);
    expect(attachmentCall[1].get('customerId')).toBe('customer-1');
    expect(axios.put).toHaveBeenCalledWith(
      `/api/projects/update/${result.projectId}`,
      expect.objectContaining({
        customerId: 'customer-1',
        status: 'active',
      }),
    );
    await expect(getLocalProject(result.projectId)).resolves.toBeNull();
  });

  it('bricht ab, wenn das Backend die lokale Projekt-ID nicht übernimmt', async () => {
    const localProjectId = await createProjectRecord({ title: 'Nur lokal' });
    axios.post.mockImplementationOnce(async () => ({
      data: { id: '11111111-1111-4111-8111-111111111111' },
    }));

    await expect(promoteLocalProject({
      projectId: localProjectId,
      customerId: 'customer-1',
      title: 'Nur lokal',
      description: '',
      status: 'active',
    })).rejects.toThrow('nicht mit der lokalen Projekt-ID');

    await expect(getLocalProject(localProjectId)).resolves.toMatchObject({
      id: localProjectId,
      localOnly: true,
    });
    expect(axios.post).toHaveBeenCalledTimes(1);
  });

  it('legt einen lokal als erstellt markierten, aber serverseitig fehlenden Datensatz erneut an', async () => {
    const localProjectId = await createProjectRecord({ title: 'Wiederaufnahme' });
    await markLocalProjectCreatedOnServer(localProjectId);
    const notFound = new Error('Project not found');
    notFound.response = { status: 404, data: { message: 'Project not found' } };
    axios.put
      .mockRejectedValueOnce(notFound)
      .mockResolvedValueOnce({
        data: {
          id: localProjectId,
          customerId: 'customer-1',
          status: 'active',
        },
      });

    await expect(promoteLocalProject({
      projectId: localProjectId,
      customerId: 'customer-1',
      title: 'Wiederaufnahme',
      description: '',
      status: 'active',
    })).resolves.toMatchObject({
      id: localProjectId,
      localOnly: false,
    });

    expect(axios.post).toHaveBeenCalledWith(
      '/api/projects/new',
      expect.objectContaining({ id: localProjectId }),
      { withCredentials: true },
    );
    await expect(getLocalProject(localProjectId)).resolves.toBeNull();
  });
});
