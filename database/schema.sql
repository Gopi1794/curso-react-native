-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.usuarios (
  id bigint NOT NULL DEFAULT nextval('usuarios_id_seq'::regclass),
  uuid uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  nombre character varying NOT NULL,
  apellido character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  telefono character varying NOT NULL,
  password_hash character varying NOT NULL,
  rol character varying NOT NULL DEFAULT 'cliente'::character varying CHECK (rol::text = ANY (ARRAY['cliente'::text, 'admin'::text, 'repartidor'::text, 'superadmin'::text])),
  estado character varying NOT NULL DEFAULT 'activo'::character varying CHECK (estado::text = ANY (ARRAY['activo'::character varying, 'inactivo'::character varying, 'suspendido'::character varying]::text[])),
  fecha_creacion timestamp without time zone NOT NULL DEFAULT now(),
  fecha_actualizacion timestamp without time zone DEFAULT now(),
  avatar_url text,
  email_verificado boolean NOT NULL DEFAULT false,
  token_verificacion character varying,
  token_verificacion_expira timestamp without time zone,
  push_token text,
  login_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamp without time zone,
  last_logout_at timestamp without time zone,
  restaurante_id bigint,
  ubicacion_lat numeric,
  ubicacion_lng numeric,
  ubicacion_actualizada_en timestamp without time zone,
  CONSTRAINT usuarios_pkey PRIMARY KEY (id),
  CONSTRAINT usuarios_restaurante_id_fkey FOREIGN KEY (restaurante_id) REFERENCES public.restaurantes(id)
);
CREATE TABLE public.restaurantes (
  id bigint NOT NULL DEFAULT nextval('restaurantes_id_seq'::regclass),
  nombre character varying NOT NULL,
  descripcion text,
  direccion character varying,
  telefono character varying,
  horario jsonb,
  logo_url character varying,
  estado character varying NOT NULL DEFAULT 'activo'::character varying CHECK (estado::text = ANY (ARRAY['activo'::character varying, 'inactivo'::character varying]::text[])),
  fecha_creacion timestamp without time zone NOT NULL DEFAULT now(),
  admin_id bigint,
  lat numeric,
  lng numeric,
  ruleta_activa boolean NOT NULL DEFAULT false,
  CONSTRAINT restaurantes_pkey PRIMARY KEY (id),
  CONSTRAINT restaurantes_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.usuarios(id)
);
CREATE TABLE public.zonas_envio (
  id bigint NOT NULL DEFAULT nextval('zonas_envio_id_seq'::regclass),
  restaurante_id bigint NOT NULL,
  nombre character varying NOT NULL,
  radio_km numeric NOT NULL CHECK (radio_km > 0::numeric),
  costo_envio numeric NOT NULL CHECK (costo_envio >= 0::numeric),
  activa boolean NOT NULL DEFAULT true,
  fecha_creacion timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT zonas_envio_pkey PRIMARY KEY (id),
  CONSTRAINT zonas_envio_restaurante_id_fkey FOREIGN KEY (restaurante_id) REFERENCES public.restaurantes(id)
);
CREATE TABLE public.menu_items (
  id bigint NOT NULL DEFAULT nextval('menu_items_id_seq'::regclass),
  restaurante_id bigint NOT NULL,
  nombre character varying NOT NULL,
  precio numeric NOT NULL CHECK (precio >= 0::numeric),
  categoria character varying NOT NULL,
  descripcion text,
  ingredientes ARRAY,
  imagen_key character varying,
  disponible boolean NOT NULL DEFAULT true,
  fecha_creacion timestamp without time zone NOT NULL DEFAULT now(),
  calorias integer,
  peso integer,
  imagen_url character varying,
  opciones jsonb,
  CONSTRAINT menu_items_pkey PRIMARY KEY (id),
  CONSTRAINT menu_items_restaurante_id_fkey FOREIGN KEY (restaurante_id) REFERENCES public.restaurantes(id)
);
CREATE TABLE public.pedidos (
  id bigint NOT NULL DEFAULT nextval('pedidos_id_seq'::regclass),
  usuario_id bigint NOT NULL,
  restaurante_id bigint NOT NULL,
  estado character varying NOT NULL DEFAULT 'pendiente'::character varying CHECK (estado::text = ANY (ARRAY['pendiente'::character varying, 'confirmado'::character varying, 'en_preparacion'::character varying, 'en_camino'::character varying, 'entregado'::character varying, 'cancelado'::character varying]::text[])),
  total numeric NOT NULL CHECK (total >= 0::numeric),
  direccion_entrega character varying,
  notas text,
  fecha_creacion timestamp without time zone NOT NULL DEFAULT now(),
  fecha_actualizacion timestamp without time zone DEFAULT now(),
  fecha_en_camino timestamp without time zone,
  repartidor_id bigint,
  metodo_pago character varying DEFAULT 'mercadopago'::character varying,
  monto_recibido numeric,
  descuento numeric NOT NULL DEFAULT 0,
  pago_confirmado_at timestamp with time zone,
  distancia_metros integer,
  duracion_segundos integer,
  eta_calculado_en timestamp without time zone,
  zona_envio_id bigint,
  costo_envio numeric NOT NULL DEFAULT 0,
  costo_envio_tarifa_vigente numeric,
  CONSTRAINT pedidos_pkey PRIMARY KEY (id),
  CONSTRAINT pedidos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id),
  CONSTRAINT pedidos_restaurante_id_fkey FOREIGN KEY (restaurante_id) REFERENCES public.restaurantes(id),
  CONSTRAINT pedidos_repartidor_id_fkey FOREIGN KEY (repartidor_id) REFERENCES public.usuarios(id),
  CONSTRAINT pedidos_zona_envio_id_fkey FOREIGN KEY (zona_envio_id) REFERENCES public.zonas_envio(id)
);
CREATE TABLE public.pedido_items (
  id bigint NOT NULL DEFAULT nextval('pedido_items_id_seq'::regclass),
  pedido_id bigint NOT NULL,
  menu_item_id bigint,
  nombre_item character varying NOT NULL,
  precio_unitario numeric NOT NULL CHECK (precio_unitario >= 0::numeric),
  cantidad integer NOT NULL CHECK (cantidad > 0),
  subtotal numeric DEFAULT (precio_unitario * (cantidad)::numeric),
  ingredientes_removidos ARRAY DEFAULT '{}'::text[],
  CONSTRAINT pedido_items_pkey PRIMARY KEY (id),
  CONSTRAINT pedido_items_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id),
  CONSTRAINT pedido_items_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id)
);
CREATE TABLE public.metodos_pago (
  id bigint NOT NULL DEFAULT nextval('metodos_pago_id_seq'::regclass),
  usuario_id bigint NOT NULL,
  tipo character varying NOT NULL CHECK (tipo::text = ANY (ARRAY['tarjeta'::character varying, 'efectivo'::character varying, 'transferencia'::character varying]::text[])),
  ultimos_4_digitos character,
  marca character varying,
  es_principal boolean NOT NULL DEFAULT false,
  fecha_creacion timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT metodos_pago_pkey PRIMARY KEY (id),
  CONSTRAINT metodos_pago_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id)
);
CREATE TABLE public.pagos (
  id bigint NOT NULL DEFAULT nextval('pagos_id_seq'::regclass),
  pedido_id bigint NOT NULL,
  usuario_id bigint NOT NULL,
  metodo_pago_id bigint,
  monto numeric NOT NULL CHECK (monto > 0::numeric),
  estado character varying NOT NULL DEFAULT 'pendiente'::character varying CHECK (estado::text = ANY (ARRAY['pendiente'::character varying, 'completado'::character varying, 'fallido'::character varying, 'reembolsado'::character varying]::text[])),
  referencia character varying,
  fecha_creacion timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT pagos_pkey PRIMARY KEY (id),
  CONSTRAINT pagos_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id),
  CONSTRAINT pagos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id),
  CONSTRAINT pagos_metodo_pago_id_fkey FOREIGN KEY (metodo_pago_id) REFERENCES public.metodos_pago(id)
);
CREATE TABLE public.cupones (
  id bigint NOT NULL DEFAULT nextval('cupones_id_seq'::regclass),
  oferta character varying NOT NULL,
  titulo character varying NOT NULL,
  imagen_key character varying,
  imagen_real_key character varying,
  valido_hasta date NOT NULL,
  disclaimer text,
  texto_reverso text,
  codigo character varying NOT NULL UNIQUE,
  color character varying NOT NULL DEFAULT '#FF6B6B'::character varying,
  activo boolean NOT NULL DEFAULT true,
  fecha_creacion timestamp without time zone NOT NULL DEFAULT now(),
  imagen_url character varying,
  discount_percent integer DEFAULT 10,
  valido_desde date,
  CONSTRAINT cupones_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ingredientes (
  id bigint NOT NULL DEFAULT nextval('ingredientes_id_seq'::regclass),
  nombre character varying NOT NULL UNIQUE,
  categoria character varying NOT NULL DEFAULT 'otro'::character varying CHECK (categoria::text = ANY (ARRAY['proteina'::character varying, 'lacteo'::character varying, 'verdura'::character varying, 'fruta'::character varying, 'pan'::character varying, 'salsa'::character varying, 'condimento'::character varying, 'grano'::character varying, 'pasta'::character varying, 'bebida'::character varying, 'dulce'::character varying, 'otro'::character varying]::text[])),
  unidad_medida character varying NOT NULL DEFAULT 'unidad'::character varying CHECK (unidad_medida::text = ANY (ARRAY['gr'::character varying, 'ml'::character varying, 'unidad'::character varying]::text[])),
  imagen_url character varying,
  activo boolean NOT NULL DEFAULT true,
  fecha_creacion timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT ingredientes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.menu_item_ingredientes (
  id bigint NOT NULL DEFAULT nextval('menu_item_ingredientes_id_seq'::regclass),
  menu_item_id bigint NOT NULL,
  ingrediente_id bigint NOT NULL,
  es_removible boolean NOT NULL DEFAULT true,
  cantidad_usada numeric NOT NULL DEFAULT 1 CHECK (cantidad_usada > 0::numeric),
  CONSTRAINT menu_item_ingredientes_pkey PRIMARY KEY (id),
  CONSTRAINT menu_item_ingredientes_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id),
  CONSTRAINT menu_item_ingredientes_ingrediente_id_fkey FOREIGN KEY (ingrediente_id) REFERENCES public.ingredientes(id)
);
CREATE TABLE public.stock_ingredientes (
  id bigint NOT NULL DEFAULT nextval('stock_ingredientes_id_seq'::regclass),
  restaurante_id bigint NOT NULL,
  ingrediente_id bigint NOT NULL,
  cantidad numeric NOT NULL DEFAULT 0 CHECK (cantidad >= 0::numeric),
  umbral_minimo numeric NOT NULL DEFAULT 5 CHECK (umbral_minimo >= 0::numeric),
  ultima_actualizacion timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT stock_ingredientes_pkey PRIMARY KEY (id),
  CONSTRAINT stock_ingredientes_restaurante_id_fkey FOREIGN KEY (restaurante_id) REFERENCES public.restaurantes(id),
  CONSTRAINT stock_ingredientes_ingrediente_id_fkey FOREIGN KEY (ingrediente_id) REFERENCES public.ingredientes(id)
);
CREATE TABLE public.comentarios (
  id bigint NOT NULL DEFAULT nextval('comentarios_id_seq'::regclass),
  usuario_id bigint NOT NULL,
  menu_item_id bigint NOT NULL,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comentario text NOT NULL,
  fecha_creacion timestamp without time zone NOT NULL DEFAULT now(),
  fecha_actualizacion timestamp without time zone DEFAULT now(),
  ai_categoria text,
  ai_sentimiento text,
  ai_resumen text,
  CONSTRAINT comentarios_pkey PRIMARY KEY (id),
  CONSTRAINT comentarios_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id),
  CONSTRAINT comentarios_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id)
);
CREATE TABLE public.direcciones_usuarios (
  id bigint NOT NULL DEFAULT nextval('direcciones_usuarios_id_seq'::regclass),
  usuario_id bigint NOT NULL,
  etiqueta character varying NOT NULL DEFAULT 'Casa'::character varying,
  direccion character varying NOT NULL,
  ciudad character varying NOT NULL,
  provincia character varying,
  referencia text,
  latitud numeric,
  longitud numeric,
  es_principal boolean NOT NULL DEFAULT false,
  fecha_creacion timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT direcciones_usuarios_pkey PRIMARY KEY (id),
  CONSTRAINT direcciones_usuarios_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id)
);
CREATE TABLE public.preferencias_notificaciones (
  id integer NOT NULL DEFAULT nextval('preferencias_notificaciones_id_seq'::regclass),
  usuario_id integer NOT NULL UNIQUE,
  pedidos boolean NOT NULL DEFAULT true,
  promociones boolean NOT NULL DEFAULT false,
  noticias boolean NOT NULL DEFAULT true,
  recordatorios boolean NOT NULL DEFAULT false,
  fecha_creacion timestamp without time zone DEFAULT now(),
  CONSTRAINT preferencias_notificaciones_pkey PRIMARY KEY (id),
  CONSTRAINT preferencias_notificaciones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id)
);
CREATE TABLE public.favoritos (
  usuario_id bigint NOT NULL,
  menu_item_id bigint NOT NULL,
  fecha_creacion timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT favoritos_pkey PRIMARY KEY (usuario_id, menu_item_id),
  CONSTRAINT favoritos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id),
  CONSTRAINT favoritos_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id)
);
CREATE TABLE public.pedido_estados_historial (
  id integer NOT NULL DEFAULT nextval('pedido_estados_historial_id_seq'::regclass),
  pedido_id integer NOT NULL,
  estado_anterior character varying,
  estado_nuevo character varying NOT NULL,
  triggered_by character varying NOT NULL CHECK (triggered_by::text = ANY (ARRAY['admin'::character varying, 'repartidor'::character varying, 'sistema'::character varying, 'cliente'::character varying]::text[])),
  triggered_by_id integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pedido_estados_historial_pkey PRIMARY KEY (id),
  CONSTRAINT pedido_estados_historial_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id),
  CONSTRAINT pedido_estados_historial_triggered_by_id_fkey FOREIGN KEY (triggered_by_id) REFERENCES public.usuarios(id)
);
CREATE TABLE public.ruleta_premios (
  id bigint NOT NULL DEFAULT nextval('ruleta_premios_id_seq'::regclass),
  restaurante_id bigint NOT NULL,
  posicion smallint NOT NULL CHECK (posicion >= 0 AND posicion < 8),
  label character varying,
  icon character varying,
  CONSTRAINT ruleta_premios_pkey PRIMARY KEY (id),
  CONSTRAINT ruleta_premios_restaurante_id_fkey FOREIGN KEY (restaurante_id) REFERENCES public.restaurantes(id)
);