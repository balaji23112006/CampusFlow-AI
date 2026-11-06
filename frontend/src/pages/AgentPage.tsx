import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  Bot, 
  Send, 
  User as UserIcon, 
  Sparkles, 
  CheckCircle2, 
  BookOpen,
} from 'lucide-react';
import { CampusFlowCanvas } from '../components/3d/CampusFlowCanvas';
import type { AgentVisualState } from '../components/3d/AgentStatusBadge';
import type { ChatMessage } from '../types';
import { useAuth } from '../context/AuthContext';
import { useGsapAnimations } from '../hooks/useGsapAnimations';

const renderInlineFormatting = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="font-mono bg-slate-800 text-amber-300 px-1 py-0.5 rounded text-[11px]">{part.slice(1, -1)}</code>;
    }
    return part;
  });
};

const renderFormattedMessage = (content: string) => {
  const lines = content.split('\n');
  return lines.map((line, idx) => {
    if (line.startsWith('### ')) {
      return (
        <h3 key={idx} className="text-xs sm:text-sm font-extrabold text-amber-400 mt-2.5 mb-1 flex items-center gap-1.5">
          {line.replace('### ', '')}
        </h3>
      );
    }
    if (line.startsWith('## ')) {
      return (
        <h2 key={idx} className="text-sm sm:text-base font-extrabold text-white mt-3 mb-1">
          {line.replace('## ', '')}
        </h2>
      );
    }
    if (line.startsWith('> ')) {
      return (
        <blockquote key={idx} className="border-l-2 border-amber-500/60 pl-3 py-1 my-1.5 text-slate-300 italic bg-amber-500/5 rounded-r">
          {renderInlineFormatting(line.replace('> ', ''))}
        </blockquote>
      );
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <div key={idx} className="flex items-start gap-2 my-0.5 pl-1.5 text-slate-200 leading-relaxed">
          <span className="text-amber-400 font-bold text-sm leading-none mt-0.5">•</span>
          <span>{renderInlineFormatting(line.substring(2))}</span>
        </div>
      );
    }
    const numMatch = line.match(/^(\d+\.)\s+(.*)/);
    if (numMatch) {
      return (
        <div key={idx} className="flex items-start gap-2 my-0.5 pl-1.5 text-slate-200 leading-relaxed">
          <span className="text-amber-400 font-bold font-mono text-[11px] shrink-0 mt-0.5">{numMatch[1]}</span>
          <span>{renderInlineFormatting(numMatch[2])}</span>
        </div>
      );
    }
    if (!line.trim()) {
      return <div key={idx} className="h-1.5" />;
    }
    return (
      <p key={idx} className="my-0.5 text-slate-200 leading-relaxed">
        {renderInlineFormatting(line)}
      </p>
    );
  });
};

export const AgentPage: React.FC = () => {
  const containerRef = useGsapAnimations();
  const location = useLocation();
  const { user, accessToken } = useAuth();
  const initialPromptFromState = location.state?.initialPrompt || '';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>(initialPromptFromState);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [currentState, setCurrentState] = useState<string>('draft');
  const [agent3DStatus, setAgent3DStatus] = useState<AgentVisualState>('IDLE');
  const [showRAGPanel, setShowRAGPanel] = useState<boolean>(false);
  const [retrievedPolicies, setRetrievedPolicies] = useState<any[]>([]);

  useEffect(() => {
    // Initial greeting based on authenticated user
    const greetingMsg: ChatMessage = {
      id: 'm-initial',
      sender: 'agent',
      content: `Hello ${user?.name || 'Student'}! I am CampusFlow AI, your autonomous university administrative agent. I can help you initiate, track, or complete your Internship NOC approval, course overloads, and official document requests. How can I assist you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedActions: [
        'What is the duration of the Summer Internship?',
        'What documents do I need for NOC?'
      ]
    };
    setMessages([greetingMsg]);

    if (initialPromptFromState) {
      handleSend(initialPromptFromState);
    }
  }, [user]);

  const workflowStages = [
    { code: 'draft', label: '1. Goal Analyzed' },
    { code: 'planning', label: '2. Policy Check' },
    { code: 'document_verification', label: '3. Doc Verification' },
    { code: 'waiting_for_approval', label: '4. Staff Sign-off' },
    { code: 'completed', label: '5. NOC Certificate Issued' }
  ];

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsTyping(true);
    setAgent3DStatus('SEARCHING');

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

    try {
      const response = await fetch(`${API_BASE_URL}/agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ message: query })
      });
      
      if (!response.ok) throw new Error("Failed to communicate with agent backend");
      
      const data = await response.json();
      
      setRetrievedPolicies(data.retrieved_policies || []);
      if (data.retrieved_policies && data.retrieved_policies.length > 0) {
        setShowRAGPanel(true);
      }
      
      setCurrentState(data.workflow_status || 'waiting_for_approval');
      
      const statusMap: Record<string, AgentVisualState> = {
        'waiting_for_document': 'VERIFYING',
        'waiting_for_approval': 'WAITING_APPROVAL',
        'approved': 'IDLE',
        'completed': 'IDLE',
        'draft': 'SEARCHING',
        'planning': 'THINKING',
      };
      setAgent3DStatus(statusMap[data.workflow_status] || 'IDLE');
      
      const agentMsg: ChatMessage = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        content: data.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: data.suggested_actions || [],
        attachedWorkflowId: data.attached_workflow_id
      };
      
      setMessages((prev) => [...prev, agentMsg]);
      
    } catch (err) {
      console.error(err);
      setAgent3DStatus('IDLE');
      setMessages((prev) => [...prev, {
        id: `agent-err-${Date.now()}`,
        sender: 'agent',
        content: 'Sorry, I encountered an error communicating with the CampusFlow backend. Please ensure the server is running.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div ref={containerRef} className="h-[calc(100vh-6rem)] flex flex-col bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl text-left max-w-7xl mx-auto backdrop-blur-xl">
      {/* Top Header & Pipeline Progress Tracker */}
      <div className="gsap-animate-header bg-slate-950 border-b border-slate-800 p-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
            <Bot className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-2">
              CampusFlow AI Agent Workspace
              <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
                Live RAG Integration
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 font-medium flex items-center gap-2">
              <span>Student: <strong className="text-slate-200">{user?.name || 'Student'}</strong></span>
              {user?.rollNumber && (
                <span className="font-mono text-amber-400 font-bold">({user.rollNumber})</span>
              )}
            </p>
          </div>
        </div>

        {/* Stage Progress Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
          {workflowStages.map((stg, idx) => {
            const isCurrent = stg.code === currentState;
            return (
              <div key={stg.code} className="flex items-center gap-1">
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-xl transition-all ${
                    isCurrent
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-extrabold scale-105'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  {stg.label}
                </span>
                {idx < workflowStages.length - 1 && <span className="text-slate-600 text-[10px] font-bold">→</span>}
              </div>
            );
          })}
        </div>

        {/* RAG Drawer Toggle Button */}
        <button
          onClick={() => setShowRAGPanel(!showRAGPanel)}
          className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1.5 font-bold cursor-pointer bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl transition"
        >
          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
          <span>{showRAGPanel ? 'Hide RAG Context' : 'View RAG Context'}</span>
        </button>
      </div>

      {/* Dynamic RAG Context Panel */}
      {showRAGPanel && (
        <div className="bg-amber-950/20 border-b border-amber-500/20 p-4 text-xs space-y-3 text-left shrink-0">
          <p className="font-bold text-amber-300 flex items-center gap-2 text-xs">
            <Sparkles className="w-4 h-4 text-amber-400" /> Retrieved RAG Sources:
          </p>
          {retrievedPolicies.length > 0 ? (
            <>
              {/* University Sources */}
              {retrievedPolicies.filter((p: any) => (p.knowledge_scope || 'UNIVERSITY') === 'UNIVERSITY').length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">University Sources</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-slate-300 font-mono text-[11px]">
                    {retrievedPolicies.filter((p: any) => (p.knowledge_scope || 'UNIVERSITY') === 'UNIVERSITY').map((policy: any, idx: number) => (
                      <div key={`uni-${idx}`} className="bg-slate-950 p-3 rounded-xl border border-emerald-500/20 space-y-1">
                        <span className="text-emerald-400 font-bold block">{policy.title} (Score: {policy.similarity_score?.toFixed(2)})</span>
                        <p className="text-slate-400 text-[11px] line-clamp-3">{policy.content || policy.rule}</p>
                        <p className="text-emerald-500/70 text-[9px] mt-1 break-all">Source: {policy.source_file || (policy.metadata?.source_file)} | Scope: UNIVERSITY</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Student Document Sources */}
              {retrievedPolicies.filter((p: any) => p.knowledge_scope === 'STUDENT').length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Your Documents</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-slate-300 font-mono text-[11px]">
                    {retrievedPolicies.filter((p: any) => p.knowledge_scope === 'STUDENT').map((policy: any, idx: number) => (
                      <div key={`stu-${idx}`} className="bg-slate-950 p-3 rounded-xl border border-blue-500/20 space-y-1">
                        <span className="text-blue-400 font-bold block">{policy.title} (Score: {policy.similarity_score?.toFixed(2)})</span>
                        <p className="text-slate-400 text-[11px] line-clamp-3">{policy.content || policy.rule}</p>
                        <p className="text-blue-500/70 text-[9px] mt-1 break-all">Source: {policy.source_file || (policy.metadata?.source_file)} | Scope: STUDENT</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* If none have knowledge_scope set (legacy), show generically */}
              {retrievedPolicies.every((p: any) => !p.knowledge_scope) && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-slate-300 font-mono text-[11px]">
                  {retrievedPolicies.map((policy: any, idx: number) => (
                    <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-amber-400 font-bold block">{policy.title} (Score: {policy.similarity_score?.toFixed(2)})</span>
                      <p className="text-slate-400 text-[11px] line-clamp-3">{policy.content || policy.rule}</p>
                      <p className="text-amber-500/70 text-[9px] mt-1 break-all">Source: {policy.source_file || (policy.metadata?.source_file)}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-slate-500">
              No sources retrieved yet. Ask a question to search the SRMAP knowledge base and your uploaded documents.
            </div>
          )}
        </div>
      )}

      {/* Workspace Body: Left 3D Agent Visual Stage / Right Interactive Trace & Chat */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Column: 3D CampusFlow Agent Visual Canvas Centerpiece */}
        <div className="gsap-animate-card w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-800/80 p-4 bg-slate-950/90 flex flex-col justify-between space-y-4 shrink-0">
          <CampusFlowCanvas
            status={agent3DStatus}
            activityText={isTyping ? 'Executing LangGraph node tools...' : undefined}
            showNodes={true}
            className="h-full min-h-[260px] w-full"
          />

          <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 text-[11px] text-slate-300 space-y-1 text-left">
            <div className="flex items-center justify-between font-bold text-amber-400">
              <span>Agent Visual State:</span>
              <span className="font-mono text-xs">{agent3DStatus}</span>
            </div>
            <p className="text-slate-400 leading-normal">
              Directly synchronized with real backend workflow status and tool executions.
            </p>
          </div>
        </div>

        {/* Right Column: Interactive Chat & Execution Trace Log */}
        <div className="gsap-animate-card flex-1 flex flex-col overflow-hidden bg-slate-950/40">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-4 max-w-2xl ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div className="w-9 h-9 rounded-2xl flex-shrink-0 flex items-center justify-center border border-slate-800 bg-slate-900 text-amber-400 shadow-md">
                  {msg.sender === 'user' ? (
                    <UserIcon className="w-4 h-4 text-slate-200" />
                  ) : (
                    <Bot className="w-4 h-4 text-amber-400" />
                  )}
                </div>

                <div className={`space-y-3 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                  <div
                    className={`p-4 rounded-2xl text-xs leading-relaxed shadow-md ${
                      msg.sender === 'user'
                        ? 'bg-amber-500 text-slate-950 font-semibold rounded-tr-none whitespace-pre-line'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none space-y-1'
                    }`}
                  >
                    {msg.sender === 'user' ? msg.content : renderFormattedMessage(msg.content)}
                  </div>

                  {/* Linked Request Highlight */}
                  {msg.attachedWorkflowId && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs space-y-3 text-left shadow-lg">
                      <div className="flex items-center justify-between text-amber-400 font-bold border-b border-slate-800 pb-2.5">
                        <span className="flex items-center gap-1.5 text-xs text-white">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Linked Request: {msg.attachedWorkflowId}
                        </span>
                        <Link to="/approvals" className="text-amber-400 hover:underline font-extrabold text-xs flex items-center gap-1">
                          Approvals Queue &rarr;
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Action Suggestion Pills */}
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {msg.suggestedActions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(action)}
                          className="text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-300 hover:text-white px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer font-semibold"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          {action}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-500 font-mono px-1">{msg.timestamp}</div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-3 text-xs text-amber-400 bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 max-w-xs shadow-md">
                <Bot className="w-4 h-4 text-amber-400 animate-spin" />
                <span className="font-semibold">CampusFlow Agent executing tools...</span>
              </div>
            )}
          </div>

          {/* Prompt Input Form */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/90">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-3"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask CampusFlow AI (e.g. 'What is the duration of the Summer Internship?')..."
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-amber-500 text-slate-100 placeholder-slate-500 text-xs rounded-2xl px-4 py-3 outline-none transition shadow-inner"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
              >
                <span>Execute</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
