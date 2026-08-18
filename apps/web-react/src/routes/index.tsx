import { Routes, Route } from 'react-router-dom';
import AppLayout from '../App';
import IndexPage from '../pages/index';
import LoginPage from '../pages/login';
import CatalogPage from '../pages/catalog';
import ImportPage from '../pages/import';
import CoursePage from '../pages/course';
import PracticePage from '../pages/practice';
import GrowthPage from '../pages/growth';
import TasksPage from '../pages/tasks';
import LeaderboardPage from '../pages/leaderboard';
import ReviewPage from '../pages/review';
import VocabPage from '../pages/vocab';
import PkLobbyPage from '../pages/pk-lobby';
import PkBattlePage from '../pages/pk-battle';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<IndexPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/course" element={<CoursePage />} />
        <Route path="/practice" element={<PracticePage />} />
        <Route path="/growth" element={<GrowthPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/vocab" element={<VocabPage />} />
        <Route path="/pk-lobby" element={<PkLobbyPage />} />
        <Route path="/pk-battle" element={<PkBattlePage />} />
        <Route path="*" element={<IndexPage />} />
      </Route>
    </Routes>
  );
}