using System.Collections.Generic;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 字段验证服务接口
/// </summary>
public interface IFieldValidationService
{
    /// <summary>
    /// 验证表单字段值
    /// </summary>
    /// <param name="field">字段定义</param>
    /// <param name="value">字段值</param>
    /// <returns>验证错误列表，空列表表示验证通过</returns>
    List<string> ValidateFieldValue(FormField field, object? value);

    /// <summary>
    /// 验证整个表单数据
    /// </summary>
    /// <param name="form">表单定义</param>
    /// <param name="values">表单数据</param>
    /// <returns>验证错误列表，空列表表示验证通过</returns>
    List<string> ValidateFormData(FormDefinition form, Dictionary<string, object> values);

    /// <summary>
    /// 验证用户名
    /// </summary>
    /// <param name="username">用户名</param>
    /// <returns>验证错误列表，空列表表示验证通过</returns>
    List<string> ValidateUsername(string? username);

    /// <summary>
    /// 验证密码
    /// </summary>
    /// <param name="password">密码</param>
    /// <returns>验证错误列表，空列表表示验证通过</returns>
    List<string> ValidatePassword(string? password);

    /// <summary>
    /// 验证邮箱
    /// </summary>
    /// <param name="email">邮箱</param>
    /// <returns>验证错误列表，空列表表示验证通过</returns>
    List<string> ValidateEmail(string? email);
}
