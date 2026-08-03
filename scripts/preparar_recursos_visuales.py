"""Separa los recursos aprobados de la lámina de marca y la plancha de iconos."""

import argparse
from pathlib import Path

from PIL import Image


ICONOS = [
    "almacen",
    "bazar-y-textil",
    "bebidas",
    "congelados",
    "desayuno-y-merienda",
    "lacteos-y-productos-frescos",
    "limpieza",
    "mascotas",
    "mundo-bebe",
    "panaderia",
    "perfumeria-y-cuidado-personal",
    "usuarios",
]


def guardar_iconos(plancha: Path, destino: Path) -> None:
    imagen = Image.open(plancha).convert("RGBA")
    limites_x = [round(imagen.width * indice / 4) for indice in range(5)]
    limites_y = [round(imagen.height * indice / 3) for indice in range(4)]
    destino.mkdir(parents=True, exist_ok=True)

    for indice, nombre in enumerate(ICONOS):
        fila, columna = divmod(indice, 4)
        celda = imagen.crop(
            (limites_x[columna], limites_y[fila], limites_x[columna + 1], limites_y[fila + 1])
        )
        caja = celda.getchannel("A").getbbox()
        if not caja:
            raise ValueError(f"El icono {nombre} quedó vacío")
        recorte = celda.crop(caja)
        recorte.thumbnail((220, 220), Image.Resampling.LANCZOS)
        lienzo = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
        posicion = ((256 - recorte.width) // 2, (256 - recorte.height) // 2)
        lienzo.alpha_composite(recorte, posicion)
        carpeta = destino.parent / "sistema" if nombre == "usuarios" else destino
        carpeta.mkdir(parents=True, exist_ok=True)
        lienzo.save(carpeta / f"{nombre}.png", optimize=True)


def guardar_marcas(lamina: Path, destino: Path) -> None:
    imagen = Image.open(lamina).convert("RGBA")
    destino.mkdir(parents=True, exist_ok=True)
    recortes = {
        "logo-principal.png": (20, 20, 880, 350),
        "logo-horizontal-oscuro.png": (902, 10, 1523, 196),
        "logo-horizontal-claro.png": (902, 210, 1523, 356),
        "favicon.png": (683, 906, 782, 1007),
        "favicon-circular.png": (825, 905, 925, 1007),
    }
    for nombre, caja in recortes.items():
        imagen.crop(caja).save(destino / nombre, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--plancha-iconos", type=Path, required=True)
    parser.add_argument("--lamina-marca", type=Path, required=True)
    parser.add_argument("--destino-publico", type=Path, required=True)
    argumentos = parser.parse_args()
    guardar_iconos(argumentos.plancha_iconos, argumentos.destino_publico / "iconos/categorias")
    guardar_marcas(argumentos.lamina_marca, argumentos.destino_publico / "marca")


if __name__ == "__main__":
    main()
