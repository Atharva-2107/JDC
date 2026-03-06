import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
    LayoutDashboard, Map, Bell, BedDouble, ChevronRight,
    Ambulance, LogOut, Wifi, WifiOff, Activity, ClipboardList, BarChart3
} from 'lucide-react';

const HospitalNav = [
    { path: '/hospital', icon: LayoutDashboard, label: 'Overview', exact: true },
    { path: '/hospital/map', icon: Map, label: 'Live Map' },
    { path: '/hospital/incidents', icon: Activity, label: 'Incidents' },
    { path: '/hospital/beds', icon: BedDouble, label: 'Bed Management' },
    { path: '/hospital/ambulances', icon: Ambulance, label: 'Ambulances' },
    { path: '/hospital/alerts', icon: Bell, label: 'Alert History' },
    { path: '/hospital/analytics', icon: BarChart3, label: 'Analytics' },
];

const AmbulanceNav = [
    { path: '/ambulance', icon: LayoutDashboard, label: 'Overview', exact: true },
    { path: '/ambulance/dispatch', icon: Map, label: 'Dispatch Map' },
    { path: '/ambulance/incidents', icon: ClipboardList, label: 'My Incidents' },
    { path: '/ambulance/history', icon: Activity, label: 'History' },
];

export default function Sidebar({ role }) {
    const { user, logout } = useAuth();
    const { connected, crashes } = useSocket();
    const navigate = useNavigate();
    const navItems = role === 'hospital' ? HospitalNav : AmbulanceNav;
    const activeCrashes = crashes.filter(c => c.status === 'active').length;

    const handleLogout = () => { logout(); navigate('/'); };

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon" style={{ fontSize: 20 }}>🛡️</div>
                <div>
                    <div className="sidebar-logo-text">JDC</div>
                    <div className="sidebar-logo-sub">{role === 'hospital' ? 'Hospital Portal' : 'Ambulance Portal'}</div>
                </div>
            </div>

            {/* Connection status */}
            <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {connected
                    ? <><Wifi size={13} color="#10b981" /><span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>Live Connected</span></>
                    : <><WifiOff size={13} color="#ef4444" /><span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>Disconnected</span></>
                }
            </div>

            {/* Nav */}
            <nav className="sidebar-nav">
                <div className="sidebar-section-label">Navigation</div>
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.exact}
                        className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                    >
                        <item.icon size={18} />
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {item.label === 'Incidents' && activeCrashes > 0 && (
                            <span className="sidebar-item-badge">{activeCrashes}</span>
                        )}
                        {item.label === 'Alert History' && activeCrashes > 0 && (
                            <span className="sidebar-item-badge">{activeCrashes}</span>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* User + Logout */}
            <div className="sidebar-user">
                <div className="sidebar-avatar">{user?.avatar || user?.name?.charAt(0)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                    <div style={{ fontSize: 11, color: '#475569', textTransform: 'capitalize' }}>{user?.role}</div>
                </div>
                <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 6, borderRadius: 8, transition: 'color 0.2s' }}
                    title="Logout" onMouseOver={e => e.currentTarget.style.color = '#ef4444'} onMouseOut={e => e.currentTarget.style.color = '#475569'}>
                    <LogOut size={16} />
                </button>
            </div>
        </aside>
    );
}
