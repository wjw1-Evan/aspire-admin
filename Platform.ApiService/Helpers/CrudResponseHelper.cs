using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;

namespace Platform.ApiService.Helpers;

/// <summary>
/// CRUD响应辅助类 - 提供标准化CRUD操作响应构建
/// </summary>
public static class CrudResponseHelper
{
    /// <summary>
    /// 创建成功响应
    /// </summary>
    /// <typeparam name="T">数据类型</typeparam>
    /// <param name="data">创建的数据</param>
    /// <param name="message">自定义消息</param>
    /// <returns>API响应</returns>
    public static ApiResponse<T> CreateSuccessResponse<T>(T data, string? message = null)
    {
        return ApiResponse<T>.SuccessResult(data, message ?? ErrorMessages.CreateSuccess);
    }
    
    /// <summary>
    /// 更新成功响应
    /// </summary>
    /// <param name="message">自定义消息</param>
    /// <returns>API响应</returns>
    public static ApiResponse UpdateSuccessResponse(string? message = null)
    {
        return ApiResponse.SuccessResult(message ?? ErrorMessages.UpdateSuccess);
    }
    
    /// <summary>
    /// 删除成功响应
    /// </summary>
    /// <param name="message">自定义消息</param>
    /// <returns>API响应</returns>
    public static ApiResponse DeleteSuccessResponse(string? message = null)
    {
        return ApiResponse.SuccessResult(message ?? ErrorMessages.DeleteSuccess);
    }
    
    /// <summary>
    /// 获取单个资源的标准响应
    /// </summary>
    /// <typeparam name="T">资源类型</typeparam>
    /// <param name="resource">资源对象</param>
    /// <param name="resourceName">资源名称</param>
    /// <param name="resourceId">资源ID</param>
    /// <returns>API响应</returns>
    public static ApiResponse<T> GetResourceResponse<T>(
        T? resource, 
        string resourceName, 
        string? resourceId = null) where T : class
    {
        return ApiResponse<T>.SuccessResult(resource.EnsureFound(resourceName, resourceId));
    }
    
    /// <summary>
    /// 获取列表的标准响应
    /// </summary>
    /// <typeparam name="T">资源类型</typeparam>
    /// <param name="resources">资源列表</param>
    /// <returns>API响应</returns>
    public static ApiResponse<IEnumerable<T>> GetListResponse<T>(IEnumerable<T> resources)
    {
        return ApiResponse<IEnumerable<T>>.SuccessResult(resources);
    }
    
    /// <summary>
    /// 布尔操作结果的标准响应
    /// </summary>
    /// <param name="success">操作结果</param>
    /// <param name="resourceName">资源名称</param>
    /// <param name="resourceId">资源ID</param>
    /// <param name="successMessage">成功消息</param>
    /// <returns>API响应</returns>
    public static ApiResponse BooleanOperationResponse(
        bool success, 
        string resourceName, 
        string? resourceId = null, 
        string? successMessage = null)
    {
        success.EnsureSuccess(resourceName, resourceId);
        return ApiResponse.SuccessResult(successMessage ?? ErrorMessages.OperationSuccess);
    }
}





