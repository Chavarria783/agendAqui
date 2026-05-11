import { useState, useRef, useEffect } from 'react';
import { useNavigate, NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { ME } from '../graphql/auth';
import { GET_ITEMS_BAJO_STOCK } from '../graphql/inventario';
import { useTheme } from '../contexts/ThemeContext';
import Logo from '../assets/logoagendaqui.png';
import {
  LayoutDashboard,
  BedDouble,
  CalendarCheck,
  ClipboardList,
  ClipboardCheck,
  Users,
  User,
  Briefcase,
  Package,
  ShoppingCart,
  CreditCard,
  FileText,
  Printer,
  BarChart3,
  Settings,
  Sun,
  Moon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  KeyRound,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { data: userData, loading: userLoading } = useQuery(ME);
  const { data: stockData } = useQuery(GET_ITEMS_BAJO_STOCK, {
    pollInterval: 60000
  });

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [showPosSubmenu, setShowPosSubmenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const userMenuRef = useRef(null);
  const posSubmenuRef = useRef(null);

  const user = userData?.me;
  const itemsBajoStock = stockData?.itemsBajoStock?.length || 0;

  // Persistir estado colapsado
  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', collapsed);
  }, [collapsed]);

  // Cerrar menus al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
      if (posSubmenuRef.current && !posSubmenuRef.current.contains(e.target)) {
        setShowPosSubmenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cerrar sidebar mobile al navegar
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const toggleCollapse = () => {
    setCollapsed(prev => !prev);
    setShowPosSubmenu(false);
    setShowUserMenu(false);
  };

  const menuItems = [
    { title: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { title: 'Habitaciones', icon: BedDouble, path: '/habitaciones' },
    { title: 'Reservas', icon: CalendarCheck, path: '/reservas' },
    // Sprint 3: Hospedajes y Check-In
    // { title: 'Hospedajes', icon: ClipboardList, path: '/hospedajes', end: true },
    // { title: 'Check-In', icon: ClipboardCheck, path: '/hospedajes/checkin' },
    // { title: 'Huéspedes', icon: Users, path: '/huespedes' },
    // { title: 'Clientes', icon: User, path: '/clientes' },
    // { title: 'Servicios', icon: Briefcase, path: '/servicios' },
    // { title: 'Productos', icon: Package, path: '/productos', badge: itemsBajoStock > 0 ? itemsBajoStock : null },
    // {
    //   title: 'POS',
    //   icon: ShoppingCart,
    //   hasSubmenu: true,
    //   subItems: [
    //     { title: 'Punto de Venta', icon: ShoppingCart, path: '/pos' },
    //     { title: 'Gestión de Caja', icon: CreditCard, path: '/caja' },
    //   ],
    // },
    // { title: 'Facturación', icon: FileText, path: '/facturacion' },
    // { title: 'Impresoras', icon: Printer, path: '/impresoras' },
    // { title: 'Reportes', icon: BarChart3, path: '/reportes' },
    // { title: 'Configuración', icon: Settings, path: '/configuracion' },
  ];

  const renderNavItem = (item) => {
    const Icon = item.icon;

    // Item con submenu (POS)
    if (item.hasSubmenu) {
      const isAnyActive = item.subItems.some(
        sub => location.pathname === sub.path
      );

      return (
        <li key={item.title} className="sidebar__menu-item" ref={posSubmenuRef}>
          <button
            className={`sidebar__link sidebar__link--has-submenu ${isAnyActive ? 'sidebar__link--active' : ''}`}
            onClick={() => setShowPosSubmenu(prev => !prev)}
            data-tooltip={item.title}
          >
            <Icon className="sidebar__icon" size={20} strokeWidth={2} />
            {!collapsed && (
              <>
                <span className="sidebar__label">{item.title}</span>
                <ChevronDown
                  className={`sidebar__chevron ${showPosSubmenu ? 'sidebar__chevron--open' : ''}`}
                  size={14}
                />
              </>
            )}
          </button>

          {showPosSubmenu && (
            <ul className={`sidebar__submenu ${collapsed ? 'sidebar__submenu--popup' : ''}`}>
              {item.subItems.map(sub => {
                const SubIcon = sub.icon;
                return (
                  <li key={sub.path}>
                    <NavLink
                      to={sub.path}
                      className={({ isActive }) =>
                        `sidebar__submenu-link ${isActive ? 'sidebar__submenu-link--active' : ''}`
                      }
                    >
                      <SubIcon size={16} strokeWidth={2} />
                      <span>{sub.title}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          )}
        </li>
      );
    }

    // Item normal
    return (
      <li key={item.path} className="sidebar__menu-item">
        <NavLink
          to={item.path}
          end={item.end}
          className={({ isActive }) =>
            `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
          }
          data-tooltip={item.title}
        >
          <Icon className="sidebar__icon" size={20} strokeWidth={2} />
          {!collapsed && <span className="sidebar__label">{item.title}</span>}
          {item.badge && <span className="sidebar__badge">{item.badge}</span>}
        </NavLink>
      </li>
    );
  };

  return (
    <>
      {/* Overlay mobile */}
      {mobileOpen && (
        <div className="sidebar__overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Botón hamburguesa mobile */}
      <button
        className="sidebar__mobile-toggle"
        onClick={() => setMobileOpen(true)}
      >
        <PanelLeftOpen size={22} />
      </button>

      <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''} ${mobileOpen ? 'sidebar--mobile-open' : ''}`}>
        {/* Logo + Toggle */}
        <div className="sidebar__header">
          {!collapsed && (
            <div className="sidebar__logo-section" onClick={() => navigate('/dashboard')}>
              <img src={Logo} alt="Factufy" className="sidebar__logo" />
            </div>
          )}
          <button
            className="sidebar__toggle"
            onClick={toggleCollapse}
            title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
        </div>

        {/* Navegación */}
        <nav className="sidebar__nav">
          <ul className="sidebar__menu">
            {menuItems.map(renderNavItem)}
          </ul>
        </nav>

        {/* Sección inferior: tema + usuario */}
        <div className="sidebar__footer">
          {/* Toggle de tema */}
          <button
            className="sidebar__theme-toggle"
            onClick={toggleTheme}
            data-tooltip={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
            title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            {!collapsed && (
              <span>{theme === 'light' ? 'Modo oscuro' : 'Modo claro'}</span>
            )}
          </button>

          {/* Usuario */}
          {!userLoading && user && (
            <div className="sidebar__user" ref={userMenuRef}>
              <button
                className="sidebar__user-button"
                onClick={() => setShowUserMenu(prev => !prev)}
                data-tooltip={collapsed ? `${user.nombre} ${user.apellido || ''}` : undefined}
              >
                <div className="sidebar__user-avatar">
                  {user.foto_url ? (
                    <img src={user.foto_url} alt={user.nombre} />
                  ) : (
                    <span>{user.nombre.charAt(0)}{user.apellido?.charAt(0) || ''}</span>
                  )}
                </div>
                {!collapsed && (
                  <div className="sidebar__user-info">
                    <span className="sidebar__user-name">
                      {user.nombre} {user.apellido}
                    </span>
                    <span className="sidebar__user-role">{user.rol}</span>
                  </div>
                )}
              </button>

              {showUserMenu && (
                <div className={`sidebar__user-menu ${collapsed ? 'sidebar__user-menu--popup' : ''}`}>
                  {/* Mi Licencia removido para proyecto universitario */}
                  <button
                    className="sidebar__user-menu-item sidebar__user-menu-item--logout"
                    onClick={handleLogout}
                  >
                    <LogOut size={16} />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
