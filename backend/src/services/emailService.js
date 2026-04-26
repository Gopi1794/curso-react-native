const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Verificar conexión al iniciar
transporter.verify()
    .then(() => console.log('✅ Servidor de email conectado'))
    .catch(err => console.warn('⚠️  Email no disponible:', err.message));

/**
 * Enviar email de verificación con código de 6 dígitos
 */
exports.sendVerificationEmail = async (email, nombre, code) => {
    const mailOptions = {
        from: process.env.SMTP_FROM,
        to: email,
        subject: `${code} — Verificá tu cuenta en Tu App Food`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(135deg,#ff8800,#ff5500);padding:24px;text-align:center;">
        <img src="https://bbavirgboqyvqhxvuarp.supabase.co/storage/v1/object/public/bucketFoodApp/branding/logoApp.png" alt="Tu App Food" width="60" height="60" style="display:block;margin:0 auto 8px;" />
        <h1 style="color:white;margin:0;font-size:22px;">Tu App Food</h1>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:32px;">
        <p style="font-size:16px;color:#333;margin:0 0 16px;">Hola <strong>${nombre}</strong>,</p>
        <p style="font-size:16px;color:#333;margin:0 0 24px;">Ingresá este código en la app para verificar tu cuenta:</p>

        <div style="background:#f8f8f8;border-radius:8px;padding:20px;text-align:center;margin:0 0 24px;">
          <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#ff8800;">${code}</span>
        </div>

        <p style="font-size:14px;color:#666;margin:0 0 8px;">El código expira en <strong>15 minutos</strong>.</p>
        <p style="font-size:14px;color:#666;margin:0;">Si no creaste esta cuenta, ignorá este email.</p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding:16px 32px;background:#fafafa;text-align:center;border-top:1px solid #eee;">
        <p style="font-size:12px;color:#999;margin:0;">Tu App Food — Delivery de comida</p>
      </td>
    </tr>
  </table>
</body>
</html>`,
    };

    return transporter.sendMail(mailOptions);
};

/**
 * Reenviar email de verificación
 */
exports.resendVerificationEmail = exports.sendVerificationEmail;

/**
 * Enviar email de recuperación de contraseña
 */
exports.sendPasswordResetEmail = async (email, nombre, code) => {
    const digits = code.split('').map(d =>
        `<td style="padding:0 4px;">
           <div style="width:40px;height:52px;background:#ffffff;border:2px solid #EA580C;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-size:26px;font-weight:700;color:#EA580C;text-align:center;line-height:52px;">${d}</div>
         </td>`
    ).join('');

    const mailOptions = {
        from: process.env.SMTP_FROM,
        to: email,
        subject: `${code} — Recuperá tu contraseña en Tu App Food`,
        html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#1a0500;font-family:'Segoe UI',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(234,88,12,0.25);">

          <!-- Header degradado -->
          <tr>
            <td style="background:linear-gradient(135deg,#EA580C 0%,#F97316 100%);padding:32px 24px;text-align:center;">
              <img src="https://bbavirgboqyvqhxvuarp.supabase.co/storage/v1/object/public/bucketFoodApp/branding/logoApp.png"
                   alt="Tu App Food" width="64" height="64"
                   style="display:block;margin:0 auto 12px;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.2);" />
              <h1 style="color:#ffffff;margin:0 0 4px;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Tu App Food</h1>
              <p style="color:rgba(255,255,255,0.85);margin:0;font-size:14px;">Recuperación de contraseña</p>
            </td>
          </tr>

          <!-- Cuerpo -->
          <tr>
            <td style="padding:36px 32px 28px;">

              <!-- Saludo -->
              <p style="font-size:17px;color:#1a1a1a;margin:0 0 6px;font-weight:600;">Hola, ${nombre} 👋</p>
              <p style="font-size:15px;color:#555;margin:0 0 28px;line-height:1.6;">
                Recibimos una solicitud para restablecer tu contraseña.<br>
                Ingresá este código en la app:
              </p>

              <!-- Código dígito a dígito -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
                <tr>${digits}</tr>
              </table>
              <p style="text-align:center;font-size:12px;color:#aaa;margin:8px 0 28px;">Un dígito por casilla</p>

              <!-- Expiry banner -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#FFF7ED;border-left:4px solid #EA580C;border-radius:6px;padding:12px 16px;">
                    <p style="margin:0;font-size:13px;color:#92400E;">
                      ⏱ &nbsp;Este código expira en <strong>15 minutos</strong>.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Aviso seguridad -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#f9f9f9;border-radius:8px;padding:14px 16px;">
                    <p style="margin:0;font-size:13px;color:#888;line-height:1.6;">
                      🔒 &nbsp;Si <strong>no solicitaste</strong> este cambio, ignorá este email.<br>
                      Tu contraseña actual sigue siendo válida y tu cuenta está segura.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#fafafa;border-top:1px solid #f0f0f0;padding:18px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#bbb;">
                Tu App Food &mdash; Delivery de comida &bull; No respondas este email
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>

</body>
</html>`,
    };

    return transporter.sendMail(mailOptions);
};
