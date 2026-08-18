"use client";

import { useRef, useState, type FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  ADMIN_ROLES,
  ADMIN_ROLE_LABELS,
  createAdminUser,
  deleteAdminUser,
  updateAdminUserRole,
  type AdminRole,
  type AdminUserRecord,
} from "@/lib/settings";

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

// Пользователи админки и роли (docs/plan.md, пункт 21). Смена роли у существующего
// пользователя применяется сразу на onChange (как OrderStatusControl — единственное
// поле, менять его есть смысл поштучно), удаление — с подтверждением (как в
// ProductForm). Новый пользователь создаётся отдельной формой снизу — email/пароль/
// роль осмысленны только вместе, поэтому сохраняются одной кнопкой (как
// ReviewModerationControl). createAdminUser()/updateAdminUserRole()/deleteAdminUser()
// — заглушки без реального персиста, локальный список — источник правды для UI.
export function AdminUsersManager({ users: initialUsers }: AdminUsersManagerProps) {
  const [users, setUsers] = useState<AdminUserRecord[]>(initialUsers);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [newUser, setNewUser] = useState<NewUserForm>(emptyNewUser());
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const nextTempId = useRef(-1);

  async function handleRoleChange(id: number, role: AdminRole) {
    setSavingId(id);
    await updateAdminUserRole(id, role);
    setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, role } : user)));
    setSavingId(null);
  }

  async function handleDelete(user: AdminUserRecord) {
    if (!window.confirm(`Удалить пользователя «${user.email}»?`)) return;

    setSavingId(user.id);
    await deleteAdminUser(user.id);
    setUsers((prev) => prev.filter((item) => item.id !== user.id));
    setSavingId(null);
  }

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newUser.email.trim() || !newUser.password.trim()) {
      setCreateError("Заполните email и пароль");
      return;
    }
    if (users.some((user) => user.email === newUser.email.trim())) {
      setCreateError("Пользователь с таким email уже есть");
      return;
    }

    setCreateError(null);
    void submitCreate();
  }

  async function submitCreate() {
    setIsCreating(true);
    await createAdminUser(newUser);
    setUsers((prev) => [...prev, { id: nextTempId.current--, email: newUser.email.trim(), role: newUser.role }]);
    setNewUser(emptyNewUser());
    setIsCreating(false);
  }

  return (
    <div className="flex max-w-2xl flex-col gap-8">
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
