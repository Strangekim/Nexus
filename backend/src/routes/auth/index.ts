// 인증 라우트 등록
import { FastifyPluginAsync } from 'fastify';
import loginRoute from './login.js';
import logoutRoute from './logout.js';
import meRoute from './me.js';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(loginRoute);
  await fastify.register(logoutRoute);
  await fastify.register(meRoute);
};

export default authRoutes;
