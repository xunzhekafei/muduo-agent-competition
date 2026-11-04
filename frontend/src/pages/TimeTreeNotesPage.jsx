import React from 'react';
import { useParams } from 'react-router-dom';
import TimeTreeNotes from '../features/time-tree/TimeTreeNotes.jsx';

const TimeTreeNotesPage = () => {
  const { id } = useParams();
  return <TimeTreeNotes initialNoteId={id || null} />;
};

export default TimeTreeNotesPage;
