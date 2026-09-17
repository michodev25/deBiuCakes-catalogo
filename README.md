# LaBiuCakes · catálogo y Cakeadmin

Catálogo estático de repostería con carrito. El panel de administración está en /cakeadmin.

## Arquitectura

- Productos y categorías: un único archivo JSON en dist/catalog.json.
- Panel: funciones de Vercel en api/; guardan el JSON en GitHub con control de versión para no sobrescribir otra edición.
- Fotografías: Cloudinary; solo se guarda su URL HTTPS en el JSON.
- Acceso: usuarios fijos michel y zahira, contraseñas y firma de sesión exclusivamente en variables privadas del servidor.

No se usa base de datos. El catálogo público consulta la API para ver los cambios recientes y usa el JSON estático si la API no está disponible.

## Publicar en Vercel

1. Importa este repositorio en Vercel. El archivo vercel.json publica dist/ y abre /cakeadmin.
2. En Project Settings > Environment Variables añade las variables listadas en .env.example. Asigna a CAKEADMIN_MICHEL_PASSWORD y CAKEADMIN_ZAHIRA_PASSWORD las contraseñas acordadas. No las pongas en el repositorio ni en variables que empiecen por VITE_ o NEXT_PUBLIC_.
3. Crea un token fine-grained de GitHub limitado a este repositorio, con permiso Contents: Read and write. Ponlo como GITHUB_TOKEN. GITHUB_REPOSITORY debe apuntar al mismo repositorio que despliega Vercel.
4. Crea una cuenta de Cloudinary y copia Cloud name, API key y API secret. La subida usa una firma generada en el servidor; no requiere un preset público.
5. Genera CAKEADMIN_SESSION_SECRET con al menos 32 caracteres aleatorios. Vuelve a desplegar tras configurar las variables.

Las contraseñas numéricas iniciales fueron compartidas en el chat. Conviene cambiarlas por otras largas antes de poner el panel en producción. Si cambias una contraseña, cambia también CAKEADMIN_SESSION_SECRET para cerrar sesiones anteriores.

## Desarrollo y comprobaciones

La vista estática se puede abrir sirviendo dist/ por HTTP. Para probar el panel localmente sin instalar Vercel CLI, copia .env.example a .env.local, completa sus valores y ejecuta node --env-file=.env.local scripts/dev-server.mjs. El servidor solo escucha en 127.0.0.1. Sin GITHUB_TOKEN, el inicio de sesión y la vista del panel funcionan, pero guardar muestra un error.

Ejecuta node --test tests/*.test.mjs para comprobar validación y autenticación. El panel no podrá guardar cambios si faltan las credenciales: mostrará un aviso en vez de simular que los guardó.
