export class DockerfileContent {
  public static prefix = `FROM node:24-alpine

ARG SANDBOX_NAME

RUN npm install -g pnpm@11

WORKDIR /bridge
COPY bridge .

WORKDIR /bridge/server
RUN pnpm install --prod`;

  public static suffix = `ENV SANDBOX_NAME=\${SANDBOX_NAME}
EXPOSE 4096
CMD ["node", "dist/main.js"]`;

  public static build(configuration: string): string {
    return `${this.prefix}\n${configuration}\n${this.suffix}`;
  }
}
