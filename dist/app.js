"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const task_1 = __importDefault(require("./routes/task"));
const chat_1 = __importDefault(require("./routes/chat"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '服务运行中' });
});
app.use('/api', task_1.default);
app.use('/api', chat_1.default);
exports.default = app;
