# Generar imágenes a partir de texto

Solución de uo294399 para la issue [#7](https://github.com/nahuelcostac/redes-generativas-26/issues/7).

La página presenta imágenes generadas previamente. Permite elegir una descripción disponible, una semilla y un número de pasos. La comparación conserva la descripción y cambia solo uno de esos parámetros. La página no carga pesos ni ejecuta el modelo.

## Ejecución local

Se necesita Python 3.10 o posterior. Desde esta carpeta, crea un entorno e instala las dependencias:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r code\requirements.txt
python code\generate.py
```

La generación descarga el modelo y sus archivos a la caché local de Hugging Face. No añadas esa caché ni los pesos al repositorio. La primera ejecución necesita conexión a internet y espacio para los pesos del modelo.

Para escoger semillas y pasos, cambia los argumentos:

```powershell
python code\generate.py --seeds 17 41 --steps 1 4
```

El script genera las dos descripciones predeterminadas. Se pueden añadir textos libres con `--prompt`; repite la opción para incorporar más de uno:

```powershell
python code\generate.py --seeds 17 41 --steps 1 4 --prompt "A yellow kayak on a quiet lake"
```

El script exporta las imágenes PNG y `results/manifest.json`. El manifiesto registra el prompt usado, la semilla, los pasos, la guía, la resolución, el dispositivo y los tiempos medidos. Los controles de la página solo incluyen combinaciones que aparecen en ese manifiesto. Al generar otros ejemplos, se reemplaza el manifiesto y se sobrescriben las imágenes coincidentes; copia `results/` antes de regenerarla si quieres conservar otra muestra.

## Modelo y datos

- Modelo: [`stabilityai/sd-turbo`](https://huggingface.co/stabilityai/sd-turbo), revisión fijada `0096a99066b73650354282eeef18114cf0dab75c`.
- Ejecución local con Diffusers y `AutoPipelineForText2Image`. Las versiones están fijadas en `code/requirements.txt`.
- Resolución de salida: 512 × 512 píxeles. La guía se fija en 0.0 y el script limita los pasos a 1–4, siguiendo la configuración recomendada por SD-Turbo.
- Textos preparados para esta solución: una taza roja y una escena de parque con perro, bicicleta y globo. El texto enviado al modelo está en inglés; la interfaz muestra la descripción en español y permite desplegar el prompt exacto.
- Las imágenes son generaciones del modelo, no fotografías de referencia. La fidelidad a cada elemento se revisa visualmente y no se garantiza.

## Resultados y comprobaciones

La muestra contiene ocho imágenes: dos descripciones, las semillas 17 y 41, y 1 y 4 pasos. La taza roja se reconoce en las cuatro generaciones. En la escena aparecen el perro, la bicicleta y globos en las cuatro generaciones; el modelo cambia el color de la bicicleta y añade globos en algunas imágenes. Es una revisión visual, no una evaluación automática.

La ejecución se hizo en Windows 11 con un Intel Core i7-14650HX (16 núcleos y 24 procesadores lógicos), Python 3.12.10 y PyTorch 2.8.0+cpu. No se detectó GPU CUDA. La descarga inicial y carga del modelo tardaron 1432.768 s. Una carga posterior desde la caché tardó 0.775 s. Las ocho inferencias tardaron entre 6.603 y 13.490 s cada una, con una media de 10.128 s. Los tiempos se guardan por imagen en el manifiesto.

`npm run check` pasó con 41 pruebas y `npm run build` terminó correctamente. Los archivos de esta contribución pasan Prettier. `npm run format:check` detecta 123 archivos preexistentes fuera de formato en el repositorio; no se reformatearon archivos ajenos a esta solución. En `npm run preview`, se comprobó que la página carga un PNG de 512 × 512 y compara semilla y pasos. Al escribir un texto que no está en la muestra, la interfaz vacía el resultado y avisa que hay que elegir una descripción disponible. El generador también rechaza pasos fuera de 1–4 y semillas negativas.

## Uso de agentes

Un agente revisó la correspondencia entre los controles de la página y las combinaciones exportadas. Se decidió limitar la web a resultados existentes y dejar la generación de textos nuevos al script local, porque el modo de esta issue es `precomputed`. Se comprobó esa decisión con pruebas del manifiesto y de las imágenes exportadas.
