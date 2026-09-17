# LaBiuCakes: catálogo editable sin base de datos

## Decisión

Mantener la web estática y la estética rosa, azul claro y marfil. El catálogo vive en un único archivo `dist/catalog.json` versionado en GitHub. El panel en `/cakeadmin` usa funciones de Vercel para iniciar sesión y actualizar ese JSON mediante la API de contenidos de GitHub. Las fotografías se suben directamente desde el navegador a Cloudinary mediante una firma temporal generada por una función autenticada. Ni el token de GitHub ni el secreto de Cloudinary llegan al navegador.

## Interfaz

En cada tarjeta, el botón `+` se transforma en un selector `− cantidad +` al agregar la primera unidad. El diálogo de detalles refleja la misma cantidad. El panel tiene inicio de sesión, vista de productos, formulario de creación/edición, carga de foto, y vista de categorías para crear, renombrar y eliminar categorías vacías. En móvil usa una columna y controles táctiles grandes.

## Datos y seguridad

Cada producto tiene id estable, nombre, categoría, precio en CUP, descripción, imagen, distintivo opcional y visibilidad. Los dos usuarios fijos son `michel` y `zahira`; las contraseñas se configuran en variables privadas de Vercel y pueden cambiarse sin editar el repositorio. La sesión es una cookie firmada, HTTP-only y de duración limitada. Las escrituras requieren sesión, origen propio y validación del JSON. Se comprueba el SHA del archivo para evitar sobrescribir cambios concurrentes.

## Limitaciones y verificación

Sin credenciales de GitHub y Cloudinary, el panel puede mostrarse pero no guardar ni subir fotos. En vista previa estática el catálogo usa el JSON local. Se comprueban sintaxis JS/JSON, validaciones del servidor, autenticación, estados del carrito y presentación móvil. Una actualización guardada se ve en las nuevas consultas al catálogo y también genera un commit en GitHub.
