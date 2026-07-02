package expo.modules.liveordernotification

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.Icon
import android.os.Build
import androidx.annotation.RequiresApi
import androidx.core.app.NotificationCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class LiveOrderNotificationModule : Module() {

    companion object {
        private const val CHANNEL_ID   = "live_order_tracking"
        private const val CHANNEL_NAME = "Seguimiento de pedidos"
        private const val NOTIF_BASE   = 9_000

        // Colores brand
        private val COLOR_DONE    = Color.parseColor("#FF8700")  // naranja
        private val COLOR_PENDING = Color.parseColor("#CCCCCC")  // gris

        // Íconos custom por etapa del delivery
        private val STEP_ICONS = listOf(
            R.drawable.ic_step_restaurant, // Pendiente  → restaurante
            R.drawable.ic_step_cocina,     // En cocina  → chef/olla
            R.drawable.ic_step_en_ruta,    // En camino  → moto
            R.drawable.ic_step_entregado,  // Entregado  → casa
        )
    }

    override fun definition() = ModuleDefinition {
        Name("LiveOrderNotification")

        Function("show")   { options: Map<String, Any> -> post(options) }
        Function("update") { options: Map<String, Any> -> post(options) }

        Function("dismiss") { orderId: Int ->
            val ctx = appContext.reactContext ?: return@Function
            notificationManager(ctx).cancel(NOTIF_BASE + orderId)
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    private fun post(options: Map<String, Any>) {
        val ctx = appContext.reactContext ?: return

        val orderId           = (options["orderId"]    as? Double)?.toInt() ?: return
        val step              = (options["step"]       as? Double)?.toInt() ?: 0
        val totalSteps        = (options["totalSteps"] as? Double)?.toInt() ?: 4
        val title             = options["title"]            as? String ?: "Tu pedido"
        val message           = options["message"]          as? String ?: ""
        val status            = options["status"]           as? String ?: "pendiente"
        val eta               = options["eta"]              as? String  // ej: "12:18 PM"
        val repartidorNombre  = options["repartidorNombre"] as? String
        val repartidorTelefono = options["repartidorTelefono"] as? String

        val isTerminal = status == "entregado" || status == "cancelado"
        val notifId    = NOTIF_BASE + orderId

        ensureChannel(ctx)

        if (Build.VERSION.SDK_INT >= 36) {
            postProgressStyle(ctx, notifId, orderId, title, message, step, totalSteps,
                isTerminal, eta, repartidorNombre, repartidorTelefono)
        } else {
            postClassicProgress(ctx, notifId, orderId, title, message, step, totalSteps,
                isTerminal, eta, repartidorNombre, repartidorTelefono)
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Android 16+ — Notification.ProgressStyle con íconos, segmentos y acciones
    // ─────────────────────────────────────────────────────────────────────────
    @RequiresApi(36)
    private fun postProgressStyle(
        ctx: Context,
        notifId: Int,
        orderId: Int,
        title: String,
        message: String,
        step: Int,
        totalSteps: Int,
        isTerminal: Boolean,
        eta: String?,
        repartidorNombre: String?,
        repartidorTelefono: String?,
    ) {
        val maxIdx = (totalSteps - 1).coerceAtLeast(1)

        val progressStyle = Notification.ProgressStyle().apply {
            setProgress(step.toFloat() / maxIdx)

            // Nodos: naranja si ya se pasaron, gris si son futuros
            val points = (0 until totalSteps).map { i ->
                Notification.ProgressStyle.Point(i.toFloat() / maxIdx).apply {
                    setColor(if (i <= step) COLOR_DONE else COLOR_PENDING)
                }
            }
            setProgressPoints(points)

            // Segmentos entre nodos coloreados
            val segments = (0 until totalSteps - 1).map { i ->
                Notification.ProgressStyle.Segment(1f / maxIdx).apply {
                    setColor(if (i < step) COLOR_DONE else COLOR_PENDING)
                }
            }
            setProgressSegments(segments)

            // Ícono que viaja sobre la barra (la moto)
            setProgressTrackerIcon(
                Icon.createWithResource(ctx, R.drawable.ic_tracker_moto)
            )
        }

        // Texto enriquecido según el estado
        val bodyLines = buildBodyText(message, eta, repartidorNombre)

        val builder = Notification.Builder(ctx, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_step_en_ruta)
            .setLargeIcon(Icon.createWithResource(ctx, STEP_ICONS[step.coerceIn(0, STEP_ICONS.lastIndex)]))
            .setContentTitle(title)
            .setContentText(bodyLines)
            .setStyle(progressStyle)
            .setOngoing(!isTerminal)
            .setAutoCancel(isTerminal)
            .setCategory(Notification.CATEGORY_STATUS)
            .setColor(COLOR_DONE)
            // Abre la app al tocar la notificación
            .setContentIntent(buildOpenAppIntent(ctx, orderId))

        // Acción: Seguir Pedido
        builder.addAction(
            Notification.Action.Builder(
                Icon.createWithResource(ctx, R.drawable.ic_step_en_ruta),
                "Seguir Pedido →",
                buildOpenAppIntent(ctx, orderId)
            ).build()
        )

        // Acción: Llamar al repartidor (solo si hay teléfono y está en camino)
        if (!repartidorTelefono.isNullOrBlank() && !repartidorNombre.isNullOrBlank()) {
            builder.addAction(
                Notification.Action.Builder(
                    Icon.createWithResource(ctx, R.drawable.ic_step_entregado),
                    "Llamar a $repartidorNombre",
                    buildCallIntent(ctx, repartidorTelefono)
                ).build()
            )
        }

        notificationManager(ctx).notify(notifId, builder.build())
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Android < 16 — NotificationCompat clásico con acciones
    // ─────────────────────────────────────────────────────────────────────────
    private fun postClassicProgress(
        ctx: Context,
        notifId: Int,
        orderId: Int,
        title: String,
        message: String,
        step: Int,
        totalSteps: Int,
        isTerminal: Boolean,
        eta: String?,
        repartidorNombre: String?,
        repartidorTelefono: String?,
    ) {
        val bodyLines = buildBodyText(message, eta, repartidorNombre)

        val builder = NotificationCompat.Builder(ctx, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_step_en_ruta)
            .setLargeIcon(android.graphics.BitmapFactory.decodeResource(
                ctx.resources, STEP_ICONS[step.coerceIn(0, STEP_ICONS.lastIndex)]))
            .setContentTitle(title)
            .setContentText(bodyLines)
            .setProgress(if (isTerminal) 0 else totalSteps, step, false)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(!isTerminal)
            .setAutoCancel(isTerminal)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setColor(COLOR_DONE)
            .setContentIntent(buildOpenAppIntentCompat(ctx, orderId))
            .addAction(R.drawable.ic_step_en_ruta, "Seguir Pedido →",
                buildOpenAppIntentCompat(ctx, orderId))

        if (!repartidorTelefono.isNullOrBlank() && !repartidorNombre.isNullOrBlank()) {
            builder.addAction(R.drawable.ic_step_entregado,
                "Llamar a $repartidorNombre",
                buildCallIntentCompat(ctx, repartidorTelefono))
        }

        notificationManager(ctx).notify(notifId, builder.build())
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private fun buildBodyText(message: String, eta: String?, repartidorNombre: String?): String {
        val parts = mutableListOf(message)
        if (!eta.isNullOrBlank())              parts.add("Llegada estimada: $eta")
        if (!repartidorNombre.isNullOrBlank()) parts.add("$repartidorNombre está cerca de tu dirección")
        return parts.joinToString(" • ")
    }

    /** Intent para abrir la pantalla de tracking dentro de la app */
    @RequiresApi(Build.VERSION_CODES.M)
    private fun buildOpenAppIntent(ctx: Context, orderId: Int): PendingIntent {
        val intent = ctx.packageManager
            .getLaunchIntentForPackage(ctx.packageName)
            ?.apply { putExtra("order_id", orderId) }
            ?: Intent()
        return PendingIntent.getActivity(
            ctx, orderId, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun buildOpenAppIntentCompat(ctx: Context, orderId: Int): PendingIntent {
        val intent = ctx.packageManager
            .getLaunchIntentForPackage(ctx.packageName)
            ?.apply { putExtra("order_id", orderId) }
            ?: Intent()
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        else PendingIntent.FLAG_UPDATE_CURRENT
        return PendingIntent.getActivity(ctx, orderId, intent, flags)
    }

    @RequiresApi(Build.VERSION_CODES.M)
    private fun buildCallIntent(ctx: Context, phone: String): PendingIntent {
        val intent = Intent(Intent.ACTION_DIAL,
            android.net.Uri.parse("tel:$phone"))
        return PendingIntent.getActivity(
            ctx, phone.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun buildCallIntentCompat(ctx: Context, phone: String): PendingIntent {
        val intent = Intent(Intent.ACTION_DIAL,
            android.net.Uri.parse("tel:$phone"))
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        else PendingIntent.FLAG_UPDATE_CURRENT
        return PendingIntent.getActivity(ctx, phone.hashCode(), intent, flags)
    }

    private fun ensureChannel(ctx: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = notificationManager(ctx)
        if (nm.getNotificationChannel(CHANNEL_ID) != null) return
        val channel = NotificationChannel(
            CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Actualizaciones en tiempo real del estado de tu pedido"
            setShowBadge(false)
        }
        nm.createNotificationChannel(channel)
    }

    private fun notificationManager(ctx: Context) =
        ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
}
