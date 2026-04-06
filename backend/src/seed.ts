// 초기 관리자 계정 시드 데이터
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcrypt';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // 환경변수에서 관리자 초기 비밀번호 읽기 — 미설정 시 랜덤 생성
  const seedPassword = process.env.ADMIN_SEED_PASSWORD ?? require('crypto').randomBytes(16).toString('hex');
  const passwordHash = await bcrypt.hash(seedPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@nexus.com' },
    update: {},
    create: {
      name: '관리자',
      email: 'admin@nexus.com',
      passwordHash,
      role: 'admin',
    },
  });

  console.log('관리자 초기 비밀번호:', seedPassword, '(반드시 변경하세요)');

  console.log('시드 완료:', admin);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
