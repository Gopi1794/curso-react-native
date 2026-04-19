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
