import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { CalculatorIcon, ChevronRightIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
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
import { formatPln, round2 } from '@/lib/money';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { BomNodeDialog } from './BomNodeDialog';
import { CostModal } from './CostModal';
import { SupplierCompare } from './SupplierCompare';

type TreeNode = BomNode & { children: TreeNode[]; lpPath: string };

interface BomTreeProps {
  ownerType: 'rfq' | 'template';
  ownerId: number;
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

const columnHelper = createColumnHelper<TreeNode>();

export function BomTree({ ownerType, ownerId }: BomTreeProps) {
  const { t } = useTranslation();

  const [nodes, setNodes] = useState<BomNode[]>([]);
  const [groups, setGroups] = useState<ComponentGroup[]>([]);
  const [kinds, setKinds] = useState<ComponentKind[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [kindSuppliers, setKindSuppliers] = useState<ComponentKindSupplier[]>([]);
  const [materials, setMaterials] = useState<DictItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [expanded, setExpanded] = useState<ExpandedState>(true);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const [nodeDialog, setNodeDialog] = useState<{
    open: boolean;
    parentId: number | null;
    node: BomNode | null;
  }>({ open: false, parentId: null, node: null });
  const [costNode, setCostNode] = useState<BomNode | null>(null);
  const [supplierNode, setSupplierNode] = useState<BomNode | null>(null);

  const load = useCallback(async () => {
    const db = getDb();
    const [nodeData, materialData, supplierData, templateData] = await Promise.all([
      bomService.getTree(ownerType, ownerId),
      dictionaryService.list('materials'),
      dictionaryService.list('suppliers'),
      templateService.list(),
    ]);
    setNodes(nodeData);
    setGroups(db.componentGroups.filter(g => g.active));
    setKinds(db.componentKinds);
    setOperations(db.operations);
    setKindSuppliers(db.componentKindSuppliers);
    setMaterials(materialData as DictItem[]);
    setSuppliers(supplierData as Supplier[]);
    setTemplates(templateData);
    setExpanded(true);
  }, [ownerType, ownerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const treeData = useMemo(() => buildTree(nodes), [nodes]);
  const roots = useMemo(
    () => nodes.filter(n => n.parentId === null).sort((a, b) => a.lp - b.lp),
    [nodes]
  );

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
        cell: info => labelMaps.groups.get(info.getValue()) ?? '—',
      }),
      columnHelper.accessor('kindId', {
        header: t('bom.rodzaj'),
        cell: info => labelMaps.kinds.get(info.getValue()) ?? '—',
      }),
      columnHelper.accessor('operationIds', {
        header: t('bom.operacje'),
        cell: ({ getValue }) => {
          const ids = getValue();
          if (!ids.length) return t('bom.none');
          return (
            <div className="flex flex-wrap gap-1">
              {ids.map(id => (
                <Badge key={id} variant="secondary">
                  {labelMaps.operations.get(id) ?? id}
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
      columnHelper.accessor('unitCost', {
        header: t('bom.kosztJedn'),
        cell: info => (
          <div className="text-right tabular-nums">{formatPln(info.getValue())}</div>
        ),
      }),
      columnHelper.accessor('totalCost', {
        header: t('bom.kosztCalk'),
        cell: ({ row }) => (
          <span className="flex items-center justify-end gap-1.5 whitespace-nowrap text-right font-medium tabular-nums">
            {formatPln(row.original.totalCost)}
            {row.original.costSource === 'MANUAL' && (
              <Badge variant="secondary">{t('bom.manualBadge')}</Badge>
            )}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const node = row.original;
          const visible = hoveredId === node.id;
          return (
            <div
              className={cn(
                'flex items-center justify-end gap-0.5 transition-opacity',
                visible ? 'opacity-100' : 'opacity-0'
              )}
            >
              <Button
                variant="ghost"
                size="icon-sm"
                title={t('bom.addChild')}
                onClick={(e) => {
                  e.stopPropagation();
                  setNodeDialog({ open: true, parentId: node.id, node: null });
                }}
              >
                <PlusIcon className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                title={t('bom.editNode')}
                onClick={(e) => {
                  e.stopPropagation();
                  setNodeDialog({ open: true, parentId: node.parentId, node });
                }}
              >
                <PencilIcon className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                title={t('bom.costCalc')}
                onClick={(e) => {
                  e.stopPropagation();
                  setCostNode(node);
                }}
              >
                <CalculatorIcon className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                title={t('bom.deleteNode')}
                onClick={(e) => {
                  e.stopPropagation();
                  void handleDelete(node);
                }}
              >
                <Trash2Icon className="size-4" />
              </Button>
            </div>
          );
        },
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, labelMaps, hoveredId]
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

  async function handleDelete(node: BomNode) {
    if (!window.confirm(t('bom.confirmDeleteSubtree'))) return;
    await bomService.deleteNode(node.id);
    await load();
  }

  async function handleApplyTemplate(templateId: string) {
    await templateService.copyToRfq(Number(templateId), ownerId);
    await load();
  }

  async function handleSaveTemplate() {
    const name = window.prompt(t('bom.promptTemplateName'));
    if (!name || !name.trim()) return;
    const existing = await templateService.list();
    if (existing.some(tpl => tpl.name === name.trim())) {
      if (!window.confirm(t('bom.confirmOverwrite'))) return;
    }
    await templateService.saveFromRfq(ownerId, name.trim());
    await load();
  }

  const templateOptions = templates.map(tpl => ({ value: String(tpl.id), label: tpl.name }));
  const isEmpty = nodes.length === 0;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <Button onClick={() => setNodeDialog({ open: true, parentId: null, node: null })}>
          {t('bom.addPrzyrzad')}
        </Button>
        {ownerType === 'rfq' && templateOptions.length > 0 && (
          <Select
            items={templateOptions}
            value={null}
            onValueChange={(v) => void handleApplyTemplate(String(v))}
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
        {!isEmpty && ownerType === 'rfq' && (
          <Button variant="outline" onClick={() => void handleSaveTemplate()}>
            {t('bom.saveTemplate')}
          </Button>
        )}
      </div>

      {roots.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {roots.map(root => (
            <Card key={root.id} className="min-w-56">
              <CardHeader>
                <CardTitle>{root.nazwaOpis}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">{t('bom.kosztWykonania')}</span>
                  <span className="text-lg font-semibold tabular-nums">
                    {formatPln(root.totalCost)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
          {roots.length > 1 && (
            <Card className="min-w-48">
              <CardHeader>
                <CardTitle>{t('bom.razem')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">{t('bom.kosztWykonania')}</span>
                  <span className="text-lg font-semibold tabular-nums">
                    {formatPln(round2(roots.reduce((acc, r) => acc + r.totalCost, 0)))}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {isEmpty ? (
        <div className="p-8 text-muted-foreground">{t('bom.emptyTree')}</div>
      ) : (
        <div className="max-h-[calc(100vh-260px)] overflow-auto overflow-x-auto rounded-md border">
          <Table className="min-w-[1400px]">
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
              {table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onMouseEnter={() => setHoveredId(row.original.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() =>
                    setNodeDialog({
                      open: true,
                      parentId: row.original.parentId,
                      node: row.original,
                    })
                  }
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <BomNodeDialog
        open={nodeDialog.open}
        onOpenChange={(open) => setNodeDialog(d => ({ ...d, open }))}
        ownerType={ownerType}
        ownerId={ownerId}
        parentId={nodeDialog.parentId}
        node={nodeDialog.node}
        groups={groups}
        kinds={kinds}
        operations={operations}
        kindSuppliers={kindSuppliers}
        suppliers={suppliers}
        materials={materials}
        onSaved={() => void load()}
      />

      <CostModal
        open={costNode !== null}
        onOpenChange={(open) => {
          if (!open) setCostNode(null);
        }}
        node={costNode}
        onSaved={() => void load()}
        onOpenSuppliers={(n) => setSupplierNode(n)}
      />

      <SupplierCompare
        open={supplierNode !== null}
        onOpenChange={(open) => {
          if (!open) setSupplierNode(null);
        }}
        node={supplierNode}
        suppliers={suppliers}
        onSaved={() => void load()}
      />
    </div>
  );
}
