import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as templateService from '@/api/templateService';
import type { Template } from '@/types/models';
import { useTabsStore } from '@/stores/tabsStore';
import { handleRowClick } from '@/lib/rowClick';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function TemplateList() {
  const { t } = useTranslation();
  const openTab = useTabsStore(s => s.openTab);
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    void (async () => {
      setTemplates(await templateService.list());
    })();
  }, []);

  return (
    <div className="flex flex-col gap-3 p-4">
      <h2 className="text-lg font-semibold">{t('sidebar.templates')}</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('templates.name')}</TableHead>
            <TableHead>{t('templates.createdAt')}</TableHead>
            <TableHead>{t('templates.updatedAt')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map(template => (
            <TableRow
              key={template.id}
              className="cursor-pointer"
              onClick={(e) =>
                handleRowClick(e, () =>
                  openTab({
                    type: 'bom',
                    entityId: template.id,
                    ownerType: 'template',
                    title: template.name,
                  })
                )
              }
            >
              <TableCell>
                <span className="text-primary underline-offset-2 hover:underline">
                  {template.name}
                </span>
              </TableCell>
              <TableCell>{template.createdAt.split('T')[0]}</TableCell>
              <TableCell>{template.updatedAt.split('T')[0]}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
