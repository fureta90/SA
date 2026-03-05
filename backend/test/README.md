# Tests E2E

Los tests e2e están configurados para ejecutarse en un entorno dockerizado donde el hostname `sqlserver` es accesible.

## Ejecutar tests dentro del contenedor Docker

Para ejecutar los tests e2e, deben ejecutarse dentro del contenedor Docker donde el hostname `sqlserver` es accesible:

```bash
# Desde el directorio raíz del proyecto
docker exec -it correos-backend npm run test:e2e

# O usando el script npm
npm run test:e2e:docker
```

## Ejecutar tests manualmente

Si necesitas ejecutar los tests manualmente dentro del contenedor:

```bash
# Entrar al contenedor
docker exec -it correos-backend sh

# Dentro del contenedor, ejecutar los tests
npm run test:e2e
```

## Notas

- Los tests requieren que la base de datos SQL Server esté corriendo y accesible con el hostname `sqlserver`
- Los tests tienen un timeout de 30 segundos para permitir que las conexiones a la BD se establezcan
- Los tests crean y eliminan datos de prueba automáticamente
