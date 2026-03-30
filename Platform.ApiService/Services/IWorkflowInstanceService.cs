using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models.Workflow;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

public interface IWorkflowInstanceService
{
    Task SaveChangesAsync();
}
