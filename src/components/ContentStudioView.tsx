import { useState, useEffect } from "react";
import {
  Sparkles,
  TrendingUp,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  XCircle,
  Copy,
  Check,
  Plus,
  Trash2,
  Clock,
  ShieldAlert,
  Coins,
  Youtube,
  Share2,
  Sliders,
  Eye,
  Send,
  Zap,
} from "lucide-react";
import {
  researchTrendingTopics,
  generateViralScript,
  loadDailyContentTasks,
  saveDailyContentTasks,
  loadUsageMetrics,
  TrendingTopicItem,
  ViralScriptOutput,
  ContentDailyTask,
  UsageMetrics,
} from "../services/contentPipelineService";
import {
  getAgentTasks,
  createAgentTask,
  updateTaskProgress,
  approveTask,
  cancelTask,
  retryTask,
  clearFinishedTasks,
  loadProactiveSettings,
  saveProactiveSettings,
  AgentTask,
  ProactiveSettings,
} from "../services/agentTaskQueue";

export default function ContentStudioView() {
  const [activeTab, setActiveTab] = useState<"trends" | "script" | "tasks" | "queue" | "proactive">("trends");

  // Trends State
  const [platform, setPlatform] = useState<"youtube" | "tiktok" | "facebook">("youtube");
  const [niche, setNiche] = useState("AI & Tech Innovations");
  const [trends, setTrends] = useState<TrendingTopicItem[]>([]);
  const [loadingTrends, setLoadingTrends] = useState(false);

  // Script Generator State
  const [scriptTopic, setScriptTopic] = useState("How Zoya AI runs with zero delay using multi-key rotation");
  const [scriptTone, setScriptTone] = useState("energetic");
  const [generatedScript, setGeneratedScript] = useState<ViralScriptOutput | null>(null);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Daily Tasks State
  const [dailyTasks, setDailyTasks] = useState<ContentDailyTask[]>([]);
  const [newTaskInput, setNewTaskInput] = useState("");

  // Agent Queue State
  const [agentTasks, setAgentTasks] = useState<AgentTask[]>([]);
  const [approvalModalTask, setApprovalModalTask] = useState<AgentTask | null>(null);

  // Proactive Settings State
  const [proactiveSettings, setProactiveSettings] = useState<ProactiveSettings>(loadProactiveSettings());

  // Metrics
  const [metrics, setMetrics] = useState<UsageMetrics>(loadUsageMetrics());

  // Initial load
  useEffect(() => {
    setDailyTasks(loadDailyContentTasks());
    setAgentTasks(getAgentTasks());
    setMetrics(loadUsageMetrics());
    setProactiveSettings(loadProactiveSettings());
    // Auto-fetch default trends if empty
    handleFetchTrends();
  }, []);

  const handleFetchTrends = async () => {
    setLoadingTrends(true);
    try {
      const items = await researchTrendingTopics(niche, platform);
      setTrends(items);
    } catch (e) {
      console.warn("Trend fetch error:", e);
    } finally {
      setLoadingTrends(false);
      setMetrics(loadUsageMetrics());
    }
  };

  const handleGenerateScript = async (topicOverride?: string) => {
    const targetTopic = topicOverride || scriptTopic;
    if (!targetTopic.trim()) return;

    setGeneratingScript(true);
    setActiveTab("script");
    setScriptTopic(targetTopic);

    // Queue as agent task
    const task = createAgentTask({
      title: `Generate 60s Viral Script: ${targetTopic.slice(0, 30)}...`,
      description: `Drafting script in Usman's energetic Hinglish style`,
      skillId: "skill-shortform-scriptwriter",
      priority: "high",
    });
    setAgentTasks(getAgentTasks());

    try {
      updateTaskProgress(task.id, { status: "running", progressPercent: 40 });
      const script = await generateViralScript(targetTopic, scriptTone);
      setGeneratedScript(script);

      updateTaskProgress(
        task.id,
        {
          status: "completed",
          progressPercent: 100,
          completedAt: Date.now(),
          artifacts: [
            {
              id: `art-${Date.now()}`,
              name: "Viral Script",
              type: "script",
              content: script.fullVoiceoverScript,
              createdAt: Date.now(),
            },
          ],
        },
        { level: "info", message: "Viral script generated successfully" }
      );
    } catch (e: any) {
      updateTaskProgress(task.id, {
        status: "failed",
        lastError: e?.message || "Generation error",
      });
    } finally {
      setGeneratingScript(false);
      setAgentTasks(getAgentTasks());
      setMetrics(loadUsageMetrics());
    }
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Add Task to Daily Notepad
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;

    const newTask: ContentDailyTask = {
      id: `task-${Date.now()}`,
      text: newTaskInput.trim(),
      category: "script",
      completed: false,
      createdAt: Date.now(),
    };

    const updated = [newTask, ...dailyTasks];
    setDailyTasks(updated);
    saveDailyContentTasks(updated);
    setNewTaskInput("");
  };

  const toggleTask = (id: string) => {
    const updated = dailyTasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    setDailyTasks(updated);
    saveDailyContentTasks(updated);
  };

  const deleteTask = (id: string) => {
    const updated = dailyTasks.filter((t) => t.id !== id);
    setDailyTasks(updated);
    saveDailyContentTasks(updated);
  };

  // Dispatch Multi-Step Social Draft (Requiring Human Approval)
  const handleQueueSocialDraft = () => {
    if (!generatedScript) return;

    const approvalTask = createAgentTask({
      title: `Schedule Post Draft to YouTube Shorts`,
      description: `Prepares community draft with hashtags and thumbnail concept`,
      skillId: "skill-social-scheduler",
      priority: "normal",
      requiresApproval: true,
      approvalData: {
        actionName: "Publish YouTube Shorts Draft",
        targetPlatform: "YouTube",
        summary: `Title: "${generatedScript.titles[0]}"`,
        draftContent: `${generatedScript.fullVoiceoverScript}\n\nTags: ${generatedScript.hashtags.join(" ")}`,
        riskNotice: "Draft requires your final review before sending or publishing.",
      },
    });

    updateTaskProgress(approvalTask.id, {
      status: "waiting_approval",
      currentStep: "Waiting for owner review and approval",
    });

    setAgentTasks(getAgentTasks());
    setActiveTab("queue");
  };

  const handleApprove = (taskId: string) => {
    approveTask(taskId);
    setApprovalModalTask(null);
    setAgentTasks(getAgentTasks());
    setTimeout(() => {
      updateTaskProgress(taskId, {
        status: "completed",
        progressPercent: 100,
        completedAt: Date.now(),
      }, { level: "info", message: "Draft verified and dispatched successfully!" });
      setAgentTasks(getAgentTasks());
    }, 1200);
  };

  return (
    <div className="flex-1 w-full flex flex-col h-full overflow-hidden bg-[#0A0C10] text-white">
      {/* Top Header */}
      <div className="shrink-0 px-4 py-3 sm:px-6 border-b border-white/10 bg-[#12141C] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Zap size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Zoya Content Creation Studio
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Agent Pipeline • Supreme Brain
              </span>
            </div>
            <p className="text-xs text-white/50">
              Autonomous trend discovery, 60s viral hooks, task scheduler, and multi-step approval
            </p>
          </div>
        </div>

        {/* Free-tier Cost Savings Counter */}
        <div className="hidden sm:flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
            <Coins size={14} />
            <span>${metrics.freeTierSavingsUsd.toFixed(2)} Saved</span>
          </div>
          <span className="text-[10px] text-white/40">Free Tier Active</span>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="shrink-0 px-4 py-2 border-b border-white/10 bg-[#0E1017] flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("trends")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "trends"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              : "text-white/60 hover:text-white"
          }`}
        >
          <TrendingUp size={14} />
          <span>Daily Trends</span>
        </button>

        <button
          onClick={() => setActiveTab("script")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "script"
              ? "bg-pink-500/20 text-pink-300 border border-pink-500/30"
              : "text-white/60 hover:text-white"
          }`}
        >
          <FileText size={14} />
          <span>60s Viral Script</span>
        </button>

        <button
          onClick={() => setActiveTab("tasks")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "tasks"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
              : "text-white/60 hover:text-white"
          }`}
        >
          <CheckCircle2 size={14} />
          <span>Task Sheet ({dailyTasks.filter((t) => !t.completed).length})</span>
        </button>

        <button
          onClick={() => setActiveTab("queue")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "queue"
              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
              : "text-white/60 hover:text-white"
          }`}
        >
          <Sliders size={14} />
          <span>Agent Queue ({agentTasks.filter((t) => t.status === "waiting_approval").length} Need Approval)</span>
        </button>

        <button
          onClick={() => setActiveTab("proactive")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "proactive"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              : "text-white/60 hover:text-white"
          }`}
        >
          <Clock size={14} />
          <span>Proactive & Quiet Hours</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* 1. DAILY TRENDING TAB */}
        {activeTab === "trends" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#141620] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as any)}
                  className="bg-[#0A0C10] border border-white/20 text-white rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-amber-400"
                >
                  <option value="youtube">YouTube Shorts</option>
                  <option value="tiktok">TikTok</option>
                  <option value="facebook">Facebook Reels</option>
                </select>

                <input
                  type="text"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="Topic niche (e.g. AI tools, tech hacks)"
                  className="flex-1 md:w-64 bg-[#0A0C10] border border-white/20 text-white rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                onClick={handleFetchTrends}
                disabled={loadingTrends}
                className="w-full md:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <RotateCw size={14} className={loadingTrends ? "animate-spin" : ""} />
                <span>{loadingTrends ? "Researching Trends..." : "Find Viral Trends"}</span>
              </button>
            </div>

            {/* Trends Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trends.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-[#12141C] border border-white/10 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Viral Score: {item.viralScore}/100
                      </span>
                      <span className="text-xs text-white/50">{item.estimatedViewsPotential}</span>
                    </div>

                    <h3 className="text-sm font-bold text-white leading-snug">{item.title}</h3>
                    <p className="text-xs text-white/60 leading-relaxed">
                      <strong className="text-amber-300/80">Hook Formula:</strong> {item.hookFormula}
                    </p>
                    <p className="text-xs text-white/60 leading-relaxed">
                      <strong className="text-pink-300/80">Usman's Angle:</strong> {item.suggestedAngle}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {item.tags.map((tag, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-white/50">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleGenerateScript(item.title)}
                    className="w-full py-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Sparkles size={14} />
                    <span>Generate 60s Script From This</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. 60S VIRAL SCRIPT TAB */}
        {activeTab === "script" && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-[#141620] border border-white/10 space-y-3">
              <label className="text-xs font-semibold text-white/70">Video Topic or Idea</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={scriptTopic}
                  onChange={(e) => setScriptTopic(e.target.value)}
                  placeholder="Enter video concept..."
                  className="flex-1 bg-[#0A0C10] border border-white/20 text-white rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-pink-400"
                />

                <select
                  value={scriptTone}
                  onChange={(e) => setScriptTone(e.target.value)}
                  className="bg-[#0A0C10] border border-white/20 text-white rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-pink-400"
                >
                  <option value="energetic">Energetic Hinglish</option>
                  <option value="inspirational">Motivational & Warm</option>
                  <option value="tech-deep-dive">Tech Breakdown</option>
                </select>

                <button
                  onClick={() => handleGenerateScript()}
                  disabled={generatingScript}
                  className="px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles size={14} className={generatingScript ? "animate-spin" : ""} />
                  <span>{generatingScript ? "Crafting Script..." : "Generate Script"}</span>
                </button>
              </div>
            </div>

            {generatedScript && (
              <div className="space-y-4">
                {/* 60s Hook-Retention Timeline Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="p-4 rounded-xl bg-[#141620] border border-pink-500/30 space-y-1.5">
                    <div className="text-[10px] font-bold text-pink-400 uppercase tracking-wider">
                      0:00 - 0:03 • Visual & Verbal Hook
                    </div>
                    <div className="text-xs font-medium text-white">{generatedScript.hook0to3s}</div>
                    <div className="text-[11px] text-pink-200/60 italic">Shot: {generatedScript.visualHook0to3s}</div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#141620] border border-white/10 space-y-1.5">
                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                      0:04 - 0:15 • Setup & Tension
                    </div>
                    <div className="text-xs font-medium text-white">{generatedScript.setup4to15s}</div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#141620] border border-white/10 space-y-1.5">
                    <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                      0:16 - 0:45 • Core Value & Proof
                    </div>
                    <div className="text-xs font-medium text-white">{generatedScript.coreValue16to45s}</div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#141620] border border-white/10 space-y-1.5">
                    <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                      0:46 - 0:60 • Viral CTA & Question
                    </div>
                    <div className="text-xs font-medium text-white">{generatedScript.cta46to60s}</div>
                  </div>
                </div>

                {/* Complete Voiceover Script */}
                <div className="p-5 rounded-2xl bg-[#141620] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white tracking-wide">
                      Full Continuous Voiceover (Hinglish Delivery)
                    </span>
                    <button
                      onClick={() => copyToClipboard(generatedScript.fullVoiceoverScript, "voiceover")}
                      className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors cursor-pointer"
                    >
                      {copiedField === "voiceover" ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      <span>{copiedField === "voiceover" ? "Copied" : "Copy Script"}</span>
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0A0C10] font-sans text-xs text-white/90 leading-relaxed whitespace-pre-line border border-white/5">
                    {generatedScript.fullVoiceoverScript}
                  </div>
                </div>

                {/* Titles & Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-[#141620] border border-white/10 space-y-3">
                    <div className="text-xs font-bold text-white">Suggested High-CTR Titles</div>
                    <div className="space-y-2">
                      {generatedScript.titles.map((title, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-[#0A0C10] text-xs font-medium text-white/80 flex items-center justify-between group"
                        >
                          <span>{title}</span>
                          <button
                            onClick={() => copyToClipboard(title, `title-${idx}`)}
                            className="text-white/40 hover:text-white cursor-pointer"
                          >
                            {copiedField === `title-${idx}` ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#141620] border border-white/10 space-y-3">
                    <div className="text-xs font-bold text-white">Thumbnail Visual Concept</div>
                    <div className="p-3 rounded-xl bg-[#0A0C10] text-xs text-white/70 italic border border-white/5">
                      "{generatedScript.thumbnailConcept}"
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={handleQueueSocialDraft}
                        className="w-full py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Share2 size={14} />
                        <span>Schedule Multi-Channel Draft (Needs Approval)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. DAILY TASK SHEET TAB */}
        {activeTab === "tasks" && (
          <div className="space-y-4">
            <form onSubmit={handleAddTask} className="flex gap-2">
              <input
                type="text"
                value={newTaskInput}
                onChange={(e) => setNewTaskInput(e.target.value)}
                placeholder="Add daily content task (e.g. Record 3 B-roll clips for Zoya demo)..."
                className="flex-1 bg-[#141620] border border-white/20 text-white rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus size={16} />
                <span>Add Task</span>
              </button>
            </form>

            <div className="space-y-2">
              {dailyTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                    task.completed
                      ? "bg-[#141620]/40 border-white/5 text-white/40 line-through"
                      : "bg-[#141620] border-white/10 text-white"
                  }`}
                >
                  <div
                    onClick={() => toggleTask(task.id)}
                    className="flex items-center gap-3 cursor-pointer flex-1"
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                        task.completed
                          ? "bg-emerald-500 border-emerald-500 text-black"
                          : "border-white/30 hover:border-cyan-400"
                      }`}
                    >
                      {task.completed && <Check size={12} strokeWidth={3} />}
                    </div>
                    <span className="text-xs font-medium">{task.text}</span>
                  </div>

                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-white/30 hover:text-rose-400 p-1 cursor-pointer transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. AGENT TASK QUEUE TAB */}
        {activeTab === "queue" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/60">
                Active & Checkpointed Tasks ({agentTasks.length})
              </span>
              <button
                onClick={() => {
                  clearFinishedTasks();
                  setAgentTasks(getAgentTasks());
                }}
                className="text-xs text-white/50 hover:text-white cursor-pointer"
              >
                Clear Finished
              </button>
            </div>

            <div className="space-y-3">
              {agentTasks.map((task) => {
                const isWaiting = task.status === "waiting_approval";
                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-xl border transition-all space-y-3 ${
                      isWaiting
                        ? "bg-purple-500/10 border-purple-500/40"
                        : task.status === "failed"
                        ? "bg-rose-500/10 border-rose-500/30"
                        : "bg-[#141620] border-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            isWaiting
                              ? "bg-purple-500 text-white animate-pulse"
                              : task.status === "completed"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : task.status === "running"
                              ? "bg-cyan-500/20 text-cyan-400"
                              : "bg-white/10 text-white/60"
                          }`}
                        >
                          {task.status.replace("_", " ")}
                        </span>
                        <span className="text-xs font-bold text-white">{task.title}</span>
                      </div>

                      {isWaiting && (
                        <button
                          onClick={() => setApprovalModalTask(task)}
                          className="px-3 py-1 rounded-lg bg-purple-500 hover:bg-purple-400 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye size={12} />
                          <span>Review & Approve</span>
                        </button>
                      )}
                    </div>

                    <div className="text-xs text-white/60">{task.description}</div>

                    {/* Progress Bar */}
                    <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-pink-500 h-full transition-all duration-300"
                        style={{ width: `${task.progressPercent}%` }}
                      />
                    </div>

                    {/* Error & Logs */}
                    {task.lastError && (
                      <div className="text-xs text-rose-400 font-mono">Error: {task.lastError}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. PROACTIVE & QUIET HOURS TAB */}
        {activeTab === "proactive" && (
          <div className="p-6 rounded-2xl bg-[#141620] border border-white/10 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Proactive Autonomous Suggestions</h3>
                <p className="text-xs text-white/50">Allow Zoya to prepare daily topics in background without prompting</p>
              </div>
              <input
                type="checkbox"
                checked={proactiveSettings.optInEnabled}
                onChange={(e) => {
                  const updated = { ...proactiveSettings, optInEnabled: e.target.checked };
                  setProactiveSettings(updated);
                  saveProactiveSettings(updated);
                }}
                className="w-5 h-5 accent-pink-500 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs text-white/60">Quiet Hours Start</label>
                <input
                  type="time"
                  value={proactiveSettings.quietHoursStart}
                  onChange={(e) => {
                    const updated = { ...proactiveSettings, quietHoursStart: e.target.value };
                    setProactiveSettings(updated);
                    saveProactiveSettings(updated);
                  }}
                  className="w-full bg-[#0A0C10] border border-white/20 text-white rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-white/60">Quiet Hours End</label>
                <input
                  type="time"
                  value={proactiveSettings.quietHoursEnd}
                  onChange={(e) => {
                    const updated = { ...proactiveSettings, quietHoursEnd: e.target.value };
                    setProactiveSettings(updated);
                    saveProactiveSettings(updated);
                  }}
                  className="w-full bg-[#0A0C10] border border-white/20 text-white rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-white/60">Max Autonomous Tasks Per Day</label>
              <input
                type="number"
                min={1}
                max={10}
                value={proactiveSettings.maxTasksPerDay}
                onChange={(e) => {
                  const updated = { ...proactiveSettings, maxTasksPerDay: Number(e.target.value) };
                  setProactiveSettings(updated);
                  saveProactiveSettings(updated);
                }}
                className="w-full bg-[#0A0C10] border border-white/20 text-white rounded-xl px-3 py-2 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* HUMAN APPROVAL MODAL */}
      {approvalModalTask && approvalModalTask.approvalData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141620] border border-purple-500/40 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                <ShieldAlert size={18} />
                <span>Owner Approval Required</span>
              </div>
              <button onClick={() => setApprovalModalTask(null)} className="text-white/40 hover:text-white">
                <XCircle size={18} />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200">
              {approvalModalTask.approvalData.riskNotice}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-white/60">Action Summary</div>
              <div className="text-xs text-white font-medium bg-[#0A0C10] p-3 rounded-lg border border-white/10">
                {approvalModalTask.approvalData.summary}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-white/60">Draft Payload</div>
              <pre className="text-xs text-white/80 bg-[#0A0C10] p-3 rounded-lg border border-white/10 max-h-40 overflow-y-auto whitespace-pre-wrap font-sans">
                {approvalModalTask.approvalData.draftContent}
              </pre>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  cancelTask(approvalModalTask.id, "Rejected by owner");
                  setApprovalModalTask(null);
                  setAgentTasks(getAgentTasks());
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold transition-all cursor-pointer"
              >
                Reject / Discard
              </button>

              <button
                onClick={() => handleApprove(approvalModalTask.id)}
                className="flex-1 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Approve & Execute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
