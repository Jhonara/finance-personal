package com.jr.financecapture

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

/** Android only; sees contents solely for apps explicitly selected inside Finance Personal. */
class FinanceNotificationListener : NotificationListenerService() {
  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    if (sbn == null) return
    try {
      if (!NotificationCaptureStore.mayInspect(applicationContext, sbn.packageName)) return
      val extras = sbn.notification.extras ?: return
      val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
      val body = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString().orEmpty()
      val text = "$title $body".trim()
      if (text.isNotEmpty())
        NotificationCaptureStore.consider(applicationContext, sbn.packageName, text, sbn.postTime)
    } catch (_: Exception) {
      // A protected or malformed notification is ignored. Never log its contents.
      runCatching { NotificationCaptureStore.record(applicationContext, "FAILED", "LISTENER_ERROR") }
    }
  }
}
