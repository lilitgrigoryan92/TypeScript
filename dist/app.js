"use strict";
const http = require("http");
const url = require("url");
const path = require("path");
const os = require("os");
const fs = require("fs");
const csv = require("csv-parser");
const num = os.cpus().length;
const convertedDir = path.join(__dirname, "converted");
class Convert {
    constructor(dirPath) {
        this.dirPath = dirPath;
        this.workerCount = Math.min(10, num);
    }
    convertCsv(input, output) {
        return new Promise((resolve, reject) => {
            const results = [];
            fs.createReadStream(input)
                .pipe(csv())
                .on("data", (data) => {
                results.push(data);
            })
                .on("end", () => {
                fs.writeFile(output, JSON.stringify(results, undefined, 2), (error) => {
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve(results.length);
                    }
                });
            });
        });
    }
    convertAll() {
        return new Promise((resolve, reject) => {
            if (!this.dirPath) {
                reject(new Error("No directory specified."));
                return;
            }
            fs.readdir(this.dirPath, (err, files) => {
                if (err) {
                    reject(err);
                    return;
                }
                const csvFiles = files.filter((file) => file.endsWith(".csv"));
                if (csvFiles.length === 0) {
                    reject(new Error("No CSV files found in the directory."));
                    return;
                }
                if (!fs.existsSync(convertedDir)) {
                    fs.mkdirSync(convertedDir);
                }
                const start = Date.now();
                let count = 0;
                const workers = csvFiles.map((file) => {
                    const input = path.join(this.dirPath, file);
                    const output = path.join(convertedDir, file.replace(".csv", ".json"));
                    return new Promise((resolve, reject) => {
                        this.convertCsv(input, output)
                            .then((result) => {
                            count += result;
                            resolve();
                        })
                            .catch((error) => {
                            reject(error);
                        });
                    });
                });
                Promise.all(workers)
                    .then(() => {
                    const end = Date.now();
                    const duration = end - start;
                    resolve({ count, duration });
                })
                    .catch((error) => {
                    reject(error);
                });
            });
        });
    }
}
const server = http.createServer((req, res) => {
    const reqObj = url.parse(req.url, true);
    const filePath = reqObj.pathname;
    if (req.method === "POST" && filePath === "/exports") {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
        });
        req.on("end", () => {
            const data = JSON.parse(body);
            const dirPath = data.dirPath;
            const instance = new Convert(dirPath);
            instance
                .convertAll()
                .then((data) => {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(data);
            })
                .catch((error) => {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: error.message }));
            });
        });
    }
    else if (req.method === "GET" && filePath === "/files") {
        fs.readdir(convertedDir, (err, files) => {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(files));
        });
    }
    else if (req.method === "GET" && filePath.startsWith("/files/")) {
        const filename = filePath.slice(7);
        const json = path.join(convertedDir, filename);
        fs.readFile(json, (err, data) => {
            if (err) {
                res.writeHead(404, { "Content-Type": "application/json" });
                res.end("File not found");
            }
            else {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(data);
            }
        });
    }
    else if (req.method === "DELETE" && filePath.startsWith("/files/")) {
        const filename = filePath.slice(7);
        const json = path.join(convertedDir, filename);
        fs.unlink(json, (err) => {
            if (err) {
                res.writeHead(404, { "Content-Type": "application/json" });
                res.end("Not found");
            }
            else {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end("Deleted");
            }
        });
    }
    else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end("Not Found");
    }
});
const port = 3000;
server.listen(port, () => {
    console.log("Server running");
});
