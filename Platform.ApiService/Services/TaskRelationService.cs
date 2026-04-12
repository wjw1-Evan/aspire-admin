using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

public class TaskRelationService : ITaskRelationService
{
    private readonly DbContext _context;
    private readonly ITaskCrudService _taskCrudService;

    public TaskRelationService(DbContext context, ITaskCrudService taskCrudService)
    {
        _context = context;
        _taskCrudService = taskCrudService;
    }

    public async Task<string> AddTaskDependencyAsync(string predecessorTaskId, string successorTaskId, int dependencyType, int lagDays)
    {
        if (!await _context.Set<WorkTask>().AnyAsync(x => x.Id == predecessorTaskId))
            throw new KeyNotFoundException($"前置任务 {predecessorTaskId} 不存在");
        if (!await _context.Set<WorkTask>().AnyAsync(x => x.Id == successorTaskId))
            throw new KeyNotFoundException($"后续任务 {successorTaskId} 不存在");
        if (await HasCircularDependencyAsync(predecessorTaskId, successorTaskId))
            throw new InvalidOperationException("检测到循环依赖");

        var dep = new TaskDependency
        {
            PredecessorTaskId = predecessorTaskId,
            SuccessorTaskId = successorTaskId,
            DependencyType = (TaskDependencyType)dependencyType,
            LagDays = lagDays
        };
        await _context.Set<TaskDependency>().AddAsync(dep);
        await _context.SaveChangesAsync();
        return dep.Id!;
    }

    private async Task<bool> HasCircularDependencyAsync(string start, string end)
    {
        var visited = new HashSet<string> { start };
        var q = new Queue<string>(); q.Enqueue(start);
        while (q.Any())
        {
            var cur = q.Dequeue();
            if (cur == end) return true;
            var deps = await _context.Set<TaskDependency>().Where(d => d.PredecessorTaskId == cur).ToListAsync();
            foreach (var d in deps)
                if (visited.Add(d.SuccessorTaskId)) q.Enqueue(d.SuccessorTaskId);
        }
        return false;
    }

    public async Task<bool> RemoveTaskDependencyAsync(string dependencyId)
    {
        var dep = await _context.Set<TaskDependency>().FirstOrDefaultAsync(x => x.Id == dependencyId);
        if (dep == null) return false;
        _context.Set<TaskDependency>().Remove(dep);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<TaskDependencyDto>> GetTaskDependenciesAsync(string taskId)
    {
        var deps = await _context.Set<TaskDependency>()
            .Where(d => d.PredecessorTaskId == taskId || d.SuccessorTaskId == taskId).ToListAsync();

        var dtos = new List<TaskDependencyDto>();
        foreach (var d in deps)
        {
            var p = await _taskCrudService.GetTaskByIdAsync(d.PredecessorTaskId);
            var s = await _taskCrudService.GetTaskByIdAsync(d.SuccessorTaskId);
            dtos.Add(new TaskDependencyDto
            {
                Id = d.Id,
                PredecessorTaskId = d.PredecessorTaskId,
                PredecessorTaskName = p?.TaskName,
                SuccessorTaskId = d.SuccessorTaskId,
                SuccessorTaskName = s?.TaskName,
                DependencyType = (int)d.DependencyType,
                DependencyTypeName = GetDependencyTypeName(d.DependencyType),
                LagDays = d.LagDays
            });
        }
        return dtos;
    }

    public async Task<List<string>> CalculateCriticalPathAsync(string projectId)
    {
        var tasks = await _context.Set<WorkTask>().Where(t => t.ProjectId == projectId).ToListAsync();
        if (!tasks.Any()) return new List<string>();

        var deps = await _context.Set<TaskDependency>()
            .Where(d => tasks.Select(t => t.Id).Contains(d.PredecessorTaskId!) ||
                        tasks.Select(t => t.Id).Contains(d.SuccessorTaskId!)).ToListAsync();

        var graph = tasks.ToDictionary(t => t.Id!, t => new List<string>());
        var inDeg = tasks.ToDictionary(t => t.Id!, t => 0);
        foreach (var d in deps)
        {
            if (graph.ContainsKey(d.PredecessorTaskId) && graph.ContainsKey(d.SuccessorTaskId))
            {
                graph[d.PredecessorTaskId].Add(d.SuccessorTaskId);
                inDeg[d.SuccessorTaskId]++;
            }
        }

        var eStart = tasks.ToDictionary(t => t.Id!, t => 0);
        var q = new Queue<string>(tasks.Where(t => inDeg[t.Id!] == 0).Select(t => t.Id!));
        while (q.Any())
        {
            var cur = q.Dequeue();
            foreach (var next in graph[cur])
            {
                var tCur = tasks.First(t => t.Id == cur);
                var dur = tCur.Duration ?? (tCur.PlannedEndTime.HasValue && tCur.PlannedStartTime.HasValue ?
                    (int)(tCur.PlannedEndTime.Value - tCur.PlannedStartTime.Value).TotalDays : 1);
                eStart[next] = Math.Max(eStart[next], eStart[cur] + dur);
                if (--inDeg[next] == 0) q.Enqueue(next);
            }
        }

        var lStart = tasks.ToDictionary(t => t.Id!, t => eStart.Values.Max());
        var rGraph = tasks.ToDictionary(t => t.Id!, t => new List<string>());
        foreach (var d in deps)
        {
            if (rGraph.ContainsKey(d.SuccessorTaskId) && rGraph.ContainsKey(d.PredecessorTaskId))
                rGraph[d.SuccessorTaskId].Add(d.PredecessorTaskId);
        }

        var ends = tasks.Where(t => !graph[t.Id!].Any()).ToList();
        if (ends.Any())
        {
            var maxE = ends.Max(t => eStart[t.Id!] + (t.Duration ?? (t.PlannedEndTime.HasValue && t.PlannedStartTime.HasValue ?
                (int)(t.PlannedEndTime.Value - t.PlannedStartTime.Value).TotalDays : 1)));
            foreach (var e in ends)
                lStart[e.Id!] = maxE - (e.Duration ?? (e.PlannedEndTime.HasValue && e.PlannedStartTime.HasValue ?
                    (int)(e.PlannedEndTime.Value - e.PlannedStartTime.Value).TotalDays : 1));

            var visited = new HashSet<string>();
            q = new Queue<string>(ends.Select(t => t.Id!));
            while (q.Any())
            {
                var cur = q.Dequeue();
                if (!visited.Add(cur)) continue;
                foreach (var prev in rGraph[cur])
                {
                    var tP = tasks.First(t => t.Id == prev);
                    var dur = tP.Duration ?? (tP.PlannedEndTime.HasValue && tP.PlannedStartTime.HasValue ?
                        (int)(tP.PlannedEndTime.Value - tP.PlannedStartTime.Value).TotalDays : 1);
                    lStart[prev] = Math.Min(lStart[prev], lStart[cur] - dur);
                    if (!visited.Contains(prev)) q.Enqueue(prev);
                }
            }
        }

        return tasks.Where(t => lStart[t.Id!] == eStart[t.Id!]).Select(t => t.Id!).ToList();
    }

    private static string GetDependencyTypeName(TaskDependencyType t) => t switch
    {
        TaskDependencyType.FinishToStart => "完成到开始",
        TaskDependencyType.StartToStart => "开始到开始",
        TaskDependencyType.FinishToFinish => "完成到完成",
        TaskDependencyType.StartToFinish => "开始到完成",
        _ => "未知"
    };
}
