import { useState, useCallback, useRef } from 'react';
import {
  Paper,
  Typography,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { CloudUpload, InsertDriveFile } from '@mui/icons-material';
import { useBulkStore } from '../../store/bulkStore';

export default function CSVUploader() {
  const { uploadedFile, setFile, isProcessing, setProcessing } = useBulkStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = useCallback((text: string) => {
    const lines = text.trim().split('\n');
    if (lines.length === 0) return;

    const parsedHeaders = lines[0].split(',').map((h) => h.trim());
    setHeaders(parsedHeaders);

    const rows = lines.slice(1, 6).map((line) => line.split(',').map((c) => c.trim()));
    setPreviewRows(rows);
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      setFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        parseCSV(text);
      };
      reader.readAsText(file);
    },
    [setFile, parseCSV]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleStartProcessing = () => {
    setProcessing(true);
    // Processing would be triggered by the parent / API call
  };

  return (
    <Box>
      {!uploadedFile ? (
        <Paper
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
          sx={{
            p: 6,
            textAlign: 'center',
            cursor: 'pointer',
            border: '2px dashed',
            borderColor: isDragOver ? 'primary.main' : '#DADCE0',
            backgroundColor: isDragOver ? '#E8F0FE' : 'background.paper',
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: '#9AA0A6',
              backgroundColor: '#F8F9FA',
            },
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            onChange={handleInputChange}
            style={{ display: 'none' }}
          />
          <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>
            Drop CSV file here or click to upload
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Supports CSV and XLSX formats with columns: product_name, specifications, image_url
          </Typography>
        </Paper>
      ) : (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <InsertDriveFile color="primary" />
            <Box sx={{ flex: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {uploadedFile.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {(uploadedFile.size / 1024).toFixed(1)} KB
              </Typography>
            </Box>
            <Chip label={`${previewRows.length} rows`} variant="outlined" />
            <Button
              variant="text"
              size="small"
              onClick={() => {
                setFile(null);
                setPreviewRows([]);
                setHeaders([]);
              }}
            >
              Remove
            </Button>
          </Box>

          {headers.length > 0 && (
            <TableContainer component={Paper} sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {headers.map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 600 }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewRows.map((row, i) => (
                    <TableRow key={i}>
                      {row.map((cell, j) => (
                        <TableCell key={j}>
                          <Typography
                            variant="body2"
                            sx={{
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {cell}
                          </Typography>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleStartProcessing}
            disabled={isProcessing}
            sx={{ py: 1.5 }}
          >
            {isProcessing ? 'Processing...' : 'Start Processing'}
          </Button>
        </Box>
      )}
    </Box>
  );
}
