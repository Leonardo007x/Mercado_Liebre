# Mercado Liebre

Mercado Liebre es una plataforma para que pequeños negocios publiquen y administren su catálogo digital de forma rápida, con gestión de tienda, productos y configuración visual. La idea principal es ofrecer una solución práctica a personas que quieren tener presencia digital sin depender de herramientas genéricas ni asumir costos de desarrollo a medida.

**Equipo de trabajo** — Brayan Esmid Cruz cumple el rol de líder del proyecto. Julián Leonardo Cerón se encarga de la parte de presentación. Elkin Yesid Yandun asume la responsabilidad técnica. Jeison Javier Guerra desarrolla la documentación.

La aplicación está desplegada con Docker Compose y utiliza MySQL como base de datos. Para el manejo de imágenes se integra Cloudinary y para la generación de contenido automático se usa Groq.

---

## PARTE 1 — ENTENDER EL PROBLEMA

El sistema busca resolver la dificultad que tienen muchos emprendedores para crear y mantener una presencia digital. Con Mercado Liebre pueden publicar su tienda, organizar productos y personalizar su catálogo sin conocimientos técnicos.

Los principales usuarios son emprendedores, pequeñas empresas y personas que venden productos por redes sociales y necesitan una página propia para mostrar su oferta de forma organizada.

Si la plataforma no existiera, estos negocios tendrían que limitarse a redes sociales o asumir mayores costos para contratar a un desarrollador, lo que frenarían su crecimiento digital.

---

## PARTE 2 — IDENTIFICAR LOS SERVICIOS

El sistema se compone de varios módulos que cumplen funciones específicas. Existe un componente encargado del registro y autenticación de usuarios mediante JWT. Otro administra las tiendas, sus temas visuales y configuración. Uno más está dedicado a los productos y categorías. Un servicio gestiona la subida y almacenamiento de imágenes a través de Cloudinary. Finalmente, existe una integración con Groq para generar descripciones automáticas de productos mediante inteligencia artificial.

Algunas tareas funcionan de forma independiente: la carga de imágenes, la generación de texto con IA y el guardado de datos operan sin afectarse entre sí. Si Groq no está disponible, el usuario puede escribir la descripción manualmente sin interrumpir el flujo.

---

## PARTE 3 — COMUNICACIÓN ENTRE COMPONENTES

La interacción comienza cuando el usuario realiza una acción en la interfaz. El frontend React/Vite envía la solicitud al backend a través de Nginx, que actúa como proxy inverso redirigiendo las rutas `/api/*` hacia el servicio de API en el puerto 3000. El backend procesa la petición y, si es necesario, consulta MySQL o se comunica con servicios externos como Cloudinary o Groq. Una vez obtiene la respuesta, la devuelve al frontend para que el usuario vea el resultado.

Por ejemplo, cuando se crea un producto, el backend registra la información en la base de datos. Si el usuario solicita una descripción automática, el backend envía la petición a Groq y entrega el texto generado. Si sube una imagen, la API la envía a Cloudinary y almacena la URL resultante.

---

## PARTE 4 — ARQUITECTURA

Se adopta una arquitectura de servicios desplegada con Docker Compose. Esto se debe a que el sistema está compuesto por componentes que pueden operar de manera relativamente independiente: el frontend servido por Nginx, la API Node.js/Express, la base de datos MySQL y los servicios externos de Cloudinary y Groq.

La plataforma está pensada para crecer en número de negocios y usuarios, por lo que se diseñó con una estructura que permite escalar y mantener cada parte sin afectar a las demás.

---

## PARTE 5 — BASE DE DATOS

El sistema almacena información relacionada con usuarios, tiendas, temas visuales, productos y categorías. También guarda los datos necesarios para la autenticación y personalización de cada tienda.

Los datos más críticos son las credenciales de acceso y la información comercial de los negocios. Si estos datos se pierden, las tiendas dejarían de funcionar correctamente y se afectaría la confianza de los usuarios. Para mitigar este riesgo se usa un volumen persistente en Docker y se realizan respaldos periódicos.

---

## PARTE 6 — TIPOS DE USUARIO

Dentro del sistema existen tres perfiles principales. El administrador supervisa y controla la operación global de la plataforma. El dueño del negocio crea y modifica su tienda, sube productos y personaliza su catálogo. El visitante únicamente visualiza la información pública de cada tienda. Cada perfil tiene permisos distintos según su función.

---

## PARTE 7 — FALLAS Y RIESGOS

Si el servicio de inteligencia artificial (Groq) deja de funcionar, simplemente no se podrán generar descripciones automáticas, aunque el usuario podrá escribirlas manualmente sin interrumpir el resto del flujo.

Si Cloudinary falla, la subida y visualización de imágenes externas se verá afectada. Se mitiga con validación de configuración, respuestas controladas y uso de imágenes por defecto.

Si la base de datos MySQL presenta una caída, no será posible guardar ni consultar información, lo que impactaría directamente el funcionamiento general. Se mitiga con volumen persistente, respaldos y manejo de errores en la API.

Si el servidor principal del backend cae, la aplicación no estará disponible temporalmente. Se mitiga con reinicio automático en Docker Compose, un endpoint de health (`GET /api/health`) y monitoreo constante.

---

## PARTE 8 — EJECUCIÓN LOCAL

### Requisitos
- Docker
- Docker Compose

### Pasos

Configurar las variables de entorno en `.env` y levantar los servicios:

```bash
docker compose up --build
```

Una vez iniciado, acceder desde el navegador:

- **Frontend:** http://localhost:8080
- **API health:** http://localhost:8080/api/health

---

## PARTE 9 — PRUEBAS DE API

La colección de endpoints para Postman se encuentra en:

```
postman/Mercado_Liebre_API.postman_collection.json
```

Flujo recomendado para demo: verificar `GET /api/health`, hacer registro o login para obtener el token JWT, luego recorrer el flujo de tienda y el CRUD completo de productos.

---

## PARTE 10 — CONTROL DE VERSIONES

Los cambios se organizan por secciones relacionadas con la documentación de servicios, arquitectura, comunicación y usuarios. Cada integrante revisa la propuesta completa, aporta observaciones, identifica posibles debilidades y valida que la arquitectura tenga coherencia y capacidad de crecimiento.
