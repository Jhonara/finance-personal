package com.jr.finance.api.transfer.dto;
import jakarta.validation.constraints.*;
import lombok.Getter; import lombok.Setter;
import java.math.BigDecimal; import java.time.LocalDate;
@Getter @Setter public class CreateTransferRequest {
 @NotNull private Long sourceAccountId; @NotNull private Long destinationAccountId;
 @NotNull @DecimalMin(value="0.0001") private BigDecimal amount; @NotNull private LocalDate effectiveDate;
 @Size(max=255) private String description;
}
