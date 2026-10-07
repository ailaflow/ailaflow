export class DockerfileContent {
  public static prefix = `FROM node:24-alpine

ARG SANDBOX_NAME

RUN npm install -g pnpm@12

WORKDIR /bridge
COPY bridge .
`;

  public static suffix = `ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=\${NPM_CONFIG_PREFIX}/bin:\${PATH}

USER node

ENV SANDBOX_NAME=\${SANDBOX_NAME}
EXPOSE 4096
CMD ["node", "/bridge/server/index.cjs"]`;

  public static build(configuration: string): string {
    return `${this.prefix}\n${configuration}\n${this.suffix}`;
  }
}
