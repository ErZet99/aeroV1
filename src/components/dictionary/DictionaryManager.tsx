import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as dictionaryService from '@/api/dictionaryService';
import type { DictEntity } from '@/api/dictionaryService';
import { useAuthStore } from '@/stores/authStore';
import { dictionaryConfig } from './dictionaryConfig';
import type { DictColumn } from './dictionaryConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Row = Record<string, unknown> & { id: number };

interface DictionaryManagerProps {
  dictKey: DictEntity;
}

function defaultForm(columns: DictColumn[], rowCount: number): Record<string, unknown> {
  const form: Record<string, unknown> = {};
  columns.forEach(col => {
    if (col.type === 'boolean') form[col.field] = col.field === 'active';
    else if (col.type === 'number') form[col.field] = col.field === 'sort' ? rowCount + 1 : 0;
    else form[col.field] = '';
  });
  return form;
}

export function DictionaryManager({ dictKey }: DictionaryManagerProps) {
  const { t } = useTranslation();
  const role = useAuthStore(s => s.currentUser.role);
  const config = dictionaryConfig[dictKey];
  const canEdit = role === 'SUPER_ADMIN' || !!config.editableByAll;

  const [rows, setRows] = useState<Row[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});

  const load = useCallback(async () => {
    const data = await dictionaryService.list(config.collection);
    setRows(data as unknown as Row[]);
  }, [config.collection]);

  useEffect(() => {
    void load();
  }, [load]);

  function openAdd() {
    setEditingId(null);
    setForm(defaultForm(config.columns, rows.length));
    setDialogOpen(true);
  }

  function openEdit(row: Row) {
    setEditingId(row.id);
    const values: Record<string, unknown> = {};
    config.columns.forEach(col => {
      values[col.field] = row[col.field];
    });
    setForm(values);
    setDialogOpen(true);
  }

  async function handleSave() {
    const payload: Record<string, unknown> = {};
    config.columns.forEach(col => {
      let value = form[col.field];
      if (col.type === 'number') value = Number(value) || 0;
      payload[col.field] = value;
    });

    if (editingId !== null) {
      await dictionaryService.update(config.collection, editingId, payload as never);
    } else {
      await dictionaryService.create(config.collection, payload as never);
    }
    setDialogOpen(false);
    await load();
  }

  async function handleDelete(row: Row) {
    if (!window.confirm(t('common.confirmDelete'))) return;
    await dictionaryService.remove(config.collection, row.id);
    await load();
  }

  function renderCell(row: Row, col: DictColumn) {
    const value = row[col.field];
    if (col.type === 'boolean') return value ? t('common.yes') : t('common.no');
    return String(value ?? '');
  }

  function renderFormField(col: DictColumn) {
    if (col.type === 'boolean') {
      return (
        <div key={col.field} className="flex items-center gap-2">
          <Checkbox
            id={`field-${col.field}`}
            checked={Boolean(form[col.field])}
            onCheckedChange={(checked) => setForm(f => ({ ...f, [col.field]: Boolean(checked) }))}
          />
          <Label htmlFor={`field-${col.field}`}>{t(col.labelKey)}</Label>
        </div>
      );
    }

    const inputType = col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text';
    return (
      <div key={col.field} className="flex flex-col gap-1.5">
        <Label htmlFor={`field-${col.field}`}>{t(col.labelKey)}</Label>
        <Input
          id={`field-${col.field}`}
          type={inputType}
          value={String(form[col.field] ?? '')}
          onChange={(e) => setForm(f => ({ ...f, [col.field]: e.target.value }))}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t(`dict.${dictKey}`)}</h2>
        {canEdit && (
          <Button onClick={openAdd}>{t('common.add')}</Button>
        )}
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              {config.columns.map(col => (
                <TableHead key={col.field}>{t(col.labelKey)}</TableHead>
              ))}
              {canEdit && <TableHead>{t('common.actions')}</TableHead>}
            </TableRow>
          </TableHeader>
        <TableBody>
          {rows.map(row => (
            <TableRow key={row.id}>
              {config.columns.map(col => (
                <TableCell key={col.field}>{renderCell(row, col)}</TableCell>
              ))}
              {canEdit && (
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
                      {t('common.edit')}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => void handleDelete(row)}>
                      {t('common.delete')}
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId !== null ? t('dialog.editTitle') : t('dialog.addTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {config.columns.map(col => renderFormField(col))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handleSave()}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
