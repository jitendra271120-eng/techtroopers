import { useEffect, useState } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AuthModal from './components/AuthModal';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Ebooks from './pages/Ebooks';
import Exams from './pages/Exams';
import ExamWelcome from './pages/ExamWelcome';
import ExamAttempt from './pages/ExamAttempt';
import RoadMaps from './pages/RoadMaps';
import Vacancies from './pages/Vacancies';
import VacancyDetails from './pages/VacancyDetails';
import TroopersTalk from './pages/TroopersTalk';
import Portfolio from './pages/Portfolio';
import QuestionBanks from './pages/QuestionBanks';
import ViewAnswerKey from './pages/ViewAnswerKey';
import ResumeBuilder from './pages/ResumeBuilder';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminMaster from './pages/admin/AdminMaster';
import AdminExam from './pages/admin/AdminExam';
import AdminQuestionBank from './pages/admin/AdminQuestionBank';
import AdminAnswerKey from './pages/admin/AdminAnswerKey';
import AdminResults from './pages/admin/AdminResults';
import AdminAllUserScoresPage from './pages/admin/AdminAllUserScoresPage';
import AdminTierStudents from './pages/admin/AdminTierStudents';
import AdminUsers from './pages/admin/AdminUsers';
import AdminEbooks from './pages/admin/AdminEbooks';
import AdminRoadMap from './pages/admin/AdminRoadMap';
import AdminVacancy from './pages/admin/AdminVacancy';
import AdminRooms from './pages/admin/AdminRooms';
import AdminTroopersTalk from './pages/admin/AdminTroopersTalk';
import AdminPortfolio from './pages/admin/AdminPortfolio';
import AdminFirebaseData from './pages/admin/AdminFirebaseData';
import SimplePage from './pages/SimplePage';
import NotFound from './pages/NotFound';

const AdminRoute=({children})=><ProtectedRoute admin>{children}</ProtectedRoute>;

export default function App(){
  const [authMode,setAuthMode]=useState(null);
  const location=useLocation(); const navigate=useNavigate();
  useEffect(()=>{ const p=new URLSearchParams(location.search); if(p.get('auth')) setAuthMode(p.get('auth')); },[location.search]);
  const closeAuth=()=>{setAuthMode(null); if(location.search.includes('auth=')) navigate(location.pathname,{replace:true});};
  const hideChrome=location.pathname.startsWith('/exam/attempt/') || location.pathname.startsWith('/admin');
  return <Layout openAuth={setAuthMode} hideChrome={hideChrome}>
    <Routes>
      <Route path="/" element={<Home openAuth={setAuthMode}/>}/>
      <Route path="/ebooks" element={<Ebooks/>}/>
      <Route path="/exams" element={<Exams/>}/>
      <Route path="/exam/welcome/:examId" element={<ExamWelcome/>}/>
      <Route path="/exam/attempt/:examId" element={<ProtectedRoute><ExamAttempt/></ProtectedRoute>}/>
      <Route path="/roadmaps" element={<RoadMaps/>}/>
      <Route path="/vacancies" element={<Vacancies/>}/>
      <Route path="/vacancies/:id" element={<VacancyDetails/>}/>
      <Route path="/talk" element={<TroopersTalk/>}/>
      <Route path="/portfolio" element={<Portfolio/>}/>
      <Route path="/question-banks" element={<QuestionBanks/>}/>
      <Route path="/answer-keys" element={<ViewAnswerKey/>}/>
      <Route path="/resume-builder" element={<ResumeBuilder/>}/>
      <Route path="/about" element={<SimplePage type="about"/>}/>
      <Route path="/contact" element={<SimplePage type="contact"/>}/>
      <Route path="/services" element={<SimplePage type="services"/>}/>
      <Route path="/gallery" element={<SimplePage type="gallery"/>}/>
      <Route path="/trainings" element={<SimplePage type="trainings"/>}/>
      <Route path="/courses" element={<SimplePage type="courses"/>}/>
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard/></ProtectedRoute>}/>

      <Route path="/admin" element={<AdminRoute><AdminMaster/></AdminRoute>}/>
      <Route path="/admin/exams" element={<AdminRoute><AdminExam/></AdminRoute>}/>
      <Route path="/admin/questions" element={<AdminRoute><AdminQuestionBank/></AdminRoute>}/>
      <Route path="/admin/answer-key" element={<AdminRoute><AdminAnswerKey/></AdminRoute>}/>
      <Route path="/admin/results" element={<AdminRoute><AdminResults/></AdminRoute>}/>
      <Route path="/admin/all-scores" element={<AdminRoute><AdminAllUserScoresPage/></AdminRoute>}/>
      <Route path="/admin/tier-students" element={<AdminRoute><AdminTierStudents/></AdminRoute>}/>
      <Route path="/admin/users" element={<AdminRoute><AdminUsers/></AdminRoute>}/>
      <Route path="/admin/ebooks" element={<AdminRoute><AdminEbooks/></AdminRoute>}/>
      <Route path="/admin/roadmaps" element={<AdminRoute><AdminRoadMap/></AdminRoute>}/>
      <Route path="/admin/vacancies" element={<AdminRoute><AdminVacancy/></AdminRoute>}/>
      <Route path="/admin/rooms" element={<AdminRoute><AdminRooms/></AdminRoute>}/>
      <Route path="/admin/troopers-talk" element={<AdminRoute><AdminTroopersTalk/></AdminRoute>}/>
      <Route path="/admin/portfolio" element={<AdminRoute><AdminPortfolio/></AdminRoute>}/>
      <Route path="/admin/data" element={<AdminRoute><AdminFirebaseData/></AdminRoute>}/>
      <Route path="/admin/console" element={<AdminRoute><AdminDashboard/></AdminRoute>}/>

      <Route path="/online-exam" element={<Navigate to="/exams" replace/>}/>
      <Route path="/e-books" element={<Navigate to="/ebooks" replace/>}/>
      <Route path="/road-maps" element={<Navigate to="/roadmaps" replace/>}/>
      <Route path="/troopers-talk" element={<Navigate to="/talk" replace/>}/>
      <Route path="/job-portal" element={<Navigate to="/vacancies" replace/>}/>
      <Route path="/jobs" element={<Navigate to="/vacancies" replace/>}/>

      <Route path="/AdminMaster" element={<Navigate to="/admin" replace/>}/>
      <Route path="/adminExam" element={<Navigate to="/admin/exams" replace/>}/>
      <Route path="/adminQuestionBank" element={<Navigate to="/admin/questions" replace/>}/>
      <Route path="/adminAnswerKey" element={<Navigate to="/admin/answer-key" replace/>}/>
      <Route path="/viewAnswerKey" element={<Navigate to="/answer-keys" replace/>}/>
      <Route path="/adminResults" element={<Navigate to="/admin/results" replace/>}/>
      <Route path="/adminVacancy" element={<Navigate to="/admin/vacancies" replace/>}/>
      <Route path="/adminUsers" element={<Navigate to="/admin/users" replace/>}/>
      <Route path="/adminEbooks" element={<Navigate to="/admin/ebooks" replace/>}/>
      <Route path="/adminRoadMap" element={<Navigate to="/admin/roadmaps" replace/>}/>
      <Route path="/AdminRooms" element={<Navigate to="/admin/rooms" replace/>}/>
      <Route path="/AdminAllUserScoresPage" element={<Navigate to="/admin/all-scores" replace/>}/>
      <Route path="/AdminTierStudents" element={<Navigate to="/admin/tier-students" replace/>}/>
      <Route path="*" element={<NotFound/>}/>
    </Routes>
    {authMode && <AuthModal mode={authMode} onClose={closeAuth} onSwitch={setAuthMode}/>} 
  </Layout>;
}
