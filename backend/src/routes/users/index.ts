// 사용자 관리 라우트 — GET /api/users, POST /api/users (관리자 전용)
import { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcrypt';
import { requireAdmin } from '../../plugins/auth.js';
import { createHttpError } from '../../lib/errors.js';
import prisma from '../../lib/prisma.js';

/** 사용자 생성 요청 바디 */
interface CreateUserBody {
  name: string;
  email: string;
  password: string;
  role?: string;
  linuxUser?: string;
  authMode?: string;
}

/** 사용자 목록/생성 라우트 */
const usersIndexRoute: FastifyPluginAsync = async (fastify) => {
  // GET / — 전체 사용자 목록 (관리자 전용)
  fastify.get('/', {
    preHandler: [requireAdmin],
  }, async () => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        authMode: true,
        linuxUser: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return { users };
  });

  // POST / — 사용자 생성 (관리자 전용)
  fastify.post<{ Body: CreateUserBody }>('/', {
    preHandler: [requireAdmin],
    schema: {
      body: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          role: { type: 'string', enum: ['admin', 'member'] },
          linuxUser: { type: 'string', maxLength: 50 },
          authMode: { type: 'string', enum: ['subscription', 'api'] },
        },
      },
    },
  }, async (request, reply) => {
    const { name, email, password, role = 'member', linuxUser, authMode = 'subscription' } = request.body;

    // 이메일 중복 확인
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw createHttpError(409, '이미 사용 중인 이메일입니다');

    // 비밀번호 해싱
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, passwordHash, role, linuxUser, authMode },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        authMode: true,
        linuxUser: true,
        createdAt: true,
      },
    });

    return reply.code(201).send(user);
  });
};

export default usersIndexRoute;
