import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
    ShieldAlert, LayoutDashboard, Map, Bell, BedDouble,
    Truck, LogOut, Wifi, WifiOff, Activity, ClipboardList, BarChart3, Building2, Cpu, Zap,
} from 'lucide-react';

const HospitalNav = [
    { path: '/hospital', icon: LayoutDashboard, label: 'Overview', exact: true },
    { path: '/hospital/map', icon: Map, label: 'Live Map' },
    { path: '/hospital/incidents', icon: Activity, label: 'Incidents' },
    { path: '/hospital/beds', icon: BedDouble, label: 'Bed Management' },
    { path: '/hospital/ambulances', icon: Truck, label: 'Ambulances' },
    { path: '/hospital/alerts', icon: Bell, label: 'Alert History' },
    { path: '/hospital/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/hospital/devices', icon: Cpu, label: 'Devices & Simulator' },
];

const AmbulanceNav = [
    { path: '/ambulance', icon: LayoutDashboard, label: 'Overview', exact: true },
    { path: '/ambulance/dispatch', icon: Map, label: 'Dispatch Map' },
    { path: '/ambulance/incidents', icon: ClipboardList, label: 'My Incidents' },
    { path: '/ambulance/history', icon: Activity, label: 'History' },
];

export default function Sidebar({ role, hospitalName }) {
    const { user, logout } = useAuth();
    const { connected, crashes } = useSocket();
    const navigate = useNavigate();
    const navItems = role === 'hospital' ? HospitalNav : AmbulanceNav;
    const activeCrashes = crashes.filter(c => c.status === 'active').length;

    const handleLogout = () => { logout(); navigate('/'); };

    const displayHospital = hospitalName || user?.hospital || null;

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">
                    <ShieldAlert size={18} color="#fff" />
                </div>
                <div>
                    <div className="sidebar-logo-text">JDC CrashGuard</div>
                    <div className="sidebar-logo-sub">{role === 'hospital' ? 'Hospital Portal' : 'Ambulance Portal'}</div>
                </div>
            </div>

            {/* Connection status */}
            <div className="sidebar-connection" style={{ color: connected ? 'var(--green)' : 'var(--red)' }}>
                {connected
                    ? <><Wifi size={13} /><span>Live Connected</span></>
                    : <><WifiOff size={13} /><span>Disconnected</span></>
                }
            </div>

            {/* Hospital name badge (for hospital staff) */}
            {role === 'hospital' && displayHospital && (
                <div className="sidebar-hospital-badge">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                        <Building2 size={13} color="var(--blue-light)" />
                        <span style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Your Hospital</span>
                    </div>
                    <div className="sidebar-hospital-badge-name">{displayHospital}</div>
                </div>
            )}

            {/* Navigation */}
            <nav className="sidebar-nav">
                <div className="sidebar-section-label">Navigation</div>
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.exact}
                        className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                    >
                        <item.icon size={16} />
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {(item.label === 'Incidents' || item.label === 'Alert History') && activeCrashes > 0 && (
                            <span className="sidebar-item-badge">{activeCrashes}</span>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* User + Logout */}
            <div className="sidebar-user">
                <div className="sidebar-avatar">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'capitalize' }}>{user?.role}</div>
                </div>
                <button
                    onClick={handleLogout}
                    title="Logout"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '6px', borderRadius: 'var(--r-sm)', transition: 'color var(--t-fast)' }}
                    onMouseOver={e => e.currentTarget.style.color = 'var(--red)'}
                    onMouseOut={e => e.currentTarget.style.color = 'var(--text-3)'}
                >
                    <LogOut size={15} />
                </button>
            </div>
        </aside>
    );
}
