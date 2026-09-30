import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, '../src/modules/inventory/pages/Grn.tsx');
let content = fs.readFileSync(file, 'utf8');

// Add state for serials
if (!content.includes('const [receiveSerials')) {
  content = content.replace(
    /const \[receiveQtys, setReceiveQtys\] = useState<Record<number, number>>\({}\);/,
    `const [receiveQtys, setReceiveQtys] = useState<Record<number, number>>({});\n  const [receiveSerials, setReceiveSerials] = useState<Record<number, string>>({});`
  );
}

// Reset serials on close
content = content.replace(
  /setReceiveQtys\({}\);/g,
  `setReceiveQtys({});\n                        setReceiveSerials({});`
);

// Modify POST /api/grn payload inside handleCreateGrn
content = content.replace(
  /const itemsToReceive = Object\.keys\(receiveQtys\)\.map\(poItemId => \({/,
  `const itemsToReceive = Object.keys(receiveQtys).map(poItemId => {
        const item = selectedPo?.items?.find((i: any) => i.id === Number(poItemId));
        const qty = receiveQtys[Number(poItemId)];
        let serials: string[] | undefined = undefined;
        if (item?.trackingMethod === 'Individual Unit' && receiveSerials[Number(poItemId)]) {
          serials = receiveSerials[Number(poItemId)].split(/[\\n,]+/).map(s => s.trim()).filter(Boolean);
        }
        return {`
);
content = content.replace(
  /quantityReceived: receiveQtys\[Number\(poItemId\)\]\n\s*}\)\)\.filter/,
  `quantityReceived: receiveQtys[Number(poItemId)],
          serials
        };
      }).filter`
);

// Modify the UI for selectedPo.items.map
const originalUiBlock = `{selectedPo.items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{item.itemName}</div>
                          <div className="text-xs text-slate-500">Ordered Qty: {item.quantity} {item.uom}</div>
                        </div>
                        <div className="w-32">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Received Qty</label>
                          <input 
                            type="number" 
                            required
                            min="0"
                            max={item.quantity}
                            value={receiveQtys[item.id] ?? ''}
                            onChange={e => setReceiveQtys(prev => ({
                              ...prev,
                              [item.id]: parseInt(e.target.value) || 0
                            }))}
                            className="w-full border border-slate-200 rounded p-1.5 bg-white text-sm text-center font-bold text-slate-800" 
                          />
                        </div>
                      </div>
                    ))}`;

const uiReplacement = `
                    {selectedPo.items?.map((item: any) => (
                      <div key={item.id} className="flex flex-col gap-3 bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-bold text-slate-800 text-sm">{item.itemName}</div>
                            <div className="text-xs text-slate-500 flex items-center">
                              Ordered Qty: {item.quantity} {item.uom}
                              {item.assetNature === 'Digital' && <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px] font-bold">DIGITAL</span>}
                              {item.trackingMethod === 'Individual Unit' && <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold">SERIAL TRACKED</span>}
                            </div>
                          </div>
                          <div className="w-32">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Received Qty</label>
                            <input 
                              type="number" 
                              required
                              min="0"
                              max={item.quantity}
                              value={receiveQtys[item.id] ?? ''}
                              onChange={e => setReceiveQtys(prev => ({
                                ...prev,
                                [item.id]: parseInt(e.target.value) || 0
                              }))}
                              className="w-full border border-slate-200 rounded p-1.5 bg-white text-sm text-center font-bold text-slate-800" 
                            />
                          </div>
                        </div>
                        {item.trackingMethod === 'Individual Unit' && (receiveQtys[item.id] > 0) && (
                          <div className="mt-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Serial Numbers (Enter {receiveQtys[item.id]} serials, comma or newline separated)</label>
                            <textarea
                              required
                              rows={2}
                              value={receiveSerials[item.id] || ''}
                              onChange={e => setReceiveSerials(prev => ({ ...prev, [item.id]: e.target.value }))}
                              placeholder="e.g. SN-001, SN-002..."
                              className="w-full border border-slate-200 rounded p-2 text-sm"
                            />
                          </div>
                        )}
                        {item.assetNature === 'Digital' && (receiveQtys[item.id] > 0) && (
                          <div className="mt-2 p-3 bg-purple-50 rounded border border-purple-100 text-xs text-purple-800">
                            <strong>Digital Acceptance:</strong> This item will bypass physical warehouse inventory. A Digital Acceptance record will be created in the Digital Asset module automatically.
                          </div>
                        )}
                      </div>
                    ))}
`;

content = content.replace(originalUiBlock, uiReplacement);

fs.writeFileSync(file, content, 'utf8');
console.log('Patched Grn.tsx exactly successfully');
