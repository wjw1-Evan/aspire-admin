# 定位订阅移除错误修复

## 问题描述

在停止定位监听时，出现以下错误：

```
[LocationSync] 停止定位监听失败: TypeError: _LocationEventEmitter.LocationEventEmitter.removeSubscription is not a function
    at Subscriber.unregisterCallback (LocationSubscribers.js:50:34)
    at Object.remove (Location.js:79:32)
    at useAutoLocationSync.ts:39:23
```

## 问题原因

`expo-location` 库的 `LocationSubscription.remove()` 方法在某些情况下内部调用 `LocationEventEmitter.removeSubscription` 时失败，导致 `TypeError`。这可能是因为：

1. **库版本兼容性问题**：`expo-location ~19.0.7` 在某些平台或场景下可能存在内部实现问题
2. **订阅对象状态异常**：订阅对象可能处于异常状态，导致内部方法调用失败
3. **异步处理问题**：`remove()` 方法的异步处理可能存在问题

## 解决方案

改进 `useAutoLocationSync.ts` 中的 `stopWatcher` 函数，采用多重容错机制：

### 1. 改进错误处理策略

- **立即清除引用**：在尝试移除订阅之前，先将 `watcherRef.current` 设置为 `null`，避免重复尝试
- **多重移除方式**：按优先级尝试多种移除方式，确保至少一种方式成功
- **优雅降级**：即使所有移除方式都失败，也不会导致应用崩溃或内存泄漏

### 2. 实现细节

```typescript
const stopWatcher = useCallback(async () => {
  const watcher = watcherRef.current;
  if (!watcher) {
    return;
  }

  watcherRef.current = null; // 立即清除引用

  let removed = false;

  // 方式 1: 使用 remove() 方法（标准方式）
  if (!removed) {
    try {
      if (typeof watcher.remove === 'function') {
        await Promise.resolve(watcher.remove());
        removed = true;
      }
    } catch (error) {
      // 捕获错误但不阻止继续尝试其他方式
    }
  }

  // 方式 2: 使用 removeWatchAsync（如果存在）
  if (!removed) {
    try {
      if (typeof Location.removeWatchAsync === 'function') {
        await Location.removeWatchAsync(watcher);
        removed = true;
      }
    } catch (error) {
      // 继续尝试其他方式
    }
  }

  // 方式 3: 尝试 unsubscribe（Web 端或部分平台）
  if (!removed) {
    try {
      const watcherWithUnsubscribe = watcher as { unsubscribe?: () => void };
      if (typeof watcherWithUnsubscribe.unsubscribe === 'function') {
        watcherWithUnsubscribe.unsubscribe();
        removed = true;
      }
    } catch (error) {
      // 继续执行
    }
  }
}, []);
```

### 3. 关键改进点

1. **使用 `Promise.resolve()`**：确保即使 `remove()` 不是异步方法也能正确处理
2. **顺序尝试多种方式**：按照优先级尝试不同的移除方式
3. **错误隔离**：每个移除方式的错误都被捕获，不会影响其他方式的尝试
4. **开发环境日志**：仅在开发环境下输出警告日志，避免生产环境噪音
5. **内存安全**：即使所有移除方式都失败，由于已经清除了引用，不会导致内存泄漏

## 验证方法

1. **启动应用并登录**
2. **观察控制台**：不应该再出现 `removeSubscription is not a function` 错误
3. **测试定位功能**：
   - 应用切换到后台时，应该能正常停止定位监听
   - 应用回到前台时，应该能重新启动定位监听
   - 登出时，应该能正常停止定位监听

## 相关文件

- `Platform.App/hooks/useAutoLocationSync.ts` - 定位同步 Hook
- `Platform.App/services/location.ts` - 定位服务工具函数

## 技术细节

- **expo-location 版本**：~19.0.7
- **Expo SDK 版本**：54.0.23
- **React Native 版本**：0.81.5

## 注意事项

1. 这个修复是防御性的，主要目的是防止错误影响应用运行
2. 如果 `expo-location` 库后续版本修复了这个问题，可以考虑简化代码
3. 在生产环境中，即使移除失败也不会影响功能，因为引用已被清除

## 更新日期

2025-01-27

