# Identidad visual

## Paleta principal

| Uso | Color | Variable CSS |
| --- | --- | --- |
| Fondo oscuro, encabezados y texto destacado | `#003b46` | `--color-primario-900` |
| Acciones principales y navegación | `#07575b` | `--color-primario-700` |
| Acentos, indicadores y elementos secundarios | `#66a5ad` | `--color-acento-500` |
| Fondos suaves, bordes y selección | `#c4dfe6` | `--color-acento-100` |

La interfaz puede usar además blanco, negro y una escala neutral de grises definida como variables globales en `frontend/src/estilos.css`.

## Reglas de uso

- El texto normal debe usar un tono oscuro sobre fondos claros.
- Los botones principales usan `#07575b` con texto blanco y cambian a `#003b46` al pasar el cursor.
- `#66a5ad` y `#c4dfe6` se reservan para acentos y superficies; no se usan para texto pequeño sobre blanco.
- Los colores de error, advertencia y éxito son semánticos y no se reemplazan por la paleta de marca.
- Toda pantalla nueva debe reutilizar las variables CSS y evitar colores de marca escritos directamente.

## Densidad visual

La interfaz utiliza una escala compacta, aproximadamente un 25% menor que la escala inicial. Los formularios, tablas, botones y espacios deben mantener esta densidad para mostrar más información sin perder legibilidad.

## Altas y ediciones

- Toda alta y edición se realiza en un modal; no se desplazan formularios dentro de la pantalla principal.
- Se reutiliza el componente `frontend/src/componentes/Modal.jsx`.
- Los modales deben tener título, cierre visible, cierre con Escape y acciones consistentes al pie.
- La acción primaria se ubica a la derecha y la cancelación usa el estilo secundario.
- Los formularios extensos utilizan el ancho grande y desplazamiento interno.
