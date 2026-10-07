import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

type ExtendedPrismaClient = ReturnType<typeof createExtendedClient>;

const globalForPrisma = global as unknown as {
  prisma: ExtendedPrismaClient;
  pool: Pool;
};

// 소프트 삭제를 적용할 모델 목록 (프로젝트마다 조정)
const SOFT_DELETE_MODELS = ['User', 'RefreshToken'] as const;

const parseDbUrl = (url: string) => {
  const { hostname, port, username, password, pathname } = new URL(url);
  return {
    host: hostname,
    port: +port || 5432,
    user: username,
    password,
    database: pathname.slice(1),
    ssl: false,
  };
};

const sanitize = (data: any): any => {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitize);
  const { deleted_at, ...rest } = data;
  return { ...rest };
};

const withSoftDelete = (model: string, args: any) =>
  SOFT_DELETE_MODELS.includes(model as any)
    ? { ...args, where: { ...args?.where, deleted_at: null } }
    : args;

const toModelName = (model: string) =>
  model.charAt(0).toLowerCase() + model.slice(1);

const createExtendedClient = (base: PrismaClient) =>
  base.$extends({
    query: {
      $allModels: {
        async findFirst({ model, args, query }) {
          return sanitize(await query(withSoftDelete(model, args)));
        },
        async findMany({ model, args, query }) {
          return sanitize(await query(withSoftDelete(model, args)));
        },
        async findUnique({ model, args, query }) {
          return sanitize(await query(withSoftDelete(model, args)));
        },
        async count({ model, args, query }) {
          return query(withSoftDelete(model, args));
        },
        async aggregate({ model, args, query }) {
          return query(withSoftDelete(model, args));
        },
        async groupBy({ model, args, query }) {
          return query(withSoftDelete(model, args));
        },
        async create({ args, query }) {
          return sanitize(await query(args));
        },
        async update({ args, query }) {
          return sanitize(await query(args));
        },
        async upsert({ args, query }) {
          return sanitize(await query(args));
        },
        async delete({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model as any)) {
            return sanitize(
              await (base as any)[toModelName(model)].update({
                ...args,
                data: { deleted_at: new Date() },
              }),
            );
          }
          return sanitize(await query(args));
        },
        async deleteMany({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model as any)) {
            return (base as any)[toModelName(model)].updateMany({
              ...args,
              data: { deleted_at: new Date() },
            });
          }
          return query(args);
        },
      },
    },
  });

let _pool: Pool | null = null;
let _prisma: ExtendedPrismaClient | null = null;

// DATABASE_URL은 반드시 환경변수로 주입한다. 아래 fallback은 로컬 개발 편의용.
const getPool = () =>
  (_pool ??= globalForPrisma.pool ??= new Pool(
    parseDbUrl(
      process.env.DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/app',
    ),
  ));

const getPrisma = () =>
  (_prisma ??= globalForPrisma.prisma ??= createExtendedClient(
    new PrismaClient({
      adapter: new PrismaPg(getPool()),
      log:
        process.env.NODE_ENV !== 'production'
          ? ['query', 'error', 'warn']
          : ['error'],
    }),
  ));

// lazy 초기화: import 시점이 아니라 최초 접근 시 커넥션 생성
export const prisma = new Proxy({} as ExtendedPrismaClient, {
  get: (_, prop) => (getPrisma() as any)[prop],
});

export const initDatabase = async () => {
  await getPrisma().$connect();
  console.log('Database connected successfully.');
};
