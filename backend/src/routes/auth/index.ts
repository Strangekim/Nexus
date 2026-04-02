// 인증 라우트 등록
import { FastifyPluginAsync } from 'fastify';
import loginRoute from './login.js';
import logoutRoute from './logout.js';
import meRoute from './me.js';
import settingsRoute from './settings.js';
import claudeOAuthRoute from './claude-oauth.js';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(loginRoute);
  await fastify.register(logoutRoute);
  await fastify.register(meRoute);
  await fastify.register(settingsRoute);
  // Claude OAuth PKCE 인증 라우트
  await fastify.register(claudeOAuthRoute);
};

export default authRoutes;
