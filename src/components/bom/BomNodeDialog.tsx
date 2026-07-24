import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  groupTypeOf,
  kindsForGroup,
  operationsForKind,
  preseedSupplierOffers,
  resetAfterGroupChange,
  resetAfterKindChange,
} from '@/services/cascadeService';
import { computedUnitCost } from '@/services/costService';
import type {
  BomNode,
  BomNodeOperation,
  ComponentGroup,
  ComponentKind,
  ComponentKindSupplier,
  DictItem,
  Operation,
  Supplier,
  SupplierOffer,
} from '@/types/models';
import { formatPln, round2 } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SupplierCompare } from './SupplierCompare';

const NONE_VALUE = '0';

interface BomNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId: number | null;
  node: BomNode | null;
  /** Sibling children — for live "z rozbicia" when editing. */
  childNodes: BomNode[];
  groups: ComponentGroup[];
  kinds: ComponentKind[];
  operations: Operation[];
  kindSuppliers: ComponentKindSupplier[];
  suppliers: Supplier[];
  materials: DictItem[];
  /** Commit to working copy (no DB). */
  onCommit: (payload: {
    parentId: number | null;
    existing: BomNode | null;
    fields: Omit<
      BomNode,
      'id' | 'rfqId' | 'templateId' | 'parentId' | 'lp' | 'ownCost' | 'unitCost' | 'totalCost' | 'version'
    >;
  }) => void;
}

interface DictSelectProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

function DictSelect({ id, label, placeholder, value, options, onChange, disabled }: DictSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        items={options}
        value={value || null}
        onValueChange={(v) => onChange(String(v))}
      >
        <SelectTrigger id={id} className="w-full" disabled={disabled}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function BomNodeDialog({
  open,
  onOpenChange,
  parentId,
  node,
  childNodes,
  groups,
  kinds,
  operations,
  kindSuppliers,
  suppliers,
  materials,
  onCommit,
}: BomNodeDialogProps) {
  const { t } = useTranslation();

  const [numerDetalu, setNumerDetalu] = useState('');
  const [ilosc, setIlosc] = useState('1');
  const [nazwaOpis, setNazwaOpis] = useState('');
  const [groupId, setGroupId] = useState('');
  const [kindId, setKindId] = useState('');
  const [nodeOps, setNodeOps] = useState<BomNodeOperation[]>([]);
  const [supplierOffers, setSupplierOffers] = useState<SupplierOffer[]>([]);
  const [materialId, setMaterialId] = useState(NONE_VALUE);
  const [materialWymiary, setMaterialWymiary] = useState('');
  const [materialCost, setMaterialCost] = useState('');
  const [manualUnitCost, setManualUnitCost] = useState('');
  const [procesySpecjalne, setProcesySpecjalne] = useState(false);
  const [dodatkowe, setDodatkowe] = useState('');
  const [opCompareIdx, setOpCompareIdx] = useState<number | null>(null);
  const [nodeCompareOpen, setNodeCompareOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (node) {
      setNumerDetalu(node.numerDetalu);
      setIlosc(String(node.ilosc));
      setNazwaOpis(node.nazwaOpis);
      setGroupId(String(node.groupId));
      setKindId(String(node.kindId));
      setNodeOps(JSON.parse(JSON.stringify(node.operations)));
      setSupplierOffers(JSON.parse(JSON.stringify(node.supplierOffers)));
      setMaterialId(node.materialId !== null ? String(node.materialId) : NONE_VALUE);
      setMaterialWymiary(node.materialWymiary);
      setMaterialCost(node.materialCost ? String(node.materialCost) : '');
      setManualUnitCost(node.manualUnitCost !== null ? String(node.manualUnitCost) : '');
      setProcesySpecjalne(node.procesySpecjalne);
      setDodatkowe(node.dodatkowe);
    } else {
      setNumerDetalu('');
      setIlosc('1');
      setNazwaOpis('');
      setGroupId(groups[0] ? String(groups[0].id) : '');
      setKindId('');
      setNodeOps([]);
      setSupplierOffers([]);
      setMaterialId(NONE_VALUE);
      setMaterialWymiary('');
      setMaterialCost('');
      setManualUnitCost('');
      setProcesySpecjalne(false);
      setDodatkowe('');
    }
  }, [open, node, groups]);

  const gId = Number(groupId) || 0;
  const kId = Number(kindId) || 0;
  const groupType = groupTypeOf(groups, gId);
  const kindOptions = useMemo(() => kindsForGroup(kinds, gId), [kinds, gId]);
  const opOptions = useMemo(() => operationsForKind(operations, kId), [operations, kId]);

  const preferredForKind = useMemo(() => {
    if (groupType !== 'ZAKUPOWA' || !kId) return [];
    return preseedSupplierOffers(kindSuppliers, suppliers, kId);
  }, [groupType, kId, kindSuppliers, suppliers]);

  useEffect(() => {
    if (!open || groupType !== 'ZAKUPOWA' || !kId) return;
    if (supplierOffers.length === 0 && preferredForKind.length > 0) {
      setSupplierOffers(preferredForKind);
    }
  }, [open, groupType, kId, preferredForKind, supplierOffers.length]);

  function handleGroupChange(value: string) {
    setGroupId(value);
    const reset = resetAfterGroupChange();
    setKindId('');
    setNodeOps(reset.operations);
    setSupplierOffers([]);
  }

  function handleKindChange(value: string) {
    setKindId(value);
    setNodeOps(resetAfterKindChange().operations);
    const nextKindId = Number(value);
    const type = groupTypeOf(groups, gId);
    if (type === 'ZAKUPOWA') {
      setSupplierOffers(preseedSupplierOffers(kindSuppliers, suppliers, nextKindId));
    } else {
      setSupplierOffers([]);
    }
  }

  function toggleOp(opId: number, checked: boolean) {
    setNodeOps(ops => {
      if (checked) {
        if (ops.some(o => o.operationId === opId)) return ops;
        return [...ops, { operationId: opId, cena: 0, supplierId: null, supplierOffers: [] }];
      }
      return ops.filter(o => o.operationId !== opId);
    });
  }

  function updateOp(operationId: number, patch: Partial<BomNodeOperation>) {
    setNodeOps(ops => ops.map(o => (o.operationId === operationId ? { ...o, ...patch } : o)));
  }

  const draftOwn =
    groupType === 'ZAKUPOWA' && supplierOffers.some(o => o.isFinal)
      ? round2(supplierOffers.find(o => o.isFinal)!.cena)
      : round2((Number(materialCost) || 0) + nodeOps.reduce((s, o) => s + (o.cena || 0), 0));

  const draftForBreakdown: BomNode = {
    id: node?.id ?? 0,
    rfqId: null,
    templateId: null,
    parentId,
    lp: 1,
    numerDetalu,
    ilosc: Number(ilosc) || 1,
    nazwaOpis,
    groupId: gId,
    kindId: kId,
    operations: nodeOps,
    materialId: null,
    materialWymiary: '',
    materialCost: Number(materialCost) || 0,
    procesySpecjalne: false,
    dodatkowe: '',
    manualUnitCost: manualUnitCost.trim() === '' ? null : round2(Number(manualUnitCost) || 0),
    ownCost: draftOwn,
    unitCost: 0,
    totalCost: 0,
    supplierOffers,
    version: 1,
  };
  const breakdown = computedUnitCost(draftForBreakdown, childNodes);

  const valid =
    nazwaOpis.trim() !== '' &&
    groupId !== '' &&
    kindId !== '' &&
    Number(ilosc) >= 1;

  function handleSave() {
    if (!valid) return;
    onCommit({
      parentId,
      existing: node,
      fields: {
        numerDetalu,
        ilosc: Number(ilosc),
        nazwaOpis: nazwaOpis.trim(),
        groupId: Number(groupId),
        kindId: Number(kindId),
        operations: groupType === 'OPERACYJNA' ? nodeOps : [],
        materialId: materialId === NONE_VALUE ? null : Number(materialId),
        materialWymiary,
        materialCost: round2(Number(materialCost) || 0),
        procesySpecjalne,
        dodatkowe,
        manualUnitCost: manualUnitCost.trim() === '' ? null : round2(Number(manualUnitCost) || 0),
        supplierOffers: groupType === 'ZAKUPOWA' ? supplierOffers : [],
      },
    });
    onOpenChange(false);
  }

  const materialOptions = [
    { value: NONE_VALUE, label: t('bom.none') },
    ...materials.map(m => ({ value: String(m.id), label: m.labelPL })),
  ];

  const comparingOp = opCompareIdx !== null ? nodeOps[opCompareIdx] : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{node ? t('bom.nodeDialogEdit') : t('bom.nodeDialogAdd')}</DialogTitle>
          </DialogHeader>

          <div className="flex max-h-[65vh] flex-col gap-3 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bom-nr">{t('bom.nrDetalu')}</Label>
                <Input id="bom-nr" value={numerDetalu} onChange={(e) => setNumerDetalu(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bom-ilosc">{t('bom.ilosc')}</Label>
                <Input
                  id="bom-ilosc"
                  type="number"
                  min={1}
                  value={ilosc}
                  onChange={(e) => setIlosc(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bom-nazwa">{t('bom.nazwaOpis')}</Label>
              <Input id="bom-nazwa" value={nazwaOpis} onChange={(e) => setNazwaOpis(e.target.value)} />
            </div>

            <DictSelect
              id="bom-group"
              label={t('bom.grupa')}
              placeholder={t('common.select')}
              value={groupId}
              options={groups.filter(g => g.active).map(g => ({ value: String(g.id), label: g.labelPL }))}
              onChange={handleGroupChange}
            />

            <DictSelect
              id="bom-kind"
              label={t('bom.rodzaj')}
              placeholder={t('common.select')}
              value={kindId}
              options={kindOptions.map(k => ({ value: String(k.id), label: k.labelPL }))}
              onChange={handleKindChange}
              disabled={!groupId}
            />

            {groupType === 'OPERACYJNA' && kId > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label>{t('bom.operacje')}</Label>
                <div className="flex max-h-52 flex-col gap-2 overflow-y-auto rounded-md border p-2">
                  {opOptions.length === 0 ? (
                    <span className="text-sm text-muted-foreground">{t('bom.none')}</span>
                  ) : (
                    opOptions.map(dictOp => {
                      const selected = nodeOps.find(o => o.operationId === dictOp.id);
                      return (
                        <div key={dictOp.id} className="flex flex-col gap-1.5 border-b border-border/40 pb-2 last:border-0">
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={Boolean(selected)}
                              onCheckedChange={(checked) => toggleOp(dictOp.id, Boolean(checked))}
                            />
                            {dictOp.labelPL}
                          </label>
                          {selected && (
                            <div className="ml-6 flex flex-wrap items-center gap-2">
                              <Input
                                type="number"
                                step="0.01"
                                min={0}
                                className="w-28"
                                placeholder={t('bom.cena')}
                                value={selected.cena ? String(selected.cena) : ''}
                                onChange={(e) =>
                                  updateOp(dictOp.id, { cena: round2(Number(e.target.value) || 0) })
                                }
                              />
                              <Select
                                items={[
                                  { value: NONE_VALUE, label: t('bom.inHouse') },
                                  ...suppliers.map(s => ({ value: String(s.id), label: s.name })),
                                ]}
                                value={selected.supplierId !== null ? String(selected.supplierId) : NONE_VALUE}
                                onValueChange={(v) =>
                                  updateOp(dictOp.id, {
                                    supplierId: String(v) === NONE_VALUE ? null : Number(v),
                                  })
                                }
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue placeholder={t('bom.supplier')} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={NONE_VALUE}>{t('bom.inHouse')}</SelectItem>
                                  {suppliers.map(s => (
                                    <SelectItem key={s.id} value={String(s.id)}>
                                      {s.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setOpCompareIdx(nodeOps.findIndex(o => o.operationId === dictOp.id))
                                }
                              >
                                {t('bom.suppliers')}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {groupType === 'ZAKUPOWA' && kId > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label>{t('bom.preferredSuppliers')}</Label>
                {preferredForKind.length === 0 ? (
                  <p className="rounded-md border bg-muted/40 p-2 text-sm text-muted-foreground">
                    {t('bom.noPreferredSuppliers')}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1 rounded-md border p-2 text-sm">
                    {preferredForKind.map(o => (
                      <li key={o.supplierId ?? o.id} className="flex items-center justify-between gap-2">
                        <span>{o.supplierName || t('bom.none')}</span>
                        {o.isFinal && (
                          <Badge variant="secondary">{t('bom.defaultFinal')}</Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setNodeCompareOpen(true)}>
                  {t('bom.suppliers')}
                </Button>
              </div>
            )}

            <DictSelect
              id="bom-material"
              label={t('bom.material')}
              placeholder={t('common.select')}
              value={materialId}
              options={materialOptions}
              onChange={setMaterialId}
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bom-wymiary">{t('bom.wymiary')}</Label>
                <Input
                  id="bom-wymiary"
                  value={materialWymiary}
                  onChange={(e) => setMaterialWymiary(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bom-mat-cost">{t('bom.materialCost')}</Label>
                <Input
                  id="bom-mat-cost"
                  type="number"
                  step="0.01"
                  min={0}
                  value={materialCost}
                  onChange={(e) => setMaterialCost(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bom-manual">{t('bom.manualPrice')}</Label>
              <Input
                id="bom-manual"
                type="number"
                step="0.01"
                min={0}
                value={manualUnitCost}
                placeholder={formatPln(breakdown)}
                onChange={(e) => setManualUnitCost(e.target.value)}
              />
              {manualUnitCost.trim() !== '' && (
                <p className="text-xs text-muted-foreground">
                  {t('bom.manualBadge')} {formatPln(round2(Number(manualUnitCost) || 0))}
                  {' · '}
                  {t('bom.fromBreakdown')} {formatPln(breakdown)}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="bom-procesy"
                checked={procesySpecjalne}
                onCheckedChange={(checked) => setProcesySpecjalne(Boolean(checked))}
              />
              <Label htmlFor="bom-procesy">{t('bom.procesySpecjalne')}</Label>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bom-dodatkowe">{t('bom.dodatkowe')}</Label>
              <Input id="bom-dodatkowe" value={dodatkowe} onChange={(e) => setDodatkowe(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button disabled={!valid} onClick={handleSave}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SupplierCompare
        open={opCompareIdx !== null}
        onOpenChange={(o) => {
          if (!o) setOpCompareIdx(null);
        }}
        title={comparingOp ? (operations.find(o => o.id === comparingOp.operationId)?.labelPL ?? '') : ''}
        initialOffers={comparingOp?.supplierOffers ?? []}
        suppliers={suppliers}
        onApply={(offers) => {
          if (opCompareIdx === null) return;
          const op = nodeOps[opCompareIdx];
          if (!op) return;
          const finalOffer = offers.find(o => o.isFinal);
          updateOp(op.operationId, {
            supplierOffers: offers,
            cena: finalOffer ? finalOffer.cena : op.cena,
            supplierId: finalOffer ? finalOffer.supplierId : op.supplierId,
          });
          setOpCompareIdx(null);
        }}
      />

      <SupplierCompare
        open={nodeCompareOpen}
        onOpenChange={setNodeCompareOpen}
        title={nazwaOpis || t('bom.suppliers')}
        initialOffers={supplierOffers}
        suppliers={suppliers}
        onApply={(offers) => {
          setSupplierOffers(offers);
          setNodeCompareOpen(false);
        }}
      />
    </>
  );
}
