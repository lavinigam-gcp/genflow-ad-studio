import { useRef, useEffect, useState } from 'react';
import { Paper, Box, Typography, IconButton } from '@mui/material';
import { ExpandMore, ExpandLess, Terminal } from '@mui/icons-material';
import { usePipelineStore } from '../../store/pipelineStore';

const LEVEL_COLORS: Record<string, string> = {
  info: '#1A73E8',
  success: '#1E8E3E',
  error: '#D93025',
  warn: '#E8710A',
  dim: '#9AA0A6',
};

export default function LogConsole() {
  const logs = usePipelineStore((s) => s.logs);
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && expanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, expanded]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour12: false });
  };

  return (
    <Paper
      sx={{
        position: 'sticky',
        bottom: 0,
        borderTop: '1px solid',
        borderColor: 'divider',
        borderRadius: 0,
        border: 'none',
        borderTopStyle: 'solid',
        borderTopWidth: 1,
        borderTopColor: 'divider',
        zIndex: 10,
      }}
    >
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 1,
          cursor: 'pointer',
          backgroundColor: '#F1F3F4',
          '&:hover': { backgroundColor: '#E8EAED' },
        }}
      >
        <Terminal sx={{ fontSize: 18, color: 'text.secondary', mr: 1 }} />
        <Typography variant="body2" sx={{ fontWeight: 500, flex: 1, color: 'text.secondary' }}>
          Logs {logs.length > 0 && `(${logs.length})`}
        </Typography>
        <IconButton size="small">
          {expanded ? <ExpandMore /> : <ExpandLess />}
        </IconButton>
      </Box>

      {expanded && (
        <Box
          ref={scrollRef}
          sx={{
            maxHeight: 250,
            overflow: 'auto',
            px: 2,
            py: 1,
            backgroundColor: '#F8F9FA',
            fontFamily: '"Roboto Mono", monospace',
            fontSize: 13,
            lineHeight: 1.8,
          }}
        >
          {logs.length === 0 ? (
            <Typography
              variant="caption"
              sx={{ color: '#9AA0A6', fontFamily: '"Roboto Mono", monospace' }}
            >
              No logs yet
            </Typography>
          ) : (
            logs.map((log, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1 }}>
                <Typography
                  component="span"
                  sx={{
                    color: '#9AA0A6',
                    fontFamily: '"Roboto Mono", monospace',
                    fontSize: 13,
                    whiteSpace: 'nowrap',
                  }}
                >
                  [{formatTime(log.timestamp)}]
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    color: LEVEL_COLORS[log.level] || LEVEL_COLORS.info,
                    fontFamily: '"Roboto Mono", monospace',
                    fontSize: 13,
                    wordBreak: 'break-word',
                  }}
                >
                  {log.message}
                </Typography>
              </Box>
            ))
          )}
        </Box>
      )}
    </Paper>
  );
}
