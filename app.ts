import * as http from 'http';
import * as url from 'url';
import * as fs from 'fs';
import * as path from 'path';
import { IncomingMessage, ServerResponse } from 'http';
import { Convert } from './convert';
import { sendRes } from './module';

const convertedDir: string = path.join(__dirname, "converted");

const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
  const reqObj = url.parse(String(req.url), true);
  const filePath: string = reqObj.pathname as string;

  if (req.method === "POST" && filePath === "/exports") {
    let body: string = "";
    req.on("data", (chunk: string) => {
      body += chunk;
    });

    req.on("end", () => {
      const data = JSON.parse(body);
      const dirPath: string = data.dirPath;

      const instance: Convert = new Convert(dirPath);
      instance
        .convertAll()
        .then((data: { count: number; duration: number }) => {
          sendRes(res, 200, data, { "Content-Type": "application/json" });
        })
        .catch((error: Error) => {
          sendRes(res, 400, { error: error.message }, { "Content-Type": "application/json" });
        });
    });
  } else if (req.method === "GET" && filePath === "/files") {
    fs.readdir(convertedDir, (err, files: string[]) => {
      if (err) {
        sendRes(res, 500, { error: "server error" }, { "Content-Type": "application/json" });
      } else {
        sendRes(res, 200, files, { "Content-Type": "application/json" });
      }
    });
  } else if (req.method === "GET" && filePath.startsWith("/files/")) {
    const filename: string = filePath.slice(7);
    const json: string = path.join(convertedDir, filename);

    fs.readFile(json, (err, data: Buffer) => {
      if (err) {
        sendRes(res, 404, { error: "File not found" }, { "Content-Type": "application/json" });
      } else {
        sendRes(res, 200, data, { "Content-Type": "application/json" });
      }
    });
  } else if (req.method === "DELETE" && filePath.startsWith("/files/")) {
    const filename: string = filePath.slice(7);
    const json: string = path.join(convertedDir, filename);

    fs.unlink(json, (err) => {
      if (err) {
        sendRes(res, 404, { error: "Not found" }, { "Content-Type": "application/json" });
      } else {
        sendRes(res, 200, "Deleted", { "Content-Type": "application/json" });
      }
    });
  } else {
    sendRes(res, 404, "Not Found", { "Content-Type": "application/json" });
  }
});

const port: number = 8000;
server.listen(port, () => {
  console.log("Server running");
});
