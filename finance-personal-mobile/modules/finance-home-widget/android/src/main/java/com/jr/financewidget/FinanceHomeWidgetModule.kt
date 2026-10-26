package com.jr.financewidget

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class FinanceHomeWidgetModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext).applicationContext

  override fun definition() = ModuleDefinition {
    Name("FinanceHomeWidget")

    Function("setSnapshot") { snapshot: Map<String, String> ->
      val owner = snapshot["ownerId"].orEmpty()
      val updatedAt = snapshot["updatedAt"]?.toLongOrNull() ?: 0L
      if (owner.isBlank() || updatedAt <= 0) return@Function
      val prefs = FinanceHomeWidgetProvider.prefs(context)
      val oldOwner = prefs.getString("owner", null)
      val changedOwner = oldOwner != null && oldOwner != owner
      val wasVisible = if (changedOwner) false else prefs.getBoolean("visible", false)
      val appHidden = prefs.getBoolean("appHidden", true)
      prefs.edit().clear()
        .putString("owner", owner)
        .putString("currency", snapshot["currency"].orEmpty())
        .putString("month", snapshot["month"].orEmpty())
        .putString("balance", snapshot["balance"].orEmpty())
        .putString("income", snapshot["income"].orEmpty())
        .putString("expense", snapshot["expense"].orEmpty())
        .putBoolean("monthlyAvailable", snapshot["monthlyAvailable"] == "true")
        .putLong("updatedAt", updatedAt)
        .putBoolean("visible", wasVisible)
        .putBoolean("appHidden", appHidden)
        .putBoolean("offline", false)
        .commit()
      FinanceHomeWidgetProvider.renderAll(context)
    }

    Function("setVisible") { visible: Boolean ->
      FinanceHomeWidgetProvider.prefs(context).edit().putBoolean("visible", visible).commit()
      FinanceHomeWidgetProvider.renderAll(context)
    }

    Function("getVisible") {
      FinanceHomeWidgetProvider.prefs(context).getBoolean("visible", false)
    }

    Function("setAppHidden") { hidden: Boolean ->
      FinanceHomeWidgetProvider.prefs(context).edit().putBoolean("appHidden", hidden).commit()
      FinanceHomeWidgetProvider.renderAll(context)
    }

    Function("markOffline") {
      FinanceHomeWidgetProvider.prefs(context).edit().putBoolean("offline", true).commit()
      FinanceHomeWidgetProvider.renderAll(context)
    }

    Function("clear") {
      FinanceHomeWidgetProvider.prefs(context).edit().clear().commit()
      FinanceHomeWidgetProvider.renderAll(context)
    }
  }
}
