# UniFlow – Asistente Inteligente Universitario

## Descripción general

**UniFlow** es una aplicación móvil impulsada por inteligencia artificial diseñada para mejorar la vida universitaria.
Funciona como un **asistente inteligente**, que ayuda al estudiante a **organizar su tiempo, optimizar sus rutinas y equilibrar su vida académica, social y personal**.

UniFlow integra herramientas de planificación, bienestar, mapas del campus y comunidad estudiantil en una sola experiencia fluida y elegante.

> “Tu asistente inteligente que te entiende, te guía y te equilibra.”

---

## Objetivo

Desarrollar un **MVP funcional** de una aplicación móvil que actúe como un asistente universitario integral, capaz de gestionar tareas, horarios, bienestar y conexión social, utilizando IA y servicios en la nube.

---

## Problema detectado

Los estudiantes universitarios suelen enfrentar varios desafíos en su día a día:

* Falta de organización y sobrecarga de tareas.
* Dificultad para manejar tiempo, comidas y descanso.
* Estrés académico y falta de hábitos saludables.
* Dificultad para conocer personas con intereses académicos similares.
* Información dispersa sobre salones, cafeterías o zonas del campus.

**UniFlow** surge para centralizar todas esas necesidades en una sola plataforma inteligente y confiable.

---

## Propuesta de valor

**UniFlow** combina inteligencia artificial, bienestar y vida universitaria para ofrecer:

- ✅ Organización automática de horarios, clases y recordatorios
- ✅ Asistente conversacional tipo IA que planifica tu día
- ✅ Mapa inteligente del campus con rutas y lugares de interés
- ✅ Recomendaciones de comida y bienestar personalizadas
- ✅ Comunidad universitaria para estudiar o socializar
- ✅ Notificaciones inteligentes y compatibilidad con smartwatch

> “No solo te organiza, te entiende.”

---

## Alcance del MVP

El MVP se enfocará en las siguientes funcionalidades principales:

| Módulo                                              | Descripción                                                                                         |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Asistente UniFlow (IA central)**                  | Chat inteligente con flujos guiados (planificación de clases, recordatorios, bienestar).            |
| **Mapa del campus (FindMyClass)**                   | Mapa interactivo con edificios, cafeterías, zonas de estudio y rutas rápidas.                       |
| **Bienestar (MindZone)**                            | Ejercicios de relajación, respiración y registro emocional.                                         |
| **ChillSpot**                                       | Descubre lugares dentro o cerca del campus según tu estado de ánimo o presupuesto.                  |
| **StudyLoop (mini red social + grupos de estudio)** | Publicaciones, encuestas y conexión con compañeros que vean las mismas materias.                    |
| **Perfil inteligente**                              | Información del estudiante, estadísticas básicas y personalización del asistente.                   |
| **Notificaciones inteligentes / smartwatch**        | Alertas contextuales: “Sal ya si no quieres llegar tarde”, “Hora de comer”, “Pausa para descansar”. |

---

## Stack Tecnológico

| Componente         | Tecnología                                                         | Descripción                                                                  |
| ------------------ | ------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| **Frontend móvil** | React Native + Expo                                                | Desarrollo ágil y multiplataforma (Android / iOS).                           |
| **Backend / BaaS** | Supabase                                                           | Backend como servicio con API RESTful, autenticación y almacenamiento.       |
| **Base de datos**  | PostgreSQL (Supabase Database)                                     | Base de datos relacional escalable para usuarios, tareas y datos del campus. |
| **Autenticación**  | Supabase Auth                                                      | Registro y gestión de usuarios con correo institucional o OAuth.             |
| **Chat IA (MVP)**  | Flujos predefinidos, con integración futura a OpenAI o Dialogflow. | Chat con lógica de negocio en el backend.                                    |
| **Diseño UX/UI**   | Figma                                                              | Interfaz minimalista, elegante y fluida.                                     |

---

## Arquitectura General

- **React Native (Frontend)**
  - Supabase Auth → Registro y autenticación de usuarios
  - Supabase Database (PostgreSQL) → Gestión de datos del usuario, mapa, publicaciones y recomendaciones
  - Supabase Storage → Archivos multimedia de perfil o comunidad
  - Supabase Edge Functions → Lógica de negocio y notificaciones inteligentes



## Estilo visual

* **Paleta:** blanco, azul pastel y gris neutro.
* **Tipografía:** Inter / Poppins.
* **Estilo:** moderno, limpio y tecnológico.
* **Inspiración:** Notion, ChatGPT App y Apple Health.

> Minimalista, fluida y con sensación de “asistente premium”.

---

## Público objetivo

* Estudiantes universitarios activos.
* Personas que buscan equilibrio entre estudio, bienestar y vida social.
* Usuarios con nivel tecnológico medio o alto, familiarizados con apps modernas.

---

## Asistente UniFlow (IA)

### Versión MVP:

* Chat con respuestas guiadas y recordatorios automáticos.
* Recomendaciones de horarios, comidas o descanso según datos del usuario.

### Versión futura:

* IA conversacional real que aprenda de hábitos y rutinas.
* Predicciones de tráfico y tiempos de salida hacia clases.
* Integración con clima, smartwatch y calendario académico.

---

## Futuras mejoras

* Integración de **planificador financiero** (derivado de SplitEasy).
* Predicción de tiempo libre para estudio o descanso.
* Gamificación con logros y recompensas.
* Modo offline extendido.
* Sincronización completa entre dispositivos.

---

## 💸 Modelo de Monetización

**UniFlow** adopta un modelo **Freemium** que equilibra accesibilidad y valor agregado.
Esto permite que cualquier estudiante disfrute de las funciones esenciales de la app sin costo, mientras que los usuarios que deseen una experiencia completa pueden acceder a **UniFlow Premium**, una versión más avanzada e inteligente.

---

### 🆓 Versión Gratuita (UniFlow Free)

La versión gratuita ofrece las herramientas esenciales para organizar la vida universitaria de forma práctica y sin barreras.

**Incluye:**

* 📅 Planificador básico de clases y recordatorios.
* 🗺️ Mapa del campus con lugares de interés (FindMyClass).
* 🧠 Acceso limitado al Asistente UniFlow (respuestas predefinidas).
* 🤝 Conexión con grupos de estudio en **StudyLoop**.
* 📊 Estadísticas generales del perfil (tiempo de estudio, descanso, etc.).
* 🔔 Notificaciones básicas y alertas de clase.

**Ideal para:**
Estudiantes que desean mejorar su organización y productividad sin costo.

---

### 💎 Versión Premium (UniFlow Pro)

**UniFlow Premium** lleva la experiencia a otro nivel, integrando inteligencia artificial avanzada, bienestar emocional y automatización completa del día a día universitario.

**Incluye todo lo anterior, más:**

* 🧠 Asistente IA personalizado con recomendaciones adaptadas a hábitos, horarios y estado de ánimo.
* 💬 Recordatorios automáticos inteligentes (“Sal ya si no quieres llegar tarde”, “Hora de comer algo liviano”).
* 🧘‍♂️ Acceso completo a **MindZone+**, con rutinas guiadas de respiración, meditación y seguimiento emocional.
* 📈 Estadísticas detalladas sobre productividad, sueño, estrés y bienestar.
* 🎯 Sistema de logros y gamificación para fomentar hábitos saludables.
* 💬 Priorización en soporte y acceso anticipado a nuevas funciones.
* 🚫 Experiencia sin restricciones ni límites de uso.

**Precio sugerido:**

* $2.99 USD / mes o $19.99 USD / año.
* Incluye prueba gratuita de 7 días para nuevos usuarios.

---

### 💡 ¿Por qué vale la pena pagar UniFlow Premium?

**UniFlow Pro** no es solo una app de organización: es un asistente que *piensa por ti*.
Su IA aprende tus rutinas, entiende tus momentos de estrés y te ayuda a mantener un equilibrio real entre estudio, descanso y vida personal.

**Beneficios clave:**

* Mejora el enfoque y el rendimiento académico.
* Reduce el estrés gracias a las rutinas de bienestar integradas.
* Te ayuda a aprovechar tu tiempo libre de forma inteligente.
* Convierte tu día en una rutina fluida, equilibrada y personalizada.

> “No pagas por más funciones, pagas por más equilibrio.”

---

### 🌍 ¿Por qué vale la pena tener UniFlow?

Porque combina todo lo que un estudiante necesita en un solo lugar: organización, bienestar, conexión y asistencia.
Mientras otras apps solo te ayudan a estudiar o relajarte, **UniFlow entiende que ser estudiante es más que eso**: es aprender a vivir de forma inteligente.

> “UniFlow te organiza, te cuida y te conecta. Todo en un solo asistente.”

---

## 📚 Documentación

Toda la documentación del proyecto se encontrará en el **GitHub Wiki**, incluyendo:

* Historias de usuario
* Requisitos funcionales y técnicos
* Diagramas de arquitectura
* Riesgos y estrategias de mitigación
* Prototipo UX/UI en Figma

---

## 👤 Autor

**Juan David González Rubio**
Ingeniería Informática – Universidad de La Sabana
2025
Proyecto – Third Term Project

---

## 🧩 Licencia

Proyecto de uso académico.
© 2025 – Todos los derechos reservados a sus autores.

---
