import { describe, it, expect } from 'vitest';
import { nextRfqNumber, nextRevision } from '@/services/numberingService';

describe('numberingService', () => {
  it('empty list starts at seed LP 2150', () => {
    expect(nextRfqNumber('2026-07-15', [])).toBe('2150-07-2026');
  });

  it('bumps global LP regardless of month/year', () => {
    const existing = ['2150-05-2026', '2151-05-2026', '2152-06-2026'];
    expect(nextRfqNumber('2026-07-15', existing)).toBe('2153-07-2026');
  });

  it('ignores non-matching numbers when finding max LP', () => {
    const existing = ['OFF26-07-001', '2150-07-2026', 'junk'];
    expect(nextRfqNumber('2026-08-01', existing)).toBe('2151-08-2026');
  });

  it('nextRevision A returns B', () => {
    expect(nextRevision('A')).toBe('B');
  });

  it('nextRevision B returns C', () => {
    expect(nextRevision('B')).toBe('C');
  });
});
