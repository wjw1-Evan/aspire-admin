using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;

namespace Platform.ApiService.Controllers;

[ApiController]
[Route("api/company")]
public class CompanyController : BaseApiController
{
    private readonly ICompanyService _companyService;
    private readonly IAuthService _authService;
    private readonly IUserCompanyService _userCompanyService;

    public CompanyController(
        ICompanyService companyService, 
        IAuthService authService,
        IUserCompanyService userCompanyService)
    {
        _companyService = companyService;
        _authService = authService;
        _userCompanyService = userCompanyService;
    }

    /// <summary>
    /// 企业注册
    /// </summary>
    /// <param name="request">注册请求</param>
    /// <remarks>
    /// 企业注册将自动创建：
    /// 1. 企业信息
    /// 2. 默认权限集
    /// 3. 管理员角色（拥有所有权限）
    /// 4. 默认菜单
    /// 5. 管理员用户
    /// 
    /// 示例请求：
    /// ```json
    /// {
    ///   "companyName": "示例公司",
    ///   "companyCode": "example-company",
    ///   "companyDescription": "一家示例公司",
    ///   "industry": "互联网",
    ///   "adminUsername": "admin",
    ///   "adminPassword": "admin123",
    ///   "adminEmail": "admin@example.com",
    ///   "contactName": "张三",
    ///   "contactPhone": "13800138000"
    /// }
    /// ```
    /// </remarks>
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterCompanyRequest request)
    {
        // 验证必需参数
        request.CompanyName.EnsureNotEmpty("企业名称");
        request.CompanyCode.EnsureNotEmpty("企业代码");
        request.AdminUsername.EnsureNotEmpty("管理员用户名");
        request.AdminPassword.EnsureValidPassword();
        request.AdminEmail.EnsureValidEmail();

        var company = await _companyService.RegisterCompanyAsync(request);

        // 自动登录：创建管理员的登录请求（v3.1: 不需要企业代码）
        var loginRequest = new LoginRequest
        {
            Username = request.AdminUsername,
            Password = request.AdminPassword,
            AutoLogin = true
        };

        var loginResult = await _authService.LoginAsync(loginRequest);

        // 返回企业信息和登录令牌
        var result = new RegisterCompanyResult
        {
            Company = company,
            Token = loginResult.data?.Token,
            RefreshToken = loginResult.data?.RefreshToken,
            ExpiresAt = loginResult.data?.ExpiresAt
        };

        return Success(result, "企业注册成功，已自动登录");
    }

    /// <summary>
    /// v3.1: 创建企业（当前用户自动成为管理员并拥有全部权限）
    /// </summary>
    /// <param name="request">创建企业请求</param>
    /// <remarks>
    /// 已登录用户创建新企业，当前用户自动成为该企业的管理员并拥有所有菜单访问权限。
    /// 创建后不会自动切换企业，用户可通过企业切换器切换到新企业。
    /// 
    /// 示例请求：
    /// ```json
    /// {
    ///   "name": "新公司",
    ///   "code": "new-company",
    ///   "description": "一家新公司",
    ///   "industry": "互联网"
    /// }
    /// ```
    /// </remarks>
    [HttpPost("create")]
    [Authorize]
    public async Task<IActionResult> CreateCompany([FromBody] CreateCompanyRequest request)
    {
        // 验证必需参数
        request.Name.EnsureNotEmpty("企业名称");
        // 注意：Code 字段不再需要，系统会自动生成

        var userId = GetRequiredUserId();
        var company = await _companyService.CreateCompanyAsync(request, userId);

        return Success(company, "企业创建成功！您已成为该企业的管理员。");
    }

    /// <summary>
    /// 获取当前用户所在企业信息
    /// </summary>
    /// <remarks>
    /// 获取当前登录用户所属企业的详细信息，包括企业基本信息、配置等。
    /// 
    /// 示例请求：
    /// ```
    /// GET /api/company/current
    /// Authorization: Bearer {token}
    /// ```
    /// 
    /// 示例响应：
    /// ```json
    /// {
    ///   "success": true,
    ///   "data": {
    ///     "id": "company123",
    ///     "name": "示例公司",
    ///     "code": "example-company",
    ///     "description": "一家示例公司",
    ///     "industry": "互联网",
    ///     "isActive": true,
    ///     "maxUsers": 100,
    ///     "createdAt": "2024-01-01T00:00:00Z"
    ///   }
    /// }
    /// ```
    /// </remarks>
    /// <returns>当前企业信息</returns>
    /// <response code="200">成功返回企业信息</response>
    /// <response code="401">未授权，需要登录</response>
    /// <response code="404">企业不存在</response>
    [HttpGet("current")]
    [Authorize]
    public async Task<IActionResult> GetCurrentCompany()
    {
        var companyId = await GetRequiredCompanyIdAsync();
        var company = await _companyService.GetCompanyByIdAsync(companyId);
        return Success(company.EnsureFound("企业"));
    }

    /// <summary>
    /// 更新当前企业信息
    /// </summary>
    /// <param name="request">更新请求</param>
    [HttpPut("current")]
    [Authorize]
    public async Task<IActionResult> UpdateCurrentCompany([FromBody] UpdateCompanyRequest request)
    {
        // 从数据库获取当前用户的企业ID
        var userId = GetRequiredUserId();
        var userService = HttpContext.RequestServices.GetRequiredService<Platform.ServiceDefaults.Services.IDatabaseOperationFactory<AppUser>>();
        var user = await userService.GetByIdAsync(userId);
        if (user == null || string.IsNullOrEmpty(user.CurrentCompanyId))
        {
            throw new UnauthorizedAccessException("未找到企业信息");
        }
        var companyId = user.CurrentCompanyId;
        
        var success = await _companyService.UpdateCompanyAsync(companyId, request);
        success.EnsureSuccess("企业", companyId);

        return Success("企业信息更新成功");
    }

    /// <summary>
    /// 获取当前企业统计信息
    /// </summary>
    [HttpGet("statistics")]
    [Authorize]
    public async Task<IActionResult> GetStatistics()
    {
        // 从数据库获取当前用户的企业ID
        var userId = GetRequiredUserId();
        var userService = HttpContext.RequestServices.GetRequiredService<Platform.ServiceDefaults.Services.IDatabaseOperationFactory<AppUser>>();
        var user = await userService.GetByIdAsync(userId);
        if (user == null || string.IsNullOrEmpty(user.CurrentCompanyId))
        {
            throw new UnauthorizedAccessException("未找到企业信息");
        }
        var companyId = user.CurrentCompanyId;
        
        var statistics = await _companyService.GetCompanyStatisticsAsync(companyId);
        return Success(statistics);
    }

    /// <summary>
    /// 检查企业代码是否可用
    /// </summary>
    /// <param name="code">企业代码</param>
    [HttpGet("check-code")]
    [AllowAnonymous]
    public async Task<IActionResult> CheckCodeAvailability([FromQuery] string code)
    {
        code.EnsureNotEmpty("企业代码");

        var company = await _companyService.GetCompanyByCodeAsync(code);
        var available = company == null;

        return Success(new { available, message = available ? "企业代码可用" : "企业代码已被使用" });
    }

    #region v3.1: 多企业隶属API

    /// <summary>
    /// v3.1: 搜索企业
    /// </summary>
    [HttpGet("search")]
    [Authorize]
    public async Task<IActionResult> SearchCompanies([FromQuery] string keyword)
    {
        keyword.EnsureNotEmpty("搜索关键词");
        
        var results = await _companyService.SearchCompaniesAsync(keyword);
        return Success(results);
    }

    /// <summary>
    /// v3.1: 获取我的企业列表
    /// </summary>
    [HttpGet("my-companies")]
    [Authorize]
    public async Task<IActionResult> GetMyCompanies()
    {
        var userId = GetRequiredUserId();
        var companies = await _userCompanyService.GetUserCompaniesAsync(userId);
        return Success(companies);
    }

    /// <summary>
    /// v3.1: 切换当前企业
    /// </summary>
    [HttpPost("switch")]
    [Authorize]
    public async Task<IActionResult> SwitchCompany([FromBody] SwitchCompanyRequest request)
    {
        request.TargetCompanyId.EnsureNotEmpty("目标企业ID");
        
        var result = await _userCompanyService.SwitchCompanyAsync(request.TargetCompanyId);
        return Success(result, "企业切换成功");
    }

    /// <summary>
    /// v3.1: 获取企业成员列表（管理员）
    /// </summary>
    [HttpGet("{companyId}/members")]
    [Authorize]
    public async Task<IActionResult> GetCompanyMembers(string companyId)
    {
        // 验证当前用户是否是该企业的管理员
        if (!await _userCompanyService.IsUserAdminInCompanyAsync(GetRequiredUserId(), companyId))
        {
            throw new UnauthorizedAccessException("只有企业管理员可以查看成员列表");
        }
        
        var members = await _userCompanyService.GetCompanyMembersAsync(companyId);
        return Success(members);
    }

    /// <summary>
    /// v3.1: 更新成员角色（管理员）
    /// </summary>
    [HttpPut("{companyId}/members/{userId}/roles")]
    [Authorize]
    public async Task<IActionResult> UpdateMemberRoles(
        string companyId, 
        string userId, 
        [FromBody] UpdateMemberRolesRequest request)
    {
        // 验证当前用户是否是该企业的管理员
        if (!await _userCompanyService.IsUserAdminInCompanyAsync(GetRequiredUserId(), companyId))
        {
            throw new UnauthorizedAccessException("只有企业管理员可以分配角色");
        }
        
        var success = await _userCompanyService.UpdateMemberRolesAsync(companyId, userId, request.RoleIds);
        if (!success)
            throw new KeyNotFoundException("成员不存在");
        
        return Success("角色更新成功");
    }

    /// <summary>
    /// v3.1: 设置/取消成员管理员权限（管理员）
    /// </summary>
    [HttpPut("{companyId}/members/{userId}/admin")]
    [Authorize]
    public async Task<IActionResult> SetMemberAdmin(
        string companyId,
        string userId,
        [FromBody] SetAdminRequest request)
    {
        // 验证当前用户是否是该企业的管理员
        if (!await _userCompanyService.IsUserAdminInCompanyAsync(GetRequiredUserId(), companyId))
        {
            throw new UnauthorizedAccessException("只有企业管理员可以设置管理员权限");
        }
        
        var success = await _userCompanyService.SetMemberAsAdminAsync(companyId, userId, request.IsAdmin);
        if (!success)
            throw new KeyNotFoundException("成员不存在");
        
        return Success(request.IsAdmin ? "已设置为管理员" : "已取消管理员权限");
    }

    /// <summary>
    /// v3.1: 移除企业成员（管理员）
    /// </summary>
    [HttpDelete("{companyId}/members/{userId}")]
    [Authorize]
    public async Task<IActionResult> RemoveMember(string companyId, string userId)
    {
        // 验证当前用户是否是该企业的管理员
        if (!await _userCompanyService.IsUserAdminInCompanyAsync(GetRequiredUserId(), companyId))
        {
            throw new UnauthorizedAccessException("只有企业管理员可以移除成员");
        }
        
        var success = await _userCompanyService.RemoveMemberAsync(companyId, userId);
        if (!success)
            throw new KeyNotFoundException("成员不存在");
        
        return Success("成员已移除");
    }

    #endregion
}

/// <summary>
/// 切换企业请求
/// </summary>
public class SwitchCompanyRequest
{
    public string TargetCompanyId { get; set; } = string.Empty;
}

/// <summary>
/// 更新成员角色请求
/// </summary>
public class UpdateMemberRolesRequest
{
    public List<string> RoleIds { get; set; } = new();
}

/// <summary>
/// 设置管理员请求
/// </summary>
public class SetAdminRequest
{
    public bool IsAdmin { get; set; }
}


