# Proyecto: Tu App Food

App de delivery de comida con frontend React Native (Expo) y backend Node.js/Express.

## Estructura del proyecto

```
curso-react-native/
├── frontend/        → App móvil React Native con Expo
├── backend/         → API REST con Node.js/Express
├── database/        → Schema SQL y seed de datos
├── tools/           → Utilidades externas (bundletool.jar, etc.)
└── config/          → Configuración AWS
```

## Tech Stack

| Capa | Tecnología |
|------|-----------|
| Mobile | React Native 0.81 + Expo 54 |
| Navegación | React Navigation (Stack, Drawer, BottomTabs) |
| Estado global | Redux Toolkit + React Redux |
| Backend | Node.js + Express 5 |
| Base de datos | PostgreSQL (cliente `pg`) |
| Auth | JWT + bcryptjs |
| Notificaciones push | Firebase |
| Pagos | Integración propia vía `/api/payments` |

## Frontend (`frontend/`)

### Comandos
- **Iniciar dev**: `npx expo start`
- **Android**: `npx expo run:android`
- **iOS**: `npx expo run:ios`
- **Web**: `npx expo start --web`

### Estructura clave
```
App.js               → Entry point principal
index.js             → Registro de la app
screens/             → Pantallas agrupadas por feature
  auth/              → VerifyEmailScreen
  onboarding/        → AnimatedSplashScreen, OnboardingScreen
  restaurant/        → SelectRestaurantScreen
  home/              → ScreenHome
  food/              → FoodDetailScreen, PromoFoodDetailScreen
  cart/              → CartScreen
  orders/            → OrdersScreen, OrderDetailScreen, OrderConfirmationScreen, OrderTrackingScreen
  favorites/         → FavoritesScreen
  profile/           → ProfileScreen, EditProfileScreen, AddressesScreen, PaymentMethodsScreen, etc.
  tickets/           → TicketScreen, TicketDetailScreen
components/          → Componentes reutilizables
  common/            → AppHeader, BackButton, ShareButton, etc.
  ticket/            → Componentes específicos de tickets
navigation/          → Stacks de navegación (Home, Orders, Profile, Favorites)
store/
  index.js           → Configuración Redux store
  slices/
    cartSlice.js     → Estado del carrito
    userSlice.js     → Estado del usuario autenticado
    restaurantSlice.js → Restaurante seleccionado
  hooks.js           → Typed hooks (useAppDispatch, useAppSelector)
services/api.js      → Llamadas HTTP al backend
utils/               → Helpers de formato y validación (formatPrice, isValidEmail, etc.)
firebase/            → Configuración Firebase
constants/           → Colors.js (paleta) y Spacing.js (escala de tamaños)
config/              → Imágenes y Mapbox
contexts/            → ThemeContext (light/dark)
hooks/               → Custom hooks de la app
assets/              → Imágenes, animaciones, videos
```

### Convenciones frontend
- Archivos: PascalCase para screens y componentes (`ScreenHome.js`, `MenuItem.js`)
- JavaScript (no TypeScript)
- Componentes funcionales con hooks
- Estado global con Redux Toolkit slices

## Backend (`backend/`)

### Comandos
- **Producción**: `npm start` (node src/index.js)
- **Desarrollo**: `npm run dev` (nodemon)

### Estructura clave
```
src/
  index.js           → Entry point, configura Express y rutas
  routers/           → Definición de rutas por dominio
  controllers/       → Lógica de negocio
  middleware/        → Auth JWT y otros middlewares
  config/            → Configuración DB y otros
  utils/             → Utilidades compartidas
```

### API Endpoints
- `POST /api/auth/register` / `POST /api/auth/login` / `GET /api/auth/me`
- `GET|PUT /api/users/profile`
- `GET /api/restaurants` / `GET /api/restaurants/:id/menu`
- `POST|GET /api/orders`
- `GET|POST /api/payments/methods` / `POST /api/payments/pay`
- `GET /api/cupones`
- `GET /health` — health check con DB

### Convenciones backend
- CommonJS (`require`/`module.exports`)
- Variables de entorno via `.env` (usar `dotenv`)
- Respuestas JSON con `{ success, message, data }`

## Base de datos
- PostgreSQL
- Schema en `database/schema.sql`
- Seed en `database/seed.js`
- Conexión configurada en `backend/src/config/database.js`
