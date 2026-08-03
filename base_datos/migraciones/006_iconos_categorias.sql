ALTER TABLE categorias
  ADD COLUMN icono_url VARCHAR(255) NULL AFTER porcentaje_margen_predeterminado;

UPDATE categorias SET icono_url = '/iconos/categorias/almacen.png' WHERE nombre = 'Almacén';
UPDATE categorias SET icono_url = '/iconos/categorias/bazar-y-textil.png' WHERE nombre = 'Bazar y textil';
UPDATE categorias SET icono_url = '/iconos/categorias/bebidas.png' WHERE nombre = 'Bebidas';
UPDATE categorias SET icono_url = '/iconos/categorias/congelados.png' WHERE nombre = 'Congelados';
UPDATE categorias SET icono_url = '/iconos/categorias/desayuno-y-merienda.png' WHERE nombre = 'Desayuno y merienda';
UPDATE categorias SET icono_url = '/iconos/categorias/lacteos-y-productos-frescos.png' WHERE nombre = 'Lácteos y productos frescos';
UPDATE categorias SET icono_url = '/iconos/categorias/limpieza.png' WHERE nombre = 'Limpieza';
UPDATE categorias SET icono_url = '/iconos/categorias/mascotas.png' WHERE nombre = 'Mascotas';
UPDATE categorias SET icono_url = '/iconos/categorias/mundo-bebe.png' WHERE nombre = 'Mundo bebé';
UPDATE categorias SET icono_url = '/iconos/categorias/panaderia.png' WHERE nombre = 'Panadería';
UPDATE categorias SET icono_url = '/iconos/categorias/perfumeria-y-cuidado-personal.png' WHERE nombre = 'Perfumería y cuidado personal';
