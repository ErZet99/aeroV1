import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '@/api/db';
import * as offerService from '@/api/offerService';
import * as bomService from '@/api/bomService';
import { getDb } from '@/api/db';

describe('offerService.createFromRfq', () => {
  beforeEach(() => {
    resetDb();
  });

  it('creates one line per selected root and opens with snapshot cost', async () => {
    const roots = (await bomService.getTree('rfq', 9)).filter(n => n.parentId === null);
    expect(roots.length).toBeGreaterThan(0);

    const offer = await offerService.createFromRfq(9, 2, [roots[0].id]);
    expect(offer.rfqId).toBe(9);
    expect(offer.numer).toBe(getDb().rfqs.find(r => r.id === 9)!.numer);

    const detail = await offerService.get(offer.id);
    expect(detail!.lines).toHaveLength(1);
    expect(detail!.lines[0].sourceBomNodeId).toBe(roots[0].id);
    expect(detail!.lines[0].kosztWykonania).toBe(roots[0].totalCost);
  });

  it('rejects second offer for same RFQ (1:1)', async () => {
    const roots = (await bomService.getTree('rfq', 9)).filter(n => n.parentId === null);
    await offerService.createFromRfq(9, 2, [roots[0].id]);
    await expect(offerService.createFromRfq(9, 2, [roots[0].id])).rejects.toThrow(/already exists/i);
  });

  it('findByRfqId returns existing offer', async () => {
    expect(await offerService.findByRfqId(1)).not.toBeNull();
    expect(await offerService.findByRfqId(9)).toBeNull();
  });

  it('line cost stays frozen after BOM change', async () => {
    const roots = (await bomService.getTree('rfq', 9)).filter(n => n.parentId === null);
    const frozen = roots[0].totalCost;
    const offer = await offerService.createFromRfq(9, 2, [roots[0].id]);

    await bomService.updateNode(roots[0].id, { costSource: 'MANUAL', unitCost: frozen + 999 });

    const detail = await offerService.get(offer.id);
    expect(detail!.lines[0].kosztWykonania).toBe(frozen);
  });
});
