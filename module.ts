
import { ServerResponse } from 'http';

export function sendRes(res: ServerResponse, status: number, data: {}, headers?: {}) {
  res.writeHead(status, headers);
  res.end(JSON.stringify(data));
}
