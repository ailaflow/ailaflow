FROM node:24-alpine

ARG INSTANCE_ID

WORKDIR /${INSTANCE_ID}
COPY ./${INSTANCE_ID} ./${INSTANCE_ID}

WORKDIR /bridge
COPY ./bridge ./

WORKDIR /bridge/server
RUN npm install --omit=dev

ENV INSTANCE_ID=${INSTANCE_ID}
EXPOSE 4096
CMD ["node", "src/main.mjs"]
