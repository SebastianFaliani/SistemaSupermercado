CREATE TABLE configuracion_ecommerce (
  id TINYINT UNSIGNED NOT NULL DEFAULT 1,
  nombre_tienda VARCHAR(120) NOT NULL DEFAULT 'La 91 Supermercado',
  esta_activa BOOLEAN NOT NULL DEFAULT FALSE,
  direccion_origen VARCHAR(255) NULL,
  latitud_origen DECIMAL(10,7) NULL,
  longitud_origen DECIMAL(10,7) NULL,
  distancia_maxima_km DECIMAL(8,2) NOT NULL DEFAULT 15.00,
  pedido_minimo DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  envio_gratis_desde DECIMAL(15,2) NULL,
  costo_envio_base DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  costo_por_km DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  minutos_reserva INT UNSIGNED NOT NULL DEFAULT 20,
  permite_retiro BOOLEAN NOT NULL DEFAULT TRUE,
  permite_envio BOOLEAN NOT NULL DEFAULT TRUE,
  permite_efectivo BOOLEAN NOT NULL DEFAULT TRUE,
  permite_transferencia BOOLEAN NOT NULL DEFAULT TRUE,
  permite_mercado_pago BOOLEAN NOT NULL DEFAULT FALSE,
  cuenta_mercado_pago_id BIGINT UNSIGNED NULL,
  telefono_contacto VARCHAR(30) NULL,
  mensaje_portada VARCHAR(255) NULL,
  fecha_actualizacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  CONSTRAINT chk_configuracion_ecommerce_unica CHECK (id = 1),
  CONSTRAINT fk_configuracion_ecommerce_cuenta FOREIGN KEY (cuenta_mercado_pago_id)
    REFERENCES cuentas_tesoreria (id) ON UPDATE RESTRICT ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO configuracion_ecommerce (id, mensaje_portada)
VALUES (1, 'Comprá cerca, recibí siempre.');

CREATE TABLE zonas_entrega (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  localidad VARCHAR(100) NOT NULL,
  codigo_postal_patron VARCHAR(30) NULL,
  distancia_desde_km DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  distancia_hasta_km DECIMAL(8,2) NOT NULL,
  costo DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  pedido_minimo DECIMAL(15,2) NULL,
  esta_activa BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  UNIQUE KEY uq_zonas_entrega_nombre (nombre),
  KEY idx_zonas_entrega_localidad (localidad, esta_activa),
  CONSTRAINT chk_zonas_entrega_distancia CHECK (distancia_desde_km >= 0 AND distancia_hasta_km > distancia_desde_km),
  CONSTRAINT chk_zonas_entrega_importes CHECK (costo >= 0 AND (pedido_minimo IS NULL OR pedido_minimo >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO zonas_entrega (nombre, localidad, distancia_desde_km, distancia_hasta_km, costo) VALUES
  ('La Plata cercana', 'La Plata', 0, 7, 0),
  ('La Plata extendida', 'La Plata', 7, 15, 0),
  ('Berisso', 'Berisso', 0, 15, 0),
  ('Ensenada', 'Ensenada', 0, 15, 0);

CREATE TABLE franjas_entrega (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  hora_desde TIME NOT NULL,
  hora_hasta TIME NOT NULL,
  capacidad_pedidos INT UNSIGNED NOT NULL DEFAULT 20,
  dias_semana VARCHAR(20) NOT NULL DEFAULT '1,2,3,4,5,6',
  esta_activa BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  UNIQUE KEY uq_franjas_entrega_nombre (nombre),
  CONSTRAINT chk_franjas_entrega_horas CHECK (hora_hasta > hora_desde)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO franjas_entrega (nombre, hora_desde, hora_hasta, capacidad_pedidos) VALUES
  ('Mañana', '09:00:00', '13:00:00', 20),
  ('Tarde', '14:00:00', '18:00:00', 20),
  ('Noche', '18:00:00', '21:00:00', 15);

CREATE TABLE productos_ecommerce (
  producto_id BIGINT UNSIGNED NOT NULL,
  esta_publicado BOOLEAN NOT NULL DEFAULT FALSE,
  nombre_online VARCHAR(180) NULL,
  descripcion_online TEXT NULL,
  precio_online DECIMAL(15,2) NULL,
  stock_seguridad DECIMAL(15,3) NOT NULL DEFAULT 0.000,
  cantidad_maxima_pedido DECIMAL(15,3) NULL,
  permite_sustitucion BOOLEAN NOT NULL DEFAULT TRUE,
  permite_retiro BOOLEAN NOT NULL DEFAULT TRUE,
  permite_envio BOOLEAN NOT NULL DEFAULT TRUE,
  es_destacado BOOLEAN NOT NULL DEFAULT FALSE,
  orden_destacado INT NOT NULL DEFAULT 0,
  fecha_actualizacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (producto_id),
  KEY idx_productos_ecommerce_publicados (esta_publicado, es_destacado),
  CONSTRAINT fk_productos_ecommerce_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT chk_productos_ecommerce_precio CHECK (precio_online IS NULL OR precio_online >= 0),
  CONSTRAINT chk_productos_ecommerce_stock CHECK (stock_seguridad >= 0 AND (cantidad_maxima_pedido IS NULL OR cantidad_maxima_pedido > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE productos_ecommerce_imagenes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  producto_id BIGINT UNSIGNED NOT NULL,
  url VARCHAR(500) NOT NULL,
  texto_alternativo VARCHAR(180) NULL,
  orden INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_productos_ecommerce_imagenes (producto_id, orden),
  CONSTRAINT fk_productos_ecommerce_imagenes_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE promociones_ecommerce (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(140) NOT NULL,
  descripcion VARCHAR(500) NULL,
  tipo VARCHAR(30) NOT NULL,
  ambito VARCHAR(30) NOT NULL DEFAULT 'productos',
  porcentaje DECIMAL(7,3) NULL,
  precio_fijo DECIMAL(15,2) NULL,
  codigo_cupon VARCHAR(50) NULL,
  monto_minimo DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  descuento_maximo DECIMAL(15,2) NULL,
  fecha_desde DATETIME(3) NOT NULL,
  fecha_hasta DATETIME(3) NOT NULL,
  es_acumulable BOOLEAN NOT NULL DEFAULT FALSE,
  es_destacada BOOLEAN NOT NULL DEFAULT FALSE,
  esta_activa BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  UNIQUE KEY uq_promociones_ecommerce_cupon (codigo_cupon),
  KEY idx_promociones_ecommerce_vigencia (esta_activa, fecha_desde, fecha_hasta),
  CONSTRAINT chk_promociones_ecommerce_fechas CHECK (fecha_hasta > fecha_desde),
  CONSTRAINT chk_promociones_ecommerce_valores CHECK (
    (porcentaje IS NULL OR (porcentaje > 0 AND porcentaje <= 100)) AND
    (precio_fijo IS NULL OR precio_fijo >= 0) AND monto_minimo >= 0 AND
    (descuento_maximo IS NULL OR descuento_maximo > 0)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE promociones_ecommerce_productos (
  promocion_id BIGINT UNSIGNED NOT NULL,
  producto_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (promocion_id, producto_id),
  CONSTRAINT fk_promociones_ecommerce_productos_promocion FOREIGN KEY (promocion_id)
    REFERENCES promociones_ecommerce (id) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT fk_promociones_ecommerce_productos_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE clientes_ecommerce (
  cliente_id BIGINT UNSIGNED NOT NULL,
  correo VARCHAR(254) NOT NULL,
  clave_hash VARCHAR(255) NOT NULL,
  correo_verificado BOOLEAN NOT NULL DEFAULT FALSE,
  acepta_promociones BOOLEAN NOT NULL DEFAULT FALSE,
  ultimo_acceso DATETIME(3) NULL,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (cliente_id),
  UNIQUE KEY uq_clientes_ecommerce_correo (correo),
  CONSTRAINT fk_clientes_ecommerce_cliente FOREIGN KEY (cliente_id)
    REFERENCES clientes (id) ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE direcciones_clientes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cliente_id BIGINT UNSIGNED NOT NULL,
  etiqueta VARCHAR(60) NOT NULL DEFAULT 'Principal',
  calle VARCHAR(140) NOT NULL,
  numero VARCHAR(20) NOT NULL,
  piso_departamento VARCHAR(40) NULL,
  localidad VARCHAR(100) NOT NULL,
  codigo_postal VARCHAR(12) NULL,
  referencias VARCHAR(255) NULL,
  latitud DECIMAL(10,7) NULL,
  longitud DECIMAL(10,7) NULL,
  distancia_km DECIMAL(8,2) NULL,
  zona_entrega_id BIGINT UNSIGNED NULL,
  es_principal BOOLEAN NOT NULL DEFAULT FALSE,
  esta_activa BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  KEY idx_direcciones_clientes_cliente (cliente_id, esta_activa),
  CONSTRAINT fk_direcciones_clientes_cliente FOREIGN KEY (cliente_id)
    REFERENCES clientes (id) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT fk_direcciones_clientes_zona FOREIGN KEY (zona_entrega_id)
    REFERENCES zonas_entrega (id) ON UPDATE RESTRICT ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pedidos_ecommerce (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo CHAR(12) NOT NULL,
  cliente_id BIGINT UNSIGNED NULL,
  estado VARCHAR(30) NOT NULL DEFAULT 'pendiente_pago',
  estado_pago VARCHAR(30) NOT NULL DEFAULT 'pendiente',
  modalidad_entrega VARCHAR(20) NOT NULL,
  medio_pago VARCHAR(30) NOT NULL,
  nombre_cliente VARCHAR(160) NOT NULL,
  correo_cliente VARCHAR(254) NOT NULL,
  telefono_cliente VARCHAR(30) NOT NULL,
  direccion_cliente VARCHAR(255) NULL,
  localidad_cliente VARCHAR(100) NULL,
  latitud_entrega DECIMAL(10,7) NULL,
  longitud_entrega DECIMAL(10,7) NULL,
  distancia_km DECIMAL(8,2) NULL,
  zona_entrega_id BIGINT UNSIGNED NULL,
  franja_entrega_id BIGINT UNSIGNED NULL,
  fecha_entrega DATE NULL,
  acepta_sustituciones BOOLEAN NOT NULL DEFAULT TRUE,
  observaciones VARCHAR(500) NULL,
  subtotal DECIMAL(15,2) NOT NULL,
  descuento DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  costo_envio DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total DECIMAL(15,2) NOT NULL,
  cupon_codigo VARCHAR(50) NULL,
  reserva_hasta DATETIME(3) NULL,
  venta_id BIGINT UNSIGNED NULL,
  asignado_usuario_id BIGINT UNSIGNED NULL,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  fecha_actualizacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  fecha_entregado DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pedidos_ecommerce_codigo (codigo),
  KEY idx_pedidos_ecommerce_estado_fecha (estado, fecha_creacion),
  KEY idx_pedidos_ecommerce_cliente (cliente_id, fecha_creacion),
  CONSTRAINT fk_pedidos_ecommerce_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (id),
  CONSTRAINT fk_pedidos_ecommerce_zona FOREIGN KEY (zona_entrega_id) REFERENCES zonas_entrega (id),
  CONSTRAINT fk_pedidos_ecommerce_franja FOREIGN KEY (franja_entrega_id) REFERENCES franjas_entrega (id),
  CONSTRAINT fk_pedidos_ecommerce_venta FOREIGN KEY (venta_id) REFERENCES ventas (id),
  CONSTRAINT fk_pedidos_ecommerce_usuario FOREIGN KEY (asignado_usuario_id) REFERENCES usuarios (id),
  CONSTRAINT chk_pedidos_ecommerce_importes CHECK (subtotal >= 0 AND descuento >= 0 AND costo_envio >= 0 AND total >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pedidos_ecommerce_detalles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pedido_id BIGINT UNSIGNED NOT NULL,
  producto_id BIGINT UNSIGNED NOT NULL,
  producto_sustituto_id BIGINT UNSIGNED NULL,
  nombre_producto VARCHAR(180) NOT NULL,
  cantidad_solicitada DECIMAL(15,3) NOT NULL,
  cantidad_confirmada DECIMAL(15,3) NULL,
  cantidad_reservada DECIMAL(15,3) NOT NULL DEFAULT 0.000,
  precio_unitario DECIMAL(15,2) NOT NULL,
  costo_unitario DECIMAL(15,2) NOT NULL,
  descuento DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  subtotal DECIMAL(15,2) NOT NULL,
  estado VARCHAR(30) NOT NULL DEFAULT 'reservado',
  observaciones VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pedidos_ecommerce_producto (pedido_id, producto_id),
  CONSTRAINT fk_pedidos_ecommerce_detalles_pedido FOREIGN KEY (pedido_id)
    REFERENCES pedidos_ecommerce (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_pedidos_ecommerce_detalles_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_pedidos_ecommerce_detalles_sustituto FOREIGN KEY (producto_sustituto_id)
    REFERENCES productos (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT chk_pedidos_ecommerce_detalles_cantidades CHECK (
    cantidad_solicitada > 0 AND cantidad_reservada >= 0 AND
    (cantidad_confirmada IS NULL OR cantidad_confirmada >= 0)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pedidos_ecommerce_estados (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pedido_id BIGINT UNSIGNED NOT NULL,
  estado_anterior VARCHAR(30) NULL,
  estado_nuevo VARCHAR(30) NOT NULL,
  usuario_id BIGINT UNSIGNED NULL,
  comentario VARCHAR(255) NULL,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_pedidos_ecommerce_estados_pedido (pedido_id, fecha_creacion),
  CONSTRAINT fk_pedidos_ecommerce_estados_pedido FOREIGN KEY (pedido_id)
    REFERENCES pedidos_ecommerce (id) ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT fk_pedidos_ecommerce_estados_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON UPDATE RESTRICT ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pagos_ecommerce (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pedido_id BIGINT UNSIGNED NOT NULL,
  proveedor VARCHAR(30) NOT NULL,
  estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
  monto_bruto DECIMAL(15,2) NOT NULL,
  comision DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  monto_neto DECIMAL(15,2) NOT NULL,
  referencia_externa VARCHAR(120) NULL,
  idempotencia VARCHAR(100) NOT NULL,
  movimiento_tesoreria_id BIGINT UNSIGNED NULL,
  fecha_aprobacion DATETIME(3) NULL,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_pagos_ecommerce_idempotencia (idempotencia),
  UNIQUE KEY uq_pagos_ecommerce_referencia (proveedor, referencia_externa),
  KEY idx_pagos_ecommerce_pedido (pedido_id, estado),
  CONSTRAINT fk_pagos_ecommerce_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos_ecommerce (id),
  CONSTRAINT fk_pagos_ecommerce_movimiento FOREIGN KEY (movimiento_tesoreria_id) REFERENCES movimientos_tesoreria (id),
  CONSTRAINT chk_pagos_ecommerce_importes CHECK (monto_bruto > 0 AND comision >= 0 AND monto_neto >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reembolsos_ecommerce (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pago_id BIGINT UNSIGNED NOT NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  monto DECIMAL(15,2) NOT NULL,
  motivo VARCHAR(255) NOT NULL,
  estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
  referencia_externa VARCHAR(120) NULL,
  movimiento_tesoreria_id BIGINT UNSIGNED NULL,
  fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  CONSTRAINT fk_reembolsos_ecommerce_pago FOREIGN KEY (pago_id) REFERENCES pagos_ecommerce (id),
  CONSTRAINT fk_reembolsos_ecommerce_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
  CONSTRAINT fk_reembolsos_ecommerce_movimiento FOREIGN KEY (movimiento_tesoreria_id) REFERENCES movimientos_tesoreria (id),
  CONSTRAINT chk_reembolsos_ecommerce_monto CHECK (monto > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE ventas
  MODIFY sesion_caja_id BIGINT UNSIGNED NULL,
  ADD COLUMN canal VARCHAR(20) NOT NULL DEFAULT 'local' AFTER usuario_id,
  ADD COLUMN pedido_ecommerce_id BIGINT UNSIGNED NULL AFTER canal,
  ADD UNIQUE KEY uq_ventas_pedido_ecommerce (pedido_ecommerce_id),
  ADD CONSTRAINT fk_ventas_pedido_ecommerce FOREIGN KEY (pedido_ecommerce_id)
    REFERENCES pedidos_ecommerce (id) ON UPDATE RESTRICT ON DELETE RESTRICT;

INSERT INTO permisos (codigo, modulo, nombre, descripcion) VALUES
  ('ecommerce.ver', 'ecommerce', 'Ver comercio electrónico', 'Consultar configuración, publicaciones y pedidos online'),
  ('ecommerce.gestionar', 'ecommerce', 'Gestionar comercio electrónico', 'Configurar publicaciones, promociones, zonas y franjas'),
  ('ecommerce.pedidos', 'ecommerce', 'Gestionar pedidos online', 'Preparar, confirmar, entregar y cancelar pedidos'),
  ('ecommerce.pagos', 'ecommerce', 'Gestionar pagos online', 'Confirmar pagos, comisiones y reembolsos');

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r JOIN permisos p ON p.codigo IN
  ('ecommerce.ver', 'ecommerce.gestionar', 'ecommerce.pedidos', 'ecommerce.pagos')
WHERE r.nombre IN ('administrador', 'supervisor');

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r JOIN permisos p ON p.codigo IN ('ecommerce.ver', 'ecommerce.pedidos')
WHERE r.nombre = 'deposito';
