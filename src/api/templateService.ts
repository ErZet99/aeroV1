import { delay, getDb, saveDb, nextId } from './db';
import type { Template, BomNode } from '@/types/models';
import { recalcTree } from '@/services/costService';

export async function list(): Promise<Template[]> {
  await delay();
  const db = getDb();
  return JSON.parse(JSON.stringify(db.templates));
}

/** Read template tree without persisting — for working-copy insert. */
export async function getTemplateNodes(templateId: number): Promise<BomNode[]> {
  await delay();
  const db = getDb();
  return JSON.parse(JSON.stringify(db.bomNodes.filter(n => n.templateId === templateId)));
}

export async function saveFromRfq(rfqId: number, name: string): Promise<Template> {
  await delay();
  const db = getDb();

  // Get RFQ's nodes
  const rfqNodes = db.bomNodes.filter(n => n.rfqId === rfqId);

  // Check if template with this name exists
  let template = db.templates.find(t => t.name === name);
  if (template) {
    // Delete its nodes
    db.bomNodes = db.bomNodes.filter(n => n.templateId !== template!.id);
  } else {
    // Create new template
    template = {
      id: nextId('templates'),
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.templates.push(template);
  }

  // Deep-copy nodes: new ids, rfqId: null, templateId set, parentIds remapped
  const idMap = new Map<number, number>();
  const newNodes: BomNode[] = rfqNodes.map(node => {
    const newId = nextId('bomNodes');
    idMap.set(node.id, newId);

    return {
      ...JSON.parse(JSON.stringify(node)),
      id: newId,
      rfqId: null,
      templateId: template!.id,
      parentId: node.parentId !== null && idMap.has(node.parentId) ? idMap.get(node.parentId)! : null,
    };
  });

  // Remap parentIds for all nodes
  const finalNodes = newNodes.map(node => {
    if (node.parentId !== null) {
      const mappedId = idMap.get(node.parentId);
      if (mappedId) node.parentId = mappedId;
    }
    return node;
  });

  db.bomNodes.push(...finalNodes);

  // Recalc template tree
  const recalced = recalcTree(finalNodes);
  recalced.forEach(n => {
    const idx = db.bomNodes.findIndex(bn => bn.id === n.id);
    if (idx >= 0) db.bomNodes[idx] = n;
  });

  template.updatedAt = new Date().toISOString();

  saveDb();
  return template;
}

export async function copyToRfq(templateId: number, rfqId: number): Promise<void> {
  await delay();
  const db = getDb();

  // The copied tree is APPENDED — an RFQ wycena may contain several przyrządy (roots).
  const existingRootCount = db.bomNodes.filter(
    n => n.rfqId === rfqId && n.parentId === null
  ).length;

  // Get template nodes
  const templateNodes = db.bomNodes.filter(n => n.templateId === templateId);

  // Deep-copy: new ids, templateId: null, rfqId set, parentIds remapped
  const idMap = new Map<number, number>();
  templateNodes.forEach(node => idMap.set(node.id, nextId('bomNodes')));

  const finalNodes: BomNode[] = templateNodes.map(node => ({
    ...(JSON.parse(JSON.stringify(node)) as BomNode),
    id: idMap.get(node.id)!,
    rfqId,
    templateId: null,
    parentId: node.parentId !== null ? idMap.get(node.parentId) ?? null : null,
  }));

  // Copied roots continue the existing root numbering; children keep their lp
  const copiedRoots = finalNodes
    .filter(n => n.parentId === null)
    .sort((a, b) => a.lp - b.lp);
  copiedRoots.forEach((root, i) => {
    root.lp = existingRootCount + i + 1;
  });

  db.bomNodes.push(...finalNodes);

  // Recalc the copied subtree (existing roots are independent and unchanged)
  const recalced = recalcTree(finalNodes);
  recalced.forEach(n => {
    const idx = db.bomNodes.findIndex(bn => bn.id === n.id);
    if (idx >= 0) db.bomNodes[idx] = n;
  });

  saveDb();
}
