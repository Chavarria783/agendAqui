# 🏨 AgendaAqui- Sistema de Gestión Hotelera

Sistema POS especializado para hoteles, hostales y alojamientos turísticos. Incluye gestión de habitaciones, reservas, check-in/check-out, huéspedes y facturación integrada.

## 🚦 Estado del proyecto

**Sprint 1 (entregado)** — rutas activas en `App.jsx`:
- 🔐 **Login** (HU-001 a HU-003): autenticación, persistencia de sesión, protección de rutas.
- 📊 **Dashboard** (HU-004 a HU-007): estadísticas de habitaciones, ocupación, acciones rápidas, polling 30s.
- 🛏️ **Habitaciones** (HU-008 a HU-012): cuadrícula visual, filtros, CRUD admin, marcar limpia, modal de detalle.

**Sprint 2 (en desarrollo, código presente, rutas pendientes de habilitar)** — los componentes y resolvers existen pero las rutas están comentadas en `App.jsx` hasta que se presenten:
- Reservas, Check-In/Hospedajes, Huéspedes, Clientes, POS, Caja, Facturación electrónica (DIAN/Factus), TRA (MinCIT Resolución 409), Configuración.

## 📋 Tabla de Contenidos

- [Características](#características)
- [Tecnologías](#tecnologías)
- [Prerrequisitos](#prerrequisitos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Uso](#uso)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [API GraphQL](#api-graphql)

## ✨ Características

- 🛏️ **Gestión de Habitaciones**: Control visual de estado y disponibilidad
- 📅 **Sistema de Reservas**: Reservas anticipadas con anticipos
- ✅ **Check-In/Check-Out**: Proceso completo de registro y salida
- 👥 **Registro de Huéspedes**: Base de datos con documentos y preferencias
- 💰 **Consumos por Habitación**: Acumulación de cargos
- 🧾 **Facturación Integrada**: Generación automática al check-out
- 📊 **Dashboard**: Estadísticas en tiempo real
- 🎨 **Interfaz Moderna**: Diseño responsive con tema púrpura distintivo

## 🚀 Tecnologías

### Backend
- Node.js 18+
- Apollo Server (GraphQL)
- PostgreSQL 14+
- Express.js
- JWT Authentication

### Frontend
- React 18.2
- Vite 5.0
- Apollo Client
- React Router DOM
- CSS3 con variables

## 📦 Prerrequisitos

Antes de comenzar, asegúrate de tener instalado:

- [Node.js](https://nodejs.org/) (v18 o superior)
- [PostgreSQL](https://www.postgresql.org/) (v14 o superior)
- npm o yarn

## 🔧 Instalación

### 1. Clonar el repositorio (o navegar a la carpeta)

```bash
cd AgendaAqui
```

### 2. Configurar Base de Datos

#### Crear la base de datos:

```bash
# Conectar a PostgreSQL
psql -U postgres

# Crear la base de datos
CREATE DATABASE AgendAqui_hotel;

# Salir
\q
```

#### Ejecutar el schema:

```bash
psql -U postgres -d AgendAqui_hotel -f backend/database/schema_hotel.sql
```

Esto creará:
- ✅ 11 tablas relacionadas
- ✅ Triggers automáticos
- ✅ Vistas útiles
- ✅ Datos iniciales (usuario admin, métodos de pago, servicios)

### 3. Instalar dependencias del Backend

```bash
cd backend
npm install
```

### 4. Configurar variables de entorno del Backend

```bash
# Copiar el archivo de ejemplo
cp .env.example .env
```

Editar `.env` con tus credenciales:

```env
PORT=4005
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=AgendAqui_hotel
DB_USER=postgres
DB_PASSWORD=root87  

JWT_SECRET=tu_clave_secreta_aqui
```

### 5. Instalar dependencias del Frontend

```bash
cd ../fronted
pnpm install
```

### 6. Configurar variables de entorno del Frontend

```bash
# Copiar el archivo de ejemplo
cp .env.example .env
```

El archivo `.env` debe contener:

```env
VITE_API_URL=http://localhost:4003/graphql
VITE_APP_NAME=AgendAqui Hotel
```

## 🎯 Uso

### Iniciar el Backend

```bash
cd backend
npm run dev
```

El servidor estará disponible en:
- API: http://localhost:4005
- GraphQL Playground: http://localhost:4005/graphql
- Health Check: http://localhost:4005/health

### Iniciar el Frontend

```bash
cd fronted
pnpm run dev
```

La aplicación estará disponible en: http://localhost:3005

### Credenciales de Prueba

**Usuario:** `admin`
**Contraseña:** `admin123`

## 📂 Estructura del Proyecto

```
Factufy/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js          # Configuración PostgreSQL
│   │   ├── schema/
│   │   │   └── typeDefs.js          # Schema GraphQL
│   │   ├── resolvers/
│   │   │   └── index.js             # Resolvers GraphQL
│   │   ├── services/                # Servicios externos
│   │   ├── utils/                   # Utilidades
│   │   └── server.js                # Servidor Apollo + Express
│   ├── database/
│   │   └── schema_hotel.sql         # Schema completo de BD
│   ├── package.json
│   └── .env
│
├── fronted/
│   ├── src/
│   │   ├── assets/                  # Imágenes y recursos
│   │   ├── components/              # Componentes React
│   │   ├── pages/                   # Páginas principales
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── Habitaciones.jsx
│   │   ├── graphql/                 # Queries y Mutations
│   │   ├── hooks/                   # Custom hooks
│   │   ├── contexts/                # React contexts (Theme, Notifications)
│   │   ├── utils/                   # Utilidades
│   │   ├── config/
│   │   │   └── hotel.config.js      # Configuración de tema
│   │   ├── App.jsx                  # Componente principal
│   │   ├── main.jsx                 # Entry point
│   │   ├── apolloClient.js          # Cliente Apollo
│   │   └── index.css                # Estilos globales
│   ├── package.json
│   └── .env
│
└── README.md                        # Este archivo
```

## 🔌 API GraphQL

### Queries Disponibles

```graphql
# Obtener todas las habitaciones
query {
  habitaciones {
    id
    numero
    piso
    tipo
    estado
    precio_noche
  }
}

# Obtener clientes
query {
  clientes(busqueda: "Juan") {
    id
    nombre
    apellido
    telefono
  }
}

# Obtener métodos de pago
query {
  metodosPago(activo: true) {
    id
    nombre
    tipo
  }
}
```

### Mutations Disponibles

```graphql
# Login
mutation {
  login(usuario: "admin", password: "admin123") {
    token
    user {
      id
      nombre
      rol
    }
  }
}

# Crear habitación
mutation {
  crearHabitacion(input: {
    numero: "101"
    piso: 1
    tipo: simple
    capacidad: 2
    precio_noche: 80000
  }) {
    id
    numero
    tipo
  }
}
```

## 🗄️ Base de Datos

### Tablas Principales

1. **usuarios** - Empleados del sistema
2. **habitaciones** - Inventario de habitaciones
3. **clientes** - Base de datos de clientes
4. **huespedes** - Información detallada de huéspedes
5. **reservas** - Reservas anticipadas
6. **hospedajes** - Check-ins activos
7. **servicios_hotel** - Catálogo de servicios
8. **consumos_habitacion** - Cargos por habitación
9. **facturas** - Facturas generadas
10. **metodos_pago** - Métodos de pago disponibles
11. **factura_metodos_pago** - Pagos de facturas

### Datos Iniciales

El schema incluye:
- ✅ Usuario administrador (admin/admin123)
- ✅ 6 métodos de pago predefinidos
- ✅ 10 servicios de hotel básicos
- ✅ Triggers automáticos para códigos y cálculos

## 🛠️ Scripts Disponibles

### Backend

```bash
npm start          # Iniciar servidor en producción
npm run dev        # Iniciar con nodemon (desarrollo)
npm test          # Ejecutar tests
```

### Frontend

```bash
npm run dev       # Iniciar servidor de desarrollo
npm run build     # Compilar para producción
npm run preview   # Vista previa de build
```

## 🎨 Tema y Colores

La interfaz usa un tema púrpura distintivo:

- **Primary**: `#8b5cf6` (Violeta)
- **Secondary**: `#06b6d4` (Cyan)
- **Accent**: `#f59e0b` (Ámbar)

Estados de habitación:
- 🟢 **Disponible**: Verde (#10b981)
- 🔴 **Ocupada**: Rojo (#ef4444)
- 🟡 **Limpieza**: Amarillo (#f59e0b)
- ⚪ **Mantenimiento**: Gris (#6b7280)
- 🔵 **Reservada**: Azul (#3b82f6)

## 🤝 Contribución

Este es un proyecto en desarrollo. Para contribuir:

1. Crea una rama para tu feature
2. Realiza tus cambios
3. Asegúrate de que las pruebas pasen
4. Envía un pull request

## 📄 Licencia

Copyright © 2024 Factufy Hotel

## 🆘 Soporte

Para problemas o preguntas:
- Revisa la documentación en [CLAUDE.md](CLAUDE.md)
- Verifica los logs del servidor
- Consulta el schema de GraphQL en `/graphql`

---

Desarrollado con ❤️ para la industria hotelera
