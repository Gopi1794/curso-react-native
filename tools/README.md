# tools/

Herramientas externas que se usan ocasionalmente, fuera del código de la app.

- `bundletool.jar` — herramienta oficial de Android para inspeccionar/extraer APKs desde un `.aab` (App Bundle).

  Ejemplo:
  ```bash
  java -jar tools/bundletool.jar build-apks --bundle=app.aab --output=app.apks
  ```

Esta carpeta NO debe entrar en `frontend/` para no inflar el bundle de Expo.
