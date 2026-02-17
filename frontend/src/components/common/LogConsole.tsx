import { useRef, useEffect, useState } from 'react';
import { Paper, Box, Typography, IconButton } from '@mui/material';
import { ExpandMore, ExpandLess, Terminal } from '@mui/icons-material';
import { usePipelineStore } from '../../store/pipelineStore';

const LEVEL_COLORS: Record<string, string> = {
  info: 'info.main',
  success: 'success.main',
  error: 'error.main',
  warn: 'warning.main',
  dim: 'text.disabled',
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
          bgcolor: 'action.hover',
          '&:hover': { bgcolor: 'action.selected' },
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
            bgcolor: 'background.default',
            fontFamily: '"Roboto Mono", monospace',
            fontSize: 13,
            lineHeight: 1.8,
          }}
        >
          {logs.length === 0 ? (
            <Typography
              variant="caption"
              sx={{ color: 'text.disabled', fontFamily: '"Roboto Mono", monospace' }}
            >
              No logs yet
            </Typography>
          ) : (
            logs.map((log, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1 }}>
                <Typography
                  component="span"
                  sx={{
                    color: 'text.disabled',
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
