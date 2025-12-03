/**
 * 位置上报服务
 * 自动获取并上报用户地理位置信息
 * 
 * 已迁移到 SignalR，使用 LocationServiceSignalR 替代
 * 保留此文件以保持向后兼容性
 */

import LocationServiceSignalR from './locationServiceSignalR';

// 导出 SignalR 版本作为默认实现
export default LocationServiceSignalR;

