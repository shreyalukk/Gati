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
];

const MOCK_UPDATES = [
  { time: '10 mins ago', text: 'Water Dept approved digging request for Downtown Fiber Optic.' },
  { time: '2 hours ago', text: 'Citizen reported a road safety violation near Highway 9.' },
  { time: 'Yesterday', text: 'Main Street Water Main project reached 50% completion.' },
];

export default function Dashboard() {
  const [dbStatus, setDbStatus] = useState({ loading: true, connected: false });

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

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="mb-xl flex items-center gap-sm">
          <div style={{ width: 32, height: 32, background: 'white', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--primary)' }}>G</div>
          <h2 className="mb-0 text-light" style={{ color: 'white' }}>Gati</h2>
        </div>
        
        <nav className="flex flex-col gap-sm">
          <a href="#" className="nav-link active">
            <span style={{ marginRight: '8px' }}>📊</span> Dashboard
          </a>
          <a href="#" className="nav-link">
            <span style={{ marginRight: '8px' }}>🗺️</span> Map View
          </a>
          <a href="#" className="nav-link">
            <span style={{ marginRight: '8px' }}>📁</span> Projects
          </a>
          <a href="#" className="nav-link">
            <span style={{ marginRight: '8px' }}>🏢</span> Agencies
          </a>
          <a href="#" className="nav-link">
            <span style={{ marginRight: '8px' }}>⚠️</span> Violations
          </a>
        </nav>

        <div className="mt-auto pt-lg" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
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
            <h1>Overview</h1>
            <p className="mb-0">Real-time coordination and monitoring dashboard.</p>
          </div>
          <button className="btn btn-primary">+ New Project</button>
        </header>

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
            <h3 className="mb-md">Live Infrastructure Map</h3>
            <div className="h-full flex flex-col items-center justify-center" style={{ background: '#f8fafc', borderRadius: 12, minHeight: 300, border: '1px dashed #cbd5e1' }}>
              <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗺️</span>
              <p className="text-center text-muted" style={{ maxWidth: '300px' }}>
                Interactive GIS map will display digging zones, road warranties, and utility assets here.
              </p>
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
            <button className="btn btn-outline btn-sm">View All</button>
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
                {MOCK_PROJECTS.map((proj) => (
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

      </main>
    </div>
  );
}
