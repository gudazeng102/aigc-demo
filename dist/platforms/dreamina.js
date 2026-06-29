"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DreaminaAdapter = void 0;
/**
 * 即梦适配器（预留框架）
 *
 * 说明：
 * - 已实现 AIGCPlatformAdapter 接口，但具体 API 调用逻辑需要参考即梦官方文档补充。
 * - 当前调用会直接抛出错误，提示开发者接入真实接口。
 */
class DreaminaAdapter {
    constructor() {
        this.name = 'dreamina';
    }
    async submitTask(_content, _type) {
        throw new Error('即梦适配器尚未实现，请补充 API 调用逻辑');
    }
    async queryTask(_platformTaskId) {
        throw new Error('即梦适配器尚未实现，请补充 API 调用逻辑');
    }
}
exports.DreaminaAdapter = DreaminaAdapter;
