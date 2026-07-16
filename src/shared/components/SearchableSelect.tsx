import React from 'react';
import { ChevronDown } from 'lucide-react';

export default function SearchableSelect({ 
  value, 
  onChange, 
  options, 
  placeholder 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  options: { value: string; label: string; subLabel?: string }[]; 
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  
  const filtered = options.filter(o => 
    o.label.toLowerCase().includes(search.toLowerCase()) || 
    (o.subLabel && o.subLabel.toLowerCase().includes(search.toLowerCase()))
  );
  
  const selectedOption = options.find(o => o.value === value);

  return (
    <div className={isOpen ? "relative z-50" : "relative"}>
      <div 
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus-within:ring-2 focus-within:ring-[#F37021]/50 bg-slate-50 cursor-pointer flex justify-between items-center min-h-[38px]"
      >
        <span className={selectedOption ? "text-slate-900 truncate pr-2" : "text-slate-400 truncate pr-2"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
      </div>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />
          <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
            <div className="p-2 sticky top-0 bg-white border-b border-slate-100 z-10">
              <input 
                type="text" 
                placeholder="Search..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-1.5 text-sm focus:ring-[#F37021] focus:border-[#F37021] outline-none"
                onClick={e => e.stopPropagation()}
                autoFocus
              />
            </div>
            <div 
              className="px-3 py-2.5 text-sm hover:bg-slate-50 cursor-pointer text-slate-500 italic border-b border-slate-50"
              onClick={() => { onChange(''); setIsOpen(false); }}
            >
              None
            </div>
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-sm text-slate-400 text-center">No results found</div>
            ) : (
              filtered.map(opt => (
                <div 
                  key={opt.value} 
                  className="px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                  onClick={() => { onChange(opt.value); setIsOpen(false); setSearch(''); }}
                >
                  <div className="font-medium text-slate-700">{opt.label}</div>
                  {opt.subLabel && <div className="text-xs text-slate-400">{opt.subLabel}</div>}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
