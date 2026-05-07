import { useState } from 'react';
import { useNavigate, NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { ME } from '../graphql/auth';
import Logo from '../assets/logoagendaqui.png';
import { LayoutDashboard, BedDouble, CalendarCheck, ClipboardList, Users, ShoppingCart, CreditCard, BarChart3, Settings, ChevronDown, FileText, Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import './Header.css';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPosMenu, setShowPosMenu] = useState(false);
  const { data, loading } = useQuery(ME);
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const user = data?.me;

  const menuItems = [
    { title: 'DASHBOARD', path: '/dashboard', Icon: LayoutDashboard },
    { title: 'HABITACIONES', path: '/habitaciones', Icon: BedDouble },
    /* TODO Sprint 2: Descomentar cuando se presenten estos modulos */
    // { title: 'RESERVAS', path: '/reservas', Icon: CalendarCheck },
    // { title: 'HOSPEDAJES', path: '/hospedajes', Icon: ClipboardList },
    // { title: 'HUESPEDES', path: '/huespedes', Icon: Users },
    // {
    //   title: 'POS',
    //   Icon: ShoppingCart,
    //   hasDropdown: true,
    //   subItems: [
    //     { title: 'Punto de Venta', path: '/pos', Icon: ShoppingCart },
    //     { title: 'Gestión de Caja', path: '/caja', Icon: CreditCard },
    //   ]
    // },
    // { title: 'FACTURACIÓN', path: '/facturacion', Icon: FileText },
    // { title: 'REPORTES', path: '/reportes', Icon: BarChart3 },
    // { title: 'CONFIGURACION', path: '/configuracion', Icon: Settings },
  ];

  return (
    <header className="header">
      <div className="header__container">
        {/* Logo */}
        <div className="header__logo-section">
          <img src={Logo} alt="Factufy" className="header__logo" />
        </div>

        {/* Navegación Horizontal */}
        <nav className="header__nav">
          {menuItems.map((item, index) => {
            const IconComponent = item.Icon;

            // Si el item tiene dropdown (POS)
            if (item.hasDropdown && item.subItems) {
              const isAnySubItemActive = item.subItems.some(
                subItem => location.pathname === subItem.path
              );

              return (
                <div
                  key={index}
                  className="header__nav-dropdown"
                  onMouseEnter={() => setShowPosMenu(true)}
                  onMouseLeave={() => setShowPosMenu(false)}
                >
                  <div
                    className={`header__nav-link header__nav-link--dropdown ${
                      isAnySubItemActive ? 'header__nav-link--active' : ''
                    }`}
                  >
                    <IconComponent className="header__nav-icon" size={18} strokeWidth={2} />
                    <span className="header__nav-text">{item.title}</span>
                    <ChevronDown
                      className={`header__dropdown-chevron ${showPosMenu ? 'header__dropdown-chevron--open' : ''}`}
                      size={14}
                      strokeWidth={2.5}
                    />
                  </div>

                  {showPosMenu && (
                    <div className="header__submenu">
                      {item.subItems.map((subItem) => {
                        const SubIconComponent = subItem.Icon;
                        return (
                          <NavLink
                            key={subItem.path}
                            to={subItem.path}
                            className={({ isActive }) =>
                              `header__submenu-item ${isActive ? 'header__submenu-item--active' : ''}`
                            }
                          >
                            <SubIconComponent className="header__submenu-icon" size={16} strokeWidth={2} />
                            <span className="header__submenu-text">{subItem.title}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Items normales sin dropdown
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `header__nav-link ${isActive ? 'header__nav-link--active' : ''}`
                }
              >
                <IconComponent className="header__nav-icon" size={18} strokeWidth={2} />
                <span className="header__nav-text">{item.title}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Usuario y Acciones */}
        <div className="header__actions">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="header__theme-toggle"
            title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {!loading && user && (
            <div className="header__user">
              <button
                className="header__user-button"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="header__user-avatar">
                  {user.foto_url ? (
                    <img src={user.foto_url} alt={user.nombre} />
                  ) : (
                    <span>{user.nombre.charAt(0)}{user.apellido?.charAt(0) || ''}</span>
                  )}
                </div>
                <div className="header__user-info">
                  <span className="header__user-name">
                    {user.nombre} {user.apellido}
                  </span>
                  <span className="header__user-role">{user.rol}</span>
                </div>
                <svg
                  className={`header__dropdown-icon ${showUserMenu ? 'header__dropdown-icon--open' : ''}`}
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {showUserMenu && (
                <div className="header__user-menu">
                  <button
                    className="header__menu-item"
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/perfil');
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Mi Perfil
                  </button>
                  <button
                    className="header__menu-item"
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/configuracion');
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Configuración
                  </button>
                  <hr className="header__menu-divider" />
                  <button
                    className="header__menu-item header__menu-item--logout"
                    onClick={handleLogout}
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4.414l-4.293 4.293a1 1 0 01-1.414 0L4 7.414 5.414 6l3.293 3.293L13.586 4.586 15 6l-1 1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
