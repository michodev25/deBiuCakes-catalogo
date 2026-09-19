# Selector de moneda del catálogo

## Decisión

El cliente elige la moneda destacada mediante un `<select>` nativo «Ver precios en» con USD y CUP. USD es el valor inicial. Se mantienen ambas monedas visibles porque el catálogo debe informar las dos: la elegida aparece primero y con mayor énfasis; la otra queda debajo. La preferencia se guarda únicamente en `localStorage` y no modifica el JSON ni la tasa de elTOQUE.

Se consideraron tres controles: desplegable nativo, menú personalizado y botones segmentados. El desplegable coincide con la interacción solicitada, ocupa poco espacio en móvil y ofrece soporte de teclado y lector de pantalla sin lógica adicional.

## Comportamiento

El selector se ubica sobre la nota de tasa, próximo a los filtros. Al cambiarlo, se actualizan los importes ya dibujados en tarjetas, detalle, carrito, total y destacado de portada sin reconstruir la cuadrícula; así se conserva el estado y se evita el parpadeo al agregar productos. El pedido de WhatsApp incluye ambos importes y prioriza la moneda seleccionada, siempre marcando CUP como aproximado. Una tasa nueva actualiza los importes visibles respetando la selección.

La preferencia almacenada se valida al leerla; cualquier valor desconocido vuelve a USD. Si no se puede usar `localStorage`, el selector sigue funcionando durante la visita. Las pruebas móviles comprobarán ambos órdenes, persistencia, carrito, detalle, cambio de tasa y ausencia de reconstrucción de tarjetas.
