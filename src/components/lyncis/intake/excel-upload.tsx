import { useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, FileCheck, AlertCircle, Play } from 'lucide-react';
import { parseExcelFile, ExcelParseResult } from '@/lib/excel-parser';
import { generateHeaderHash, loadSavedMapping } from '@/lib/header-mapper';
import { convertRowsToOrders } from '@/lib/excel-to-orders';
import { ColumnMappingDialog } from './column-mapping-dialog';
import { toast } from 'sonner';
import { JastipOrder } from '@/lib/types';

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
        setMappingDialogOpen(true);
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
    
    try {
      const orders = convertRowsToOrders(data.rows, mapping, defaultTag);
      await onImport(orders);
      toast.success(`Berhasil mengimpor ${orders.length} pesanan.`);
      clearFile();
    } catch (err) {
      toast.error('Gagal mengimpor data ke database.');
    }
  };

  const startImportWithCurrentMapping = () => {
    const mapping = loadSavedMapping(headerHash);
    if (mapping) {
      handleImport(mapping);
    } else {
      setMappingDialogOpen(true);
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (file && !error && !isParsing && data) {
    return (
      <div className="w-full space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3 px-4 py-2 border rounded-md bg-muted/20 border-border">
            <FileCheck className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">{file.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-md hover:bg-destructive/10 hover:text-destructive"
              onClick={clearFile}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {data.rows.length} baris terdeteksi
          </p>
        </div>

        <div className="space-y-4 max-w-sm mx-auto">
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">
              Tag Default (untuk semua baris)
            </Label>
            <Input
              value={defaultTag}
              onChange={(e) => setDefaultTag(e.target.value)}
              placeholder="Contoh: BKK-MAY-2025"
              className="h-9"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-10" onClick={() => setMappingDialogOpen(true)}>
              Atur Pemetaan
            </Button>
            <Button className="flex-1 h-10 font-bold" onClick={startImportWithCurrentMapping}>
              <Play className="h-4 w-4 mr-2" />
              Gas Impor
            </Button>
          </div>
        </div>

        <ColumnMappingDialog
          open={mappingDialogOpen}
          onOpenChange={setMappingDialogOpen}
          headers={data.headers}
          rows={data.rows}
          headerHash={headerHash}
          onConfirm={handleImport}
        />
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
