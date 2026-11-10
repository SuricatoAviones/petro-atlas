# Publicación de `petro-calc`

`@suricatoaviones/petro-calc` vive en `packages/petro-calc` y se publica desde este monorepo. No hay un repositorio aparte para el paquete.

> **Estado:** `0.2.0` preparada para publicarse como `@suricatoaviones/petro-calc`. Sustituye al antiguo `@petroatlas/petro-calc`, que se deprecará.

## Requisitos

- Una cuenta de npm con acceso al ámbito personal `@suricatoaviones`; no hace falta crear una organización.
- Sesión iniciada en npm (`npm login`) y, si la cuenta lo exige, segundo factor configurado.
- El árbol de Git limpio y la rama `main` actualizada.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:coverage` y `pnpm build` en verde.

El nombre definitivo del proyecto es **PetroAtlas**, pero el paquete usa el ámbito personal `@suricatoaviones` para coincidir con el propietario del repositorio de GitHub y poder publicarlo también en GitHub Packages.

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
npm view @suricatoaviones/petro-calc version
npm view @suricatoaviones/petro-calc dist.tarball
```

Además, se instala en un directorio temporal fuera del monorepo y se importa una función:

```bash
mkdir /tmp/petro-calc-check
cd /tmp/petro-calc-check
npm init --yes
npm install @suricatoaviones/petro-calc
node --input-type=module -e "import { vogel } from '@suricatoaviones/petro-calc'; console.log(vogel(250, { pwf: 180, q: 50 }).qmax)"
```

### Tag

Solo después de verificar la publicación:

```bash
# El tag petro-calc-v0.2.0 ya apunta al paquete antiguo; usa un tag nuevo.
git tag petro-calc-v0.2.0-suricatoaviones
git push origin petro-calc-v0.2.0-suricatoaviones
```

El tag usa el prefijo `petro-calc-v` para no confundirse con las versiones de la aplicación.

## Errores frecuentes

| Error | Causa | Solución |
| --- | --- | --- |
| `ENEEDAUTH` | No hay sesión de npm en la máquina | `npm login` |
| `403 Forbidden` | La cuenta no tiene permiso sobre el ámbito | Confirmar que la sesión es `suricatoaviones`; el ámbito personal no necesita organización |
| `403` con «Two-factor authentication» | La cuenta exige 2FA para publicar | Repetir con `--otp=<código>` o usar un token granular con bypass de 2FA |
| `404 Not Found` al publicar | El ámbito no existe o no es visible para la cuenta | Confirmar que el paquete se llama `@suricatoaviones/petro-calc` |
| `EPUBLISHCONFLICT` | La versión ya existe | Subir la versión; no se reutiliza una versión publicada |
| El tarball no lleva `dist` | Falta el build | Ejecutar `pnpm build`; `prepublishOnly` también lo hace |

## Reglas

- No se publica desde una rama de trabajo ni con cambios sin commitear.
- No se usa `--force` ni se despublica una versión con dependientes. Si una versión sale mal, se publica una corrección con una versión nueva; npm solo permite despublicar en la ventana excepcional que marca su política.
- La publicación en npm es manual. GitHub Packages se publica con el workflow manual `Publish package to GitHub Packages`, que usa el `GITHUB_TOKEN` del repositorio.
- La web consume el paquete desde el código fuente del monorepo (`@petroatlas/source`), así que una publicación no cambia el despliegue de la aplicación.

## Migración desde `@petroatlas/petro-calc`

El nombre anterior se retiró porque su ámbito no coincide con el propietario del repositorio y no puede vincularse a GitHub Packages. Para cerrar la migración:

```bash
npm deprecate @petroatlas/petro-calc "Renamed to @suricatoaviones/petro-calc"
npm unpublish @petroatlas/petro-calc@0.2.0
```

Después se puede borrar la organización `petroatlas` desde npmjs.com. No se publica ninguna versión nueva con el nombre antiguo.

## GitHub Packages

El workflow `.github/workflows/publish-github-package.yml` publica el paquete en GitHub Packages. Se lanza manualmente desde **Actions → Publish package to GitHub Packages → Run workflow**, después de publicar la misma versión en npm.

- El nombre `@suricatoaviones/petro-calc` coincide con el propietario del repositorio, que es el requisito de GitHub Packages.
- El workflow usa `GITHUB_TOKEN` con permiso `packages: write`; no hay que guardar un token en el repositorio.
- El paquete queda vinculado al repositorio por el campo `repository` de `package.json`.
- Para instalar desde GitHub Packages hace falta autenticarse, incluso si el paquete es público:

  ```bash
  npm login --scope=@suricatoaviones --auth-type=legacy --registry=https://npm.pkg.github.com
  npm install @suricatoaviones/petro-calc
  ```

La instalación pública recomendada sigue siendo npmjs.org.
