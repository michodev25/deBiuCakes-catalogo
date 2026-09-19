# LaBiuCakes: precios en USD y equivalencia en CUP

## Decisión

Cada producto guarda `priceUsd` con dos decimales. El panel administra únicamente ese precio base. El catálogo muestra USD como importe principal y CUP como equivalencia aproximada, incluyendo productos, detalle, carrito y pedido de WhatsApp. Los ocho precios de muestra, antes expresados en CUP, se convierten una sola vez a USD usando 710 CUP por USD (tasa consultada en elTOQUE el 19 de septiembre de 2026). El redondeo a centavos puede producir diferencias de unos CUP respecto de los importes originales.

## Fuente de la tasa

La opción recomendada es consultar la API oficial de elTOQUE desde una función de servidor con un token privado, nunca desde el navegador. El servidor valida la respuesta y conserva temporalmente la última tasa correcta para reducir peticiones. El navegador consulta la función al cargar y periódicamente, sin redibujar todas las tarjetas. La fuente y el momento de consulta se muestran junto a la tasa. La tasa es referencial, no un precio garantizado de cambio.

La alternativa manual no necesita token, pero no se actualiza automáticamente. Mientras no haya token, se utiliza 710 como referencia fechada y marcada como no automática. No se extraerá la tasa automáticamente de las páginas HTML de elTOQUE: sus condiciones restringen el scraping y ofrecen una API para la integración.

## Datos, errores y verificación

El JSON pasa a versión 2 con `currency: "USD"` y `priceUsd` por producto. La lectura de JSON versión 1 se migra al mismo valor de referencia para compatibilidad; las nuevas escrituras usan versión 2. Si la API no responde, se muestra la última tasa válida como obsoleta o el respaldo manual, sin afirmar que es una tasa en vivo. El pedido incluye totales USD y CUP y la tasa aplicada. Las pruebas cubren migración, validación de centavos, respaldo, fuente, carrito y vista móvil. La integración real con elTOQUE se verificará cuando el dueño proporcione su token mediante variables privadas.
