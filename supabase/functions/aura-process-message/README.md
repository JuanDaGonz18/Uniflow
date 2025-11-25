# AURA Process Message Function

Esta función de Supabase Edge Functions procesa los mensajes del usuario y genera respuestas inteligentes usando Google Gemini AI.

## 🚀 Despliegue

1. **Instala Supabase CLI** (si no lo tienes):
   ```bash
   npm install -g supabase
   ```

2. **Inicia sesión en Supabase**:
   ```bash
   supabase login
   ```

3. **Vincula tu proyecto**:
   ```bash
   supabase link --project-ref tu-project-ref
   ```

4. **Configura las variables de entorno**:
   Asegúrate de tener estas variables en tu proyecto de Supabase:
   - `GEMINI_API_KEY`: Tu API key de Google Gemini
   - `SUPABASE_URL`: URL de tu proyecto (ya configurada)
   - `SUPABASE_SERVICE_ROLE_KEY`: Service role key (ya configurada)

5. **Despliega la función**:
   ```bash
   supabase functions deploy aura-process-message
   ```

## 📋 Requisitos de Base de Datos

Asegúrate de tener estas tablas en Supabase:

### Tabla `tareas`
```sql
CREATE TABLE IF NOT EXISTS tareas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  fecha_limite DATE,
  completada BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabla `reservas`
```sql
CREATE TABLE IF NOT EXISTS reservas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  sala_nombre TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabla `recordatorios`
```sql
CREATE TABLE IF NOT EXISTS recordatorios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  fecha DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🎯 Funcionalidades

- ✅ Consulta de tareas pendientes
- ✅ Consulta de reservas próximas
- ✅ Creación de recordatorios
- ✅ Conversación natural con IA
- ✅ Contexto personalizado del usuario

## 🔧 Desarrollo Local

Para probar localmente:

```bash
supabase functions serve aura-process-message
```

