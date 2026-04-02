// 사용자 관리 TanStack Query 훅 — 목록/상세 조회, 생성/수정/삭제 mutation
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { User } from '@/types/user';

/** 사용자 목록 응답 */
interface UsersResponse {
  users: User[];
}

/** 사용자 생성 요청 */
export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'member';
  linuxUser?: string;
  authMode?: 'subscription' | 'api';
}

/** 사용자 수정 요청 */
export interface UpdateUserInput {
  name?: string;
  role?: 'admin' | 'member';
  authMode?: 'subscription' | 'api';
  linuxUser?: string;
  newPassword?: string;
}

/** 쿼리 키 */
export const USERS_KEY = ['users'] as const;

// ─── API 함수 ────────────────────────────────────────────────────────────────

async function fetchUsers(): Promise<User[]> {
  const res = await apiFetch<UsersResponse>('/api/users');
  return res.users;
}

async function fetchUser(id: string): Promise<User> {
  return apiFetch<User>(`/api/users/${id}`);
}

async function createUser(data: CreateUserInput): Promise<User> {
  return apiFetch<User>('/api/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

async function updateUser(id: string, data: UpdateUserInput): Promise<User> {
  return apiFetch<User>(`/api/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

async function deleteUser(id: string): Promise<void> {
  await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
}

// ─── 훅 ──────────────────────────────────────────────────────────────────────

/** 사용자 목록 조회 훅 */
export function useUsers() {
  return useQuery({
    queryKey: USERS_KEY,
    queryFn: fetchUsers,
    staleTime: 60_000,
  });
}

/** 사용자 상세 조회 훅 */
export function useUser(id: string) {
  return useQuery({
    queryKey: [...USERS_KEY, id],
    queryFn: () => fetchUser(id),
    enabled: !!id,
  });
}

/** 사용자 생성 mutation */
export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

/** 사용자 수정 mutation */
export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) => updateUser(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

/** 사용자 삭제 mutation */
export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  });
}
