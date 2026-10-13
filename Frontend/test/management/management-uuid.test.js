import { describe, expect, it, vi } from 'vitest';
import { createUuid } from '../../src/pages/management/utils/uuid.js';

describe('Management-UUIDs', () => {
  it('verwendet die native Browserfunktion, wenn sie verfügbar ist', () => {
    const randomUUID = vi.fn(() => 'df8bbcfb-c53c-4219-84a0-4f09a841eb26');
    vi.stubGlobal('crypto', { randomUUID });
    expect(createUuid()).toBe('df8bbcfb-c53c-4219-84a0-4f09a841eb26');
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it('erzeugt ohne randomUUID gültige UUIDv4-IDs aus Browser-Zufallsbytes', () => {
    const getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
    vi.stubGlobal('crypto', { getRandomValues });
    const ids = Array.from({ length: 100 }, createUuid);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
