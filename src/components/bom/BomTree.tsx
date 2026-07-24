import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { ExpandedState } from '@tanstack/react-table';
import * as bomService from '@/api/bomService';
import * as dictionaryService from '@/api/dictionaryService';
import * as templateService from '@/api/templateService';
import { getDb } from '@/api/db';
import { ChevronRightIcon } from 'lucide-react';
import type {
  BomNode,
  ComponentGroup,
  ComponentKind,
  ComponentKindSupplier,
  DictItem,
  Operation,
  Supplier,
  Template,
} from '@/types/models';
import { computedUnitCost, recalcTree } from '@/services/costService';
import {
  activeCardSubtree,
  resolveBomRowGesture,
} from '@/services/bomEditor';
import { formatPln } from '@/lib/money';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DocumentActionBar } from '@/components/layout/DocumentActionBar';
import { BomNodeDialog } from './BomNodeDialog';

type TreeNode = BomNode & { children: TreeNode[]; lpPath: string };

interface BomTreeProps {
  ownerType: 'rfq' | 'template';
  ownerId: number;
  /** Document title shown in the sticky action bar. */
  title?: string;
  onDirtyChange?: (dirty: boolean) => void;
}

function buildTree(nodes: BomNode[]): TreeNode[] {
  const map = new Map<number, TreeNode>(
    nodes.map(n => [n.id, { ...n, children: [] as TreeNode[], lpPath: String(n.lp) }])
  );
  const roots: TreeNode[] = [];
  map.forEach(node => {
    if (node.parentId !== null && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortByLp = (list: TreeNode[], parentPath: string) => {
    list.sort((a, b) => a.lp - b.lp);
    list.forEach(n => {
      n.lpPath = parentPath ? `${parentPath}.${n.lp}` : String(n.lp);
      sortByLp(n.children, n.lpPath);
    });
  };
  sortByLp(roots, '');
  return roots;
}

function snapshotOf(nodes: BomNode[]): string {
  return JSON.stringify(nodes);
}

const columnHelper = createColumnHelper<TreeNode>();

export function BomTree({ ownerType, ownerId, title, onDirtyChange }: BomTreeProps) {
  const { t } = useTranslation();

  const [nodes, setNodes] = useState<BomNode[]>([]);
  const [committed, setCommitted] = useState('[]');
  const [groups, setGroups] = useState<ComponentGroup[]>([]);
  const [kinds, setKinds] = useState<ComponentKind[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [kindSuppliers, setKindSuppliers] = useState<ComponentKindSupplier[]>([]);
  const [materials, setMaterials] = useState<DictItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [expanded, setExpanded] = useState<ExpandedState>(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeRootId, setActiveRootId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const [nodeDialog, setNodeDialog] = useState<{
    open: boolean;
    parentId: number | null;
    node: BomNode | null;
  }>({ open: false, parentId: null, node: null });
  const [templatePickerKey, setTemplatePickerKey] = useState(0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  const dirty = snapshotOf(nodes) !== committed;

  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;

  useEffect(() => {
    return () => {
      if (clickTimerRef.current !== null) clearTimeout(clickTimerRef.current);
    };
  }, []);

  useEffect(() => {
    onDirtyChangeRef.current?.(dirty);
  }, [dirty]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelectedId(null);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const applyLocal = useCallback((next: BomNode[]) => {
    setNodes(recalcTree(next));
  }, []);

  const load = useCallback(async () => {
    const db = getDb();
    const [nodeData, materialData, supplierData, templateData] = await Promise.all([
      bomService.getTree(ownerType, ownerId),
      dictionaryService.list('materials'),
      dictionaryService.list('suppliers'),
      templateService.list(),
    ]);
    const recalced = recalcTree(nodeData);
    setNodes(recalced);
    setCommitted(snapshotOf(recalced));
    setGroups(db.componentGroups.filter(g => g.active));
    setKinds(db.componentKinds);
    setOperations(db.operations);
    setKindSuppliers(db.componentKindSuppliers ?? []);
    setMaterials(materialData as DictItem[]);
    setSuppliers(supplierData as Supplier[]);
    setTemplates(templateData);
    setExpanded(true);
    setSelectedId(null);
    setActiveRootId(null);
  }, [ownerType, ownerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const saved = await bomService.replaceTree(ownerType, ownerId, nodes);
      setNodes(saved);
      setCommitted(snapshotOf(saved));
      const now = new Date();
      setSavedAt(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      );
    } finally {
      setSaving(false);
    }
  }, [ownerType, ownerId, nodes]);

  const treeData = useMemo(
    () => buildTree(activeCardSubtree(nodes, activeRootId)),
    [nodes, activeRootId]
  );
  const roots = useMemo(
    () => nodes.filter(n => n.parentId === null).sort((a, b) => a.lp - b.lp),
    [nodes]
  );
  const activeRoot = useMemo(
    () => roots.find(r => r.id === activeRootId) ?? null,
    [roots, activeRootId]
  );
  const activeRootChildCount = useMemo(
    () => (activeRootId === null ? 0 : nodes.filter(n => n.parentId === activeRootId).length),
    [nodes, activeRootId]
  );

  useEffect(() => {
    if (roots.length === 0) {
      setActiveRootId(null);
      return;
    }
    if (activeRootId === null || !roots.some(r => r.id === activeRootId)) {
      setActiveRootId(roots[0].id);
    }
  }, [roots, activeRootId]);

  const labelMaps = useMemo(
    () => ({
      groups: new Map(groups.map(d => [d.id, d.labelPL])),
      kinds: new Map(kinds.map(d => [d.id, d.labelPL])),
      operations: new Map(operations.map(d => [d.id, d.labelPL])),
      materials: new Map(materials.map(d => [d.id, d.labelPL])),
    }),
    [groups, kinds, operations, materials]
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('lp', {
        header: t('bom.lp'),
        cell: ({ row }) => (
          <div className="flex items-center">
            {Array.from({ length: row.depth }).map((_, i) => (
              <span key={i} className="inline-block w-6 self-stretch border-l border-border/60" />
            ))}
            {row.getCanExpand() ? (
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-expanded={row.getIsExpanded()}
                onClick={(e) => {
                  e.stopPropagation();
                  row.toggleExpanded();
                }}
              >
                <ChevronRightIcon
                  className={cn('size-4 transition-transform', row.getIsExpanded() && 'rotate-90')}
                />
              </button>
            ) : (
              <span className="inline-block w-6" />
            )}
            <span className="whitespace-nowrap tabular-nums">{row.original.lpPath}</span>
          </div>
        ),
      }),
      columnHelper.accessor('numerDetalu', { header: t('bom.nrDetalu') }),
      columnHelper.accessor('nazwaOpis', {
        header: t('bom.nazwaOpis'),
        cell: ({ row }) => (
          <span className={cn(row.original.children.length > 0 && 'font-medium')}>
            {row.original.nazwaOpis}
          </span>
        ),
      }),
      columnHelper.accessor('ilosc', {
        header: t('bom.ilosc'),
        cell: info => <div className="text-right tabular-nums">{info.getValue()}</div>,
      }),
      columnHelper.accessor('groupId', {
        header: t('bom.grupa'),
        cell: info => {
          const id = info.getValue();
          return id !== null ? (labelMaps.groups.get(id) ?? t('bom.none')) : t('bom.none');
        },
      }),
      columnHelper.accessor('kindId', {
        header: t('bom.rodzaj'),
        cell: info => {
          const id = info.getValue();
          return id !== null ? (labelMaps.kinds.get(id) ?? t('bom.none')) : t('bom.none');
        },
      }),
      columnHelper.accessor('operations', {
        header: t('bom.operacje'),
        cell: ({ getValue }) => {
          const ops = getValue();
          if (!ops.length) return t('bom.none');
          return (
            <div className="flex flex-wrap gap-1">
              {ops.map(o => (
                <Badge key={o.operationId} variant="secondary">
                  {labelMaps.operations.get(o.operationId) ?? o.operationId}
                </Badge>
              ))}
            </div>
          );
        },
      }),
      columnHelper.display({
        id: 'materialDims',
        header: t('bom.material'),
        cell: ({ row }) => {
          const mat = row.original.materialId !== null
            ? labelMaps.materials.get(row.original.materialId) ?? ''
            : '';
          const dims = row.original.materialWymiary;
          if (!mat && !dims) return t('bom.none');
          return (
            <span className="whitespace-nowrap">
              {mat}{mat && dims ? ' · ' : ''}{dims}
            </span>
          );
        },
      }),
      columnHelper.accessor('ownCost', {
        header: t('bom.kosztWlasny'),
        cell: info => (
          <div className="text-right tabular-nums">{formatPln(info.getValue())}</div>
        ),
      }),
      columnHelper.accessor('unitCost', {
        header: t('bom.kosztJedn'),
        cell: ({ row }) => {
          const n = row.original;
          const children = nodes.filter(c => c.parentId === n.id);
          const breakdown = computedUnitCost(n, children);
          return (
            <div className="text-right tabular-nums">
              {formatPln(n.unitCost)}
              {n.manualUnitCost !== null && (
                <div className="text-xs font-normal text-muted-foreground">
                  {t('bom.manualBadge')} {formatPln(n.manualUnitCost)}
                  {' · '}
                  {t('bom.fromBreakdown')} {formatPln(breakdown)}
                </div>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor('totalCost', {
        header: t('bom.kosztCalk'),
        cell: ({ row }) => (
          <span className="flex items-center justify-end gap-1.5 whitespace-nowrap text-right font-medium tabular-nums">
            {formatPln(row.original.totalCost)}
            {row.original.manualUnitCost !== null && (
              <Badge variant="secondary">{t('bom.manualBadge')}</Badge>
            )}
          </span>
        ),
      }),
    ],
    [t, labelMaps, nodes]
  );

  const table = useReactTable({
    data: treeData,
    columns,
    state: { expanded },
    onExpandedChange: setExpanded,
    getSubRows: row => row.children,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  function openEdit(node: BomNode) {
    setNodeDialog({ open: true, parentId: node.parentId, node });
  }

  function openAddChild(parentId: number) {
    setNodeDialog({ open: true, parentId, node: null });
  }

  function applyRowGesture(gesture: 'click' | 'dblclick', rowNode: BomNode) {
    const outcome = resolveBomRowGesture(gesture, rowNode.id, selectedIdRef.current);
    if (outcome.type === 'deselect') {
      setSelectedId(null);
      return;
    }
    if (outcome.type === 'select') {
      setSelectedId(outcome.nodeId);
      return;
    }
    openEdit(rowNode);
  }

  /** Delay single-click toggle so dblclick can cancel it (browsers fire click before dblclick). */
  function handleRowClick(rowNode: BomNode) {
    if (clickTimerRef.current !== null) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      applyRowGesture('click', rowNode);
    }, 250);
  }

  function handleRowDblClick(rowNode: BomNode) {
    if (clickTimerRef.current !== null) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    applyRowGesture('dblclick', rowNode);
  }

  function handleDelete(node: BomNode) {
    if (!window.confirm(t('bom.confirmDeleteSubtree'))) return;
    const toDelete = new Set([node.id]);
    let changed = true;
    while (changed) {
      changed = false;
      nodes.forEach(n => {
        if (n.parentId !== null && toDelete.has(n.parentId) && !toDelete.has(n.id)) {
          toDelete.add(n.id);
          changed = true;
        }
      });
    }
    applyLocal(nodes.filter(n => !toDelete.has(n.id)));
    if (selectedId !== null && toDelete.has(selectedId)) setSelectedId(null);
  }

  async function handleApplyTemplate(templateId: string) {
    const tplNodes = await templateService.getTemplateNodes(Number(templateId));
    const idMap = new Map<number, number>();
    tplNodes.forEach(n => idMap.set(n.id, bomService.allocNodeId()));

    const existingRootCount = nodes.filter(n => n.parentId === null).length;
    const cloned: BomNode[] = tplNodes.map(n => ({
      ...JSON.parse(JSON.stringify(n)),
      id: idMap.get(n.id)!,
      rfqId: ownerType === 'rfq' ? ownerId : null,
      templateId: ownerType === 'template' ? ownerId : null,
      parentId: n.parentId !== null ? idMap.get(n.parentId) ?? null : null,
    }));

    const copiedRoots = cloned.filter(n => n.parentId === null).sort((a, b) => a.lp - b.lp);
    copiedRoots.forEach((root, i) => {
      root.lp = existingRootCount + i + 1;
    });

    applyLocal([...nodes, ...cloned]);
  }

  function handleCommitNode(payload: {
    parentId: number | null;
    existing: BomNode | null;
    fields: Omit<
      BomNode,
      'id' | 'rfqId' | 'templateId' | 'parentId' | 'lp' | 'ownCost' | 'unitCost' | 'totalCost' | 'version'
    >;
  }) {
    if (payload.existing) {
      applyLocal(
        nodes.map(n =>
          n.id === payload.existing!.id
            ? { ...n, ...payload.fields }
            : n
        )
      );
      return;
    }

    const siblings = nodes.filter(n => n.parentId === payload.parentId);
    const newNode: BomNode = {
      id: bomService.allocNodeId(),
      rfqId: ownerType === 'rfq' ? ownerId : null,
      templateId: ownerType === 'template' ? ownerId : null,
      parentId: payload.parentId,
      lp: siblings.length + 1,
      ownCost: 0,
      unitCost: 0,
      totalCost: 0,
      version: 1,
      ...payload.fields,
    };
    applyLocal([...nodes, newNode]);
  }

  const templateOptions = templates.map(tpl => ({ value: String(tpl.id), label: tpl.name }));

  return (
    <div className="flex min-w-0 flex-col">
      <DocumentActionBar
        title={title ?? t('rfq.wycenaBom')}
        dirty={dirty}
        saving={saving}
        savedAt={savedAt}
        onSave={() => void save()}
      />

      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setNodeDialog({ open: true, parentId: null, node: null })}>
            {t('bom.addPrzyrzad')}
          </Button>
          {ownerType === 'rfq' && templateOptions.length > 0 && (
            <Select
              key={templatePickerKey}
              items={templateOptions}
              onValueChange={(v) => {
                if (v == null) return;
                void handleApplyTemplate(String(v));
                // Remount so the trigger returns to placeholder (action picker, not sticky value).
                setTemplatePickerKey(k => k + 1);
              }}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder={t('bom.fromTemplate')} />
              </SelectTrigger>
              <SelectContent>
                {templateOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {roots.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2">
              {roots.map(root => (
                <button
                  key={root.id}
                  type="button"
                  className={cn(
                    'flex min-h-10 items-center gap-2 rounded-full border px-3 py-1.5 text-left text-sm transition-colors',
                    activeRootId === root.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:bg-muted/50'
                  )}
                  onClick={() => setActiveRootId(root.id)}
                  onDoubleClick={() => openEdit(root)}
                >
                  <span className="text-xs text-muted-foreground">{t('bom.productPillLabel')}</span>
                  <span className="font-medium">{root.nazwaOpis}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatPln(root.totalCost)}
                  </span>
                </button>
              ))}
            </div>

            {activeRoot && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-y py-2">
                <div className="min-w-0 text-sm">
                  <span className="font-medium">{activeRoot.nazwaOpis}</span>
                  <span className="text-muted-foreground">
                    {' · '}
                    {formatPln(activeRoot.totalCost)}
                    {' · '}
                    {t('bom.pozycjeCount', { count: activeRootChildCount })}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openAddChild(activeRoot.id)}>
                    {t('bom.addChild')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(activeRoot)}>
                    {t('bom.editNode')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(activeRoot)}>
                    {t('bom.deleteNode')}
                  </Button>
                </div>
              </div>
            )}

            {treeData.length === 0 ? (
              <div className="p-8 text-muted-foreground">{t('bom.emptySubtree')}</div>
            ) : (
              <div className="max-h-[calc(100vh-260px)] overflow-auto overflow-x-auto rounded-md border">
                <Table className="min-w-[1500px]">
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    {table.getHeaderGroups().map(headerGroup => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                          <TableHead key={header.id} className="whitespace-nowrap">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.map(row => {
                      const isSelected = selectedId === row.original.id;
                      return (
                        <Fragment key={row.id}>
                          <TableRow
                            className={cn(
                              'cursor-pointer hover:bg-muted/50',
                              isSelected && 'bg-muted'
                            )}
                            onClick={(e) => {
                              if (e.detail !== 1) return;
                              handleRowClick(row.original);
                            }}
                            onDoubleClick={() => handleRowDblClick(row.original)}
                          >
                            {row.getVisibleCells().map(cell => (
                              <TableCell key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                          {isSelected && (
                            <TableRow className="bg-muted/40 hover:bg-muted/40">
                              <TableCell colSpan={columns.length}>
                                <div className="flex flex-wrap items-center gap-2 py-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openAddChild(row.original.id)}
                                  >
                                    {t('bom.addChild')}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openEdit(row.original)}
                                  >
                                    {t('bom.editNode')}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDelete(row.original)}
                                  >
                                    {t('bom.deleteNode')}
                                  </Button>
                                  <span className="ml-2 text-sm text-muted-foreground">
                                    {t('bom.selected', { name: row.original.nazwaOpis })}
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </div>

      <BomNodeDialog
        open={nodeDialog.open}
        onOpenChange={(open) => setNodeDialog(d => ({ ...d, open }))}
        parentId={nodeDialog.parentId}
        node={nodeDialog.node}
        childNodes={
          nodeDialog.node
            ? nodes.filter(n => n.parentId === nodeDialog.node!.id)
            : []
        }
        groups={groups}
        kinds={kinds}
        operations={operations}
        kindSuppliers={kindSuppliers}
        suppliers={suppliers}
        materials={materials}
        onCommit={handleCommitNode}
      />
    </div>
  );
}
