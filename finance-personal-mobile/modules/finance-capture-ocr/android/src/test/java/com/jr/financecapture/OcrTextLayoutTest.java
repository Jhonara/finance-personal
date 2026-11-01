package com.jr.financecapture;

import java.util.List;
import org.junit.Test;
import static org.junit.Assert.assertEquals;

public class OcrTextLayoutTest {
  @Test public void restoresInvoiceTotalRowsFromActualMlKitCoordinates() {
    // These label and amount coordinates reproduce the user-provided invoice's native OCR.
    List<OcrTextLayout.Line> columns = List.of(
        line("Subtotal", 885, 2970, 1137, 3035, 0),
        line("$ 3.000", 1675, 2016, 1893, 2082, 0),
        line("$ 5.900", 1700, 2088, 1893, 2156, 0),
        line("Total venta", 897, 3052, 1248, 3133, 0),
        line("Tipo de pago", 883, 3139, 1280, 3212, 0),
        line("$ 78.300", 1646, 2961, 1908, 3032, -1.28),
        line("$ 78.300", 1686, 3043, 1915, 3132, -1.29),
        line("Tarjeta débito", 1455, 3139, 1925, 3212, 0));
    assertEquals("$ 3.000\n$ 5.900\nSubtotal $ 78.300\nTotal venta $ 78.300\nTipo de pago Tarjeta débito",
        OcrTextLayout.reconstruct(columns));
  }

  @Test public void restoresEnhancedInvoiceTotalRowsWithoutJoiningTheFollowingPaymentLine() {
    List<OcrTextLayout.Line> columns = List.of(
        line("Subtotal", 442, 1485, 569, 1517, 0),
        line("Total venta", 441, 1526, 623, 1561, 0.81),
        line("$ 78.300", 823, 1482, 953, 1518, -0.95),
        line("$ 78.300", 842, 1522, 957, 1565, -0.74),
        line("Tipo de pago • Tarjeta débito", 440, 1558, 961, 1616, 0.93));
    assertEquals("Subtotal $ 78.300\nTotal venta $ 78.300\nTipo de pago • Tarjeta débito",
        OcrTextLayout.reconstruct(columns));
  }

  @Test public void reconstructsDataphoneAmountColumnsWithoutChoosingTaxesAsTheTotal() {
    List<OcrTextLayout.Line> columns = List.of(
        line("COMPRA NETA", 20, 100, 180, 130, 0),
        line("IVA", 20, 150, 70, 180, 0),
        line("TOTAL", 20, 200, 100, 230, 0),
        line("$ 78.300", 220, 101, 330, 132, 0),
        line("$ 0", 220, 151, 280, 180, 0),
        line("$ 78.300", 220, 201, 330, 232, 0));
    assertEquals("COMPRA NETA $ 78.300\nIVA $ 0\nTOTAL $ 78.300", OcrTextLayout.reconstruct(columns));
  }

  @Test public void compensatesForSlightRotationBeforeMatchingColumns() {
    List<OcrTextLayout.Line> columns = List.of(
        line("Subtotal", 0, 90, 100, 140, 10),
        line("Total venta", 0, 150, 100, 200, 10),
        line("$ 100", 500, 178, 600, 228, 10),
        line("$ 100", 500, 238, 600, 288, 10));
    assertEquals("Subtotal $ 100\nTotal venta $ 100", OcrTextLayout.reconstruct(columns));
  }

  @Test public void doesNotJoinOverlappingLinesOrInventMissingText() {
    assertEquals("TOTAL\nOTRO", OcrTextLayout.reconstruct(List.of(
        line("TOTAL", 0, 10, 100, 40, 0), line("OTRO", 0, 11, 100, 41, 0))));
    assertEquals("", OcrTextLayout.reconstruct(List.of()));
    assertEquals("TOTAL", OcrTextLayout.reconstruct(List.of(line("TOTAL", 0, 10, 100, 40, 0),
        line("", 150, 10, 200, 40, 0), line("missing bounds", 0, 0, 0, 0, 0))));
  }

  private static OcrTextLayout.Line line(String text, int left, int top, int right, int bottom, double angle) {
    return new OcrTextLayout.Line(text, left, top, right, bottom, angle);
  }
}
