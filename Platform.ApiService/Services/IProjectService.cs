using Platform.ApiService.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

/// <summary>
/// 项目管理服务接口
/// </summary>
public interface IProjectService
{
    /// <summary>
    /// 创建项目
    /// </summary>
    /// <param name="request">创建项目请求</param>
    /// <param name="userId">当前用户ID</param>
    /// <param name="companyId">企业ID</param>
    /// <returns>创建的项目</returns>
    Task<ProjectDto> CreateProjectAsync(CreateProjectRequest request, string userId, string companyId);

    /// <summary>
    /// 更新项目
    /// </summary>
    /// <param name="request">更新项目请求</param>
    /// <param name="userId">当前用户ID</param>
    /// <returns>更新后的项目</returns>
    Task<ProjectDto> UpdateProjectAsync(UpdateProjectRequest request, string userId);

    /// <summary>
    /// 删除项目（软删除）
    /// </summary>
    /// <param name="projectId">项目ID</param>
    /// <param name="userId">当前用户ID</param>
    /// <param name="reason">删除原因</param>
    /// <returns>是否删除成功</returns>
    Task<bool> DeleteProjectAsync(string projectId, string userId, string? reason = null);

    /// <summary>
    /// 获取项目详情
    /// </summary>
    /// <param name="projectId">项目ID</param>
    /// <returns>项目详情</returns>
    Task<ProjectDto?> GetProjectByIdAsync(string projectId);

    /// <summary>
    /// 分页获取项目列表
    /// </summary>
    /// <param name="request">查询请求</param>
    /// <param name="companyId">企业ID</param>
    /// <returns>项目列表响应</returns>
    Task<ProjectListResponse> GetProjectsListAsync(ProjectQueryRequest request, string companyId);

    /// <summary>
    /// 获取项目统计信息
    /// </summary>
    /// <param name="companyId">企业ID</param>
    /// <returns>统计信息</returns>
    Task<ProjectStatistics> GetProjectStatisticsAsync(string companyId);

    /// <summary>
    /// 添加项目成员
    /// </summary>
    /// <param name="request">添加成员请求</param>
    /// <param name="userId">当前用户ID</param>
    /// <param name="companyId">企业ID</param>
    /// <returns>项目成员</returns>
    Task<ProjectMemberDto> AddProjectMemberAsync(AddProjectMemberRequest request, string userId, string companyId);

    /// <summary>
    /// 移除项目成员
    /// </summary>
    /// <param name="projectId">项目ID</param>
    /// <param name="memberUserId">成员用户ID</param>
    /// <param name="userId">当前用户ID</param>
    /// <returns>是否移除成功</returns>
    Task<bool> RemoveProjectMemberAsync(string projectId, string memberUserId, string userId);

    /// <summary>
    /// 获取项目成员列表
    /// </summary>
    /// <param name="projectId">项目ID</param>
    /// <returns>项目成员列表</returns>
    Task<List<ProjectMemberDto>> GetProjectMembersAsync(string projectId);

    /// <summary>
    /// 自动计算项目进度（基于任务进度）
    /// </summary>
    /// <param name="projectId">项目ID</param>
    /// <returns>计算后的进度百分比</returns>
    Task<int> CalculateProjectProgressAsync(string projectId);
}
