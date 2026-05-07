import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  LogIn,
  User,
  Lock,
  Loader,
  Hotel,
  Bed,
  BedDouble,
  Key,
  KeyRound,
  DoorOpen,
  Calendar,
  CalendarCheck,
  Users,
  Clock,
  Coffee,
  Wifi,
  ConciergeBell,
  Phone,
  MapPin
} from 'lucide-react';
import './Login.css';
import Logo from '../assets/logoagendaqui.png';

const LOGIN_MUTATION = gql`
  mutation Login($usuario: String!, $password: String!) {
    login(usuario: $usuario, password: $password) {
      token
      user {
        id
        nombre
        apellido
        usuario
        rol
        email
        telefono
        foto_url
      }
    }
  }
`;

// Iconos flotantes temáticos de hotelería
const floatingIcons = [
  //{ Icon: Hotel, delay: 0, duration: 18, size: 52 },
  //{ Icon: Bed, delay: 2, duration: 22, size: 48 },
  //{ Icon: BedDouble, delay: 4, duration: 20, size: 50 },
 // { Icon: Key, delay: 1, duration: 21, size: 46 },
  //{ Icon: KeyRound, delay: 3, duration: 19, size: 54 },
  //{ Icon: DoorOpen, delay: 5, duration: 23, size: 44 },
 // { Icon: Calendar, delay: 2.5, duration: 24, size: 52 },
  //{ Icon: CalendarCheck, delay: 4.5, duration: 18, size: 50 },
  //{ Icon: Users, delay: 1.5, duration: 22, size: 48 },
  //{ Icon: Clock, delay: 3.5, duration: 20, size: 46 },
 // { Icon: Coffee, delay: 6, duration: 21, size: 50 },
  //{ Icon: Wifi, delay: 7, duration: 19, size: 52 },
  //{ Icon: ConciergeBell, delay: 8, duration: 23, size: 48 },
  //{ Icon: Phone, delay: 9, duration: 20, size: 54 },
 // { Icon: MapPin, delay: 10, duration: 22, size: 46 }
];

export default function Login() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [login, { loading }] = useMutation(LOGIN_MUTATION, {
    onCompleted: (data) => {
      localStorage.setItem('token', data.login.token);
      localStorage.setItem('usuario', JSON.stringify(data.login.user));
      navigate('/');
      window.location.reload();
    },
    onError: (error) => {
      setError(error.message);
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!usuario || !password) {
      setError('Por favor complete todos los campos');
      return;
    }

    login({
      variables: { usuario, password }
    });
  };

  return (
    <div className="login-page">
      {/* Iconos flotantes animados */}
      <div className="floating-icons">
        {floatingIcons.map((item, index) => {
          const IconComponent = item.Icon;
          return (
            <div
              key={index}
              className="floating-icon"
              style={{
                '--delay': `${item.delay}s`,
                '--duration': `${item.duration}s`,
                '--left': `${Math.random() * 100}%`,
                '--size': `${item.size}px`
              }}
            >
              <IconComponent size={item.size} />
            </div>
          );
        })}
      </div>

      {/* Formas geométricas de fondo */}
      <div className="bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="logo-login">
              <img src={Logo} alt="Factufy Hotel Logo" className="login-logo-image" />
            </div>
            <h2>Factufy Hotel</h2>
            <p>Sistema de Gestión Hotelera</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {error && (
              <div className="login-error">
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label>
                <User size={18} />
                <span>Usuario</span>
              </label>
              <input
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="admin"
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>
                <Lock size={18} />
                <span>Contraseña</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn-login"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader size={20} className="spinner" />
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  <span>Iniciar Sesión</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
