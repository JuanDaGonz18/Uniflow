# Wheels – Transporte Universitario Seguro

## Descripción general

**Wheels** es una aplicación móvil tipo “Uber universitario” diseñada exclusivamente para los estudiantes de la **Universidad de La Sabana**.  
El objetivo del proyecto es ofrecer una alternativa **segura, privada y organizada** al actual sistema de transporte compartido que funciona de manera informal a través de grupos de WhatsApp.

Con Wheels, los usuarios podrán **ofrecer o solicitar viajes** dentro de una comunidad verificada, garantizando confianza, orden y eficiencia.  

---

## Objetivo

Desarrollar un **MVP funcional** (Minimum Viable Product) de una aplicación móvil que permita a los estudiantes de La Sabana coordinar viajes de manera rápida y confiable, utilizando autenticación institucional y una interfaz elegante e intuitiva.

---

## Problema detectado

Actualmente, el transporte compartido entre estudiantes se coordina por grupos de WhatsApp:
- Existen demasiados grupos, poco organizados y llenos de mensajes irrelevantes.
- Se publican más anuncios o ventas que ofertas reales de transporte.
- No hay forma de verificar quién realmente pertenece a la universidad.
- El exceso de ruido y la falta de estructura hacen que la herramienta sea poco útil.

---

##  Propuesta de valor

**Wheels** ofrece una solución digital que centraliza y regula este proceso:

✅ Autenticación con correo institucional (`@unisabana.edu.co`)  
✅ Publicación clara de viajes (ofrecer o buscar ride)  
✅ Comunicación interna sin depender de WhatsApp  
✅ Notificaciones automáticas sobre coincidencias y respuestas  
✅ Experiencia fluida, segura y diseñada con elegancia

> “Tu viaje seguro con gente Sabana.”

---

## Alcance del MVP

El MVP se centrará en las siguientes funcionalidades principales:

| Módulo | Descripción |
|--------|--------------|
| **Autenticación universitaria** | Registro mediante correo institucional y validación vía Firebase. |
| **Perfiles de usuario** | Datos básicos: nombre, foto, carrera, tipo de usuario (conductor/pasajero). |
| **Publicar o buscar viajes** | Crear publicaciones con origen, destino, fecha, hora y cupos. |
| **Listado de viajes disponibles** | Vista de todas las ofertas o solicitudes filtradas. |
| **Solicitudes y chat interno** | Comunicación entre usuarios dentro de la app. |
| **Notificaciones push** | Alertas cuando alguien acepta o crea un viaje. |
| **Asistente virtual (versión MVP)** | Chatbot simple que guía al usuario (“¿Quieres ofrecer o buscar ride?”). |

---

## Stack Tecnológico

| Componente | Tecnología | Descripción |
|-------------|-------------|--------------|
| **Frontend móvil** | React Native + Expo | Desarrollo rápido y multiplataforma (Android / iOS). |
| **Backend / BaaS** | Firebase | Manejo de autenticación, base de datos y notificaciones. |
| **Base de datos** | Cloud Firestore | Gestión en tiempo real de usuarios, viajes y chats. |
| **Autenticación** | Firebase Auth | Verificación mediante correo institucional. |
| **Chatbot** | Flujo predefinido con opción a IA (Dialogflow / GPT API futura). |
| **Diseño UX/UI** | Figma | Interfaz elegante, minimalista y funcional. |

---

## Arquitectura General

React Native (Frontend)
│
▼
Firebase Auth → Autenticación institucional
Cloud Firestore → Datos de usuarios, viajes y mensajes
Cloud Messaging → Notificaciones push
Storage (opcional) → Fotos de perfil

---

## Estilo visual

- **Paleta:** tonos neutros, azules suaves y blancos elegantes.  
- **Tipografía:** moderna y legible (Poppins / Inter).  
- **Diseño:** minimalista, con enfoque en claridad, jerarquía y sensación premium.

> Inspiración: apps como Uber, Bolt y Airbnb por su simplicidad y confianza visual.

---

## Público objetivo

- Estudiantes activos de la **Universidad de La Sabana**.
- Personas que viajan regularmente desde y hacia el campus.
- Usuarios con nivel tecnológico medio (acostumbrados a apps móviles y redes sociales).

---

## Asistente Virtual

Una funcionalidad experimental para mejorar la experiencia de usuario.

### Versión MVP:
- Chat interactivo con opciones guiadas (“Ofrecer ride” / “Buscar ride”).
- Asistente con mensajes contextuales según uso.

### Versión futura:
- Integración con IA conversacional (ChatGPT API o Dialogflow).
- Recomendaciones personalizadas basadas en patrones de viaje.

---

## Futuras mejoras

- Geolocalización y mapa de rutas en tiempo real.
- Sistema de calificaciones y reseñas.
- Filtros avanzados por horarios, zonas y precio.
- Integración con IA para predicción de demanda de rides.
- Implementación de roles (conductor/pasajero) más sofisticada.

---

## 📚 Documentación

Toda la documentación detallada del proyecto se encontrará en el **GitHub Wiki**, incluyendo:

- Historias de usuario  
- Requisitos técnicos  
- Diseño de arquitectura  
- Riesgos y mitigación  
- Capturas y flujos de navegación  

---

## 👤 Autores

**Juan David González Rubio**  
Ingeniería Informática – Universidad de La Sabana  
2025  
Proyecto – Third Term Project

---

## 🧩 Licencia

Este proyecto es de uso académico.  
© 2025 – Todos los derechos reservados a sus autores.
