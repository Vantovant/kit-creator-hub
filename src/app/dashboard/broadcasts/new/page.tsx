// New broadcast page

import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Bold,
  Italic,
  Underline,
  Link,
  Image,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Quote,
  Code,
  Undo,
  Redo,
  Eye,
  Send,
  Save,
  Clock,
  Users,
  ChevronDown,
  X,
  Plus,
} from "lucide-react";

const toolbarButtons = [
  { icon: Bold, label: "Bold", shortcut: "Ctrl+B" },
  { icon: Italic, label: "Italic", shortcut: "Ctrl+I" },
  { icon: Underline, label: "Underline", shortcut: "Ctrl+U" },
  { type: "divider" },
  { icon: Heading1, label: "Heading 1" },
  { icon: Heading2, label: "Heading 2" },
  { type: "divider" },
  { icon: List, label: "Bullet List" },
  { icon: ListOrdered, label: "Numbered List" },
  { type: "divider" },
  { icon: AlignLeft, label: "Align Left" },
  { icon: AlignCenter, label: "Align Center" },
  { icon: AlignRight, label: "Align Right" },
  { type: "divider" },
  { icon: Link, label: "Insert Link" },
  { icon: Image, label: "Insert Image" },
  { icon: Quote, label: "Quote" },
  { icon: Code, label: "Code" },
];

const emailTemplates = [
  { id: 1, name: "Blank", description: "Start from scratch" },
  { id: 2, name: "Newsletter", description: "Classic newsletter layout" },
  { id: 3, name: "Announcement", description: "Product or feature announcement" },
  { id: 4, name: "Welcome", description: "Welcome new subscribers" },
];

const contentBlocks = [
  { id: "text", icon: AlignLeft, label: "Text Block" },
  { id: "image", icon: Image, label: "Image" },
  { id: "button", icon: Link, label: "Button" },
  { id: "divider", icon: Code, label: "Divider" },
];

export default function NewBroadcastPage() {
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>(["All Subscribers"]);
  const [showPreview, setShowPreview] = useState(false);

  const handleRemoveTag = (tag: string) => {
    setSelectedTags(selectedTags.filter((t) => t !== tag));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader
        title="New Broadcast"
        subtitle="Create and send an email to your subscribers"
      />

      <main className="p-6">
        <div className="max-w-6xl mx-auto">
          {/* Top action bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Undo className="w-4 h-4" />
                Undo
              </button>
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Redo className="w-4 h-4" />
                Redo
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Draft
              </button>
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Clock className="w-4 h-4" />
                Schedule
              </button>
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 bg-[#5CC5DE] hover:bg-[#4AB5CE] text-black font-medium rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
                Send Now
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main editor */}
            <div className="lg:col-span-2 space-y-4">
              {/* Recipients */}
              <Card className="bg-white dark:bg-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Label className="text-sm font-medium w-20 dark:text-gray-200">To:</Label>
                    <div className="flex-1 flex items-center gap-2 flex-wrap">
                      {selectedTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="flex items-center gap-1 bg-[#5CC5DE]/20 text-[#5CC5DE] dark:bg-[#5CC5DE]/30"
                        >
                          <Users className="w-3 h-3" />
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 hover:bg-[#5CC5DE]/30 rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                      <button
                        type="button"
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <Plus className="w-4 h-4" />
                        Add segment
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Subject line */}
              <Card className="bg-white dark:bg-gray-800">
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Label className="text-sm font-medium w-20 dark:text-gray-200">Subject:</Label>
                      <Input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Write a compelling subject line..."
                        className="flex-1 dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <Label className="text-sm font-medium w-20 dark:text-gray-200">Preview:</Label>
                      <Input
                        value={previewText}
                        onChange={(e) => setPreviewText(e.target.value)}
                        placeholder="Preview text shown in inbox..."
                        className="flex-1 dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Editor */}
              <Card className="bg-white dark:bg-gray-800">
                <CardContent className="p-0">
                  {/* Toolbar */}
                  <div className="flex items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700 flex-wrap">
                    {toolbarButtons.map((button, index) =>
                      button.type === "divider" ? (
                        <div
                          key={`divider-${index}`}
                          className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1"
                        />
                      ) : (
                        <button
                          key={button.label}
                          type="button"
                          title={button.label}
                          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                        >
                          {button.icon && <button.icon className="w-4 h-4" />}
                        </button>
                      )
                    )}
                  </div>

                  {/* Content area */}
                  <div className="min-h-[400px] p-6">
                    <Textarea
                      value={emailContent}
                      onChange={(e) => setEmailContent(e.target.value)}
                      placeholder="Start writing your email content here...

You can use the toolbar above to format your text, add images, links, and more.

Tips for great emails:
- Keep your subject line under 50 characters
- Use a clear call-to-action
- Personalize with subscriber's first name
- Keep paragraphs short and scannable"
                      className="min-h-[350px] border-none shadow-none focus-visible:ring-0 resize-none text-base dark:bg-gray-800 dark:text-gray-200"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Content blocks */}
              <Card className="bg-white dark:bg-gray-800">
                <CardContent className="p-4">
                  <h3 className="font-medium mb-4 dark:text-gray-200">Add Content Block</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {contentBlocks.map((block) => (
                      <button
                        key={block.id}
                        type="button"
                        className="flex flex-col items-center gap-2 p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-[#5CC5DE] transition-colors"
                      >
                        <block.icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        <span className="text-xs text-gray-600 dark:text-gray-300">{block.label}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Email settings */}
              <Card className="bg-white dark:bg-gray-800">
                <CardContent className="p-4">
                  <h3 className="font-medium mb-4 dark:text-gray-200">Email Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm text-gray-500 dark:text-gray-400">From Name</Label>
                      <Input
                        defaultValue="John Doe"
                        className="mt-1 dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500 dark:text-gray-400">Reply-to Email</Label>
                      <Input
                        defaultValue="john@example.com"
                        className="mt-1 dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Templates */}
              <Card className="bg-white dark:bg-gray-800">
                <CardContent className="p-4">
                  <h3 className="font-medium mb-4 dark:text-gray-200">Templates</h3>
                  <div className="space-y-2">
                    {emailTemplates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        className="w-full text-left p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-[#5CC5DE] transition-colors"
                      >
                        <p className="font-medium text-sm dark:text-gray-200">{template.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {template.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
