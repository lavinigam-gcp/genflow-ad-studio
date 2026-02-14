import { Box, Typography, Link } from '@mui/material';
import { Favorite } from '@mui/icons-material';

const AUTHORS = [
  { name: 'Sunil Kumar', url: 'https://www.linkedin.com/in/sunilkumar88/' },
  { name: 'Gopala Dhar', url: 'https://www.linkedin.com/in/gopaladhar/' },
  { name: 'Lavi Nigam', url: 'https://www.linkedin.com/in/lavinigam/' },
];

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        py: 3,
        px: 2,
        textAlign: 'center',
        backgroundColor: '#FAFBFC',
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
        Crafted with
        <Favorite
          sx={{
            fontSize: 16,
            color: '#D93025',
            '&:hover': { animation: 'pulse 1s ease-in-out infinite' },
          }}
        />
        and a lot of AI by
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
        {AUTHORS.map((author) => (
          <Link
            key={author.name}
            href={author.url}
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            sx={{
              color: 'primary.main',
              fontWeight: 500,
              fontSize: '0.875rem',
              transition: 'all 0.2s ease',
              '&:hover': {
                color: 'primary.dark',
              },
            }}
          >
            {author.name}
          </Link>
        ))}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Powered by Gemini 3 + Veo 3.1
      </Typography>
    </Box>
  );
}
