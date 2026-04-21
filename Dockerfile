FROM node:22-alpine

WORKDIR /app

# 👇 necesario para prisma en build
ENV DATABASE_URL="postgresql://nuestra-esencia:Nuestra123@postgres:5432/nuestra-esencia"

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 5173

CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev -- --host"]
