// Edge Function: upload-kiosk-photo
// Purpose: Securely upload attendance photos AND insert records for PIN-based kiosk mode
// Validates PIN before accepting photo upload and inserting attendance record
// Uses service_role to bypass RLS policies

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// Datos del registro de asistencia
interface RecordData {
  empleado: string;
  cedula: string;
  fecha: string; // YYYY-MM-DD
  hora_inicio_decimal: number | null;
  hora_fin_decimal: number | null;
  observaciones: string | null;
  latitud: number | null;
  longitud: number | null;
  tipo_marcaje: string; // 'clock_in' | 'clock_out'
  timestamp_local: number;
  tenant_id: string;
}

interface UploadRequest {
  pin: string;
  // Una de las dos debe venir:
  //   photoBase64 → primer intento; sube la foto al Storage y la usa para el INSERT.
  //   photoUrl    → retry; la foto ya fue subida en un intento previo, solo hay
  //                 que (re)hacer el INSERT. Evita re-uploads duplicados cuando
  //                 el INSERT falla pero la foto ya subio.
  photoBase64?: string;
  photoUrl?: string;
  userId: string;
  recordId: string;
  // Datos completos para INSERT
  recordData?: RecordData;
  // Tenant del kiosko. Opcional por compatibilidad; cuando llega se usa para
  // scopear el lookup del PIN y evitar colisiones cross-tenant (4 dígitos →
  // probabilidad real de colisión con múltiples tenants).
  tenantId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get request body
    const {
      pin,
      photoBase64,
      photoUrl: existingPhotoUrl,
      userId,
      recordId,
      recordData,
      tenantId: requestTenantId,
    }: UploadRequest = await req.json();

    // Validate required fields
    if (!pin || !userId || !recordId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: pin, userId, recordId' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Tiene que venir la foto en alguna de las dos formas.
    if (!photoBase64 && !existingPhotoUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing photo: provide either photoBase64 or photoUrl' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate PIN format (4 digits)
    if (!/^\d{4}$/.test(pin)) {
      return new Response(
        JSON.stringify({ error: 'Invalid PIN format. Must be 4 digits.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Step 1: Validate PIN against profiles table.
    // Si llega tenantId en la request, scopear el lookup para evitar colisiones
    // de PIN de 4 dígitos entre tenants. Cuando todos los clientes mobile
    // empiecen a enviar tenantId, hacer este campo obligatorio.
    let profileQuery = supabaseAdmin
      .from('profiles')
      .select('user_id, cedula, nombre, apellido, activo, tenant_id')
      .eq('pin_code', pin)
      .eq('activo', true);

    if (requestTenantId) {
      profileQuery = profileQuery.eq('tenant_id', requestTenantId);
    }

    const { data: profile, error: profileError } = await profileQuery.single();

    if (profileError || !profile) {
      console.error('[upload-kiosk-photo] PIN validation failed:', profileError);
      return new Response(
        JSON.stringify({ error: 'Invalid PIN or inactive user' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Step 2: Verify userId matches the profile
    if (profile.user_id !== userId) {
      console.error('[upload-kiosk-photo] User ID mismatch');
      return new Response(
        JSON.stringify({ error: 'User ID does not match PIN' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Step 2b: Si llegan recordData, verificar que la cédula que se va a
    // registrar coincida con el dueño del PIN. Sin esto, un atacante con
    // un PIN propio válido podría inyectar marcajes para otro empleado.
    if (recordData && recordData.cedula && recordData.cedula !== profile.cedula) {
      console.error('[upload-kiosk-photo] Cedula mismatch with PIN owner');
      return new Response(
        JSON.stringify({ error: 'Cedula does not match PIN owner' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[upload-kiosk-photo] PIN validated for user: ${profile.nombre}`);

    // Step 3-7: obtener photoUrl.
    // Caso 1 (primer intento): viene photoBase64 → subir foto al Storage.
    // Caso 2 (retry post-fallo de INSERT): viene photoUrl ya guardada → skip upload.
    let photoUrl: string;

    if (photoBase64) {
      // Process photo (remove data URI prefix if exists)
      const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, '');

      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `${userId}/${timestamp}_${recordId}.jpg`;

      // Convert base64 to Uint8Array
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Upload to Supabase Storage (using service role - bypasses RLS)
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('attendance_photos')
        .upload(fileName, bytes, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        console.error('[upload-kiosk-photo] Upload error:', uploadError);
        return new Response(
          JSON.stringify({ error: 'Failed to upload photo', details: uploadError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from('attendance_photos')
        .getPublicUrl(uploadData.path);

      photoUrl = urlData.publicUrl;
      console.log(`[upload-kiosk-photo] Photo uploaded successfully: ${photoUrl}`);
    } else {
      // Retry: reusar la photoUrl que el cliente persistio de un intento previo.
      // La validacion de existencia al top garantiza que existingPhotoUrl no es undefined aca.
      photoUrl = existingPhotoUrl as string;
      console.log(`[upload-kiosk-photo] Reusing existing photo URL (retry): ${photoUrl}`);
    }

    // Step 8: Insert attendance record if recordData is provided
    let insertSuccess = false;
    if (recordData) {
      console.log('[upload-kiosk-photo] Inserting attendance record...');

      // Usar tenant_id del perfil si no viene en recordData (por seguridad)
      const tenantId = profile.tenant_id || recordData.tenant_id;

      if (!tenantId) {
        console.error('[upload-kiosk-photo] No tenant_id available');
        return new Response(
          JSON.stringify({ 
            error: 'No tenant_id available',
            photoUrl, // Devolver URL de foto aunque falle el INSERT
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Verificar si el registro ya existe (por timestamp_local). Scopear por
      // tenant_id porque service_role bypassea RLS: dos tenants con misma
      // cedula podrían colisionar en este dedup sin el filtro explícito.
      const { data: existingRecords, error: selectError } = await supabaseAdmin
        .from('horarios_registros_diarios')
        .select('id')
        .eq('cedula', recordData.cedula)
        .eq('tenant_id', tenantId)
        .eq('fecha', recordData.fecha)
        .eq('timestamp_local', recordData.timestamp_local)
        .limit(1);

      if (selectError) {
        console.error('[upload-kiosk-photo] Select error:', selectError);
      }

      const insertData = {
        empleado: recordData.empleado,
        cedula: recordData.cedula,
        fecha: recordData.fecha,
        hora_inicio_decimal: recordData.hora_inicio_decimal,
        hora_fin_decimal: recordData.hora_fin_decimal,
        foto_url: photoUrl,
        observaciones: recordData.observaciones,
        latitud: recordData.latitud,
        longitud: recordData.longitud,
        tipo_marcaje: recordData.tipo_marcaje,
        timestamp_local: recordData.timestamp_local,
        fuente: 'mobile',
        timestamp_procesamiento: new Date().toISOString(),
        tenant_id: tenantId,
      };

      if (existingRecords && existingRecords.length > 0) {
        // El registro ya existe, actualizar
        const existingId = existingRecords[0].id;
        const { error: updateError } = await supabaseAdmin
          .from('horarios_registros_diarios')
          .update(insertData)
          .eq('id', existingId);

        if (updateError) {
          console.error('[upload-kiosk-photo] Update error:', updateError);
        } else {
          console.log('[upload-kiosk-photo] Record updated successfully (re-sync)');
          insertSuccess = true;
        }
      } else {
        // Guard preventivo: si es clock_in, validar que no haya jornada abierta.
        // Espeja al guard del flujo normal mobile + admin + constraint DB. Acá lo
        // pedimos antes para devolver respuesta estructurada con datos de la
        // jornada existente, en lugar de que el cliente reciba un check_violation
        // crudo de Postgres.
        if (recordData.tipo_marcaje === 'clock_in') {
          const { data: jornadaAbierta } = await supabaseAdmin
            .from('vista_jornadas_abiertas')
            .select('fecha, hora_inicio_decimal, horas_abierta')
            .eq('cedula', recordData.cedula)
            .eq('tenant_id', tenantId)
            .order('horas_abierta', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (jornadaAbierta) {
            console.log('[upload-kiosk-photo] Open journey detected, rejecting clock_in');
            return new Response(
              JSON.stringify({
                code: 'OPEN_JOURNEY',
                error: 'El empleado ya tiene una jornada abierta sin cerrar',
                fecha: jornadaAbierta.fecha,
                hora_inicio_decimal: jornadaAbierta.hora_inicio_decimal,
                horas_abierta: jornadaAbierta.horas_abierta,
                photoUrl, // devolvemos URL aunque rechacemos el insert
              }),
              {
                status: 409,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }
        }

        // Insertar nuevo registro
        const { error: insertError } = await supabaseAdmin
          .from('horarios_registros_diarios')
          .insert(insertData);

        if (insertError) {
          // Error 23505 = duplicate key, significa que el registro ya existe
          if (insertError.code === '23505') {
            console.log('[upload-kiosk-photo] Record already exists (duplicate)');
            insertSuccess = true;
          } else if (
            insertError.code === '23514' &&
            insertError.details === 'OPEN_JOURNEY_EXISTS'
          ) {
            // Race condition: el guard preventivo no detectó, pero el constraint DB
            // sí. Re-consultamos la vista para devolver el mismo shape que el guard
            // preventivo — así el cliente no tiene que manejar dos formas distintas.
            console.log('[upload-kiosk-photo] Constraint rejected (race condition)');
            const { data: jornadaAbierta } = await supabaseAdmin
              .from('vista_jornadas_abiertas')
              .select('fecha, hora_inicio_decimal, horas_abierta')
              .eq('cedula', recordData.cedula)
              .eq('tenant_id', tenantId)
              .order('horas_abierta', { ascending: false })
              .limit(1)
              .maybeSingle();

            return new Response(
              JSON.stringify({
                code: 'OPEN_JOURNEY',
                error: 'El empleado ya tiene una jornada abierta sin cerrar',
                fecha: jornadaAbierta?.fecha ?? null,
                hora_inicio_decimal: jornadaAbierta?.hora_inicio_decimal ?? null,
                horas_abierta: jornadaAbierta?.horas_abierta ?? null,
                photoUrl,
              }),
              {
                status: 409,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          } else {
            console.error('[upload-kiosk-photo] Insert error:', insertError);
          }
        } else {
          console.log('[upload-kiosk-photo] Record inserted successfully');
          insertSuccess = true;
        }
      }
    }

    // Step 9: Return success response
    return new Response(
      JSON.stringify({
        success: true,
        photoUrl,
        userId: profile.user_id,
        userName: `${profile.nombre}${profile.apellido ? ' ' + profile.apellido : ''}`,
        recordInserted: recordData ? insertSuccess : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[upload-kiosk-photo] Unexpected error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
