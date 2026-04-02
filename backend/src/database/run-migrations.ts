import 'dotenv/config'
import { DataSource } from 'typeorm'
import { AppDataSource } from './data-source'

/**
 * Crea la base de datos si no existe.
 * Se conecta a 'master' (siempre disponible) y ejecuta CREATE DATABASE condicional.
 * Necesario cuando cada cliente tiene su propio contenedor SQL Server.
 */
async function ensureDatabaseExists(): Promise<void> {
  const dbName = process.env.DB_NAME
  if (!dbName) throw new Error('DB_NAME no configurado')

  const masterDs = new DataSource({
    type: 'mssql',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 1433,
    username: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD,
    database: 'master',
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
      connectTimeout: 30000,
    },
  })

  await masterDs.initialize()
  // Sanitizar nombre para evitar SQL injection (solo letras, números y guiones bajos)
  const safeName = dbName.replace(/[^a-zA-Z0-9_]/g, '_')
  await masterDs.query(
    `IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'${safeName}')
     CREATE DATABASE [${safeName}]`
  )
  await masterDs.destroy()
  console.log(`[Migrations] Base de datos '${safeName}' verificada/creada.`)
}

async function runMigrations(): Promise<void> {
  console.log('[Migrations] Inicializando...')

  try {
    await ensureDatabaseExists()

    await AppDataSource.initialize()
    console.log(`[Migrations] Conectado a: ${process.env.DB_HOST}/${process.env.DB_NAME}`)

    const executed = await AppDataSource.runMigrations({ transaction: 'each' })

    if (executed.length === 0) {
      console.log('[Migrations] Sin migraciones pendientes. Base de datos actualizada.')
    } else {
      console.log(`[Migrations] Se ejecutaron ${executed.length} migración(es):`)
      executed.forEach((m) => console.log(`  ✓ ${m.name}`))
    }

    await AppDataSource.destroy()
    console.log('[Migrations] Completado.')
  } catch (error) {
    console.error('[Migrations] ERROR CRÍTICO - Abortando inicio de la aplicación:')
    console.error(error)
    process.exit(1)
  }
}

runMigrations()
