// 로그인 라우트 — POST /api/auth/login
import { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcrypt';
import prisma from '../../lib/prisma.js';

// 요청 body 타입
interface LoginBody {
  email: string;
  password: string;
}

const loginRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: LoginBody }>(
    '/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      // 이메일로 사용자 조회
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          passwordHash: true,
        },
      });

      if (!user) {
        return reply.code(401).send({
          error: { code: 'INVALID_CREDENTIALS', message: '이메일 또는 비밀번호가 올바르지 않습니다' },
        });
      }

      // 비밀번호 검증
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return reply.code(401).send({
          error: { code: 'INVALID_CREDENTIALS', message: '이메일 또는 비밀번호가 올바르지 않습니다' },
        });
      }

      // 세션에 userId 저장
      request.session.set('userId', user.id);

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    },
  );
};

export default loginRoute;
