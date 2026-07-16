FROM node:20-alpine

WORKDIR /app

COPY build.js server.js voxelcraft.html voxelcraft-singleplayer.html ./

EXPOSE 8000

# build.js reads FIREBASE_* from the environment (passed in via
# docker-compose) and writes dist/index.html; server.js then serves dist/.
CMD ["sh", "-c", "node build.js && node server.js"]
