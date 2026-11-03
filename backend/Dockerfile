FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node server.js ./
RUN mkdir -p /app/data && chown node:node /app/data

USER node

EXPOSE 5000

CMD ["node", "server.js"]
