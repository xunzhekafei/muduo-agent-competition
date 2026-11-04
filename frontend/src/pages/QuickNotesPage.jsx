import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QuickNotes from '../features/quick-notes/QuickNotes';

const QuickNotesPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return <QuickNotes noteId={id} onBack={() => navigate('/quick-notes')} />;
};

export default QuickNotesPage;
