"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const http = __importStar(require("http"));
const url = __importStar(require("url"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const convert_1 = require("./convert");
const module_1 = require("./module");
const convertedDir = path.join(__dirname, "converted");
const server = http.createServer((req, res) => {
    const reqObj = url.parse(String(req.url), true);
    const filePath = reqObj.pathname;
    if (req.method === "POST" && filePath === "/exports") {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
        });
        req.on("end", () => {
            const data = JSON.parse(body);
            const dirPath = data.dirPath;
            const instance = new convert_1.Convert(dirPath);
            instance
                .convertAll()
                .then((data) => {
                (0, module_1.sendRes)(res, 200, data, { "Content-Type": "application/json" });
            })
                .catch((error) => {
                (0, module_1.sendRes)(res, 400, { error: error.message }, { "Content-Type": "application/json" });
            });
        });
    }
    else if (req.method === "GET" && filePath === "/files") {
        fs.readdir(convertedDir, (err, files) => {
            if (err) {
                (0, module_1.sendRes)(res, 500, { error: "server error" }, { "Content-Type": "application/json" });
            }
            else {
                (0, module_1.sendRes)(res, 200, files, { "Content-Type": "application/json" });
            }
        });
    }
    else if (req.method === "GET" && filePath.startsWith("/files/")) {
        const filename = filePath.slice(7);
        const json = path.join(convertedDir, filename);
        fs.readFile(json, (err, data) => {
            if (err) {
                (0, module_1.sendRes)(res, 404, { error: "File not found" }, { "Content-Type": "application/json" });
            }
            else {
                (0, module_1.sendRes)(res, 200, data, { "Content-Type": "application/json" });
            }
        });
    }
    else if (req.method === "DELETE" && filePath.startsWith("/files/")) {
        const filename = filePath.slice(7);
        const json = path.join(convertedDir, filename);
        fs.unlink(json, (err) => {
            if (err) {
                (0, module_1.sendRes)(res, 404, { error: "Not found" }, { "Content-Type": "application/json" });
            }
            else {
                (0, module_1.sendRes)(res, 200, "Deleted", { "Content-Type": "application/json" });
            }
        });
    }
    else {
        (0, module_1.sendRes)(res, 404, "Not Found", { "Content-Type": "application/json" });
    }
});
const port = 8000;
server.listen(port, () => {
    console.log("Server running");
});
