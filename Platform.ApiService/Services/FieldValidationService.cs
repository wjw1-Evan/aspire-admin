using Platform.ApiService.Models;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text.RegularExpressions;

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

/// <summary>
/// 字段验证服务实现
/// </summary>
public class FieldValidationService : IFieldValidationService
{
    private readonly ILogger<FieldValidationService> _logger;

    /// <summary>
    /// 初始化字段验证服务
    /// </summary>
    /// <param name="logger">日志记录器</param>
    public FieldValidationService(ILogger<FieldValidationService> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// 验证表单字段值
    /// </summary>
    public List<string> ValidateFieldValue(FormField field, object? value)
    {
        var errors = new List<string>();

        try
        {
            // 1. 必填验证
            if (field.Required == true)
            {
                if (value == null || 
                    (value is string str && string.IsNullOrWhiteSpace(str)) ||
                    (value is Array arr && arr.Length == 0))
                {
                    errors.Add($"字段 {field.Label} 必填");
                    return errors; // 必填验证失败，不继续其他验证
                }
            }

            // 2. 如果值为空且非必填，跳过其他验证
            if (value == null || (value is string s && string.IsNullOrWhiteSpace(s)))
            {
                return errors;
            }

            // 3. 类型验证
            switch (field.Type)
            {
                case FormFieldType.Text:
                    ValidateTextField(field, value, errors);
                    break;

                case FormFieldType.TextArea:
                    ValidateTextAreaField(field, value, errors);
                    break;

                case FormFieldType.Number:
                    ValidateNumberField(field, value, errors);
                    break;

                case FormFieldType.Date:
                    ValidateDateField(field, value, errors);
                    break;

                case FormFieldType.DateTime:
                    ValidateDateTimeField(field, value, errors);
                    break;

                case FormFieldType.Select:
                    ValidateSelectField(field, value, errors);
                    break;

                case FormFieldType.Radio:
                    ValidateRadioField(field, value, errors);
                    break;

                case FormFieldType.Checkbox:
                    ValidateCheckboxField(field, value, errors);
                    break;

                case FormFieldType.Switch:
                    ValidateSwitchField(field, value, errors);
                    break;

                case FormFieldType.Attachment:
                    ValidateAttachmentField(field, value, errors);
                    break;

                default:
                    _logger.LogWarning("不支持的字段类型: {FieldType}", field.Type);
                    break;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "字段验证异常: FieldLabel={FieldLabel}, FieldType={FieldType}", 
                field.Label, field.Type);
            errors.Add($"字段 {field.Label} 验证异常");
        }

        return errors;
    }

    /// <summary>
    /// 验证整个表单数据
    /// </summary>
    public List<string> ValidateFormData(FormDefinition form, Dictionary<string, object> values)
    {
        var allErrors = new List<string>();

        foreach (var field in form.Fields)
        {
            values.TryGetValue(field.DataKey, out var fieldValue);
            var fieldErrors = ValidateFieldValue(field, fieldValue);
            allErrors.AddRange(fieldErrors);
        }

        return allErrors;
    }

    /// <summary>
    /// 验证用户名
    /// </summary>
    public List<string> ValidateUsername(string? username)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(username))
        {
            errors.Add("用户名不能为空");
            return errors;
        }

        // 用户名长度验证
        if (username.Length < 3 || username.Length > 50)
        {
            errors.Add("用户名长度必须在3-50个字符之间");
        }

        // 用户名格式验证（字母、数字、下划线）
        if (!System.Text.RegularExpressions.Regex.IsMatch(username, @"^[a-zA-Z0-9_]+$"))
        {
            errors.Add("用户名只能包含字母、数字和下划线");
        }

        return errors;
    }

    /// <summary>
    /// 验证密码
    /// </summary>
    public List<string> ValidatePassword(string? password)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(password))
        {
            errors.Add("密码不能为空");
            return errors;
        }

        // 密码长度验证
        if (password.Length < 6 || password.Length > 100)
        {
            errors.Add("密码长度必须在6-100个字符之间");
        }

        // 密码复杂度验证（至少包含字母和数字）
        if (!System.Text.RegularExpressions.Regex.IsMatch(password, @"^(?=.*[A-Za-z])(?=.*\d).+$"))
        {
            errors.Add("密码必须包含至少一个字母和一个数字");
        }

        return errors;
    }

    /// <summary>
    /// 验证邮箱
    /// </summary>
    public List<string> ValidateEmail(string? email)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(email))
        {
            errors.Add("邮箱不能为空");
            return errors;
        }

        // 邮箱格式验证
        try
        {
            var addr = new System.Net.Mail.MailAddress(email);
            if (addr.Address != email)
            {
                errors.Add("邮箱格式无效");
            }
        }
        catch
        {
            errors.Add("邮箱格式无效");
        }

        // 邮箱长度验证
        if (email.Length > 254)
        {
            errors.Add("邮箱长度不能超过254个字符");
        }

        return errors;
    }

    #region 私有验证方法

    private void ValidateTextField(FormField field, object value, List<string> errors)
    {
        var text = value?.ToString() ?? "";
        
        // 长度验证（可以通过字段配置扩展）
        if (text.Length > 1000)
        {
            errors.Add($"字段 {field.Label} 长度不能超过1000个字符");
        }
    }

    private void ValidateTextAreaField(FormField field, object value, List<string> errors)
    {
        var text = value?.ToString() ?? "";
        
        // 长度验证
        if (text.Length > 5000)
        {
            errors.Add($"字段 {field.Label} 长度不能超过5000个字符");
        }
    }

    private void ValidateNumberField(FormField field, object value, List<string> errors)
    {
        if (!IsNumeric(value))
        {
            errors.Add($"字段 {field.Label} 必须是数字");
        }
    }

    private void ValidateDateField(FormField field, object value, List<string> errors)
    {
        if (!IsValidDate(value))
        {
            errors.Add($"字段 {field.Label} 必须是有效的日期格式");
        }
    }

    private void ValidateDateTimeField(FormField field, object value, List<string> errors)
    {
        if (!IsValidDateTime(value))
        {
            errors.Add($"字段 {field.Label} 必须是有效的日期时间格式");
        }
    }

    private void ValidateSelectField(FormField field, object value, List<string> errors)
    {
        if (field.Options != null && field.Options.Any())
        {
            var valueStr = value?.ToString();
            var validValues = field.Options.Select(o => o.Value).ToList();
            
            if (!string.IsNullOrEmpty(valueStr) && !validValues.Contains(valueStr))
            {
                errors.Add($"字段 {field.Label} 的值不在可选范围内");
            }
        }
    }

    private void ValidateRadioField(FormField field, object value, List<string> errors)
    {
        // 单选框验证逻辑与下拉框类似
        ValidateSelectField(field, value, errors);
    }

    private void ValidateCheckboxField(FormField field, object value, List<string> errors)
    {
        if (field.Options != null && field.Options.Any())
        {
            // 复选框可能是数组值
            if (value is Array arr)
            {
                var validValues = field.Options.Select(o => o.Value).ToList();
                foreach (var item in arr)
                {
                    var itemStr = item?.ToString();
                    if (!string.IsNullOrEmpty(itemStr) && !validValues.Contains(itemStr))
                    {
                        errors.Add($"字段 {field.Label} 包含无效的选项值: {itemStr}");
                    }
                }
            }
            else if (value != null)
            {
                // 单个值的情况
                ValidateSelectField(field, value, errors);
            }
        }
    }

    private void ValidateSwitchField(FormField field, object value, List<string> errors)
    {
        if (!IsBoolean(value))
        {
            errors.Add($"字段 {field.Label} 必须是布尔值");
        }
    }

    private void ValidateAttachmentField(FormField field, object value, List<string> errors)
    {
        // 附件字段通常是文件ID数组或单个文件ID
        if (value is Array arr)
        {
            foreach (var item in arr)
            {
                if (item != null && !IsValidObjectId(item.ToString()))
                {
                    errors.Add($"字段 {field.Label} 包含无效的附件ID");
                    break;
                }
            }
        }
        else if (value != null && !IsValidObjectId(value.ToString()))
        {
            errors.Add($"字段 {field.Label} 的附件ID格式无效");
        }
    }

    #endregion

    #region 辅助方法

    private bool IsNumeric(object? value)
    {
        if (value == null) return false;
        
        return value is int || value is long || value is float || value is double || value is decimal ||
               double.TryParse(value.ToString(), out _);
    }

    private bool IsValidDate(object? value)
    {
        if (value == null) return false;
        
        if (value is DateTime) return true;
        
        return DateTime.TryParse(value.ToString(), out _);
    }

    private bool IsValidDateTime(object? value)
    {
        if (value == null) return false;
        
        if (value is DateTime) return true;
        
        return DateTime.TryParse(value.ToString(), out _);
    }

    private bool IsBoolean(object? value)
    {
        if (value == null) return false;
        
        if (value is bool) return true;
        
        return bool.TryParse(value.ToString(), out _);
    }

    private bool IsValidObjectId(string? value)
    {
        if (string.IsNullOrEmpty(value)) return false;
        
        // MongoDB ObjectId 格式验证：24位十六进制字符串
        return Regex.IsMatch(value, @"^[0-9a-fA-F]{24}$");
    }

    #endregion
}