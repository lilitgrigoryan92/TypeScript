import http from 'http';
import url from 'url';
import path from 'path';
import os from 'os';
import fs from 'fs';
import csv from 'csv-parser';
import { IncomingMessage, ServerResponse } from "http"

const num: number = os.cpus().length;
const convertedDir: string = path.join(__dirname, "converted");

interface Data {
  [key: string]: string;
}

class Convert {
  dirPath: string;
  workerCount: number;

  constructor(dirPath: string) {
    this.dirPath = dirPath;
    this.workerCount = Math.min(10, num);
  }

  convertCsv(input: string, output: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const results: Data[] = [];

      fs.createReadStream(input)
        .pipe(csv())
        .on("data", (data: Data) => {
          results.push(data);
        })
        .on("end", () => {
          fs.writeFile(output, JSON.stringify(results, undefined, 2), (error) => {
            if (error) {
              reject(error);
            } else {
              resolve(results.length);
            }
          });
        });
    });
  }

  convertAll(): Promise<{ count: number; duration: number }> {
    return new Promise((resolve, reject) => {
      if (!this.dirPath) {
        reject(new Error("No directory specified."));
        return;
      }

      fs.readdir(this.dirPath, (err, files: string[]) => {
        if (err) {
          reject(err);
          return;
        }

        const csvFiles: string[] = files.filter((file: string) => file.endsWith(".csv"));

        if (csvFiles.length === 0) {
          reject(new Error("No CSV files found in the directory."));
          return;
        }

        if (!fs.existsSync(convertedDir)) {
          fs.mkdirSync(convertedDir);
        }

        const start: number = Date.now();
        let count: number = 0;

        const workers: Promise<void>[] = csvFiles.map((file: string) => {
          const input: string = path.join(this.dirPath, file);
          const output: string = path.join(convertedDir, file.replace(".csv", ".json"));

          return new Promise<void>((resolve, reject) => {
            this.convertCsv(input, output)
              .then((result) => {
                count += result;
                resolve();
              })
              .catch((error: Error) => {
                reject(error);
              });
          });
        });

        Promise.all(workers)
          .then(() => {
            const end: number = Date.now();
            const duration: number = end - start;
            resolve({ count, duration });
          })
          .catch((error: Error) => {
            reject(error);
          });
      });
    });
  }
}

function sendRes(res: ServerResponse, status: number, data:{}, headers?:{}) {
  res.writeHead(status, headers);
  res.end(JSON.stringify(data));
  
}

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
