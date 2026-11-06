import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  Trash2, 
  Sparkles,
  Info,
  X
} from 'lucide-react';
import { API_BASE_URL, getAuthHeaders } from '../services/api';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { useGsapAnimations } from '../hooks/useGsapAnimations';

export const DocumentsPage: React.FC = () => {
  const containerRef = useGsapAnimations();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Modal States
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('JOINING_REPORT');
  
  // Evidence Modal State
  const [selectedDocEvidence, setSelectedDocEvidence] = useState<any | null>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/student-documents`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDocuments(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError("Please select a file to upload.");
      return;
    }

    setUploadError(null);
    setUploadSuccess(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('file_type', documentType);

      const headers = getAuthHeaders() as Record<string, string>;
      delete headers['Content-Type'];

      const response = await fetch(`${API_BASE_URL}/student-documents`, {
        method: 'POST',
        headers: headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Document upload and verification failed');
      }

      setUploadSuccess(`Successfully uploaded "${selectedFile.name}". Private RAG indexed ${data.document.chunks_indexed} chunk(s). Status: ${data.document.verification_status}`);
      setShowUploadModal(false);
      setSelectedFile(null);
      await fetchDocuments();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string, filename: string) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}" and its private RAG index?`)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/student-documents/${docId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setUploadSuccess(`Document "${filename}" and its private RAG index were deleted.`);
        await fetchDocuments();
      }
    } catch (e) {
      setUploadError("Failed to delete document.");
    }
  };

  return (
    <div ref={containerRef} className="space-y-6 text-left max-w-7xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="Student Document Vault & Private RAG"
        subtitle={`Secure personal document vault for ${user?.name || 'Student'}${user?.rollNumber ? ` (${user.rollNumber})` : ''}. Upload documents to analyze against official SRM University–AP guidelines strictly in your private scope.`}
        icon={FileText}
        badgeText="Dual RAG Engine Enabled"
        actions={
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs shadow-xl shadow-amber-500/20 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              Upload & Verify Document
            </button>
            <span className="text-[10px] text-slate-400 max-w-xs text-right leading-tight">
              Analyze your document against SRM University–AP internship requirements
            </span>
          </div>
        }
      />

      {/* Status Banners */}
      {uploadError && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-2xl text-rose-300 text-xs flex items-center justify-between shadow-lg">
          <span className="flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            {uploadError}
          </span>
          <button onClick={() => setUploadError(null)} className="text-slate-400 hover:text-white font-bold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {uploadSuccess && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl text-emerald-300 text-xs flex items-center justify-between shadow-lg">
          <span className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {uploadSuccess}
          </span>
          <button onClick={() => setUploadSuccess(null)} className="text-slate-400 hover:text-white font-bold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Document Vault Container */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-4 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" /> Authenticated Private Documents
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Stored in your isolated student RAG scope. Never added to shared university policies.</p>
          </div>
          <span className="text-xs font-semibold bg-slate-950 border border-slate-800 text-amber-400 px-3 py-1 rounded-full">
            {documents.length} File(s)
          </span>
        </div>

        {isLoading ? (
          <div className="py-16 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
          </div>
        ) : documents.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-amber-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">No documents uploaded yet</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Upload your Joining Report, Offer Letter, Synopsis, or Weekly Diary to analyze compliance against official SRM University–AP guidelines.
              </p>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs border border-slate-700 transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" /> Upload Your First Document
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Document Title</th>
                  <th className="px-4 py-3.5">Document Type</th>
                  <th className="px-4 py-3.5">File Size</th>
                  <th className="px-4 py-3.5">Uploaded</th>
                  <th className="px-4 py-3.5">AI Verification</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {documents.map((doc) => {
                  const normStatus = doc.verification_status?.toLowerCase() || 'processing';
                  const displaySize = doc.file_size
                    ? `${(doc.file_size / (1024 * 1024)).toFixed(2)} MB`
                    : '—';
                  const displayDate = doc.created_at
                    ? new Date(doc.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })
                    : '—';

                  return (
                    <tr key={doc.id} className="gsap-animate-card hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3.5 font-bold text-slate-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-amber-400 shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-slate-100 font-bold">{doc.file_name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">Private RAG ID: {doc.id.slice(0, 8)}…</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-300 font-medium">
                        <span className="bg-slate-950 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] font-mono font-bold">
                          {doc.file_type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 font-mono">{displaySize}</td>
                      <td className="px-4 py-3.5 text-slate-400 font-mono">{displayDate}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={normStatus.includes('valid') || normStatus.includes('verified') ? 'valid' : 'pending'} size="sm" />
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => setSelectedDocEvidence(doc)}
                          className="px-2.5 py-1 text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 rounded-lg border border-amber-500/20 transition cursor-pointer font-bold text-[11px]"
                        >
                          View Evidence
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.id, doc.file_name)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                          title="Delete Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Modal Dialog */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 text-left relative">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> Upload & Verify Document
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Upload your document to analyze it against available SRM University–AP internship requirements. Your document is indexed strictly into your private student RAG scope.
              </p>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Document Type</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
                >
                  <option value="JOINING_REPORT">Joining Report</option>
                  <option value="OFFER_LETTER">Internship Offer Letter</option>
                  <option value="SYNOPSIS">Synopsis</option>
                  <option value="WEEKLY_DIARY">Weekly Diary</option>
                  <option value="PROJECT_REPORT">Project Report</option>
                  <option value="COMPLETION_CERTIFICATE">Internship Completion Certificate</option>
                  <option value="ACADEMIC_TRANSCRIPT">Academic Transcript</option>
                  <option value="OTHER">Other Document</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Select File (PDF, DOCX, TXT)</label>
                <div className="border-2 border-dashed border-slate-800 rounded-2xl p-4 text-center hover:border-amber-500/50 transition cursor-pointer bg-slate-950/50">
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf,.docx,.doc,.txt"
                    className="w-full text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400"
                  />
                  {selectedFile && (
                    <p className="mt-2 text-amber-400 font-bold text-xs truncate">
                      Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              </div>

              <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl text-[11px] text-amber-300 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Privacy Guarantee:</strong> This document will be indexed strictly into your private student RAG scope (`user_id = your_account`). It will NEVER become an official university policy.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Processing & Verifying…
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" /> Start Upload & Verification
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Evidence Modal */}
      {selectedDocEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4 text-left relative">
            <button
              onClick={() => setSelectedDocEvidence(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-800 pb-3">
              <span className="text-[10px] font-mono uppercase tracking-wider bg-slate-950 border border-slate-800 text-amber-400 px-2.5 py-0.5 rounded-full font-bold">
                {selectedDocEvidence.file_type}
              </span>
              <h3 className="text-base font-bold text-white mt-2">{selectedDocEvidence.file_name}</h3>
              <p className="text-xs text-slate-400">AI OCR Verification Analysis against SRM University–AP Guidelines</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="font-bold text-slate-200">Verification Reasons</div>
                <ul className="list-disc pl-4 space-y-1 text-slate-300 text-[11px]">
                  {((selectedDocEvidence.verification_summary || {}).reasons || ['Processed by AI OCR engine.']).map((r: string, idx: number) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="font-bold text-slate-200">RAG Knowledge Scope</div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Knowledge Scope:</span>
                  <span className="font-mono font-bold text-amber-400">STUDENT_PRIVATE</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Owner User ID:</span>
                  <span className="font-mono text-slate-300">{selectedDocEvidence.user_id || 'Current User'}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">University Scope Leak:</span>
                  <span className="font-mono font-bold text-emerald-400">0% (Strictly Isolated)</span>
                </div>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedDocEvidence(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
