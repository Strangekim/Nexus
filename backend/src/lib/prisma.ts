// PrismaClient 싱글턴 인스턴스
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default prisma;
