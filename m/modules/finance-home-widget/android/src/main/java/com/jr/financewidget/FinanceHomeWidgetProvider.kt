package com.jr.financewidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import android.widget.RemoteViews
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** No credentials or ledger data are stored here; the app supplies a server-confirmed summary. */
class FinanceHomeWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    super.onUpdate(context, manager, ids)
    renderAll(context)
  }

  companion object {
    private const val PREFS = "finance_home_widget_v1"
    private const val MAX_AGE_MS = 2 * 60 * 60 * 1000L

    fun prefs(context: Context): SharedPreferences =
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun renderAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, FinanceHomeWidgetProvider::class.java))
      if (ids.isEmpty()) return
      val prefs = prefs(context)
      val hasOwner = !prefs.getString("owner", null).isNullOrBlank()
      val updatedAt = prefs.getLong("updatedAt", 0L)
      val currentMonth = SimpleDateFormat("yyyy-MM", Locale.ROOT).format(Date())
      val fresh = hasOwner && updatedAt > 0 &&
        System.currentTimeMillis() - updatedAt in 0..MAX_AGE_MS &&
        prefs.getString("month", null) == currentMonth
      val showAmounts = fresh && prefs.getBoolean("visible", false) && !prefs.getBoolean("appHidden", true)
      val currency = prefs.getString("currency", "") ?: ""
      val formattedTime = if (updatedAt > 0) {
        SimpleDateFormat("d MMM, HH:mm", Locale.forLanguageTag("es-CO")).format(Date(updatedAt))
      } else ""
      val status = when {
        !hasOwner -> "Inicia sesión para consultar"
        !fresh -> "Datos desactualizados · abre la app"
        prefs.getBoolean("offline", false) -> "Sin conexión · último dato $formattedTime"
        else -> "Actualizado $formattedTime"
      }
      val balance = if (showAmounts) prefs.getString("balance", "Sin datos") ?: "Sin datos" else "••••"
      val monthlyAvailable = prefs.getBoolean("monthlyAvailable", false)
      val income = if (!showAmounts) "••••" else if (monthlyAvailable) prefs.getString("income", "Sin datos") ?: "Sin datos" else "Varias monedas"
      val expense = if (!showAmounts) "••••" else if (monthlyAvailable) prefs.getString("expense", "Sin datos") ?: "Sin datos" else "Varias monedas"
      for (id in ids) {
        val views = RemoteViews(context.packageName, R.layout.finance_home_widget)
        views.setTextViewText(R.id.widget_balance_label, if (currency.isBlank()) "Saldo en cuentas" else "Saldo en cuentas · $currency")
        views.setTextViewText(R.id.widget_balance, balance)
        views.setTextViewText(R.id.widget_income, "Ingresos del mes\n$income")
        views.setTextViewText(R.id.widget_expense, "Gastos del mes\n$expense")
        views.setTextViewText(R.id.widget_status, status)
        views.setOnClickPendingIntent(R.id.widget_new_expense, actionIntent(context, "expense", id * 2))
        views.setOnClickPendingIntent(R.id.widget_new_income, actionIntent(context, "income", id * 2 + 1))
        manager.updateAppWidget(id, views)
      }
    }

    private fun actionIntent(context: Context, action: String, requestCode: Int): PendingIntent {
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse("financepersonalmobile:///android-shortcut?action=$action"))
        .setClassName(context.packageName, "${context.packageName}.MainActivity")
        // A killed process can keep its previous Activity task. CLEAR_TOP restores that
        // screen instead of reliably handing the new URL to Expo Router on cold start.
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
      return PendingIntent.getActivity(
        context,
        requestCode,
        intent,
        // UPDATE_CURRENT changes extras, but can retain an older Activity launch flag
        // after an app upgrade. Recreate the click action when the widget refreshes.
        PendingIntent.FLAG_CANCEL_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }
  }
}
