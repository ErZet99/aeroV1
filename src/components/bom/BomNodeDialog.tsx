import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as bomService from '@/api/bomService';
import {
  groupTypeOf,
  kindsForGroup,
  operationsForKind,
  preseedSupplierOffers,
  resetAfterGroupChange,
  resetAfterKindChange,
} from '@/services/cascadeService';
import type {
  BomNode,
  ComponentGroup,
  ComponentKind,
  ComponentKindSupplier,
  DictItem,
  Operation,
  Supplier,
  SupplierOffer,
} from '@/types/models';
import { Button } from '@/components/ui/button';
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

const NONE_VALUE = '0';

interface BomNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerType: 'rfq' | 'template';
  ownerId: number;
  parentId: number | null;
  node: BomNode | null;
  groups: ComponentGroup[];
  kinds: ComponentKind[];
  operations: Operation[];
  kindSuppliers: ComponentKindSupplier[];
  suppliers: Supplier[];
  materials: DictItem[];
  onSaved: () => void;
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
  ownerType,
  ownerId,
  parentId,
  node,
  groups,
  kinds,
  operations,
  kindSuppliers,
  suppliers,
  materials,
  onSaved,
}: BomNodeDialogProps) {
  const { t } = useTranslation();

  const [numerDetalu, setNumerDetalu] = useState('');
  const [ilosc, setIlosc] = useState('1');
  const [nazwaOpis, setNazwaOpis] = useState('');
  const [groupId, setGroupId] = useState('');
  const [kindId, setKindId] = useState('');
  const [operationIds, setOperationIds] = useState<number[]>([]);
  const [supplierOffers, setSupplierOffers] = useState<SupplierOffer[]>([]);
  const [materialId, setMaterialId] = useState(NONE_VALUE);
  const [materialWymiary, setMaterialWymiary] = useState('');
  const [procesySpecjalne, setProcesySpecjalne] = useState(false);
  const [dodatkowe, setDodatkowe] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (node) {
      setNumerDetalu(node.numerDetalu);
      setIlosc(String(node.ilosc));
      setNazwaOpis(node.nazwaOpis);
      setGroupId(String(node.groupId));
      setKindId(String(node.kindId));
      setOperationIds([...node.operationIds]);
      setSupplierOffers(JSON.parse(JSON.stringify(node.supplierOffers)));
      setMaterialId(node.materialId !== null ? String(node.materialId) : NONE_VALUE);
      setMaterialWymiary(node.materialWymiary);
      setProcesySpecjalne(node.procesySpecjalne);
      setDodatkowe(node.dodatkowe);
    } else {
      setNumerDetalu('');
      setIlosc('1');
      setNazwaOpis('');
      setGroupId(groups[0] ? String(groups[0].id) : '');
      setKindId('');
      setOperationIds([]);
      setSupplierOffers([]);
      setMaterialId(NONE_VALUE);
      setMaterialWymiary('');
      setProcesySpecjalne(false);
      setDodatkowe('');
    }
  }, [open, node, groups]);

  const gId = Number(groupId) || 0;
  const kId = Number(kindId) || 0;
  const groupType = groupTypeOf(groups, gId);
  const kindOptions = useMemo(() => kindsForGroup(kinds, gId), [kinds, gId]);
  const opOptions = useMemo(() => operationsForKind(operations, kId), [operations, kId]);

  function handleGroupChange(value: string) {
    setGroupId(value);
    const reset = resetAfterGroupChange();
    setKindId('');
    setOperationIds(reset.operationIds);
    setSupplierOffers([]);
  }

  function handleKindChange(value: string) {
    setKindId(value);
    setOperationIds(resetAfterKindChange().operationIds);
    const nextKindId = Number(value);
    const type = groupTypeOf(groups, gId);
    if (type === 'ZAKUPOWA') {
      setSupplierOffers(preseedSupplierOffers(kindSuppliers, suppliers, nextKindId));
    } else {
      setSupplierOffers([]);
    }
  }

  function toggleOp(opId: number, checked: boolean) {
    setOperationIds(ids => (checked ? [...ids, opId] : ids.filter(id => id !== opId)));
  }

  const valid =
    nazwaOpis.trim() !== '' &&
    groupId !== '' &&
    kindId !== '' &&
    Number(ilosc) >= 1;

  async function handleSave() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const common = {
        numerDetalu,
        ilosc: Number(ilosc),
        nazwaOpis: nazwaOpis.trim(),
        groupId: Number(groupId),
        kindId: Number(kindId),
        operationIds: groupType === 'OPERACYJNA' ? operationIds : [],
        materialId: materialId === NONE_VALUE ? null : Number(materialId),
        materialWymiary,
        procesySpecjalne,
        dodatkowe,
      };
      if (node) {
        await bomService.updateNode(node.id, {
          ...common,
          ...(groupType === 'ZAKUPOWA' && supplierOffers.length > 0
            ? { supplierOffers }
            : {}),
        });
        if (groupType === 'ZAKUPOWA' && supplierOffers.length > 0) {
          await bomService.setSupplierOffers(node.id, supplierOffers);
        }
      } else {
        const created = await bomService.addNode({
          ownerType,
          ownerId,
          parentId,
          ...common,
          supplierOffers: groupType === 'ZAKUPOWA' ? supplierOffers : [],
        });
        if (groupType === 'ZAKUPOWA' && supplierOffers.some(o => o.isFinal)) {
          await bomService.setSupplierOffers(created.id, supplierOffers);
        }
      }
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  const materialOptions = [
    { value: NONE_VALUE, label: t('bom.none') },
    ...materials.map(m => ({ value: String(m.id), label: m.labelPL })),
  ];

  return (
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
              <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto rounded-md border p-2">
                {opOptions.length === 0 ? (
                  <span className="text-sm text-muted-foreground">{t('bom.none')}</span>
                ) : (
                  opOptions.map(op => (
                    <label key={op.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={operationIds.includes(op.id)}
                        onCheckedChange={(checked) => toggleOp(op.id, Boolean(checked))}
                      />
                      {op.labelPL}
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {groupType === 'ZAKUPOWA' && supplierOffers.length > 0 && (
            <div className="rounded-md border bg-muted/40 p-2 text-sm text-muted-foreground">
              {t('bom.preferredSuppliersHint', { count: supplierOffers.length })}
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bom-wymiary">{t('bom.wymiary')}</Label>
            <Input
              id="bom-wymiary"
              value={materialWymiary}
              onChange={(e) => setMaterialWymiary(e.target.value)}
            />
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
          <Button disabled={!valid || saving} onClick={() => void handleSave()}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
