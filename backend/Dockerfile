# ./backend/Dockerfile

FROM node:20-alpine

WORKDIR /usr/src/app

# Instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar todo el código
COPY . .

# Compilar TypeScript
RUN npm run build

# Copiar script de espera SQL Server
COPY wait-for-sqlserver.sh /usr/src/app/wait-for-sqlserver.sh
RUN chmod +x /usr/src/app/wait-for-sqlserver.sh

# Ejecutar backend (espera a SQL Server)
CMD ["sh", "/usr/src/app/wait-for-sqlserver.sh"]
