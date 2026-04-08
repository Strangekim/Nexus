// 오디오 에셋 API 라우트
import { FastifyPluginAsync } from 'fastify';
import {
  searchAudio,
  getCategories,
  getAudioById,
  listAudio,
  getAudioStreamUrl,
  getAudioDownloadUrl,
  getAudioBatch,
  getAudioStats,
} from '../../services/audio.service.js';

const audioRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/audio/search — 멀티모달 유사도 검색
  app.post('/search', async (request, reply) => {
    const { query, modality, mimeType, filters, limit } = request.body as {
      query: string;
      modality: 'text' | 'image' | 'video';
      mimeType?: string;
      filters?: { major?: string; mid?: string; sub?: string };
      limit?: number;
    };

    if (!query || !modality) {
      return reply.status(400).send({
        error: { code: 'INVALID_REQUEST', message: 'query와 modality는 필수입니다' },
      });
    }

    // 텍스트 검색: query는 문자열 그대로
    // 이미지/비디오 검색: query는 base64 인코딩된 문자열
    let queryInput: string | Buffer = query;
    if (modality === 'image' || modality === 'video') {
      queryInput = Buffer.from(query, 'base64');
    }

    const results = await searchAudio({
      query: queryInput,
      modality,
      mimeType,
      filters,
      limit,
    });

    return reply.send({ results });
  });

  // GET /api/audio/categories — 분류 트리 조회
  app.get('/categories', async (_request, reply) => {
    const categories = await getCategories();
    return reply.send({ categories });
  });

  // GET /api/audio/:id — 단건 조회 + presigned URL
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const asset = await getAudioById(id);
    if (!asset) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: '오디오 에셋을 찾을 수 없습니다' },
      });
    }
    return reply.send({ asset });
  });

  // GET /api/audio/:id/stream — 스트리밍용 presigned URL
  app.get('/:id/stream', async (request, reply) => {
    const { id } = request.params as { id: string };
    const url = await getAudioStreamUrl(id);
    if (!url) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: '오디오 에셋을 찾을 수 없습니다' },
      });
    }
    return reply.send({ url });
  });

  // GET /api/audio/:id/download — 다운로드용 presigned URL
  app.get('/:id/download', async (request, reply) => {
    const { id } = request.params as { id: string };
    const url = await getAudioDownloadUrl(id);
    if (!url) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: '오디오 에셋을 찾을 수 없습니다' },
      });
    }
    return reply.send({ url });
  });

  // POST /api/audio/batch — 복수 에셋 일괄 조회
  app.post('/batch', async (request, reply) => {
    const { ids } = request.body as { ids: string[] };
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return reply.status(400).send({
        error: { code: 'INVALID_REQUEST', message: 'ids 배열이 필요합니다' },
      });
    }
    if (ids.length > 100) {
      return reply.status(400).send({
        error: { code: 'INVALID_REQUEST', message: '한 번에 최대 100개까지 조회 가능합니다' },
      });
    }
    const assets = await getAudioBatch(ids);
    return reply.send({ assets });
  });

  // GET /api/audio/stats — 라이브러리 통계
  app.get('/stats', async (_request, reply) => {
    const stats = await getAudioStats();
    return reply.send({ stats });
  });

  // GET /api/audio — 카테고리 필터 목록
  app.get('/', async (request, reply) => {
    const { major, mid, sub, page, limit } = request.query as {
      major?: string;
      mid?: string;
      sub?: string;
      page?: string;
      limit?: string;
    };

    const result = await listAudio({
      major,
      mid,
      sub,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return reply.send(result);
  });
};

export default audioRoutes;
