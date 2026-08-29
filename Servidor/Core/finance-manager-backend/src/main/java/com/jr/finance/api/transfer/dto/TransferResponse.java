package com.jr.finance.api.transfer.dto;
import lombok.*; import java.math.BigDecimal; import java.time.LocalDate;
@Getter @Setter @AllArgsConstructor public class TransferResponse { Long id,sourceAccountId,destinationAccountId; String sourceAccountName,destinationAccountName,currency,status,description; BigDecimal amount; LocalDate effectiveDate; }
