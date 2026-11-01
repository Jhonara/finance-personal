package com.jr.financecapture;

import org.junit.Test;
import static org.junit.Assert.*;

public class OcrTextQualityTest {
  private final String complete = "TIENDA CENTRAL DEL BARRIO\nNIT 123456789\nFecha 2026/10/31\nIVA 0\nTOTAL $ 78.300\nTarjeta débito";

  @Test public void retriesWhenTotalHasNoValueEvenIfProductsHaveAmounts() {
    assertTrue(OcrTextQuality.needsRetry("TIENDA CENTRAL DEL BARRIO\nNIT 123456789\n31/10/2026\nProducto 10000\nIVA 0\nTOTAL"));
    assertFalse(OcrTextQuality.needsRetry(complete));
  }

  @Test public void recoveredTotalOutweighsLongProductNoise() {
    String noisy = "FACTURA TIENDA CENTRAL\n31/10/2026\n" + "PRODUCTO 1000 IVA\n".repeat(60) + "TOTAL";
    assertEquals(complete, OcrTextQuality.choose(noisy, complete));
  }

  @Test public void preservesOriginalWhenEnhancementLosesFinancialFieldsOrTies() {
    assertEquals(complete, OcrTextQuality.choose(complete, "Texto ilegible y productos"));
    assertEquals(complete, OcrTextQuality.choose(complete, complete));
  }
}
