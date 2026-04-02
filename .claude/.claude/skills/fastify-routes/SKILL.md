---
name: fastify-routes
description: Fastify 라우트, 플러그인, 스키마 검증, 에러 처리 코드 패턴
---
# Fastify 라우트 코드 패턴

## 라우트 플러그인 구조
```typescript
// routes/projects/index.ts
import { FastifyPluginAsync } from 'fastify';
import { projectService } from '../../services/project.service.js';

const projectRoutes: FastifyPluginAsync = async (fastify) => {
  // 목록 조회
  fastify.get('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 20 },
        },
      },
      response: {
        200: { $ref: 'ProjectListResponse#' },
      },
    },
  }, async (request, reply) => {
    const { page, limit } = request.query as { page: number; limit: number };
    const result = await projectService.findAll(page, limit);
    return result;
  });

  // 단건 조회
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const project = await projectService.findById(request.params.id);
    if (!project) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: '프로젝트를 찾을 수 없습니다' },
      });
    }
    return project;
  });

  // 생성
  fastify.post<{ Body: CreateProjectDto }>('/', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'repoUrl'],
        properties: {
          name: { type: 'string', minLength: 1 },
          repoUrl: { type: 'string' },
          description: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const project = await projectService.create(request.session.userId, request.body);
    return reply.code(201).send(project);
  });
};

export default projectRoutes;
```

## 플러그인 등록
```typescript
// app.ts
import fastify from 'fastify';
import projectRoutes from './routes/projects/index.js';

const app = fastify({ logger: true });

// 라우트 등록 — prefix로 경로 지정
app.register(projectRoutes, { prefix: '/api/projects' });
```

## 인증 미들웨어 (preHandler)
```typescript
// middleware/auth.ts
import { FastifyRequest, FastifyReply } from 'fastify';

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  if (!request.session?.userId) {
    return reply.code(401).send({
      error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' },
    });
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply);
  if (request.session.role !== 'admin') {
    return reply.code(403).send({
      error: { code: 'FORBIDDEN', message: '관리자 권한이 필요합니다' },
    });
  }
}
```

## 에러 응답 형식 (통일)
```typescript
// 모든 에러 응답은 이 형식을 따른다
interface ErrorResponse {
  error: {
    code: string;   // 대문자_스네이크 (예: NOT_FOUND, UNAUTHORIZED)
    message: string; // 사용자에게 표시할 한글 메시지
  };
}
```

## 서비스 레이어 패턴
```typescript
// services/project.service.ts
import { prisma } from '../lib/prisma.js';

export const projectService = {
  async findAll(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.project.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.project.count(),
    ]);
    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async findById(id: string) {
    return prisma.project.findUnique({ where: { id } });
  },

  async create(userId: string, dto: CreateProjectDto) {
    return prisma.project.create({
      data: { ...dto, createdById: userId },
    });
  },
};
```

## 규칙
- 모든 주석은 한글로 작성
- 라우트 파일은 라우팅 + 스키마만, 비즈니스 로직은 서비스 레이어에 분리
- 에러 응답: `{ error: { code, message } }` 형식 통일
- 인증은 `request.session.userId`로 확인 (JWT 아님)
- 파일 60~100줄 초과 시 라우트/서비스/스키마 분리 검토
