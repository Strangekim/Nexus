// 인증 라우트 등록
import { FastifyPluginAsync } from 'fastify';
import loginRoute from './login.js';
import logoutRoute from './logout.js';
import meRoute from './me.js';
import settingsRoute from './settings.js';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(loginRoute);
  await fastify.register(logoutRoute);
  await fastify.register(meRoute);
  await fastify.register(settingsRoute);
};

export default authRoutes;
