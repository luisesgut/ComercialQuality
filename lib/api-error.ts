// Clasificador de errores de API para feedback contextual al usuario

export type ApiErrorType = "network" | "not_found" | "validation" | "server" | "unknown";

export interface ClassifiedError {
  type: ApiErrorType;
  /** Mensaje legible para mostrar al usuario */
  message: string;
  /** Sugerencia de acción para el usuario */
  hint: string;
}

/**
 * Clasifica un error de fetch en categorías significativas para el usuario.
 * @param err  El error capturado en el catch
 * @param status  El HTTP status code de la respuesta (si se tiene)
 * @param context  Contexto opcional para personalizar el mensaje (ej. "trazabilidad 604025...")
 */
export function classifyApiError(
  err: unknown,
  status?: number,
  context?: string
): ClassifiedError {
  const ctx = context ? ` (${context})` : "";

  // 1. Error de red: el fetch no llegó al servidor
  if (
    err instanceof TypeError &&
    (err.message.toLowerCase().includes("fetch") ||
      err.message.toLowerCase().includes("network") ||
      err.message.toLowerCase().includes("failed"))
  ) {
    return {
      type: "network",
      message: "Sin conexión al servidor.",
      hint: "Verifique que está conectado a la red local (WiFi). Si el problema persiste, avise al área de TI.",
    };
  }

  // 2. No encontrado (404)
  if (status === 404) {
    return {
      type: "not_found",
      message: `Registro no encontrado${ctx}.`,
      hint: "Verifique que el código o datos ingresados sean correctos e intente nuevamente.",
    };
  }

  // 3. Error de validación del cliente (400, 422, etc.)
  if (status !== undefined && status >= 400 && status < 500) {
    return {
      type: "validation",
      message: `Datos inválidos${ctx} (error ${status}).`,
      hint: "Revise los campos ingresados y vuelva a intentarlo.",
    };
  }

  // 4. Error del servidor (500+)
  if (status !== undefined && status >= 500) {
    return {
      type: "server",
      message: `El servidor no pudo procesar la solicitud (error ${status}).`,
      hint: "Espere unos momentos y vuelva a intentarlo. Si persiste, notifique a soporte técnico.",
    };
  }

  // 5. Error desconocido / lanzado manualmente con mensaje
  const rawMessage = err instanceof Error ? err.message : String(err);
  return {
    type: "unknown",
    message: rawMessage || "Ocurrió un error inesperado.",
    hint: "Intente nuevamente. Si el problema persiste, contacte a soporte.",
  };
}

/**
 * Wrapper de fetch que clasifica automáticamente los errores.
 * Lanza un ClassifiedError en caso de falla.
 */
export async function apiFetch(
  url: string,
  options?: RequestInit,
  context?: string
): Promise<Response> {
  let response: Response;

  try {
    response = await fetch(url, options);
  } catch (err) {
    throw classifyApiError(err, undefined, context);
  }

  if (!response.ok) {
    throw classifyApiError(
      new Error(`HTTP ${response.status}`),
      response.status,
      context
    );
  }

  return response;
}

/** Formatea un ClassifiedError como string para mostrar en la UI */
export function formatApiError(err: ClassifiedError): string {
  return `${err.message} ${err.hint}`;
}
