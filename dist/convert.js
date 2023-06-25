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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Convert = void 0;
const fs = __importStar(require("fs"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
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
                .pipe((0, csv_parser_1.default)())
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
exports.Convert = Convert;
