using Platform.AppHost.Tests.Models;

namespace Platform.AppHost.Tests.Helpers;

/// <summary>
/// Generates test data for authentication API tests.
/// Ensures data isolation by creating unique usernames and emails for each test execution.
/// </summary>
public static class TestDataGenerator
{
    private static long _counter = Environment.TickCount64;

    private static long GetNextId()
    {
        return Interlocked.Increment(ref _counter);
    }
    /// <summary>
    /// Generates a valid registration request with unique username and email.
    /// Uses counter + GUID to ensure uniqueness across test runs and parallel execution.
    /// Username is kept under 20 characters to comply with validation rules.
    /// Phone number is generated uniquely to avoid MongoDB unique index conflicts.
    /// </summary>
    /// <returns>A valid RegisterRequest with unique credentials.</returns>
    public static RegisterRequest GenerateValidRegistration()
    {
        var counter = GetNextId() % 1000000L;
        var guid = Guid.NewGuid().ToString("N")[..6];

        return new RegisterRequest
        {
            Username = $"u{counter:x}_{guid}",
            Password = "Test@123456",
            Email = $"test_{counter}_{guid}@example.com",
            PhoneNumber = $"+1{(counter % 10000000000L) + 1000000000L}"
        };
    }

    /// <summary>
    /// Generates an invalid registration request based on the specified validation type.
    /// Used for testing validation error handling.
    /// </summary>
    /// <param name="type">The type of validation error to generate.</param>
    /// <returns>A RegisterRequest with the specified validation error.</returns>
    /// <exception cref="ArgumentException">Thrown when an unknown validation type is specified.</exception>
    public static RegisterRequest GenerateInvalidRegistration(InvalidationType type)
    {
        var valid = GenerateValidRegistration();

        return type switch
        {
            InvalidationType.EmptyUsername => valid with { Username = "" },
            InvalidationType.ShortUsername => valid with { Username = "ab" },
            InvalidationType.ShortPassword => valid with { Password = "123" },
            InvalidationType.InvalidEmail => valid with { Email = "not-an-email" },
            _ => throw new ArgumentException($"Unknown validation type: {type}", nameof(type))
        };
    }

    /// <summary>
    /// Generates a valid form definition with unique name and 2-3 default fields.
    /// Uses counter + GUID to ensure uniqueness across test runs.
    /// Format: "form_{counter}_{guid}"
    /// </summary>
    /// <returns>A valid FormDefinitionRequest with unique name and fields.</returns>
    public static FormDefinitionRequest GenerateValidFormDefinition()
    {
        var counter = GetNextId();
        var guid = Guid.NewGuid().ToString("N")[..8];
        var formName = $"form_{counter}_{guid}";

        return new FormDefinitionRequest
        {
            Name = formName,
            Key = $"key_{counter}_{guid}",
            Description = $"Test form created at {DateTimeOffset.UtcNow:yyyy-MM-dd HH:mm:ss}",
            Fields = new List<FormFieldRequest>
            {
                new FormFieldRequest
                {
                    Label = "Title",
                    Type = "Text",
                    Required = true,
                    DataKey = "title"
                },
                new FormFieldRequest
                {
                    Label = "Email",
                    Type = "Text", // FormFieldType as defined in models does not include Email, so we use Text
                    Required = true,
                    DataKey = "email"
                },
                new FormFieldRequest
                {
                    Label = "Comments",
                    Type = "TextArea",
                    Required = false,
                    DataKey = "comments"
                }
            },
            IsActive = true
        };
    }

    /// <summary>
    /// Generates a form definition with a specified number of fields.
    /// Each field has a unique name using counter + GUID pattern.
    /// </summary>
    /// <param name="fieldCount">The number of fields to generate.</param>
    /// <returns>A FormDefinitionRequest with the specified number of fields.</returns>
    public static FormDefinitionRequest GenerateFormDefinitionWithFields(int fieldCount)
    {
        var counter = GetNextId();
        var guid = Guid.NewGuid().ToString("N")[..8];
        var formName = $"form_{counter}_{guid}";

        var fields = new List<FormFieldRequest>();
        var fieldTypes = new[] { "Text", "Number", "Date", "TextArea", "Checkbox", "Select" };

        for (int i = 0; i < fieldCount; i++)
        {
            var fieldGuid = Guid.NewGuid().ToString("N")[..6];
            fields.Add(new FormFieldRequest
            {
                Label = $"Field {i + 1}",
                Type = fieldTypes[i % fieldTypes.Length],
                Required = i % 2 == 0, // Alternate between required and optional
                DataKey = $"field_{i}_{counter}_{fieldGuid}"
            });
        }

        return new FormDefinitionRequest
        {
            Name = formName,
            Key = $"key_{counter}_{guid}",
            Description = $"Test form with {fieldCount} fields",
            Fields = fields,
            IsActive = true
        };
    }

    /// <summary>
    /// Generates a valid knowledge base with unique name and default category.
    /// Uses counter + GUID to ensure uniqueness across test runs.
    /// Format: "kb_{counter}_{guid}"
    /// </summary>
    /// <returns>A valid KnowledgeBaseRequest with unique name and category.</returns>
    public static KnowledgeBaseRequest GenerateValidKnowledgeBase()
    {
        var counter = GetNextId();
        var guid = Guid.NewGuid().ToString("N")[..8];
        var kbName = $"kb_{counter}_{guid}";

        return new KnowledgeBaseRequest
        {
            Name = kbName,
            Description = $"Test knowledge base created at {DateTimeOffset.UtcNow:yyyy-MM-dd HH:mm:ss}",
            Category = "测试分类",
            IsActive = true
        };
    }

    /// <summary>
    /// Generates a knowledge base with a specified category.
    /// Uses counter + GUID to ensure uniqueness across test runs.
    /// </summary>
    /// <param name="category">The category to assign to the knowledge base.</param>
    /// <returns>A KnowledgeBaseRequest with the specified category.</returns>
    public static KnowledgeBaseRequest GenerateKnowledgeBaseWithCategory(string category)
    {
        var counter = GetNextId();
        var guid = Guid.NewGuid().ToString("N")[..8];
        var kbName = $"kb_{counter}_{guid}";

        return new KnowledgeBaseRequest
        {
            Name = kbName,
            Description = $"Test knowledge base in category '{category}'",
            Category = category,
            IsActive = true
        };
    }

    /// <summary>
    /// Generates a valid workflow definition with unique name and minimal valid graph.
    /// The graph contains a start node and an end node connected by an edge.
    /// Uses counter + GUID to ensure uniqueness across test runs.
    /// Format: "workflow_{counter}_{guid}"
    /// </summary>
    /// <returns>A valid WorkflowDefinitionRequest with unique name and minimal graph.</returns>
    public static WorkflowDefinitionRequest GenerateValidWorkflowDefinition()
    {
        var counter = GetNextId();
        var guid = Guid.NewGuid().ToString("N")[..8];
        var workflowName = $"workflow_{counter}_{guid}";

        var graph = GenerateMinimalValidGraph(counter);

        return new WorkflowDefinitionRequest
        {
            Name = workflowName,
            Description = $"Test workflow created at {DateTimeOffset.UtcNow:yyyy-MM-dd HH:mm:ss}",
            Category = "测试分类",
            Graph = graph,
            IsActive = true
        };
    }

    /// <summary>
    /// Generates a minimal valid workflow graph containing a start node and an end node.
    /// The nodes are connected by a single edge.
    /// </summary>
    /// <param name="seed">Seed value for generating unique node IDs.</param>
    /// <returns>A WorkflowGraphRequest with start and end nodes.</returns>
    public static WorkflowGraphRequest GenerateMinimalValidGraph(long? seed = null)
    {
        var counter = seed ?? GetNextId();
        var startNodeId = $"start_{counter}";
        var endNodeId = $"end_{counter}";

        return new WorkflowGraphRequest
        {
            Nodes = new List<WorkflowNodeRequest>
            {
                new WorkflowNodeRequest
                {
                    Id = startNodeId,
                    Type = "start",
                    Data = new NodeDataRequest
                    {
                        Label = "开始",
                        NodeType = "start",
                        Config = new { } // Empty object instead of null
                    },
                    Position = new NodePositionRequest { X = 100, Y = 100 }
                },

                new WorkflowNodeRequest
                {
                    Id = endNodeId,
                    Type = "end",
                    Data = new NodeDataRequest
                    {
                        Label = "结束",
                        NodeType = "end",
                        Config = new { } // Empty object instead of null
                    },
                    Position = new NodePositionRequest { X = 300, Y = 100 }
                }

            },
            Edges = new List<WorkflowEdgeRequest>
            {
                new WorkflowEdgeRequest
                {
                    Id = $"edge_{counter}",
                    Source = startNodeId,
                    Target = endNodeId
                }
            }
        };
    }

    /// <summary>
    /// Generates a workflow definition with a specified number of nodes.
    /// The workflow starts with a start node, followed by the specified number of intermediate nodes,
    /// and ends with an end node. All nodes are connected sequentially.
    /// </summary>
    /// <param name="nodeCount">The number of intermediate nodes to generate (excluding start and end nodes).</param>
    /// <returns>A WorkflowDefinitionRequest with the specified number of nodes.</returns>
    public static WorkflowDefinitionRequest GenerateWorkflowWithNodes(int nodeCount)
    {
        var counter = GetNextId();
        var guid = Guid.NewGuid().ToString("N")[..8];
        var workflowName = $"workflow_{counter}_{guid}";

        var nodes = new List<WorkflowNodeRequest>();
        var edges = new List<WorkflowEdgeRequest>();

        // Add start node
        var startNodeId = $"start_{counter}";
        nodes.Add(new WorkflowNodeRequest
        {
            Id = startNodeId,
            Type = NodeTypes.Start,
            Data = new NodeDataRequest
            {
                Label = "开始",
                NodeType = NodeTypes.Start,
                Config = null
            },
            Position = new NodePositionRequest { X = 100, Y = 100 }
        });

        var previousNodeId = startNodeId;

        // Add intermediate nodes
        for (int i = 0; i < nodeCount; i++)
        {
            var nodeId = $"node_{i}_{counter}_{Guid.NewGuid().ToString("N")[..6]}";
            nodes.Add(new WorkflowNodeRequest
            {
                Id = nodeId,
                Type = "approval",
                Data = new NodeDataRequest
                {
                    Label = $"审批 {i + 1}",
                    NodeType = "approval",
                    Config = GenerateNodeConfig("approval")
                },
                Position = new NodePositionRequest { X = 100 + (i + 1) * 200, Y = 100 }
            });

            // Connect previous node to current node
            edges.Add(new WorkflowEdgeRequest
            {
                Id = $"edge_{i}_{counter}",
                Source = previousNodeId,
                Target = nodeId
            });

            previousNodeId = nodeId;
        }


        // Add end node
        var endNodeId = $"end_{counter}";
        nodes.Add(new WorkflowNodeRequest
        {
            Id = endNodeId,
            Type = NodeTypes.End,
            Data = new NodeDataRequest
            {
                Label = "结束",
                NodeType = NodeTypes.End,
                Config = null
            },
            Position = new NodePositionRequest { X = 100 + (nodeCount + 1) * 200, Y = 100 }
        });

        // Connect last intermediate node to end node
        edges.Add(new WorkflowEdgeRequest
        {
            Id = $"edge_end_{counter}",
            Source = previousNodeId,
            Target = endNodeId
        });

        return new WorkflowDefinitionRequest
        {
            Name = workflowName,
            Description = $"Test workflow with {nodeCount} intermediate nodes",
            Category = "测试分类",
            Graph = new WorkflowGraphRequest
            {
                Nodes = nodes,
                Edges = edges
            },
            IsActive = true
        };
    }

    /// <summary>
    /// Generates a workflow definition containing a specific node type.
    /// The workflow contains a start node, the specified node type, and an end node.
    /// All nodes are connected sequentially.
    /// </summary>
    /// <param name="nodeType">The type of node to include (e.g., NodeTypes.Approval, NodeTypes.Ai).</param>
    /// <param name="approverIds">Optional list of specific user IDs for the approval node.</param>
    /// <returns>A WorkflowDefinitionRequest containing the specified node type.</returns>
    public static WorkflowDefinitionRequest GenerateWorkflowWithNodeType(string nodeType, List<string>? approverIds = null)
    {
        var counter = GetNextId();
        var guid = Guid.NewGuid().ToString("N")[..8];
        var workflowName = $"workflow_{nodeType}_{counter}_{guid}";

        var startNodeId = $"start_{counter}";
        var targetNodeId = $"{nodeType}_target_{counter}";
        var endNodeId = $"end_{counter}";

        var nodes = new List<WorkflowNodeRequest>
        {
            new WorkflowNodeRequest
            {
                Id = startNodeId,
                Type = NodeTypes.Start,
                Data = new NodeDataRequest
                {
                    Label = "Start",
                    NodeType = NodeTypes.Start,
                    Config = null
                },
                Position = new NodePositionRequest { X = 100, Y = 100 }
            },
            new WorkflowNodeRequest
            {
                Id = targetNodeId,
                Type = nodeType,
                Data = new NodeDataRequest
                {
                    Label = $"{nodeType} Node",
                    NodeType = nodeType,
                    Config = GenerateNodeConfig(nodeType, approverIds)
                },
                Position = new NodePositionRequest { X = 300, Y = 100 }
            },
            new WorkflowNodeRequest
            {
                Id = endNodeId,
                Type = NodeTypes.End,
                Data = new NodeDataRequest
                {
                    Label = "End",
                    NodeType = NodeTypes.End,
                    Config = null
                },
                Position = new NodePositionRequest { X = 500, Y = 100 }
            }
        };

        var edges = new List<WorkflowEdgeRequest>
        {
            new WorkflowEdgeRequest
            {
                Id = $"edge_start_{counter}",
                Source = startNodeId,
                Target = targetNodeId
            },
            new WorkflowEdgeRequest
            {
                Id = $"edge_end_{counter}",
                Source = targetNodeId,
                Target = endNodeId
            }
        };

        return new WorkflowDefinitionRequest
        {
            Name = workflowName,
            Description = $"Test workflow with {nodeType} node",
            Category = "General",
            Graph = new WorkflowGraphRequest
            {
                Nodes = nodes,
                Edges = edges
            },
            IsActive = true
        };
    }

    /// <summary>
    /// Generates a workflow definition with a condition node for branching.
    /// Graph: Start -> Condition (amount > 100) -> [True: ApprovalA, False: ApprovalB] -> End
    /// </summary>
    public static WorkflowDefinitionRequest GenerateWorkflowWithBranchingCondition()
    {
        var counter = GetNextId();
        var guid = Guid.NewGuid().ToString("N")[..8];
        var name = $"branching_wf_{counter}_{guid}";

        var nodes = new List<WorkflowNodeRequest>
        {
            new WorkflowNodeRequest { Id = "start", Type = "start", Data = new NodeDataRequest { Label = "Start", NodeType = "start" }, Position = new NodePositionRequest { X = 100, Y = 200 } },
            new WorkflowNodeRequest
            {
                Id = "condition_node",
                Type = "condition",
                Data = new NodeDataRequest
                {
                    Label = "金额 > 1000?",
                    NodeType = "condition",
                    Config = new {
                        condition = new {
                            branches = new[]
                            {
                                new { id = "true", label = "金额 > 1000", conditions = new[] { new { variable = "amount", @operator = "greater_than", value = "1000" } }, logicalOperator = "and", targetNodeId = "approval_a", order = 0 }
                            },
                            defaultNodeId = "approval_b"
                        }
                    }
                },
                Position = new NodePositionRequest { X = 400, Y = 200 }
            },
            new WorkflowNodeRequest
            {
                Id = "approval_a",
                Type = "approval",
                Data = new NodeDataRequest
                {
                    Label = "High Amount Approval",
                    NodeType = "approval",
                    Config = GenerateNodeConfig("approval")
                },
                Position = new NodePositionRequest { X = 700, Y = 100 }
            },
            new WorkflowNodeRequest
            {
                Id = "approval_b",
                Type = "approval",
                Data = new NodeDataRequest
                {
                    Label = "Low Amount Approval",
                    NodeType = "approval",
                    Config = GenerateNodeConfig("approval")
                },
                Position = new NodePositionRequest { X = 700, Y = 300 }
            },
            new WorkflowNodeRequest { Id = "end", Type = "end", Data = new NodeDataRequest { Label = "End", NodeType = "end" }, Position = new NodePositionRequest { X = 1000, Y = 200 } }
        };

        var edges = new List<WorkflowEdgeRequest>
        {
            new WorkflowEdgeRequest { Id = "e1", Source = "start", Target = "condition_node" },
            new WorkflowEdgeRequest { Id = "e2", Source = "condition_node", Target = "approval_a", SourceHandle = "true" },
            new WorkflowEdgeRequest { Id = "e3", Source = "condition_node", Target = "approval_b", SourceHandle = "default" },
            new WorkflowEdgeRequest { Id = "e4", Source = "approval_a", Target = "end" },
            new WorkflowEdgeRequest { Id = "e5", Source = "approval_b", Target = "end" }
        };

        return new WorkflowDefinitionRequest
        {
            Name = name,
            Category = "Testing",
            Graph = new WorkflowGraphRequest { Nodes = nodes, Edges = edges },
            IsActive = true
        };
    }


    /// <summary>
    /// Generates a complex approval workflow specifically for functional lifecycle testing.
    /// Graph: Start -> Approval -> End
    /// </summary>
    public static WorkflowDefinitionRequest GenerateComplexApprovalWorkflow(List<string>? approverIds = null)
    {
        var counter = GetNextId();
        var guid = Guid.NewGuid().ToString("N")[..8];
        var name = $"approval_wf_{counter}_{guid}";

        var nodes = new List<WorkflowNodeRequest>
        {
            new WorkflowNodeRequest { Id = "start", Type = NodeTypes.Start, Data = new NodeDataRequest { Label = "Start", NodeType = NodeTypes.Start }, Position = new NodePositionRequest { X = 100, Y = 200 } },
            new WorkflowNodeRequest
            {
                Id = "approval_node",
                Type = NodeTypes.Approval,
                Data = new NodeDataRequest
                {
                    Label = "Approver Approval",
                    NodeType = NodeTypes.Approval,
                    Config = GenerateNodeConfig(NodeTypes.Approval, approverIds)
                },
                Position = new NodePositionRequest { X = 400, Y = 200 }
            },
            new WorkflowNodeRequest { Id = "end", Type = NodeTypes.End, Data = new NodeDataRequest { Label = "End", NodeType = NodeTypes.End }, Position = new NodePositionRequest { X = 700, Y = 200 } }
        };

        var edges = new List<WorkflowEdgeRequest>
        {
            new WorkflowEdgeRequest { Id = "e1", Source = "start", Target = "approval_node" },
            new WorkflowEdgeRequest { Id = "e2", Source = "approval_node", Target = "end" }
        };

        return new WorkflowDefinitionRequest
        {
            Name = name,
            Category = "Approval",
            Graph = new WorkflowGraphRequest { Nodes = nodes, Edges = edges }
        };
    }

    /// <summary>
    /// Generates a workflow with condition node that branches based on amount threshold (1000).
    /// Flow: start -> condition (amount > 1000?) -> [true: high_amount_approval] / [false: low_amount_approval] -> end
    /// </summary>
    /// <param name="name">Workflow name</param>
    /// <param name="thresholdValue">Threshold value for condition (default: 1000)</param>
    /// <returns>A WorkflowDefinitionRequest with condition branching logic</returns>
    public static WorkflowDefinitionRequest GenerateConditionBranchWorkflow(string name = "Condition Branch Workflow", string thresholdValue = "1000")
    {
        var nodes = new List<WorkflowNodeRequest>
        {
            new WorkflowNodeRequest
            {
                Id = "start",
                Type = "start",
                Data = new NodeDataRequest
                {
                    Label = "开始",
                    NodeType = "start"
                },
                Position = new NodePositionRequest { X = 100, Y = 200 }
            },
            new WorkflowNodeRequest
            {
                Id = "condition_node",
                Type = "condition",
                Data = new NodeDataRequest
                {
                    Label = "金额判断",
                    NodeType = "condition",
                    Config = new
                    {
                        condition = new
                        {
                            branches = new[]
                            {
                                new { id = "true", label = "金额 > " + thresholdValue, conditions = new[] { new { variable = "amount", @operator = "greater_than", value = thresholdValue } }, logicalOperator = "and", targetNodeId = "high_amount_approval", order = 0 }
                            },
                            defaultNodeId = "low_amount_approval"
                        }
                    }
                },
                Position = new NodePositionRequest { X = 300, Y = 200 }
            },
            new WorkflowNodeRequest
            {
                Id = "high_amount_approval",
                Type = "approval",
                Data = new NodeDataRequest
                {
                    Label = "大额审批",
                    NodeType = "approval",
                    Config = new
                    {
                        approval = new
                        {
                            type = "any",
                            approvers = Array.Empty<object>(),
                            allowDelegate = false,
                            allowReject = true,
                            allowReturn = false
                        }
                    }
                },
                Position = new NodePositionRequest { X = 500, Y = 100 }
            },
            new WorkflowNodeRequest
            {
                Id = "low_amount_approval",
                Type = "approval",
                Data = new NodeDataRequest
                {
                    Label = "小额审批",
                    NodeType = "approval",
                    Config = new
                    {
                        approval = new
                        {
                            type = "any",
                            approvers = Array.Empty<object>(),
                            allowDelegate = false,
                            allowReject = true,
                            allowReturn = false
                        }
                    }
                },
                Position = new NodePositionRequest { X = 500, Y = 300 }
            },
            new WorkflowNodeRequest
            {
                Id = "end",
                Type = "end",
                Data = new NodeDataRequest
                {
                    Label = "结束",
                    NodeType = "end"
                },
                Position = new NodePositionRequest { X = 700, Y = 200 }
            }
        };

        var edges = new List<WorkflowEdgeRequest>
        {
            new WorkflowEdgeRequest { Id = "e1", Source = "start", Target = "condition_node" },
            new WorkflowEdgeRequest { Id = "e2", Source = "condition_node", Target = "high_amount_approval", SourceHandle = "true" },
            new WorkflowEdgeRequest { Id = "e3", Source = "condition_node", Target = "low_amount_approval", SourceHandle = "default" },
            new WorkflowEdgeRequest { Id = "e4", Source = "high_amount_approval", Target = "end" },
            new WorkflowEdgeRequest { Id = "e5", Source = "low_amount_approval", Target = "end" }
        };

        return new WorkflowDefinitionRequest
        {
            Name = name,
            Category = "Condition",
            Description = "测试条件分支工作流：金额大于" + thresholdValue + "走大额审批，否则走小额审批",
            Graph = new WorkflowGraphRequest { Nodes = nodes, Edges = edges },
            IsActive = true
        };
    }


    /// <summary>
    /// Generates a valid document with unique title and default content.
    /// Uses counter + GUID to ensure uniqueness across test runs.
    /// Format: "doc_{counter}_{guid}"
    /// </summary>
    /// <returns>A valid DocumentRequest with unique title and content.</returns>
    public static DocumentRequest GenerateValidDocument()
    {
        var counter = GetNextId();
        var guid = Guid.NewGuid().ToString("N")[..8];
        var docTitle = $"doc_{counter}_{guid}";

        return new DocumentRequest
        {
            Title = docTitle,
            Content = $"Test document content created at {DateTimeOffset.UtcNow:yyyy-MM-dd HH:mm:ss}",
            DocumentType = "Document",
            Category = "General"
        };
    }

    /// <summary>
    /// Generates a document with specified form data.
    /// Uses counter + GUID to ensure uniqueness across test runs.
    /// </summary>
    /// <param name="formData">The form data to include in the document.</param>
    /// <returns>A DocumentRequest with the specified form data.</returns>
    public static DocumentRequest GenerateDocumentWithFormData(Dictionary<string, object> formData)
    {
        var counter = GetNextId();
        var guid = Guid.NewGuid().ToString("N")[..8];
        var docTitle = $"doc_{counter}_{guid}";

        return new DocumentRequest
        {
            Title = docTitle,
            Content = $"Test document with form data created at {DateTimeOffset.UtcNow:yyyy-MM-dd HH:mm:ss}",
            DocumentType = "Document",
            Category = "General",
            FormData = formData
        };
    }

    /// <summary>
    /// 生成多条件 AND 逻辑的工作流
    /// 条件：金额 > 1000 且 部门 = Finance
    /// </summary>
    public static WorkflowDefinitionRequest GenerateWorkflowWithMultipleConditionsAND()
    {
        var counter = GetNextId();
        var guid = Guid.NewGuid().ToString("N")[..8];
        var name = $"multi_and_wf_{counter}_{guid}";

        var nodes = new List<WorkflowNodeRequest>
        {
            new WorkflowNodeRequest { Id = "start", Type = "start", Data = new NodeDataRequest { Label = "Start", NodeType = "start" }, Position = new NodePositionRequest { X = 100, Y = 200 } },
            new WorkflowNodeRequest
            {
                Id = "condition_node",
                Type = "condition",
                Data = new NodeDataRequest
                {
                    Label = "金额 > 1000 且 部门 = Finance?",
                    NodeType = "condition",
                    Config = new {
                        condition = new {
                            branches = new[]
                            {
                                new { id = "true", label = "金额 > 1000 且 部门 = Finance", conditions = new[] { new { variable = "amount", @operator = "greater_than", value = "1000" }, new { variable = "department", @operator = "equals", value = "Finance" } }, logicalOperator = "and", targetNodeId = "approval_a", order = 0 }
                            },
                            defaultNodeId = "approval_b"
                        }
                    }
                },
                Position = new NodePositionRequest { X = 400, Y = 200 }
            },
            new WorkflowNodeRequest
            {
                Id = "approval_a",
                Type = "approval",
                Data = new NodeDataRequest
                {
                    Label = "Finance High Amount Approval",
                    NodeType = "approval",
                    Config = GenerateNodeConfig("approval")
                },
                Position = new NodePositionRequest { X = 700, Y = 100 }
            },
            new WorkflowNodeRequest
            {
                Id = "approval_b",
                Type = "approval",
                Data = new NodeDataRequest
                {
                    Label = "Other Approval",
                    NodeType = "approval",
                    Config = GenerateNodeConfig("approval")
                },
                Position = new NodePositionRequest { X = 700, Y = 300 }
            },
            new WorkflowNodeRequest { Id = "end", Type = "end", Data = new NodeDataRequest { Label = "End", NodeType = "end" }, Position = new NodePositionRequest { X = 1000, Y = 200 } }
        };

        var edges = new List<WorkflowEdgeRequest>
        {
            new WorkflowEdgeRequest { Id = "e1", Source = "start", Target = "condition_node" },
            new WorkflowEdgeRequest { Id = "e2", Source = "condition_node", Target = "approval_a", SourceHandle = "true" },
            new WorkflowEdgeRequest { Id = "e3", Source = "condition_node", Target = "approval_b", SourceHandle = "default" },
            new WorkflowEdgeRequest { Id = "e4", Source = "approval_a", Target = "end" },
            new WorkflowEdgeRequest { Id = "e5", Source = "approval_b", Target = "end" }
        };

        return new WorkflowDefinitionRequest
        {
            Name = name,
            Category = "Testing",
            Graph = new WorkflowGraphRequest { Nodes = nodes, Edges = edges },
            IsActive = true
        };
    }

    /// <summary>
    /// 生成多条件 OR 逻辑的工作流
    /// 条件：金额 > 1000 或 isUrgent = true
    /// </summary>
    public static WorkflowDefinitionRequest GenerateWorkflowWithMultipleConditionsOR()
    {
        var counter = GetNextId();
        var guid = Guid.NewGuid().ToString("N")[..8];
        var name = $"multi_or_wf_{counter}_{guid}";

        var nodes = new List<WorkflowNodeRequest>
        {
            new WorkflowNodeRequest { Id = "start", Type = "start", Data = new NodeDataRequest { Label = "Start", NodeType = "start" }, Position = new NodePositionRequest { X = 100, Y = 200 } },
            new WorkflowNodeRequest
            {
                Id = "condition_node",
                Type = "condition",
                Data = new NodeDataRequest
                {
                    Label = "金额 > 1000 或 紧急?",
                    NodeType = "condition",
                    Config = new {
                        condition = new {
                            branches = new[]
                            {
                                new { id = "true", label = "金额 > 1000 或 紧急", conditions = new[] { new { variable = "amount", @operator = "greater_than", value = "1000" }, new { variable = "isUrgent", @operator = "equals", value = "true" } }, logicalOperator = "or", targetNodeId = "approval_a", order = 0 }
                            },
                            defaultNodeId = "approval_b"
                        }
                    }
                },
                Position = new NodePositionRequest { X = 400, Y = 200 }
            },
            new WorkflowNodeRequest
            {
                Id = "approval_a",
                Type = "approval",
                Data = new NodeDataRequest
                {
                    Label = "Priority Approval",
                    NodeType = "approval",
                    Config = GenerateNodeConfig("approval")
                },
                Position = new NodePositionRequest { X = 700, Y = 100 }
            },
            new WorkflowNodeRequest
            {
                Id = "approval_b",
                Type = "approval",
                Data = new NodeDataRequest
                {
                    Label = "Normal Approval",
                    NodeType = "approval",
                    Config = GenerateNodeConfig("approval")
                },
                Position = new NodePositionRequest { X = 700, Y = 300 }
            },
            new WorkflowNodeRequest { Id = "end", Type = "end", Data = new NodeDataRequest { Label = "End", NodeType = "end" }, Position = new NodePositionRequest { X = 1000, Y = 200 } }
        };

        var edges = new List<WorkflowEdgeRequest>
        {
            new WorkflowEdgeRequest { Id = "e1", Source = "start", Target = "condition_node" },
            new WorkflowEdgeRequest { Id = "e2", Source = "condition_node", Target = "approval_a", SourceHandle = "true" },
            new WorkflowEdgeRequest { Id = "e3", Source = "condition_node", Target = "approval_b", SourceHandle = "default" },
            new WorkflowEdgeRequest { Id = "e4", Source = "approval_a", Target = "end" },
            new WorkflowEdgeRequest { Id = "e5", Source = "approval_b", Target = "end" }
        };

        return new WorkflowDefinitionRequest
        {
            Name = name,
            Category = "Testing",
            Graph = new WorkflowGraphRequest { Nodes = nodes, Edges = edges },
            IsActive = true
        };
    }

    /// <summary>
    /// 生成字符串比较条件的工作流
    /// 条件：部门 = Finance
    /// </summary>
    public static WorkflowDefinitionRequest GenerateWorkflowWithStringCondition()
    {
        var counter = GetNextId();
        var guid = Guid.NewGuid().ToString("N")[..8];
        var name = $"string_cond_wf_{counter}_{guid}";

        var nodes = new List<WorkflowNodeRequest>
        {
            new WorkflowNodeRequest { Id = "start", Type = "start", Data = new NodeDataRequest { Label = "Start", NodeType = "start" }, Position = new NodePositionRequest { X = 100, Y = 200 } },
            new WorkflowNodeRequest
            {
                Id = "condition_node",
                Type = "condition",
                Data = new NodeDataRequest
                {
                    Label = "部门 = Finance?",
                    NodeType = "condition",
                    Config = new {
                        condition = new {
                            branches = new[]
                            {
                                new { id = "true", label = "部门 = Finance", conditions = new[] { new { variable = "department", @operator = "equals", value = "Finance" } }, logicalOperator = "and", targetNodeId = "approval_a", order = 0 }
                            },
                            defaultNodeId = "approval_b"
                        }
                    }
                },
                Position = new NodePositionRequest { X = 400, Y = 200 }
            },
            new WorkflowNodeRequest
            {
                Id = "approval_a",
                Type = "approval",
                Data = new NodeDataRequest
                {
                    Label = "Finance Approval",
                    NodeType = "approval",
                    Config = GenerateNodeConfig("approval")
                },
                Position = new NodePositionRequest { X = 700, Y = 100 }
            },
            new WorkflowNodeRequest
            {
                Id = "approval_b",
                Type = "approval",
                Data = new NodeDataRequest
                {
                    Label = "Other Department Approval",
                    NodeType = "approval",
                    Config = GenerateNodeConfig("approval")
                },
                Position = new NodePositionRequest { X = 700, Y = 300 }
            },
            new WorkflowNodeRequest { Id = "end", Type = "end", Data = new NodeDataRequest { Label = "End", NodeType = "end" }, Position = new NodePositionRequest { X = 1000, Y = 200 } }
        };

        var edges = new List<WorkflowEdgeRequest>
        {
            new WorkflowEdgeRequest { Id = "e1", Source = "start", Target = "condition_node" },
            new WorkflowEdgeRequest { Id = "e2", Source = "condition_node", Target = "approval_a", SourceHandle = "true" },
            new WorkflowEdgeRequest { Id = "e3", Source = "condition_node", Target = "approval_b", SourceHandle = "default" },
            new WorkflowEdgeRequest { Id = "e4", Source = "approval_a", Target = "end" },
            new WorkflowEdgeRequest { Id = "e5", Source = "approval_b", Target = "end" }
        };

        return new WorkflowDefinitionRequest
        {
            Name = name,
            Category = "Testing",
            Graph = new WorkflowGraphRequest { Nodes = nodes, Edges = edges },
            IsActive = true
        };
    }

    /// <summary>
    /// Generates appropriate configuration object for different node types.
    /// Returns null for node types that don't require configuration (start, end).
    /// </summary>
    /// <param name="nodeType">The type of node to generate configuration for.</param>
    /// <returns>A configuration object appropriate for the node type, or null if no config is needed.</returns>
    private static object? GenerateNodeConfig(string nodeType, List<string>? approverIds = null)
    {
        return nodeType switch
        {
            "start" => new { },
            "end" => new { },
            "approval" => new
            {
                approval = new
                {
                    type = "any",
                    approvers = (approverIds != null && approverIds.Count > 0)
                        ? approverIds.Select(id => new { type = "user", userId = id }).ToArray()
                        : Array.Empty<object>()
                }
            },
            "condition" => new
            {
                condition = new
                {
                    branches = Array.Empty<object>(),
                    defaultNodeId = ""
                }
            },
            _ => new { }
        };
    }

}

/// <summary>
/// Defines the types of validation errors that can be generated for testing.
/// </summary>
public enum InvalidationType
{
    /// <summary>
    /// Empty username (violates required field validation).
    /// </summary>
    EmptyUsername,

    /// <summary>
    /// Username shorter than minimum length (violates length validation).
    /// </summary>
    ShortUsername,

    /// <summary>
    /// Password shorter than minimum length (violates length validation).
    /// </summary>
    ShortPassword,

    /// <summary>
    /// Invalid email format (violates email format validation).
    /// </summary>
    InvalidEmail
}

/// <summary>
/// Represents a user registration request.
/// </summary>
public record RegisterRequest
{
    public string Username { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string? PhoneNumber { get; init; }
}

/// <summary>
/// Represents a user login request.
/// </summary>
public record LoginRequest
{
    public string Username { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
}
