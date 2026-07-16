import React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';

export interface DepartmentNode {
  id: number;
  name: string;
  code: string;
  type?: 'department' | 'unit';
  managerUid: string | null;
  manager?: {
    uid: string;
    name: string;
    designation: string;
  };
  children: DepartmentNode[];
}

interface OrganogramNodeProps {
  key?: string | number;
  node: DepartmentNode;
  onAddChild?: (node: DepartmentNode) => void;
}

export function OrganogramNode({ node, onAddChild }: OrganogramNodeProps) {
  const hasChildren = node.children && node.children.length > 0;
  const isUnit = node.type === 'unit';

  return (
    <div className="flex flex-col items-center group/node">
      {/* Node Card */}
      <div className={cn(
        "border-2 rounded-xl p-4 shadow-sm min-w-[220px] text-center z-10 relative transition-all hover:shadow-md",
        isUnit ? "bg-slate-50 border-blue-400/30" : "bg-white border-brand-olive/20"
      )}>
        {isUnit && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-blue-200">
            Unit
          </div>
        )}
        <h3 className={cn("font-bold text-lg mt-1", isUnit ? "text-slate-700" : "text-gray-800")}>{node.name}</h3>
        <p className="text-xs text-gray-500 font-medium mb-2">Code: {node.code}</p>
        
        {node.manager ? (
          <div className="mt-3 pt-3 border-t border-gray-100/50">
            <div className="flex flex-col items-center">
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center font-bold mb-1",
                isUnit ? "bg-blue-100 text-blue-700" : "bg-brand-olive/10 text-brand-olive"
              )}>
                {node.manager.name ? node.manager.name.charAt(0).toUpperCase() : '?'}
              </div>
              <p className="text-sm font-medium text-gray-700">{node.manager.name}</p>
              <p className="text-xs text-gray-500">{node.manager.designation || 'Manager'}</p>
            </div>
          </div>
        ) : (
          <div className="mt-3 pt-3 border-t border-gray-100/50">
            <p className="text-xs text-gray-400 italic">No Manager Assigned</p>
          </div>
        )}

        {/* Add Child Button (appears on hover) */}
        {onAddChild && !isUnit && (
          <button
            onClick={() => onAddChild(node)}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-brand-orange text-white rounded-full p-1 shadow-md opacity-0 group-hover/node:opacity-100 transition-opacity hover:bg-[#e06214] z-20"
            title="Add Sub-Department or Unit"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Children Connections */}
      {hasChildren && (
        <>
          {/* Vertical line going down from current node */}
          <div className="w-px h-8 bg-gray-300"></div>
          
          <div className="flex justify-center relative">
            <div className="flex flex-row items-start gap-8 relative">
              {/* Horizontal line across children */}
              {node.children.length > 1 && (
                <div 
                  className="absolute top-0 h-px bg-gray-300"
                  style={{
                    left: `calc(50% / ${node.children.length})`,
                    right: `calc(50% / ${node.children.length})`,
                    width: `calc(100% - (100% / ${node.children.length}))`
                  }}
                ></div>
              )}

              {node.children.map((child) => (
                <div key={`${child.type}-${child.id}`} className="flex flex-col items-center relative">
                  {/* Vertical line going down to child */}
                  <div className="w-px h-8 bg-gray-300"></div>
                  
                  {/* Recursively render child */}
                  <OrganogramNode node={child} onAddChild={onAddChild} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
