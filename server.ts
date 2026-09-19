import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { attachRealtimeServer } from "./src/lib/realtime/server";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "/", true);
    handle(req, res, parsedUrl);
  });

  attachRealtimeServer(httpServer);

  httpServer.listen(port, hostname, () => {
    // eslint-disable-next-line no-console
    console.log(`> Operação Catarse rodando em http://${hostname}:${port}`);
  });
});
