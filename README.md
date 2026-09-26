# LaBiu Dulceria Panaderia · catálogo y Cakeadmin

Catálogo estático de repostería con carrito. El panel de administración está en /cakeadmin. Los precios base se guardan en USD; el equivalente en CUP se calcula al mostrar cada página.

## Arquitectura

- Productos y categorías: un único archivo JSON en dist/catalog.json.
- Panel: funciones de Vercel en api/; guardan el JSON en GitHub con control de versión para no sobrescribir otra edición.
- Fotografías: Cloudinary; solo se guarda su URL HTTPS en el JSON.
- Acceso: usuarios fijos michel y zahira, contraseñas y firma de sesión exclusivamente en variables privadas del servidor.
- Monedas: el catálogo guarda `priceUsd` por producto. `api/exchange-rate.mjs` consulta la API oficial de elTOQUE desde el servidor con `ELTOQUE_API_TOKEN`; nunca se expone el token al navegador. La respuesta se cachea 10 minutos. USD es el precio base y CUP se redondea al peso más cercano.
- El cliente puede elegir USD o CUP en «Ver precios en». La moneda elegida aparece primero en el catálogo y el pedido; la otra sigue visible. La preferencia se guarda solo en su navegador y no modifica los precios base ni la tasa.

No se usa base de datos. El catálogo público consulta la API para ver los cambios recientes y usa el JSON estático si la API no está disponible.

## Publicar en Vercel

1. Importa este repositorio en Vercel. El archivo vercel.json publica dist/ y abre /cakeadmin.
2. En Project Settings > Environment Variables añade las variables listadas en .env.example. Asigna a CAKEADMIN_MICHEL_PASSWORD y CAKEADMIN_ZAHIRA_PASSWORD las contraseñas acordadas. No las pongas en el repositorio ni en variables que empiecen por VITE_ o NEXT_PUBLIC_.
3. Crea un token fine-grained de GitHub limitado a este repositorio, con permiso Contents: Read and write. Ponlo como GITHUB_TOKEN. GITHUB_REPOSITORY debe apuntar al mismo repositorio que despliega Vercel.
4. Crea una cuenta de Cloudinary y copia Cloud name, API key y API secret. La subida usa una firma generada en el servidor; no requiere un preset público.
5. Genera CAKEADMIN_SESSION_SECRET con al menos 32 caracteres aleatorios. Vuelve a desplegar tras configurar las variables.
6. Para actualizar CUP con elTOQUE, solicita una clave en [su formulario oficial](https://tasas-token.eltoque.com/). Registra LaBiu Dulceria Panaderia como aplicación, usa el dominio público de Vercel como URL y selecciona «Servidor» como origen de las peticiones. Una vez que la recibas por correo, agrega `ELTOQUE_API_TOKEN` en las variables privadas de Vercel y vuelve a desplegar. No compartas el token por chat ni lo subas a GitHub.

Sin token o si elTOQUE no responde, la interfaz indica que usa una referencia manual del 19 de septiembre de 2026: 1 USD = 710 CUP. No presenta esa referencia como tasa en vivo. La API oficial aún necesita probarse con un token real porque su documentación no especifica el formato de la respuesta exitosa.

Las contraseñas numéricas iniciales fueron compartidas en el chat. Conviene cambiarlas por otras largas antes de poner el panel en producción. Si cambias una contraseña, cambia también CAKEADMIN_SESSION_SECRET para cerrar sesiones anteriores.

## Desarrollo y comprobaciones

La vista estática se puede abrir sirviendo dist/ por HTTP. Para probar el panel localmente sin instalar Vercel CLI, copia .env.example a .env.local, completa sus valores y ejecuta node --env-file=.env.local scripts/dev-server.mjs. El servidor solo escucha en 127.0.0.1. Sin GITHUB_TOKEN, el inicio de sesión y la vista del panel funcionan, pero guardar muestra un error.

Ejecuta node --test tests/*.test.mjs para comprobar validación y autenticación. El panel no podrá guardar cambios si faltan las credenciales: mostrará un aviso en vez de simular que los guardó.
