package com.jr.financecapture

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.security.KeyStore
import java.security.MessageDigest
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Stores only opt-in financial candidates, encrypted with an Android Keystore key. */
internal object NotificationCaptureStore {
  private const val alias = "finance_capture_notifications_v1"
  private const val prefsName = "finance_capture_notification_settings"
  private const val maxPending = 20
  private val diagnosticOutcomes = setOf("ACCEPTED", "IGNORED", "DISCARDED", "FAILED")
  private val diagnosticReasons = setOf("EMPTY_TEXT", "AUTH_MESSAGE", "NO_MOVEMENT", "DUPLICATE_EVENT",
    "QUEUE_FULL", "QUEUED_ENCRYPTED", "USER_DISCARDED", "LISTENER_ERROR")
  private val auth = Regex("\\b(?:otp|c[oó]digo|clave|contrase(?:n|ñ)a|token|verificaci[oó]n|autenticaci[oó]n|inicia(?:r)? sesi[oó]n)\\b|https?://", RegexOption.IGNORE_CASE)
  private val movement = Regex("\\b(?:compra|compraste|pagaste|pago|abono|recibiste|consignaci[oó]n|n[oó]mina|salario|transferencia|transferiste|enviaste|retiro|retiraste|devoluci[oó]n|reverso)\\b", RegexOption.IGNORE_CASE)

  private fun prefs(context: Context) = context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
  private fun secret(): SecretKey {
    val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    (store.getKey(alias, null) as? SecretKey)?.let { return it }
    val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
    generator.init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
      .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
      .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
      .setKeySize(256)
      .build())
    return generator.generateKey()
  }
  private fun encrypt(text: String): String {
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(Cipher.ENCRYPT_MODE, secret())
    return Base64.encodeToString(cipher.iv + cipher.doFinal(text.toByteArray(Charsets.UTF_8)), Base64.NO_WRAP)
  }
  private fun decrypt(value: String): String {
    val bytes = Base64.decode(value, Base64.NO_WRAP)
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(Cipher.DECRYPT_MODE, secret(), GCMParameterSpec(128, bytes.copyOfRange(0, 12)))
    return String(cipher.doFinal(bytes.copyOfRange(12, bytes.size)), Charsets.UTF_8)
  }
  private fun pending(context: Context): JSONArray {
    val encrypted = prefs(context).getString("pending", null) ?: return JSONArray()
    return try { JSONArray(decrypt(encrypted)) } catch (_: Exception) {
      prefs(context).edit().remove("pending").apply()
      JSONArray()
    }
  }
  private fun diagnostics(context: Context): JSONArray {
    val encrypted = prefs(context).getString("diagnostics", null) ?: return JSONArray()
    return try { JSONArray(decrypt(encrypted)) } catch (_: Exception) {
      prefs(context).edit().remove("diagnostics").apply()
      JSONArray()
    }
  }
  private fun write(context: Context, items: JSONArray) {
    prefs(context).edit().putString("pending", encrypt(items.toString())).apply()
  }
  private fun packages(context: Context, name: String): Set<String> =
    prefs(context).getStringSet(name, emptySet())?.toSet() ?: emptySet()

  @Synchronized fun setOwner(context: Context, owner: String?) {
    val old = prefs(context).getString("owner", null)
    if (old == owner) return
    prefs(context).edit().clear().putString("owner", owner).commit()
  }
  /** Bounded metadata only: no notification body, merchant, amount, package or credentials. */
  @Synchronized fun diagnosticEvents(context: Context, owner: String): List<Map<String, Any>> {
    if (prefs(context).getString("owner", null) != owner) return emptyList()
    val items = diagnostics(context)
    return (0 until items.length()).map { index ->
      val item = items.getJSONObject(index)
      mapOf("at" to item.getLong("at"), "outcome" to item.getString("outcome"),
        "reason" to item.getString("reason"))
    }
  }

  @Synchronized fun record(context: Context, outcome: String, reason: String) {
    if (outcome !in diagnosticOutcomes || reason !in diagnosticReasons) return
    if (!prefs(context).getBoolean("enabled", false) || prefs(context).getString("owner", null) == null) return
    val old = diagnostics(context)
    val next = JSONArray()
    for (index in maxOf(0, old.length() - 29) until old.length()) next.put(old.getJSONObject(index))
    next.put(JSONObject().put("at", System.currentTimeMillis()).put("outcome", outcome).put("reason", reason))
    prefs(context).edit().putString("diagnostics", encrypt(next.toString())).apply()
  }
  @Synchronized fun clear(context: Context) {
    prefs(context).edit().remove("pending").putBoolean("enabled", false).remove("allowed").remove("observed").apply()
  }
  @Synchronized fun setEnabled(context: Context, enabled: Boolean) {
    if (prefs(context).getString("owner", null) == null) return
    prefs(context).edit().putBoolean("enabled", enabled).apply()
    if (!enabled) clear(context)
  }
  @Synchronized fun setAllowed(context: Context, allowed: Set<String>) {
    val observed = packages(context, "observed")
    prefs(context).edit().putStringSet("allowed", allowed.intersect(observed)).apply()
  }
  @Synchronized fun status(context: Context): Map<String, Any> = mapOf(
    "enabled" to prefs(context).getBoolean("enabled", false),
    "observed" to packages(context, "observed").sorted(),
    "allowed" to packages(context, "allowed").sorted(),
    "pendingCount" to pending(context).length(),
  )
  @Synchronized fun list(context: Context, owner: String): List<Map<String, Any>> {
    if (prefs(context).getString("owner", null) != owner) return emptyList()
    val items = pending(context)
    return (0 until items.length()).map { index ->
      val item = items.getJSONObject(index)
      mapOf("id" to item.getString("id"), "text" to item.getString("text"),
        "packageName" to item.getString("packageName"), "postedAt" to item.getLong("postedAt"))
    }
  }
  @Synchronized fun acknowledge(context: Context, owner: String, id: String) {
    if (prefs(context).getString("owner", null) != owner) return
    val items = pending(context)
    val next = JSONArray()
    for (index in 0 until items.length()) {
      val item = items.getJSONObject(index)
      if (item.getString("id") != id) next.put(item)
    }
    write(context, next)
  }
  @Synchronized fun discard(context: Context, owner: String, id: String) {
    if (prefs(context).getString("owner", null) != owner) return
    acknowledge(context, owner, id)
    record(context, "DISCARDED", "USER_DISCARDED")
  }
  @Synchronized fun mayInspect(context: Context, packageName: String): Boolean {
    if (packageName == context.packageName) return false
    val prefs = prefs(context)
    if (!prefs.getBoolean("enabled", false) || prefs.getString("owner", null) == null) return false
    val observed = packages(context, "observed")
    if (!observed.contains(packageName) && observed.size < 30)
      prefs.edit().putStringSet("observed", observed + packageName).apply()
    return packages(context, "allowed").contains(packageName)
  }
  @Synchronized fun consider(context: Context, packageName: String, text: String, postedAt: Long) {
    if (packageName == context.packageName) return
    val prefs = prefs(context)
    if (!prefs.getBoolean("enabled", false) || prefs.getString("owner", null) == null) return
    if (!packages(context, "allowed").contains(packageName)) return
    val cleaned = text.replace(Regex("\\s+"), " ").trim().take(2000)
    if (cleaned.isBlank()) {
      record(context, "IGNORED", "EMPTY_TEXT")
      return
    }
    if (auth.containsMatchIn(cleaned)) {
      record(context, "IGNORED", "AUTH_MESSAGE")
      return
    }
    if (!movement.containsMatchIn(cleaned)) {
      record(context, "IGNORED", "NO_MOVEMENT")
      return
    }
    val fingerprint = MessageDigest.getInstance("SHA-256")
      .digest("$packageName|${cleaned.lowercase()}".toByteArray())
      .joinToString("") { "%02x".format(it) }
    val items = pending(context)
    for (index in 0 until items.length()) {
      val item = items.getJSONObject(index)
      // Identical-looking purchases minutes apart may both be real. Only suppress
      // Android's replay of the same notification event, which retains postTime.
      if (item.getString("fingerprint") == fingerprint && item.getLong("postedAt") == postedAt) {
        record(context, "IGNORED", "DUPLICATE_EVENT")
        return
      }
    }
    if (items.length() >= maxPending) {
      record(context, "FAILED", "QUEUE_FULL")
      return
    }
    val id = MessageDigest.getInstance("SHA-256")
      .digest("$fingerprint|$postedAt".toByteArray()).joinToString("") { "%02x".format(it) }
    items.put(JSONObject().put("id", id).put("fingerprint", fingerprint).put("text", cleaned)
      .put("packageName", packageName).put("postedAt", postedAt))
    write(context, items)
    record(context, "ACCEPTED", "QUEUED_ENCRYPTED")
  }
}
