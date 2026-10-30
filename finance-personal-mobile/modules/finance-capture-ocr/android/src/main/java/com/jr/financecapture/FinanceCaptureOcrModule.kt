package com.jr.financecapture

import android.graphics.BitmapFactory
import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.app.NotificationManager
import android.content.ComponentName
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.ParcelFileDescriptor
import android.provider.Settings
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import kotlin.concurrent.thread

/** On-device OCR. No image or recognized text is uploaded or logged. */
class FinanceCaptureOcrModule : Module() {
  private val maxBytes = 10L * 1024L * 1024L
  private val maxPixels = 25_000_000L

  private fun listenerAccess(): Boolean {
    val context = requireNotNull(appContext.reactContext).applicationContext
    val component = ComponentName(context, FinanceNotificationListener::class.java)
    if (Build.VERSION.SDK_INT >= 27) {
      val manager = context.getSystemService(NotificationManager::class.java)
      return manager.isNotificationListenerAccessGranted(component)
    }
    return Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
      ?.split(':')?.contains(component.flattenToString()) == true
  }

  override fun definition() = ModuleDefinition {
    Name("FinanceCaptureOcr")

    Function("notificationStatus") {
      val context = requireNotNull(appContext.reactContext).applicationContext
      NotificationCaptureStore.status(context) + mapOf("accessGranted" to listenerAccess())
    }
    Function("setNotificationOwner") { owner: String? ->
      NotificationCaptureStore.setOwner(requireNotNull(appContext.reactContext).applicationContext, owner)
    }
    Function("setNotificationEnabled") { enabled: Boolean ->
      if (enabled && !listenerAccess()) throw IllegalStateException("Autoriza el acceso a notificaciones en Android.")
      NotificationCaptureStore.setEnabled(requireNotNull(appContext.reactContext).applicationContext, enabled)
    }
    Function("setNotificationApps") { allowed: List<String> ->
      NotificationCaptureStore.setAllowed(requireNotNull(appContext.reactContext).applicationContext, allowed.toSet())
    }
    Function("pendingNotifications") { owner: String ->
      NotificationCaptureStore.list(requireNotNull(appContext.reactContext).applicationContext, owner)
    }
    Function("captureDiagnosticEvents") { owner: String ->
      NotificationCaptureStore.diagnosticEvents(requireNotNull(appContext.reactContext).applicationContext, owner)
    }
    Function("ackNotification") { owner: String, id: String ->
      NotificationCaptureStore.acknowledge(requireNotNull(appContext.reactContext).applicationContext, owner, id)
    }
    Function("discardNotification") { owner: String, id: String ->
      NotificationCaptureStore.discard(requireNotNull(appContext.reactContext).applicationContext, owner, id)
    }
    Function("openNotificationSettings") {
      val context = requireNotNull(appContext.reactContext).applicationContext
      context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    AsyncFunction("recognizeImage") { value: String, promise: Promise ->
      val context = requireNotNull(appContext.reactContext).applicationContext
      val uri = Uri.parse(value)
      if (uri.scheme != "file" && uri.scheme != "content") {
        promise.reject("INVALID_IMAGE", "Selecciona una imagen del dispositivo.", null)
        return@AsyncFunction
      }
      try {
        if (uri.scheme == "file") {
          val target = File(requireNotNull(uri.path)).canonicalFile
          val cache = context.cacheDir.canonicalFile
          val externalCache = context.externalCacheDir?.canonicalFile
          if (!target.path.startsWith(cache.path + File.separator) &&
            (externalCache == null || !target.path.startsWith(externalCache.path + File.separator))) {
            promise.reject("INVALID_IMAGE", "La imagen debe venir del selector o la cámara.", null)
            return@AsyncFunction
          }
        }
        var size = 0L
        context.contentResolver.openInputStream(uri)?.use { input ->
          val buffer = ByteArray(8192)
          while (true) {
            val count = input.read(buffer)
            if (count < 0) break
            size += count
            if (size > maxBytes) break
          }
        } ?: throw IOException("No se pudo abrir la imagen")
        if (size == 0L || size > maxBytes) {
          promise.reject("IMAGE_SIZE", "La imagen debe pesar menos de 10 MB.", null)
          return@AsyncFunction
        }

        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        val imageStream = context.contentResolver.openInputStream(uri) ?: throw IOException("No se pudo leer la imagen")
        imageStream.use { BitmapFactory.decodeStream(it, null, bounds) }
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0 ||
          bounds.outWidth.toLong() * bounds.outHeight.toLong() > maxPixels) {
          promise.reject("IMAGE_DIMENSIONS", "La imagen es ilegible o demasiado grande.", null)
          return@AsyncFunction
        }

        val image = InputImage.fromFilePath(context, uri)
        val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
        recognizer.process(image)
          .addOnSuccessListener { result -> promise.resolve(result.text.take(12_000)) }
          .addOnFailureListener { promise.reject("OCR_FAILED", "No pudimos leer el comprobante. Prueba con una foto más nítida.", null) }
          .addOnCompleteListener { recognizer.close() }
      } catch (_: Exception) {
        promise.reject("OCR_FAILED", "No pudimos abrir el comprobante. Elige otra imagen.", null)
      }
    }

    AsyncFunction("recognizePdf") { value: String, promise: Promise ->
      val context = requireNotNull(appContext.reactContext).applicationContext
      val uri = Uri.parse(value)
      if (uri.scheme != "file" && uri.scheme != "content") {
        promise.reject("INVALID_PDF", "Selecciona un PDF del dispositivo.", null)
        return@AsyncFunction
      }
      thread(name = "finance-capture-pdf") {
        var temporary: File? = null
        try {
          if (uri.scheme == "file") {
            val target = File(requireNotNull(uri.path)).canonicalFile
            val cache = context.cacheDir.canonicalFile
            val externalCache = context.externalCacheDir?.canonicalFile
            if (!target.path.startsWith(cache.path + File.separator) &&
              (externalCache == null || !target.path.startsWith(externalCache.path + File.separator))) {
              promise.reject("INVALID_PDF", "Elige el PDF desde Archivos.", null)
              return@thread
            }
          }
          val source = context.contentResolver.openInputStream(uri) ?: throw IOException("PDF no disponible")
          val copy = File.createTempFile("finance-capture-", ".pdf", context.cacheDir)
          temporary = copy
          source.use { input ->
            FileOutputStream(copy).use { output ->
              val header = ByteArray(5)
              if (input.read(header) != 5 || !header.contentEquals("%PDF-".toByteArray()))
                throw IOException("El archivo no es un PDF")
              output.write(header)
              val buffer = ByteArray(8192)
              var size = 5L
              while (true) {
                val count = input.read(buffer)
                if (count < 0) break
                size += count
                if (size > maxBytes) throw IOException("PDF demasiado grande")
                output.write(buffer, 0, count)
              }
            }
          }
          val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
          try {
            ParcelFileDescriptor.open(copy, ParcelFileDescriptor.MODE_READ_ONLY).use { descriptor ->
            PdfRenderer(descriptor).use { renderer ->
              if (renderer.pageCount < 1 || renderer.pageCount > 8)
                throw IOException("El PDF debe tener entre 1 y 8 páginas")
              val pages = mutableListOf<Map<String, Any>>()
              for (index in 0 until renderer.pageCount) {
                renderer.openPage(index).use { page ->
                  val scale = minOf(1800.0 / page.width, 1800.0 / page.height, 2.0)
                  val width = (page.width * scale).toInt().coerceAtLeast(1)
                  val height = (page.height * scale).toInt().coerceAtLeast(1)
                  val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                  try {
                    bitmap.eraseColor(android.graphics.Color.WHITE)
                    page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                    val image = InputImage.fromBitmap(bitmap, 0)
                    val text = Tasks.await(recognizer.process(image)).text.take(12_000)
                    pages.add(mapOf("page" to index + 1, "text" to text))
                  } finally {
                    bitmap.recycle()
                  }
                }
              }
              promise.resolve(mapOf("pageCount" to renderer.pageCount, "pages" to pages))
            }
            }
          } finally {
            recognizer.close()
          }
        } catch (_: SecurityException) {
          promise.reject("PDF_PROTECTED", "Este PDF está protegido. Exporta una copia sin contraseña.", null)
        } catch (_: Exception) {
          promise.reject("PDF_UNREADABLE", "No pudimos leer el PDF. Comprueba que tenga hasta 8 páginas y pese menos de 10 MB.", null)
        } finally {
          temporary?.delete()
        }
      }
    }
  }
}
