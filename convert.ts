import * as fs from 'fs';
import  csv from 'csv-parser';
import * as path from 'path';
import * as os from 'os';

const num: number = os.cpus().length;
const convertedDir: string = path.join(__dirname, "converted");

interface Data {
  [key: string]: string;
}

export class Convert {
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
