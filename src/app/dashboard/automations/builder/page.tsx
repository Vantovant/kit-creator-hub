"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Play,
  Pause,
  Save,
  Mail,
  Clock,
  Users,
  Tag,
  Filter,
  Zap,
  GitBranch,
  ArrowDown,
  Trash2,
  GripVertical,
  Settings,
  ChevronDown,
  UserPlus,
  ShoppingCart,
  MousePointerClick,
  Calendar,
} from "lucide-react";

interface WorkflowNode {
  id: string;
  type: "trigger" | "action" | "condition" | "delay";
  config: {
    name: string;
    description?: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  };
}

const triggerOptions = [
  { id: "subscribe", name: "Subscribes to a form", icon: UserPlus, color: "#5CC5DE" },
  { id: "tag_added", name: "Tag is added", icon: Tag, color: "#7BC47F" },
  { id: "purchase", name: "Makes a purchase", icon: ShoppingCart, color: "#E8B86D" },
  { id: "link_click", name: "Clicks a link", icon: MousePointerClick, color: "#9B8BDE" },
  { id: "date", name: "Date-based trigger", icon: Calendar, color: "#E88B8B" },
];

const actionOptions = [
  { id: "send_email", name: "Send an email", icon: Mail, color: "#5CC5DE" },
  { id: "add_tag", name: "Add a tag", icon: Tag, color: "#7BC47F" },
  { id: "remove_tag", name: "Remove a tag", icon: Tag, color: "#E88B8B" },
  { id: "add_to_sequence", name: "Add to sequence", icon: Zap, color: "#9B8BDE" },
  { id: "update_field", name: "Update custom field", icon: Settings, color: "#E8B86D" },
];

const defaultWorkflow: WorkflowNode[] = [
  {
    id: "1",
    type: "trigger",
    config: { name: "Subscribes to a form", icon: UserPlus, color: "#5CC5DE" },
  },
];

export default function AutomationBuilderPage() {
  const [workflowName, setWorkflowName] = useState("New Automation");
  const [workflow, setWorkflow] = useState<WorkflowNode[]>(defaultWorkflow);
  const [showAddMenu, setShowAddMenu] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);

  const addNode = (afterId: string, type: WorkflowNode["type"], config: WorkflowNode["config"]) => {
    const newNode: WorkflowNode = {
      id: Date.now().toString(),
      type,
      config,
    };
    const index = workflow.findIndex((n) => n.id === afterId);
    const newWorkflow = [...workflow];
    newWorkflow.splice(index + 1, 0, newNode);
    setWorkflow(newWorkflow);
    setShowAddMenu(null);
  };

  const removeNode = (id: string) => {
    if (workflow.length > 1) {
      setWorkflow(workflow.filter((n) => n.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <DashboardHeader
        title="Automation Builder"
        subtitle="Create visual email automation workflows"
      />

      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header bar */}
          <Card className="bg-white dark:bg-gray-800 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Input
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 w-64 dark:bg-gray-800"
                  />
                  <Badge variant="secondary" className={isActive ? "bg-green-100 text-green-700" : ""}>
                    {isActive ? "Active" : "Draft"}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      isActive
                        ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                    }`}
                  >
                    {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {isActive ? "Pause" : "Activate"}
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 bg-[#5CC5DE] hover:bg-[#4AB5CE] text-black font-medium rounded-lg transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Workflow canvas */}
          <div className="flex flex-col items-center">
            {workflow.map((node, index) => (
              <div key={node.id} className="flex flex-col items-center">
                {/* Node */}
                <div className="relative group">
                  <Card className="bg-white dark:bg-gray-800 w-80 hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div
                          className="p-3 rounded-xl"
                          style={{ backgroundColor: `${node.config.color}20` }}
                        >
                          <node.config.icon
                            className="w-6 h-6"
                            style={{ color: node.config.color }}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <Badge
                              variant="outline"
                              className="text-xs capitalize mb-1"
                            >
                              {node.type}
                            </Badge>
                            {index > 0 && (
                              <button
                                type="button"
                                onClick={() => removeNode(node.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">
                            {node.config.name}
                          </h3>
                          {node.config.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {node.config.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Drag handle */}
                  <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab">
                    <GripVertical className="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                {/* Connector and Add button */}
                <div className="relative py-4">
                  <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-auto" />

                  {/* Add node button */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowAddMenu(showAddMenu === node.id ? null : node.id)}
                        className="w-8 h-8 rounded-full bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center hover:border-[#5CC5DE] hover:text-[#5CC5DE] transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>

                      {/* Add menu dropdown */}
                      {showAddMenu === node.id && (
                        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-10">
                          <div className="p-2">
                            <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                              Actions
                            </p>
                            {actionOptions.map((action) => (
                              <button
                                key={action.id}
                                type="button"
                                onClick={() => addNode(node.id, "action", {
                                  name: action.name,
                                  icon: action.icon,
                                  color: action.color,
                                })}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              >
                                <action.icon className="w-4 h-4" style={{ color: action.color }} />
                                <span className="text-sm text-gray-700 dark:text-gray-200">
                                  {action.name}
                                </span>
                              </button>
                            ))}

                            <div className="border-t border-gray-100 dark:border-gray-700 my-2" />

                            <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                              Flow Control
                            </p>
                            <button
                              type="button"
                              onClick={() => addNode(node.id, "delay", {
                                name: "Wait",
                                description: "1 day",
                                icon: Clock,
                                color: "#94A3B8",
                              })}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <Clock className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-700 dark:text-gray-200">
                                Add delay
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => addNode(node.id, "condition", {
                                name: "If/Else condition",
                                description: "Split based on rules",
                                icon: GitBranch,
                                color: "#9B8BDE",
                              })}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <GitBranch className="w-4 h-4 text-purple-500" />
                              <span className="text-sm text-gray-700 dark:text-gray-200">
                                Add condition
                              </span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* End node */}
            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-gray-400 dark:bg-gray-500" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">End of automation</p>
          </div>

          {/* Sidebar - Templates */}
          <Card className="bg-white dark:bg-gray-800 mt-8">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Quick Start Templates
              </h3>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { name: "Welcome Series", steps: 4, icon: UserPlus },
                  { name: "Re-engagement", steps: 3, icon: Users },
                  { name: "Product Launch", steps: 5, icon: Zap },
                ].map((template) => (
                  <button
                    key={template.name}
                    type="button"
                    className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-[#5CC5DE] hover:bg-[#5CC5DE]/5 transition-colors text-left"
                  >
                    <template.icon className="w-5 h-5 text-[#5CC5DE]" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{template.name}</p>
                      <p className="text-xs text-gray-500">{template.steps} steps</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
