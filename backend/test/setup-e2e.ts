// Setup file para tests e2e
import { webcrypto } from 'crypto';

// Polyfill para crypto si es necesario
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = webcrypto as Crypto;
}

// Aumentar timeouts para tests e2e que requieren conexión a BD
jest.setTimeout(30000); // 30 segundos

// Las variables de entorno (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT) 
// se toman del .env o pueden ser sobrescritas con variables de entorno
// El hostname 'sqlserver' es correcto para entornos dockerizados
