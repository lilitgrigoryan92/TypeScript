"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendRes = void 0;
function sendRes(res, status, data, headers) {
    res.writeHead(status, headers);
    res.end(JSON.stringify(data));
}
exports.sendRes = sendRes;
