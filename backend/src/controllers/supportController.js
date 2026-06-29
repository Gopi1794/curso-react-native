const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Sos el asistente virtual de soporte de "Tu App Food", una app de delivery de comida. Tu rol es ayudar a los usuarios con sus dudas y problemas de forma amable, clara y concisa.

Podés ayudar con:
- Estado y seguimiento de pedidos
- Cancelaciones (solo si el pedido está en estado "pendiente")
- Métodos de pago y facturación
- Problemas con la cuenta (contraseña, perfil, direcciones)
- Reclamos por pedidos incompletos o incorrectos
- Navegación y uso de la app

Reglas importantes:
- Respondé siempre en español rioplatense (voseo)
- Sé breve y directo — máximo 3-4 oraciones por respuesta
- Si el problema requiere acción humana (reembolso, reclamo formal, pedido incorrecto), decile que escriba a soporte@tuappfood.com
- No inventes información sobre pedidos específicos — no tenés acceso al historial real del usuario
- No respondas preguntas que no tengan relación con la app o el servicio de delivery
- Si el usuario saluda, saludá brevemente y preguntale en qué podés ayudarlo`;

exports.chat = async (req, res) => {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ success: false, message: 'messages es requerido' });
    }

    // Validar estructura de mensajes
    const valid = messages.every(m =>
        (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
    );
    if (!valid) {
        return res.status(400).json({ success: false, message: 'Formato de mensajes inválido' });
    }

    // Limitar historial a los últimos 20 mensajes para controlar tokens
    const history = messages.slice(-20);

    try {
        const response = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 512,
            system: SYSTEM_PROMPT,
            messages: history,
        });

        const reply = response.content[0]?.text ?? '';
        res.json({ success: true, reply });
    } catch (error) {
        console.error('Error en supportController.chat:', error.message);
        res.status(500).json({ success: false, message: 'No se pudo procesar tu consulta. Intentá de nuevo.' });
    }
};
