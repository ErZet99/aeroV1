import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import type { Role } from '@/types/enums';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ROLES: Role[] = ['SUPER_ADMIN', 'KIEROWNIK', 'PRACOWNIK'];

export function RoleSwitcher() {
  const { t } = useTranslation();
  const currentUser = useAuthStore(s => s.currentUser);
  const setRole = useAuthStore(s => s.setRole);

  const items = ROLES.map(role => ({ value: role, label: t(`roles.${role}`) }));

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">
        {t('sidebar.role')}: {currentUser.firstName} {currentUser.lastName}
      </span>
      <Select
        items={items}
        value={currentUser.role}
        onValueChange={(value) => setRole(value as Role)}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map(item => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
