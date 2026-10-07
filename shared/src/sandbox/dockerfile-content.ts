import { fnv1a } from '@aibindkit/core';

export class DockerfileContent {
  public static prefix = `FROM node:24-alpine

ARG SANDBOX_NAME

RUN npm install -g pnpm@12

WORKDIR /bridge
COPY bridge .
`;

  public static suffix = `USER node

RUN mkdir -p /home/node/.npm-global/lib

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=\${NPM_CONFIG_PREFIX}/bin:\${PATH}

ENV SANDBOX_NAME=\${SANDBOX_NAME}
EXPOSE 4096
CMD ["node", "/bridge/server/index.cjs"]`;

  public static templateHash = fnv1a([this.prefix, this.suffix]);

  public static build(configuration: string): string {
    return `${this.prefix}\n${configuration}\n${this.suffix}`;
  }
}
