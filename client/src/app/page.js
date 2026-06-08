"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- MOCK DATA FOR PROTOTYPE ---
const MOCK_STATS = [
  { label: 'Active Projects', value: '24', trend: '+3 this week', type: 'primary' },
  { label: 'Pending Approvals', value: '7', trend: 'Requires attention', type: 'warning' },
  { label: 'Resolved Violations', value: '142', trend: '98% resolution rate', type: 'success' },
];

const MOCK_PROJECTS = [
  { id: '1', title: 'Main Street Water Main Replacement', agencies: ['Water Dept', 'City Roads'], status: 'in_progress', date: 'Oct 12 - Nov 30' },
  { id: '2', title: 'Downtown Fiber Optic Installation', agencies: ['Telecom Inc', 'Power Grid'], status: 'coordination', date: 'Nov 15 - Dec 10' },
  { id: '3', title: 'Highway 9 Drainage Upgrade', agencies: ['Municipal', 'Water Dept'], status: 'approved', date: 'Dec 01 - Dec 20' },
  { id: '4', title: 'Westside Gas Line Extension', agencies: ['Gas Corp'], status: 'in_progress', date: 'Dec 05 - Jan 15' },
];

const MOCK_UPDATES = [
  { time: '10 mins ago', text: 'Water Dept approved digging request for Downtown Fiber Optic.' },
  { time: '2 hours ago', text: 'Citizen reported a road safety violation near Highway 9.' },
  { time: 'Yesterday', text: 'Main Street Water Main project reached 50% completion.' },
];

const MOCK_AGENCIES = [
  { name: 'Water Dept', contact: 'water@city.gov', projects: 12, score: '98%' },
  { name: 'Power Grid', contact: 'power@city.gov', projects: 8, score: '95%' },
  { name: 'Telecom Inc', contact: 'fiber@telecom.com', projects: 15, score: '92%' },
  { name: 'City Roads', contact: 'roads@city.gov', projects: 22, score: '88%' },
];

const MOCK_VIOLATIONS = [
  { id: 'V-101', type: 'Safety Hazard', location: 'Downtown', severity: 'High', status: 'Pending' },
  { id: 'V-102', type: 'Delay', location: 'Highway 9', severity: 'Medium', status: 'Resolved' },
  { id: 'V-103', type: 'Permit Expired', location: 'Main Street', severity: 'High', status: 'Pending' },
  { id: 'V-104', type: 'Noise Complaint', location: 'Westside', severity: 'Low', status: 'Pending' },
];

export default function Dashboard() {
  const [dbStatus, setDbStatus] = useState({ loading: true, connected: false });
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'

  useEffect(() => {
    // Ping Supabase to prove connection
    const checkSupabase = async () => {
      try {
        const { error } = await supabase.from('projects').select('id').limit(1);
        if (error && error.code !== '42P01') throw error; // Ignore relation doesn't exist if tables empty
        setDbStatus({ loading: false, connected: true });
      } catch (err) {
        console.error(err);
        setDbStatus({ loading: false, connected: false });
      }
    };
    checkSupabase();
  }, []);

  // Render Functions for Tabs
  const renderDashboard = () => (
    <>
      {/* Stats Grid */}
      <section className="grid grid-cols-3 mb-xl">
        {MOCK_STATS.map((stat, i) => (
          <div key={i} className={`card ${i === 0 ? 'card-blue' : i === 1 ? 'card-pink' : 'card-orange'}`}>
            <p className="text-sm font-medium mb-xs text-muted">{stat.label}</p>
            <div className="stat-value">{stat.value}</div>
            <p className={`text-xs mb-0 font-medium ${stat.type === 'success' ? 'text-success' : stat.type === 'warning' ? 'text-warning' : 'text-primary'}`}>
              {stat.trend}
            </p>
          </div>
        ))}
      </section>

      <div className="grid mb-xl" style={{ gridTemplateColumns: '2fr 1fr', gap: 'var(--space-xl)' }}>
        {/* Map Area */}
        <section className="card flex flex-col">
          <div className="flex justify-between items-center mb-md">
             <h3 className="mb-0">Live Infrastructure Map</h3>
             <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('Map View')}>Expand Map</button>
          </div>
          <div className="h-full" style={{ borderRadius: 12, minHeight: 300, overflow: 'hidden', border: '1px solid var(--border-light)' }}>
            <iframe width="100%" height="100%" frameBorder="0" scrolling="no" marginHeight="0" marginWidth="0" src="https://maps.google.com/maps?q=New+Delhi,India&t=&z=13&ie=UTF8&iwloc=&output=embed" style={{ minHeight: '300px', display: 'block' }}></iframe>
          </div>
        </section>

        {/* Activity Feed */}
        <section className="card">
          <h3 className="mb-md">Recent Activity</h3>
          <div className="flex flex-col">
            {MOCK_UPDATES.map((update, i) => (
              <div key={i} className="list-item">
                <p className="text-xs text-primary mb-xs font-medium">{update.time}</p>
                <p className="text-sm mb-0 text-dark">{update.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Projects Table List */}
      <section className="card">
        <div className="flex justify-between items-center mb-md">
          <h3 className="mb-0">Active Coordination Projects</h3>
          <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('Projects')}>View All Projects</button>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full" style={{ textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="font-medium text-sm" style={{ padding: 'var(--space-md) 0' }}>Project</th>
                <th className="font-medium text-sm" style={{ padding: 'var(--space-md) 0' }}>Agencies Involved</th>
                <th className="font-medium text-sm" style={{ padding: 'var(--space-md) 0' }}>Timeline</th>
                <th className="font-medium text-sm" style={{ padding: 'var(--space-md) 0' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_PROJECTS.slice(0, 3).map((proj) => (
                <tr key={proj.id}>
                  <td className="font-medium" style={{ padding: 'var(--space-md) 0', color: 'var(--text-dark)' }}>{proj.title}</td>
                  <td style={{ padding: 'var(--space-md) 0' }}>
                    <div className="flex gap-xs">
                      {proj.agencies.map(a => <span key={a} className="badge badge-outline">{a}</span>)}
                    </div>
                  </td>
                  <td className="text-sm text-muted" style={{ padding: 'var(--space-md) 0' }}>{proj.date}</td>
                  <td style={{ padding: 'var(--space-md) 0' }}>
                    {proj.status === 'in_progress' && <span className="badge badge-primary">In Progress</span>}
                    {proj.status === 'coordination' && <span className="badge badge-warning">Coordination</span>}
                    {proj.status === 'approved' && <span className="badge badge-success">Approved</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );

  const renderMapView = () => (
    <section className="card flex flex-col" style={{ minHeight: '600px' }}>
      <div className="flex justify-between items-center mb-md">
         <h3 className="mb-0">Full Map View</h3>
         <div className="flex gap-sm">
            <button className="btn btn-outline btn-sm">Digging Zones</button>
            <button className="btn btn-outline btn-sm">Utilities</button>
            <button className="btn btn-outline btn-sm">Traffic</button>
         </div>
      </div>
      <div className="h-full" style={{ borderRadius: 12, flex: 1, overflow: 'hidden', border: '1px solid var(--border-light)', position: 'relative' }}>
         <iframe width="100%" height="100%" frameBorder="0" scrolling="no" marginHeight="0" marginWidth="0" src="https://maps.google.com/maps?q=New+Delhi,India&t=&z=14&ie=UTF8&iwloc=&output=embed" style={{ minHeight: '500px', display: 'block' }}></iframe>
         {/* Mock Map Elements */}
         <div style={{ position: 'absolute', top: '20%', left: '30%', padding: '8px', background: 'var(--warning)', color: 'white', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>Digging Zone A</div>
         <div style={{ position: 'absolute', top: '50%', right: '20%', padding: '8px', background: 'var(--primary)', color: 'white', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>Water Main Project</div>
         <div style={{ position: 'absolute', bottom: '30%', left: '40%', padding: '8px', background: 'var(--error)', color: 'white', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>Active Violation</div>
      </div>
    </section>
  );

  const renderProjects = () => (
    <section className="card" style={{ minHeight: '600px' }}>
      <h3 className="mb-md">Projects Kanban Board</h3>
      <div className="grid grid-cols-3 gap-lg">
         {/* To Do Column */}
         <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
            <h4 className="mb-md">Pending / Coordination</h4>
            {MOCK_PROJECTS.filter(p => p.status === 'coordination').map(proj => (
               <div key={proj.id} className="card mb-sm" style={{ padding: '12px', borderLeft: '4px solid var(--warning)' }}>
                  <p className="font-medium mb-xs text-sm">{proj.title}</p>
                  <p className="text-xs text-muted mb-sm">{proj.date}</p>
                  <div className="flex gap-xs flex-wrap">
                    {proj.agencies.map(a => <span key={a} className="badge badge-outline" style={{ fontSize: '0.6rem' }}>{a}</span>)}
                  </div>
               </div>
            ))}
         </div>
         {/* In Progress Column */}
         <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
            <h4 className="mb-md">In Progress</h4>
            {MOCK_PROJECTS.filter(p => p.status === 'in_progress').map(proj => (
               <div key={proj.id} className="card mb-sm" style={{ padding: '12px', borderLeft: '4px solid var(--primary)' }}>
                  <p className="font-medium mb-xs text-sm">{proj.title}</p>
                  <p className="text-xs text-muted mb-sm">{proj.date}</p>
                  <div className="flex gap-xs flex-wrap">
                    {proj.agencies.map(a => <span key={a} className="badge badge-outline" style={{ fontSize: '0.6rem' }}>{a}</span>)}
                  </div>
               </div>
            ))}
         </div>
         {/* Approved Column */}
         <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
            <h4 className="mb-md">Approved / Completed</h4>
            {MOCK_PROJECTS.filter(p => p.status === 'approved').map(proj => (
               <div key={proj.id} className="card mb-sm" style={{ padding: '12px', borderLeft: '4px solid var(--success)' }}>
                  <p className="font-medium mb-xs text-sm">{proj.title}</p>
                  <p className="text-xs text-muted mb-sm">{proj.date}</p>
                  <div className="flex gap-xs flex-wrap">
                    {proj.agencies.map(a => <span key={a} className="badge badge-outline" style={{ fontSize: '0.6rem' }}>{a}</span>)}
                  </div>
               </div>
            ))}
         </div>
      </div>
    </section>
  );

  const renderAgencies = () => (
    <section className="card" style={{ minHeight: '600px' }}>
      <h3 className="mb-md">Partner Agencies Directory</h3>
      <div className="grid grid-cols-2 gap-md">
        {MOCK_AGENCIES.map((agency, i) => (
          <div key={i} className={`card ${i % 3 === 0 ? 'card-blue' : i % 3 === 1 ? 'card-pink' : 'card-orange'}`}>
            <div className="flex justify-between items-start mb-md">
               <div>
                 <h4 className="mb-xs" style={{ fontSize: '1.2rem' }}>{agency.name}</h4>
                 <p className="text-xs text-muted mb-0">{agency.contact}</p>
               </div>
               <span className="badge badge-success">Active Partner</span>
            </div>
            <div className="flex gap-lg">
               <div>
                  <p className="text-xs text-muted mb-xs">Active Projects</p>
                  <p className="font-bold text-lg">{agency.projects}</p>
               </div>
               <div>
                  <p className="text-xs text-muted mb-xs">Performance Score</p>
                  <p className="font-bold text-lg text-success">{agency.score}</p>
               </div>
            </div>
            <button className="btn btn-outline btn-sm mt-md w-full" onClick={() => alert(`Opening details for ${agency.name}`)}>View Profile</button>
          </div>
        ))}
      </div>
    </section>
  );

  const renderViolations = () => (
    <section className="card" style={{ minHeight: '600px' }}>
      <div className="flex justify-between items-center mb-md">
         <h3 className="mb-0">Reported Violations</h3>
         <button className="btn btn-primary btn-sm" onClick={() => alert('Opening report form...')}>Report Violation</button>
      </div>
      
      <table className="w-full" style={{ textAlign: 'left', borderCollapse: 'collapse' }}>
         <thead>
            <tr>
               <th className="font-medium text-sm" style={{ padding: 'var(--space-md) 0' }}>ID</th>
               <th className="font-medium text-sm" style={{ padding: 'var(--space-md) 0' }}>Type</th>
               <th className="font-medium text-sm" style={{ padding: 'var(--space-md) 0' }}>Location</th>
               <th className="font-medium text-sm" style={{ padding: 'var(--space-md) 0' }}>Severity</th>
               <th className="font-medium text-sm" style={{ padding: 'var(--space-md) 0' }}>Status</th>
               <th className="font-medium text-sm" style={{ padding: 'var(--space-md) 0' }}>Action</th>
            </tr>
         </thead>
         <tbody>
            {MOCK_VIOLATIONS.map((v) => (
               <tr key={v.id}>
                  <td className="text-sm font-medium" style={{ padding: 'var(--space-md) 0' }}>{v.id}</td>
                  <td className="text-sm" style={{ padding: 'var(--space-md) 0' }}>{v.type}</td>
                  <td className="text-sm text-muted" style={{ padding: 'var(--space-md) 0' }}>{v.location}</td>
                  <td style={{ padding: 'var(--space-md) 0' }}>
                     {v.severity === 'High' && <span className="badge badge-error">High</span>}
                     {v.severity === 'Medium' && <span className="badge badge-warning">Medium</span>}
                     {v.severity === 'Low' && <span className="badge badge-primary">Low</span>}
                  </td>
                  <td className="text-sm font-bold" style={{ padding: 'var(--space-md) 0', color: v.status === 'Resolved' ? 'var(--success)' : 'var(--warning)' }}>
                     {v.status}
                  </td>
                  <td style={{ padding: 'var(--space-md) 0' }}>
                     <button className="btn btn-outline btn-sm" onClick={() => alert(`Resolving violation ${v.id}`)}>
                        {v.status === 'Resolved' ? 'View' : 'Resolve'}
                     </button>
                  </td>
               </tr>
            ))}
         </tbody>
      </table>
    </section>
  );

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
        <div className="card" style={{ width: '100%', maxWidth: '400px', padding: 'var(--space-2xl) var(--space-xl)', textAlign: 'center', background: 'white' }}>
          <div className="mb-lg flex justify-center">
             <div style={{ width: 48, height: 48, background: 'var(--primary)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white', fontSize: '1.5rem' }}>G</div>
          </div>
          <h2 className="mb-sm">{authMode === 'login' ? 'Welcome Back' : 'Create an Account'}</h2>
          <p className="text-muted mb-xl">{authMode === 'login' ? 'Sign in to access the Gati Dashboard' : 'Sign up to coordinate infrastructure projects'}</p>
          
          <form onSubmit={(e) => { e.preventDefault(); setIsAuthenticated(true); }}>
            {authMode === 'signup' && (
              <input type="text" placeholder="Full Name" required className="w-full mb-md" style={{ padding: '12px', border: '1px solid var(--border-light)', borderRadius: '8px', outline: 'none' }} />
            )}
            <input type="email" placeholder="Email Address" required className="w-full mb-md" style={{ padding: '12px', border: '1px solid var(--border-light)', borderRadius: '8px', outline: 'none' }} />
            <input type="password" placeholder="Password" required className="w-full mb-lg" style={{ padding: '12px', border: '1px solid var(--border-light)', borderRadius: '8px', outline: 'none' }} />
            
            <button type="submit" className="btn btn-primary w-full" style={{ padding: '12px', fontSize: '1rem' }}>
              {authMode === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <p className="mt-lg mb-0 text-sm">
            {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer' }}>
              {authMode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="mb-xl flex items-center gap-sm">
          <div style={{ width: 32, height: 32, background: 'white', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--primary)' }}>G</div>
          <h2 className="mb-0 text-light" style={{ color: 'white' }}>Gati</h2>
        </div>
        
        <nav className="flex flex-col gap-sm">
          {[
            { id: 'Dashboard', icon: '📊' },
            { id: 'Map View', icon: '🗺️' },
            { id: 'Projects', icon: '📁' },
            { id: 'Agencies', icon: '🏢' },
            { id: 'Violations', icon: '⚠️' }
          ].map(tab => (
            <button 
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`nav-link w-full text-left ${activeTab === tab.id ? 'active' : ''}`}
               style={{ background: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : 'transparent', border: 'none', cursor: 'pointer', outline: 'none', fontFamily: 'inherit', fontSize: '1rem' }}
            >
               <span style={{ marginRight: '8px' }}>{tab.icon}</span> {tab.id}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-lg" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button 
             onClick={() => setIsAuthenticated(false)}
             className="nav-link w-full text-left"
             style={{ background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', marginBottom: 'var(--space-md)' }}
          >
             <span style={{ marginRight: '8px' }}>🚪</span> Sign Out
          </button>
          <div style={{ padding: 'var(--space-md) 0' }}>
            <div className="flex items-center justify-between mb-sm">
              <h4 className="mb-0 text-sm" style={{ color: 'white' }}>Supabase DB</h4>
              {dbStatus.loading ? (
                <span className="status-dot loading"></span>
              ) : dbStatus.connected ? (
                <span className="status-dot online"></span>
              ) : (
                <span className="status-dot offline"></span>
              )}
            </div>
            <p className="text-xs mb-0" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {dbStatus.connected ? 'Connected via Edge Network' : 'Connection Error'}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="flex justify-between items-center mb-xl">
          <div>
            <h1>{activeTab}</h1>
            <p className="mb-0">Real-time coordination and monitoring dashboard.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>+ New Project</button>
        </header>

        {activeTab === 'Dashboard' && renderDashboard()}
        {activeTab === 'Map View' && renderMapView()}
        {activeTab === 'Projects' && renderProjects()}
        {activeTab === 'Agencies' && renderAgencies()}
        {activeTab === 'Violations' && renderViolations()}

      </main>

      {/* New Project Modal Overlay */}
      {isModalOpen && (
         <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
            <div className="card" style={{ width: '400px', background: 'white' }}>
               <h3 className="mb-md">Create New Project</h3>
               <p className="text-sm text-muted mb-md">Fill out the details below to initialize a new infrastructure project.</p>
               
               <input className="w-full mb-sm" style={{ padding: '10px', border: '1px solid var(--border-light)', borderRadius: '8px', outline: 'none' }} placeholder="Project Title" />
               <select className="w-full mb-sm" style={{ padding: '10px', border: '1px solid var(--border-light)', borderRadius: '8px', outline: 'none' }}>
                  <option value="">Lead Agency</option>
                  <option value="water">Water Dept</option>
                  <option value="power">Power Grid</option>
                  <option value="telecom">Telecom Inc</option>
                  <option value="roads">City Roads</option>
               </select>
               <input type="date" className="w-full mb-md" style={{ padding: '10px', border: '1px solid var(--border-light)', borderRadius: '8px', outline: 'none' }} />
               
               <div className="flex justify-end gap-sm mt-md">
                 <button className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
                 <button className="btn btn-primary" onClick={() => { setIsModalOpen(false); alert('Mock Action: Project created successfully!'); }}>Submit</button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
}
