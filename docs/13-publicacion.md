# Publicación de `petro-calc`

`@petroatlas/petro-calc` vive en `packages/petro-calc` y se publica desde este monorepo. No hay un repositorio aparte para el paquete.

> **Estado:** `0.2.0` publicado el 10 de noviembre de 2026 y verificado con una instalación desde el registro.

## Requisitos

- Una cuenta de npm con acceso al ámbito `@petroatlas`. Si el ámbito no existe o no pertenece a la cuenta, npm rechaza la publicación con un error 403 o 404.
- Sesión iniciada en npm (`npm login`) y, si la cuenta lo exige, segundo factor configurado.
- El árbol de Git limpio y la rama `main` actualizada.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:coverage` y `pnpm build` en verde.

El nombre definitivo es **PetroAtlas** y el paquete usa el ámbito `@petroatlas` (ver `11-plan-de-fases.md`). La cuenta que publica debe pertenecer a la organización `petroatlas` en npm.

## Versión y changelog

1. Se elige la versión según SemVer. Mientras la API no sea estable se publica en `0.x`.
2. Se actualiza `version` en `packages/petro-calc/package.json`.
3. Se añade la entrada correspondiente en `packages/petro-calc/CHANGELOG.md`.
4. La versión y el changelog entran en el PR; no se cambian después de publicar.

## Procedimiento

```bash
git switch main
git pull --ff-only
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build

cd packages/petro-calc
npm pack --dry-run        # revisa el contenido: dist, README, LICENSE y CHANGELOG
npm publish --access public
```

`prepublishOnly` compila el paquete antes de empaquetar. `publishConfig.access` ya está en `public`, así que `npm publish` sin `--access public` también funciona, pero se deja explícito para que la intención quede clara.

Si la cuenta exige verificación en dos pasos, npm devuelve un 403. En una terminal interactiva se introduce el código cuando lo pide; en un entorno automatizado se usa `--otp=<código>` o un token granular con la opción de omitir 2FA.

### Verificación posterior

```bash
npm view @petroatlas/petro-calc version
npm view @petroatlas/petro-calc dist.tarball
```

Además, se instala en un directorio temporal fuera del monorepo y se importa una función:

```bash
mkdir /tmp/petro-calc-check
cd /tmp/petro-calc-check
npm init --yes
npm install @petroatlas/petro-calc
node --input-type=module -e "import { vogel } from '@petroatlas/petro-calc'; console.log(vogel(250, { pwf: 180, q: 50 }).qmax)"
```

### Tag

Solo después de verificar la publicación:

```bash
git tag petro-calc-v0.2.0
git push origin petro-calc-v0.2.0
```

El tag usa el prefijo `petro-calc-v` para no confundirse con las versiones de la aplicación.

## Errores frecuentes

| Error | Causa | Solución |
| --- | --- | --- |
| `ENEEDAUTH` | No hay sesión de npm en la máquina | `npm login` |
| `403 Forbidden` | La cuenta no tiene permiso sobre el ámbito | Crear o unirse a la organización `@petroatlas`, o cambiar el nombre del paquete |
| `403` con «Two-factor authentication» | La cuenta exige 2FA para publicar | Repetir con `--otp=<código>` o usar un token granular con bypass de 2FA |
| `404 Not Found` al publicar | El ámbito no existe o no es visible para la cuenta | Confirmar el ámbito antes de publicar |
| `EPUBLISHCONFLICT` | La versión ya existe | Subir la versión; no se reutiliza una versión publicada |
| El tarball no lleva `dist` | Falta el build | Ejecutar `pnpm build`; `prepublishOnly` también lo hace |

## Reglas

- No se publica desde una rama de trabajo ni con cambios sin commitear.
- No se usa `--force` ni se despublica una versión con dependientes. Si una versión sale mal, se publica una corrección con una versión nueva; npm solo permite despublicar en la ventana excepcional que marca su política.
- El CI no publica. La publicación es manual y la hace quien mantiene el repositorio con credenciales de npm.
- La web consume el paquete desde el código fuente del monorepo (`@petroatlas/source`), así que una publicación no cambia el despliegue de la aplicación.
