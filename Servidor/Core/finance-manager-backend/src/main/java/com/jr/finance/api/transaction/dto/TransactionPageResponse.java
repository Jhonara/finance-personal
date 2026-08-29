package com.jr.finance.api.transaction.dto;

import java.util.List;

public record TransactionPageResponse(List<TransactionResponse> content, int page, int size, long totalElements,
                                      int totalPages, boolean first, boolean last) { }
