use crate::types::ToolDefinition;
use serde_json::json;

/// Returns the tool definitions that agents can use to interact with the board.
/// These tools are executed on the frontend — the backend just passes them through.
pub fn board_tools() -> Vec<ToolDefinition> {
    vec![
        ToolDefinition {
            name: "create_task".to_string(),
            description: "Create a new task on the project board".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Title of the task"
                    },
                    "description": {
                        "type": "string",
                        "description": "Detailed description of the task"
                    },
                    "status": {
                        "type": "string",
                        "enum": ["backlog", "in_progress", "in_review", "done"],
                        "description": "Initial status column for the task"
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["low", "medium", "high", "urgent"],
                        "description": "Priority level"
                    },
                    "assigned_agent": {
                        "type": "string",
                        "enum": ["sage", "pixel", "atlas", "forge", "scout", "beacon"],
                        "description": "Agent to assign the task to"
                    }
                },
                "required": ["title", "description", "status", "priority"]
            }),
        },
        ToolDefinition {
            name: "update_task".to_string(),
            description: "Update an existing task's properties".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "task_id": {
                        "type": "string",
                        "description": "ID of the task to update"
                    },
                    "title": {
                        "type": "string",
                        "description": "New title"
                    },
                    "description": {
                        "type": "string",
                        "description": "New description"
                    },
                    "status": {
                        "type": "string",
                        "enum": ["backlog", "in_progress", "in_review", "done"],
                        "description": "New status"
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["low", "medium", "high", "urgent"],
                        "description": "New priority"
                    }
                },
                "required": ["task_id"]
            }),
        },
        ToolDefinition {
            name: "move_task".to_string(),
            description: "Move a task to a different status column".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "task_id": {
                        "type": "string",
                        "description": "ID of the task to move"
                    },
                    "new_status": {
                        "type": "string",
                        "enum": ["backlog", "in_progress", "in_review", "done"],
                        "description": "Target status column"
                    }
                },
                "required": ["task_id", "new_status"]
            }),
        },
        ToolDefinition {
            name: "list_tasks".to_string(),
            description: "List tasks on the project board, optionally filtered by status"
                .to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["backlog", "in_progress", "in_review", "done"],
                        "description": "Filter tasks by status (omit for all tasks)"
                    }
                }
            }),
        },
        ToolDefinition {
            name: "delete_task".to_string(),
            description: "Delete a task from the board".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "task_id": {
                        "type": "string",
                        "description": "ID of the task to delete"
                    }
                },
                "required": ["task_id"]
            }),
        },
    ]
}
