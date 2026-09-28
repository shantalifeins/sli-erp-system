import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Download, Layers, CheckSquare, Grid } from 'lucide-react';
import jsPDF from 'jspdf';

import { useAuth } from '@/src/shared/components/AuthProvider';

interface Asset {
  id: string;
  assetCode: string;
  name: string;
  categoryName?: string;
  branchName?: string;
  serialNumber?: string;
  custodianName?: string;
}

interface BulkStickerModalProps {
  assets: Asset[];
  onClose: () => void;
  currencySymbol?: string;
  companyName?: string;
}

type PaperSize = 'A4' | 'Letter' | 'Legal';

export const getAssetQrValue = (item: Asset, companyName?: string): string => {
  const parts = [
    `Company: ${companyName || 'Shanta Life Insurance PLC'}`,
    `Asset Tag: ${item.assetCode || ''}`,
    `Name: ${item.name || ''}`,
    `Category: ${item.categoryName || 'N/A'}`,
    `Location/Branch: ${item.branchName || 'HQ'}`
  ];
  if (item.custodianName) parts.push(`Custodian: ${item.custodianName}`);
  if (item.serialNumber) parts.push(`SN: ${item.serialNumber}`);
  parts.push(`ERP: https://erp.shantalife.com/assets?search=${encodeURIComponent(item.assetCode || '')}`);
  return parts.join('\n');
};

export const BulkStickerModal: React.FC<BulkStickerModalProps> = ({ assets, onClose, companyName }) => {
  const { company } = useAuth();
  const activeCompanyName = companyName || company?.name || 'SHANTA LIFE INSURANCE PLC';

  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [columns, setColumns] = useState<number>(3);
  const [showCategory, setShowCategory] = useState<boolean>(true);
  const [showBranch, setShowBranch] = useState<boolean>(true);
  const [showSerialNumber, setShowSerialNumber] = useState<boolean>(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Layout calculations
  // Rows per page based on paper size and columns
  const getRowsPerPage = () => {
    if (paperSize === 'Legal') return columns === 2 ? 6 : columns === 3 ? 8 : 10;
    if (paperSize === 'Letter') return columns === 2 ? 5 : columns === 3 ? 6 : 8;
    return columns === 2 ? 5 : columns === 3 ? 6 : 8; // A4 default
  };

  const rowsPerPage = getRowsPerPage();
  const stickersPerPage = columns * rowsPerPage;
  const totalPages = Math.ceil(assets.length / stickersPerPage);

  // Group assets into pages
  const pages = Array.from({ length: totalPages }, (_, pageIdx) =>
    assets.slice(pageIdx * stickersPerPage, (pageIdx + 1) * stickersPerPage)
  );

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      
      // Map paper size to jsPDF format
      const pdfFormat = paperSize === 'A4' ? 'a4' : paperSize === 'Letter' ? 'letter' : 'legal';
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: pdfFormat,
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8; // mm margin

      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;

      const colWidth = printableWidth / columns;
      const rowHeight = printableHeight / rowsPerPage;

      for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
        if (pageIdx > 0) pdf.addPage(pdfFormat, 'portrait');

        const pageAssets = pages[pageIdx];

        for (let idx = 0; idx < pageAssets.length; idx++) {
          const item = pageAssets[idx];
          const col = idx % columns;
          const row = Math.floor(idx / columns);

          const x = margin + col * colWidth + 1.5;
          const y = margin + row * rowHeight + 1.5;
          const w = colWidth - 3;
          const h = rowHeight - 3;

          // Sticker border box
          pdf.setDrawColor(200, 205, 215);
          pdf.setLineWidth(0.3);
          pdf.roundedRect(x, y, w, h, 2, 2, 'S');

          // Header: Organization name
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(7.5);
          pdf.setTextColor(30, 41, 59);
          pdf.text(activeCompanyName.toUpperCase(), x + w / 2, y + 5, { align: 'center' });

          // Render QR Code onto temp canvas to embed into PDF
          const qrCanvas = document.createElement('canvas');
          const qrSvgElement = document.getElementById(`qr-svg-${item.id}`);
          
          let qrDataUrl = '';
          if (qrSvgElement) {
            const svgString = new XMLSerializer().serializeToString(qrSvgElement);
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const URLObj = window.URL || (window as any).webkitURL;
            const blobURL = URLObj.createObjectURL(svgBlob);
            
            const img = new Image();
            await new Promise((resolve) => {
              img.onload = () => {
                qrCanvas.width = 160;
                qrCanvas.height = 160;
                const ctx = qrCanvas.getContext('2d');
                if (ctx) {
                  ctx.fillStyle = '#FFFFFF';
                  ctx.fillRect(0, 0, 160, 160);
                  ctx.drawImage(img, 0, 0, 160, 160);
                }
                qrDataUrl = qrCanvas.toDataURL('image/png');
                resolve(true);
              };
              img.onerror = () => resolve(false);
              img.src = blobURL;
            });
          }

          const qrSize = Math.min(w * 0.45, h * 0.45, 22);
          const qrX = x + (w - qrSize) / 2;
          const qrY = y + 7;

          if (qrDataUrl) {
            pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
          }

          // Asset Tag Code
          const tagY = qrY + qrSize + 4;
          pdf.setFont('courier', 'bold');
          pdf.setFontSize(9);
          pdf.setTextColor(234, 88, 12); // Brand orange
          pdf.text(item.assetCode, x + w / 2, tagY, { align: 'center' });

          // Asset Name
          const nameY = tagY + 4.5;
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(7.5);
          pdf.setTextColor(15, 23, 42);
          const truncatedName = item.name.length > 25 ? item.name.substring(0, 23) + '...' : item.name;
          pdf.text(truncatedName, x + w / 2, nameY, { align: 'center' });

          // Metadata line
          let metaText = '';
          if (showCategory && item.categoryName) metaText += `Cat: ${item.categoryName}`;
          if (showBranch && item.branchName) {
            if (metaText) metaText += ' | ';
            metaText += `Br: ${item.branchName}`;
          }

          if (metaText) {
            const metaY = nameY + 4;
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(6);
            pdf.setTextColor(100, 116, 139);
            const truncatedMeta = metaText.length > 32 ? metaText.substring(0, 30) + '...' : metaText;
            pdf.text(truncatedMeta, x + w / 2, metaY, { align: 'center' });
          }
        }
      }

      pdf.save(`asset_stickers_${paperSize}_${assets.length}_items.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Failed to generate PDF. You can also use the "Print / Save PDF" button to print or save as PDF via your browser.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-md p-4 overflow-y-auto">
      {/* Hidden print stylesheet rule injection */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #bulk-sticker-print-area, #bulk-sticker-print-area * {
            visibility: visible !important;
          }
          #bulk-sticker-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .sticker-page-sheet {
            margin: 0 !important;
            padding: 5mm !important;
            box-shadow: none !important;
            border: none !important;
            break-after: page !important;
            page-break-after: always !important;
            width: 100% !important;
            min-height: 100vh !important;
          }
          @page {
            size: ${paperSize.toLowerCase()} portrait;
            margin: 4mm;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Bulk Asset Sticker Print & Export</h2>
              <p className="text-xs text-slate-500">
                Generating stickers for <strong className="text-purple-700 font-semibold">{assets.length}</strong> selected assets across <strong className="text-slate-800">{totalPages}</strong> page(s)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Print Setup Controls */}
        <div className="px-6 py-3.5 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            {/* Paper Size Selector */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                Paper Size:
              </span>
              <div className="flex bg-white rounded-lg p-0.5 border border-slate-300 shadow-sm">
                {(['A4', 'Letter', 'Legal'] as PaperSize[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => setPaperSize(size)}
                    className={`px-3 py-1 font-semibold rounded-md transition-all ${
                      paperSize === size
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Column Layout Selector */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <Grid className="w-3.5 h-3.5 text-slate-500" />
                Grid Columns:
              </span>
              <div className="flex bg-white rounded-lg p-0.5 border border-slate-300 shadow-sm">
                {[2, 3, 4].map((colNum) => (
                  <button
                    key={colNum}
                    onClick={() => setColumns(colNum)}
                    className={`px-3 py-1 font-semibold rounded-md transition-all ${
                      columns === colNum
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {colNum} Cols
                  </button>
                ))}
              </div>
            </div>

            {/* Content Toggles */}
            <div className="flex items-center gap-3 border-l border-slate-300 pl-3">
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={showCategory}
                  onChange={(e) => setShowCategory(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                />
                Category
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={showBranch}
                  onChange={(e) => setShowBranch(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                />
                Branch
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={showSerialNumber}
                  onChange={(e) => setShowSerialNumber(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                />
                Serial No
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2 font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-all shadow-sm flex items-center gap-1.5 hover:border-slate-400 disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-purple-600" />
              <span>{isGeneratingPdf ? 'Building PDF...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-5 py-2 font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all shadow-md flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>

        {/* Printable / Preview Content Container */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-200/70 space-y-6">
          <div id="bulk-sticker-print-area" className="space-y-8">
            {pages.map((pageAssets, pageIdx) => (
              <div
                key={pageIdx}
                className="sticker-page-sheet bg-white mx-auto shadow-lg border border-slate-300 rounded-lg p-5 transition-all"
                style={{
                  width: paperSize === 'A4' ? '210mm' : paperSize === 'Letter' ? '216mm' : '216mm',
                  minHeight: paperSize === 'A4' ? '297mm' : paperSize === 'Letter' ? '279mm' : '356mm',
                  maxWidth: '100%',
                }}
              >
                {/* Page Indicator (Hidden during print) */}
                <div className="print:hidden mb-4 pb-2 border-b border-slate-100 flex justify-between items-center text-slate-400 text-[11px] font-semibold">
                  <span>PAGE {pageIdx + 1} OF {totalPages}</span>
                  <span>{paperSize} ({columns} Columns Grid)</span>
                </div>

                {/* Sticker Cards Grid */}
                <div
                  className="grid gap-3"
                  style={{
                    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  }}
                >
                  {pageAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="border-2 border-dashed border-slate-300 rounded-xl p-3 bg-white space-y-1.5 text-center flex flex-col justify-between hover:border-purple-300 transition-colors"
                      style={{ minHeight: '38mm' }}
                    >
                      <div className="text-[10px] font-extrabold text-slate-800 tracking-wider uppercase truncate">
                        {activeCompanyName}
                      </div>

                      {/* Dynamic SVG QR Code */}
                      <div className="flex justify-center py-0.5">
                        <QRCodeSVG
                          id={`qr-svg-${asset.id}`}
                          value={getAssetQrValue(asset, activeCompanyName)}
                          size={columns === 4 ? 70 : columns === 3 ? 85 : 100}
                          level="H"
                          includeMargin={false}
                          className="p-0.5 bg-white rounded border border-slate-100"
                        />
                      </div>

                      <div className="font-mono font-bold text-brand-orange text-xs tracking-wider">
                        {asset.assetCode}
                      </div>

                      <div className="text-[11px] font-bold text-slate-900 truncate px-1">
                        {asset.name}
                      </div>

                      {(showCategory || showBranch || (showSerialNumber && asset.serialNumber)) && (
                        <div className="text-[9px] font-medium text-slate-500 pt-1 border-t border-slate-200 flex flex-wrap justify-center gap-x-2 gap-y-0.5">
                          {showCategory && asset.categoryName && <span>Cat: {asset.categoryName}</span>}
                          {showBranch && asset.branchName && <span>Br: {asset.branchName}</span>}
                          {showSerialNumber && asset.serialNumber && <span>SN: {asset.serialNumber}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-white flex justify-between items-center text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-purple-600" />
            <span>Ready for printing or PDF export. Make sure browser background graphics are enabled in print settings.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
