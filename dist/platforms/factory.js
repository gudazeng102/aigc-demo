"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlatformAdapter = getPlatformAdapter;
const jimeng_1 = require("./jimeng");
function getPlatformAdapter(platformName) {
    switch (platformName) {
        case 'jimeng':
            return new jimeng_1.JimengAdapter();
        default:
            throw new Error(`不支持的平台: ${platformName}`);
    }
}
