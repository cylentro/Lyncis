import { useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, FileCheck, AlertCircle, Play, SlidersHorizontal } from 'lucide-react';
import { parseExcelFile, ExcelParseResult } from '@/lib/excel-parser';
import { generateHeaderHash, loadSavedMapping } from '@/lib/header-mapper';
import { convertRowsToOrders } from '@/lib/excel-to-orders';
import { ColumnMappingView } from './column-mapping-view';
import { toast } from 'sonner';
import { JastipOrder } from '@/lib/types';
import { useEffect } from 'react';
import { getParserConfig } from '@/lib/config-actions';
import { TagAutocomplete } from './tag-autocomplete';

interface ExcelUploadProps {
  onImport: (orders: Omit<JastipOrder, 'id'>[]) => Promise<void>;
  activeTags?: string[];
}

export function ExcelUpload({ onImport, activeTags = [] }: ExcelUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<ExcelParseResult | null>(null);
  const [headerHash, setHeaderHash] = useState<string>('');
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [defaultTag, setDefaultTag] = useState('General');
  const [activeTab, setActiveTab] = useState('manual');
  
  const [config, setConfig] = useState<{
    enableAI: boolean;
    enableRegex: boolean;
    regexThreshold: number;
    hasApiKey: boolean;
  } | null>(null);

  useEffect(() => {
    getParserConfig().then(setConfig);
  }, []);

  const [view, setView] = useState<'upload' | 'mapping'>('upload');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (selectedFile: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv')) {
      toast.error('Hanya menerima file Excel (.xlsx, .xls) atau CSV (.csv)');
      return;
    }

    setFile(selectedFile);
    setIsParsing(true);
    setError(null);

    try {
      const result = await parseExcelFile(selectedFile);
      if (result.rows.length === 0) {
        throw new Error('File kosong atau tidak memiliki data.');
      }
      
      const hash = generateHeaderHash(result.headers);
      setData(result);
      setHeaderHash(hash);
      
      const savedMapping = loadSavedMapping(hash);
      if (savedMapping) {
        toast.info('Format dikenali! Menggunakan pemetaan kolom yang tersimpan.');
      } else {
        setView('mapping');
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memproses file.');
      toast.error(err.message || 'Gagal memproses file.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async (mapping: Record<string, string>) => {
    if (!data) return;
    
    setIsParsing(true);
    const aiToastId = config?.enableAI ? toast.loading("Memproses data... AI akan digunakan jika mapping kolom kurang jelas.") : null;

    try {
      const orders = await convertRowsToOrders(
        data.rows, 
        mapping, 
        defaultTag, 
        file?.name,
        {
          enableAI: config?.enableAI ?? true,
          threshold: config?.regexThreshold || 0.8
        }
      );
      if (aiToastId) toast.dismiss(aiToastId);
      await onImport(orders);
      toast.success(`Berhasil mengimpor ${orders.length} pesanan.`);
      clearFile();
    } catch (err) {
      toast.error('Gagal mengimpor data ke database.');
    } finally {
      setIsParsing(false);
    }
  };

  const startImportWithCurrentMapping = () => {
    const mapping = loadSavedMapping(headerHash);
    if (mapping) {
      handleImport(mapping);
    } else {
      setView('mapping');
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  };

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFile(selectedFile);
  };

  const clearFile = () => {
    setFile(null);
    setData(null);
    setHeaderHash('');
    setError(null);
    setView('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (view === 'mapping' && data) {
    return (
      <ColumnMappingView
        headers={data.headers}
        rows={data.rows}
        headerHash={headerHash}
        onConfirm={handleImport}
        onCancel={() => setView('upload')}
      />
    );
  }

  if (file && !error && !isParsing && data) {
    return (
      <div className="w-full space-y-8 py-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
             <FileCheck className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-bold">{file.name}</h3>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">
              {data.rows.length} Baris Terdeteksi
            </p>
          </div>
          
          <div className="flex gap-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive text-[10px] font-bold h-8 px-3"
              onClick={clearFile}
            >
              <X className="h-4 w-4 mr-1.5" /> Ganti File
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary text-[10px] font-bold h-8 px-3"
              onClick={() => setView('mapping')}
            >
              <SlidersHorizontal className="h-4 w-4 mr-1.5" /> Atur Kolom
            </Button>
          </div>
        </div>

        <div className="space-y-6 bg-muted/30 p-5 rounded-2xl border border-border/50">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">
              Tag Default (Batch)
            </Label>
            <TagAutocomplete
              id="excel-tag-autocomplete"
              value={defaultTag}
              onChange={setDefaultTag}
              activeTags={activeTags}
            />
          </div>

          <Button className="w-full h-11 font-bold shadow-lg shadow-primary/20" onClick={startImportWithCurrentMapping}>
            <Play className="h-4 w-4 mr-2" />
            Gas Impor Sekarang
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full min-h-[180px] flex flex-col items-center justify-center p-4 cursor-pointer"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".xlsx,.xls,.csv"
        onChange={onSelect}
      />
      
      {isParsing ? (
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-sm font-medium animate-pulse">Memproses file...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 text-destructive">
          <AlertCircle className="h-10 w-10 mb-2" />
          <p className="text-sm font-bold">Error!</p>
          <p className="text-xs text-center">{error}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={(e) => {
            e.stopPropagation();
            clearFile();
          }}>
            Coba File Lain
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-md bg-primary/5 p-4 mb-4 group-hover:bg-primary/10 transition-colors">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <p className="text-sm font-semibold mb-1">Klik atau seret file Excel/CSV ke sini</p>
          <p className="text-xs text-muted-foreground text-center">
            Kami akan mencoba mencocokkan kolom secara otomatis
          </p>
        </>
      )}
    </div>
  );
}
