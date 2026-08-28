"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ADMIN_ROLES, ADMIN_ROLE_LABELS, type AdminRole, type AdminUserRecord } from "@/lib/adminRoles";
import {
  createAdminUser,
  deleteAdminUser,
  updateAdminUserRole,
} from "@/lib/settingsAdminApi";

interface AdminUsersManagerProps {
  users: AdminUserRecord[];
}

interface NewUserForm {
  email: string;
  password: string;
  role: AdminRole;
}

function emptyNewUser(): NewUserForm {
  return { email: "", password: "", role: "ORDER_MANAGER" };
}

// Пользователи админки и роли (docs/plan.md, пункт 21). Источник правды — сервер:
// каждая мутация идёт в /api/admin-users (проверка сессии ADMIN, guard последнего
// ADMIN, guard «сам себя» — в роутах), при успехе делаем router.refresh(), при
// ошибке показываем текст с сервера и НЕ трогаем список. Смена роли применяется
// сразу на onChange (как OrderStatusControl), удаление — с подтверждением.
export function AdminUsersManager({ users }: AdminUsersManagerProps) {
  const router = useRouter();
  const [savingId, setSavingId] = useState<number | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState<NewUserForm>(emptyNewUser());
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleRoleChange(id: number, role: AdminRole) {
    setSavingId(id);
    setRowError(null);
    const result = await updateAdminUserRole(id, role);
    setSavingId(null);
    if (!result.ok) {
      setRowError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleDelete(user: AdminUserRecord) {
    if (!window.confirm(`Удалить пользователя «${user.email}»?`)) return;

    setSavingId(user.id);
    setRowError(null);
    const result = await deleteAdminUser(user.id);
    setSavingId(null);
    if (!result.ok) {
      setRowError(result.error);
      return;
    }
    router.refresh();
  }

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newUser.email.trim() || !newUser.password.trim()) {
      setCreateError("Заполните email и пароль");
      return;
    }
    if (newUser.password.length < 8) {
      setCreateError("Пароль минимум 8 символов");
      return;
    }

    setCreateError(null);
    void submitCreate();
  }

  async function submitCreate() {
    setIsCreating(true);
    const result = await createAdminUser({ ...newUser, email: newUser.email.trim() });
    setIsCreating(false);
    if (!result.ok) {
      setCreateError(result.error);
      return;
    }
    setNewUser(emptyNewUser());
    router.refresh();
  }

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      {rowError && (
        <p className="font-venuscom text-caption font-semibold text-red-600">{rowError}</p>
      )}

      {users.length === 0 ? (
        <p className="font-venuscom text-body-sm text-black-olive/70">Пользователей пока нет.</p>
      ) : (
        <div className="overflow-x-auto bg-warm-cream shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead>
              <tr className="border-b border-sage-mist">
                {["Email", "Роль", ""].map((heading) => (
                  <th
                    key={heading}
                    className="whitespace-nowrap px-[15px] py-3 font-venuscom text-caption uppercase text-black-olive/60"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-sage-mist last:border-0">
                  <td className="whitespace-nowrap px-[15px] py-3 font-venuscom text-body-sm text-black-olive">
                    {user.email}
                  </td>
                  <td className="whitespace-nowrap px-[15px] py-3">
                    <div className="relative inline-block">
                      <select
                        value={user.role}
                        disabled={savingId === user.id}
                        onChange={(event) => void handleRoleChange(user.id, event.target.value as AdminRole)}
                        className="peer appearance-none rounded-sm border border-sage-mist bg-warm-cream py-2 pl-3 pr-8 font-venuscom text-body-sm text-black-olive focus:border-lemon-zest focus:outline-none disabled:opacity-60"
                      >
                        {ADMIN_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {ADMIN_ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                      <FontAwesomeIcon
                        icon={faChevronDown}
                        className="pointer-events-none absolute right-2.5 top-1/2 size-3 -translate-y-1/2 text-black-olive/60 peer-disabled:opacity-60"
                      />
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-[15px] py-3">
                    <button
                      type="button"
                      disabled={savingId === user.id}
                      onClick={() => void handleDelete(user)}
                      className="font-venuscom text-caption uppercase text-red-600 hover:underline disabled:opacity-60"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4 border-t border-sage-mist pt-6">
        <h2 className="font-venuscom text-subheading uppercase tracking-[0.02em] text-forest-ink">
          Добавить пользователя
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="newUserEmail" className="font-venuscom text-caption text-black-olive/70">
              Email
            </label>
            <Input
              id="newUserEmail"
              type="email"
              value={newUser.email}
              onChange={(event) => {
                setNewUser((prev) => ({ ...prev, email: event.target.value }));
                setCreateError(null);
              }}
              placeholder="manager@example.com"
              className="mt-1"
            />
          </div>
          <div>
            <label htmlFor="newUserPassword" className="font-venuscom text-caption text-black-olive/70">
              Пароль
            </label>
            <Input
              id="newUserPassword"
              type="password"
              value={newUser.password}
              onChange={(event) => {
                setNewUser((prev) => ({ ...prev, password: event.target.value }));
                setCreateError(null);
              }}
              className="mt-1"
            />
          </div>
          <div>
            <label htmlFor="newUserRole" className="font-venuscom text-caption text-black-olive/70">
              Роль
            </label>
            <div className="relative mt-1">
              <select
                id="newUserRole"
                value={newUser.role}
                onChange={(event) => setNewUser((prev) => ({ ...prev, role: event.target.value as AdminRole }))}
                className="w-full appearance-none rounded-sm border border-sage-mist bg-warm-cream py-3 pl-4 pr-8 font-venuscom text-body-sm text-black-olive focus:border-lemon-zest focus:outline-none"
              >
                {ADMIN_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ADMIN_ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
              <FontAwesomeIcon
                icon={faChevronDown}
                className="pointer-events-none absolute right-2.5 top-1/2 size-3 -translate-y-1/2 text-black-olive/60"
              />
            </div>
          </div>
        </div>

        {createError && <p className="font-venuscom text-caption font-semibold text-red-600">{createError}</p>}

        <Button type="submit" disabled={isCreating} className="self-start">
          {isCreating ? "Добавляем…" : "Добавить пользователя"}
        </Button>
      </form>
    </div>
  );
}
