import React, { useState, useEffect } from 'react';
import { fetchCourses, createCourse, deleteCourse } from '../../api/courses';
import { PageHeader, Button, Icon } from '../../shared/ui';

const ICON_COURSE = 'M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5';

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const load = async () => {
    try { setLoading(true); const r = await fetchCourses(); setCourses(r.data || []); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!name.trim() || !subject.trim()) return;
    try { await createCourse({ title: name.trim(), subject: subject.trim(), description: description.trim() || null }); setName(''); setSubject(''); setDescription(''); setShowCreate(false); load(); }
    catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ICON_COURSE}
        title="课程管理"
        description="管理你的课程和学习空间"
        actions={
          <Button onClick={() => setShowCreate(!showCreate)}>
            <Icon d="M12 4.5v15m7.5-7.5h-15" className="h-4 w-4" />
            新建课程
          </Button>
        }
      />

      {showCreate && (
        <div className="card p-6 space-y-3">
          <input className="input-base" placeholder="课程名称" value={name} onChange={e => setName(e.target.value)} />
          <input className="input-base" placeholder="学科（如：数学、计算机科学）" value={subject} onChange={e => setSubject(e.target.value)} />
          <input className="input-base" placeholder="课程描述（可选）" value={description} onChange={e => setDescription(e.target.value)} />
          <div className="flex gap-2 pt-1">
            <button onClick={handleCreate} className="btn-primary">创建课程</button>
            <button onClick={() => setShowCreate(false)} className="btn-ghost">取消</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 rounded-full border-2 border-[#10A37F] border-t-transparent animate-spin" />
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-20 card">
          <p className="text-[#7B7B7B] font-medium">暂无课程，点击"新建课程"开始</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {courses.map(c => (
            <div key={c.id} className="card p-5 card-hover group">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#1F1F1F] truncate">{c.name}</h3>
                  <span className="badge tag-sky mt-2">{c.subject}</span>
                </div>
                <button onClick={() => handleDelete(c.id)}
                  className="p-1.5 rounded-xl text-[#A0A0A0] hover:text-[#e74c3c] hover:bg-[#fce4e4] opacity-0 group-hover:opacity-100 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
                </button>
              </div>
              {c.description && <p className="text-sm text-[#7B7B7B] mt-3 line-clamp-2">{c.description}</p>}
              <div className="mt-4 pt-3 border-t border-black/[0.04] text-xs text-[#A0A0A0] font-medium">
                创建于 {c.createdAt?.slice(0, 10)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Courses;
