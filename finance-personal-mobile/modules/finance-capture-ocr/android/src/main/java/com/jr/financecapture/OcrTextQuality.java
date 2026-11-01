package com.jr.financecapture;

import java.util.regex.Pattern;

/** Retry selection for the existing ML Kit engine, shared by image and rendered PDF pages. */
public final class OcrTextQuality {
  private OcrTextQuality() { }
  private static final int FLAGS = Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE;
  private static final Pattern WORD = Pattern.compile("[\\p{L}]{3,}");
  private static final Pattern AMOUNT = Pattern.compile("\\b\\d{3,}(?:[.,]\\s*\\d{2,3})?\\b");
  private static final Pattern LABEL = Pattern.compile("\\b(?:total|subtotal|venta|compra|pago|importe|valor|cop|usd|eur|nit|iva|inc|factura|recibo)\\b|\\$", FLAGS);
  private static final Pattern RECEIPT = Pattern.compile("\\b(?:factura|ticket|recibo|nit|iva|inc|redeban|credibanco|dat[aá]fono)\\b", FLAGS);
  private static final Pattern TOTAL_AMOUNT = Pattern.compile("\\b(?:total(?:\\s+(?:venta|a\\s+pagar|factura))?|valor\\s+total|compra\\s+neta)\\s*[:=]?\\s*(?:(?:COP|USD|EUR)\\s*)?\\$?\\s*[0-9][0-9., \\tOoIl|]*", FLAGS);
  private static final Pattern DATE = Pattern.compile("\\b(?:\\d{4}[/-]\\d{1,2}[/-]\\d{1,2}|\\d{1,2}[/-]\\d{1,2}[/-]\\d{4})\\b|\\b(?:ene|jan|feb|mar|abr|apr|may|jun|jul|ago|aug|sep|set|oct|nov|dic|dec)[a-z]*\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?[,]?\\s+\\d{4}\\b|\\b\\d{1,2}\\s+(?:de\\s+)?(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\\s+(?:de\\s+)?\\d{4}\\b", FLAGS);

  private static int count(Pattern pattern, String text) {
    var matcher = pattern.matcher(text); int count = 0;
    while (matcher.find()) count++;
    return count;
  }

  public static boolean needsRetry(String text) {
    return text.length() < 60 || count(WORD, text) < 5 || !AMOUNT.matcher(text).find()
        || !LABEL.matcher(text).find() || RECEIPT.matcher(text).find()
        && (!TOTAL_AMOUNT.matcher(text).find() || !DATE.matcher(text).find());
  }

  public static int score(String text) {
    // A long product list cannot outweigh a recovered payable total and date.
    return Math.min(count(WORD, text), 40) * 2 + Math.min(count(AMOUNT, text), 15) * 5
        + Math.min(count(LABEL, text), 10) * 12 + (TOTAL_AMOUNT.matcher(text).find() ? 300 : 0)
        + (DATE.matcher(text).find() ? 80 : 0);
  }

  public static String choose(String original, String enhanced) {
    return score(enhanced) > score(original) ? enhanced : original;
  }
}
