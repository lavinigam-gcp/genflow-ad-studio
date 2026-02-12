import { ThemeProvider, CssBaseline } from '@mui/material';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { theme } from './theme';
import MainLayout from './components/layout/MainLayout';
import PipelinePage from './components/pages/PipelinePage';
import BulkPage from './components/pages/BulkPage';
import ReviewPage from './components/pages/ReviewPage';
import HistoryPage from './components/pages/HistoryPage';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<PipelinePage />} />
            <Route path="/bulk" element={<BulkPage />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
