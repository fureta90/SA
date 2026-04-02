import 'dotenv/config'
import { join } from 'path'
import { DataSource } from 'typeorm'

/**
 * DataSource standalone para TypeORM CLI (migration:generate, migration:run, etc.)
 * También es usado por run-migrations.ts en producción.
 *
 * __filename.endsWith('.ts') → corriendo con ts-node (desarrollo)
 * __filename.endsWith('.js') → corriendo desde dist/ compilado (producción)
 */
const isTsNode = __filename.endsWith('.ts')

export const AppDataSource = new DataSource({
  type: 'mssql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 1433,
  username: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'SpeechAnalytics',
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
  entities: isTsNode
    ? [join(__dirname, '../**/*.entity.ts')]
    : [join(__dirname, '../**/*.entity.js')],
  migrations: isTsNode
    ? [join(__dirname, '../migrations/*.ts')]
    : [join(__dirname, '../migrations/*.js')],
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 30000,
  },
})
