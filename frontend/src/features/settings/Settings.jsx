import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCurrentUser, fetchUserPreferences, updateUserPreferences } from '../../api/users';
import { logout } from '../../api/client';
import { PageHeader } from '../../shared/ui';

const ICON_SETTINGS = 'M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75';

const Switch = ({ checked, onChange }) => (
  <button onClick={onChange} className={`relative w-10 h-6 rounded-full transition-colors duration-200 ${checked?'bg-[#10A37F]':'bg-[#E0E0E0]'}`}>
    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${checked?'left-[18px]':'left-0.5'}`}/>
  </button>
);

const Settings = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [prefs, setPrefs] = useState({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    Promise.all([fetchCurrentUser(), fetchUserPreferences()])
      .then(([u,p])=>{setProfile(u.data);setPrefs({...p.data,doNotDisturb:false,aiReminder:true,reviewNotify:true,communityMsg:false});})
      .catch(()=>{}).finally(()=>setLoading(false));
  },[]);

  const update = async (key, value) => {
    const np = {...prefs,[key]:value}; setPrefs(np);
    try{await updateUserPreferences(np);setMsg('已保存');setTimeout(()=>setMsg(''),1500);}catch{setMsg('失败');}
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if(loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-[#10A37F] border-t-transparent animate-spin"/></div>;

  return (
    <div className="h-full flex flex-col" style={{maxHeight:'calc(100vh - 140px)'}}>
      <PageHeader
        icon={ICON_SETTINGS}
        title="设置"
        description="管理账户与偏好"
        actions={msg ? <span className="text-xs font-medium text-brand-600">{msg}</span> : undefined}
      />

      <div className="grid grid-cols-3 gap-4 flex-1">
        {/* 账户 */}
        <div className="card p-5">
          <h2 className="text-[11px] font-semibold text-[#A0A0A0] uppercase tracking-wider mb-3">账户</h2>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold bg-[#E9E2F7] text-[#5B3FA8]">学</div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[#1F1F1F] truncate">{profile?.username||'学生用户'}</h3>
              <p className="text-xs text-[#7B7B7B] truncate">{profile?.email||'student@example.com'}</p>
            </div>
          </div>
        </div>

        {/* 通知 */}
        <div className="card p-5">
          <h2 className="text-[11px] font-semibold text-[#A0A0A0] uppercase tracking-wider mb-3">通知</h2>
          <div className="space-y-3.5">
            {[
              {key:'doNotDisturb',label:'免打扰',desc:'暂停推送'},
              {key:'aiReminder',label:'AI 提醒',desc:'记忆曲线复习'},
              {key:'reviewNotify',label:'复习通知',desc:'每日定时'},
              {key:'communityMsg',label:'社区消息',desc:'评论与互动'},
            ].map(item=>(
              <div key={item.key} className="flex items-center justify-between">
                <div><p className="text-sm font-medium text-[#1F1F1F]">{item.label}</p><p className="text-[10px] text-[#A0A0A0]">{item.desc}</p></div>
                <Switch checked={prefs[item.key]??false} onChange={()=>update(item.key,!prefs[item.key])}/>
              </div>
            ))}
          </div>
        </div>

        {/* 账户操作 */}
        <div className="card p-5">
          <h2 className="text-[11px] font-semibold text-[#A0A0A0] uppercase tracking-wider mb-3">账户操作</h2>
          <div className="space-y-0.5">
            {[{label:'修改密码'},{label:'隐私政策'},{label:'用户协议'}].map(item=>(
              <button key={item.label} className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-black/[0.02] transition-colors">
                <span className="text-sm font-medium text-[#1F1F1F]">{item.label}</span>
                <svg className="h-3.5 w-3.5 text-[#A0A0A0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
              </button>
            ))}
            <button onClick={handleLogout} className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-[#fce4e4] transition-colors">
              <span className="text-sm font-medium text-[#c0392b]">退出登录</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
