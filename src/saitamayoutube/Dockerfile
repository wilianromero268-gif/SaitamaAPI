FROM node:22-bookworm-slim

ENV NODE_ENV=production
ENV PORT=8080

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ca-certificates curl ffmpeg \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fL \
    https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp \
    && chmod +x /usr/local/bin/yt-dlp

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY server.js ./

EXPOSE 8080

CMD ["npm", "start"]
