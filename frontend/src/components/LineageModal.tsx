import React, { useState } from 'react';
import {
  X,
  GitCommit,
  GitBranch,
  Shield,
  FileText,
  AlertTriangle,
  CheckCircle,
  Scissors,
  ArrowRight,
  Info,
} from 'lucide-react';
import { LineageGraph, LineageNode, LineageEdge } from '../types/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  graph: LineageGraph | null;
  auditId: string;
}

export const LineageModal: React.FC<Props> = ({ isOpen, onClose, graph, auditId }) => {
  const [selectedNode, setSelectedNode] = useState<LineageNode | null>(null);

  if (!isOpen || !graph) return null;

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'claim':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'evidence_chunk':
        return 'bg-cyan-50 text-cyan-800 border-cyan-200';
      case 'source_document':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'verdict':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'sanitization_action':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'final_claim':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'claim':
        return <FileText className="w-3.5 h-3.5 text-blue-600" />;
      case 'evidence_chunk':
        return <GitCommit className="w-3.5 h-3.5 text-cyan-600" />;
      case 'source_document':
        return <Shield className="w-3.5 h-3.5 text-slate-600" />;
      case 'verdict':
        return <AlertTriangle className="w-3.5 h-3.5 text-purple-600" />;
      case 'sanitization_action':
        return <Scissors className="w-3.5 h-3.5 text-amber-600" />;
      case 'final_claim':
        return <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <GitBranch className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <GitBranch className="w-5 h-5 text-brand-primary" />
            <div>
              <h3 className="text-base font-semibold text-slate-800">Evidence Lineage & Provenance Graph</h3>
              <p className="text-xs text-slate-500 font-mono">Audit: {auditId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Visual Graph / Timeline */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Decision Pipeline Nodes ({graph.nodes.length})
              </span>
              <span className="text-2xs text-slate-400">Click a node to inspect provenance metadata</span>
            </div>

            <div className="space-y-3 bg-slate-50/60 p-4 rounded-xl border border-slate-200 max-h-[500px] overflow-y-auto">
              {graph.nodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-start gap-3 ${getNodeColor(
                      node.type
                    )} ${isSelected ? 'ring-2 ring-brand-primary shadow-xs' : 'hover:shadow-xs'}`}
                  >
                    <div className="mt-0.5 shrink-0">{getNodeIcon(node.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold capitalize text-2xs uppercase tracking-wider opacity-75">
                          {node.type.replace('_', ' ')}
                        </span>
                        <span className="font-mono text-3xs opacity-60">{node.id}</span>
                      </div>
                      <p className="font-medium truncate">{node.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Edge Connections List */}
            <div className="border border-slate-200 rounded-xl p-3 bg-white">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Lineage Relationships ({graph.edges.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-2xs font-mono max-h-[140px] overflow-y-auto">
                {graph.edges.map((edge) => (
                  <div key={edge.id} className="p-1.5 rounded-md bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <span className="truncate max-w-[120px] text-slate-600">{edge.source}</span>
                    <span className="text-slate-400 mx-1 flex items-center gap-0.5">
                      <ArrowRight className="w-3 h-3 text-brand-primary" />
                      <span className="text-3xs text-slate-500 font-sans">{edge.label || edge.type}</span>
                    </span>
                    <span className="truncate max-w-[120px] text-slate-800 font-semibold">{edge.target}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Node Inspector Detail Panel */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-cyan-600" />
                <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Node Inspector
                </h4>
              </div>

              {selectedNode ? (
                <div className="space-y-3">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <div className="text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Label
                    </div>
                    <p className="text-xs font-medium text-slate-800">{selectedNode.label}</p>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <div className="text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Type & ID
                    </div>
                    <div className="text-xs font-mono text-slate-700">
                      <div><span className="font-sans text-slate-500">Type: </span>{selectedNode.type}</div>
                      <div><span className="font-sans text-slate-500">ID: </span>{selectedNode.id}</div>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <div className="text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Metadata Attributes
                    </div>
                    <pre className="text-3xs font-mono bg-slate-50 p-2 rounded-md overflow-x-auto text-slate-700">
                      {JSON.stringify(selectedNode.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Select any node in the graph pipeline to inspect its properties, evidence links, and metadata.
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 text-2xs text-slate-400 text-center">
              Auditable verifiable lineage graph (PRD Feature C)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
